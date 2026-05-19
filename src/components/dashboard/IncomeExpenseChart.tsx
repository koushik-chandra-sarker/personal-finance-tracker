'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { MonthlyTrend } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { DEFAULT_LOCALE, type AppLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/messages';

interface IncomeExpenseChartProps {
  data: MonthlyTrend[];
  currency?: string;
  locale?: AppLocale;
}

const CustomTooltip = ({ active, payload, label, currency, locale }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  currency: string;
  locale: AppLocale;
}) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-3 shadow-2xl">
      <p className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value, currency, locale)}
        </p>
      ))}
    </div>
  );
};

export default function IncomeExpenseChart({ data, currency = 'USD', locale = DEFAULT_LOCALE }: IncomeExpenseChartProps) {
  const copy = getMessages(locale).dashboard;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-4">{copy.incomeVsExpenses}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickFormatter={(v) => formatCurrency(Number(v), currency, locale)} />
            <Tooltip content={<CustomTooltip currency={currency} locale={locale} />} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            <Bar dataKey="income" name={copy.income} fill="#10b981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" name={copy.expenses} fill="#f43f5e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
