'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { MonthlyTrend, CategoryBreakdown } from '@/types';
import { formatCurrency, getMonthName, getTransactionTypeLabel } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Download, Calendar, Loader2, TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';
import { useI18n } from '@/i18n/client';

interface ReportsPageClientProps {
  trend: MonthlyTrend[];
  breakdown: CategoryBreakdown[];
  transactions: Array<{ description: string; amount: unknown; type: string; date: string; category: { name: string }; account: { name: string } }>;
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
  investmentReport: {
    totalReturnAmount: number;
    returnsByType: Record<string, number>;
    returnsByInvType: Record<string, number>;
    investmentCount: number;
    activeInvestmentCount: number;
  };
}

export default function ReportsPageClient({ trend, breakdown, transactions, investmentReport, fromMonth, fromYear, toMonth, toYear }: ReportsPageClientProps) {
  const { theme, resolvedTheme } = useTheme();
  const { data: session } = useSession();
  const userCurrency = (session?.user as any)?.currency || 'USD';
  const { locale, messages } = useI18n();
  const copy = messages.pages.reports;
  const months = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: getMonthName(index + 1, locale),
  }));
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

  const rangeLabel = `${getMonthName(fromMonth, locale)} ${fromYear} – ${getMonthName(toMonth, locale)} ${toYear}`;

  const handleExportCSV = () => {
    const headers = copy.csvHeaders;
    const rows = transactions.map(t => [
      t.date,
      t.description,
      t.category.name,
      t.account.name,
      getTransactionTypeLabel(t.type, locale),
      String(t.amount),
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

  const selectClass = "rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 px-2.5 py-2 text-sm font-medium text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none disabled:opacity-50";
  const selectStyle = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '24px' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{copy.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4" /> {copy.exportCsv}
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
            <span>{copy.from}</span>
          </div>
          <select value={localFromMonth} disabled={isPending} onChange={(e) => setLocalFromMonth(Number(e.target.value))} className={selectClass} style={selectStyle}>
            {months.map((m) => (<option key={m.value} value={m.value} className="text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800">{m.label}</option>))}
          </select>
          <select value={localFromYear} disabled={isPending} onChange={(e) => setLocalFromYear(Number(e.target.value))} className={selectClass} style={selectStyle}>
            {years.map((y) => (<option key={y} value={y} className="text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800">{y}</option>))}
          </select>
          <span className="text-slate-400 dark:text-slate-600">→</span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{copy.to}</span>
          <select value={localToMonth} disabled={isPending} onChange={(e) => setLocalToMonth(Number(e.target.value))} className={selectClass} style={selectStyle}>
            {months.map((m) => (<option key={m.value} value={m.value} className="text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800">{m.label}</option>))}
          </select>
          <select value={localToYear} disabled={isPending} onChange={(e) => setLocalToYear(Number(e.target.value))} className={selectClass} style={selectStyle}>
            {years.map((y) => (<option key={y} value={y} className="text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800">{y}</option>))}
          </select>
          <button onClick={applyRange} disabled={isPending} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50">
            {copy.apply}
          </button>
          {!isDefaultRange && (
            <button onClick={resetToDefault} disabled={isPending} className="px-3 py-2 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 transition-colors disabled:opacity-50">
              {copy.last12Months}
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
            <span>{copy.dateRange}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">{copy.from}</span>
            <div className="grid grid-cols-2 gap-2">
              <select value={localFromMonth} disabled={isPending} onChange={(e) => setLocalFromMonth(Number(e.target.value))} className={selectClass + " w-full"} style={selectStyle}>
                {months.map((m) => (<option key={m.value} value={m.value} className="text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800">{m.label}</option>))}
              </select>
              <select value={localFromYear} disabled={isPending} onChange={(e) => setLocalFromYear(Number(e.target.value))} className={selectClass + " w-full"} style={selectStyle}>
                {years.map((y) => (<option key={y} value={y} className="text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800">{y}</option>))}
              </select>
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">{copy.to}</span>
            <div className="grid grid-cols-2 gap-2">
              <select value={localToMonth} disabled={isPending} onChange={(e) => setLocalToMonth(Number(e.target.value))} className={selectClass + " w-full"} style={selectStyle}>
                {months.map((m) => (<option key={m.value} value={m.value} className="text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800">{m.label}</option>))}
              </select>
              <select value={localToYear} disabled={isPending} onChange={(e) => setLocalToYear(Number(e.target.value))} className={selectClass + " w-full"} style={selectStyle}>
                {years.map((y) => (<option key={y} value={y} className="text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800">{y}</option>))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={applyRange} disabled={isPending} className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50">
              {copy.apply}
            </button>
            {!isDefaultRange && (
              <button onClick={resetToDefault} disabled={isPending} className="flex-1 px-3 py-2 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 transition-colors disabled:opacity-50">
                {copy.last12Months}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-1">{copy.monthlyTrend}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{rangeLabel}</p>
        <div className="h-[350px]">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="month" tick={{ fill: chartColors.text, fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: chartColors.text, fontSize: 11 }} axisLine={false} tickFormatter={(v) => formatCurrency(Number(v) || 0, userCurrency, locale)} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: '12px',
                    color: chartColors.tooltipText
                  }}
                  itemStyle={{ color: chartColors.tooltipText }}
                  formatter={(value: any) => [formatCurrency(Number(value) || 0, userCurrency, locale), '']}
                />
                <Legend wrapperStyle={{ color: chartColors.text, fontSize: 12, paddingTop: '20px' }} />
                <Line type="monotone" dataKey="income" name={getTransactionTypeLabel('INCOME', locale)} stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
                <Line type="monotone" dataKey="expense" name={getTransactionTypeLabel('EXPENSE', locale)} stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-1">{copy.categoryBreakdown}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{rangeLabel}</p>
        {breakdown.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">{copy.noData}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                  <th className="pb-3 font-medium">{copy.category}</th>
                  <th className="pb-3 font-medium text-right">{copy.amount}</th>
                  <th className="pb-3 font-medium text-right">{copy.percentOfTotal}</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((cat) => (
                  <tr key={cat.categoryId} className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.categoryColor }} />
                        <span className="text-slate-900 dark:text-slate-200">{cat.categoryName}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-slate-900 dark:text-slate-200 font-medium">{formatCurrency(cat.total, userCurrency, locale)}</td>
                    <td className="py-3 text-right text-slate-500 dark:text-slate-400">{cat.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Investment Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">{copy.investmentReturns}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{copy.investmentReturnsHelp}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{copy.totalRealizedReturns}</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(investmentReport.totalReturnAmount, userCurrency, locale)}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold px-1">{copy.returnsByType}</p>
                {Object.entries(investmentReport.returnsByType).length === 0 ? (
                  <p className="text-xs text-slate-500 italic px-1">{copy.noReturns}</p>
                ) : (
                  Object.entries(investmentReport.returnsByType).map(([type, amount]) => (
                    <div key={type} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">{type.toLowerCase().replace('_', ' ')}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-200">{formatCurrency(amount, userCurrency, locale)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold px-1">{copy.returnsByAssetClass}</p>
              <div className="space-y-2">
                {Object.entries(investmentReport.returnsByInvType).length === 0 ? (
                  <p className="text-xs text-slate-500 italic px-1">{copy.noReturns}</p>
                ) : (
                  Object.entries(investmentReport.returnsByInvType).map(([type, amount]) => (
                    <div key={type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 dark:text-slate-400">{type}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-200">{formatCurrency(amount, userCurrency, locale)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full" 
                          style={{ width: `${(amount / (investmentReport.totalReturnAmount || 1)) * 100}%` }} 
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-6 flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-indigo-500" />
            {copy.portfolioHealth}
          </h3>
          
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="text-center">
              <p className="text-3xl font-black text-slate-900 dark:text-slate-200">{investmentReport.activeInvestmentCount}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">{copy.activeInvestments}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-200">{investmentReport.investmentCount}</p>
                <p className="text-[10px] text-slate-400 uppercase">{copy.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-200">{investmentReport.investmentCount - investmentReport.activeInvestmentCount}</p>
                <p className="text-[10px] text-slate-400 uppercase">{copy.matured}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm shrink-0">
                  <ArrowUpRight className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">{copy.taxSummary}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {copy.estimatedTax}: {formatCurrency(investmentReport.totalReturnAmount * 0.05, userCurrency, locale)} (5%)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
