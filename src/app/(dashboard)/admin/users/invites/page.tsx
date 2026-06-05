import UserManagementClient from '@/components/admin/UserManagementClient';
import { getUsersAdminData } from '../users-admin-data';

export default async function AdminUserInvitesPage() {
  const { usersPage, packages, invites } = await getUsersAdminData();

  return <UserManagementClient view="invites" usersPage={usersPage} packages={packages} invites={invites} />;
}
