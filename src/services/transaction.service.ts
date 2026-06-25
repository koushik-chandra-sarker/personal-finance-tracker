import { prisma } from '@/lib/prisma';
import { CategoryType, Prisma } from '@prisma/client';
import type { TransactionFilters } from '@/types';
import { detectUnusualExpenses } from '@/services/notification-detector.service';

type GoalTransactionMarker = {
  goalId: string;
  progressId: string;
  action: 'CONTRIBUTION' | 'DEDUCTION';
};

type MonthlyExpenseFilters = {
  month: number;
  year: number;
  categoryId?: string;
  accountId?: string;
  page?: number;
  limit?: number;
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

function getMonthDateRange(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}

function getPreviousMonth(month: number, year: number) {
  if (month === 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

function buildMonthlyExpenseWhere(
  userId: string,
  filters: MonthlyExpenseFilters,
  dateRange = getMonthDateRange(filters.month, filters.year)
): Prisma.TransactionWhereInput {
  return {
    userId,
    type: 'EXPENSE',
    date: { gte: dateRange.startDate, lte: dateRange.endDate },
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
  };
}

function buildMonthlyIncomeWhere(
  userId: string,
  filters: MonthlyExpenseFilters,
  dateRange = getMonthDateRange(filters.month, filters.year)
): Prisma.TransactionWhereInput {
  return {
    userId,
    type: 'INCOME',
    date: { gte: dateRange.startDate, lte: dateRange.endDate },
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
  };
}

function buildRegularMonthlyTransactionWhere(
  userId: string,
  filters: MonthlyExpenseFilters,
  dateRange = getMonthDateRange(filters.month, filters.year)
): Prisma.TransactionWhereInput {
  return {
    userId,
    date: { gte: dateRange.startDate, lte: dateRange.endDate },
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
    investmentCashflows: { none: {} },
    NOT: [
      { tags: { has: '__pft:goal-transfer' } },
    ],
  };
}

function buildRegularMonthlyExpenseWhere(
  userId: string,
  filters: MonthlyExpenseFilters,
  dateRange = getMonthDateRange(filters.month, filters.year)
): Prisma.TransactionWhereInput {
  return {
    ...buildRegularMonthlyTransactionWhere(userId, filters, dateRange),
    type: 'EXPENSE',
  };
}

function buildRegularMonthlyIncomeWhere(
  userId: string,
  filters: MonthlyExpenseFilters,
  dateRange = getMonthDateRange(filters.month, filters.year)
): Prisma.TransactionWhereInput {
  return {
    ...buildRegularMonthlyTransactionWhere(userId, filters, dateRange),
    type: 'INCOME',
  };
}

export async function getMonthlyExpenseDetails(userId: string, filters: MonthlyExpenseFilters) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(filters.limit || 50, 100));
  const dateRange = getMonthDateRange(filters.month, filters.year);
  const previousMonth = getPreviousMonth(filters.month, filters.year);
  const previousDateRange = getMonthDateRange(previousMonth.month, previousMonth.year);

  const regularActivityWhere = buildRegularMonthlyTransactionWhere(userId, filters, dateRange);
  const regularExpenseWhere = buildRegularMonthlyExpenseWhere(userId, filters, dateRange);
  const regularIncomeWhere = buildRegularMonthlyIncomeWhere(userId, filters, dateRange);
  const previousRegularExpenseWhere = buildRegularMonthlyExpenseWhere(
    userId,
    { ...filters, month: previousMonth.month, year: previousMonth.year },
    previousDateRange
  );
  const previousRegularIncomeWhere = buildRegularMonthlyIncomeWhere(
    userId,
    { ...filters, month: previousMonth.month, year: previousMonth.year },
    previousDateRange
  );
  const allExpenseWhere = buildMonthlyExpenseWhere(userId, filters, dateRange);
  const allIncomeWhere = buildMonthlyIncomeWhere(userId, filters, dateRange);
  const savingsWhere: Prisma.TransactionWhereInput = {
    ...allExpenseWhere,
    tags: { has: '__pft:goal-transfer' },
  };
  const investmentWhere: Prisma.TransactionWhereInput = {
    ...allExpenseWhere,
    investmentCashflows: { some: {} },
  };

  const [
    transactions,
    total,
    regularExpenseAggregate,
    regularIncomeAggregate,
    previousRegularExpenseAggregate,
    previousRegularIncomeAggregate,
    allExpenseAggregate,
    allIncomeAggregate,
    savingsAggregate,
    investmentAggregate,
    expenseCategoryGroups,
    incomeCategoryGroups,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: regularActivityWhere,
      include: {
        category: true,
        account: true,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where: regularActivityWhere }),
    prisma.transaction.aggregate({ where: regularExpenseWhere, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: regularIncomeWhere, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: previousRegularExpenseWhere, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: previousRegularIncomeWhere, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: allExpenseWhere, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: allIncomeWhere, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: savingsWhere, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: investmentWhere, _sum: { amount: true } }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: regularExpenseWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: regularIncomeWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const categoryGroups = [...expenseCategoryGroups, ...incomeCategoryGroups];
  const categoryIds = Array.from(new Set(categoryGroups.map(group => group.categoryId)));
  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds }, userId },
        select: { id: true, name: true, color: true, icon: true },
      })
    : [];
  const categoryMap = new Map(categories.map(category => [category.id, category]));
  const totalRegularExpense = Number(regularExpenseAggregate._sum.amount || 0);
  const totalRegularIncome = Number(regularIncomeAggregate._sum.amount || 0);

  const categoryBreakdown = expenseCategoryGroups
    .map(group => {
      const category = categoryMap.get(group.categoryId);
      const totalAmount = Number(group._sum.amount || 0);
      return {
        categoryId: group.categoryId,
        categoryName: category?.name || 'Uncategorized',
        categoryColor: category?.color || '#64748b',
        categoryIcon: category?.icon || 'tag',
        total: totalAmount,
        count: group._count._all,
        percentage: totalRegularExpense > 0 ? Math.round((totalAmount / totalRegularExpense) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
  const incomeCategoryBreakdown = incomeCategoryGroups
    .map(group => {
      const category = categoryMap.get(group.categoryId);
      const totalAmount = Number(group._sum.amount || 0);
      return {
        categoryId: group.categoryId,
        categoryName: category?.name || 'Uncategorized',
        categoryColor: category?.color || '#64748b',
        categoryIcon: category?.icon || 'tag',
        total: totalAmount,
        count: group._count._all,
        percentage: totalRegularIncome > 0 ? Math.round((totalAmount / totalRegularIncome) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    transactions,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
    totalRegularIncome,
    totalRegularExpense,
    regularNet: totalRegularIncome - totalRegularExpense,
    previousRegularIncome: Number(previousRegularIncomeAggregate._sum.amount || 0),
    previousRegularExpense: Number(previousRegularExpenseAggregate._sum.amount || 0),
    totalIncome: Number(allIncomeAggregate._sum.amount || 0),
    totalExpense: Number(allExpenseAggregate._sum.amount || 0),
    savingsExpense: Number(savingsAggregate._sum.amount || 0),
    investmentExpense: Number(investmentAggregate._sum.amount || 0),
    categoryBreakdown,
    incomeCategoryBreakdown,
    dateRange,
    previousMonth,
  };
}

export async function getRegularMonthlyTransactionCategories(userId: string, filters: MonthlyExpenseFilters) {
  const regularWhere = buildRegularMonthlyTransactionWhere(userId, { ...filters, categoryId: undefined });
  const categoryGroups = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: regularWhere,
    _sum: { amount: true },
  });
  const categoryIds = categoryGroups.map(group => group.categoryId);

  if (categoryIds.length === 0) return [];

  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds }, userId },
    select: { id: true, name: true },
  });
  const totalMap = new Map(categoryGroups.map(group => [group.categoryId, Number(group._sum.amount || 0)]));

  return categories
    .map(category => ({ ...category, total: totalMap.get(category.id) || 0 }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .map(({ id, name }) => ({ id, name }));
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
