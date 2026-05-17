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
import { useI18n } from '@/i18n/client';

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

function formatDate(value: string | null, locale: string, unlimitedLabel: string) {
  if (!value) return unlimitedLabel;
  return new Date(value).toLocaleDateString(locale);
}

function formatSubscriptionStatus(user: AdminUsersPageResult['users'][number], copy: ReturnType<typeof useI18n>['messages']['pages']['admin']['users']) {
  if (user.role === 'ADMIN') return copy.fullAccess;
  if (!user.subscription) return copy.noAccessLower;
  if (user.subscription.status === 'ACTIVE') return copy.proAccess;
  if (user.subscription.status === 'TRIALING') return copy.trialAccess;
  if (user.subscription.status === 'PAST_DUE') return copy.paymentDue;
  return copy.accessCanceled;
}

function formatPackageLabel(user: AdminUsersPageResult['users'][number], copy: ReturnType<typeof useI18n>['messages']['pages']['admin']['users']) {
  if (user.subscription?.package?.name) return user.subscription.package.name;
  if (user.role === 'ADMIN') return copy.adminFullAccess;
  if (!user.subscription) return '-';
  if (user.subscription.source === 'ADMIN_GRANT') {
    return user.subscription.currentPeriodEnd ? copy.adminGrant : copy.unlimitedAdminGrant;
  }
  return user.subscription.interval ? `Pro ${user.subscription.interval.toLowerCase()}` : 'Pro access';
}

function formatAccountStatus(status: UserStatus, copy: ReturnType<typeof useI18n>['messages']['pages']['admin']['users']) {
  if (status === 'ACTIVE') return copy.accountActive;
  if (status === 'SUSPENDED') return copy.suspended;
  if (status === 'INVITED') return copy.invited;
  return copy.deleted;
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
  const { locale, messages } = useI18n();
  const adminCopy = messages.pages.admin;
  const copy = adminCopy.users;
  const router = useRouter();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [actionMenuUserId, setActionMenuUserId] = useState<string | null>(null);
  const [loaderMessage, setLoaderMessage] = useState<string>(copy.loadingUsers);
  const [isRolePending, startRoleTransition] = useTransition();
  const [isNavigationPending, startNavigationTransition] = useTransition();

  const localizedRoleOptions = [
    { value: 'all', label: copy.allRoles },
    { value: 'ADMIN', label: adminCopy.common.admin },
    { value: 'USER', label: adminCopy.common.user },
  ];
  const localizedAccountStatusOptions = [
    { value: 'all', label: copy.allAccounts },
    { value: 'ACTIVE', label: adminCopy.common.active },
    { value: 'SUSPENDED', label: copy.suspended },
    { value: 'INVITED', label: copy.invited },
    { value: 'DELETED', label: copy.deleted },
  ];
  const localizedAccessOptions = [
    { value: 'all', label: copy.allAccess },
    { value: 'admin', label: copy.admins },
    { value: 'subscribed', label: copy.subscribed },
    { value: 'no_access', label: copy.noAccessLower },
  ];
  const localizedStatusOptions = [
    { value: 'all', label: copy.allSubscriptions },
    { value: 'ACTIVE', label: adminCopy.common.active },
    { value: 'TRIALING', label: copy.trialing },
    { value: 'PAST_DUE', label: copy.pastDue },
    { value: 'CANCELED', label: copy.canceled },
    { value: 'MISSING', label: copy.missing },
  ];
  const localizedSortOptions = [
    { value: 'createdAt_desc', label: copy.newestFirst },
    { value: 'createdAt_asc', label: copy.oldestFirst },
    { value: 'name_asc', label: copy.nameAZ },
    { value: 'email_asc', label: copy.emailAZ },
  ];
  const packageOptions = [
    { value: 'all', label: copy.allPackages },
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
    setLoaderMessage(copy.updatingRole);
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
    setLoaderMessage(status === 'ACTIVE' ? copy.reactivating : copy.suspending);
    startRoleTransition(async () => {
      const result = await updateUserStatusAction(userId, status);
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
      setUpdatingUserId(null);
      if (result.success) router.refresh();
    });
  };

  const navigateTo = (href: string, message: string = copy.loadingUsers) => {
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
    navigateTo(query ? `/admin/users?${query}` : '/admin/users', copy.applyingFilters);
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{copy.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
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
          label={copy.totalUsers}
          value={usersPage.stats.totalUsers}
          detail={`${usersPage.stats.active} ${copy.activeAccounts}`}
          tone="indigo"
        />
        <SummaryCard
          icon={<Shield className="h-5 w-5" />}
          label={copy.admins}
          value={usersPage.stats.admins}
          detail={copy.roleManagers}
          tone="emerald"
        />
        <SummaryCard
          icon={<KeyRound className="h-5 w-5" />}
          label={copy.withAccess}
          value={usersPage.stats.withAccess}
          detail={`${accessRate}% ${copy.ofAllUsers}`}
          tone="sky"
        />
        <SummaryCard
          icon={<Ban className="h-5 w-5" />}
          label={copy.needsAttention}
          value={usersPage.stats.suspended + usersPage.stats.noAccess}
          detail={`${usersPage.stats.suspended} ${copy.suspended}, ${usersPage.stats.noAccess} ${copy.noAccessLower}`}
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
            label={adminCopy.common.search}
            placeholder={copy.searchPlaceholder}
            defaultValue={usersPage.filters.q}
            icon={<Search className="h-4 w-4" />}
          />
          <Select id="role" name="role" label={adminCopy.common.role} defaultValue={usersPage.filters.role} options={localizedRoleOptions} />
          <Select id="accountStatus" name="accountStatus" label={copy.account} defaultValue={usersPage.filters.accountStatus} options={localizedAccountStatusOptions} />
          <Select id="access" name="access" label={adminCopy.analytics.access} defaultValue={usersPage.filters.access} options={localizedAccessOptions} />
          <Select id="status" name="status" label={copy.subscription} defaultValue={usersPage.filters.status} options={localizedStatusOptions} />
          <Select id="packageId" name="packageId" label={copy.package} defaultValue={usersPage.filters.packageId} options={packageOptions} />
          <Select id="sort" name="sort" label={copy.sort} defaultValue={usersPage.filters.sort} options={localizedSortOptions} />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end md:col-span-2 xl:col-span-4">
            <Button type="submit" className="h-[42px] w-full sm:w-36 sm:flex-none" isLoading={isNavigationPending}>
              {adminCopy.common.apply}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-[42px] w-full sm:w-36 sm:flex-none"
              disabled={isNavigationPending || !hasActiveFilters(usersPage.filters)}
              onClick={() => navigateTo('/admin/users', copy.clearingFilters)}
            >
              {adminCopy.common.clear}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-visible p-0">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-4 dark:border-slate-700/50 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900 dark:text-white">{copy.users}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {copy.showing} {start}-{end} {copy.of} {usersPage.total}
            </p>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.page} {usersPage.page} {copy.of} {usersPage.pages}</p>
        </div>

        {usersPage.users.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {copy.noMatch}
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
                      title={copy.userActions}
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
                          {copy.makeUser}
                        </button>
                        <button
                          type="button"
                          disabled={disableActions || user.role === 'ADMIN'}
                          onClick={() => updateRole(user.id, 'ADMIN')}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/5"
                        >
                          <Shield className="h-4 w-4" />
                          {copy.makeAdmin}
                        </button>
                        {user.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            disabled={disableActions}
                            onClick={() => updateAccountStatus(user.id, 'SUSPENDED')}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                          >
                            <Ban className="h-4 w-4" />
                            {copy.suspend}
                          </button>
                        ) : user.status === 'SUSPENDED' ? (
                          <button
                            type="button"
                            disabled={disableActions}
                            onClick={() => updateAccountStatus(user.id, 'ACTIVE')}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {copy.reactivate}
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
                              {formatAccountStatus(user.status, copy)}
                            </Badge>
                            <Badge variant={user.role === 'ADMIN' ? 'info' : 'default'}>
                              {user.role === 'ADMIN' ? copy.adminRole : copy.userRole}
                            </Badge>
                            <Badge variant={getAccessBadgeVariant(user)}>
                              {formatSubscriptionStatus(user, copy)}
                            </Badge>
                            {user.mustChangePassword && (
                              <Badge variant="warning">
                                {copy.passwordResetRequired}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/70 p-3 dark:bg-slate-800/40">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase text-slate-400">{copy.package}</p>
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{formatPackageLabel(user, copy)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase text-slate-400">{copy.accessEnds}</p>
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                          {user.role === 'ADMIN' ? adminCopy.common.unlimited : user.subscription ? formatDate(user.subscription.currentPeriodEnd, locale, adminCopy.common.unlimited) : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/70 p-3 dark:bg-slate-800/40">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase text-slate-400">{copy.joined}</p>
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{formatDate(user.createdAt, locale, adminCopy.common.unlimited)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase text-slate-400">{copy.lastLogin}</p>
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{user.lastLoginAt ? formatDate(user.lastLoginAt, locale, adminCopy.common.unlimited) : adminCopy.common.never}</p>
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
            {usersPage.total === 0 ? copy.noResults : `${start}-${end} ${copy.of} ${usersPage.total} ${copy.users}`}
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
                onClick={() => navigateTo(buildUsersHref(usersPage.filters, usersPage.page - 1), copy.loadingUsers)}
              >
                <ChevronLeft className="h-4 w-4" />
                {copy.previous}
              </Button>
            ) : (
              <span className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-400 opacity-60 dark:border-slate-700 sm:w-auto">
                <ChevronLeft className="h-4 w-4" />
                {copy.previous}
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
                onClick={() => navigateTo(buildUsersHref(usersPage.filters, usersPage.page + 1), copy.loadingUsers)}
              >
                {copy.next}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <span className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-400 opacity-60 dark:border-slate-700 sm:w-auto">
                {copy.next}
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
