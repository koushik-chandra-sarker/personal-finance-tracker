import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getMonthlyTrend, getCategoryBreakdown } from '@/services/report.service';
import { prisma } from '@/lib/prisma';
import { getCurrentMonthYear } from '@/lib/utils';
import ReportsPageClient from '@/components/reports/ReportsPageClient';
import { getEffectiveUserId, validateAccess } from '@/lib/access';

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();
  await validateAccess('REPORTS', 'VIEW');
  const { month, year } = getCurrentMonthYear();

  const [trend, breakdown, transactions] = await Promise.all([
    getMonthlyTrend(userId, 12),
    getCategoryBreakdown(userId, month, year),
    prisma.transaction.findMany({
      where: { userId },
      include: { category: { select: { name: true } }, account: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 500,
    }),
  ]);

  return (
    <ReportsPageClient
      trend={trend}
      breakdown={breakdown}
      transactions={JSON.parse(JSON.stringify(transactions))}
    />
  );
}
