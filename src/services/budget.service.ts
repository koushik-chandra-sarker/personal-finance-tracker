import { prisma } from '@/lib/prisma';
import type { BudgetWithSpent } from '@/types';

function getPreviousMonth(month: number, year: number) {
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }
  return { month: month - 1, year };
}

async function getCategorySpending(userId: string, categoryId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const spending = await prisma.transaction.aggregate({
    where: {
      userId,
      categoryId,
      type: 'EXPENSE',
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });
  return Number(spending._sum.amount || 0);
}

async function getRolloverAmount(
  userId: string,
  categoryId: string,
  month: number,
  year: number,
  depth = 0
): Promise<number> {
  if (depth > 120) return 0;

  const previous = getPreviousMonth(month, year);
  const previousBudget = await prisma.budget.findUnique({
    where: {
      userId_categoryId_month_year: {
        userId,
        categoryId,
        month: previous.month,
        year: previous.year,
      },
    },
  });

  if (!previousBudget?.rolloverEnabled) return 0;

  const incomingRollover = await getRolloverAmount(
    userId,
    categoryId,
    previous.month,
    previous.year,
    depth + 1
  );
  const previousLimit = Number(previousBudget.amount) + incomingRollover;
  const previousSpent = await getCategorySpending(userId, categoryId, previous.month, previous.year);

  return Math.max(0, previousLimit - previousSpent);
}

export async function getBudgets(userId: string, month: number, year: number) {
  const budgets = await prisma.budget.findMany({
    where: { userId, month, year },
    include: { category: true },
  });

  const userIds = new Set<string>();
  budgets.forEach(b => {
    if (b.createdById) userIds.add(b.createdById);
    if (b.updatedById) userIds.add(b.updatedById);
  });
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map(u => [u.id, u.name]));

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const spending = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      type: 'EXPENSE',
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  const spendingMap = new Map(spending.map((s) => [s.categoryId, Number(s._sum.amount || 0)]));

  return Promise.all(budgets.map(async (budget): Promise<BudgetWithSpent> => {
    const spent = spendingMap.get(budget.categoryId) || 0;
    const amount = Number(budget.amount);
    const rolloverAmount = await getRolloverAmount(userId, budget.categoryId, month, year);
    const effectiveAmount = amount + rolloverAmount;
    const remaining = effectiveAmount - spent;
    return {
      id: budget.id,
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      categoryColor: budget.category.color,
      categoryIcon: budget.category.icon,
      amount,
      rolloverEnabled: budget.rolloverEnabled,
      rolloverAmount,
      effectiveAmount,
      projectedRolloverAmount: budget.rolloverEnabled ? Math.max(0, remaining) : 0,
      spent,
      remaining,
      percentage: effectiveAmount > 0 ? Math.round((spent / effectiveAmount) * 100) : 0,
      month: budget.month,
      year: budget.year,
      createdByName: budget.createdById ? userMap.get(budget.createdById) || null : null,
      updatedByName: budget.updatedById ? userMap.get(budget.updatedById) || null : null,
    };
  }));
}

export async function createOrUpdateBudget(userId: string, executorId: string, data: {
  categoryId: string; amount: number; rolloverEnabled?: boolean; month: number; year: number;
}) {
  return prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId,
        categoryId: data.categoryId,
        month: data.month,
        year: data.year,
      },
    },
    update: { 
      amount: data.amount,
      rolloverEnabled: data.rolloverEnabled ?? false,
      updatedById: executorId
    },
    create: {
      userId,
      categoryId: data.categoryId,
      amount: data.amount,
      rolloverEnabled: data.rolloverEnabled ?? false,
      month: data.month,
      year: data.year,
      createdById: executorId,
      updatedById: executorId,
    },
  });
}

export async function deleteBudget(userId: string, id: string) {
  const budget = await prisma.budget.findFirst({ where: { id, userId } });
  if (!budget) throw new Error('Budget not found');
  await prisma.budget.delete({ where: { id } });
  return true;
}
