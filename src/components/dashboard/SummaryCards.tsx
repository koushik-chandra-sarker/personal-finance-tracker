'use client';

import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, DollarSign } from 'lucide-react';
import { formatCurrency, getMonthName } from '@/lib/utils';
import type { MonthlySummary } from '@/types';

interface SummaryCardsProps {
  summary: MonthlySummary;
  totalBalance: number;
  periodLabel?: string;
  month?: number;
  year?: number;
  currency?: string;
}

export default function SummaryCards({ summary, totalBalance, periodLabel, month, year, currency = 'USD' }: SummaryCardsProps) {
  const now = new Date();
  const resolvedMonth = typeof month === 'number' && Number.isInteger(month) && month >= 1 && month <= 12
    ? month
    : now.getMonth() + 1;
  const resolvedYear = typeof year === 'number' && Number.isInteger(year) ? year : now.getFullYear();
  const selectedPeriod = periodLabel?.trim() && !periodLabel.includes('undefined')
    ? periodLabel.trim()
    : `${getMonthName(resolvedMonth)} ${resolvedYear}`;

  const cards = [
    {
      title: 'Total Balance',
      value: formatCurrency(totalBalance, currency),
      icon: Wallet,
      gradient: 'from-indigo-500 to-purple-600',
      glow: 'glow-indigo',
      change: null,
    },
    {
      title: 'Balance',
      period: selectedPeriod,
      value: formatCurrency(summary.balance, currency),
      icon: DollarSign,
      gradient: summary.balance >= 0 ? 'from-sky-500 to-cyan-600' : 'from-orange-500 to-rose-600',
      glow: '',
      change: 'income - expenses',
    },
    {
      title: 'Income',
      period: selectedPeriod,
      value: formatCurrency(summary.totalIncome, currency),
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'glow-emerald',
      change: '+' + summary.totalIncome.toFixed(0),
    },
    {
      title: 'Expenses',
      period: selectedPeriod,
      value: formatCurrency(summary.totalExpense, currency),
      icon: TrendingDown,
      gradient: 'from-rose-500 to-pink-600',
      glow: 'glow-rose',
      change: '-' + summary.totalExpense.toFixed(0),
    },
    {
      title: 'Transactions',
      period: selectedPeriod,
      value: summary.transactionCount.toString(),
      icon: ArrowLeftRight,
      gradient: 'from-amber-500 to-orange-600',
      glow: '',
      change: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <div
          key={card.title}
          className={`relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-4 sm:p-5 animate-slide-up stagger-${i + 1} ${card.glow}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm leading-snug text-slate-500 dark:text-slate-400 mb-1">
                <span>{card.title}</span>
                {'period' in card && card.period && (
                  <span className="ml-1 text-[11px] font-normal text-slate-400 dark:text-slate-500">
                    ({card.period})
                  </span>
                )}
              </p>
              <p className="break-words text-xl font-bold text-slate-900 dark:text-white 2xl:text-2xl">{card.value}</p>
              {card.change && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{card.change}</p>
              )}
            </div>
            <div className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
              <card.icon className="h-5 w-5 text-white" />
            </div>
          </div>
          {/* Decorative gradient */}
          <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-5 blur-2xl`} />
        </div>
      ))}
    </div>
  );
}
