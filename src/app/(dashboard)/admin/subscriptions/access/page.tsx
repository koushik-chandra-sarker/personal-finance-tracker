import SubscriptionManagementClient from '@/components/admin/SubscriptionManagementClient';
import { getSubscriptionAdminData } from '../subscription-admin-data';

export default async function AdminSubscriptionAccessPage() {
  const { users, packages, paymentMethods, paymentRequests } = await getSubscriptionAdminData();

  return (
    <SubscriptionManagementClient
      view="access"
      initialUsers={users}
      initialPackages={packages}
      initialPaymentMethods={paymentMethods}
      initialPaymentRequests={paymentRequests}
    />
  );
}
