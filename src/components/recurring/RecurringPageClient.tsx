'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { recurringSchema, type RecurringInput } from '@/lib/validations/recurring';
import { createRecurringAction, toggleRecurringAction, deleteRecurringAction } from '@/actions/recurring.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Loader from '@/components/ui/Loader';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, RefreshCw, Power, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatDate, FREQUENCY_LABELS, getFrequencyLabel, getTransactionTypeLabel } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

interface RecurringTx {
  id: string; description: string; amount: unknown; type: string;
  frequency: string; nextRunDate: string; isActive: boolean;
  accountId: string; categoryId: string;
}
interface Category { id: string; name: string; type: string; }
interface Account { id: string; name: string; }

export default function RecurringPageClient({ recurring, categories, accounts }: {
  recurring: RecurringTx[]; categories: Category[]; accounts: Account[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { data: session } = useSession();
  const userCurrency = (session?.user as any)?.currency || 'USD';
  const { locale: userLocale, messages } = useI18n();
  const copy = messages.pages.recurring;
  const common = messages.pages.common;

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<RecurringInput>({
    resolver: zodResolver(recurringSchema) as any,
    defaultValues: { type: 'EXPENSE', amount: 0, frequency: 'MONTHLY' },
  });

  const selectedType = watch('type');
  const filteredCategories = categories.filter(c => c.type === selectedType);

  const onSubmit = async (data: any) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => formData.set(k, String(v)));
    startTransition(async () => {
      await createRecurringAction(formData);
      setIsModalOpen(false);
      reset();
      router.refresh();
    });
  };

  const handleToggle = (id: string) => {
    startTransition(async () => {
      await toggleRecurringAction(id);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(copy.deleteConfirm)) return;
    startTransition(async () => {
      await deleteRecurringAction(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Loader show={isPending} message={common.processing} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{copy.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{recurring.filter(r => r.isActive).length} {copy.activeCount}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> {copy.addRecurring}</Button>
      </div>

      {recurring.length === 0 ? (
        <EmptyState
          title={copy.noRecurring}
          description={copy.noRecurringHelp}
          icon={<RefreshCw className="h-12 w-12 text-slate-400 dark:text-slate-500" />}
          action={<Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> {copy.addRecurring}</Button>}
        />
      ) : (
        <div className="space-y-2">
          {recurring.map((rec) => (
            <div key={rec.id} className={`flex items-center gap-3 p-4 rounded-2xl border bg-white dark:bg-slate-800/50 transition-all group ${rec.isActive ? 'border-slate-200 dark:border-slate-700/50' : 'border-slate-100 dark:border-slate-700/30 opacity-50'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rec.type === 'INCOME' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                {rec.type === 'INCOME' ? <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{rec.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {getFrequencyLabel(rec.frequency, userLocale)} · {copy.next}: {formatDate(rec.nextRunDate, undefined, userLocale)}
                </p>
              </div>
              <Badge variant={rec.isActive ? 'success' : 'default'}>{rec.isActive ? common.active : common.paused}</Badge>
              <p className={`text-sm font-semibold ${rec.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatCurrency(Number(rec.amount), userCurrency, userLocale)}
              </p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => handleToggle(rec.id)} className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10">
                  <Power className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(rec.id)} className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={copy.addTitle}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-2">
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${selectedType === 'INCOME' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
              <input type="radio" value="INCOME" {...register('type')} className="hidden" /> {getTransactionTypeLabel('INCOME', userLocale)}
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${selectedType === 'EXPENSE' ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
              <input type="radio" value="EXPENSE" {...register('type')} className="hidden" /> {getTransactionTypeLabel('EXPENSE', userLocale)}
            </label>
          </div>
          <Input id="description" label={common.description} error={errors.description?.message} {...register('description')} />
          <Input id="amount" label={common.amount} type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />
          <Select id="accountId" label={common.account} options={accounts.map(a => ({ value: a.id, label: a.name }))} error={errors.accountId?.message} {...register('accountId')} />
          <Select id="categoryId" label={common.category} options={filteredCategories.map(c => ({ value: c.id, label: c.name }))} error={errors.categoryId?.message} {...register('categoryId')} />
          <Select id="frequency" label={common.frequency} options={Object.keys(FREQUENCY_LABELS).map((value) => ({ value, label: getFrequencyLabel(value, userLocale) }))} error={errors.frequency?.message} {...register('frequency')} />
          <Input id="nextRunDate" label={common.startDate} type="date" error={errors.nextRunDate?.message} {...register('nextRunDate')} />
          <Button type="submit" className="w-full" isLoading={isPending}>{copy.create}</Button>
        </form>
      </Modal>
    </div>
  );
}
