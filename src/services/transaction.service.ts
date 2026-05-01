import { prisma } from '@/lib/prisma';
import { CategoryType, Prisma } from '@prisma/client';
import type { TransactionFilters } from '@/types';
import { detectUnusualExpenses } from '@/services/notification-detector.service';

type GoalTransactionMarker = {
  goalId: string;
  progressId: string;
  action: 'CONTRIBUTION' | 'DEDUCTION';
};

function sanitizeUserTags(tags?: string[]) {
  return (tags || []).filter(tag => !tag.startsWith('__pft:'));
}

function parseGoalTransactionMarker(tags: string[]): GoalTransactionMarker | null {
  if (!tags.includes('__pft:goal-transfer')) return null;

  const goalId = tags.find(tag => tag.startsWith('__pft:goal:'))?.slice('__pft:goal:'.length);
  const progressId = tags.find(tag => tag.startsWith('__pft:goal-progress:'))?.slice('__pft:goal-progress:'.length);
  const action = tags.find(tag => tag.startsWith('__pft:goal-action:'))?.slice('__pft:goal-action:'.length);

  if (!goalId || !progressId || (action !== 'CONTRIBUTION' && action !== 'DEDUCTION')) return null;
  return { goalId, progressId, action };
}

export async function getTransactions(userId: string, filters: TransactionFilters = {}) {
  const { 
    search, categoryId, accountId, type, dateFrom, dateTo, tags, page = 1, limit = 50, sortBy = 'createdAt_desc',
    types, typeMode = 'include', categoryIds, categoryMode = 'include', accountIds, accountMode = 'include',
  } = filters;

  const where: Prisma.TransactionWhereInput = { userId };

  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Multi-select type filter (takes priority over single type)
  if (types && types.length > 0) {
    if (typeMode === 'exclude') {
      where.type = { notIn: types as CategoryType[] };
    } else {
      where.type = { in: types as CategoryType[] };
    }
  } else if (type) {
    where.type = type;
  }

  // Multi-select category filter (takes priority over single categoryId)
  if (categoryIds && categoryIds.length > 0) {
    if (categoryMode === 'exclude') {
      where.categoryId = { notIn: categoryIds };
    } else {
      where.categoryId = { in: categoryIds };
    }
  } else if (categoryId) {
    where.categoryId = categoryId;
  }

  // Multi-select account filter (takes priority over single accountId)
  if (accountIds && accountIds.length > 0) {
    if (accountMode === 'exclude') {
      where.accountId = { notIn: accountIds };
    } else {
      where.accountId = { in: accountIds };
    }
  } else if (accountId) {
    where.accountId = accountId;
  }
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) {
      const d = new Date(dateFrom);
      d.setUTCHours(0, 0, 0, 0);
      where.date.gte = d;
    }
    if (dateTo) {
      const d = new Date(dateTo);
      d.setUTCHours(23, 59, 59, 999);
      where.date.lte = d;
    }
  }
  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  let orderBy: Prisma.TransactionOrderByWithRelationInput | Prisma.TransactionOrderByWithRelationInput[] = [
    { createdAt: 'desc' }
  ];

  switch (sortBy) {
    case 'date_desc':
      orderBy = [{ date: 'desc' }, { createdAt: 'desc' }];
      break;
    case 'date_asc':
      orderBy = [{ date: 'asc' }, { createdAt: 'asc' }];
      break;
    case 'amount_desc':
      orderBy = [{ amount: 'desc' }, { createdAt: 'desc' }];
      break;
    case 'amount_asc':
      orderBy = [{ amount: 'asc' }, { createdAt: 'asc' }];
      break;
    case 'createdAt_asc':
      orderBy = [{ createdAt: 'asc' }];
      break;
    case 'createdAt_desc':
    default:
      orderBy = [{ createdAt: 'desc' }];
      break;
  }

  const [transactions, total, aggregate] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { 
        category: true, 
        account: true,
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
    })
  ]);

  const totalIncome = Number(aggregate.find(a => a.type === 'INCOME')?._sum.amount || 0);
  const totalExpense = Number(aggregate.find(a => a.type === 'EXPENSE')?._sum.amount || 0);

  const userIds = new Set<string>();
  transactions.forEach(t => {
    if (t.createdById) userIds.add(t.createdById);
    if (t.updatedById) userIds.add(t.updatedById);
  });
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map(u => [u.id, u.name]));

  const enriched = transactions.map(t => ({
    ...t,
    createdByName: t.createdById ? userMap.get(t.createdById) || null : null,
    updatedByName: t.updatedById ? userMap.get(t.updatedById) || null : null,
  }));

  return { 
    transactions: enriched, 
    total, 
    pages: Math.ceil(total / limit),
    totalIncome,
    totalExpense
  };
}

export async function createTransaction(userId: string, executorId: string, data: {
  accountId: string; categoryId: string; type: 'INCOME' | 'EXPENSE';
  amount: number; description: string; date: string; tags?: string[]; notes?: string;
}) {
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      accountId: data.accountId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: new Date(data.date),
      tags: sanitizeUserTags(data.tags),
      notes: data.notes,
      createdById: executorId,
      updatedById: executorId,
    },
    include: { category: true, account: true },
  });

  // Update account balance
  const balanceChange = data.type === 'INCOME' ? data.amount : -data.amount;
  await prisma.account.update({
    where: { id: data.accountId },
    data: { balance: { increment: balanceChange } },
  });

  if (data.type === 'EXPENSE') {
    try {
      await detectUnusualExpenses(userId, transaction.id);
    } catch (error) {
      console.error('Failed to detect unusual expense:', error);
    }
  }

  return transaction;
}

export async function updateTransaction(userId: string, executorId: string, id: string, data: {
  accountId: string; categoryId: string; type: 'INCOME' | 'EXPENSE';
  amount: number; description: string; date: string; tags?: string[]; notes?: string;
}) {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) throw new Error('Transaction not found');
  if (parseGoalTransactionMarker(existing.tags)) {
    throw new Error('Goal transactions cannot be edited. Delete the transaction to reverse it.');
  }

  // Reverse old balance change
  const oldBalanceChange = existing.type === 'INCOME' ? -Number(existing.amount) : Number(existing.amount);
  await prisma.account.update({
    where: { id: existing.accountId },
    data: { balance: { increment: oldBalanceChange } },
  });

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      accountId: data.accountId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: new Date(data.date),
      tags: sanitizeUserTags(data.tags),
      notes: data.notes,
      updatedById: executorId,
    },
    include: { category: true, account: true },
  });

  // Apply new balance change
  const newBalanceChange = data.type === 'INCOME' ? data.amount : -data.amount;
  await prisma.account.update({
    where: { id: data.accountId },
    data: { balance: { increment: newBalanceChange } },
  });

  return transaction;
}

export async function deleteTransaction(userId: string, id: string) {
  const transaction = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!transaction) throw new Error('Transaction not found');

  // Reverse balance change
  const balanceChange = transaction.type === 'INCOME' ? -Number(transaction.amount) : Number(transaction.amount);
  const goalMarker = parseGoalTransactionMarker(transaction.tags);

  if (goalMarker) {
    const goalAmountChange = goalMarker.action === 'CONTRIBUTION' ? -Number(transaction.amount) : Number(transaction.amount);
    await prisma.$executeRaw`
      WITH updated_goal AS (
        UPDATE "Goal"
        SET
          "currentAmount" = GREATEST(0, "currentAmount" + ${goalAmountChange}),
          "isCompleted" = GREATEST(0, "currentAmount" + ${goalAmountChange}) >= "targetAmount",
          "updatedAt" = NOW()
        WHERE "id" = ${goalMarker.goalId} AND "userId" = ${userId}
      ),
      deleted_progress AS (
        DELETE FROM "GoalProgress"
        WHERE "id" = ${goalMarker.progressId} AND "goalId" = ${goalMarker.goalId}
      ),
      updated_account AS (
        UPDATE "Account"
        SET "balance" = "balance" + ${balanceChange}, "updatedAt" = NOW()
        WHERE "id" = ${transaction.accountId} AND "userId" = ${userId}
      )
      DELETE FROM "Transaction"
      WHERE "id" = ${id} AND "userId" = ${userId}
    `;
    return true;
  }

  await prisma.account.update({
    where: { id: transaction.accountId },
    data: { balance: { increment: balanceChange } },
  });

  await prisma.transaction.delete({ where: { id } });
  return true;
}
