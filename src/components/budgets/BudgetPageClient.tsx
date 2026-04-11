'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { budgetSchema, type BudgetInput } from '@/lib/validations/budget';
import { createBudgetAction, deleteBudgetAction } from '@/actions/budget.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import MonthYearPicker from '@/components/dashboard/MonthYearPicker';
import Loader from '@/components/ui/Loader';
import { Plus, Trash2, PieChart, Edit2 } from 'lucide-react';
import { formatCurrency, getMonthName } from '@/lib/utils';
import type { BudgetWithSpent } from '@/types';

interface Category { id: string; name: string; type: string; color: string; }

export default function BudgetPageClient({ budgets, categories, currentMonth, currentYear }: { budgets: BudgetWithSpent[]; categories: Category[]; currentMonth: number; currentYear: number; }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithSpent | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  const { data: session } = useSession();
  const userCurrency = (session?.user as any)?.currency || 'USD';

  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema) as any,
    defaultValues: { month: currentMonth, year: currentYear, amount: 0 },
  });

  const onSubmit = async (data: any) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => formData.set(k, String(v)));
    startTransition(async () => {
      await createBudgetAction(formData);
      handleCloseModal();
      router.refresh();
    });
  };

  const handleEdit = (budget: BudgetWithSpent) => {
    setEditingBudget(budget);
    reset({
      categoryId: budget.categoryId,
      amount: budget.amount,
      month: budget.month,
      year: budget.year,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
    reset({ month: currentMonth, year: currentYear, amount: 0 });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this budget?')) return;
    startTransition(async () => {
      await deleteBudgetAction(id);
      router.refresh();
    });
  };

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="space-y-6">
      <Loader show={isPending} message={editingBudget ? "Updating budget..." : "Creating budget..."} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Budgets</h1>
            <MonthYearPicker month={currentMonth} year={currentYear} route="/budgets" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Monthly Usage — {formatCurrency(totalSpent, userCurrency)} / {formatCurrency(totalBudget, userCurrency)}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> Set Budget</Button>
      </div>

      {/* Overall progress */}
      {budgets.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 p-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-slate-900 dark:text-white font-medium">Overall Budget Usage</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%</span>
          </div>
          <ProgressBar value={totalSpent} max={totalBudget} size="lg" showLabel={false} />
        </div>
      )}

      {budgets.length === 0 ? (
        <EmptyState
          title="No budgets set"
          description="Set monthly budgets per category to track your spending"
          icon={<PieChart className="h-12 w-12 text-slate-500" />}
          action={<Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> Set Budget</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => (
            <div key={budget.id} className="group rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5 hover:border-slate-300 dark:hover:border-slate-600/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.categoryColor }} />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{budget.categoryName}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => handleEdit(budget)}
                    className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(budget.id)}
                    className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>{formatCurrency(budget.spent, userCurrency)} spent</span>
                <span>{formatCurrency(budget.amount, userCurrency)} limit</span>
              </div>
              <ProgressBar value={budget.spent} max={budget.amount} color={budget.categoryColor} size="md" showLabel={false} />
              <p className={`text-xs mt-2 ${budget.percentage > 100 ? 'text-red-500 dark:text-red-400' : budget.percentage > 80 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {budget.percentage > 100 ? `Over budget by ${formatCurrency(budget.spent - budget.amount, userCurrency)}!` :
                  budget.percentage > 80 ? 'Approaching limit' :
                    `${formatCurrency(budget.amount - budget.spent, userCurrency)} remaining`}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingBudget ? "Edit Budget" : "Set Budget"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            id="categoryId"
            label="Category"
            options={expenseCategories.map(c => ({ value: c.id, label: c.name }))}
            error={errors.categoryId?.message}
            {...register('categoryId')}
            disabled={!!editingBudget}
          />
          {editingBudget && <input type="hidden" {...register('categoryId')} />}
          <Input id="amount" label="Budget Amount" type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />
          <input type="hidden" {...register('month')} />
          <input type="hidden" {...register('year')} />
          <Button type="submit" className="w-full" isLoading={isPending}>
            {editingBudget ? "Update Budget" : "Save Budget"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
