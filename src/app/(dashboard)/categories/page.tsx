import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCategories } from '@/services/category.service';
import CategoryPageClient from '@/components/categories/CategoryPageClient';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
import { getCurrentFinancialMonthYear } from '@/lib/financial-period';
import { getFinancialMonthStartDay } from '@/services/financial-period.service';

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();
  await validateAccess('TRANSACTIONS', 'VIEW');

  const sp = await searchParams;
  const financialMonthStartDay = await getFinancialMonthStartDay(userId);
  const current = getCurrentFinancialMonthYear(new Date(), financialMonthStartDay);
  const currentMonth = sp.month ? parseInt(sp.month) : current.month;
  const currentYear = sp.year ? parseInt(sp.year) : current.year;

  const categories = await getCategories(userId, currentMonth, currentYear, financialMonthStartDay);

  return <CategoryPageClient initialCategories={categories as any} currentMonth={currentMonth} currentYear={currentYear} />;
}
