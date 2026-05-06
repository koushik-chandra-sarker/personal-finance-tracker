import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getMonthlyTrendRange, getCategoryBreakdownRange, getInvestmentReportRange } from '@/services/report.service';
import { prisma } from '@/lib/prisma';
import ReportsPageClient from '@/components/reports/ReportsPageClient';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
import { subMonths } from 'date-fns';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();
  await validateAccess('REPORTS', 'VIEW');

  const params = await searchParams;
  const now = new Date();
  const defaultStart = subMonths(now, 11); // last 12 months

  const fromMonth = params.fromMonth ? parseInt(params.fromMonth) : defaultStart.getMonth() + 1;
  const fromYear = params.fromYear ? parseInt(params.fromYear) : defaultStart.getFullYear();
  const toMonth = params.toMonth ? parseInt(params.toMonth) : now.getMonth() + 1;
  const toYear = params.toYear ? parseInt(params.toYear) : now.getFullYear();

  // Date range for transaction query
  const startDate = new Date(fromYear, fromMonth - 1, 1);
  const endDate = new Date(toYear, toMonth, 0, 23, 59, 59, 999);

  const [trend, breakdown, transactions, investmentReport] = await Promise.all([
    getMonthlyTrendRange(userId, fromMonth, fromYear, toMonth, toYear),
    getCategoryBreakdownRange(userId, fromMonth, fromYear, toMonth, toYear),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      include: { category: { select: { name: true } }, account: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 500,
    }),
    getInvestmentReportRange(userId, fromMonth, fromYear, toMonth, toYear),
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
    />
  );
}
