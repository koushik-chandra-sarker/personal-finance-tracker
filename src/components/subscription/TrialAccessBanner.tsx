'use client';

import Link from 'next/link';
import { ArrowRight, CalendarClock, Gem } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

type TrialAccessBannerProps = {
  currentPeriodEnd: string;
  daysRemaining: number;
};

export default function TrialAccessBanner({ currentPeriodEnd, daysRemaining }: TrialAccessBannerProps) {
  const { locale, messages } = useI18n();
  const copy = messages.subscription;
  const dateLabel = formatDate(currentPeriodEnd, undefined, locale);

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-slate-950 shadow-sm dark:border-amber-300/40 dark:bg-slate-950 dark:text-white lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm ring-1 ring-amber-200 dark:bg-amber-300 dark:text-slate-950 dark:ring-amber-200/70">
            <Gem className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-300 bg-white/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:border-amber-300/40 dark:bg-transparent dark:text-amber-200">
                {copy.trialBadge}
              </span>
              <p className="text-sm font-bold text-slate-950 dark:text-slate-50">
                {copy.trialBannerTitle.replace('{days}', String(daysRemaining))}
              </p>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
              <CalendarClock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-200" />
              <span>{copy.trialBannerHelp.replace('{date}', dateLabel)}</span>
            </p>
          </div>
        </div>
        <Link
          href="/subscription?reason=trialing"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200 dark:focus:ring-amber-200/80"
        >
          {copy.upgradeNow}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
