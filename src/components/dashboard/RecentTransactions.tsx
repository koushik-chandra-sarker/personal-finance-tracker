import { formatCurrency, formatRelativeDate } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  id: string;
  description: string;
  amount: unknown;
  type: string;
  date: Date | string;
  category: { name: string; color: string; icon: string };
  account: { name: string };
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  currency?: string;
}

export default function RecentTransactions({ transactions, currency = 'USD' }: RecentTransactionsProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Transactions</h3>
        <Link href="/transactions" className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300">
          View All →
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No transactions yet</p>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: tx.category.color + '20' }}
              >
                {tx.type === 'INCOME' ?
                  <TrendingUp className="h-5 w-5" style={{ color: tx.category.color }} /> :
                  <TrendingDown className="h-5 w-5" style={{ color: tx.category.color }} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{tx.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tx.category.name} · {tx.account.name} · {formatRelativeDate(tx.date)}
                </p>
              </div>
              <p className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(tx.amount), currency)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
