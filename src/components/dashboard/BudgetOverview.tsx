import ProgressBar from '@/components/ui/ProgressBar';
import type { BudgetWithSpent } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';

interface BudgetOverviewProps {
  budgets: BudgetWithSpent[];
  currency?: string;
}

export default function BudgetOverview({ budgets, currency = 'USD' }: BudgetOverviewProps) {
  const rolloverEnabledCount = budgets.filter((budget) => budget.rolloverEnabled).length;
  const totalRollover = budgets.reduce((sum, budget) => sum + budget.rolloverAmount, 0);
  const totalProjectedRollover = budgets.reduce((sum, budget) => sum + budget.projectedRolloverAmount, 0);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Budget Progress</h3>
        <Link href="/budgets" className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300">
          Manage →
        </Link>
      </div>

      {budgets.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 text-center py-6">No budgets set for this month</p>
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-500/10 p-4">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <RotateCcw className="h-4 w-4" />
              <span className="text-sm font-medium">Rollover ready</span>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Enable rollover when setting a budget to carry unused money forward.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-500/10 p-4">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <RotateCcw className="h-4 w-4" />
              <span className="text-sm font-medium">Rollover</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{rolloverEnabledCount}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">On</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(totalRollover, currency)}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">In</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(totalProjectedRollover, currency)}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Next</p>
              </div>
            </div>
          </div>

          {budgets.slice(0, 5).map((budget) => (
            <div key={budget.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.categoryColor }} />
                  <span className="text-sm text-slate-900 dark:text-white">{budget.categoryName}</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatCurrency(budget.spent, currency)} / {formatCurrency(budget.effectiveAmount, currency)}
                </span>
              </div>
              <ProgressBar
                value={budget.spent}
                max={budget.effectiveAmount}
                color={budget.categoryColor}
                showLabel={false}
                size="sm"
              />
              {(budget.rolloverAmount > 0 || budget.projectedRolloverAmount > 0) && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {budget.rolloverAmount > 0 && (
                    <span>Rolled in {formatCurrency(budget.rolloverAmount, currency)}</span>
                  )}
                  {budget.projectedRolloverAmount > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Next {formatCurrency(budget.projectedRolloverAmount, currency)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
