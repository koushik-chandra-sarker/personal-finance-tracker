import ProgressBar from '@/components/ui/ProgressBar';
import type { BudgetWithSpent } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface BudgetOverviewProps {
  budgets: BudgetWithSpent[];
  currency?: string;
}

export default function BudgetOverview({ budgets, currency = 'USD' }: BudgetOverviewProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Budget Progress</h3>
        <Link href="/budgets" className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300">
          Manage →
        </Link>
      </div>

      {budgets.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">No budgets set for this month</p>
      ) : (
        <div className="space-y-4">
          {budgets.slice(0, 5).map((budget) => (
            <div key={budget.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.categoryColor }} />
                  <span className="text-sm text-slate-900 dark:text-white">{budget.categoryName}</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatCurrency(budget.spent, currency)} / {formatCurrency(budget.amount, currency)}
                </span>
              </div>
              <ProgressBar
                value={budget.spent}
                max={budget.amount}
                color={budget.categoryColor}
                showLabel={false}
                size="sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
