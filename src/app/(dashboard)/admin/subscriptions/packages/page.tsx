import SubscriptionManagementClient from '@/components/admin/SubscriptionManagementClient';
import { getSubscriptionAdminData } from '../subscription-admin-data';

export default async function AdminSubscriptionPackagesPage() {
  const { users, packages, paymentMethods, paymentRequests } = await getSubscriptionAdminData();

  return (
    <SubscriptionManagementClient
      view="packages"
      initialUsers={users}
      initialPackages={packages}
      initialPaymentMethods={paymentMethods}
      initialPaymentRequests={paymentRequests}
    />
  );
}
