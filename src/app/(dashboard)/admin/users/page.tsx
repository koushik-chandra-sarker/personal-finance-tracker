import { getAdminUsersAction } from '@/actions/admin.actions';
import UserManagementClient from '@/components/admin/UserManagementClient';
import { requireRole } from '@/lib/rbac';

export default async function AdminUsersPage() {
  await requireRole('ADMIN');
  const users = await getAdminUsersAction();

  return <UserManagementClient initialUsers={users} />;
}
