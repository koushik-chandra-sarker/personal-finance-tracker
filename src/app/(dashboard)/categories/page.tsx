import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCategories } from '@/services/category.service';
import CategoryPageClient from '@/components/categories/CategoryPageClient';

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const categories = await getCategories(session.user.id);

  return <CategoryPageClient initialCategories={categories} />;
}
