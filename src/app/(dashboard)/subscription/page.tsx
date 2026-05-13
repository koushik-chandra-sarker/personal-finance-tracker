import { auth } from '@/lib/auth';
import {
  getActiveSubscriptionPackagesAction,
  getMyManualPaymentRequestsAction,
} from '@/actions/settings.actions';
import { hasActiveSubscriptionAccess } from '@/lib/subscription-access';
import { redirect } from 'next/navigation';
import SubscriptionPageClient from '@/components/subscription/SubscriptionPageClient';

interface SubscriptionPageProps {
  searchParams: Promise<{ reason?: string | string[]; next?: string | string[] }>;
}

export default async function SubscriptionPage({ searchParams }: SubscriptionPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  if (hasActiveSubscriptionAccess(session.user)) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const reasonParam = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const [packages, paymentRequests] = await Promise.all([
    getActiveSubscriptionPackagesAction(),
    getMyManualPaymentRequestsAction(),
  ]);

  const hasPendingPayment = paymentRequests.some((request) => request.status === 'PENDING');
  if (hasPendingPayment) {
    redirect('/subscription/payment');
  }

  return (
    <SubscriptionPageClient
      reason={reasonParam || 'missing'}
      packages={packages}
    />
  );
}
