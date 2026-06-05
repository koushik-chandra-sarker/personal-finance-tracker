import UserManagementClient from '@/components/admin/UserManagementClient';
import { getUsersAdminData, parseAdminUsersQuery, type AdminUsersSearchParams } from '../users-admin-data';

export default async function AdminUserAccountsPage({
  searchParams,
}: {
  searchParams: Promise<AdminUsersSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = parseAdminUsersQuery(resolvedSearchParams);
  const { usersPage, packages, invites } = await getUsersAdminData(query);

  return <UserManagementClient view="accounts" usersPage={usersPage} packages={packages} invites={invites} />;
}
