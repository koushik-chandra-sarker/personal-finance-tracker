import { prisma } from '@/lib/prisma';
import type { MonthlySummary, CategoryBreakdown, MonthlyTrend } from '@/types';
import { format, subMonths } from 'date-fns';

export async function getMonthlySummary(userId: string, month: number, year: number): Promise<MonthlySummary> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [income, expense, count] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: 'INCOME', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: 'EXPENSE', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
    prisma.transaction.count({
      where: { userId, date: { gte: startDate, lte: endDate } },
    }),
  ]);

  const totalIncome = Number(income._sum.amount || 0);
  const totalExpense = Number(expense._sum.amount || 0);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: count,
  };
}

export async function getCategoryBreakdown(userId: string, month: number, year: number): Promise<CategoryBreakdown[]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  return getCategoryBreakdownForRange(userId, startDate, endDate);
}

export async function getCategoryBreakdownRange(
  userId: string,
  startMonth: number, startYear: number,
  endMonth: number, endYear: number
): Promise<CategoryBreakdown[]> {
  const startDate = new Date(startYear, startMonth - 1, 1);
  const endDate = new Date(endYear, endMonth, 0, 23, 59, 59);
  return getCategoryBreakdownForRange(userId, startDate, endDate);
}

async function getCategoryBreakdownForRange(userId: string, startDate: Date, endDate: Date): Promise<CategoryBreakdown[]> {
  const spending = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { userId, type: 'EXPENSE', date: { gte: startDate, lte: endDate } },
    _sum: { amount: true },
  });

  const totalExpense = spending.reduce((sum, s) => sum + Number(s._sum.amount || 0), 0);

  const categories = await prisma.category.findMany({
    where: { userId, id: { in: spending.map((s) => s.categoryId) } },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return spending
    .map((s) => {
      const cat = categoryMap.get(s.categoryId);
      const total = Number(s._sum.amount || 0);
      return {
        categoryId: s.categoryId,
        categoryName: cat?.name || 'Unknown',
        categoryColor: cat?.color || '#64748b',
        categoryIcon: cat?.icon || 'tag',
        total,
        percentage: totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export async function getMonthlyTrend(userId: string, months: number = 6): Promise<MonthlyTrend[]> {
  const now = new Date();
  const startDate = subMonths(now, months - 1);
  return getMonthlyTrendRange(
    userId,
    startDate.getMonth() + 1, startDate.getFullYear(),
    now.getMonth() + 1, now.getFullYear()
  );
}

export async function getMonthlyTrendRange(
  userId: string,
  startMonth: number, startYear: number,
  endMonth: number, endYear: number
): Promise<MonthlyTrend[]> {
  const trends: MonthlyTrend[] = [];

  let m = startMonth;
  let y = startYear;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    const summary = await getMonthlySummary(userId, m, y);
    const date = new Date(y, m - 1, 1);
    trends.push({
      month: format(date, 'MMM yyyy'),
      income: summary.totalIncome,
      expense: summary.totalExpense,
    });
    m++;
    if (m > 12) { m = 1; y++; }
  }

  return trends;
}

export async function getRecentTransactions(userId: string, limit: number = 5) {
  return prisma.transaction.findMany({
    where: { userId },
    include: { category: true, account: true },
    orderBy: { date: 'desc' },
  });
}

export async function getInvestmentReportRange(
  userId: string,
  startMonth: number, startYear: number,
  endMonth: number, endYear: number
) {
  const startDate = new Date(startYear, startMonth - 1, 1);
  const endDate = new Date(endYear, endMonth, 0, 23, 59, 59);

  const [returns, valuations, investments] = await Promise.all([
    prisma.investmentReturn.findMany({
      where: { investment: { userId }, date: { gte: startDate, lte: endDate } },
      include: { investment: { include: { typeConfig: true } } },
    }),
    prisma.investmentValuation.findMany({
      where: { investment: { userId }, date: { gte: startDate, lte: endDate } },
      include: { investment: { include: { typeConfig: true } } },
    }),
    prisma.investment.findMany({
      where: { userId },
      include: { typeConfig: true },
    })
  ]);

  const totalReturnAmount = returns.reduce((sum, r) => sum + Number(r.amount), 0);
  
  // Group returns by type
  const returnsByType = returns.reduce((acc, r) => {
    const type = r.type;
    acc[type] = (acc[type] || 0) + Number(r.amount);
    return acc;
  }, {} as Record<string, number>);

  // Group returns by investment type
  const returnsByInvType = returns.reduce((acc, r) => {
    const type = r.investment.typeConfig.name;
    acc[type] = (acc[type] || 0) + Number(r.amount);
    return acc;
  }, {} as Record<string, number>);

  return {
    totalReturnAmount,
    returnsByType,
    returnsByInvType,
    investmentCount: investments.length,
    activeInvestmentCount: investments.filter(i => i.status === 'ACTIVE').length,
  };
}

