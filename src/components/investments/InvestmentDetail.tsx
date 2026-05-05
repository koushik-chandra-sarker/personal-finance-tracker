'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { X, ArrowUpRight, ArrowDownRight, Plus, Calendar, Building2, Hash, TrendingUp, PiggyBank, RefreshCw } from 'lucide-react';
import type { ActionResponse } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getInvestmentByIdAction } from '@/actions/investment.actions';

type Account = { id: string; name: string; type: string; balance: number | string; isActive: boolean };

type Investment = {
  id: string; name: string; status: string; institutionName?: string | null;
  accountNumber?: string | null; investedAmount: number | string; currentValue: number | string;
  interestRate?: number | string | null; returnFrequency?: string | null;
  purchaseDate: string; maturityDate?: string | null;
  monthlyInstallment?: number | string | null; quantity?: number | string | null;
  avgBuyPrice?: number | string | null; notes?: string | null;
  typeConfig: { name: string; color: string; returnTypes: string[]; hasMonthlyInstallment: boolean };
  linkedAccount?: { id: string; name: string } | null;
  linkedAccountId?: string | null;
  returns?: { id: string; amount: number | string; type: string; description?: string | null; date: string }[];
  valuations?: { id: string; value: number | string; date: string }[];
};

const FREQ_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', HALF_YEARLY: 'Half Yearly',
  YEARLY: 'Yearly', AT_MATURITY: 'At Maturity', ON_SALE: 'On Sale',
};

export default function InvestmentDetail({ investment: initialInvestment, accounts, currency, loading, onRecordReturn, onAddFunds, onRecordValuation, onClose }: {
  investment: Investment;
  accounts: Account[];
  currency: string;
  loading: boolean;
  onRecordReturn: (fd: FormData) => Promise<ActionResponse>;
  onAddFunds: (fd: FormData) => Promise<ActionResponse>;
  onRecordValuation: (fd: FormData) => Promise<ActionResponse>;
  onClose: () => void;
}) {
  const [investment, setInvestment] = useState<Investment>(initialInvestment);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'RETURNS' | 'VALUATIONS'>('DETAILS');
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showFundsForm, setShowFundsForm] = useState(false);
  const [showValuationForm, setShowValuationForm] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getInvestmentByIdAction(initialInvestment.id).then((data) => {
      setInvestment(data as any);
      setIsLoadingData(false);
    }).catch(console.error);
  }, [initialInvestment.id]);

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
    if (result.success) {
      setShowReturnForm(false);
      getInvestmentByIdAction(initialInvestment.id).then((data) => setInvestment(data as any)).catch(console.error);
    }
    else setMessage(result.message);
  };

  const handleAddFunds = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    const fd = new FormData(e.currentTarget);
    const result = await onAddFunds(fd);
    if (result.success) {
      setShowFundsForm(false);
      getInvestmentByIdAction(initialInvestment.id).then((data) => setInvestment(data as any)).catch(console.error);
    }
    else setMessage(result.message);
  };

  const handleValuation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    const fd = new FormData(e.currentTarget);
    const result = await onRecordValuation(fd);
    if (result.success) {
      setShowValuationForm(false);
      getInvestmentByIdAction(initialInvestment.id).then((data) => setInvestment(data as any)).catch(console.error);
    }
    else setMessage(result.message);
  };

  const chartData = [...(investment.valuations || [])]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(v => ({ date: formatDate(v.date), value: Number(v.value) }));

  // Add the initial purchase as the first point if no valuations exist or purchase is earlier
  if (chartData.length === 0 || (chartData.length > 0 && new Date(investment.purchaseDate) < new Date((investment.valuations || [])[0]?.date || investment.purchaseDate))) {
    chartData.unshift({ date: formatDate(investment.purchaseDate), value: invested });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] bg-black/60 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700/50 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{investment.name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{investment.typeConfig.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Invested</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(invested, currency)}</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Current</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(current, currency)}</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Gain/Loss</p>
              <p className={cn('text-sm font-bold mt-1', gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                {gain >= 0 ? '+' : ''}{formatCurrency(gain, currency)} <span className="text-[10px] font-medium block sm:inline">({gainPct}%)</span>
              </p>
            </div>
          </div>

          <div className="flex border-b border-slate-200 dark:border-slate-700 mt-5">
            <button onClick={() => setActiveTab('DETAILS')} className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", activeTab === 'DETAILS' ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Details</button>
            <button onClick={() => setActiveTab('VALUATIONS')} className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", activeTab === 'VALUATIONS' ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Valuations</button>
            <button onClick={() => setActiveTab('RETURNS')} className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", activeTab === 'RETURNS' ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Returns</button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
          {isLoadingData ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-800/50 z-10">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : null}

          {activeTab === 'DETAILS' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {investment.institutionName && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
                    <Building2 className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Institution</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{investment.institutionName}</p>
                    </div>
                  </div>
                )}
                {investment.accountNumber && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
                    <Hash className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Account No.</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{investment.accountNumber}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
                  <Calendar className="h-5 w-5 text-indigo-500" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Purchased</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(investment.purchaseDate)}</p>
                  </div>
                </div>
                {investment.maturityDate && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
                    <Calendar className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Maturity Date</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(investment.maturityDate)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {investment.interestRate && (
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Interest Rate</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{Number(investment.interestRate)}% {investment.returnFrequency && <span className="text-xs font-normal text-slate-400">({FREQ_LABELS[investment.returnFrequency] || investment.returnFrequency})</span>}</span>
                  </div>
                )}
                {investment.quantity && (
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Quantity</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{Number(investment.quantity)} <span className="text-xs font-normal text-slate-400">@ {formatCurrency(Number(investment.avgBuyPrice || 0), currency)}</span></span>
                  </div>
                )}
                {investment.monthlyInstallment && (
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Monthly Installment</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(Number(investment.monthlyInstallment), currency)}</span>
                  </div>
                )}
              </div>

              {investment.notes && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm text-amber-900 dark:text-amber-200">{investment.notes}</p>
                </div>
              )}

              <div className="pt-2">
                <button onClick={() => setShowFundsForm(!showFundsForm)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                  <PiggyBank className="h-4 w-4" /> {investment.typeConfig.hasMonthlyInstallment ? 'Pay Installment' : 'Add Funds'}
                </button>
              </div>

              {showFundsForm && (
                <form onSubmit={handleAddFunds} className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">This will deduct the amount from the selected account and increase your invested amount.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input name="amount" type="number" step="0.01" required placeholder="Amount" defaultValue={investment.monthlyInstallment ? Number(investment.monthlyInstallment) : ''}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                    <select name="accountId" required defaultValue={investment.linkedAccountId || ''}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500">
                      <option value="">Select Account...</option>
                      {accounts.filter(a => a.isActive).map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance), currency)})</option>)}
                    </select>
                  </div>
                  <input name="description" placeholder="Description (optional)" defaultValue={investment.typeConfig.hasMonthlyInstallment ? 'Monthly Installment' : 'Additional Funds'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                  {message && <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2">{message}</p>}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setShowFundsForm(false)} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50">{loading ? 'Saving...' : 'Add Funds'}</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'VALUATIONS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Growth Chart</h3>
                <button onClick={() => setShowValuationForm(!showValuationForm)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                  <TrendingUp className="h-3.5 w-3.5" /> Record Valuation
                </button>
              </div>

              {showValuationForm && (
                <form onSubmit={handleValuation} className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Record the current market value of this investment to track its growth.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input name="value" type="number" step="0.01" required placeholder="Current Value" defaultValue={current}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                    <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  {message && <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2">{message}</p>}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setShowValuationForm(false)} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50">{loading ? 'Saving...' : 'Save Valuation'}</button>
                  </div>
                </form>
              )}

              {chartData.length > 1 ? (
                <div className="h-64 mt-4 -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.2} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `৳${(val/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(val) => formatCurrency(Number(val), currency)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-10 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <TrendingUp className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Not enough data for chart</p>
                  <p className="text-xs text-slate-400 mt-1">Record a new valuation to see the growth line.</p>
                </div>
              )}

              <div className="space-y-2 mt-6">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">History</h3>
                {chartData.slice().reverse().map((v, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{v.date}</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(v.value, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'RETURNS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
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
                  <div className="grid grid-cols-2 gap-3">
                    <input name="amount" type="number" step="0.01" required placeholder="Amount"
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                    <select name="type" required
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500">
                      <option value="">Type...</option>
                      {(investment.typeConfig.returnTypes.length > 0 ? investment.typeConfig.returnTypes : ['INTEREST', 'DIVIDEND', 'CAPITAL_GAIN', 'COUPON', 'RENTAL', 'OTHER']).map((t) => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                  <input name="description" placeholder="Description (optional)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                  {message && <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2">{message}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowReturnForm(false)} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
                  </div>
                </form>
              )}

              {(investment.returns || []).length === 0 && !showReturnForm ? (
                <div className="text-center py-10 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <ArrowUpRight className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No returns recorded yet</p>
                </div>
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
          )}
        </div>
      </div>
    </div>
  );
}
