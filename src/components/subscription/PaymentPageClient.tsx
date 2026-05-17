'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  History,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import {
  createManualPaymentRequestAction,
  getMyManualPaymentRequestsAction,
  type ManualPaymentMethodRow,
  type ManualPaymentRequestRow,
  type SubscriptionPackageRow,
} from '@/actions/settings.actions';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  REJECTED: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
};

type PaymentPageClientProps = {
  packages: SubscriptionPackageRow[];
  selectedPackageId: string | null;
  paymentMethods: ManualPaymentMethodRow[];
  paymentRequests: ManualPaymentRequestRow[];
  accessState?: 'blocked' | 'active';
};

type PaymentProvider = 'BKASH' | 'NAGAD';

function providerLabel(provider: PaymentProvider | string) {
  return provider === 'BKASH' ? 'bKash' : 'Nagad';
}

function paymentMethodLabel(method: ManualPaymentMethodRow) {
  return `${providerLabel(method.provider)} - ${method.label}`;
}

function statusIcon(status: string) {
  if (status === 'APPROVED') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'REJECTED') return <AlertCircle className="h-4 w-4" />;
  return <Clock3 className="h-4 w-4" />;
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  return digits;
}

export default function PaymentPageClient({
  packages,
  selectedPackageId,
  paymentMethods,
  paymentRequests: initialPaymentRequests,
  accessState = 'blocked',
}: PaymentPageClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { locale, messages } = useI18n();
  const copy = messages.payment;
  const [requests, setRequests] = useState(initialPaymentRequests);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(paymentMethods[0]?.provider || 'BKASH');
  const [selectedMethodId, setSelectedMethodId] = useState(paymentMethods[0]?.id || '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [renderedAt] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();

  const selectedPackage =
    packages.find((pkg) => pkg.id === selectedPackageId) ||
    packages.find((pkg) => pkg.isFeatured) ||
    packages[0] ||
    null;
  const methodsByProvider = useMemo(() => ({
    BKASH: paymentMethods.filter((method) => method.provider === 'BKASH'),
    NAGAD: paymentMethods.filter((method) => method.provider === 'NAGAD'),
  }), [paymentMethods]);
  const providerMethods = methodsByProvider[selectedProvider];
  const selectedMethod = paymentMethods.find((method) => method.id === selectedMethodId) || providerMethods[0] || null;
  const pendingRequest = requests.find((request) => request.status === 'PENDING') || null;
  const latestApprovedRequest = requests.find((request) => request.status === 'APPROVED') || null;
  const canSubmit = Boolean(selectedPackage && !pendingRequest);
  const canUseProviderTabs = paymentMethods.length > 0;
  const activePackage = packages.find((pkg) => pkg.id === session?.user?.subscriptionPackageId) || null;
  const accessEndDate = session?.user?.subscriptionCurrentPeriodEnd ? new Date(session.user.subscriptionCurrentPeriodEnd) : null;
  const accessEndLabel = accessEndDate ? formatDate(accessEndDate, undefined, locale) : copy.noExpiry;
  const daysRemaining = accessEndDate
    ? Math.max(0, Math.ceil((accessEndDate.getTime() - renderedAt) / (1000 * 60 * 60 * 24)))
    : null;
  const userReference = useMemo(() => {
    const emailPart = session?.user?.email?.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'USER';
    return selectedPackage ? `TP-${emailPart}-${selectedPackage.slug}`.toUpperCase() : '';
  }, [selectedPackage, session?.user?.email]);
  const whatsAppDisplayNumber = process.env.NEXT_PUBLIC_PAYMENT_WHATSAPP_NUMBER || selectedMethod?.accountNumber || '';
  const whatsAppNumber = normalizeWhatsAppNumber(whatsAppDisplayNumber);
  const whatsAppText = encodeURIComponent(
    `Hello, I submitted a takapilot payment request. Reference: ${pendingRequest?.reference || userReference}. TrxID: ${pendingRequest?.transactionId || ''}`
  );
  const whatsAppHref = whatsAppNumber ? `https://wa.me/${whatsAppNumber}?text=${whatsAppText}` : '';
  const selectedIntervalLabel = selectedPackage?.interval === 'YEARLY'
    ? messages.subscription.yearly
    : messages.subscription.monthly;

  const copyValue = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setTimeout(() => setCopiedValue(null), 1500);
  };

  const selectProvider = (provider: PaymentProvider) => {
    setSelectedProvider(provider);
    setSelectedMethodId(methodsByProvider[provider][0]?.id || '');
  };

  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await createManualPaymentRequestAction(formData);
      if (result.success) {
        setRequests(await getMyManualPaymentRequestsAction());
        router.replace('/subscription/payment');
        router.refresh();
      }
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    });
  };

  if (accessState === 'active') {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-500/30 dark:bg-slate-900/60">
          <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">{copy.paymentApproved}</p>
                <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{copy.subscriptionActive}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {copy.activeFormHidden}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                {messages.subscription.goDashboard} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/settings" className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                {copy.backBilling}
              </Link>
            </div>
          </div>
          <div className="grid border-t border-slate-200 dark:border-slate-800 md:grid-cols-3">
            <div className="p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <CreditCard className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{copy.currentPlan}</p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{activePackage?.name || latestApprovedRequest?.package.name || 'PRO Access'}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{session?.user?.subscriptionSource === 'ADMIN_GRANT' ? 'Admin granted' : messages.subscription.payManually}</p>
            </div>
            <div className="border-t border-slate-200 p-5 dark:border-slate-800 md:border-l md:border-t-0">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <CalendarClock className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{copy.validUntil}</p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{accessEndLabel}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {daysRemaining !== null ? `${daysRemaining} ${copy.remainingSuffix}` : copy.noExpiry}
              </p>
            </div>
            <div className="border-t border-slate-200 p-5 dark:border-slate-800 md:border-l md:border-t-0">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <ReceiptText className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{copy.lastApproved}</p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {latestApprovedRequest ? formatCurrency(latestApprovedRequest.amount, latestApprovedRequest.currency, locale) : copy.approved}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {latestApprovedRequest ? `${providerLabel(latestApprovedRequest.provider)} - ${latestApprovedRequest.transactionId}` : copy.noManualHistory}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="p-0">
            <div className="flex items-center gap-2 border-b border-slate-200 p-4 dark:border-slate-700/50">
              <History className="h-5 w-5 text-indigo-500" />
              <h2 className="font-semibold text-slate-900 dark:text-white">{copy.history}</h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {requests.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 dark:text-slate-400">{copy.noHistory}</div>
              ) : requests.map((request) => (
                <div key={request.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white">{request.package.name}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[request.status]}`}>
                        {statusIcon(request.status)} {request.status.toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {providerLabel(request.provider)} - {formatCurrency(request.amount, request.currency, locale)}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-400">TrxID {request.transactionId} - Ref {request.reference}</p>
                    {request.adminNote && <p className="mt-2 rounded-xl bg-slate-50 p-2 text-xs text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">{copy.adminNote}: {request.adminNote}</p>}
                  </div>
                  <p className="text-xs text-slate-400">{formatDate(request.createdAt, 'MMM dd, yyyy h:mm a', locale)}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <ShieldCheck className="mb-3 h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{copy.renewalRules}</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p>{copy.renewalRule1}</p>
              <p>{copy.renewalRule2}</p>
              <p>{copy.renewalRule3}</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/subscription" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300">
            <ArrowLeft className="h-4 w-4" /> {copy.backToPackages}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{copy.completePayment}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.completePaymentHelp}</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          <ShieldCheck className="h-4 w-4" />
          {copy.verifiedWithin}
        </div>
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {selectedPackage && (
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-500/30 dark:bg-slate-900/60">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{copy.selectedPlan}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-950 dark:text-white">{selectedIntervalLabel}</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{selectedPackage.name}</span>
                    {selectedPackage.discountLabel && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{selectedPackage.discountLabel}</span>
                    )}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{copy.payableAmount}</p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-300">{formatCurrency(selectedPackage.price, selectedPackage.currency, locale)}</p>
                </div>
              </div>
            </div>
          )}

          {canSubmit && selectedPackage ? (
            <form onSubmit={submitPayment} className="space-y-5">
              <input type="hidden" name="packageId" value={selectedPackage.id} />
              <input type="hidden" name="methodId" value={selectedMethod?.id || ''} />
              <input type="hidden" name="provider" value={selectedMethod?.provider || selectedProvider} />
              <input type="hidden" name="reference" value={userReference} />

              <Card className="p-0">
                <div className="border-b border-slate-200 p-5 dark:border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">1</span>
                    <div>
                      <h2 className="font-bold text-slate-950 dark:text-white">{copy.sendPayment}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{copy.sendPaymentHelp}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    {(['BKASH', 'NAGAD'] as PaymentProvider[]).map((provider) => {
                      const isAvailable = !canUseProviderTabs || methodsByProvider[provider].length > 0;
                      const isSelected = selectedProvider === provider;
                      return (
                        <button
                          key={provider}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => selectProvider(provider)}
                          className={cn(
                            'flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors',
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-200'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
                            !isAvailable && 'cursor-not-allowed opacity-45'
                          )}
                        >
                          {providerLabel(provider)}
                          {isSelected && <Check className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  </div>

                  {providerMethods.length > 1 && (
                    <div>
                      <label htmlFor="paymentMethod" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.paymentAccount}</label>
                      <select
                        id="paymentMethod"
                        value={selectedMethodId}
                        onChange={(event) => {
                          const method = paymentMethods.find((item) => item.id === event.target.value);
                          setSelectedMethodId(event.target.value);
                          if (method) setSelectedProvider(method.provider);
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-white"
                      >
                        {providerMethods.map((method) => (
                          <option key={method.id} value={method.id}>{paymentMethodLabel(method)}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedMethod ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {formatCurrency(selectedPackage.price, selectedPackage.currency, locale)} {providerLabel(selectedMethod.provider)} {copy.sendAmountTo}
                          </p>
                          <p className="mt-2 break-all text-2xl font-black text-slate-950 dark:text-white">{selectedMethod.accountNumber}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedMethod.accountName} - {selectedMethod.label}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyValue(selectedMethod.accountNumber)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-white dark:ring-slate-700 dark:hover:bg-slate-700"
                        >
                          <Copy className="h-4 w-4" />
                          {copiedValue === selectedMethod.accountNumber ? copy.copied : copy.copy}
                        </button>
                      </div>
                      {selectedMethod.instructions && (
                        <p className="mt-4 rounded-xl bg-white p-3 text-xs leading-5 text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">{selectedMethod.instructions}</p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                      {copy.noPaymentAccount}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-0">
                <div className="border-b border-slate-200 p-5 dark:border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">2</span>
                    <div>
                      <h2 className="font-bold text-slate-950 dark:text-white">{copy.enterDetails}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{copy.enterDetailsHelp}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/50">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{copy.reference}</p>
                        <p className="mt-1 break-all text-sm font-bold text-slate-900 dark:text-white">{userReference}</p>
                      </div>
                      <button type="button" onClick={() => copyValue(userReference)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                        <Copy className="h-4 w-4" />
                        {copiedValue === userReference ? copy.copied : copy.copy}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input id="senderAccount" name="senderAccount" label={`${providerLabel(selectedProvider)} ${copy.phoneNumber}`} placeholder="01XXXXXXXXX" required />
                    <Input id="transactionId" name="transactionId" label={copy.transactionId} placeholder={copy.transactionPlaceholder} required />
                  </div>
                  <div>
                    <label htmlFor="paymentNote" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.noteForAdmin}</label>
                    <textarea
                      id="paymentNote"
                      name="note"
                      rows={3}
                      placeholder={copy.notePlaceholder}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-400"
                    />
                  </div>
                </div>
              </Card>

              <Card className="space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-500" />
                  <div>
                    <h2 className="font-bold text-slate-950 dark:text-white">{copy.termsTitle}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {copy.termsText}
                    </p>
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                  <input
                    type="checkbox"
                    required
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{copy.agreeTerms}</span>
                </label>
              </Card>

              <Button type="submit" size="lg" className="w-full from-emerald-600 to-emerald-600 shadow-lg shadow-emerald-500/20 hover:from-emerald-700 hover:to-emerald-700" isLoading={isPending} disabled={!acceptedTerms || !selectedMethod}>
                {copy.submitPaid}
              </Button>
            </form>
          ) : (
            <Card>
              <div className="flex items-start gap-3">
                <Clock3 className="mt-1 h-5 w-5 text-amber-500" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{copy.alreadySubmitted}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {copy.alreadySubmittedHelp}
                  </p>
                  {pendingRequest && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
                      <p className="font-semibold text-amber-800 dark:text-amber-200">Reference: {pendingRequest.reference}</p>
                      <p className="mt-1 text-amber-700 dark:text-amber-300">TrxID: {pendingRequest.transactionId}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">{copy.beforeSubmit}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{copy.quickChecklist}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex gap-3"><Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>{copy.checklistWallet}</span></div>
              <div className="flex gap-3"><Copy className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" /><span>{copy.checklistTrx}</span></div>
              <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" /><span>{copy.checklistAdmin}</span></div>
            </div>
          </Card>

          <Card>
            <MessageCircle className="mb-3 h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{copy.fasterActivation}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {copy.whatsappHelp}
            </p>
            {whatsAppHref ? (
              <>
                <button
                  type="button"
                  onClick={() => copyValue(whatsAppDisplayNumber || `+${whatsAppNumber}`)}
                  className="mt-4 inline-flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                >
                  <span className="min-w-0 truncate">{whatsAppDisplayNumber || `+${whatsAppNumber}`}</span>
                  <Copy className="h-4 w-4 shrink-0" />
                </button>
                <a href={whatsAppHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                  <MessageCircle className="h-4 w-4" />
                  {copy.contactWhatsapp}
                </a>
              </>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                {copy.whatsappMissing}
              </p>
            )}
          </Card>

          <Card className="p-0">
            <div className="flex items-center gap-2 border-b border-slate-200 p-4 dark:border-slate-700/50">
              <History className="h-5 w-5 text-indigo-500" />
              <h2 className="font-semibold text-slate-900 dark:text-white">{copy.history}</h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {requests.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 dark:text-slate-400">{copy.noHistory}</div>
              ) : requests.map((request) => (
                <div key={request.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-white">{request.package.name}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[request.status]}`}>
                      {statusIcon(request.status)} {request.status.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {providerLabel(request.provider)} - {formatCurrency(request.amount, request.currency, locale)}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-400">TrxID {request.transactionId}</p>
                  <p className="mt-1 break-all text-xs text-slate-400">Ref {request.reference}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(request.createdAt, 'MMM dd, yyyy h:mm a', locale)}</p>
                  {request.adminNote && <p className="mt-2 rounded-xl bg-slate-50 p-2 text-xs text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">{copy.adminNote}: {request.adminNote}</p>}
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
