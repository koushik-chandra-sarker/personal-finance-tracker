'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transactionSchema, type TransactionInput } from '@/lib/validations/transaction';
import type { z } from 'zod';
import { createTransactionAction, updateTransactionAction, deleteTransactionAction } from '@/actions/transaction.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Loader from '@/components/ui/Loader';
import { formatCurrency, formatDate } from '@/lib/utils';
import TransactionFilters from '@/components/transactions/TransactionFilters';
import { Edit2, Plus, Trash2, ArrowLeftRight, TrendingUp, TrendingDown, Clock, Loader2 } from 'lucide-react';

interface Category { id: string; name: string; type: string; color: string; }
interface Account { id: string; name: string; type: string; }
interface Transaction {
  id: string; description: string; amount: unknown; type: string;
  date: Date | string; tags: string[]; notes: string | null;
  category: { id: string; name: string; color: string };
  account: { id: string; name: string };
  createdByName?: string | null;
  updatedByName?: string | null;
}

const isInternalTag = (tag: string) => tag.startsWith('__pft:');
const isGoalTransaction = (tx: Transaction) => tx.tags.includes('__pft:goal-transfer');

interface TransactionPageClientProps {
  initialTransactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  total: number;
  pages: number;
  currentPage: number;
  totalIncome: number;
  totalExpense: number;
  dateFrom: string;
  dateTo: string;
  dataVersionKey: string;
}

type TransactionFormValues = z.input<typeof transactionSchema>;

function TransactionListLoading({ message }: { message: string }) {
  return (
    <div className="space-y-3">
      <div className="sticky top-4 z-10 overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-lg shadow-indigo-500/10 dark:border-indigo-500/30 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{message}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Preparing the latest transaction view</p>
            </div>
          </div>
          <div className="hidden h-2 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:block">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-500" />
          </div>
        </div>
        <div className="h-1 overflow-hidden bg-indigo-100 dark:bg-indigo-500/10">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-indigo-500" />
        </div>
      </div>

      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:gap-4">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700/60" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-700/40" />
            </div>
            <div className="hidden h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TransactionPageClient({
  initialTransactions, categories, accounts, total, pages, currentPage,
  totalIncome, totalExpense, dateFrom, dateTo, dataVersionKey
}: TransactionPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [navigationLoaderMessage, setNavigationLoaderMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamKey = searchParams.toString();
  const { data: session } = useSession();
  const userCurrency = session?.user && 'currency' in session.user && typeof session.user.currency === 'string'
    ? session.user.currency
    : 'USD';

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TransactionFormValues, unknown, TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: 'EXPENSE', tags: [], date: new Date().toISOString().split('T')[0] },
  });

  const selectedType = watch('type');
  const filteredCategories = categories.filter(c => c.type === selectedType);

  const onSubmit = async (data: TransactionInput) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'tags') {
        formData.set(key, Array.isArray(value) ? value.join(',') : String(value ?? ''));
      } else {
        formData.set(key, String(value ?? ''));
      }
    });

    startTransition(async () => {
      const result = editingTransaction 
        ? await updateTransactionAction(editingTransaction.id, formData)
        : await createTransactionAction(formData);

      if (result.success) {
        setIsModalOpen(false);
        setEditingTransaction(null);
        reset();
        router.refresh();
      } else {
        console.error('Transaction failed:', result.message, result.errors);
      }
    });
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setValue('type', tx.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
    setValue('amount', Number(tx.amount));
    setValue('description', tx.description);
    setValue('accountId', tx.account.id);
    setValue('categoryId', tx.category.id);
    setValue('date', new Date(tx.date).toISOString().split('T')[0]);
    setValue('tags', tx.tags);
    setValue('notes', tx.notes || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    reset();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    startTransition(async () => {
      await deleteTransactionAction(id);
      router.refresh();
    });
  };

  const transactionPageHref = (page: number) => {
    const params = new URLSearchParams(searchParamKey);
    params.set('page', String(page));
    return `/transactions?${params.toString()}`;
  };

  const navigateToPage = (page: number) => {
    setNavigationLoaderMessage('Loading transactions...');
    router.push(transactionPageHref(page));
  };

  const isNavigatingTransactions = Boolean(navigationLoaderMessage);

  useEffect(() => {
    setNavigationLoaderMessage(null);
  }, [dataVersionKey]);

  return (
    <div className="space-y-6">
      <Loader show={isPending} message={editingTransaction ? "Updating transaction..." : "Processing..."} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>
              {total > 0 ? `Showing ${(currentPage - 1) * 20 + 1}-${(currentPage - 1) * 20 + initialTransactions.length} of ${total} transactions` : '0 transactions'}
            </span>
            <span>•</span>
            <span className="font-medium text-slate-900 dark:text-slate-200">
              Net: {totalIncome - totalExpense >= 0 ? '+' : '-'} {formatCurrency(Math.abs(totalIncome - totalExpense), userCurrency)}
            </span>
          </div>
        </div>
        <Button onClick={() => { setEditingTransaction(null); reset(); setIsModalOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Transaction
        </Button>
      </div>

      {/* Filters */}
      <TransactionFilters 
        key={searchParamKey}
        categories={categories} 
        accounts={accounts} 
        defaultDateFrom={dateFrom} 
        defaultDateTo={dateTo} 
        onNavigateStart={(loaderMessage = 'Loading transactions...') => setNavigationLoaderMessage(loaderMessage)}
      />

      {/* Totals Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Income</p>
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">+{formatCurrency(totalIncome, userCurrency)}</p>
        </div>
        
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Expense</p>
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">-{formatCurrency(totalExpense, userCurrency)}</p>
        </div>

        <div className="relative overflow-hidden p-5 rounded-2xl bg-indigo-600 dark:bg-indigo-500 shadow-lg shadow-indigo-500/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-indigo-100">Net Balance</p>
            <div className="p-2 rounded-lg bg-white/20 text-white">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {totalIncome - totalExpense >= 0 ? '+' : '-'} {formatCurrency(Math.abs(totalIncome - totalExpense), userCurrency)}
          </p>
        </div>
      </div>

      <div className="relative" aria-busy={isNavigatingTransactions}>
        {isNavigatingTransactions ? (
          <TransactionListLoading message={navigationLoaderMessage || 'Loading transactions...'} />
        ) : (
        <div className="transition-opacity">
          {/* Transaction List */}
          {initialTransactions.length === 0 ? (
            <EmptyState
              title="No transactions found"
              description="Add your first transaction to start tracking your finances"
              icon={<ArrowLeftRight className="h-12 w-12 text-slate-500" />}
              action={<Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> Add Transaction</Button>}
            />
          ) : (
            <div className="space-y-2">
              {initialTransactions.map((tx) => (
                <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all group">
              
              {/* Top Section / Left Side */}
              <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: tx.category.color + '20' }}>
                  {tx.type === 'INCOME' ?
                    <TrendingUp className="h-5 w-5" style={{ color: tx.category.color }} /> :
                    <TrendingDown className="h-5 w-5" style={{ color: tx.category.color }} />
                  }
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{tx.description}</p>
                    {/* Mobile Amount */}
                    <p className={`sm:hidden text-sm font-semibold whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(Number(tx.amount), userCurrency)}
                    </p>
                  </div>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {tx.category.name} · {tx.account.name} · {formatDate(tx.date)}
                  </p>
                  
                  {tx.tags.filter(tag => !isInternalTag(tag)).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {tx.tags.filter(tag => !isInternalTag(tag)).map(tag => <Badge key={tag} variant="default">{tag}</Badge>)}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mt-1.5">
                    {tx.updatedByName && (
                      <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0 w-fit">
                        <Clock className="h-3 w-3" />
                        <span>{tx.updatedByName}</span>
                      </div>
                    )}
                    {tx.createdByName && tx.createdByName !== tx.updatedByName && (
                       <span className="text-[10px] text-slate-400 opacity-60">Created by {tx.createdByName}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop Actions & Amount */}
              <div className="hidden sm:flex items-center gap-4 shrink-0">
                <p className={`text-sm font-semibold whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(Number(tx.amount), userCurrency)}
                </p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  {!isGoalTransaction(tx) && (
                    <button
                      onClick={() => handleEdit(tx)}
                      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-all"
                      title="Edit Transaction"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10 transition-all"
                    title="Delete Transaction"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Mobile Actions */}
              <div className="sm:hidden flex items-center justify-end gap-2 pt-3 mt-1 border-t border-slate-100 dark:border-slate-700/50">
                {!isGoalTransaction(tx) && (
                  <button
                    onClick={() => handleEdit(tx)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDelete(tx.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => navigateToPage(i + 1)}
                  disabled={currentPage === i + 1 || isNavigatingTransactions}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === i + 1 ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5'
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingTransaction ? "Edit Transaction" : "Add Transaction"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-2">
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${selectedType === 'INCOME' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-300 dark:border-slate-600/50 text-slate-500 dark:text-slate-400 bg-white dark:bg-transparent'}`}>
              <input type="radio" value="INCOME" {...register('type')} className="hidden" />
              <TrendingUp className="h-4 w-4" /> Income
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${selectedType === 'EXPENSE' ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'border-slate-300 dark:border-slate-600/50 text-slate-500 dark:text-slate-400 bg-white dark:bg-transparent'}`}>
              <input type="radio" value="EXPENSE" {...register('type')} className="hidden" />
              <TrendingDown className="h-4 w-4" /> Expense
            </label>
          </div>
          <Input id="amount" label="Amount" type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />
          <Input id="description" label="Description" error={errors.description?.message} {...register('description')} />
          <Select id="accountId" label="Account" options={accounts.map(a => ({ value: a.id, label: a.name }))} error={errors.accountId?.message} {...register('accountId')} />
          <Select id="categoryId" label="Category" options={filteredCategories.map(c => ({ value: c.id, label: c.name }))} error={errors.categoryId?.message} {...register('categoryId')} />
          <Input id="date" label="Date" type="date" error={errors.date?.message} {...register('date')} />
          <Input id="tags" label="Tags (comma separated)" placeholder="food, groceries" {...register('tags')} />
          <Input id="notes" label="Notes (optional)" {...register('notes')} />
          <Button type="submit" className="w-full" isLoading={isPending}>
            {editingTransaction ? "Update Transaction" : "Create Transaction"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
