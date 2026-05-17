'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { ArrowRight, Copy, LifeBuoy, MessageSquarePlus, Search, ShieldCheck, XCircle } from 'lucide-react';
import type { ActiveSupportPin, SupportTicketRow } from '@/actions/support.actions';
import { createSupportTicketAction, generateSupportPinAction, revokeSupportPinAction } from '@/actions/support.actions';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { formatDate, formatRelativeDate, getSupportCategoryLabel, getSupportPriorityLabel, getSupportStatusLabel } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

type Props = {
  tickets: SupportTicketRow[];
  activePin: ActiveSupportPin | null;
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

export default function SupportPageClient({ tickets, activePin }: Props) {
  const { locale, messages } = useI18n();
  const copy = messages.pages.support;
  const categoryOptions = [
    { value: 'GENERAL', label: getSupportCategoryLabel('GENERAL', locale) },
    { value: 'BILLING', label: getSupportCategoryLabel('BILLING', locale) },
    { value: 'BUG_REPORT', label: getSupportCategoryLabel('BUG_REPORT', locale) },
    { value: 'FEATURE_REQUEST', label: getSupportCategoryLabel('FEATURE_REQUEST', locale) },
    { value: 'ACCOUNT_ISSUE', label: getSupportCategoryLabel('ACCOUNT_ISSUE', locale) },
  ];
  const priorityOptions = [
    { value: 'LOW', label: getSupportPriorityLabel('LOW', locale) },
    { value: 'NORMAL', label: getSupportPriorityLabel('NORMAL', locale) },
    { value: 'HIGH', label: getSupportPriorityLabel('HIGH', locale) },
    { value: 'URGENT', label: getSupportPriorityLabel('URGENT', locale) },
  ];
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [activePinState, setActivePinState] = useState(activePin);
  const [generatedPin, setGeneratedPin] = useState<{ pin: string; expiresAt: string; sessionId: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesQuery = !normalizedQuery
        || ticket.subject.toLowerCase().includes(normalizedQuery)
        || ticket.description.toLowerCase().includes(normalizedQuery)
        || getSupportCategoryLabel(ticket.category, locale).toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS'))
        || (statusFilter === 'closed' && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'));
      return matchesQuery && matchesStatus;
    });
  }, [locale, query, statusFilter, tickets]);

  const openPinModal = () => {
    setGeneratedPin(null);
    setFeedback(null);
    setIsPinOpen(true);
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createSupportTicketAction(formData);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success && result.data?.id) {
        window.location.href = `/support/${result.data.id}`;
      }
    });
  };

  const handleGeneratePin = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await generateSupportPinAction();
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success && result.data) {
        setGeneratedPin(result.data);
        setActivePinState({
          id: result.data.sessionId,
          ticketId: null,
          pinExpiresAt: result.data.expiresAt,
          createdAt: new Date().toISOString(),
          failedAttempts: 0,
        });
      }
    });
  };

  const handleRevokePin = (sessionId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await revokeSupportPinAction(sessionId);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) setActivePinState(null);
    });
  };

  const copyPin = async () => {
    if (!generatedPin) return;
    await navigator.clipboard.writeText(generatedPin.pin);
    setFeedback({ type: 'success', text: copy.copied });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={openPinModal}>
            <ShieldCheck className="h-4 w-4" />
            {copy.supportPin}
          </Button>
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <MessageSquarePlus className="h-4 w-4" />
            {copy.newTicket}
          </Button>
        </div>
      </div>

      {feedback && (
        <div className={`rounded-xl border p-3 text-sm font-medium ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'}`}>
          {feedback.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <LifeBuoy className="mb-3 h-5 w-5 text-indigo-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.totalTickets}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{tickets.length}</p>
        </Card>
        <Card className="p-5">
          <MessageSquarePlus className="mb-3 h-5 w-5 text-emerald-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.open}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{tickets.filter((ticket) => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS').length}</p>
        </Card>
        <Card className="p-5">
          <ShieldCheck className="mb-3 h-5 w-5 text-amber-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.activePin}</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{activePinState ? `${copy.until} ${formatDate(activePinState.pinExpiresAt, 'h:mm a', locale)}` : copy.none}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative lg:max-w-md lg:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchTickets}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950/40">
            {[
              { value: 'all', label: copy.all },
              { value: 'active', label: copy.active },
              { value: 'closed', label: copy.resolved },
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
        {filteredTickets.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <LifeBuoy className="mx-auto mb-4 h-10 w-10 text-slate-300 dark:text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tickets.length === 0 ? copy.noTickets : copy.noMatch}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tickets.length === 0 ? copy.noTicketsHelp : copy.noMatchHelp}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.ticket}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.category}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.status}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.updated}</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase text-slate-400">{copy.messages}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5">
                    <td className="px-5 py-4">
                      <Link href={`/support/${ticket.id}`} className="font-bold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300">{ticket.subject}</Link>
                      <p className="mt-1 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">{ticket.description}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={priorityBadge(ticket.priority)}>{getSupportPriorityLabel(ticket.priority, locale)}</Badge>
                      <p className="mt-1 text-xs text-slate-500">{getSupportCategoryLabel(ticket.category, locale)}</p>
                    </td>
                    <td className="px-5 py-4"><Badge variant={statusBadge(ticket.status)}>{getSupportStatusLabel(ticket.status, locale)}</Badge></td>
                    <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{formatRelativeDate(ticket.updatedAt, locale)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/support/${ticket.id}`} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10">
                        {ticket.messageCount}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={copy.createTicket} size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label={copy.subject} name="subject" required placeholder={copy.subjectPlaceholder} />
          <div className="grid gap-4 md:grid-cols-2">
            <Select label={copy.category} name="category" defaultValue="GENERAL" options={categoryOptions} />
            <Select label={copy.priority} name="priority" defaultValue="NORMAL" options={priorityOptions} />
          </div>
          <Input label={copy.phoneNumber} name="phoneNumber" placeholder={copy.optional} />
          <div className="space-y-1.5">
            <label htmlFor="support-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.description}</label>
            <textarea id="support-description" name="description" required rows={6} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-white" />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>{copy.cancel}</Button>
            <Button type="submit" isLoading={isPending}>{copy.create}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPinOpen} onClose={() => setIsPinOpen(false)} title={copy.supportPin} size="md">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
            {copy.pinHelp}
          </div>

          {generatedPin ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{copy.sharePin}</p>
              <p className="mt-2 font-mono text-4xl font-black text-emerald-950 dark:text-white">{generatedPin.pin}</p>
              <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{copy.expires} {formatDate(generatedPin.expiresAt, 'MMM dd, h:mm a', locale)}</p>
              <Button type="button" className="mt-4" onClick={copyPin}>
                <Copy className="h-4 w-4" />
                {copy.copyPin}
              </Button>
            </div>
          ) : activePinState ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="font-bold text-amber-900 dark:text-amber-100">{copy.pinActive}</p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{copy.expires} {formatDate(activePinState.pinExpiresAt, 'MMM dd, h:mm a', locale)}. {copy.pinActiveHelp}</p>
              <Button type="button" variant="danger" size="sm" className="mt-3" onClick={() => handleRevokePin(activePinState.id)} isLoading={isPending}>
                <XCircle className="h-4 w-4" />
                {copy.revokePin}
              </Button>
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsPinOpen(false)}>{copy.close}</Button>
            <Button type="button" onClick={handleGeneratePin} isLoading={isPending}>
              <ShieldCheck className="h-4 w-4" />
              {copy.generateNewPin}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
