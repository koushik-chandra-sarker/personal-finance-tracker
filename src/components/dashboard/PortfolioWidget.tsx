'use client';

import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { DEFAULT_LOCALE, type AppLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/messages';
import { Clock, TrendingUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type Maturity = {
  id: string;
  name: string;
  maturityDate: string;
  typeConfig: { name: string; color: string };
};

type PortfolioWidgetProps = {
  summary: {
    totalInvested: number;
    totalCurrentValue: number;
    unrealisedGainLoss: number;
  };
  upcomingMaturities: Maturity[];
  currency: string;
  locale?: AppLocale;
};

export default function PortfolioWidget({ summary, upcomingMaturities, currency, locale = DEFAULT_LOCALE }: PortfolioWidgetProps) {
  const copy = getMessages(locale).dashboard;
  const gainPct = summary.totalInvested > 0 
    ? ((summary.unrealisedGainLoss / summary.totalInvested) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          {copy.investmentPortfolio}
        </h3>
        <Link
          href="/investments/portfolio"
          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          {copy.viewAll} <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="p-5 space-y-5">
        {/* Quick Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/50">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{copy.value}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-200 mt-0.5">{formatCurrency(summary.totalCurrentValue, currency, locale)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/50">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{copy.gainLoss}</p>
            <p className={cn(
              "text-sm font-bold mt-0.5",
              summary.unrealisedGainLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
            )}>
              {summary.unrealisedGainLoss >= 0 ? '+' : ''}{gainPct}%
            </p>
          </div>
        </div>

        {/* Upcoming Maturities */}
        <div className="space-y-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold px-1">{copy.upcomingMaturities}</p>
          {upcomingMaturities.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700/50 text-center">
              <p className="text-[10px] text-slate-500 italic">{copy.noUpcomingMaturities}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingMaturities.slice(0, 2).map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: m.typeConfig.color }} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">{m.name}</p>
                      <p className="text-[9px] text-slate-400">{m.typeConfig.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatDate(m.maturityDate, undefined, locale)}</p>
                    <p className="text-[9px] text-indigo-500 font-medium">{copy.maturing}</p>
                  </div>
                </div>
              ))}
              {upcomingMaturities.length > 2 && (
                <p className="text-[9px] text-slate-400 text-center italic mt-1">
                  + {upcomingMaturities.length - 2} {copy.moreUpcoming}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-3 bg-indigo-50 dark:bg-indigo-500/5 border-t border-indigo-100 dark:border-indigo-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{copy.monthlyInstallments}</span>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{copy.viewReminders}</span>
        </div>
      </div>
    </div>
  );
}
