'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { MonthlyTrend, CategoryBreakdown } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Download, FileBarChart, Calendar, Loader2 } from 'lucide-react';

const MONTHS = [
  { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
];

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface ReportsPageClientProps {
  trend: MonthlyTrend[];
  breakdown: CategoryBreakdown[];
  transactions: Array<{ description: string; amount: unknown; type: string; date: string; category: { name: string }; account: { name: string } }>;
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
}

export default function ReportsPageClient({ trend, breakdown, transactions, fromMonth, fromYear, toMonth, toYear }: ReportsPageClientProps) {
  const { theme, resolvedTheme } = useTheme();
  const { data: session } = useSession();
  const userCurrency = (session?.user as any)?.currency || 'USD';
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state for range picker
  const [localFromMonth, setLocalFromMonth] = useState(fromMonth);
  const [localFromYear, setLocalFromYear] = useState(fromYear);
  const [localToMonth, setLocalToMonth] = useState(toMonth);
  const [localToYear, setLocalToYear] = useState(toYear);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep local state in sync with URL
  useEffect(() => {
    setLocalFromMonth(fromMonth);
    setLocalFromYear(fromYear);
    setLocalToMonth(toMonth);
    setLocalToYear(toYear);
  }, [fromMonth, fromYear, toMonth, toYear]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  const applyRange = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('fromMonth', String(localFromMonth));
    params.set('fromYear', String(localFromYear));
    params.set('toMonth', String(localToMonth));
    params.set('toYear', String(localToYear));

    startTransition(() => {
      router.push(`/reports?${params.toString()}`);
    });
  };

  const resetToDefault = () => {
    startTransition(() => {
      router.push('/reports');
    });
  };

  // Check if current range matches default (last 12 months)
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const isDefaultRange =
    fromMonth === defaultStart.getMonth() + 1 &&
    fromYear === defaultStart.getFullYear() &&
    toMonth === now.getMonth() + 1 &&
    toYear === now.getFullYear();

  const rangeLabel = `${MONTH_FULL[fromMonth - 1]} ${fromYear} – ${MONTH_FULL[toMonth - 1]} ${toYear}`;

  const handleExportCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Account', 'Type', 'Amount'];
    const rows = transactions.map(t => [
      t.date, t.description, t.category.name, t.account.name, t.type, String(t.amount)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-report-${fromMonth}-${fromYear}-to-${toMonth}-${toYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDark = resolvedTheme === 'dark';

  const chartColors = {
    grid: isDark ? '#334155' : '#e2e8f0',
    text: isDark ? '#94a3b8' : '#64748b',
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    tooltipBorder: isDark ? '#334155' : '#e2e8f0',
    tooltipText: isDark ? '#ffffff' : '#0f172a',
  };

  const selectClass = "rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 px-2.5 py-2 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none disabled:opacity-50";
  const selectStyle = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '24px' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Financial overview and export</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Date Range Picker */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/40">
        {/* Desktop: single row */}
        <div className="hidden sm:flex sm:items-center sm:gap-3 sm:flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 shrink-0">
            {isPending ? (
              <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 text-indigo-400" />
            )}
            <span>From</span>
          </div>
          <select value={localFromMonth} disabled={isPending} onChange={(e) => setLocalFromMonth(Number(e.target.value))} className={selectClass} style={selectStyle}>
            {MONTHS.map((m) => (<option key={m.value} value={m.value} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{m.label}</option>))}
          </select>
          <select value={localFromYear} disabled={isPending} onChange={(e) => setLocalFromYear(Number(e.target.value))} className={selectClass} style={selectStyle}>
            {years.map((y) => (<option key={y} value={y} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{y}</option>))}
          </select>
          <span className="text-slate-400 dark:text-slate-600">→</span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">To</span>
          <select value={localToMonth} disabled={isPending} onChange={(e) => setLocalToMonth(Number(e.target.value))} className={selectClass} style={selectStyle}>
            {MONTHS.map((m) => (<option key={m.value} value={m.value} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{m.label}</option>))}
          </select>
          <select value={localToYear} disabled={isPending} onChange={(e) => setLocalToYear(Number(e.target.value))} className={selectClass} style={selectStyle}>
            {years.map((y) => (<option key={y} value={y} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{y}</option>))}
          </select>
          <button onClick={applyRange} disabled={isPending} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50">
            Apply
          </button>
          {!isDefaultRange && (
            <button onClick={resetToDefault} disabled={isPending} className="px-3 py-2 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 transition-colors disabled:opacity-50">
              Last 12 Months
            </button>
          )}
        </div>

        {/* Mobile: stacked */}
        <div className="flex flex-col gap-3 sm:hidden">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            {isPending ? (
              <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 text-indigo-400" />
            )}
            <span>Date Range</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">From</span>
            <div className="grid grid-cols-2 gap-2">
              <select value={localFromMonth} disabled={isPending} onChange={(e) => setLocalFromMonth(Number(e.target.value))} className={selectClass + " w-full"} style={selectStyle}>
                {MONTHS.map((m) => (<option key={m.value} value={m.value} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{m.label}</option>))}
              </select>
              <select value={localFromYear} disabled={isPending} onChange={(e) => setLocalFromYear(Number(e.target.value))} className={selectClass + " w-full"} style={selectStyle}>
                {years.map((y) => (<option key={y} value={y} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{y}</option>))}
              </select>
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">To</span>
            <div className="grid grid-cols-2 gap-2">
              <select value={localToMonth} disabled={isPending} onChange={(e) => setLocalToMonth(Number(e.target.value))} className={selectClass + " w-full"} style={selectStyle}>
                {MONTHS.map((m) => (<option key={m.value} value={m.value} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{m.label}</option>))}
              </select>
              <select value={localToYear} disabled={isPending} onChange={(e) => setLocalToYear(Number(e.target.value))} className={selectClass + " w-full"} style={selectStyle}>
                {years.map((y) => (<option key={y} value={y} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{y}</option>))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={applyRange} disabled={isPending} className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50">
              Apply
            </button>
            {!isDefaultRange && (
              <button onClick={resetToDefault} disabled={isPending} className="flex-1 px-3 py-2 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 transition-colors disabled:opacity-50">
                Last 12 Months
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Monthly Trend</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{rangeLabel}</p>
        <div className="h-[350px]">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="month" tick={{ fill: chartColors.text, fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: chartColors.text, fontSize: 11 }} axisLine={false} tickFormatter={(v) => ` ${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: '12px',
                    color: chartColors.tooltipText
                  }}
                  itemStyle={{ color: chartColors.tooltipText }}
                  formatter={(value: any) => [formatCurrency(Number(value) || 0, userCurrency), '']}
                />
                <Legend wrapperStyle={{ color: chartColors.text, fontSize: 12, paddingTop: '20px' }} />
                <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Category Breakdown</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{rangeLabel}</p>
        {breakdown.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No data for this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium text-right">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((cat) => (
                  <tr key={cat.categoryId} className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.categoryColor }} />
                        <span className="text-slate-900 dark:text-white">{cat.categoryName}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-slate-900 dark:text-white font-medium">{formatCurrency(cat.total, userCurrency)}</td>
                    <td className="py-3 text-right text-slate-500 dark:text-slate-400">{cat.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
