'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarClock, CreditCard, Edit2, ExternalLink, PauseCircle, PlayCircle, Plus, Search, Trash2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Loader from '@/components/ui/Loader';
import {
  createPersonalSubscriptionAction,
  deletePersonalSubscriptionAction,
  togglePersonalSubscriptionAction,
  updatePersonalSubscriptionAction,
} from '@/actions/personal-subscription.actions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
type BillingCycle = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';

type Account = {
  id: string;
  name: string;
  type: string;
};

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

type TrackedSubscription = {
  id: string;
  accountId: string | null;
  categoryId: string | null;
  name: string;
  provider: string;
  planName: string | null;
  amount: number | string;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
  reminderDays: number;
  websiteUrl: string | null;
  notes: string | null;
  color: string;
  account: Account | null;
  category: Category | null;
};

type Props = {
  subscriptions: TrackedSubscription[];
  accounts: Account[];
  categories: Category[];
};

const colorOptions = ['#6366f1', '#e11d48', '#0f766e', '#f59e0b', '#7c3aed', '#2563eb', '#16a34a'];

function statusVariant(status: SubscriptionStatus) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PAUSED') return 'warning';
  return 'default';
}

function toDateInput(value: string) {
  return new Date(value).toISOString().split('T')[0];
}

function daysUntil(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function monthlyEquivalent(subscription: TrackedSubscription) {
  const amount = Number(subscription.amount);
  switch (subscription.billingCycle) {
    case 'WEEKLY':
      return amount * 52 / 12;
    case 'QUARTERLY':
      return amount / 3;
    case 'YEARLY':
      return amount / 12;
    case 'CUSTOM':
      return amount;
    default:
      return amount;
  }
}

export default function PersonalSubscriptionsClient({ subscriptions, accounts, categories }: Props) {
  const router = useRouter();
  const { locale, messages } = useI18n();
  const copy = messages.pages.serviceTracker;
  const common = messages.pages.common;
  const [items, setItems] = useState(subscriptions);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SubscriptionStatus>('all');
  const [editing, setEditing] = useState<TrackedSubscription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeItems = items.filter((item) => item.status === 'ACTIVE');
  const upcomingItems = activeItems
    .filter((item) => daysUntil(item.nextBillingDate) <= item.reminderDays)
    .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime());
  const monthlyTotal = activeItems.reduce((sum, item) => sum + monthlyEquivalent(item), 0);
  const annualTotal = monthlyTotal * 12;
  const primaryCurrency = activeItems[0]?.currency || items[0]?.currency || 'USD';
  const billingCycleOptions = [
    { value: 'WEEKLY', label: copy.cycles.WEEKLY },
    { value: 'MONTHLY', label: copy.cycles.MONTHLY },
    { value: 'QUARTERLY', label: copy.cycles.QUARTERLY },
    { value: 'YEARLY', label: copy.cycles.YEARLY },
    { value: 'CUSTOM', label: copy.cycles.CUSTOM },
  ];
  const statusOptions = [
    { value: 'ACTIVE', label: copy.statuses.ACTIVE },
    { value: 'PAUSED', label: copy.statuses.PAUSED },
    { value: 'CANCELLED', label: copy.statuses.CANCELLED },
  ];
  const actionMessageMap: Record<string, string> = {
    'Validation failed.': copy.messages.validationFailed,
    'Subscription added.': copy.messages.added,
    'Subscription updated.': copy.messages.updated,
    'Subscription status updated.': copy.messages.statusUpdated,
    'Subscription deleted.': copy.messages.deleted,
    'Failed to add subscription.': copy.messages.addFailed,
    'Failed to update subscription.': copy.messages.updateFailed,
    'Failed to update status.': copy.messages.statusFailed,
    'Failed to delete subscription.': copy.messages.deleteFailed,
    'তথ্য যাচাই করা যায়নি': copy.messages.validationFailed,
    'সাবস্ক্রিপশন যোগ হয়েছে।': copy.messages.added,
    'সাবস্ক্রিপশন আপডেট হয়েছে।': copy.messages.updated,
    'সাবস্ক্রিপশন স্ট্যাটাস আপডেট হয়েছে।': copy.messages.statusUpdated,
    'সাবস্ক্রিপশন ডিলিট হয়েছে।': copy.messages.deleted,
    'সাবস্ক্রিপশন যোগ করা যায়নি।': copy.messages.addFailed,
    'সাবস্ক্রিপশন আপডেট করা যায়নি।': copy.messages.updateFailed,
    'স্ট্যাটাস আপডেট করা যায়নি।': copy.messages.statusFailed,
    'সাবস্ক্রিপশন ডিলিট করা যায়নি।': copy.messages.deleteFailed,
  };
  const localizeActionMessage = (text: string) => actionMessageMap[text] || text;
  const formatDueLabel = (dueIn: number) => {
    if (dueIn < 0) return locale === 'bn-BD' ? `${Math.abs(dueIn)} ${copy.overdueDays}` : `${Math.abs(dueIn)}${copy.overdueDays}`;
    if (dueIn === 0) return locale === 'bn-BD' ? `${copy.today} ${copy.due}` : `${copy.due} ${copy.today}`;
    return locale === 'bn-BD' ? `${dueIn} ${copy.inDays}` : `In ${dueIn}${copy.inDays}`;
  };

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !normalizedQuery
        || item.name.toLowerCase().includes(normalizedQuery)
        || item.provider.toLowerCase().includes(normalizedQuery)
        || item.planName?.toLowerCase().includes(normalizedQuery)
        || item.account?.name.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setFeedback(null);
    setIsModalOpen(true);
  };

  const openEdit = (subscription: TrackedSubscription) => {
    setEditing(subscription);
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = editing
        ? await updatePersonalSubscriptionAction(editing.id, formData)
        : await createPersonalSubscriptionAction(formData);
      setFeedback({ type: result.success ? 'success' : 'error', text: localizeActionMessage(result.message) });
      if (result.success) {
        setIsModalOpen(false);
        router.refresh();
      }
    });
  };

  const handleToggle = (id: string) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await togglePersonalSubscriptionAction(id);
      setFeedback({ type: result.success ? 'success' : 'error', text: localizeActionMessage(result.message) });
      if (result.success) {
        setItems((current) => current.map((item) => (
          item.id === id ? { ...item, status: item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' } : item
        )));
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(copy.deleteConfirm)) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await deletePersonalSubscriptionAction(id);
      setFeedback({ type: result.success ? 'success' : 'error', text: localizeActionMessage(result.message) });
      if (result.success) setItems((current) => current.filter((item) => item.id !== id));
    });
  };

  return (
    <div className="space-y-6">
      <Loader show={isPending} message={copy.updating} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {copy.addSubscription}
        </Button>
      </div>

      {feedback && (
        <div className={`rounded-xl border p-3 text-sm font-medium ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'}`}>
          {feedback.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <CreditCard className="mb-3 h-5 w-5 text-indigo-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.active}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{activeItems.length}</p>
        </Card>
        <Card className="p-5">
          <CalendarClock className="mb-3 h-5 w-5 text-emerald-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.dueSoon}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{upcomingItems.length}</p>
        </Card>
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.monthlyCost}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{formatCurrency(monthlyTotal, primaryCurrency, locale)}</p>
        </Card>
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">{copy.yearlyCost}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{formatCurrency(annualTotal, primaryCurrency, locale)}</p>
        </Card>
      </div>

      {upcomingItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex flex-wrap gap-2">
            {upcomingItems.slice(0, 5).map((item) => (
              <span key={item.id} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-amber-800 shadow-sm dark:bg-slate-900 dark:text-amber-200">
                {item.name} {formatDueLabel(daysUntil(item.nextBillingDate))}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative lg:max-w-md lg:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950/40">
            {[
              { value: 'all', label: copy.all },
              { value: 'ACTIVE', label: copy.statuses.ACTIVE },
              { value: 'PAUSED', label: copy.statuses.PAUSED },
              { value: 'CANCELLED', label: copy.statuses.CANCELLED },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value as typeof statusFilter)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${statusFilter === option.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-200' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {filteredItems.length === 0 ? (
          <EmptyState
            title={copy.noSubscriptions}
            description={copy.noSubscriptionsHelp}
            icon={<CreditCard className="h-12 w-12 text-slate-500" />}
            action={<Button type="button" onClick={openCreate}><Plus className="h-4 w-4" /> {copy.addSubscription}</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.service}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.amount}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.nextBilling}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.payment}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.status}</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase text-slate-400">{copy.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => {
                  const dueIn = daysUntil(item.nextBillingDate);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="h-10 w-10 rounded-xl" style={{ backgroundColor: item.color }} />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-slate-200">{item.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{item.provider}{item.planName ? ` · ${item.planName}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-200">{formatCurrency(Number(item.amount), item.currency, locale)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{copy.cycles[item.billingCycle]}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-200">{formatDate(item.nextBillingDate, undefined, locale)}</p>
                        <p className={`text-xs ${dueIn <= item.reminderDays && item.status === 'ACTIVE' ? 'text-amber-600 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          {formatDueLabel(dueIn)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                        <p className="font-medium text-slate-700 dark:text-slate-200">{item.account?.name || '-'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.category?.name || copy.subscriptionsAuto}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={statusVariant(item.status)}>{copy.statuses[item.status]}</Badge>
                        <p className="mt-1 text-xs text-slate-500">{item.autoRenew ? copy.autoRenew : copy.manual}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          {item.websiteUrl && (
                            <Link href={item.websiteUrl} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-white/10">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          )}
                          <button type="button" onClick={() => handleToggle(item.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-white/10">
                            {item.status === 'ACTIVE' ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                          </button>
                          <button type="button" onClick={() => openEdit(item)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-white/10">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => handleDelete(item.id)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? copy.editSubscription : copy.addSubscription} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="subscriptionName" name="name" label={copy.serviceName} defaultValue={editing?.name || ''} placeholder={copy.serviceNamePlaceholder} required />
            <Input id="provider" name="provider" label={copy.provider} defaultValue={editing?.provider || ''} placeholder={copy.providerPlaceholder} required />
          </div>
          <Input id="planName" name="planName" label={copy.plan} defaultValue={editing?.planName || ''} placeholder={copy.planPlaceholder} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="amount" name="amount" label={copy.amount} type="number" step="0.01" defaultValue={editing ? Number(editing.amount) : ''} required />
            <Input id="currency" name="currency" label={copy.currency} maxLength={3} defaultValue={editing?.currency || 'BDT'} required />
            <Select id="billingCycle" name="billingCycle" label={copy.billingCycle} defaultValue={editing?.billingCycle || 'MONTHLY'} options={billingCycleOptions} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="nextBillingDate" name="nextBillingDate" label={copy.nextBillingDate} type="date" defaultValue={editing ? toDateInput(editing.nextBillingDate) : new Date().toISOString().split('T')[0]} required />
            <Select id="status" name="status" label={copy.status} defaultValue={editing?.status || 'ACTIVE'} options={statusOptions} />
            <Input id="reminderDays" name="reminderDays" label={copy.reminderDays} type="number" min={0} max={60} defaultValue={editing?.reminderDays ?? 3} required />
          </div>
          <Select
            id="accountId"
            name="accountId"
            label={copy.paymentAccount}
            defaultValue={editing?.accountId || ''}
            options={[{ value: '', label: copy.noAccountSelected }, ...accounts.map((account) => ({ value: account.id, label: account.name }))]}
          />
          <Select
            id="categoryId"
            name="categoryId"
            label={copy.transactionCategory}
            defaultValue={editing?.categoryId || ''}
            options={[{ value: '', label: copy.subscriptionsAuto }, ...categories.map((category) => ({ value: category.id, label: category.name }))]}
          />
          <Input id="websiteUrl" name="websiteUrl" label={copy.websiteUrl} type="url" defaultValue={editing?.websiteUrl || ''} placeholder="https://www.netflix.com" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{common.color}</p>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <label key={color} className="relative h-9 w-9 cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700" style={{ backgroundColor: color }}>
                  <input type="radio" name="color" value={color} defaultChecked={(editing?.color || '#6366f1') === color} className="sr-only" />
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input type="checkbox" name="autoRenew" defaultChecked={editing?.autoRenew ?? true} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
            {copy.autoRenews}
          </label>
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
            {copy.autoPaymentHelp}
          </p>
          <div className="space-y-1.5">
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.notes}</label>
            <textarea id="notes" name="notes" rows={3} defaultValue={editing?.notes || ''} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-slate-200" />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{copy.cancel}</Button>
            <Button type="submit" isLoading={isPending}>{editing ? copy.updateSubscription : copy.addSubscription}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
