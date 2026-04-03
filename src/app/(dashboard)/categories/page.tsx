import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCategories } from '@/services/category.service';
import CategoryPageClient from '@/components/categories/CategoryPageClient';
import { getEffectiveUserId, validateAccess } from '@/lib/access';

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();
  await validateAccess('TRANSACTIONS', 'VIEW');

  const categories = await getCategories(userId);

  return <CategoryPageClient initialCategories={categories} />;
}
