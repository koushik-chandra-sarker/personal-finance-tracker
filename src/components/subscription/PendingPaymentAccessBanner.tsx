'use client';

import Link from 'next/link';
import { Clock3, ShieldCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

type PendingPaymentAccessBannerProps = {
  accessUntil: string;
  packageName: string | null;
  hours: number;
};

export default function PendingPaymentAccessBanner({ accessUntil, packageName, hours }: PendingPaymentAccessBannerProps) {
  const { locale, messages } = useI18n();
  const copy = messages.payment;
  const dateLabel = formatDate(accessUntil, undefined, locale);
  const title = copy.pendingAccessTitle
    .replace('{hours}', String(hours))
    .replace('{package}', packageName || copy.pendingPackageFallback);
  const help = copy.pendingAccessHelp.replace('{date}', dateLabel);

  return (
    <div className="border-b border-sky-200 bg-sky-50 px-4 py-3 text-slate-950 shadow-sm dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-slate-100 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-200 bg-white/80 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-sky-800 dark:border-sky-400/30 dark:bg-transparent dark:text-sky-200">
                {copy.pendingAccessBadge}
              </span>
              <p className="text-sm font-bold text-slate-950 dark:text-slate-100">{title}</p>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
              <Clock3 className="h-3.5 w-3.5 text-sky-700 dark:text-sky-200" />
              <span>{help}</span>
            </p>
          </div>
        </div>
        <Link
          href="/subscription/payment"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:bg-sky-300 dark:text-slate-950 dark:hover:bg-sky-200"
        >
          {copy.viewPaymentStatus}
        </Link>
      </div>
    </div>
  );
}
