import { getAdminSubscriptionPackagesAction, getAdminUsersAction } from '@/actions/admin.actions';
import SubscriptionManagementClient from '@/components/admin/SubscriptionManagementClient';
import { requireRole } from '@/lib/rbac';

export default async function AdminSubscriptionsPage() {
  await requireRole('ADMIN');
  const [users, packages] = await Promise.all([
    getAdminUsersAction(),
    getAdminSubscriptionPackagesAction(),
  ]);

  return <SubscriptionManagementClient initialUsers={users} initialPackages={packages} />;
}
