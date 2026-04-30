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
import { Plus, Trash2, PieChart, Edit2, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
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
    defaultValues: { month: currentMonth, year: currentYear, amount: 0, rolloverEnabled: false },
  });

  const onSubmit = async (data: BudgetInput) => {
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
      rolloverEnabled: budget.rolloverEnabled,
      month: budget.month,
      year: budget.year,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
    reset({ month: currentMonth, year: currentYear, amount: 0, rolloverEnabled: false });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this budget?')) return;
    startTransition(async () => {
      await deleteBudgetAction(id);
      router.refresh();
    });
  };

  const totalBaseBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalRollover = budgets.reduce((s, b) => s + b.rolloverAmount, 0);
  const totalProjectedRollover = budgets.reduce((s, b) => s + b.projectedRolloverAmount, 0);
  const totalBudget = budgets.reduce((s, b) => s + b.effectiveAmount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const rolloverEnabledCount = budgets.filter((budget) => budget.rolloverEnabled).length;

  return (
    <div className="space-y-6">
      <Loader show={isPending} message={editingBudget ? "Updating budget..." : "Creating budget..."} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-4 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Budgets</h1>
            <MonthYearPicker month={currentMonth} year={currentYear} route="/budgets" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monthly Usage — {formatCurrency(totalSpent, userCurrency)} / {formatCurrency(totalBudget, userCurrency)}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> Set Budget</Button>
      </div>

      {/* Overall progress */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
              <div>
                <span className="text-sm text-slate-900 dark:text-white font-medium">Overall Budget Usage</span>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>Base {formatCurrency(totalBaseBudget, userCurrency)}</span>
                  {totalRollover > 0 && (
                    <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                      <RotateCcw className="h-3 w-3" />
                      Rolled in {formatCurrency(totalRollover, userCurrency)}
                    </span>
                  )}
                  {totalProjectedRollover > 0 && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <RotateCcw className="h-3 w-3" />
                      Projected rollover {formatCurrency(totalProjectedRollover, userCurrency)}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">{totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%</span>
            </div>
            <ProgressBar value={totalSpent} max={totalBudget} size="lg" showLabel={false} />
          </div>

          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-500/10 p-6">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <RotateCcw className="h-5 w-5" />
              <span className="text-sm font-semibold">Budget Rollover</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{rolloverEnabledCount}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Enabled</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(totalRollover, userCurrency)}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Rolled in</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(totalProjectedRollover, userCurrency)}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Next</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-600 dark:text-slate-300">
              Turn rollover on in a budget to carry unused money into the next month.
            </p>
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-500/10 p-6">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <RotateCcw className="h-5 w-5" />
              <span className="text-sm font-semibold">Budget Rollover</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Create a budget and enable rollover to carry unused money into the next month.
            </p>
          </div>
          <EmptyState
            title="No budgets set"
            description="Set monthly budgets per category to track your spending"
            icon={<PieChart className="h-12 w-12 text-slate-500" />}
            action={<Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> Set Budget</Button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => (
            <div key={budget.id} className="group rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5 hover:border-slate-300 dark:hover:border-slate-600/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.categoryColor }} />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{budget.categoryName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                    <RotateCcw className="h-3 w-3" />
                    {budget.rolloverEnabled ? 'On' : 'Off'}
                  </span>
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
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 p-3 text-center">
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Base</p>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">{formatCurrency(budget.amount, userCurrency)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Rolled in</p>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">{formatCurrency(budget.rolloverAmount, userCurrency)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Effective</p>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">{formatCurrency(budget.effectiveAmount, userCurrency)}</p>
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>{formatCurrency(budget.spent, userCurrency)} spent</span>
                <span>{formatCurrency(budget.effectiveAmount, userCurrency)} limit</span>
              </div>
              {budget.rolloverAmount > 0 && (
                <div className="mb-2 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400">
                  <RotateCcw className="h-3 w-3" />
                  <span>{formatCurrency(budget.rolloverAmount, userCurrency)} rolled over from prior budgets</span>
                </div>
              )}
              <ProgressBar value={budget.spent} max={budget.effectiveAmount} color={budget.categoryColor} size="md" showLabel={false} />
              <p className={`text-xs mt-2 ${budget.percentage > 100 ? 'text-red-500 dark:text-red-400' : budget.percentage > 80 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {budget.percentage > 100 ? `Over budget by ${formatCurrency(Math.abs(budget.remaining), userCurrency)}!` :
                  budget.percentage > 80 ? 'Approaching limit' :
                    `${formatCurrency(budget.remaining, userCurrency)} remaining`}
              </p>
              {budget.rolloverEnabled && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <RotateCcw className="h-3 w-3" />
                  {budget.projectedRolloverAmount > 0
                    ? `${formatCurrency(budget.projectedRolloverAmount, userCurrency)} projected to roll into next month`
                    : 'Unused amount rolls into next month'}
                </p>
              )}
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
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/40 p-4 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
              {...register('rolloverEnabled')}
            />
            <span>
              <span className="block text-sm font-medium text-slate-900 dark:text-white">Roll unused amount into next month</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
                Any remaining budget after this month&apos;s spending will increase the next month&apos;s effective limit.
              </span>
            </span>
          </label>
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
