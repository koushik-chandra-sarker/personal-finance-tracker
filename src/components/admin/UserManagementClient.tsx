'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight, Search, Shield, UserCog, Users, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';
import Select from '@/components/ui/Select';
import {
  updateUserRoleAction,
  type AdminSubscriptionPackageRow,
  type AdminUsersPageResult,
} from '@/actions/admin.actions';
import type { UserRole } from '@prisma/client';

interface UserManagementClientProps {
  usersPage: AdminUsersPageResult;
  packages: AdminSubscriptionPackageRow[];
}

const roleOptions = [
  { value: 'all', label: 'All roles' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'USER', label: 'User' },
];

const accessOptions = [
  { value: 'all', label: 'All access' },
  { value: 'admin', label: 'Admins' },
  { value: 'subscribed', label: 'Subscribed' },
  { value: 'no_access', label: 'No access' },
];

const statusOptions = [
  { value: 'all', label: 'All statuses' },
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
  if (user.role === 'ADMIN') return 'Admin';
  if (!user.subscription) return 'No access';
  return user.subscription.status.toLowerCase().replace('_', ' ');
}

function buildUsersHref(filters: AdminUsersPageResult['filters'], page: number) {
  const params = new URLSearchParams();

  if (filters.q) params.set('q', filters.q);
  if (filters.role !== 'all') params.set('role', filters.role);
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
    filters.access !== 'all' ||
    filters.status !== 'all' ||
    filters.packageId !== 'all' ||
    filters.sort !== 'createdAt_desc'
  );
}

export default function UserManagementClient({ usersPage, packages }: UserManagementClientProps) {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [loaderMessage, setLoaderMessage] = useState('Loading users...');
  const [isRolePending, startRoleTransition] = useTransition();
  const [isNavigationPending, startNavigationTransition] = useTransition();

  const packageOptions = [
    { value: 'all', label: 'All packages' },
    ...packages.map((pkg) => ({ value: pkg.id, label: pkg.name })),
  ];

  const updateRole = (userId: string, role: UserRole) => {
    setMessage(null);
    setUpdatingUserId(userId);
    setLoaderMessage('Updating user role...');
    startRoleTransition(async () => {
      const result = await updateUserRoleAction(userId, role);
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
    const access = String(formData.get('access') || 'all');
    const status = String(formData.get('status') || 'all');
    const packageId = String(formData.get('packageId') || 'all');
    const sort = String(formData.get('sort') || 'createdAt_desc');

    if (q) params.set('q', q);
    if (role !== 'all') params.set('role', role);
    if (access !== 'all') params.set('access', access);
    if (status !== 'all') params.set('status', status);
    if (packageId !== 'all') params.set('packageId', packageId);
    if (sort !== 'createdAt_desc') params.set('sort', sort);

    const query = params.toString();
    navigateTo(query ? `/admin/users?${query}` : '/admin/users', 'Applying filters...');
  };

  const start = usersPage.total === 0 ? 0 : (usersPage.page - 1) * usersPage.limit + 1;
  const end = Math.min(usersPage.page * usersPage.limit, usersPage.total);

  return (
    <div className="space-y-6">
      <Loader show={isNavigationPending || isRolePending} message={loaderMessage} />

      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">User Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Search, filter, and manage account roles and access status.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <Users className="mb-3 h-5 w-5 text-indigo-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Users</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{usersPage.stats.totalUsers}</p>
        </Card>
        <Card>
          <Shield className="mb-3 h-5 w-5 text-emerald-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Admins</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{usersPage.stats.admins}</p>
        </Card>
        <Card>
          <UserCog className="mb-3 h-5 w-5 text-sky-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">With Access</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{usersPage.stats.withAccess}</p>
        </Card>
        <Card>
          <X className="mb-3 h-5 w-5 text-rose-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No Access</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{usersPage.stats.noAccess}</p>
        </Card>
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
          {message.text}
        </div>
      )}

      <Card>
        <form action={applyFilters} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(220px,1.2fr)_repeat(5,minmax(120px,1fr))_minmax(150px,auto)] 2xl:items-end">
          <Input
            id="q"
            name="q"
            label="Search"
            placeholder="Name or email"
            defaultValue={usersPage.filters.q}
            icon={<Search className="h-4 w-4" />}
          />
          <Select id="role" name="role" label="Role" defaultValue={usersPage.filters.role} options={roleOptions} />
          <Select id="access" name="access" label="Access" defaultValue={usersPage.filters.access} options={accessOptions} />
          <Select id="status" name="status" label="Status" defaultValue={usersPage.filters.status} options={statusOptions} />
          <Select id="packageId" name="packageId" label="Package" defaultValue={usersPage.filters.packageId} options={packageOptions} />
          <Select id="sort" name="sort" label="Sort" defaultValue={usersPage.filters.sort} options={sortOptions} />
          <div className="flex flex-col gap-2 sm:flex-row md:col-span-2 xl:col-span-3 2xl:col-span-1">
            <Button type="submit" className="h-[42px] w-full sm:flex-1 2xl:flex-none" isLoading={isNavigationPending}>
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-[42px] w-full sm:flex-1 2xl:flex-none"
              disabled={isNavigationPending || !hasActiveFilters(usersPage.filters)}
              onClick={() => navigateTo('/admin/users', 'Clearing filters...')}
            >
              Clear
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
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
          <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
            {usersPage.users.map((user) => {
              const isUpdating = updatingUserId === user.id;
              const disableRoleButtons = isRolePending || isNavigationPending;

              return (
                <div key={user.id} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-[minmax(220px,1.2fr)_120px_150px_150px_190px] xl:items-center">
                  <div className="min-w-0 sm:col-span-2 xl:col-span-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{user.name}</p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Joined {formatDate(user.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">Role</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{user.role === 'ADMIN' ? 'Admin' : 'User'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">Access</p>
                    <p className="text-sm capitalize text-slate-700 dark:text-slate-300">{formatSubscriptionStatus(user)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">Package</p>
                    <p className="truncate text-sm text-slate-700 dark:text-slate-300">{user.subscription?.package?.name || '-'}</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-end sm:justify-between xl:col-span-1 xl:items-center xl:justify-end">
                    <div className="min-w-0 sm:min-w-[86px]">
                      <p className="text-xs font-medium uppercase text-slate-400">Access Ends</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {user.role === 'ADMIN' ? 'Unlimited' : user.subscription ? formatDate(user.subscription.currentPeriodEnd) : '-'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <Button
                        size="sm"
                        variant={user.role === 'USER' ? 'secondary' : 'outline'}
                        className="w-full sm:w-auto"
                        disabled={disableRoleButtons || user.role === 'USER'}
                        isLoading={isUpdating && isRolePending}
                        onClick={() => updateRole(user.id, 'USER')}
                      >
                        User
                      </Button>
                      <Button
                        size="sm"
                        variant={user.role === 'ADMIN' ? 'secondary' : 'outline'}
                        className="w-full sm:w-auto"
                        disabled={disableRoleButtons || user.role === 'ADMIN'}
                        isLoading={isUpdating && isRolePending}
                        onClick={() => updateRole(user.id, 'ADMIN')}
                      >
                        Admin
                      </Button>
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
