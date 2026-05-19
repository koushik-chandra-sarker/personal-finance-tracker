'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Eye, Filter, KeyRound, LifeBuoy, MessageSquare, Search } from 'lucide-react';
import type { SupportTicketRow } from '@/actions/support.actions';
import { verifySupportPinAction } from '@/actions/support.actions';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { formatRelativeDate, getSupportCategoryLabel, getSupportPriorityLabel, getSupportStatusLabel } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

type Props = {
  tickets: SupportTicketRow[];
  filters: {
    status: string;
    priority: string;
    category: string;
    search: string;
  };
};

function statusBadge(status: SupportTicketRow['status']) {
  if (status === 'OPEN') return 'success';
  if (status === 'IN_PROGRESS') return 'info';
  if (status === 'RESOLVED') return 'warning';
  return 'default';
}

function priorityBadge(priority: SupportTicketRow['priority']) {
  if (priority === 'URGENT') return 'danger';
  if (priority === 'HIGH') return 'warning';
  if (priority === 'LOW') return 'default';
  return 'info';
}

export default function AdminSupportClient({ tickets, filters }: Props) {
  const { locale, messages } = useI18n();
  const copy = messages.pages.support;
  const statusOptions = [
    { value: 'all', label: copy.allStatuses },
    { value: 'OPEN', label: getSupportStatusLabel('OPEN', locale) },
    { value: 'IN_PROGRESS', label: getSupportStatusLabel('IN_PROGRESS', locale) },
    { value: 'RESOLVED', label: getSupportStatusLabel('RESOLVED', locale) },
    { value: 'CLOSED', label: getSupportStatusLabel('CLOSED', locale) },
  ];
  const priorityOptions = [
    { value: 'all', label: copy.allPriorities },
    { value: 'LOW', label: getSupportPriorityLabel('LOW', locale) },
    { value: 'NORMAL', label: getSupportPriorityLabel('NORMAL', locale) },
    { value: 'HIGH', label: getSupportPriorityLabel('HIGH', locale) },
    { value: 'URGENT', label: getSupportPriorityLabel('URGENT', locale) },
  ];
  const categoryOptions = [
    { value: 'all', label: copy.allCategories },
    { value: 'GENERAL', label: getSupportCategoryLabel('GENERAL', locale) },
    { value: 'BILLING', label: getSupportCategoryLabel('BILLING', locale) },
    { value: 'BUG_REPORT', label: getSupportCategoryLabel('BUG_REPORT', locale) },
    { value: 'FEATURE_REQUEST', label: getSupportCategoryLabel('FEATURE_REQUEST', locale) },
    { value: 'ACCOUNT_ISSUE', label: getSupportCategoryLabel('ACCOUNT_ISSUE', locale) },
  ];
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleVerifyPin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await verifySupportPinAction(formData);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        window.location.href = '/dashboard';
      }
    });
  };

  const openCount = tickets.filter((ticket) => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS').length;
  const urgentCount = tickets.filter((ticket) => ticket.priority === 'URGENT' || ticket.priority === 'HIGH').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{copy.adminQueueTitle}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.adminQueueSubtitle}</p>
        </div>
        <Button type="button" onClick={() => setIsPinOpen(true)}>
          <KeyRound className="h-4 w-4" />
          {copy.enterSupportPin}
        </Button>
      </div>

      {feedback && (
        <div className={`rounded-xl border p-3 text-sm font-medium ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'}`}>
          {feedback.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <LifeBuoy className="mb-3 h-5 w-5 text-indigo-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.tickets}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{tickets.length}</p>
        </Card>
        <Card className="p-5">
          <Filter className="mb-3 h-5 w-5 text-emerald-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.openWork}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{openCount}</p>
        </Card>
        <Card className="p-5">
          <KeyRound className="mb-3 h-5 w-5 text-amber-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.highPriority}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{urgentCount}</p>
        </Card>
      </div>

      <Card className="p-4">
        <form action="/admin/support" className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px_auto]">
          <Input name="search" label={copy.search} defaultValue={filters.search} placeholder={copy.searchPlaceholder} icon={<Search className="h-4 w-4" />} />
          <Select name="status" label={copy.status} defaultValue={filters.status} options={statusOptions} />
          <Select name="priority" label={copy.priority} defaultValue={filters.priority} options={priorityOptions} />
          <Select name="category" label={copy.category} defaultValue={filters.category} options={categoryOptions} />
          <div className="flex items-end">
            <Button type="submit" className="w-full">{copy.apply}</Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {tickets.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <LifeBuoy className="mx-auto mb-4 h-10 w-10 text-slate-300 dark:text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200">{copy.noMatch}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{copy.noAdminMatchHelp}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.user}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.ticket}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.category}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.status}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.priority}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.updated}</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase text-slate-400">{copy.open}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-200">{ticket.user.name}</p>
                      <p className="text-xs text-slate-500">{ticket.user.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/support/${ticket.id}`} className="font-bold text-slate-900 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-300">{ticket.subject}</Link>
                      <p className="mt-1 flex items-center gap-1.5 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        {ticket.messageCount} {copy.messages}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">{getSupportCategoryLabel(ticket.category, locale)}</td>
                    <td className="px-5 py-4"><Badge variant={statusBadge(ticket.status)}>{getSupportStatusLabel(ticket.status, locale)}</Badge></td>
                    <td className="px-5 py-4"><Badge variant={priorityBadge(ticket.priority)}>{getSupportPriorityLabel(ticket.priority, locale)}</Badge></td>
                    <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{formatRelativeDate(ticket.updatedAt, locale)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/support/${ticket.id}`} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10">
                        <Eye className="h-4 w-4" />
                        {copy.open}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={isPinOpen} onClose={() => setIsPinOpen(false)} title={copy.enterSupportPin} size="md">
        <form onSubmit={handleVerifyPin} className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
            {copy.enterPinHelp}
          </div>
          <Input name="pin" label={copy.supportPin} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="123456" />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsPinOpen(false)}>{copy.cancel}</Button>
            <Button type="submit" isLoading={isPending}>
              <KeyRound className="h-4 w-4" />
              {copy.startSupportView}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
