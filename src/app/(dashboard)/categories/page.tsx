import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCategories } from '@/services/category.service';
import CategoryPageClient from '@/components/categories/CategoryPageClient';
import { getEffectiveUserId, validateAccess } from '@/lib/access';

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();
  await validateAccess('TRANSACTIONS', 'VIEW');

  const sp = await searchParams;
  const now = new Date();
  const currentMonth = sp.month ? parseInt(sp.month) : now.getMonth() + 1;
  const currentYear = sp.year ? parseInt(sp.year) : now.getFullYear();

  const categories = await getCategories(userId, currentMonth, currentYear);

  return <CategoryPageClient initialCategories={categories as any} currentMonth={currentMonth} currentYear={currentYear} />;
}
