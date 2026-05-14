import {
  getAdminManualPaymentMethodsAction,
  getAdminManualPaymentRequestsAction,
} from '@/actions/admin.actions';
import AdminManualPaymentsClient from '@/components/admin/AdminManualPaymentsClient';
import { requireRole } from '@/lib/rbac';

export default async function AdminPaymentsPage() {
  await requireRole('ADMIN');
  const [paymentMethods, paymentRequests] = await Promise.all([
    getAdminManualPaymentMethodsAction(),
    getAdminManualPaymentRequestsAction(),
  ]);

  return (
    <AdminManualPaymentsClient
      initialPaymentMethods={paymentMethods}
      initialPaymentRequests={paymentRequests}
    />
  );
}
