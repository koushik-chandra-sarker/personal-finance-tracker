'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { ArrowUpRight, CheckCircle2, Clock3, Copy, CreditCard, Edit2, Infinity, Package, Power, ReceiptText, Smartphone, Timer, UserX, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import {
  createSubscriptionPackageAction,
  approveManualPaymentRequestAction,
  createManualPaymentMethodAction,
  getAdminManualPaymentMethodsAction,
  getAdminManualPaymentRequestsAction,
  getAdminSubscriptionPackagesAction,
  getAdminUsersAction,
  grantUserAccessAction,
  rejectManualPaymentRequestAction,
  revokeUserAccessAction,
  setManualPaymentMethodActiveAction,
  setSubscriptionPackageActiveAction,
  updateManualPaymentMethodAction,
  type AdminManualPaymentMethodRow,
  type AdminManualPaymentRequestRow,
  updateSubscriptionPackageAction,
  type AdminSubscriptionPackageRow,
  type AdminUserRow,
} from '@/actions/admin.actions';

interface SubscriptionManagementClientProps {
  initialUsers: AdminUserRow[];
  initialPackages: AdminSubscriptionPackageRow[];
  initialPaymentMethods: AdminManualPaymentMethodRow[];
  initialPaymentRequests: AdminManualPaymentRequestRow[];
}

function formatAccessUntil(date: string | null) {
  return date ? new Date(date).toLocaleDateString() : 'Unlimited';
}

function periodLabel(interval: string | null) {
  if (interval === 'MONTHLY') return '/mo';
  if (interval === 'YEARLY') return '/yr';
  return '';
}

function providerLabel(provider: string) {
  return provider === 'BKASH' ? 'bKash' : 'Nagad';
}

function paymentStatusClass(status: string) {
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
  if (status === 'REJECTED') return 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400';
  return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
}

export default function SubscriptionManagementClient({
  initialUsers,
  initialPackages,
  initialPaymentMethods,
  initialPaymentRequests,
}: SubscriptionManagementClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [packages, setPackages] = useState(initialPackages);
  const [paymentMethods, setPaymentMethods] = useState(initialPaymentMethods);
  const [paymentRequests, setPaymentRequests] = useState(initialPaymentRequests);
  const [packageForm, setPackageForm] = useState<AdminSubscriptionPackageRow | null>(null);
  const [paymentMethodForm, setPaymentMethodForm] = useState<AdminManualPaymentMethodRow | null>(null);
  const [reviewRequest, setReviewRequest] = useState<AdminManualPaymentRequestRow | null>(null);
  const [reviewMode, setReviewMode] = useState<'approve' | 'reject'>('approve');
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const activePackages = packages.filter((pkg) => pkg.isActive);

  const stats = useMemo(() => {
    const active = users.filter((user) => user.subscription);
    return {
      active: active.length,
      adminGranted: active.filter((user) => user.subscription?.source === 'ADMIN_GRANT').length,
      unlimited: active.filter((user) => !user.subscription?.currentPeriodEnd).length,
      missing: users.filter((user) => user.role !== 'ADMIN' && !user.subscription).length,
      pendingPayments: paymentRequests.filter((request) => request.status === 'PENDING').length,
    };
  }, [paymentRequests, users]);

  const refreshUsers = async () => {
    const nextUsers = await getAdminUsersAction();
    setUsers(nextUsers);
  };

  const refreshPackages = async () => {
    const nextPackages = await getAdminSubscriptionPackagesAction();
    setPackages(nextPackages);
  };

  const refreshPaymentMethods = async () => {
    const nextMethods = await getAdminManualPaymentMethodsAction();
    setPaymentMethods(nextMethods);
  };

  const refreshPaymentRequests = async () => {
    const nextRequests = await getAdminManualPaymentRequestsAction();
    setPaymentRequests(nextRequests);
  };

  const grantAccess = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const result = await grantUserAccessAction(formData);
      if (result.success) await refreshUsers();
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    });
  };

  const revokeAccess = (userId: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await revokeUserAccessAction(userId);
      if (result.success) await refreshUsers();
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    });
  };

  const openCreatePackage = () => {
    setPackageForm(null);
    setIsPackageModalOpen(true);
  };

  const openEditPackage = (pkg: AdminSubscriptionPackageRow) => {
    setPackageForm(pkg);
    setIsPackageModalOpen(true);
  };

  const submitPackage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = packageForm
        ? await updateSubscriptionPackageAction(packageForm.id, formData)
        : await createSubscriptionPackageAction(formData);
      if (result.success) {
        await refreshPackages();
        setIsPackageModalOpen(false);
        setPackageForm(null);
      }
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    });
  };

  const setPackageActive = (packageId: string, isActive: boolean) => {
    setMessage(null);
    startTransition(async () => {
      const result = await setSubscriptionPackageActiveAction(packageId, isActive);
      if (result.success) await refreshPackages();
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    });
  };

  const openCreatePaymentMethod = () => {
    setPaymentMethodForm(null);
    setIsPaymentMethodModalOpen(true);
  };

  const openEditPaymentMethod = (method: AdminManualPaymentMethodRow) => {
    setPaymentMethodForm(method);
    setIsPaymentMethodModalOpen(true);
  };

  const submitPaymentMethod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = paymentMethodForm
        ? await updateManualPaymentMethodAction(paymentMethodForm.id, formData)
        : await createManualPaymentMethodAction(formData);
      if (result.success) {
        await refreshPaymentMethods();
        setIsPaymentMethodModalOpen(false);
        setPaymentMethodForm(null);
      }
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    });
  };

  const setPaymentMethodActive = (methodId: string, isActive: boolean) => {
    setMessage(null);
    startTransition(async () => {
      const result = await setManualPaymentMethodActiveAction(methodId, isActive);
      if (result.success) await refreshPaymentMethods();
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    });
  };

  const openReview = (request: AdminManualPaymentRequestRow, mode: 'approve' | 'reject') => {
    setReviewRequest(request);
    setReviewMode(mode);
    setIsReviewModalOpen(true);
  };

  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewRequest) return;
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = reviewMode === 'approve'
        ? await approveManualPaymentRequestAction(reviewRequest.id, formData)
        : await rejectManualPaymentRequestAction(reviewRequest.id, formData);
      if (result.success) {
        await Promise.all([refreshPaymentRequests(), refreshUsers()]);
        setIsReviewModalOpen(false);
        setReviewRequest(null);
      }
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    });
  };

  const copyValue = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setMessage({ type: 'success', text: 'Copied to clipboard' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure packages, grant access, and review active subscriptions.</p>
        </div>
        <Button onClick={openCreatePackage} disabled={isPending}>
          <Package className="h-4 w-4" /> Add Package
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card><CreditCard className="mb-3 h-5 w-5 text-indigo-500" /><p className="text-sm text-slate-500 dark:text-slate-400">Active Access</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.active}</p></Card>
        <Card><Timer className="mb-3 h-5 w-5 text-emerald-500" /><p className="text-sm text-slate-500 dark:text-slate-400">Admin Grants</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.adminGranted}</p></Card>
        <Card><Infinity className="mb-3 h-5 w-5 text-sky-500" /><p className="text-sm text-slate-500 dark:text-slate-400">Unlimited</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.unlimited}</p></Card>
        <Card><UserX className="mb-3 h-5 w-5 text-rose-500" /><p className="text-sm text-slate-500 dark:text-slate-400">No Access</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.missing}</p></Card>
        <Card><ReceiptText className="mb-3 h-5 w-5 text-amber-500" /><p className="text-sm text-slate-500 dark:text-slate-400">Pending Payments</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pendingPayments}</p></Card>
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
          {message.text}
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700/50">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Manual Payment Review</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Confirm bKash or Nagad payments from wallet history before approving access.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={refreshPaymentRequests} disabled={isPending}>Refresh</Button>
            <Link
              href="/admin/payments"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-white/5"
            >
              Open review page <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
          {paymentRequests.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No payment requests yet.</div>
          ) : paymentRequests.map((request) => (
            <div key={request.id} className="grid gap-4 p-4 xl:grid-cols-[1.2fr_180px_170px_190px] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-white">{request.user.name}</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${paymentStatusClass(request.status)}`}>
                    {request.status === 'PENDING' ? <Clock3 className="h-3.5 w-3.5" /> : request.status === 'APPROVED' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {request.status.toLowerCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{request.user.email}</p>
                <p className="mt-1 text-xs text-slate-400">{request.package.name} · {formatCurrency(request.amount, request.currency)} · {new Date(request.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Wallet</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{providerLabel(request.provider)}</p>
                <button type="button" onClick={() => copyValue(request.senderAccount)} className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400">
                  {request.senderAccount} <Copy className="h-3 w-3" />
                </button>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">TrxID</p>
                <button type="button" onClick={() => copyValue(request.transactionId)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-white">
                  {request.transactionId} <Copy className="h-3.5 w-3.5" />
                </button>
                <p className="mt-1 text-xs text-slate-400">Ref {request.reference}</p>
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                {request.status === 'PENDING' ? (
                  <>
                    <Button size="sm" onClick={() => openReview(request, 'approve')} disabled={isPending}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openReview(request, 'reject')} disabled={isPending}>
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString() : '-'}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700/50">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Payment Accounts</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">These bKash/Nagad accounts appear on the subscription page.</p>
          </div>
          <Button size="sm" onClick={openCreatePaymentMethod} disabled={isPending}>
            <Smartphone className="h-4 w-4" /> Add Account
          </Button>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
          {paymentMethods.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Add at least one active payment account before users can submit payments.</div>
          ) : paymentMethods.map((method) => (
            <div key={method.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_180px_120px_180px] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-white">{providerLabel(method.provider)} · {method.label}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${method.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'}`}>
                    {method.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{method.accountName} · {method.accountNumber}</p>
                {method.instructions && <p className="mt-1 text-xs text-slate-400">{method.instructions}</p>}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Requests</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{method.requestCount}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sort</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{method.sortOrder}</p>
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <Button variant="outline" size="sm" onClick={() => openEditPaymentMethod(method)} disabled={isPending}>
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPaymentMethodActive(method.id, !method.isActive)} disabled={isPending}>
                  <Power className="h-3.5 w-3.5" /> {method.isActive ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700/50">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Packages</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Active packages are shown to users on billing screens.</p>
          </div>
          <Button size="sm" onClick={openCreatePackage} disabled={isPending}>Add</Button>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
          {packages.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No packages configured.</div>
          ) : packages.map((pkg) => (
            <div key={pkg.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_160px_120px_180px] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-white">{pkg.name}</p>
                  {pkg.isFeatured && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">Featured</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pkg.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'}`}>
                    {pkg.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{pkg.description}</p>
                <p className="mt-1 text-xs text-slate-400">/{pkg.slug} · {pkg.subscriptionCount} subscriptions · sort {pkg.sortOrder}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Price</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(pkg.price, pkg.currency)}{periodLabel(pkg.interval)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Trial</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{pkg.trialDays} days</p>
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <Button variant="outline" size="sm" onClick={() => openEditPackage(pkg)} disabled={isPending}>
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPackageActive(pkg.id, !pkg.isActive)} disabled={isPending}>
                  <Power className="h-3.5 w-3.5" /> {pkg.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Grant Full Access</h2>
        <form action={grantAccess} className="grid gap-3 lg:grid-cols-[1fr_180px_220px_auto]">
          <Input id="grantEmail" name="email" type="email" label="User Email" placeholder="user@example.com" required />
          <div>
            <label htmlFor="grantDuration" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Duration</label>
            <select
              id="grantDuration"
              name="duration"
              defaultValue="MONTHLY"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-white"
            >
              <option value="MONTHLY">1 Month</option>
              <option value="YEARLY">1 Year</option>
              <option value="UNLIMITED">Unlimited</option>
            </select>
          </div>
          <div>
            <label htmlFor="grantPackage" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Package</label>
            <select
              id="grantPackage"
              name="packageId"
              defaultValue=""
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-white"
            >
              <option value="">Use duration only</option>
              {activePackages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isPending} className="w-full">Grant</Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 p-4 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-white">Subscriptions</h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
          {users.map((user) => (
            <div key={user.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_170px_180px_180px_120px] xl:items-center">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Package</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{user.subscription?.package?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Source</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{user.role === 'ADMIN' ? 'Admin' : user.subscription?.source?.toLowerCase().replace('_', ' ') || 'No access'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Valid Until</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{user.role === 'ADMIN' ? 'Unlimited' : user.subscription ? formatAccessUntil(user.subscription.currentPeriodEnd) : '-'}</p>
              </div>
              <div className="xl:text-right">
                {user.role !== 'ADMIN' && user.subscription && (
                  <Button variant="outline" size="sm" onClick={() => revokeAccess(user.id)} disabled={isPending}>
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        title={packageForm ? 'Edit Package' : 'Add Package'}
        className="max-w-2xl"
      >
        <form onSubmit={submitPackage} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="packageName" name="name" label="Name" defaultValue={packageForm?.name || ''} required />
            <Input id="packageSlug" name="slug" label="Slug" defaultValue={packageForm?.slug || ''} placeholder="pro-monthly" />
          </div>
          <Input id="packageDescription" name="description" label="Description" defaultValue={packageForm?.description || ''} required />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="packageCurrency" name="currency" label="Currency" defaultValue={packageForm?.currency || 'BDT'} required />
            <Input id="packagePrice" name="price" label="Price" type="number" min="0" step="0.01" defaultValue={packageForm?.price || ''} required />
            <div>
              <label htmlFor="packageInterval" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Interval</label>
              <select
                id="packageInterval"
                name="interval"
                defaultValue={packageForm?.interval || 'MONTHLY'}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-white"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="packageTrialDays" name="trialDays" label="Trial Days" type="number" min="0" step="1" defaultValue={packageForm?.trialDays ?? 0} />
            <Input id="packageSortOrder" name="sortOrder" label="Sort Order" type="number" step="1" defaultValue={packageForm?.sortOrder ?? 0} />
            <Input id="packageDiscountLabel" name="discountLabel" label="Discount Label" defaultValue={packageForm?.discountLabel || ''} placeholder="Best value" />
          </div>
          <div>
            <label htmlFor="packageFeatureBullets" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Feature Bullets</label>
            <textarea
              id="packageFeatureBullets"
              name="featureBullets"
              rows={4}
              defaultValue={packageForm?.featureBullets.join('\n') || ''}
              placeholder="One feature per line"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-400"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" name="isActive" defaultChecked={packageForm?.isActive ?? true} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" name="isFeatured" defaultChecked={packageForm?.isFeatured ?? false} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              Featured
            </label>
          </div>
          <Button type="submit" className="w-full" isLoading={isPending}>
            {packageForm ? 'Update Package' : 'Create Package'}
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={isPaymentMethodModalOpen}
        onClose={() => setIsPaymentMethodModalOpen(false)}
        title={paymentMethodForm ? 'Edit Payment Account' : 'Add Payment Account'}
        className="max-w-xl"
      >
        <form onSubmit={submitPaymentMethod} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="manualProvider" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Provider</label>
              <select
                id="manualProvider"
                name="provider"
                defaultValue={paymentMethodForm?.provider || 'BKASH'}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-white"
              >
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
              </select>
            </div>
            <Input id="manualLabel" name="label" label="Display Label" defaultValue={paymentMethodForm?.label || ''} placeholder="Main wallet" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="manualAccountNumber" name="accountNumber" label="Account Number" defaultValue={paymentMethodForm?.accountNumber || ''} placeholder="01XXXXXXXXX" required />
            <Input id="manualAccountName" name="accountName" label="Account Name" defaultValue={paymentMethodForm?.accountName || ''} placeholder="Business or owner name" required />
          </div>
          <Input id="manualSortOrder" name="sortOrder" label="Sort Order" type="number" step="1" defaultValue={paymentMethodForm?.sortOrder ?? 0} />
          <div>
            <label htmlFor="manualInstructions" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Payment Instructions</label>
            <textarea
              id="manualInstructions"
              name="instructions"
              rows={4}
              defaultValue={paymentMethodForm?.instructions || ''}
              placeholder="Example: Send Money only. Use your takapilot reference in the payment reference field."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-400"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input type="checkbox" name="isActive" defaultChecked={paymentMethodForm?.isActive ?? true} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
            Active on subscription page
          </label>
          <Button type="submit" className="w-full" isLoading={isPending}>
            {paymentMethodForm ? 'Update Account' : 'Create Account'}
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={reviewMode === 'approve' ? 'Approve Payment' : 'Reject Payment'}
        className="max-w-xl"
      >
        {reviewRequest && (
          <form onSubmit={submitReview} className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">User</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{reviewRequest.user.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{reviewRequest.user.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Package</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{reviewRequest.package.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{formatCurrency(reviewRequest.amount, reviewRequest.currency)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Wallet</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{providerLabel(reviewRequest.provider)}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{reviewRequest.senderAccount}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Transaction ID</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{reviewRequest.transactionId}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ref {reviewRequest.reference}</p>
                </div>
              </div>
              {reviewRequest.note && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">User note: {reviewRequest.note}</p>}
              {reviewRequest.screenshotUrl && (
                <a href={reviewRequest.screenshotUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-medium text-indigo-600 dark:text-indigo-300">
                  Open screenshot link
                </a>
              )}
            </div>
            <div>
              <label htmlFor="adminNote" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Admin Note</label>
              <textarea
                id="adminNote"
                name="adminNote"
                rows={3}
                placeholder={reviewMode === 'approve' ? 'Optional confirmation note' : 'Reason shown to the user'}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-400"
              />
            </div>
            <Button type="submit" variant={reviewMode === 'approve' ? 'primary' : 'danger'} className="w-full" isLoading={isPending}>
              {reviewMode === 'approve' ? 'Approve and Activate Access' : 'Reject Payment'}
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
