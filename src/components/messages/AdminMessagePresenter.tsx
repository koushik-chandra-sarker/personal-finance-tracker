'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { UserAdminMessage } from '@/actions/admin-message.actions';
import { markAdminMessageSeenAction } from '@/actions/admin-message.actions';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

type Props = {
  initialMessages: UserAdminMessage[];
};

const severityStyles = {
  INFO: {
    icon: Info,
    panel: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100',
    iconBox: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
    button: 'bg-sky-600 hover:bg-sky-700',
  },
  SUCCESS: {
    icon: CheckCircle2,
    panel: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100',
    iconBox: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
    button: 'bg-emerald-600 hover:bg-emerald-700',
  },
  WARNING: {
    icon: AlertTriangle,
    panel: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100',
    iconBox: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    button: 'bg-amber-600 hover:bg-amber-700',
  },
  CRITICAL: {
    icon: AlertTriangle,
    panel: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100',
    iconBox: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
    button: 'bg-rose-600 hover:bg-rose-700',
  },
};

export default function AdminMessagePresenter({ initialMessages }: Props) {
  const { messages } = useI18n();
  const copy = messages.pages.adminMessages;
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [activeModalIndex, setActiveModalIndex] = useState(0);
  const markedSeenIds = useRef<Set<string>>(new Set());

  const visibleMessages = useMemo(
    () => initialMessages.filter((message) => !hiddenIds.includes(message.id)),
    [hiddenIds, initialMessages]
  );
  const bannerMessages = visibleMessages.filter((message) => message.displayMode === 'BANNER');
  const modalMessages = visibleMessages.filter((message) => message.displayMode === 'MODAL');
  const activeModal = modalMessages[activeModalIndex] || modalMessages[0] || null;

  useEffect(() => {
    bannerMessages.forEach((message) => {
      if (markedSeenIds.current.has(message.id)) return;
      markedSeenIds.current.add(message.id);
      void markAdminMessageSeenAction(message.id, false);
    });
  }, [bannerMessages]);

  useEffect(() => {
    if (!activeModal || markedSeenIds.current.has(activeModal.id)) return;
    markedSeenIds.current.add(activeModal.id);
    void markAdminMessageSeenAction(activeModal.id, false);
  }, [activeModal]);

  const hideMessage = (message: UserAdminMessage, dismissed: boolean) => {
    setHiddenIds((current) => [...current, message.id]);
    if (dismissed || message.frequency !== 'EVERY_REFRESH') {
      void markAdminMessageSeenAction(message.id, true);
    }
    if (message.displayMode === 'MODAL') setActiveModalIndex(0);
  };

  if (initialMessages.length === 0) return null;

  return (
    <>
      {bannerMessages.length > 0 && (
        <div className="fixed inset-x-3 top-20 z-40 space-y-2 lg:left-auto lg:right-6 lg:w-[28rem]">
          {bannerMessages.map((message) => {
            const style = severityStyles[message.severity];
            const Icon = style.icon;
            return (
              <div key={message.id} className={cn('rounded-2xl border p-4 shadow-2xl backdrop-blur', style.panel)}>
                <div className="flex gap-3">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', style.iconBox)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{message.title}</p>
                    <p className="mt-1 text-sm leading-6 opacity-85">{message.message}</p>
                    {message.actionUrl && (
                      <Link
                        href={message.actionUrl}
                        onClick={() => hideMessage(message, true)}
                        className={cn('mt-3 inline-flex rounded-lg px-3 py-2 text-xs font-bold text-white transition-colors', style.button)}
                      >
                        {message.actionLabel || copy.open}
                      </Link>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => hideMessage(message, message.frequency !== 'EVERY_REFRESH')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg opacity-70 transition-colors hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                    aria-label={copy.dismiss}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            {(() => {
              const style = severityStyles[activeModal.severity];
              const Icon = style.icon;
              return (
                <div className="p-6 text-center">
                  <div className={cn('mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl', style.iconBox)}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white">{activeModal.title}</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">{activeModal.message}</p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => hideMessage(activeModal, activeModal.frequency !== 'EVERY_REFRESH')}
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {activeModal.frequency === 'UNTIL_DISMISSED' ? copy.dismiss : copy.close}
                    </button>
                    {activeModal.actionUrl && (
                      <Link
                        href={activeModal.actionUrl}
                        onClick={() => hideMessage(activeModal, true)}
                        className={cn('inline-flex h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-bold text-white transition-colors', style.button)}
                      >
                        {activeModal.actionLabel || copy.open}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
