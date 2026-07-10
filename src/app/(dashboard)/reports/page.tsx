import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getMonthlyTrendRange, getCategoryBreakdownRange, getInvestmentReportRange } from '@/services/report.service';
import { prisma } from '@/lib/prisma';
import ReportsPageClient from '@/components/reports/ReportsPageClient';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
import { subMonths } from 'date-fns';
import { getCurrentFinancialMonthYear, getFinancialMonthDateRange } from '@/lib/financial-period';
import { getFinancialMonthStartDay } from '@/services/financial-period.service';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();
  await validateAccess('REPORTS', 'VIEW');

  const params = await searchParams;
  const financialMonthStartDay = await getFinancialMonthStartDay(userId);
  const now = new Date();
  const current = getCurrentFinancialMonthYear(now, financialMonthStartDay);
  const defaultStart = subMonths(new Date(current.year, current.month - 1, 1), 11); // last 12 financial months

  const fromMonth = params.fromMonth ? parseInt(params.fromMonth) : defaultStart.getMonth() + 1;
  const fromYear = params.fromYear ? parseInt(params.fromYear) : defaultStart.getFullYear();
  const toMonth = params.toMonth ? parseInt(params.toMonth) : current.month;
  const toYear = params.toYear ? parseInt(params.toYear) : current.year;

  // Date range for transaction query
  const startDate = getFinancialMonthDateRange(fromMonth, fromYear, financialMonthStartDay).startDate;
  const endDate = getFinancialMonthDateRange(toMonth, toYear, financialMonthStartDay).endDate;

  const [trend, breakdown, transactions, investmentReport] = await Promise.all([
    getMonthlyTrendRange(userId, fromMonth, fromYear, toMonth, toYear, financialMonthStartDay),
    getCategoryBreakdownRange(userId, fromMonth, fromYear, toMonth, toYear, financialMonthStartDay),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      include: { category: { select: { name: true } }, account: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 500,
    }),
    getInvestmentReportRange(userId, fromMonth, fromYear, toMonth, toYear, financialMonthStartDay),
  ]);

  return (
    <ReportsPageClient
      trend={trend}
      breakdown={breakdown}
      transactions={JSON.parse(JSON.stringify(transactions))}
      investmentReport={JSON.parse(JSON.stringify(investmentReport))}
      fromMonth={fromMonth}
      fromYear={fromYear}
      toMonth={toMonth}
      toYear={toYear}
      financialMonthStartDay={financialMonthStartDay}
    />
  );
}
