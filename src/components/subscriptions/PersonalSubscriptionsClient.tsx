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

const billingCycleOptions = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'CUSTOM', label: 'Custom' },
];

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const colorOptions = ['#6366f1', '#e11d48', '#0f766e', '#f59e0b', '#7c3aed', '#2563eb', '#16a34a'];

function cycleLabel(value: BillingCycle) {
  return value.toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
}

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
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
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
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        setItems((current) => current.map((item) => (
          item.id === id ? { ...item, status: item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' } : item
        )));
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this subscription?')) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await deletePersonalSubscriptionAction(id);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) setItems((current) => current.filter((item) => item.id !== id));
    });
  };

  return (
    <div className="space-y-6">
      <Loader show={isPending} message="Updating service tracker..." />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription Tracker</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track Netflix, LinkedIn, tools, movie sites, and other recurring memberships.</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Subscription
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
          <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeItems.length}</p>
        </Card>
        <Card className="p-5">
          <CalendarClock className="mb-3 h-5 w-5 text-emerald-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Due Soon</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{upcomingItems.length}</p>
        </Card>
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Monthly Cost</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(monthlyTotal, primaryCurrency)}</p>
        </Card>
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Yearly Cost</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(annualTotal, primaryCurrency)}</p>
        </Card>
      </div>

      {upcomingItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex flex-wrap gap-2">
            {upcomingItems.slice(0, 5).map((item) => (
              <span key={item.id} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-amber-800 shadow-sm dark:bg-slate-900 dark:text-amber-200">
                {item.name} due {daysUntil(item.nextBillingDate) <= 0 ? 'today' : `in ${daysUntil(item.nextBillingDate)}d`}
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
              placeholder="Search by service, provider, plan, or account"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950/40">
            {[
              { value: 'all', label: 'All' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'PAUSED', label: 'Paused' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value as typeof statusFilter)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${statusFilter === option.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
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
            title="No subscriptions tracked"
            description="Add Netflix, LinkedIn, streaming, SaaS, or any recurring membership to monitor renewals and cost."
            icon={<CreditCard className="h-12 w-12 text-slate-500" />}
            action={<Button type="button" onClick={openCreate}><Plus className="h-4 w-4" /> Add Subscription</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">Service</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">Amount</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">Next Billing</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">Payment</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase text-slate-400">Actions</th>
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
                            <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{item.provider}{item.planName ? ` · ${item.planName}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(Number(item.amount), item.currency)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{cycleLabel(item.billingCycle)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{formatDate(item.nextBillingDate)}</p>
                        <p className={`text-xs ${dueIn <= item.reminderDays && item.status === 'ACTIVE' ? 'text-amber-600 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          {dueIn < 0 ? `${Math.abs(dueIn)}d overdue` : dueIn === 0 ? 'Due today' : `In ${dueIn}d`}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                        <p className="font-medium text-slate-700 dark:text-slate-200">{item.account?.name || '-'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.category?.name || 'Subscriptions'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={statusVariant(item.status)}>{item.status.toLowerCase()}</Badge>
                        <p className="mt-1 text-xs text-slate-500">{item.autoRenew ? 'Auto renew' : 'Manual'}</p>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Subscription' : 'Add Subscription'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="subscriptionName" name="name" label="Service Name" defaultValue={editing?.name || ''} placeholder="Netflix" required />
            <Input id="provider" name="provider" label="Provider" defaultValue={editing?.provider || ''} placeholder="Netflix, LinkedIn, Disney+" required />
          </div>
          <Input id="planName" name="planName" label="Plan" defaultValue={editing?.planName || ''} placeholder="Premium, Standard, Career" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="amount" name="amount" label="Amount" type="number" step="0.01" defaultValue={editing ? Number(editing.amount) : ''} required />
            <Input id="currency" name="currency" label="Currency" maxLength={3} defaultValue={editing?.currency || 'BDT'} required />
            <Select id="billingCycle" name="billingCycle" label="Billing Cycle" defaultValue={editing?.billingCycle || 'MONTHLY'} options={billingCycleOptions} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="nextBillingDate" name="nextBillingDate" label="Next Billing Date" type="date" defaultValue={editing ? toDateInput(editing.nextBillingDate) : new Date().toISOString().split('T')[0]} required />
            <Select id="status" name="status" label="Status" defaultValue={editing?.status || 'ACTIVE'} options={statusOptions} />
            <Input id="reminderDays" name="reminderDays" label="Reminder Days" type="number" min={0} max={60} defaultValue={editing?.reminderDays ?? 3} required />
          </div>
          <Select
            id="accountId"
            name="accountId"
            label="Payment Account"
            defaultValue={editing?.accountId || ''}
            options={[{ value: '', label: 'No account selected' }, ...accounts.map((account) => ({ value: account.id, label: account.name }))]}
          />
          <Select
            id="categoryId"
            name="categoryId"
            label="Transaction Category"
            defaultValue={editing?.categoryId || ''}
            options={[{ value: '', label: 'Subscriptions (auto)' }, ...categories.map((category) => ({ value: category.id, label: category.name }))]}
          />
          <Input id="websiteUrl" name="websiteUrl" label="Website URL" type="url" defaultValue={editing?.websiteUrl || ''} placeholder="https://www.netflix.com" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Color</p>
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
            Auto renews
          </label>
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
            Automatic payment transactions are created only for active auto-renew subscriptions with a payment account selected.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
            <textarea id="notes" name="notes" rows={3} defaultValue={editing?.notes || ''} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-white" />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isPending}>{editing ? 'Update Subscription' : 'Add Subscription'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
