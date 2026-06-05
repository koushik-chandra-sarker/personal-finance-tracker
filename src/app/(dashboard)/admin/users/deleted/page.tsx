import UserManagementClient from '@/components/admin/UserManagementClient';
import { getUsersAdminData } from '../users-admin-data';

export default async function AdminDeletedUsersPage() {
  const { usersPage, packages, invites } = await getUsersAdminData({ accountStatus: 'DELETED' });

  return <UserManagementClient view="deleted" usersPage={usersPage} packages={packages} invites={invites} />;
}
