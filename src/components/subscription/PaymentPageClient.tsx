'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  History,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  WalletCards,
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
import { formatCurrency } from '@/lib/utils';

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
};

function paymentMethodLabel(method: ManualPaymentMethodRow) {
  return `${method.provider === 'BKASH' ? 'bKash' : 'Nagad'} · ${method.label}`;
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
}: PaymentPageClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [requests, setRequests] = useState(initialPaymentRequests);
  const [selectedMethodId, setSelectedMethodId] = useState(paymentMethods[0]?.id || '');
  const [selectedProvider, setSelectedProvider] = useState<'BKASH' | 'NAGAD'>(paymentMethods[0]?.provider || 'BKASH');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPackage =
    packages.find((pkg) => pkg.id === selectedPackageId) ||
    packages.find((pkg) => pkg.isFeatured) ||
    packages[0] ||
    null;
  const selectedMethod = paymentMethods.find((method) => method.id === selectedMethodId) || paymentMethods[0] || null;
  const pendingRequest = requests.find((request) => request.status === 'PENDING') || null;
  const canSubmit = Boolean(selectedPackage && !pendingRequest);
  const userReference = useMemo(() => {
    const emailPart = session?.user?.email?.split('@')[0]?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'USER';
    return selectedPackage ? `TP-${emailPart}-${selectedPackage.slug}`.toUpperCase() : '';
  }, [selectedPackage, session?.user?.email]);
  const whatsAppDisplayNumber = process.env.NEXT_PUBLIC_PAYMENT_WHATSAPP_NUMBER || selectedMethod?.accountNumber || '';
  const whatsAppNumber = normalizeWhatsAppNumber(
    whatsAppDisplayNumber
  );
  const whatsAppText = encodeURIComponent(
    `Hello, I submitted a takapilot payment request. Reference: ${pendingRequest?.reference || userReference}. TrxID: ${pendingRequest?.transactionId || ''}`
  );
  const whatsAppHref = whatsAppNumber ? `https://wa.me/${whatsAppNumber}?text=${whatsAppText}` : '';

  const copyValue = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setTimeout(() => setCopiedValue(null), 1500);
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/subscription" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300">
            <ArrowLeft className="h-4 w-4" /> Back to packages
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Verification</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Submit your bKash or Nagad transaction details and track approval from one place.</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Account activation usually completes within 24 hours.
        </div>
      </div>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Payment guide</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Follow these steps before submitting the form.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
                <Smartphone className="mb-3 h-5 w-5 text-pink-500" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">1. Pay exact amount</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Send the package amount using bKash or Nagad.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
                <Copy className="mb-3 h-5 w-5 text-sky-500" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">2. Keep TrxID</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Copy the transaction ID and sender wallet number.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
                <ShieldCheck className="mb-3 h-5 w-5 text-emerald-500" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">3. Admin verifies</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Access activates after wallet-history confirmation.</p>
              </div>
            </div>
          </Card>

          {canSubmit && selectedPackage ? (
            <Card>
              <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Submit payment details</h2>
              <form onSubmit={submitPayment} className="space-y-5">
                <input type="hidden" name="packageId" value={selectedPackage.id} />
                <input type="hidden" name="methodId" value={selectedMethod?.id || ''} />
                <input type="hidden" name="provider" value={selectedMethod?.provider || selectedProvider} />
                <input type="hidden" name="reference" value={userReference} />

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/40">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Package</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedPackage.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Amount</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(selectedPackage.price, selectedPackage.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Reference</p>
                      <button type="button" onClick={() => copyValue(userReference)} className="inline-flex items-center gap-1 text-left text-sm font-bold text-indigo-600 dark:text-indigo-300">
                        {userReference} <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {paymentMethods.length > 0 ? (
                  <div>
                    <label htmlFor="paymentMethod" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Paid To</label>
                    <select
                      id="paymentMethod"
                      value={selectedMethodId}
                      onChange={(event) => setSelectedMethodId(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-white"
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.id} value={method.id}>{paymentMethodLabel(method)}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="manualProvider" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Payment Provider</label>
                    <select
                      id="manualProvider"
                      value={selectedProvider}
                      onChange={(event) => setSelectedProvider(event.target.value as 'BKASH' | 'NAGAD')}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-white"
                    >
                      <option value="BKASH">bKash</option>
                      <option value="NAGAD">Nagad</option>
                    </select>
                  </div>
                )}

                {selectedMethod && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <div className="flex items-start gap-3">
                      <WalletCards className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">{paymentMethodLabel(selectedMethod)}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{selectedMethod.accountName}</p>
                        <button type="button" onClick={() => copyValue(selectedMethod.accountNumber)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-sm font-semibold text-slate-900 shadow-sm dark:bg-slate-900/60 dark:text-white">
                          {selectedMethod.accountNumber} <Copy className="h-3.5 w-3.5" />
                        </button>
                        {selectedMethod.instructions && <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{selectedMethod.instructions}</p>}
                        {copiedValue && <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">Copied</p>}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input id="senderAccount" name="senderAccount" label="Sender bKash/Nagad Number" placeholder="01XXXXXXXXX" required />
                  <Input id="transactionId" name="transactionId" label="Transaction ID" placeholder="Example: A1B2C3D4E5" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input id="paidAt" name="paidAt" label="Payment Time" type="datetime-local" />
                  <Input id="screenshotUrl" name="screenshotUrl" label="Screenshot Link (Optional)" placeholder="https://..." />
                </div>
                <div>
                  <label htmlFor="paymentNote" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Note for Admin</label>
                  <textarea
                    id="paymentNote"
                    name="note"
                    rows={3}
                    placeholder="Anything that helps admin match this payment"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-400"
                  />
                </div>
                <Button type="submit" className="w-full" isLoading={isPending}>
                  Submit for Verification
                </Button>
              </form>
            </Card>
          ) : (
            <Card>
              <div className="flex items-start gap-3">
                <Clock3 className="mt-1 h-5 w-5 text-amber-500" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Payment already submitted</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Your payment is waiting for admin review. Account activation usually completes within 24 hours.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <MessageCircle className="mb-3 h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Need faster approval?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Message the WhatsApp number with your reference and TrxID after submitting the payment.
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
                  Message on WhatsApp
                </a>
                {copiedValue && <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">Number copied</p>}
              </>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                Add `NEXT_PUBLIC_PAYMENT_WHATSAPP_NUMBER` or an active payment account number to enable the direct WhatsApp link.
              </p>
            )}
          </Card>

          <Card className="p-0">
            <div className="flex items-center gap-2 border-b border-slate-200 p-4 dark:border-slate-700/50">
              <History className="h-5 w-5 text-indigo-500" />
              <h2 className="font-semibold text-slate-900 dark:text-white">Payment History</h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {requests.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No payment request submitted yet.</div>
              ) : requests.map((request) => (
                <div key={request.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-white">{request.package.name}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[request.status]}`}>
                      {statusIcon(request.status)} {request.status.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {request.provider === 'BKASH' ? 'bKash' : 'Nagad'} · {formatCurrency(request.amount, request.currency)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">TrxID {request.transactionId} · Ref {request.reference}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(request.createdAt).toLocaleString()}</p>
                  {request.adminNote && <p className="mt-2 rounded-xl bg-slate-50 p-2 text-xs text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">Admin note: {request.adminNote}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
