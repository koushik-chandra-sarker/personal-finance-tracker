'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { getMonthName } from '@/lib/utils';

interface MonthYearPickerProps {
  month: number;
  year: number;
  route?: string;
}

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

export default function MonthYearPicker({ month, year, route = '/dashboard' }: MonthYearPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const navigate = (m: number, y: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', String(m));
    params.set('year', String(y));
    
    startTransition(() => {
      router.push(`${route}?${params.toString()}`);
    });
  };

  const now = new Date();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  // Generate year options: 5 years back to 1 year forward
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="flex items-center gap-2">
      {isPending ? (
        <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
      ) : (
        <Calendar className="h-4 w-4 text-indigo-400" />
      )}

      <select
        value={month}
        disabled={isPending}
        onChange={(e) => navigate(Number(e.target.value), year)}
        className="rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none disabled:opacity-50"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }}
      >
        {MONTHS.map((m) => (
          <option key={m} value={m} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{getMonthName(m)}</option>
        ))}
      </select>

      <select
        value={year}
        disabled={isPending}
        onChange={(e) => navigate(month, Number(e.target.value))}
        className="rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none disabled:opacity-50"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }}
      >
        {years.map((y) => (
          <option key={y} value={y} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{y}</option>
        ))}
      </select>

      {!isCurrentMonth && (
        <button
          disabled={isPending}
          onClick={() => navigate(now.getMonth() + 1, currentYear)}
          className="px-3 py-2 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 transition-colors disabled:opacity-50"
        >
          Today
        </button>
      )}
    </div>
  );
}
