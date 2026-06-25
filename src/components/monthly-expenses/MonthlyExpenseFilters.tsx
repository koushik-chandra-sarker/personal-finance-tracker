'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarDays, Loader2 } from 'lucide-react';

type FilterOption = {
  id: string;
  name: string;
};

type MonthOption = {
  value: number;
  label: string;
};

type MonthlyExpenseFiltersProps = {
  month: number;
  year: number;
  categoryId?: string;
  accountId?: string;
  monthLabel: string;
  monthOptions: MonthOption[];
  categories: FilterOption[];
  accounts: FilterOption[];
  copy: {
    previousMonth: string;
    nextMonth: string;
    allCategories: string;
    allAccounts: string;
    apply: string;
    applying: string;
  };
};

function adjacentMonth(month: number, year: number, offset: -1 | 1) {
  const date = new Date(year, month - 1 + offset, 1);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export default function MonthlyExpenseFilters({
  month,
  year,
  categoryId,
  accountId,
  monthLabel,
  monthOptions,
  categories,
  accounts,
  copy,
}: MonthlyExpenseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || '');
  const [selectedAccountId, setSelectedAccountId] = useState(accountId || '');

  const navigate = (nextValues: {
    month: number;
    year: number;
    categoryId?: string;
    accountId?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', String(nextValues.month));
    params.set('year', String(nextValues.year));
    params.delete('page');

    if (nextValues.categoryId) params.set('categoryId', nextValues.categoryId);
    else params.delete('categoryId');

    if (nextValues.accountId) params.set('accountId', nextValues.accountId);
    else params.delete('accountId');

    const target = `/monthly-expenses?${params.toString()}`;
    const current = searchParams.toString() ? `/monthly-expenses?${searchParams.toString()}` : '/monthly-expenses';
    if (target === current) return;

    startTransition(() => {
      router.push(target, { scroll: false });
    });
  };

  const goToAdjacentMonth = (offset: -1 | 1) => {
    const next = adjacentMonth(month, year, offset);
    navigate({
      ...next,
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
    });
  };

  const applyFilters = () => {
    navigate({
      month: selectedMonth,
      year: selectedYear,
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToAdjacentMonth(-1)}
            disabled={isPending}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={copy.previousMonth}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> : <CalendarDays className="h-4 w-4 text-indigo-500" />}
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={() => goToAdjacentMonth(1)}
            disabled={isPending}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={copy.nextMonth}
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(Number(event.target.value))}
            className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {monthOptions.map(item => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <input
            type="number"
            value={selectedYear}
            min={2000}
            max={2100}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <select
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">{copy.allCategories}</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select
            value={selectedAccountId}
            onChange={(event) => setSelectedAccountId(event.target.value)}
            className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">{copy.allAccounts}</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyFilters}
            disabled={isPending}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-70"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? copy.applying : copy.apply}
          </button>
        </div>
      </div>
    </div>
  );
}
