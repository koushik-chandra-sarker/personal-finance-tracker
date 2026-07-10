import { prisma } from '@/lib/prisma';
import type { MonthlySummary, CategoryBreakdown, MonthlyTrend, UpcomingBillsSummary } from '@/types';
import { format, subMonths } from 'date-fns';
import { getCurrentFinancialMonthYear, getFinancialMonthDateRange } from '@/lib/financial-period';

export async function getMonthlySummary(userId: string, month: number, year: number, startDay = 1): Promise<MonthlySummary> {
  const { startDate, endDate } = getFinancialMonthDateRange(month, year, startDay);

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

export async function getCategoryBreakdown(userId: string, month: number, year: number, startDay = 1): Promise<CategoryBreakdown[]> {
  const { startDate, endDate } = getFinancialMonthDateRange(month, year, startDay);
  return getCategoryBreakdownForRange(userId, startDate, endDate);
}

export async function getCategoryBreakdownRange(
  userId: string,
  startMonth: number, startYear: number,
  endMonth: number, endYear: number, startDay = 1
): Promise<CategoryBreakdown[]> {
  const startDate = getFinancialMonthDateRange(startMonth, startYear, startDay).startDate;
  const endDate = getFinancialMonthDateRange(endMonth, endYear, startDay).endDate;
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

export async function getMonthlyTrend(userId: string, months: number = 6, startDay = 1): Promise<MonthlyTrend[]> {
  const now = new Date();
  const current = getCurrentFinancialMonthYear(now, startDay);
  const currentAnchor = new Date(current.year, current.month - 1, 1);
  const startDate = subMonths(currentAnchor, months - 1);
  return getMonthlyTrendRange(
    userId,
    startDate.getMonth() + 1, startDate.getFullYear(),
    current.month, current.year, startDay
  );
}

export async function getMonthlyTrendRange(
  userId: string,
  startMonth: number, startYear: number,
  endMonth: number, endYear: number, startDay = 1
): Promise<MonthlyTrend[]> {
  const trends: MonthlyTrend[] = [];

  let m = startMonth;
  let y = startYear;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    const summary = await getMonthlySummary(userId, m, y, startDay);
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

export async function getRecentTransactions(userId: string, days: number = 7) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - Math.max(0, days - 1));

  return prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: now },
    },
    include: { category: true, account: true },
    orderBy: { date: 'desc' },
  });
}

export async function getUpcomingBillsSummary(userId: string, daysAhead: number = 14): Promise<UpcomingBillsSummary> {
  const from = new Date();
  const to = new Date(from);
  to.setDate(to.getDate() + daysAhead);

  const [aggregate, nextBill] = await Promise.all([
    prisma.recurringTransaction.aggregate({
      where: {
        userId,
        isActive: true,
        type: 'EXPENSE',
        nextRunDate: { gte: from, lte: to },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.recurringTransaction.findFirst({
      where: {
        userId,
        isActive: true,
        type: 'EXPENSE',
        nextRunDate: { gte: from, lte: to },
      },
      orderBy: { nextRunDate: 'asc' },
      select: { nextRunDate: true },
    }),
  ]);

  return {
    count: aggregate._count.id,
    totalAmount: Number(aggregate._sum.amount || 0),
    nextDueDate: nextBill?.nextRunDate || null,
  };
}

export async function getInvestmentReportRange(
  userId: string,
  startMonth: number, startYear: number,
  endMonth: number, endYear: number, startDay = 1
) {
  const startDate = getFinancialMonthDateRange(startMonth, startYear, startDay).startDate;
  const endDate = getFinancialMonthDateRange(endMonth, endYear, startDay).endDate;

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
