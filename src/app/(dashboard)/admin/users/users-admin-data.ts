import {
  getAdminSubscriptionPackagesAction,
  getAdminUserInvitesAction,
  getAdminUsersPageAction,
  type AdminUsersQuery,
} from '@/actions/admin.actions';
import type { SubscriptionStatus, UserRole, UserStatus } from '@prisma/client';

export type AdminUsersSearchParams = {
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

export function parseAdminUsersQuery(searchParams: AdminUsersSearchParams): AdminUsersQuery {
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

export async function getUsersAdminData(query: AdminUsersQuery = {}) {
  const [usersPage, packages, invites] = await Promise.all([
    getAdminUsersPageAction(query),
    getAdminSubscriptionPackagesAction(),
    getAdminUserInvitesAction(),
  ]);

  return { usersPage, packages, invites };
}
