'use client';

import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { MonthlySummary } from '@/types';

interface SummaryCardsProps {
  summary: MonthlySummary;
  totalBalance: number;
  currency?: string;
}

export default function SummaryCards({ summary, totalBalance, currency = 'USD' }: SummaryCardsProps) {
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
      title: 'Income',
      value: formatCurrency(summary.totalIncome, currency),
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'glow-emerald',
      change: '+' + summary.totalIncome.toFixed(0),
    },
    {
      title: 'Expenses',
      value: formatCurrency(summary.totalExpense, currency),
      icon: TrendingDown,
      gradient: 'from-rose-500 to-pink-600',
      glow: 'glow-rose',
      change: '-' + summary.totalExpense.toFixed(0),
    },
    {
      title: 'Transactions',
      value: summary.transactionCount.toString(),
      icon: ArrowLeftRight,
      gradient: 'from-amber-500 to-orange-600',
      glow: '',
      change: 'this month',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={card.title}
          className={`relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-5 animate-slide-up stagger-${i + 1} ${card.glow}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              {card.change && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{card.change}</p>
              )}
            </div>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
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
