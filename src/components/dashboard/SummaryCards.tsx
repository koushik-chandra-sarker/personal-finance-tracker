'use client';

import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, DollarSign, PiggyBank, CalendarClock, Target } from 'lucide-react';
import { formatCurrency, getMonthName } from '@/lib/utils';
import { DEFAULT_LOCALE, type AppLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/messages';
import type { MonthlySummary, UpcomingBillsSummary } from '@/types';
import type { BudgetUsageSummary } from '@/services/budget.service';

interface SummaryCardsProps {
  summary: MonthlySummary;
  totalBalance: number;
  upcomingBills?: UpcomingBillsSummary;
  budgetUsage?: BudgetUsageSummary;
  periodLabel?: string;
  month?: number;
  year?: number;
  currency?: string;
  locale?: AppLocale;
}

export default function SummaryCards({ summary, totalBalance, upcomingBills, budgetUsage, periodLabel, month, year, currency = 'USD', locale = DEFAULT_LOCALE }: SummaryCardsProps) {
  const copy = getMessages(locale).dashboard;
  const now = new Date();
  const resolvedMonth = typeof month === 'number' && Number.isInteger(month) && month >= 1 && month <= 12
    ? month
    : now.getMonth() + 1;
  const resolvedYear = typeof year === 'number' && Number.isInteger(year) ? year : now.getFullYear();
  const selectedPeriod = periodLabel?.trim() && !periodLabel.includes('undefined')
    ? periodLabel.trim()
    : `${getMonthName(resolvedMonth, locale)} ${resolvedYear}`;
  const safeUpcomingBills: UpcomingBillsSummary = upcomingBills ?? {
    count: 0,
    totalAmount: 0,
    nextDueDate: null,
  };
  const safeBudgetUsage: BudgetUsageSummary = budgetUsage ?? {
    spent: 0,
    total: 0,
    percentage: 0,
    budgetCount: 0,
    month: null,
    year: null,
    isFallback: false,
  };
  const budgetPeriodLabel = safeBudgetUsage.month && safeBudgetUsage.year
    ? `${getMonthName(safeBudgetUsage.month, locale)} ${safeBudgetUsage.year}`
    : selectedPeriod;
  const savingsRate = summary.totalIncome > 0 ? Math.round((summary.balance / summary.totalIncome) * 100) : 0;
  const nextDueLabel = safeUpcomingBills.nextDueDate
    ? new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(safeUpcomingBills.nextDueDate)
    : null;

  const cards = [
    {
      title: copy.totalBalance,
      value: formatCurrency(totalBalance, currency, locale),
      icon: Wallet,
      gradient: 'from-indigo-500 to-purple-600',
      glow: 'glow-indigo',
      helperText: copy.totalBalanceHelp,
      period: copy.live,
    },
    {
      title: copy.netSavings,
      period: selectedPeriod,
      value: formatCurrency(summary.balance, currency, locale),
      icon: DollarSign,
      gradient: summary.balance >= 0 ? 'from-sky-500 to-cyan-600' : 'from-orange-500 to-rose-600',
      glow: '',
      helperText: summary.balance >= 0 ? copy.netSavingsPositive : copy.netSavingsNegative,
    },
    {
      title: copy.income,
      period: selectedPeriod,
      value: formatCurrency(summary.totalIncome, currency, locale),
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'glow-emerald',
      helperText: copy.incomeHelp,
    },
    {
      title: copy.expenses,
      period: selectedPeriod,
      value: formatCurrency(summary.totalExpense, currency, locale),
      icon: TrendingDown,
      gradient: 'from-rose-500 to-pink-600',
      glow: 'glow-rose',
      helperText: copy.expensesHelp,
    },
    {
      title: copy.savingsRate,
      period: selectedPeriod,
      value: `${savingsRate}%`,
      icon: PiggyBank,
      gradient: savingsRate >= 20 ? 'from-emerald-500 to-teal-600' : savingsRate >= 0 ? 'from-sky-500 to-indigo-600' : 'from-rose-500 to-pink-600',
      glow: '',
      helperText: savingsRate >= 20 ? copy.savingsStrong : savingsRate < 0 ? copy.savingsNegative : copy.savingsImprove,
    },
    {
      title: copy.budgetUsed,
      period: safeBudgetUsage.isFallback ? `${budgetPeriodLabel} (${copy.latest})` : selectedPeriod,
      value: `${safeBudgetUsage.percentage}%`,
      icon: Target,
      gradient: safeBudgetUsage.percentage > 100 ? 'from-rose-500 to-pink-600' : safeBudgetUsage.percentage >= 80 ? 'from-amber-500 to-orange-600' : 'from-emerald-500 to-teal-600',
      glow: '',
      helperText:
        safeBudgetUsage.budgetCount > 0
          ? `${formatCurrency(safeBudgetUsage.spent, currency, locale)} / ${formatCurrency(safeBudgetUsage.total, currency, locale)} ${copy.used}`
          : copy.noBudget,
    },
    {
      title: copy.transactions,
      period: selectedPeriod,
      value: summary.transactionCount.toString(),
      icon: ArrowLeftRight,
      gradient: 'from-amber-500 to-orange-600',
      glow: '',
      helperText: copy.transactionsHelp,
    },
    {
      title: copy.upcomingBills,
      period: copy.next14Days,
      value: `${safeUpcomingBills.count} ${copy.due}`,
      icon: CalendarClock,
      gradient: safeUpcomingBills.count > 0 ? 'from-violet-500 to-fuchsia-600' : 'from-slate-500 to-slate-600',
      glow: '',
      helperText:
        safeUpcomingBills.count > 0
          ? `${formatCurrency(safeUpcomingBills.totalAmount, currency, locale)}${nextDueLabel ? ` • ${copy.nextOn} ${nextDueLabel}` : ''}`
          : copy.noBills,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card, i) => (
        <div
          key={card.title}
          className={`relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/70 backdrop-blur-xl p-4 sm:p-5 animate-slide-up stagger-${i + 1} ${card.glow} min-h-[148px] shadow-sm`}
          aria-label={`${card.title}: ${card.value}`}
        >
          <div className="flex h-full flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug text-slate-600 dark:text-slate-300">{card.title}</p>
                {'period' in card && card.period && (
                  <p className="mt-1 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700/80 dark:text-slate-300">
                    {card.period}
                  </p>
                )}
              </div>
              <div className={`h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="whitespace-nowrap text-[clamp(1rem,1.05vw,1.25rem)] font-bold tabular-nums text-slate-900 dark:text-white">
                {card.value}
              </p>
              {card.helperText && (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{card.helperText}</p>
              )}
            </div>
          </div>
          {/* Decorative gradient */}
          <div className={`absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 blur-2xl`} />
        </div>
      ))}
    </div>
  );
}
