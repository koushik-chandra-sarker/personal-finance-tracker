'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState, useEffect } from 'react';
import { Search, Loader2, X, Filter } from 'lucide-react';

interface Category { id: string; name: string; type: string }
interface Account { id: string; name: string; type: string }

export default function TransactionFilters({ categories, accounts }: { categories: Category[], accounts: Account[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state for tracking inputs before applying
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [accountId, setAccountId] = useState(searchParams.get('accountId') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');

  // Keep local state in sync with URL if user uses back/forward browser buttons
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setType(searchParams.get('type') || '');
    setCategoryId(searchParams.get('categoryId') || '');
    setAccountId(searchParams.get('accountId') || '');
    setDateFrom(searchParams.get('dateFrom') || '');
    setDateTo(searchParams.get('dateTo') || '');
  }, [searchParams]);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Always reset to page 1 on new filter
    params.set('page', '1');

    if (search) params.set('search', search); else params.delete('search');
    if (type) params.set('type', type); else params.delete('type');
    if (categoryId) params.set('categoryId', categoryId); else params.delete('categoryId');
    if (accountId) params.set('accountId', accountId); else params.delete('accountId');
    if (dateFrom) params.set('dateFrom', dateFrom); else params.delete('dateFrom');
    if (dateTo) params.set('dateTo', dateTo); else params.delete('dateTo');

    startTransition(() => {
      router.push(`/transactions?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearch('');
    setType('');
    setCategoryId('');
    setAccountId('');
    setDateFrom('');
    setDateTo('');
    startTransition(() => {
      router.push('/transactions');
    });
  };

  const hasActiveFilters = search || type || categoryId || accountId || dateFrom || dateTo;
  const filteredCategories = type ? categories.filter(c => c.type === type) : categories;

  return (
    <div className="bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 mb-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search descriptions or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {isPending && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500 dark:text-indigo-400 animate-spin" />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              disabled={isPending}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-700/30 hover:bg-slate-300 dark:hover:bg-slate-700/50 rounded-xl transition-colors border border-transparent hover:border-slate-400 dark:hover:border-slate-600 disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Clear
            </button>
          )}
          <button
            onClick={applyFilters}
            disabled={isPending}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            <Filter className="h-4 w-4" /> Apply Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Type Filter */}
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setCategoryId(''); // Reset category when type changes
          }}
          className="rounded-xl border border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }}
        >
          <option value="" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">All Types</option>
          <option value="INCOME" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Income</option>
          <option value="EXPENSE" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Expense</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-xl border border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none truncate"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }}
        >
          <option value="" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">All Categories</option>
          {filteredCategories.map(c => (
            <option key={c.id} value={c.id} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">{c.name}</option>
          ))}
        </select>

        {/* Account Filter */}
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="rounded-xl border border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none truncate"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }}
        >
          <option value="" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">All Accounts</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">{a.name}</option>
          ))}
        </select>

        {/* Date From */}
        <div className="relative">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="Start Date"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 light:[color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>

        {/* Date To */}
        <div className="relative">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="End Date"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 light:[color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
      </div>
    </div>
  );
}
