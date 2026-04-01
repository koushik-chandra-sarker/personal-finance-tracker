'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transactionSchema, type TransactionInput } from '@/lib/validations/transaction';
import { createTransactionAction, deleteTransactionAction } from '@/actions/transaction.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { Plus, Trash2, ArrowLeftRight, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import TransactionFilters from '@/components/transactions/TransactionFilters';
import { useRouter } from 'next/navigation';

interface Category { id: string; name: string; type: string; color: string; }
interface Account { id: string; name: string; type: string; }
interface Transaction {
  id: string; description: string; amount: unknown; type: string;
  date: Date | string; tags: string[]; notes: string | null;
  category: { id: string; name: string; color: string };
  account: { id: string; name: string };
}

interface TransactionPageClientProps {
  initialTransactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  total: number;
  pages: number;
  currentPage: number;
}

export default function TransactionPageClient({
  initialTransactions, categories, accounts, total, pages, currentPage
}: TransactionPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: { type: 'EXPENSE', amount: 0, tags: [], date: new Date().toISOString().split('T')[0] },
  });

  const selectedType = watch('type');
  const filteredCategories = categories.filter(c => c.type === selectedType);

  const onSubmit = async (data: any) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'tags') {
        // tags comes as string from input, pass as-is — the action will split it
        formData.set(key, String(value ?? ''));
      } else {
        formData.set(key, String(value ?? ''));
      }
    });
    startTransition(async () => {
      const result = await createTransactionAction(formData);
      if (result.success) {
        setIsModalOpen(false);
        reset();
        router.refresh();
      } else {
        console.error('Transaction failed:', result.message, result.errors);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    startTransition(async () => {
      await deleteTransactionAction(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{total} total transactions</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" /> Add Transaction
        </Button>
      </div>

      {/* Filters */}
      <TransactionFilters categories={categories} accounts={accounts} />

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
            <div key={tx.id} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: tx.category.color + '20' }}>
                {tx.type === 'INCOME' ?
                  <TrendingUp className="h-5 w-5" style={{ color: tx.category.color }} /> :
                  <TrendingDown className="h-5 w-5" style={{ color: tx.category.color }} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{tx.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tx.category.name} · {tx.account.name} · {formatDate(tx.date)}
                </p>
                {tx.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {tx.tags.map(tag => <Badge key={tag} variant="default">{tag}</Badge>)}
                  </div>
                )}
              </div>
              <p className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
              </p>
              <button
                onClick={() => handleDelete(tx.id)}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              onClick={() => router.push(`/transactions?page=${i + 1}`)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === i + 1 ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5'
                }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Add Transaction Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Transaction">
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
          <Button type="submit" className="w-full" isLoading={isPending}>Create Transaction</Button>
        </form>
      </Modal>
    </div>
  );
}
