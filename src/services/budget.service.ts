import { prisma } from '@/lib/prisma';
import type { BudgetWithSpent } from '@/types';

export async function getBudgets(userId: string, month: number, year: number): Promise<BudgetWithSpent[]> {
  const budgets = await prisma.budget.findMany({
    where: { userId, month, year },
    include: { category: true },
  });

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

  return budgets.map((budget) => {
    const spent = spendingMap.get(budget.categoryId) || 0;
    const amount = Number(budget.amount);
    return {
      id: budget.id,
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      categoryColor: budget.category.color,
      categoryIcon: budget.category.icon,
      amount,
      spent,
      percentage: amount > 0 ? Math.round((spent / amount) * 100) : 0,
      month: budget.month,
      year: budget.year,
    };
  });
}

export async function createOrUpdateBudget(userId: string, data: {
  categoryId: string; amount: number; month: number; year: number;
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
    update: { amount: data.amount },
    create: {
      userId,
      categoryId: data.categoryId,
      amount: data.amount,
      month: data.month,
      year: data.year,
    },
  });
}

export async function deleteBudget(userId: string, id: string) {
  const budget = await prisma.budget.findFirst({ where: { id, userId } });
  if (!budget) throw new Error('Budget not found');
  await prisma.budget.delete({ where: { id } });
  return true;
}
