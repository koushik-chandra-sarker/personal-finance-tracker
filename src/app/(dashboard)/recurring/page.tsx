import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getRecurringTransactions } from '@/services/recurring.service';
import { prisma } from '@/lib/prisma';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
import RecurringPageClient from '@/components/recurring/RecurringPageClient';

export default async function RecurringPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = await getEffectiveUserId();
  await validateAccess('TRANSACTIONS', 'VIEW');

  const [recurring, categories, accounts] = await Promise.all([
    getRecurringTransactions(userId),
    prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    prisma.account.findMany({ where: { userId, isActive: true } }),
  ]);

  return (
    <RecurringPageClient
      recurring={JSON.parse(JSON.stringify(recurring))}
      categories={JSON.parse(JSON.stringify(categories))}
      accounts={JSON.parse(JSON.stringify(accounts))}
    />
  );
}
