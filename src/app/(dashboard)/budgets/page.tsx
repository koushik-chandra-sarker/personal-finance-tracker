import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getBudgets } from '@/services/budget.service';
import { prisma } from '@/lib/prisma';
import { getCurrentMonthYear } from '@/lib/utils';
import BudgetPageClient from '@/components/budgets/BudgetPageClient';

export default async function BudgetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;
  const { month, year } = getCurrentMonthYear();

  const [budgets, categories] = await Promise.all([
    getBudgets(userId, month, year),
    prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ]);

  return <BudgetPageClient budgets={budgets} categories={JSON.parse(JSON.stringify(categories))} />;
}
