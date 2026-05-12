import { auth } from '@/lib/auth';
import {
  getActiveManualPaymentMethodsAction,
  getActiveSubscriptionPackagesAction,
  getMyManualPaymentRequestsAction,
} from '@/actions/settings.actions';
import { hasActiveSubscription } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import PaymentPageClient from '@/components/subscription/PaymentPageClient';

type PaymentSearchParams = {
  packageId?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SubscriptionPaymentPage({
  searchParams,
}: {
  searchParams: Promise<PaymentSearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  if (await hasActiveSubscription(session.user.id)) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const [packages, paymentMethods, paymentRequests] = await Promise.all([
    getActiveSubscriptionPackagesAction(),
    getActiveManualPaymentMethodsAction(),
    getMyManualPaymentRequestsAction(),
  ]);

  return (
    <PaymentPageClient
      packages={packages}
      selectedPackageId={firstParam(params.packageId) || null}
      paymentMethods={paymentMethods}
      paymentRequests={paymentRequests}
    />
  );
}
