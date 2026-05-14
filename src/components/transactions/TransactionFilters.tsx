'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState, useMemo } from 'react';
import { Search, Loader2, X, Filter } from 'lucide-react';
import MultiSelectFilter, { type FilterMode } from '@/components/ui/MultiSelectFilter';

interface Category { id: string; name: string; type: string }
interface Account { id: string; name: string; type: string }

export default function TransactionFilters({ 
  categories, 
  accounts,
  defaultDateFrom = '',
  defaultDateTo = '',
  onNavigateStart,
}: { 
  categories: Category[]; 
  accounts: Account[];
  defaultDateFrom?: string;
  defaultDateTo?: string;
  onNavigateStart?: (message?: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state for tracking inputs before applying
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Multi-select states
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    searchParams.get('types')?.split(',').filter(Boolean) || []
  );
  const [typeMode, setTypeMode] = useState<FilterMode>(
    (searchParams.get('typeMode') as FilterMode) || 'include'
  );

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('categoryIds')?.split(',').filter(Boolean) || []
  );
  const [categoryMode, setCategoryMode] = useState<FilterMode>(
    (searchParams.get('categoryMode') as FilterMode) || 'include'
  );

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
    searchParams.get('accountIds')?.split(',').filter(Boolean) || []
  );
  const [accountMode, setAccountMode] = useState<FilterMode>(
    (searchParams.get('accountMode') as FilterMode) || 'include'
  );

  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || defaultDateFrom);
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || defaultDateTo);
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt_desc');

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    // Always reset to page 1 on new filter
    params.set('page', '1');

    if (search) params.set('search', search); else params.delete('search');

    // Multi-select type
    if (selectedTypes.length > 0) {
      params.set('types', selectedTypes.join(','));
      params.set('typeMode', typeMode);
    } else {
      params.delete('types');
      params.delete('typeMode');
    }
    // Remove legacy single type param
    params.delete('type');

    // Multi-select category
    if (selectedCategories.length > 0) {
      params.set('categoryIds', selectedCategories.join(','));
      params.set('categoryMode', categoryMode);
    } else {
      params.delete('categoryIds');
      params.delete('categoryMode');
    }
    params.delete('categoryId');

    // Multi-select account
    if (selectedAccounts.length > 0) {
      params.set('accountIds', selectedAccounts.join(','));
      params.set('accountMode', accountMode);
    } else {
      params.delete('accountIds');
      params.delete('accountMode');
    }
    params.delete('accountId');

    if (dateFrom) params.set('dateFrom', dateFrom); else params.delete('dateFrom');
    if (dateTo) params.set('dateTo', dateTo); else params.delete('dateTo');
    if (sortBy && sortBy !== 'createdAt_desc') params.set('sortBy', sortBy); else params.delete('sortBy');

    const target = `/transactions?${params.toString()}`;
    const current = searchParams.toString() ? `/transactions?${searchParams.toString()}` : '/transactions';
    if (target === current) return;

    onNavigateStart?.('Applying filters...');
    startTransition(() => {
      router.push(target);
    });
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedTypes([]);
    setTypeMode('include');
    setSelectedCategories([]);
    setCategoryMode('include');
    setSelectedAccounts([]);
    setAccountMode('include');
    setDateFrom('');
    setDateTo('');
    setSortBy('createdAt_desc');
    if (!searchParams.toString()) return;

    onNavigateStart?.('Clearing filters...');
    startTransition(() => {
      router.push('/transactions');
    });
  };

  const hasActiveFilters = search || selectedTypes.length > 0 || selectedCategories.length > 0 || selectedAccounts.length > 0 || dateFrom || dateTo || (sortBy && sortBy !== 'createdAt_desc');

  // Build option arrays
  const typeOptions = [
    { value: 'INCOME', label: 'Income' },
    { value: 'EXPENSE', label: 'Expense' },
  ];

  // Filter categories based on selected types (if only one type is selected in include mode)
  const filteredCategoryOptions = useMemo(() => {
    let cats = categories;
    if (selectedTypes.length === 1 && typeMode === 'include') {
      cats = categories.filter(c => c.type === selectedTypes[0]);
    }
    return cats.map(c => ({ value: c.id, label: c.name, group: c.type }));
  }, [categories, selectedTypes, typeMode]);

  const accountOptions = useMemo(() => {
    return accounts.map(a => ({ value: a.id, label: a.name }));
  }, [accounts]);

  return (
    <div className="bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 sm:p-5 mb-6 space-y-4 overflow-visible box-border max-w-full">
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search descriptions or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {isPending && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500 dark:text-indigo-400 animate-spin" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 max-w-full">
        {/* Type Multi-Select */}
        <MultiSelectFilter
          label="Types"
          options={typeOptions}
          selected={selectedTypes}
          onChange={setSelectedTypes}
          mode={typeMode}
          onModeChange={setTypeMode}
          placeholder="All Types"
        />

        {/* Category Multi-Select */}
        <MultiSelectFilter
          label="Categories"
          options={filteredCategoryOptions}
          selected={selectedCategories}
          onChange={setSelectedCategories}
          mode={categoryMode}
          onModeChange={setCategoryMode}
          placeholder="All Categories"
        />

        {/* Account Multi-Select */}
        <MultiSelectFilter
          label="Accounts"
          options={accountOptions}
          selected={selectedAccounts}
          onChange={setSelectedAccounts}
          mode={accountMode}
          onModeChange={setAccountMode}
          placeholder="All Accounts"
        />

        {/* Date From */}
        <div className="min-w-0 w-full overflow-hidden">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="Start Date"
            className="block w-full min-w-0 max-w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 [color-scheme:light] dark:[color-scheme:dark] box-border"
          />
        </div>

        {/* Date To */}
        <div className="min-w-0 w-full overflow-hidden">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="End Date"
            className="block w-full min-w-0 max-w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 [color-scheme:light] dark:[color-scheme:dark] box-border"
          />
        </div>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full min-w-0 rounded-xl border border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none truncate"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }}
        >
          <option value="createdAt_desc" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Latest Added</option>
          <option value="createdAt_asc" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Oldest Added</option>
          <option value="date_desc" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Newest Date</option>
          <option value="date_asc" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Oldest Date</option>
          <option value="amount_desc" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Highest Amount</option>
          <option value="amount_asc" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Lowest Amount</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 shrink-0 pt-2">
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
  );
}
