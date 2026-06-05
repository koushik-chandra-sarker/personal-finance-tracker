import SubscriptionManagementClient from '@/components/admin/SubscriptionManagementClient';
import { getSubscriptionAdminData } from '../subscription-admin-data';

export default async function AdminSubscriptionPaymentAccountsPage() {
  const { users, packages, paymentMethods, paymentRequests } = await getSubscriptionAdminData();

  return (
    <SubscriptionManagementClient
      view="payment-accounts"
      initialUsers={users}
      initialPackages={packages}
      initialPaymentMethods={paymentMethods}
      initialPaymentRequests={paymentRequests}
    />
  );
}
