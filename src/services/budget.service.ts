import { prisma } from '@/lib/prisma';
import type { BudgetWithSpent } from '@/types';
import { getFinancialMonthDateRange, getPreviousFinancialMonth } from '@/lib/financial-period';

async function getCategorySpending(userId: string, categoryId: string, month: number, year: number, startDay = 1) {
  const { startDate, endDate } = getFinancialMonthDateRange(month, year, startDay);
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
  depth = 0,
  startDay = 1
): Promise<number> {
  if (depth > 120) return 0;

  const previous = getPreviousFinancialMonth(month, year);
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
    depth + 1,
    startDay
  );
  const previousLimit = Number(previousBudget.amount) + incomingRollover;
  const previousSpent = await getCategorySpending(userId, categoryId, previous.month, previous.year, startDay);

  return Math.max(0, previousLimit - previousSpent);
}

export async function getBudgets(userId: string, month: number, year: number, startDay = 1) {
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

  const { startDate, endDate } = getFinancialMonthDateRange(month, year, startDay);

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
    const rolloverAmount = await getRolloverAmount(userId, budget.categoryId, month, year, 0, startDay);
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

export type BudgetUsageSummary = {
  spent: number;
  total: number;
  percentage: number;
  budgetCount: number;
  month: number | null;
  year: number | null;
  isFallback: boolean;
};

function calculateUsage(budgets: BudgetWithSpent[]): Pick<BudgetUsageSummary, 'spent' | 'total' | 'percentage'> {
  const total = budgets.reduce((sum, budget) => sum + budget.effectiveAmount, 0);
  const spent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const percentage = total > 0 ? Math.round((spent / total) * 100) : 0;
  return { spent, total, percentage };
}

export async function getBudgetUsageSummary(userId: string, month: number, year: number, startDay = 1): Promise<BudgetUsageSummary> {
  const selectedMonthBudgets = await getBudgets(userId, month, year, startDay);
  if (selectedMonthBudgets.length > 0) {
    return {
      ...calculateUsage(selectedMonthBudgets),
      budgetCount: selectedMonthBudgets.length,
      month,
      year,
      isFallback: false,
    };
  }

  const latestBudgetPeriod = await prisma.budget.findFirst({
    where: { userId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    select: { month: true, year: true },
  });

  if (!latestBudgetPeriod) {
    return { spent: 0, total: 0, percentage: 0, budgetCount: 0, month: null, year: null, isFallback: false };
  }

  // Fallback mode: use latest seeded budget limits, but calculate usage against the selected month spending.
  const latestBudgets = await prisma.budget.findMany({
    where: { userId, month: latestBudgetPeriod.month, year: latestBudgetPeriod.year },
    select: { categoryId: true, amount: true },
  });

  const fallbackCategoryIds = latestBudgets.map((budget) => budget.categoryId);
  const { startDate: selectedStartDate, endDate: selectedEndDate } = getFinancialMonthDateRange(month, year, startDay);
  const selectedMonthSpending = fallbackCategoryIds.length
    ? await prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'EXPENSE',
          categoryId: { in: fallbackCategoryIds },
          date: { gte: selectedStartDate, lte: selectedEndDate },
        },
        _sum: { amount: true },
      })
    : [];

  const selectedSpendingMap = new Map(
    selectedMonthSpending.map((item) => [item.categoryId, Number(item._sum.amount || 0)])
  );
  const total = latestBudgets.reduce((sum, budget) => sum + Number(budget.amount || 0), 0);
  const spent = latestBudgets.reduce((sum, budget) => sum + (selectedSpendingMap.get(budget.categoryId) || 0), 0);

  return {
    spent,
    total,
    percentage: total > 0 ? Math.round((spent / total) * 100) : 0,
    budgetCount: latestBudgets.length,
    month: latestBudgetPeriod.month,
    year: latestBudgetPeriod.year,
    isFallback: true,
  };
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
