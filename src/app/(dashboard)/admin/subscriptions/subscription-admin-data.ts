import {
  getAdminManualPaymentMethodsAction,
  getAdminManualPaymentRequestsAction,
  getAdminSubscriptionPackagesAction,
  getAdminUsersAction,
} from '@/actions/admin.actions';
import { requireRole } from '@/lib/rbac';

export async function getSubscriptionAdminData() {
  await requireRole('ADMIN');
  const [users, packages, paymentMethods, paymentRequests] = await Promise.all([
    getAdminUsersAction(),
    getAdminSubscriptionPackagesAction(),
    getAdminManualPaymentMethodsAction(),
    getAdminManualPaymentRequestsAction(),
  ]);

  return { users, packages, paymentMethods, paymentRequests };
}
