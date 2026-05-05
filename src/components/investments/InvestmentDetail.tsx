'use client';

import { useState } from 'react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { X, ArrowUpRight, ArrowDownRight, Plus, Calendar, Building2, Hash } from 'lucide-react';
import type { ActionResponse } from '@/types';

type Investment = {
  id: string; name: string; status: string; institutionName?: string | null;
  accountNumber?: string | null; investedAmount: number | string; currentValue: number | string;
  interestRate?: number | string | null; returnFrequency?: string | null;
  purchaseDate: string; maturityDate?: string | null;
  monthlyInstallment?: number | string | null; quantity?: number | string | null;
  avgBuyPrice?: number | string | null; notes?: string | null;
  typeConfig: { name: string; color: string; returnTypes: string[] };
  linkedAccount?: { id: string; name: string } | null;
  returns?: { id: string; amount: number | string; type: string; description?: string | null; date: string }[];
};

const FREQ_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', HALF_YEARLY: 'Half Yearly',
  YEARLY: 'Yearly', AT_MATURITY: 'At Maturity', ON_SALE: 'On Sale',
};

export default function InvestmentDetail({ investment, currency, loading, onRecordReturn, onClose }: {
  investment: Investment; currency: string; loading: boolean;
  onRecordReturn: (fd: FormData) => Promise<ActionResponse>;
  onClose: () => void;
}) {
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [message, setMessage] = useState('');
  const invested = Number(investment.investedAmount);
  const current = Number(investment.currentValue);
  const gain = current - invested;
  const gainPct = invested > 0 ? ((gain / invested) * 100).toFixed(1) : '0.0';
  const totalReturns = (investment.returns || []).reduce((s, r) => s + Number(r.amount), 0);

  const handleReturn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    const fd = new FormData(e.currentTarget);
    const result = await onRecordReturn(fd);
    if (result.success) setShowReturnForm(false);
    else setMessage(result.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] bg-black/60 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700/50 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{investment.name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{investment.typeConfig.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/30 p-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Invested</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(invested, currency)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/30 p-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Current</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(current, currency)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/30 p-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Gain/Loss</p>
              <p className={cn('text-sm font-bold mt-1', gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                {gain >= 0 ? '+' : ''}{formatCurrency(gain, currency)} ({gainPct}%)
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-2.5">
            {investment.institutionName && (
              <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-slate-400" /><span className="text-slate-600 dark:text-slate-300">{investment.institutionName}</span></div>
            )}
            {investment.accountNumber && (
              <div className="flex items-center gap-2 text-sm"><Hash className="h-4 w-4 text-slate-400" /><span className="text-slate-600 dark:text-slate-300">{investment.accountNumber}</span></div>
            )}
            <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-slate-400" /><span className="text-slate-600 dark:text-slate-300">Purchased: {formatDate(investment.purchaseDate)}</span></div>
            {investment.maturityDate && (
              <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-slate-400" /><span className="text-slate-600 dark:text-slate-300">Maturity: {formatDate(investment.maturityDate)}</span></div>
            )}
            {investment.interestRate && (
              <div className="text-sm text-slate-600 dark:text-slate-300">Interest Rate: <span className="font-semibold">{Number(investment.interestRate)}%</span> {investment.returnFrequency && <span className="text-slate-400">({FREQ_LABELS[investment.returnFrequency] || investment.returnFrequency})</span>}</div>
            )}
            {investment.quantity && (
              <div className="text-sm text-slate-600 dark:text-slate-300">Qty: <span className="font-semibold">{Number(investment.quantity)}</span> × <span className="font-semibold">{formatCurrency(Number(investment.avgBuyPrice || 0), currency)}</span></div>
            )}
            {investment.monthlyInstallment && (
              <div className="text-sm text-slate-600 dark:text-slate-300">Monthly Installment: <span className="font-semibold">{formatCurrency(Number(investment.monthlyInstallment), currency)}</span></div>
            )}
            {investment.notes && <p className="text-sm text-slate-500 dark:text-slate-400 italic">{investment.notes}</p>}
          </div>

          {/* Returns Section */}
          <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Returns</h3>
                {totalReturns > 0 && <p className="text-xs text-emerald-600 dark:text-emerald-400">Total: {formatCurrency(totalReturns, currency)}</p>}
              </div>
              <button onClick={() => setShowReturnForm(!showReturnForm)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Record Return
              </button>
            </div>

            {showReturnForm && (
              <form onSubmit={handleReturn} className="space-y-3 mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700/50">
                {message && <p className="text-xs text-rose-600">{message}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <input name="amount" type="number" step="0.01" required placeholder="Amount"
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                  <select name="type" required
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500">
                    <option value="">Type...</option>
                    {(investment.typeConfig.returnTypes.length > 0 ? investment.typeConfig.returnTypes : ['INTEREST', 'DIVIDEND', 'CAPITAL_GAIN', 'COUPON', 'RENTAL', 'OTHER']).map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                <input name="description" placeholder="Description (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowReturnForm(false)} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            )}

            {(investment.returns || []).length === 0 && !showReturnForm ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No returns recorded yet</p>
            ) : (
              <div className="space-y-2">
                {(investment.returns || []).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{r.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-400">{formatDate(r.date)}{r.description && ` — ${r.description}`}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(Number(r.amount), currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
