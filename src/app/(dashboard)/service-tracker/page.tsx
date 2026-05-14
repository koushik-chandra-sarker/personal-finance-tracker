import PersonalSubscriptionsClient from '@/components/subscriptions/PersonalSubscriptionsClient';
import { getEffectiveUserId, validateAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { getPersonalSubscriptions } from '@/services/personal-subscription.service';

export default async function PersonalSubscriptionsPage() {
  const userId = await getEffectiveUserId();
  await validateAccess('SUBSCRIPTIONS', 'VIEW');

  const [subscriptions, accounts, categories] = await Promise.all([
    getPersonalSubscriptions(userId),
    prisma.account.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({
      where: { userId, type: 'EXPENSE' },
      select: { id: true, name: true, color: true, icon: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <PersonalSubscriptionsClient
      key={subscriptions.map((subscription) => `${subscription.id}:${subscription.updatedAt.toISOString()}`).join('|')}
      subscriptions={JSON.parse(JSON.stringify(subscriptions))}
      accounts={JSON.parse(JSON.stringify(accounts))}
      categories={JSON.parse(JSON.stringify(categories))}
    />
  );
}
