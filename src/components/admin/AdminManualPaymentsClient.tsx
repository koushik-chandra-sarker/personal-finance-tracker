'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Copy,
  Edit2,
  ExternalLink,
  Filter,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  WalletCards,
  XCircle,
} from 'lucide-react';
import {
  approveManualPaymentRequestAction,
  createManualPaymentMethodAction,
  getAdminManualPaymentMethodsAction,
  getAdminManualPaymentRequestsAction,
  rejectManualPaymentRequestAction,
  setManualPaymentMethodActiveAction,
  updateManualPaymentMethodAction,
  type AdminManualPaymentMethodRow,
  type AdminManualPaymentRequestRow,
} from '@/actions/admin.actions';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { cn, formatCurrency } from '@/lib/utils';

type Props = {
  initialPaymentMethods: AdminManualPaymentMethodRow[];
  initialPaymentRequests: AdminManualPaymentRequestRow[];
};

type PaymentStatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type ReviewMode = 'approve' | 'reject';

function providerLabel(provider: string) {
  return provider === 'BKASH' ? 'bKash' : 'Nagad';
}

function statusStyle(status: string) {
  if (status === 'APPROVED') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300';
  if (status === 'REJECTED') return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300';
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300';
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'APPROVED') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'REJECTED') return <XCircle className="h-4 w-4" />;
  return <Clock3 className="h-4 w-4" />;
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function timeAgo(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function buildVerificationSummary(request: AdminManualPaymentRequestRow) {
  return [
    `User: ${request.user.name} <${request.user.email}>`,
    `Package: ${request.package.name}`,
    `Amount: ${formatCurrency(request.amount, request.currency)}`,
    `Provider: ${providerLabel(request.provider)}`,
    `Sender wallet: ${request.senderAccount}`,
    `Transaction ID: ${request.transactionId}`,
    `Reference: ${request.reference}`,
    `Submitted: ${formatDateTime(request.createdAt)}`,
    request.method ? `Receiver: ${request.method.accountName} (${request.method.accountNumber})` : null,
  ].filter(Boolean).join('\n');
}

export default function AdminManualPaymentsClient({ initialPaymentMethods, initialPaymentRequests }: Props) {
  const [paymentMethods, setPaymentMethods] = useState(initialPaymentMethods);
  const [paymentRequests, setPaymentRequests] = useState(initialPaymentRequests);
  const [selectedRequestId, setSelectedRequestId] = useState(initialPaymentRequests[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('PENDING');
  const [search, setSearch] = useState('');
  const [paymentMethodForm, setPaymentMethodForm] = useState<AdminManualPaymentMethodRow | null>(null);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [reviewRequest, setReviewRequest] = useState<AdminManualPaymentRequestRow | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewMode>('approve');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => ({
    total: paymentRequests.length,
    pending: paymentRequests.filter((request) => request.status === 'PENDING').length,
    approved: paymentRequests.filter((request) => request.status === 'APPROVED').length,
    rejected: paymentRequests.filter((request) => request.status === 'REJECTED').length,
  }), [paymentRequests]);

  const pendingRequests = useMemo(
    () => paymentRequests.filter((request) => request.status === 'PENDING'),
    [paymentRequests]
  );
  const pendingValue = useMemo(
    () => pendingRequests.reduce((total, request) => total + request.amount, 0),
    [pendingRequests]
  );
  const oldestPending = pendingRequests[0] || null;
  const activePaymentMethods = paymentMethods.filter((method) => method.isActive).length;

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return paymentRequests.filter((request) => {
      const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
      const matchesSearch = !query
        || request.user.name.toLowerCase().includes(query)
        || request.user.email.toLowerCase().includes(query)
        || request.transactionId.toLowerCase().includes(query)
        || request.reference.toLowerCase().includes(query)
        || request.senderAccount.toLowerCase().includes(query)
        || request.package.name.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [paymentRequests, search, statusFilter]);

  const selectedRequest =
    paymentRequests.find((request) => request.id === selectedRequestId)
    || filteredRequests[0]
    || paymentRequests[0]
    || null;

  const refreshPaymentRequests = async () => {
    const nextRequests = await getAdminManualPaymentRequestsAction();
    setPaymentRequests(nextRequests);
    if (!nextRequests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(nextRequests[0]?.id || '');
    }
  };

  const refreshPaymentMethods = async () => {
    setPaymentMethods(await getAdminManualPaymentMethodsAction());
  };

  const refreshAll = () => {
    setMessage(null);
    startTransition(async () => {
      await Promise.all([refreshPaymentRequests(), refreshPaymentMethods()]);
      setMessage({ type: 'success', text: 'Payment review data refreshed.' });
    });
  };

  const copyValue = async (value: string, label = 'Value') => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setMessage({ type: 'success', text: `${label} copied to clipboard.` });
    window.setTimeout(() => setCopiedValue(null), 1400);
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

  const openReview = (request: AdminManualPaymentRequestRow, mode: ReviewMode) => {
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
        await refreshPaymentRequests();
        setIsReviewModalOpen(false);
        setReviewRequest(null);
      }
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    });
  };

  const statusFilters: Array<{ value: PaymentStatusFilter; label: string; count: number }> = [
    { value: 'PENDING', label: 'Pending', count: stats.pending },
    { value: 'APPROVED', label: 'Approved', count: stats.approved },
    { value: 'REJECTED', label: 'Rejected', count: stats.rejected },
    { value: 'ALL', label: 'All', count: stats.total },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
              <WalletCards className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manual Payment Review</h1>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Verify bKash and Nagad submissions against wallet history, then approve or reject from one focused workspace.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={refreshAll} disabled={isPending}>
              <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} /> Refresh
            </Button>
            <Button onClick={openCreatePaymentMethod} disabled={isPending}>
              <Smartphone className="h-4 w-4" /> Payment Account
            </Button>
          </div>
        </div>
        <div className="grid border-t border-slate-200 dark:border-slate-800 sm:grid-cols-3">
          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Needs review</p>
            <p className="mt-1 text-3xl font-black text-amber-600 dark:text-amber-300">{stats.pending}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {oldestPending ? `Oldest ${timeAgo(oldestPending.createdAt)}` : 'Queue is clear'}
            </p>
          </div>
          <div className="border-t border-slate-200 p-5 dark:border-slate-800 sm:border-l sm:border-t-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pending value</p>
            <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(pendingValue, pendingRequests[0]?.currency || 'BDT')}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Only pending requests</p>
          </div>
          <div className="border-t border-slate-200 p-5 dark:border-slate-800 sm:border-l sm:border-t-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Payment accounts</p>
            <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{activePaymentMethods}/{paymentMethods.length}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Active / total accounts</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5"><Clock3 className="mb-3 h-5 w-5 text-amber-500" /><p className="text-sm text-slate-500 dark:text-slate-400">Pending</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p></Card>
        <Card className="p-5"><CheckCircle2 className="mb-3 h-5 w-5 text-emerald-500" /><p className="text-sm text-slate-500 dark:text-slate-400">Approved</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.approved}</p></Card>
        <Card className="p-5"><XCircle className="mb-3 h-5 w-5 text-rose-500" /><p className="text-sm text-slate-500 dark:text-slate-400">Rejected</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.rejected}</p></Card>
        <Card className="p-5"><WalletCards className="mb-3 h-5 w-5 text-indigo-500" /><p className="text-sm text-slate-500 dark:text-slate-400">Payment Accounts</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{paymentMethods.length}</p></Card>
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_27rem]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700/50">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Review Queue</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Select a request to inspect details and take action.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search user, TrxID, reference"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-white sm:w-72"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors',
                    statusFilter === filter.value
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {filter.label}
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', statusFilter === filter.value ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800')}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="p-10 text-center">
              <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="font-semibold text-slate-900 dark:text-white">No payment requests found</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try another status or search term.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRequests.map((request) => {
                const isSelected = selectedRequest?.id === request.id;
                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedRequestId(request.id)}
                    className={cn(
                      'grid w-full gap-4 p-4 text-left transition-colors lg:grid-cols-[minmax(0,1fr)_9rem_11rem_2rem]',
                      isSelected ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold', statusStyle(request.status))}>
                          <StatusIcon status={request.status} />
                          {request.status.toLowerCase()}
                        </span>
                        <p className="truncate font-semibold text-slate-900 dark:text-white">{request.user.name}</p>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{request.user.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{providerLabel(request.provider)}</span>
                        <span className="truncate text-xs text-slate-400">{request.package.name}</span>
                        <span className="text-xs text-slate-400">{timeAgo(request.createdAt)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Amount</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(request.amount, request.currency)}</p>
                      <p className="text-xs text-slate-400">{request.package.interval.toLowerCase()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">TrxID</p>
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{request.transactionId}</p>
                      <p className="truncate text-xs text-slate-400">Ref {request.reference}</p>
                    </div>
                    <div className="hidden items-center justify-end text-slate-300 dark:text-slate-600 lg:flex">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Card className="overflow-hidden p-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="p-5 pb-0">
                <h2 className="font-semibold text-slate-900 dark:text-white">Request Details</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Verify before activating access.</p>
              </div>
              {selectedRequest && (
                <span className={cn('mr-5 mt-5 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold', statusStyle(selectedRequest.status))}>
                  <StatusIcon status={selectedRequest.status} />
                  {selectedRequest.status.toLowerCase()}
                </span>
              )}
            </div>

            {!selectedRequest ? (
              <div className="m-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Select a payment request.
              </div>
            ) : (
              <div>
                <div className="mx-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="bg-slate-50 p-4 dark:bg-slate-950/40">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Customer</p>
                        <p className="mt-1 truncate text-lg font-black text-slate-900 dark:text-white">{selectedRequest.user.name}</p>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">{selectedRequest.user.email}</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Amount to verify</p>
                        <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-300">{formatCurrency(selectedRequest.amount, selectedRequest.currency)}</p>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{selectedRequest.package.name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid divide-y divide-slate-200 dark:divide-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    <div className="p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Provider</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{providerLabel(selectedRequest.provider)}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Submitted</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{timeAgo(selectedRequest.createdAt)}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Interval</p>
                      <p className="mt-1 font-semibold capitalize text-slate-900 dark:text-white">{selectedRequest.package.interval.toLowerCase()}</p>
                    </div>
                  </div>
                </div>

                <div className="mx-5 mt-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white">Payment evidence</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Use these values to match the wallet transaction.</p>
                  </div>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {[
                      { label: 'Transaction ID', value: selectedRequest.transactionId, copy: 'Transaction ID', strong: true },
                      { label: 'Sender wallet', value: selectedRequest.senderAccount, copy: 'Sender wallet', strong: true },
                      { label: 'Reference', value: selectedRequest.reference, copy: 'Reference', strong: false },
                      { label: 'Submitted at', value: formatDateTime(selectedRequest.createdAt), copy: null, strong: false },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
                          <p className={cn('mt-1 truncate text-slate-900 dark:text-white', item.strong ? 'text-base font-black' : 'text-sm font-semibold')}>{item.value}</p>
                        </div>
                        {item.copy && (
                          <button
                            type="button"
                            onClick={() => copyValue(item.value, item.copy)}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-700 dark:hover:bg-slate-800"
                            aria-label={`Copy ${item.label}`}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedRequest.method && (
                  <div className="mx-5 mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Receiver account</p>
                        <p className="mt-1 truncate font-bold text-slate-900 dark:text-white">{selectedRequest.method.accountName}</p>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">{selectedRequest.method.label} - {selectedRequest.method.accountNumber}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyValue(selectedRequest.method?.accountNumber || '', 'Receiver account')}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-700 dark:hover:bg-slate-800"
                        aria-label="Copy receiver account"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mx-5 mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Verification checklist</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        <p>1. Match amount, provider, and sender wallet in wallet history.</p>
                        <p>2. Confirm Transaction ID has not already been approved.</p>
                        <p>3. Approve only after the payment is visible in the receiver account.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedRequest.note && (
                  <div className="mx-5 mb-4 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase text-slate-400">User note</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedRequest.note}</p>
                  </div>
                )}

                {selectedRequest.adminNote && (
                  <div className="mx-5 mb-4 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase text-slate-400">Admin note</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedRequest.adminNote}</p>
                  </div>
                )}

                {selectedRequest.screenshotUrl && (
                  <a
                    href={selectedRequest.screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mx-5 mb-4 inline-flex w-[calc(100%-2.5rem)] items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Open Screenshot <ExternalLink className="h-4 w-4" />
                  </a>
                )}

                {selectedRequest.status === 'PENDING' ? (
                  <div className="space-y-3 border-t border-slate-200 p-5 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => copyValue(buildVerificationSummary(selectedRequest), 'Verification summary')}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      Copy verification summary
                    </button>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button onClick={() => openReview(selectedRequest, 'approve')} disabled={isPending}>
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </Button>
                      <Button variant="outline" onClick={() => openReview(selectedRequest, 'reject')} disabled={isPending}>
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="m-5 space-y-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    <p>
                      Reviewed {formatDateTime(selectedRequest.reviewedAt)}
                      {selectedRequest.reviewedBy ? ` by ${selectedRequest.reviewedBy.name}` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyValue(buildVerificationSummary(selectedRequest), 'Verification summary')}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      Copy verification summary
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Payment Accounts</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Shown on the subscription payment screen.</p>
              </div>
              <Button size="sm" onClick={openCreatePaymentMethod} disabled={isPending}>
                Add
              </Button>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {paymentMethods.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No payment account configured.</div>
              ) : paymentMethods.map((method) => (
                <div key={method.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{providerLabel(method.provider)} · {method.label}</p>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', method.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
                          {method.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{method.accountName} · {method.accountNumber}</p>
                      <p className="mt-1 text-xs text-slate-400">{method.requestCount} request{method.requestCount === 1 ? '' : 's'}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditPaymentMethod(method)} disabled={isPending} className="h-8 w-8 p-0" title="Edit account">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setPaymentMethodActive(method.id, !method.isActive)} disabled={isPending} className="h-8 w-8 p-0" title={method.isActive ? 'Disable account' : 'Enable account'}>
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

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
            <div className={cn('rounded-2xl border p-4', reviewMode === 'approve' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10')}>
              <div className="flex items-start gap-3">
                {reviewMode === 'approve'
                  ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                  : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-300" />}
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {reviewMode === 'approve' ? 'Activate subscription access?' : 'Reject this payment request?'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {reviewMode === 'approve'
                      ? `This will approve ${formatCurrency(reviewRequest.amount, reviewRequest.currency)} and activate ${reviewRequest.package.name} for ${reviewRequest.user.email}.`
                      : `This will mark the request as rejected for ${reviewRequest.user.email}. Add a clear reason if the user needs to resubmit.`}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Transaction ID</p>
                <p className="font-semibold text-slate-900 dark:text-white">{reviewRequest.transactionId}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Sender wallet</p>
                <p className="font-semibold text-slate-900 dark:text-white">{reviewRequest.senderAccount}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Reference</p>
                <p className="font-semibold text-slate-900 dark:text-white">{reviewRequest.reference}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Provider</p>
                <p className="font-semibold text-slate-900 dark:text-white">{providerLabel(reviewRequest.provider)}</p>
              </div>
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

      {copiedValue && <span className="sr-only">{copiedValue} copied</span>}
    </div>
  );
}
