'use client';

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { SalaryBreakdown } from '@/lib/salary-calculator';

const COLORS = ['#6366f1', '#8b5cf6', '#14b8a6', '#f59e0b', '#64748b', '#ef4444', '#10b981'];

function fmt(n: number, currency: string) {
  const sym: Record<string, string> = { BDT: '৳', USD: '$', EUR: '€', GBP: '£', INR: '₹' };
  return (sym[currency] || currency + ' ') + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function SalaryCharts({ result, currency }: { result: SalaryBreakdown; currency: string }) {
  const structureData = [
    { name: 'Basic', value: result.basicMonthly },
    { name: 'House Rent', value: result.houseRentMonthly },
    { name: 'Medical', value: result.medicalMonthly },
    { name: 'Conveyance', value: result.conveyanceMonthly },
    { name: 'Other', value: result.otherAllowanceMonthly },
  ].filter(d => d.value > 0);

  const distributionData = [
    { name: 'Take-Home', value: result.netMonthly },
    { name: 'Tax', value: result.monthlyTax },
    { name: 'Deductions', value: result.totalDeductionsMonthly },
  ].filter(d => d.value > 0);

  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    gross: result.grossMonthly,
    net: result.netMonthly,
    tax: result.monthlyTax,
  }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-xl text-xs">
        {label && <p className="font-semibold text-slate-900 dark:text-white mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} className="text-slate-600 dark:text-slate-300">
            <span style={{ color: p.color }}>●</span> {p.name}: {fmt(p.value, currency)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Salary Structure Pie */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Salary Structure</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={structureData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {structureData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Income Distribution Pie */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Income Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={distributionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Monthly Overview</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="gross" name="Gross" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="net" name="Net" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tax" name="Tax" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
