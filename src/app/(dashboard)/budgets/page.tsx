import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getBudgets } from '@/services/budget.service';
import { prisma } from '@/lib/prisma';
import { getCurrentMonthYear } from '@/lib/utils';
import BudgetPageClient from '@/components/budgets/BudgetPageClient';

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;
  
  const params = await searchParams;
  const current = getCurrentMonthYear();
  const month = params.month ? parseInt(params.month) : current.month;
  const year = params.year ? parseInt(params.year) : current.year;

  const [budgets, categories] = await Promise.all([
    getBudgets(userId, month, year),
    prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ]);

  return <BudgetPageClient budgets={budgets} categories={JSON.parse(JSON.stringify(categories))} currentMonth={month} currentYear={year} />;
}
