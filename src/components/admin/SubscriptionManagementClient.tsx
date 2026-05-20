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
import { useI18n } from '@/i18n/client';

interface SubscriptionManagementClientProps {
  initialUsers: AdminUserRow[];
  initialPackages: AdminSubscriptionPackageRow[];
  initialPaymentMethods: AdminManualPaymentMethodRow[];
  initialPaymentRequests: AdminManualPaymentRequestRow[];
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
  const { locale, messages } = useI18n();
  const adminCopy = messages.pages.admin;
  const copy = adminCopy.subscriptions;
  const common = adminCopy.common;
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
  const [isTrialPackageMode, setIsTrialPackageMode] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isTrialPackage = (pkg: AdminSubscriptionPackageRow) => pkg.price === 0 && pkg.trialDays > 0;
  const activePackages = packages.filter((pkg) => pkg.isActive && !isTrialPackage(pkg));
  const editingTrialPackage = packageForm ? isTrialPackage(packageForm) : false;

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
    setIsTrialPackageMode(false);
    setIsPackageModalOpen(true);
  };

  const openEditPackage = (pkg: AdminSubscriptionPackageRow) => {
    setPackageForm(pkg);
    setIsTrialPackageMode(isTrialPackage(pkg));
    setIsPackageModalOpen(true);
  };

  const closePackageModal = () => {
    setIsPackageModalOpen(false);
    setPackageForm(null);
    setIsTrialPackageMode(false);
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
        closePackageModal();
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
    setMessage({ type: 'success', text: common.copied });
  };
  const localFormatAccessUntil = (date: string | null) => date ? new Date(date).toLocaleDateString(locale) : common.unlimited;
  const localPeriodLabel = (interval: string | null) => {
    if (interval === 'MONTHLY') return `/${common.monthly}`;
    if (interval === 'YEARLY') return `/${common.yearly}`;
    return '';
  };
  const paymentStatusLabel = (status: string) => {
    if (status === 'APPROVED') return common.approved;
    if (status === 'REJECTED') return common.rejected;
    return common.pending;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{copy.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <Button onClick={openCreatePackage} disabled={isPending}>
          <Package className="h-4 w-4" /> {copy.addPackage}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card><CreditCard className="mb-3 h-5 w-5 text-indigo-500" /><p className="text-sm text-slate-500 dark:text-slate-400">{copy.activeAccess}</p><p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{stats.active}</p></Card>
        <Card><Timer className="mb-3 h-5 w-5 text-emerald-500" /><p className="text-sm text-slate-500 dark:text-slate-400">{copy.adminGrants}</p><p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{stats.adminGranted}</p></Card>
        <Card><Infinity className="mb-3 h-5 w-5 text-sky-500" /><p className="text-sm text-slate-500 dark:text-slate-400">{copy.unlimited}</p><p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{stats.unlimited}</p></Card>
        <Card><UserX className="mb-3 h-5 w-5 text-rose-500" /><p className="text-sm text-slate-500 dark:text-slate-400">{copy.noAccess}</p><p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{stats.missing}</p></Card>
        <Card><ReceiptText className="mb-3 h-5 w-5 text-amber-500" /><p className="text-sm text-slate-500 dark:text-slate-400">{copy.pendingPayments}</p><p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{stats.pendingPayments}</p></Card>
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
          {message.text}
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700/50">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.manualPaymentReview}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.manualPaymentHelp}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={refreshPaymentRequests} disabled={isPending}>{common.refresh}</Button>
            <Link
              href="/admin/payments"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-white/5"
            >
              {copy.openReviewPage} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
          {paymentRequests.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">{copy.noPaymentRequests}</div>
          ) : paymentRequests.map((request) => (
            <div key={request.id} className="grid gap-4 p-4 xl:grid-cols-[1.2fr_180px_170px_190px] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-200">{request.user.name}</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${paymentStatusClass(request.status)}`}>
                    {request.status === 'PENDING' ? <Clock3 className="h-3.5 w-3.5" /> : request.status === 'APPROVED' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {paymentStatusLabel(request.status)}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{request.user.email}</p>
                <p className="mt-1 text-xs text-slate-400">{request.package.name} · {formatCurrency(request.amount, request.currency)} · {new Date(request.createdAt).toLocaleString(locale)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{common.wallet}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{providerLabel(request.provider)}</p>
                <button type="button" onClick={() => copyValue(request.senderAccount)} className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400">
                  {request.senderAccount} <Copy className="h-3 w-3" />
                </button>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">TrxID</p>
                <button type="button" onClick={() => copyValue(request.transactionId)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-slate-200">
                  {request.transactionId} <Copy className="h-3.5 w-3.5" />
                </button>
                <p className="mt-1 text-xs text-slate-400">{common.reference} {request.reference}</p>
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                {request.status === 'PENDING' ? (
                  <>
                    <Button size="sm" onClick={() => openReview(request, 'approve')} disabled={isPending}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> {common.approved}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openReview(request, 'reject')} disabled={isPending}>
                      <XCircle className="h-3.5 w-3.5" /> {common.rejected}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString(locale) : '-'}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700/50">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.paymentAccounts}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.paymentAccountsHelp}</p>
          </div>
          <Button size="sm" onClick={openCreatePaymentMethod} disabled={isPending}>
            <Smartphone className="h-4 w-4" /> {copy.addAccount}
          </Button>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
          {paymentMethods.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">{copy.addPaymentAccountFirst}</div>
          ) : paymentMethods.map((method) => (
            <div key={method.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_180px_120px_180px] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-200">{providerLabel(method.provider)} · {method.label}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${method.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'}`}>
                    {method.isActive ? common.active : common.inactive}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{method.accountName} · {method.accountNumber}</p>
                {method.instructions && <p className="mt-1 text-xs text-slate-400">{method.instructions}</p>}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.requests}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{method.requestCount}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.sort}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{method.sortOrder}</p>
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <Button variant="outline" size="sm" onClick={() => openEditPaymentMethod(method)} disabled={isPending}>
                  <Edit2 className="h-3.5 w-3.5" /> {common.edit}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPaymentMethodActive(method.id, !method.isActive)} disabled={isPending}>
                  <Power className="h-3.5 w-3.5" /> {method.isActive ? common.disable : common.enable}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700/50">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.packages}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.packagesHelp}</p>
          </div>
          <Button size="sm" onClick={openCreatePackage} disabled={isPending}>{common.add}</Button>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
          {packages.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">{copy.noPackages}</div>
          ) : packages.map((pkg) => (
            <div key={pkg.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_160px_120px_180px] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-200">{pkg.name}</p>
                  {pkg.isFeatured && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{common.featured}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pkg.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'}`}>
                    {pkg.isActive ? common.active : common.inactive}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{pkg.description}</p>
                <p className="mt-1 text-xs text-slate-400">/{pkg.slug} · {pkg.subscriptionCount} {copy.subscriptions} · {copy.sort} {pkg.sortOrder}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.price}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(pkg.price, pkg.currency)}{localPeriodLabel(pkg.interval)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.trial}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{pkg.trialDays} {common.days}</p>
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <Button variant="outline" size="sm" onClick={() => openEditPackage(pkg)} disabled={isPending}>
                  <Edit2 className="h-3.5 w-3.5" /> {common.edit}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPackageActive(pkg.id, !pkg.isActive)} disabled={isPending}>
                  <Power className="h-3.5 w-3.5" /> {pkg.isActive ? common.deactivate : common.activate}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-200">{copy.grantFullAccess}</h2>
        <form action={grantAccess} className="grid gap-3 lg:grid-cols-[1fr_180px_220px_auto]">
          <Input id="grantEmail" name="email" type="email" label={copy.userEmail} placeholder="user@example.com" required />
          <div>
            <label htmlFor="grantDuration" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.duration}</label>
            <select
              id="grantDuration"
              name="duration"
              defaultValue="MONTHLY"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-200"
            >
              <option value="MONTHLY">{common.month}</option>
              <option value="YEARLY">{common.year}</option>
              <option value="UNLIMITED">{common.unlimited}</option>
            </select>
          </div>
          <div>
            <label htmlFor="grantPackage" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{common.package}</label>
            <select
              id="grantPackage"
              name="packageId"
              defaultValue=""
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-200"
            >
              <option value="">{copy.useDurationOnly}</option>
              {activePackages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isPending} className="w-full">{copy.grant}</Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 p-4 dark:border-slate-700/50">
          <h2 className="font-semibold text-slate-900 dark:text-slate-200">{copy.subscriptions}</h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
          {users.map((user) => (
            <div key={user.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_170px_180px_180px_120px] xl:items-center">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-200">{user.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{common.package}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{user.subscription?.package?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.source}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{user.role === 'ADMIN' ? common.admin : user.subscription?.source?.toLowerCase().replace('_', ' ') || common.noAccess}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.validUntil}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{user.role === 'ADMIN' ? common.unlimited : user.subscription ? localFormatAccessUntil(user.subscription.currentPeriodEnd) : '-'}</p>
              </div>
              <div className="xl:text-right">
                {user.role !== 'ADMIN' && user.subscription && (
                  <Button variant="outline" size="sm" onClick={() => revokeAccess(user.id)} disabled={isPending}>
                    {copy.revoke}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        isOpen={isPackageModalOpen}
        onClose={closePackageModal}
        title={packageForm ? copy.editPackage : copy.addPackage}
        className="max-w-2xl"
      >
        <form onSubmit={submitPackage} className="space-y-4">
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/40 dark:text-slate-300">
            <input
              type="checkbox"
              name="isTrial"
              checked={isTrialPackageMode}
              onChange={(event) => setIsTrialPackageMode(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            <span>
              <span className="block font-semibold text-slate-900 dark:text-slate-200">{copy.isTrialPackage}</span>
              <span className="mt-1 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">{copy.isTrialPackageHelp}</span>
            </span>
          </label>

          {isTrialPackageMode ? (
            <>
              <input type="hidden" name="name" value={editingTrialPackage ? packageForm?.name || 'Pro Trial' : 'Pro Trial'} />
              <input type="hidden" name="slug" value={editingTrialPackage ? packageForm?.slug || 'pro-trial' : 'pro-trial'} />
              <input type="hidden" name="description" value={editingTrialPackage ? packageForm?.description || 'Try full Pro access before choosing a paid package.' : 'Try full Pro access before choosing a paid package.'} />
              <input type="hidden" name="currency" value={editingTrialPackage ? packageForm?.currency || 'BDT' : 'BDT'} />
              <input type="hidden" name="price" value="0" />
              <input type="hidden" name="interval" value="MONTHLY" />
              <input type="hidden" name="sortOrder" value={editingTrialPackage ? packageForm?.sortOrder ?? 5 : 5} />
              <input type="hidden" name="discountLabel" value={editingTrialPackage && packageForm?.discountLabel ? packageForm.discountLabel : 'No payment required'} />
              <input
                type="hidden"
                name="featureBullets"
                value={(editingTrialPackage && packageForm?.featureBullets.length ? packageForm.featureBullets : [
                  'Full dashboard access during trial',
                  'No bKash or Nagad payment needed',
                  'Choose a paid package after trial ends',
                ]).join('\n')}
              />
              <input type="hidden" name="isActive" value="on" />
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <Input id="packageTrialDays" name="trialDays" label={copy.trialDays} type="number" min="1" step="1" defaultValue={packageForm?.trialDays || 7} required />
                <p className="mt-2 text-xs leading-5 text-emerald-700 dark:text-emerald-300">{copy.trialOnlyHelp}</p>
              </div>
            </>
          ) : (
            <>
              <input type="hidden" name="trialDays" value="0" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="packageName" name="name" label={copy.packageName} defaultValue={packageForm?.name || ''} required />
                <Input id="packageSlug" name="slug" label={copy.slug} defaultValue={packageForm?.slug || ''} placeholder="pro-monthly" />
              </div>
              <Input id="packageDescription" name="description" label={copy.description} defaultValue={packageForm?.description || ''} required />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input id="packageCurrency" name="currency" label={copy.currency} defaultValue={packageForm?.currency || 'BDT'} required />
                <Input id="packagePrice" name="price" label={copy.price} type="number" min="0.01" step="0.01" defaultValue={packageForm?.price || ''} required />
                <div>
                  <label htmlFor="packageInterval" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.interval}</label>
                  <select
                    id="packageInterval"
                    name="interval"
                    defaultValue={packageForm?.interval || 'MONTHLY'}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-200"
                  >
                    <option value="MONTHLY">{common.monthly}</option>
                    <option value="YEARLY">{common.yearly}</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="packageSortOrder" name="sortOrder" label={copy.sortOrder} type="number" step="1" defaultValue={packageForm?.sortOrder ?? 0} />
                <Input id="packageDiscountLabel" name="discountLabel" label={copy.discountLabel} defaultValue={packageForm?.discountLabel || ''} placeholder={copy.bestValue} />
              </div>
              <div>
                <label htmlFor="packageFeatureBullets" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.featureBullets}</label>
                <textarea
                  id="packageFeatureBullets"
                  name="featureBullets"
                  rows={4}
                  defaultValue={packageForm?.featureBullets.join('\n') || ''}
                  placeholder={copy.oneFeaturePerLine}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-slate-200 dark:placeholder-slate-400"
                />
              </div>
            </>
          )}

          {!isTrialPackageMode && (
            <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" name="isActive" defaultChecked={packageForm?.isActive ?? true} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              {common.active}
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" name="isFeatured" defaultChecked={packageForm?.isFeatured ?? false} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              {common.featured}
            </label>
          </div>
          )}
          <Button type="submit" className="w-full" isLoading={isPending}>
            {packageForm ? copy.updatePackage : copy.createPackage}
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={isPaymentMethodModalOpen}
        onClose={() => setIsPaymentMethodModalOpen(false)}
        title={paymentMethodForm ? copy.editPaymentAccount : copy.addPaymentAccount}
        className="max-w-xl"
      >
        <form onSubmit={submitPaymentMethod} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="manualProvider" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.provider}</label>
              <select
                id="manualProvider"
                name="provider"
                defaultValue={paymentMethodForm?.provider || 'BKASH'}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-200"
              >
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
              </select>
            </div>
            <Input id="manualLabel" name="label" label={copy.displayLabel} defaultValue={paymentMethodForm?.label || ''} placeholder={copy.mainWallet} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="manualAccountNumber" name="accountNumber" label={copy.accountNumber} defaultValue={paymentMethodForm?.accountNumber || ''} placeholder="01XXXXXXXXX" required />
            <Input id="manualAccountName" name="accountName" label={copy.accountName} defaultValue={paymentMethodForm?.accountName || ''} placeholder={copy.businessOwnerName} required />
          </div>
          <Input id="manualSortOrder" name="sortOrder" label={copy.sortOrder} type="number" step="1" defaultValue={paymentMethodForm?.sortOrder ?? 0} />
          <div>
            <label htmlFor="manualInstructions" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.paymentInstructions}</label>
            <textarea
              id="manualInstructions"
              name="instructions"
              rows={4}
              defaultValue={paymentMethodForm?.instructions || ''}
              placeholder={copy.paymentInstructionPlaceholder}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-slate-200 dark:placeholder-slate-400"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input type="checkbox" name="isActive" defaultChecked={paymentMethodForm?.isActive ?? true} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
            {copy.activeOnSubscriptionPage}
          </label>
          <Button type="submit" className="w-full" isLoading={isPending}>
            {paymentMethodForm ? copy.updateAccount : copy.createAccount}
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={reviewMode === 'approve' ? copy.approvePayment : copy.rejectPayment}
        className="max-w-xl"
      >
        {reviewRequest && (
          <form onSubmit={submitReview} className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{common.user}</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-200">{reviewRequest.user.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{reviewRequest.user.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{common.package}</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-200">{reviewRequest.package.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{formatCurrency(reviewRequest.amount, reviewRequest.currency)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{common.wallet}</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-200">{providerLabel(reviewRequest.provider)}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{reviewRequest.senderAccount}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{common.transactionId}</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-200">{reviewRequest.transactionId}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{common.reference} {reviewRequest.reference}</p>
                </div>
              </div>
              {reviewRequest.note && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{adminCopy.payments.userNote}: {reviewRequest.note}</p>}
              {reviewRequest.screenshotUrl && (
                <a href={reviewRequest.screenshotUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-medium text-indigo-600 dark:text-indigo-300">
                  Screenshot
                </a>
              )}
            </div>
            <div>
              <label htmlFor="adminNote" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.adminNote}</label>
              <textarea
                id="adminNote"
                name="adminNote"
                rows={3}
                placeholder={reviewMode === 'approve' ? copy.optionalConfirmationNote : copy.reasonShownToUser}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-slate-200 dark:placeholder-slate-400"
              />
            </div>
            <Button type="submit" variant={reviewMode === 'approve' ? 'primary' : 'danger'} className="w-full" isLoading={isPending}>
              {reviewMode === 'approve' ? copy.approveAndActivate : copy.rejectPayment}
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
