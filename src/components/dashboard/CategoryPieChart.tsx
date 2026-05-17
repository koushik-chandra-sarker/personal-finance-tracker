'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategoryBreakdown } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { DEFAULT_LOCALE, type AppLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/messages';

interface CategoryPieChartProps {
  data: CategoryBreakdown[];
  currency?: string;
  locale?: AppLocale;
}

const CustomTooltip = ({ active, payload, currency, locale }: {
  active?: boolean;
  payload?: Array<{ payload: CategoryBreakdown }>;
  currency: string;
  locale: AppLocale;
}) => {
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-3 shadow-2xl">
      <p className="text-sm font-medium text-slate-900 dark:text-white">{d.categoryName}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{formatCurrency(d.total, currency, locale)} ({d.percentage}%)</p>
    </div>
  );
};

export default function CategoryPieChart({ data, currency = 'USD', locale = DEFAULT_LOCALE }: CategoryPieChartProps) {
  const copy = getMessages(locale).dashboard;

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{copy.expenseBreakdown}</h3>
        <div className="flex items-center justify-center h-[250px] text-slate-500 text-sm">
          {copy.noExpenseData}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{copy.expenseBreakdown}</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="total"
              nameKey="categoryName"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.categoryColor} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip currency={currency} locale={locale} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.slice(0, 6).map((cat) => (
          <div key={cat.categoryId} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.categoryColor }} />
            <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{cat.categoryName}</span>
            <span className="text-xs text-slate-500 dark:text-slate-500 ml-auto">{cat.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
