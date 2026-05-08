'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, KeyRound, MoreVertical, Search, Shield, Users } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';
import Select from '@/components/ui/Select';
import AdminCreateUserPanel from '@/components/admin/AdminCreateUserPanel';
import UserInvitePanel from '@/components/admin/UserInvitePanel';
import UserInviteList from '@/components/admin/UserInviteList';
import {
  updateUserStatusAction,
  updateUserRoleAction,
  type AdminSubscriptionPackageRow,
  type AdminUserInviteRow,
  type AdminUsersPageResult,
} from '@/actions/admin.actions';
import type { UserRole, UserStatus } from '@prisma/client';

interface UserManagementClientProps {
  usersPage: AdminUsersPageResult;
  packages: AdminSubscriptionPackageRow[];
  invites: AdminUserInviteRow[];
}

const roleOptions = [
  { value: 'all', label: 'All roles' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'USER', label: 'User' },
];

const accountStatusOptions = [
  { value: 'all', label: 'All accounts' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'INVITED', label: 'Invited' },
  { value: 'DELETED', label: 'Deleted' },
];

const accessOptions = [
  { value: 'all', label: 'All access' },
  { value: 'admin', label: 'Admins' },
  { value: 'subscribed', label: 'Subscribed' },
  { value: 'no_access', label: 'No access' },
];

const statusOptions = [
  { value: 'all', label: 'All subscriptions' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'TRIALING', label: 'Trialing' },
  { value: 'PAST_DUE', label: 'Past due' },
  { value: 'CANCELED', label: 'Canceled' },
  { value: 'MISSING', label: 'Missing' },
];

const sortOptions = [
  { value: 'createdAt_desc', label: 'Newest first' },
  { value: 'createdAt_asc', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'email_asc', label: 'Email A-Z' },
];

function formatDate(value: string | null) {
  if (!value) return 'Unlimited';
  return new Date(value).toLocaleDateString();
}

function formatSubscriptionStatus(user: AdminUsersPageResult['users'][number]) {
  if (user.role === 'ADMIN') return 'Full access';
  if (!user.subscription) return 'No access';
  if (user.subscription.status === 'ACTIVE') return 'Pro access';
  if (user.subscription.status === 'TRIALING') return 'Trial access';
  if (user.subscription.status === 'PAST_DUE') return 'Payment due';
  return 'Access canceled';
}

function formatPackageLabel(user: AdminUsersPageResult['users'][number]) {
  if (user.subscription?.package?.name) return user.subscription.package.name;
  if (user.role === 'ADMIN') return 'Admin full access';
  if (!user.subscription) return '-';
  if (user.subscription.source === 'ADMIN_GRANT') {
    return user.subscription.currentPeriodEnd ? 'Admin grant' : 'Unlimited admin grant';
  }
  return user.subscription.interval ? `Pro ${user.subscription.interval.toLowerCase()}` : 'Pro access';
}

function formatAccountStatus(status: UserStatus) {
  if (status === 'ACTIVE') return 'Account active';
  if (status === 'SUSPENDED') return 'Suspended';
  if (status === 'INVITED') return 'Invited';
  return 'Deleted';
}

function getAccountBadgeVariant(status: UserStatus) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'SUSPENDED') return 'warning';
  if (status === 'DELETED') return 'danger';
  return 'default';
}

function getAccessBadgeVariant(user: AdminUsersPageResult['users'][number]) {
  if (user.role === 'ADMIN') return 'info';
  if (!user.subscription) return 'danger';
  if (user.subscription.status === 'ACTIVE' || user.subscription.status === 'TRIALING') return 'success';
  if (user.subscription.status === 'PAST_DUE') return 'warning';
  return 'default';
}

function buildUsersHref(filters: AdminUsersPageResult['filters'], page: number) {
  const params = new URLSearchParams();

  if (filters.q) params.set('q', filters.q);
  if (filters.role !== 'all') params.set('role', filters.role);
  if (filters.accountStatus !== 'all') params.set('accountStatus', filters.accountStatus);
  if (filters.access !== 'all') params.set('access', filters.access);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.packageId !== 'all') params.set('packageId', filters.packageId);
  if (filters.sort !== 'createdAt_desc') params.set('sort', filters.sort);
  if (page > 1) params.set('page', String(page));

  const query = params.toString();
  return query ? `/admin/users?${query}` : '/admin/users';
}

function hasActiveFilters(filters: AdminUsersPageResult['filters']) {
  return Boolean(
    filters.q ||
    filters.role !== 'all' ||
    filters.accountStatus !== 'all' ||
    filters.access !== 'all' ||
    filters.status !== 'all' ||
    filters.packageId !== 'all' ||
    filters.sort !== 'createdAt_desc'
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  detail: string;
  tone: 'indigo' | 'emerald' | 'sky' | 'amber' | 'rose';
}) {
  const toneClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  };

  return (
    <Card className="min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">{detail}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function UserManagementClient({ usersPage, packages, invites }: UserManagementClientProps) {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [actionMenuUserId, setActionMenuUserId] = useState<string | null>(null);
  const [loaderMessage, setLoaderMessage] = useState('Loading users...');
  const [isRolePending, startRoleTransition] = useTransition();
  const [isNavigationPending, startNavigationTransition] = useTransition();

  const packageOptions = [
    { value: 'all', label: 'All packages' },
    ...packages.map((pkg) => ({ value: pkg.id, label: pkg.name })),
  ];

  useEffect(() => {
    if (!actionMenuUserId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest('[data-user-action-menu-root]')) {
        setActionMenuUserId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActionMenuUserId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [actionMenuUserId]);

  const updateRole = (userId: string, role: UserRole) => {
    setMessage(null);
    setActionMenuUserId(null);
    setUpdatingUserId(userId);
    setLoaderMessage('Updating user role...');
    startRoleTransition(async () => {
      const result = await updateUserRoleAction(userId, role);
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
      setUpdatingUserId(null);
      if (result.success) router.refresh();
    });
  };

  const updateAccountStatus = (userId: string, status: UserStatus) => {
    setMessage(null);
    setActionMenuUserId(null);
    setUpdatingUserId(userId);
    setLoaderMessage(status === 'ACTIVE' ? 'Reactivating account...' : 'Suspending account...');
    startRoleTransition(async () => {
      const result = await updateUserStatusAction(userId, status);
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
      setUpdatingUserId(null);
      if (result.success) router.refresh();
    });
  };

  const navigateTo = (href: string, message = 'Loading users...') => {
    setLoaderMessage(message);
    startNavigationTransition(() => {
      router.push(href);
    });
  };

  const applyFilters = (formData: FormData) => {
    const params = new URLSearchParams();
    const q = String(formData.get('q') || '').trim();
    const role = String(formData.get('role') || 'all');
    const accountStatus = String(formData.get('accountStatus') || 'all');
    const access = String(formData.get('access') || 'all');
    const status = String(formData.get('status') || 'all');
    const packageId = String(formData.get('packageId') || 'all');
    const sort = String(formData.get('sort') || 'createdAt_desc');

    if (q) params.set('q', q);
    if (role !== 'all') params.set('role', role);
    if (accountStatus !== 'all') params.set('accountStatus', accountStatus);
    if (access !== 'all') params.set('access', access);
    if (status !== 'all') params.set('status', status);
    if (packageId !== 'all') params.set('packageId', packageId);
    if (sort !== 'createdAt_desc') params.set('sort', sort);

    const query = params.toString();
    navigateTo(query ? `/admin/users?${query}` : '/admin/users', 'Applying filters...');
  };

  const start = usersPage.total === 0 ? 0 : (usersPage.page - 1) * usersPage.limit + 1;
  const end = Math.min(usersPage.page * usersPage.limit, usersPage.total);
  const accessRate = usersPage.stats.totalUsers > 0
    ? Math.round((usersPage.stats.withAccess / usersPage.stats.totalUsers) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Loader show={isNavigationPending || isRolePending} message={loaderMessage} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">User Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Search, filter, and manage account roles and access status.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <UserInviteList invites={invites} />
          <AdminCreateUserPanel packages={packages} />
          <UserInvitePanel packages={packages} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Users className="h-5 w-5" />}
          label="Total Users"
          value={usersPage.stats.totalUsers}
          detail={`${usersPage.stats.active} active accounts`}
          tone="indigo"
        />
        <SummaryCard
          icon={<Shield className="h-5 w-5" />}
          label="Admins"
          value={usersPage.stats.admins}
          detail="Role managers"
          tone="emerald"
        />
        <SummaryCard
          icon={<KeyRound className="h-5 w-5" />}
          label="With Access"
          value={usersPage.stats.withAccess}
          detail={`${accessRate}% of all users`}
          tone="sky"
        />
        <SummaryCard
          icon={<Ban className="h-5 w-5" />}
          label="Needs Attention"
          value={usersPage.stats.suspended + usersPage.stats.noAccess}
          detail={`${usersPage.stats.suspended} suspended, ${usersPage.stats.noAccess} no access`}
          tone={usersPage.stats.suspended > 0 ? 'amber' : 'rose'}
        />
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
          {message.text}
        </div>
      )}

      <Card>
        <form action={applyFilters} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:items-end">
          <Input
            id="q"
            name="q"
            label="Search"
            placeholder="Name or email"
            defaultValue={usersPage.filters.q}
            icon={<Search className="h-4 w-4" />}
          />
          <Select id="role" name="role" label="Role" defaultValue={usersPage.filters.role} options={roleOptions} />
          <Select id="accountStatus" name="accountStatus" label="Account" defaultValue={usersPage.filters.accountStatus} options={accountStatusOptions} />
          <Select id="access" name="access" label="Access" defaultValue={usersPage.filters.access} options={accessOptions} />
          <Select id="status" name="status" label="Subscription" defaultValue={usersPage.filters.status} options={statusOptions} />
          <Select id="packageId" name="packageId" label="Package" defaultValue={usersPage.filters.packageId} options={packageOptions} />
          <Select id="sort" name="sort" label="Sort" defaultValue={usersPage.filters.sort} options={sortOptions} />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end md:col-span-2 xl:col-span-4">
            <Button type="submit" className="h-[42px] w-full sm:w-36 sm:flex-none" isLoading={isNavigationPending}>
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-[42px] w-full sm:w-36 sm:flex-none"
              disabled={isNavigationPending || !hasActiveFilters(usersPage.filters)}
              onClick={() => navigateTo('/admin/users', 'Clearing filters...')}
            >
              Clear
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-visible p-0">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-4 dark:border-slate-700/50 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900 dark:text-white">Users</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {start}-{end} of {usersPage.total}
            </p>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Page {usersPage.page} of {usersPage.pages}</p>
        </div>

        {usersPage.users.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No users match the current filters.
          </div>
        ) : (
          <div className="space-y-3 p-3">
            {usersPage.users.map((user) => {
              const isUpdating = updatingUserId === user.id;
              const disableActions = isRolePending || isNavigationPending;
              const menuOpen = actionMenuUserId === user.id;

              return (
                <div
                  key={user.id}
                  className={`relative rounded-xl border border-slate-200 bg-slate-50/70 p-4 pr-16 transition-colors hover:bg-white dark:border-slate-700/50 dark:bg-slate-900/30 dark:hover:bg-slate-900/50 sm:p-5 sm:pr-16 ${menuOpen ? 'z-50' : 'z-0'}`}
                >
                  <div data-user-action-menu-root className="absolute right-4 top-4 z-50 xl:top-1/2 xl:-translate-y-1/2">
                    <Button
                      type="button"
                      size="sm"
                      variant={menuOpen ? 'secondary' : 'outline'}
                      className="h-9 w-9 rounded-full p-0 shadow-sm"
                      title="User actions"
                      disabled={disableActions && !isUpdating}
                      isLoading={isUpdating && isRolePending}
                      onClick={() => setActionMenuUserId((current) => current === user.id ? null : user.id)}
                    >
                      {!isUpdating && <MoreVertical className="h-4 w-4" />}
                    </Button>
                    {menuOpen && (
                      <div className="absolute right-0 top-11 z-[60] w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl xl:right-12 xl:top-1/2 xl:-translate-y-1/2 dark:border-slate-700 dark:bg-slate-900">
                        <button
                          type="button"
                          disabled={disableActions || user.role === 'USER'}
                          onClick={() => updateRole(user.id, 'USER')}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/5"
                        >
                          <Users className="h-4 w-4" />
                          Make user
                        </button>
                        <button
                          type="button"
                          disabled={disableActions || user.role === 'ADMIN'}
                          onClick={() => updateRole(user.id, 'ADMIN')}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/5"
                        >
                          <Shield className="h-4 w-4" />
                          Make admin
                        </button>
                        {user.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            disabled={disableActions}
                            onClick={() => updateAccountStatus(user.id, 'SUSPENDED')}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                          >
                            <Ban className="h-4 w-4" />
                            Suspend
                          </button>
                        ) : user.status === 'SUSPENDED' ? (
                          <button
                            type="button"
                            disabled={disableActions}
                            onClick={() => updateAccountStatus(user.id, 'ACTIVE')}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Reactivate
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(220px,1.4fr)_minmax(240px,1fr)_minmax(240px,1fr)] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          {user.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">{user.name}</p>
                          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant={getAccountBadgeVariant(user.status)} className="capitalize">
                              {formatAccountStatus(user.status)}
                            </Badge>
                            <Badge variant={user.role === 'ADMIN' ? 'info' : 'default'}>
                              {user.role === 'ADMIN' ? 'Admin role' : 'User role'}
                            </Badge>
                            <Badge variant={getAccessBadgeVariant(user)}>
                              {formatSubscriptionStatus(user)}
                            </Badge>
                            {user.mustChangePassword && (
                              <Badge variant="warning">
                                Password reset required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/70 p-3 dark:bg-slate-800/40">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase text-slate-400">Package</p>
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{formatPackageLabel(user)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase text-slate-400">Access Ends</p>
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                          {user.role === 'ADMIN' ? 'Unlimited' : user.subscription ? formatDate(user.subscription.currentPeriodEnd) : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/70 p-3 dark:bg-slate-800/40">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase text-slate-400">Joined</p>
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{formatDate(user.createdAt)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase text-slate-400">Last Login</p>
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 dark:border-slate-700/50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {usersPage.total === 0 ? 'No results' : `${start}-${end} of ${usersPage.total} users`}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {usersPage.page > 1 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={isNavigationPending}
                isLoading={isNavigationPending}
                onClick={() => navigateTo(buildUsersHref(usersPage.filters, usersPage.page - 1), 'Loading previous page...')}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            ) : (
              <span className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-400 opacity-60 dark:border-slate-700 sm:w-auto">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </span>
            )}
            {usersPage.page < usersPage.pages ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={isNavigationPending}
                isLoading={isNavigationPending}
                onClick={() => navigateTo(buildUsersHref(usersPage.filters, usersPage.page + 1), 'Loading next page...')}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <span className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-400 opacity-60 dark:border-slate-700 sm:w-auto">
                Next
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
