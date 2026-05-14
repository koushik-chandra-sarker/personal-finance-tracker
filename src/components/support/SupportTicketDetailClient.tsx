'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Radio, Send, ShieldCheck, UserCircle } from 'lucide-react';
import type { SupportTicketDetail, SupportTicketMessageRow } from '@/actions/support.actions';
import {
  generateSupportPinAction,
  getAdminSupportTicketAction,
  getUserSupportTicketAction,
  replyToSupportTicketAction,
  resetUserAppPinFromSupportAction,
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

type QueuedSupportMessage = SupportTicketMessageRow & {
  deliveryStatus?: 'queued' | 'sending' | 'failed';
};

type TicketState = Omit<SupportTicketDetail, 'messages'> & {
  messages: QueuedSupportMessage[];
};

type QueuedReply = {
  clientId: string;
  message: string;
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
  const [currentTicket, setCurrentTicket] = useState<TicketState>(ticket);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [generatedPin, setGeneratedPin] = useState<{ pin: string; expiresAt: string } | null>(null);
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [queuedReplyCount, setQueuedReplyCount] = useState(0);
  const [isQueueSending, setIsQueueSending] = useState(false);
  const [isStatusPending, startStatusTransition] = useTransition();
  const [isPinPending, startPinTransition] = useTransition();
  const [isResetPinPending, startResetPinTransition] = useTransition();
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const replyQueueRef = useRef<QueuedReply[]>([]);
  const isProcessingQueueRef = useRef(false);

  const dedupeMessages = useCallback((messages: QueuedSupportMessage[]) => {
    const seen = new Set<string>();
    return messages.filter((message) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    });
  }, []);

  const processReplyQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;

    isProcessingQueueRef.current = true;
    setIsQueueSending(true);

    while (replyQueueRef.current.length > 0) {
      const nextReply = replyQueueRef.current[0];

      setCurrentTicket((current) => ({
        ...current,
        messages: current.messages.map((message) => (
          message.id === nextReply.clientId ? { ...message, deliveryStatus: 'sending' } : message
        )),
      }));

      const formData = new FormData();
      formData.set('message', nextReply.message);
      const result = await replyToSupportTicketAction(ticket.id, formData);

      if (result.success && result.data) {
        const replyData = result.data;
        setCurrentTicket((current) => {
          const hasOptimisticMessage = current.messages.some((message) => message.id === nextReply.clientId);
          const nextMessages = hasOptimisticMessage
            ? current.messages.map((message) => (message.id === nextReply.clientId ? replyData.message : message))
            : [...current.messages, replyData.message];
          const dedupedMessages = dedupeMessages(nextMessages);

          return {
            ...current,
            status: replyData.status,
            updatedAt: replyData.message.createdAt,
            messageCount: dedupedMessages.length,
            messages: dedupedMessages,
          };
        });
      } else {
        setFeedback({ type: 'error', text: result.message });
        setCurrentTicket((current) => ({
          ...current,
          messages: current.messages.map((message) => (
            message.id === nextReply.clientId ? { ...message, deliveryStatus: 'failed' } : message
          )),
        }));
      }

      replyQueueRef.current.shift();
      setQueuedReplyCount(replyQueueRef.current.length);
    }

    isProcessingQueueRef.current = false;
    setIsQueueSending(false);
  }, [dedupeMessages, ticket.id]);

  useEffect(() => {
    let cancelled = false;

    const refreshTicket = async () => {
      try {
        const latestTicket = isAdmin
          ? await getAdminSupportTicketAction(ticket.id)
          : await getUserSupportTicketAction(ticket.id);

        if (!cancelled) {
          setCurrentTicket((current) => {
            const pendingMessages = current.messages.filter((message) => message.deliveryStatus);
            const nextMessages = dedupeMessages([...latestTicket.messages, ...pendingMessages]);
            return {
              ...latestTicket,
              messageCount: nextMessages.length,
              messages: nextMessages,
            };
          });
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
  }, [dedupeMessages, isAdmin, ticket.id]);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;
    messageList.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' });
  }, [currentTicket.messages.length]);

  const handleReply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const message = String(formData.get('message') || '').trim();
    if (!message) return;

    const clientId = `queued-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const createdAt = new Date().toISOString();
    const optimisticMessage: QueuedSupportMessage = {
      id: clientId,
      message,
      isFromAdmin: isAdmin,
      createdAt,
      deliveryStatus: 'queued',
      sender: isAdmin
        ? { id: 'support-admin', name: 'Support admin', email: '', role: 'ADMIN' }
        : { id: currentTicket.user.id, name: currentTicket.user.name, email: currentTicket.user.email, role: 'USER' },
    };

    replyQueueRef.current.push({ clientId, message });
    setQueuedReplyCount(replyQueueRef.current.length);
    setCurrentTicket((current) => ({
      ...current,
      updatedAt: createdAt,
      messageCount: current.messageCount + 1,
      messages: [...current.messages, optimisticMessage],
    }));
    form.reset();
    void processReplyQueue();
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

  const handleResetAppPin = () => {
    if (!confirm(`Reset the app PIN for ${currentTicket.user.name}?`)) return;
    setFeedback(null);
    startResetPinTransition(async () => {
      const result = await resetUserAppPinFromSupportAction(ticket.id);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        const latestTicket = await getAdminSupportTicketAction(ticket.id);
        setCurrentTicket({ ...latestTicket, messages: latestTicket.messages });
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

          <div ref={messageListRef} className="max-h-[min(64vh,680px)] space-y-4 overflow-y-auto bg-white px-4 py-5 dark:bg-slate-900/20 sm:px-5">
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
                      {message.deliveryStatus && (
                        <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-white/10 dark:text-slate-200">
                          {message.deliveryStatus}
                        </span>
                      )}
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
          </div>

          <form onSubmit={handleReply} className="sticky bottom-0 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="support-reply" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Reply</label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {queuedReplyCount > 0 || isQueueSending
                  ? `${queuedReplyCount} queued${isQueueSending ? ' · sending' : ''}`
                  : currentTicket.status === 'CLOSED'
                    ? 'Closed tickets cannot receive replies'
                    : 'Enter your message and send'}
              </span>
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
              <Button type="submit" disabled={currentTicket.status === 'CLOSED'}>
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
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">App PIN reset</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Use this after verifying the user in this support conversation.</p>
                <Button type="button" variant="outline" className="mt-3" onClick={handleResetAppPin} isLoading={isResetPinPending}>
                  <KeyRound className="h-4 w-4" />
                  Reset user PIN
                </Button>
              </div>
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
