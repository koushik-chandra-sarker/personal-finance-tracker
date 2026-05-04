import { getAdminSubscriptionPackagesAction, getAdminUsersPageAction, type AdminUsersQuery } from '@/actions/admin.actions';
import UserManagementClient from '@/components/admin/UserManagementClient';
import { requireRole } from '@/lib/rbac';
import type { SubscriptionStatus, UserRole, UserStatus } from '@prisma/client';

type AdminUsersSearchParams = {
  q?: string | string[];
  role?: string | string[];
  accountStatus?: string | string[];
  access?: string | string[];
  status?: string | string[];
  packageId?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseAdminUsersQuery(searchParams: AdminUsersSearchParams): AdminUsersQuery {
  const page = Number(firstParam(searchParams.page) || 1);
  const role = firstParam(searchParams.role);
  const accountStatus = firstParam(searchParams.accountStatus);
  const status = firstParam(searchParams.status);

  return {
    q: firstParam(searchParams.q),
    role: role === 'ADMIN' || role === 'USER' ? role as UserRole : 'all',
    accountStatus: accountStatus === 'ACTIVE' || accountStatus === 'SUSPENDED' || accountStatus === 'INVITED' || accountStatus === 'DELETED'
      ? accountStatus as UserStatus
      : 'all',
    access: firstParam(searchParams.access) as AdminUsersQuery['access'],
    status: status === 'ACTIVE' || status === 'TRIALING' || status === 'PAST_DUE' || status === 'CANCELED' || status === 'MISSING'
      ? status as SubscriptionStatus | 'MISSING'
      : 'all',
    packageId: firstParam(searchParams.packageId),
    sort: firstParam(searchParams.sort) as AdminUsersQuery['sort'],
    page: Number.isFinite(page) ? page : 1,
  };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminUsersSearchParams>;
}) {
  await requireRole('ADMIN');
  const resolvedSearchParams = await searchParams;
  const query = parseAdminUsersQuery(resolvedSearchParams);
  const [usersPage, packages] = await Promise.all([
    getAdminUsersPageAction(query),
    getAdminSubscriptionPackagesAction(),
  ]);

  return <UserManagementClient usersPage={usersPage} packages={packages} />;
}
