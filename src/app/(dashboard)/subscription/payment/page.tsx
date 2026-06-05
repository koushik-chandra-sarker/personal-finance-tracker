import { auth } from '@/lib/auth';
import {
  getActiveManualPaymentMethodsAction,
  getActiveSubscriptionPackagesAction,
  getMyManualPaymentRequestsAction,
} from '@/actions/settings.actions';
import { hasActiveSubscriptionAccess } from '@/lib/subscription-access';
import { getCurrentUserAccess } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import PaymentPageClient from '@/components/subscription/PaymentPageClient';
import { getPublicContactSettings } from '@/services/app-config.service';

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

  const access = await getCurrentUserAccess();
  const hasActiveAccess = hasActiveSubscriptionAccess(access);
  const isTrialAccess = access.subscriptionStatus === 'TRIALING';
  const hasPendingPaymentAccess = Boolean(access.pendingPaymentAccessActive);

  const params = await searchParams;
  const [packages, paymentMethods, paymentRequests, contactSettings] = await Promise.all([
    getActiveSubscriptionPackagesAction(),
    getActiveManualPaymentMethodsAction(),
    getMyManualPaymentRequestsAction(),
    getPublicContactSettings(),
  ]);

  return (
    <PaymentPageClient
      packages={packages}
      selectedPackageId={firstParam(params.packageId) || null}
      paymentMethods={paymentMethods}
      paymentRequests={paymentRequests}
      accessState={hasActiveAccess && !isTrialAccess && !hasPendingPaymentAccess ? 'active' : 'blocked'}
      activeSubscription={hasActiveAccess && !hasPendingPaymentAccess ? {
        packageId: access.subscriptionPackageId,
        source: access.subscriptionSource,
        status: access.subscriptionStatus,
        currentPeriodEnd: access.subscriptionCurrentPeriodEnd?.toISOString() || null,
      } : null}
      pendingPaymentAccessUntil={access.pendingPaymentAccessUntil?.toISOString() || null}
      pendingPaymentAccessHours={access.pendingPaymentAccessHours}
      supportWhatsappNumber={contactSettings.whatsappNumber}
    />
  );
}
