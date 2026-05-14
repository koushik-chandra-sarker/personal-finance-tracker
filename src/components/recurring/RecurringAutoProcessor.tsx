'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { processDueRecurringAction } from '@/actions/recurring.actions';
import { processDuePersonalSubscriptionsAction } from '@/actions/personal-subscription.actions';

const EXCLUDED_PATH_PREFIXES = ['/subscription', '/change-password'];

function hasRecurringProcessingAccess(user?: {
  role?: string | null;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodEnd?: string | null;
}) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.subscriptionPlan !== 'PRO') return false;
  if (user.subscriptionStatus !== 'ACTIVE' && user.subscriptionStatus !== 'TRIALING') return false;
  if (!user.subscriptionCurrentPeriodEnd) return true;
  return new Date(user.subscriptionCurrentPeriodEnd) >= new Date();
}

export default function RecurringAutoProcessor() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user;
  const canProcessRecurring = hasRecurringProcessingAccess(user);

  useEffect(() => {
    if (!pathname || EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return;
    }
    if (status !== 'authenticated' || !canProcessRecurring) {
      return;
    }

    console.log('Processing due recurring transactions and subscription payments...');
    Promise.all([
      processDueRecurringAction(),
      processDuePersonalSubscriptionsAction(),
    ])
      .then(([recurringResult, subscriptionResult]) => {
        console.log('Due transactions processed:', { recurringResult, subscriptionResult });
        if (recurringResult.processed > 0 || subscriptionResult.processed > 0) router.refresh();
      })
      .catch((error) => {
        console.error('Failed to process due scheduled transactions:', error);
      });
  }, [
    pathname,
    router,
    canProcessRecurring,
    status,
  ]);

  return null;
}
