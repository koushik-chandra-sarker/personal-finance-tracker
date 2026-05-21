'use client';

import { useMemo, useState, useTransition } from 'react';
import { Bell, Edit3, Megaphone, MessageSquarePlus, PauseCircle, PlayCircle, Search, Send, Trash2, Users } from 'lucide-react';
import type { AdminMessageRow, AdminMessageUserOption } from '@/actions/admin-message.actions';
import {
  createAdminMessageAction,
  deleteAdminMessageAction,
  getAdminMessagesAction,
  pushAdminMessageNowAction,
  updateAdminMessageAction,
  updateAdminMessageStatusAction,
} from '@/actions/admin-message.actions';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

type Props = {
  initialMessages: AdminMessageRow[];
  users: AdminMessageUserOption[];
};

function badgeForSeverity(severity: AdminMessageRow['severity']) {
  if (severity === 'SUCCESS') return 'success';
  if (severity === 'WARNING') return 'warning';
  if (severity === 'CRITICAL') return 'danger';
  return 'info';
}

function formatFrequency(frequency: AdminMessageRow['frequency'], copy: ReturnType<typeof useI18n>['messages']['pages']['adminMessages']) {
  if (frequency === 'EVERY_REFRESH') return copy.everyRefresh;
  if (frequency === 'UNTIL_DISMISSED') return copy.untilDismissed;
  return copy.oneTime;
}

function toDatetimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export default function AdminMessagesClient({ initialMessages, users }: Props) {
  const { locale, messages: i18nMessages } = useI18n();
  const copy = i18nMessages.pages.adminMessages;
  const severityOptions = [
    { value: 'INFO', label: locale === 'bn-BD' ? 'তথ্য' : 'Info' },
    { value: 'SUCCESS', label: locale === 'bn-BD' ? 'সফল' : 'Success' },
    { value: 'WARNING', label: locale === 'bn-BD' ? 'সতর্কতা' : 'Warning' },
    { value: 'CRITICAL', label: locale === 'bn-BD' ? 'গুরুতর' : 'Critical' },
  ];
  const displayModeOptions = [
    { value: 'MODAL', label: copy.popupModal },
    { value: 'BANNER', label: copy.topBanner },
    { value: 'PUSH_ONLY', label: copy.pushOnly },
  ];
  const frequencyOptions = [
    { value: 'ONCE', label: copy.oneTime },
    { value: 'EVERY_REFRESH', label: copy.everyRefresh },
    { value: 'UNTIL_DISMISSED', label: copy.untilDismissed },
  ];
  const [messages, setMessages] = useState(initialMessages);
  const [isOpen, setIsOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<AdminMessageRow | null>(null);
  const [audience, setAudience] = useState<'ALL' | 'SELECTED'>('ALL');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeCount = useMemo(() => messages.filter((message) => message.isActive).length, [messages]);
  const selectedUserSet = useMemo(() => new Set(selectedUsers), [selectedUsers]);
  const filteredUsers = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => (
      user.name.toLowerCase().includes(query)
      || user.email.toLowerCase().includes(query)
      || user.role.toLowerCase().includes(query)
    ));
  }, [recipientSearch, users]);

  const openCreateModal = () => {
    setFeedback(null);
    setEditingMessage(null);
    setAudience('ALL');
    setSelectedUsers([]);
    setRecipientSearch('');
    setIsOpen(true);
  };

  const openEditModal = (message: AdminMessageRow) => {
    setFeedback(null);
    setEditingMessage(message);
    setAudience(message.audience);
    setSelectedUsers(message.recipients.map((recipient) => recipient.userId));
    setRecipientSearch('');
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditingMessage(null);
    setRecipientSearch('');
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ));
  };

  const selectVisibleUsers = () => {
    setSelectedUsers((current) => Array.from(new Set([...current, ...filteredUsers.map((user) => user.id)])));
  };

  const refreshMessages = async () => {
    const nextMessages = await getAdminMessagesAction();
    setMessages(nextMessages);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);
    selectedUsers.forEach((userId) => formData.append('recipientIds', userId));

    startTransition(async () => {
      const result = editingMessage
        ? await updateAdminMessageAction(editingMessage.id, formData)
        : await createAdminMessageAction(formData);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        closeModal();
        await refreshMessages();
      }
    });
  };

  const handleStatus = (id: string, isActive: boolean) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateAdminMessageStatusAction(id, isActive);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        setMessages((current) => current.map((message) => message.id === id ? { ...message, isActive } : message));
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(copy.deleteConfirm)) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteAdminMessageAction(id);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        setMessages((current) => current.filter((message) => message.id !== id));
      }
    });
  };

  const handlePushNow = (id: string) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await pushAdminMessageNowAction(id);
      setFeedback({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) await refreshMessages();
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {copy.subtitle}
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <MessageSquarePlus className="h-4 w-4" />
          {copy.newMessage}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <Megaphone className="mb-3 h-5 w-5 text-indigo-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.totalMessages}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{messages.length}</p>
        </Card>
        <Card className="p-5">
          <PlayCircle className="mb-3 h-5 w-5 text-emerald-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.active}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{activeCount}</p>
        </Card>
        <Card className="p-5">
          <Users className="mb-3 h-5 w-5 text-amber-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.availableRecipients}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-200">{users.length}</p>
        </Card>
      </div>

      {feedback && (
        <div className={`rounded-xl border p-3 text-sm font-medium ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'}`}>
          {feedback.text}
        </div>
      )}

      <Card className="overflow-hidden p-0">
        {messages.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Bell className="mx-auto mb-4 h-10 w-10 text-slate-300 dark:text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200">{copy.noMessages}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{copy.noMessagesHelp}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.message}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.display}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.audience}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.schedule}</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase text-slate-400">{copy.seen}</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase text-slate-400">{copy.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {messages.map((message) => (
                  <tr key={message.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5">
                    <td className="px-5 py-4">
                      <div className="max-w-md">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant={badgeForSeverity(message.severity)}>{message.severity}</Badge>
                          <Badge variant={message.isActive ? 'success' : 'default'}>{message.isActive ? copy.active : copy.paused}</Badge>
                          {message.browserPushEnabled && <Badge variant="info">{message.browserPushDaily ? copy.dailyPush : copy.browserPush}</Badge>}
                        </div>
                        <p className="font-bold text-slate-900 dark:text-slate-200">{message.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{message.message}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                      <p className="font-semibold">
                        {message.displayMode === 'MODAL' ? copy.popupModal : message.displayMode === 'BANNER' ? copy.topBanner : copy.pushOnly}
                      </p>
                      <p className="text-xs text-slate-400">{formatFrequency(message.frequency, copy)}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                      <p className="font-semibold">{message.audience === 'ALL' ? copy.allUsers : `${message.recipients.length} ${copy.selected}`}</p>
                      <p className="text-xs text-slate-400">{message.showToUnsubscribed ? copy.includesUnsubscribed : copy.subscribedOnly}</p>
                      <p className="text-xs text-slate-400">{message.createdBy}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                      <p>{message.startsAt ? formatDate(message.startsAt, 'MMM dd, yyyy', locale) : copy.startsImmediately}</p>
                      <p>{message.endsAt ? `${copy.ends} ${formatDate(message.endsAt, 'MMM dd, yyyy', locale)}` : copy.noEndDate}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{message.seenCount}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePushNow(message.id)}
                          disabled={isPending}
                          className="h-9 w-9 p-0 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                          title={copy.pushNow}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(message)}
                          disabled={isPending}
                          className="h-9 w-9 p-0"
                          title={copy.editMessage}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatus(message.id, !message.isActive)}
                          disabled={isPending}
                          className="h-9 w-9 p-0"
                        >
                          {message.isActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(message.id)}
                          disabled={isPending}
                          className="h-9 w-9 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={isOpen} onClose={closeModal} title={editingMessage ? copy.editMessage : copy.createMessage} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label={copy.titleLabel} name="title" required placeholder={copy.titlePlaceholder} defaultValue={editingMessage?.title || ''} />
          <div className="space-y-1.5">
            <label htmlFor="admin-message-body" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.message}</label>
            <textarea
              id="admin-message-body"
              name="message"
              required
              rows={5}
              placeholder={copy.bodyPlaceholder}
              defaultValue={editingMessage?.message || ''}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-slate-200"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Select label={copy.severity} name="severity" defaultValue={editingMessage?.severity || 'INFO'} options={severityOptions} />
            <Select label={copy.display} name="displayMode" defaultValue={editingMessage?.displayMode || 'MODAL'} options={displayModeOptions} />
            <Select label={copy.frequency} name="frequency" defaultValue={editingMessage?.frequency || 'ONCE'} options={frequencyOptions} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label={copy.actionLabel} name="actionLabel" placeholder={copy.actionLabelPlaceholder} defaultValue={editingMessage?.actionLabel || ''} />
            <Input label={copy.actionUrl} name="actionUrl" placeholder="/subscription" defaultValue={editingMessage?.actionUrl || ''} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label={copy.startDate} name="startsAt" type="datetime-local" defaultValue={toDatetimeLocal(editingMessage?.startsAt || null)} />
            <Input label={copy.endDate} name="endsAt" type="datetime-local" defaultValue={toDatetimeLocal(editingMessage?.endsAt || null)} />
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-200">{copy.audience}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <input type="radio" name="audience" value="ALL" checked={audience === 'ALL'} onChange={() => setAudience('ALL')} className="mt-1" />
                <span>
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{copy.allUsers}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{copy.allUsersHelp}</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <input type="radio" name="audience" value="SELECTED" checked={audience === 'SELECTED'} onChange={() => setAudience('SELECTED')} className="mt-1" />
                <span>
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{copy.selectedUsers}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{copy.selectedUsersHelp}</span>
                </span>
              </label>
            </div>
            {audience === 'SELECTED' && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative sm:max-w-sm sm:flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={recipientSearch}
                      onChange={(event) => setRecipientSearch(event.target.value)}
                      placeholder={copy.searchRecipients}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:justify-end">
                    <span>{selectedUsers.length} {copy.selected}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={selectVisibleUsers} disabled={filteredUsers.length === 0}>
                      {copy.selectVisible}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedUsers([])} disabled={selectedUsers.length === 0}>
                      {copy.clear}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      {copy.noUsersMatch}
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <label key={user.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-white dark:hover:bg-slate-900">
                        <input
                          type="checkbox"
                          checked={selectedUserSet.has(user.id)}
                          onChange={() => toggleUser(user.id)}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</span>
                          <span className="block truncate text-xs text-slate-500">{user.email} · {user.role}</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <input type="checkbox" name="isActive" defaultChecked={editingMessage?.isActive ?? true} />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.publishImmediately}</span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <input type="checkbox" name="showToUnsubscribed" defaultChecked={editingMessage?.showToUnsubscribed ?? false} className="mt-1" />
            <span>
              <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">{copy.showUnsubscribed}</span>
              <span className="block text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.showUnsubscribedHelp}</span>
            </span>
          </label>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
            <label className="flex items-start gap-3">
              <input type="checkbox" name="browserPushEnabled" defaultChecked={editingMessage?.browserPushEnabled ?? false} className="mt-1" />
              <span>
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{copy.browserPush}</span>
                <span className="block text-xs leading-5 text-slate-600 dark:text-slate-300">{copy.browserPushHelp}</span>
              </span>
            </label>
            <label className="mt-3 flex items-start gap-3 border-t border-indigo-100 pt-3 dark:border-indigo-500/20">
              <input type="checkbox" name="browserPushDaily" defaultChecked={editingMessage?.browserPushDaily ?? false} className="mt-1" />
              <span>
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{copy.dailyPush}</span>
                <span className="block text-xs leading-5 text-slate-600 dark:text-slate-300">{copy.dailyPushHelp}</span>
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isPending}>{copy.close}</Button>
            <Button type="submit" isLoading={isPending}>{editingMessage ? copy.updateMessage : copy.createMessage}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
