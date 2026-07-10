import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getBudgets } from '@/services/budget.service';
import { prisma } from '@/lib/prisma';
import { getCurrentFinancialMonthYear } from '@/lib/financial-period';
import { getFinancialMonthStartDay } from '@/services/financial-period.service';
import BudgetPageClient from '@/components/budgets/BudgetPageClient';
import { getEffectiveUserId, validateAccess } from '@/lib/access';

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();
  await validateAccess('BUDGETS', 'VIEW');
  
  const params = await searchParams;
  const financialMonthStartDay = await getFinancialMonthStartDay(userId);
  const current = getCurrentFinancialMonthYear(new Date(), financialMonthStartDay);
  const month = params.month ? parseInt(params.month) : current.month;
  const year = params.year ? parseInt(params.year) : current.year;

  const [budgets, categories] = await Promise.all([
    getBudgets(userId, month, year, financialMonthStartDay),
    prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ]);

  return <BudgetPageClient budgets={budgets} categories={JSON.parse(JSON.stringify(categories))} currentMonth={month} currentYear={year} financialMonthStartDay={financialMonthStartDay} />;
}
