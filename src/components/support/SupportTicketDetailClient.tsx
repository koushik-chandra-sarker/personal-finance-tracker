'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Radio, Send, ShieldCheck, UserCircle } from 'lucide-react';
import type { SupportTicketDetail } from '@/actions/support.actions';
import {
  generateSupportPinAction,
  getAdminSupportTicketAction,
  getUserSupportTicketAction,
  replyToSupportTicketAction,
  updateSupportTicketStatusAction,
} from '@/actions/support.actions';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { formatDate, formatRelativeDate } from '@/lib/utils';

type Props = {
  ticket: SupportTicketDetail;
  isAdmin?: boolean;
};

const statusOptions = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

function labelize(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusBadge(status: SupportTicketDetail['status']) {
  if (status === 'OPEN') return 'success';
  if (status === 'IN_PROGRESS') return 'info';
  if (status === 'RESOLVED') return 'warning';
  return 'default';
}

export default function SupportTicketDetailClient({ ticket, isAdmin = false }: Props) {
  const [currentTicket, setCurrentTicket] = useState(ticket);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [generatedPin, setGeneratedPin] = useState<{ pin: string; expiresAt: string } | null>(null);
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isReplyPending, startReplyTransition] = useTransition();
  const [isStatusPending, startStatusTransition] = useTransition();
  const [isPinPending, startPinTransition] = useTransition();
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refreshTicket = async () => {
      try {
        const latestTicket = isAdmin
          ? await getAdminSupportTicketAction(ticket.id)
          : await getUserSupportTicketAction(ticket.id);

        if (!cancelled) {
          setCurrentTicket(latestTicket);
        }
      } catch {
        // Keep the current conversation visible if a transient refresh fails.
      }
    };

    const events = new EventSource(`/api/support/tickets/${ticket.id}/events`);

    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string };
        if (payload.type === 'connected') {
          setIsLiveConnected(true);
          return;
        }
        if (payload.type === 'heartbeat') return;
      } catch {
        return;
      }

      void refreshTicket();
    };

    events.onerror = () => {
      setIsLiveConnected(false);
      // EventSource retries automatically; keep the current thread visible meanwhile.
    };

    return () => {
      cancelled = true;
      events.close();
    };
  }, [isAdmin, ticket.id]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [currentTicket.messages.length]);

  const handleReply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    startReplyTransition(async () => {
      const result = await replyToSupportTicketAction(ticket.id, formData);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success && result.data) {
        setCurrentTicket((current) => ({
          ...current,
          status: result.data?.status || current.status,
          updatedAt: result.data?.message.createdAt || current.updatedAt,
          messageCount: current.messageCount + 1,
          messages: [...current.messages, result.data!.message],
        }));
        form.reset();
      }
    });
  };

  const handleStatus = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    startStatusTransition(async () => {
      const result = await updateSupportTicketStatusAction(ticket.id, formData);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        const nextStatus = String(formData.get('status')) as typeof currentTicket.status;
        setCurrentTicket((current) => ({ ...current, status: nextStatus }));
      }
    });
  };

  const handleGeneratePin = () => {
    setFeedback(null);
    startPinTransition(async () => {
      const result = await generateSupportPinAction(ticket.id);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success && result.data) {
        setGeneratedPin({ pin: result.data.pin, expiresAt: result.data.expiresAt });
        setIsPinOpen(true);
      }
    });
  };

  const copyPin = async () => {
    if (!generatedPin) return;
    await navigator.clipboard.writeText(generatedPin.pin);
    setFeedback({ type: 'success', text: 'Support PIN copied.' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={isAdmin ? '/admin/support' : '/support'} className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300">
            <ArrowLeft className="h-4 w-4" />
            {isAdmin ? 'Back to support queue' : 'Back to support'}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{currentTicket.subject}</h1>
            <Badge variant={statusBadge(currentTicket.status)}>{labelize(currentTicket.status)}</Badge>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${isLiveConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isLiveConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {isLiveConnected ? 'Live' : 'Connecting'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {labelize(currentTicket.category)} · {labelize(currentTicket.priority)} priority · Updated {formatRelativeDate(currentTicket.updatedAt)}
          </p>
        </div>
        {!isAdmin && (
          <Button type="button" variant="outline" onClick={handleGeneratePin} isLoading={isPinPending}>
            <ShieldCheck className="h-4 w-4" />
            Generate PIN
          </Button>
        )}
      </div>

      {feedback && (
        <div className={`rounded-xl border p-3 text-sm font-medium ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'}`}>
          {feedback.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Conversation</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{currentTicket.messages.length} messages in this ticket</p>
            </div>
            <Radio className={`h-5 w-5 ${isLiveConnected ? 'text-emerald-500' : 'text-slate-400'}`} />
          </div>

          <div className="max-h-[min(64vh,680px)] space-y-4 overflow-y-auto bg-white px-4 py-5 dark:bg-slate-900/20 sm:px-5">
            {currentTicket.messages.map((message) => {
              const fromAdmin = message.isFromAdmin;
              return (
                <div key={message.id} className={`flex gap-3 ${fromAdmin ? 'justify-start' : 'justify-end'}`}>
                  {fromAdmin && (
                    <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200 sm:flex">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                  )}
                  <div className={`max-w-[min(720px,100%)] rounded-2xl px-4 py-3 shadow-sm ${fromAdmin ? 'rounded-tl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100' : 'rounded-tr-md bg-indigo-600 text-white'}`}>
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs opacity-80">
                      <span className="font-semibold">{fromAdmin ? 'Support admin' : message.sender.name}</span>
                      <span>{formatDate(message.createdAt, 'MMM dd, h:mm a')}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6">{message.message}</p>
                  </div>
                  {!fromAdmin && (
                    <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:flex">
                      <UserCircle className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messageEndRef} />
          </div>

          <form onSubmit={handleReply} className="sticky bottom-0 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="support-reply" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Reply</label>
              {currentTicket.status !== 'CLOSED' && (
                <span className="text-xs text-slate-500 dark:text-slate-400">Enter your message and send</span>
              )}
            </div>
            <textarea
              id="support-reply"
              name="message"
              required
              rows={4}
              disabled={currentTicket.status === 'CLOSED'}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-white"
              placeholder={currentTicket.status === 'CLOSED' ? 'Closed tickets cannot receive replies.' : 'Type your reply'}
            />
            <div className="mt-3 flex justify-end">
              <Button type="submit" isLoading={isReplyPending} disabled={currentTicket.status === 'CLOSED'}>
                <Send className="h-4 w-4" />
                Send reply
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Ticket Info
            </h2>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <p><span className="font-semibold">User:</span> {currentTicket.user.name}</p>
              <p><span className="font-semibold">Email:</span> {currentTicket.user.email}</p>
              <p><span className="font-semibold">Phone:</span> {currentTicket.phoneNumber || '-'}</p>
              <p><span className="font-semibold">Created:</span> {formatDate(currentTicket.createdAt, 'MMM dd, yyyy h:mm a')}</p>
            </div>
          </Card>

          {isAdmin && (
            <Card>
              <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Admin Controls</h2>
              <form onSubmit={handleStatus} className="space-y-3">
                <Select key={currentTicket.status} label="Status" name="status" defaultValue={currentTicket.status} options={statusOptions} />
                <Button type="submit" isLoading={isStatusPending}>Update status</Button>
              </form>
            </Card>
          )}

          {isAdmin && (
            <Card>
              <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Support Audit</h2>
              {currentTicket.auditLogs.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No support access events yet.</p>
              ) : (
                <div className="space-y-3">
                  {currentTicket.auditLogs.map((audit) => (
                    <div key={audit.id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950/40">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{labelize(audit.action)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(audit.createdAt, 'MMM dd, h:mm a')}{audit.admin ? ` by ${audit.admin.name}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <Modal isOpen={isPinOpen} onClose={() => setIsPinOpen(false)} title="Support PIN" size="md">
        {generatedPin && (
          <div className="space-y-4 text-center">
            <KeyRound className="mx-auto h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Share this read-only support PIN</p>
              <p className="mt-2 font-mono text-4xl font-black text-slate-950 dark:text-white">{generatedPin.pin}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Expires {formatDate(generatedPin.expiresAt, 'MMM dd, h:mm a')}</p>
            </div>
            <Button type="button" onClick={copyPin}>Copy PIN</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
