'use client';

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { MonthlyTrend, CategoryBreakdown } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Download, FileBarChart } from 'lucide-react';

interface ReportsPageClientProps {
  trend: MonthlyTrend[];
  breakdown: CategoryBreakdown[];
  transactions: Array<{ description: string; amount: unknown; type: string; date: string; category: { name: string }; account: { name: string } }>;
}

export default function ReportsPageClient({ trend, breakdown, transactions }: ReportsPageClientProps) {
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
    a.download = `transactions-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-sm text-slate-400">Financial overview and export</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Trend Chart */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly Trend (Last 12 Months)</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                formatter={(value: any) => [formatCurrency(Number(value) || 0), '']}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
              <Line type="monotone" dataKey="expense" name="Expense" stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Category Breakdown (This Month)</h3>
        {breakdown.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No data for this month</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700/50">
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium text-right">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((cat) => (
                  <tr key={cat.categoryId} className="border-b border-slate-700/30 hover:bg-white/5">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.categoryColor }} />
                        <span className="text-white">{cat.categoryName}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-white">{formatCurrency(cat.total)}</td>
                    <td className="py-3 text-right text-slate-400">{cat.percentage}%</td>
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
