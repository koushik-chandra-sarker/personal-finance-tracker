import {
  getAdminManualPaymentMethodsAction,
  getAdminManualPaymentRequestsAction,
  getAdminSubscriptionPackagesAction,
  getAdminUsersAction,
} from '@/actions/admin.actions';
import SubscriptionManagementClient from '@/components/admin/SubscriptionManagementClient';
import { requireRole } from '@/lib/rbac';

export default async function AdminSubscriptionsPage() {
  await requireRole('ADMIN');
  const [users, packages, paymentMethods, paymentRequests] = await Promise.all([
    getAdminUsersAction(),
    getAdminSubscriptionPackagesAction(),
    getAdminManualPaymentMethodsAction(),
    getAdminManualPaymentRequestsAction(),
  ]);

  return (
    <SubscriptionManagementClient
      initialUsers={users}
      initialPackages={packages}
      initialPaymentMethods={paymentMethods}
      initialPaymentRequests={paymentRequests}
    />
  );
}
