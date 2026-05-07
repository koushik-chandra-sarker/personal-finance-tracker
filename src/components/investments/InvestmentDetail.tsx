'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { X, ArrowUpRight, Plus, Calendar, Building2, Hash, TrendingUp, PiggyBank, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { ActionResponse } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getInvestmentByIdAction } from '@/actions/investment.actions';

type Account = { id: string; name: string; type: string; balance: number | string; isActive: boolean };
type ScheduleStatus = 'PAID' | 'MISSED' | 'DUE';
type InvestmentProjection = {
  dpsInstallments?: Array<{ dueDate: string; amount: number; status: ScheduleStatus }>;
  sanchayapatraPayouts?: Array<{ date: string; amount: number; grossAmount: number; taxAmount: number; label: string }>;
  maturity?: { date: string; principal: number; projectedReturn: number; projectedValue: number; taxAmount: number };
};

type Investment = {
  id: string; name: string; status: string; institutionName?: string | null;
  accountNumber?: string | null; investedAmount: number | string; currentValue: number | string;
  interestRate?: number | string | null; returnFrequency?: string | null;
  purchaseDate: string; maturityDate?: string | null;
  monthlyInstallment?: number | string | null; installmentDueDay?: number | null;
  missedInstallmentCount?: number; lastMissedInstallmentOn?: string | null; lastInstallmentPaidOn?: string | null;
  quantity?: number | string | null;
  avgBuyPrice?: number | string | null; notes?: string | null;
  typeConfig: { name: string; color: string; returnTypes: string[]; hasMonthlyInstallment: boolean };
  linkedAccount?: { id: string; name: string } | null;
  linkedAccountId?: string | null;
  sanchayapatraConfig?: {
    id: string; name: string; rate: number | string; payoutFrequency: string;
    taxThreshold: number | string; taxRateBelow: number | string; taxRateAbove: number | string;
  } | null;
  projection?: InvestmentProjection;
  returns?: { id: string; amount: number | string; type: string; description?: string | null; date: string }[];
  valuations?: { id: string; value: number | string; date: string }[];
};

const FREQ_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', HALF_YEARLY: 'Half Yearly',
  YEARLY: 'Yearly', AT_MATURITY: 'At Maturity', ON_SALE: 'On Sale',
};

const SCHEDULE_STATUS_STYLES: Record<ScheduleStatus, string> = {
  PAID: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  MISSED: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  DUE: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
};

export default function InvestmentDetail({ 
  investment: initialInvestment, accounts, currency, loading, 
  onRecordReturn, onAddFunds, onRecordValuation, onCloseInvestment, onClose, initialAction = null
}: {
  investment: Investment;
  accounts: Account[];
  currency: string;
  loading: boolean;
  onRecordReturn: (fd: FormData) => Promise<ActionResponse>;
  onAddFunds: (fd: FormData) => Promise<ActionResponse>;
  onRecordValuation: (fd: FormData) => Promise<ActionResponse>;
  onCloseInvestment: (id: string, fd: FormData) => Promise<ActionResponse>;
  onClose: () => void;
  initialAction?: 'pay-installment' | null;
}) {
  const [investment, setInvestment] = useState<Investment>(initialInvestment);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'RETURNS' | 'VALUATIONS'>('DETAILS');
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showFundsForm, setShowFundsForm] = useState(initialAction === 'pay-installment');
  const [showValuationForm, setShowValuationForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getInvestmentByIdAction(initialInvestment.id).then((data) => {
      setInvestment(data as Investment);
      setIsLoadingData(false);
    }).catch((error) => {
      console.error(error);
      setIsLoadingData(false);
    });
  }, [initialInvestment.id]);

  const invested = Number(investment.investedAmount);
  const current = Number(investment.currentValue);
  const gain = current - invested;
  const gainPct = invested > 0 ? ((gain / invested) * 100).toFixed(1) : '0.0';
  const totalReturns = (investment.returns || []).reduce((s, r) => s + Number(r.amount), 0);
  const isInstallmentInvestment = investment.typeConfig.hasMonthlyInstallment && Number(investment.monthlyInstallment || 0) > 0;
  const projection = investment.projection;

  const handleReturn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    const fd = new FormData(e.currentTarget);
    const result = await onRecordReturn(fd);
    if (result.success) {
      setShowReturnForm(false);
      getInvestmentByIdAction(initialInvestment.id).then((data) => setInvestment(data as Investment)).catch(console.error);
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
      getInvestmentByIdAction(initialInvestment.id).then((data) => setInvestment(data as Investment)).catch(console.error);
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
      getInvestmentByIdAction(initialInvestment.id).then((data) => setInvestment(data as Investment)).catch(console.error);
    }
    else setMessage(result.message);
  };

  const handleClose = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    const fd = new FormData(e.currentTarget);
    const result = await onCloseInvestment(investment.id, fd);
    if (result.success) {
      setShowCloseForm(false);
      onClose(); // Close the modal after selling/maturing
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
                  <>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Monthly Installment</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(Number(investment.monthlyInstallment), currency)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Due Day</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Day {investment.installmentDueDay || 5}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Missed Payments</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{investment.missedInstallmentCount || 0}</span>
                    </div>
                    {investment.lastInstallmentPaidOn && (
                      <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Last Paid</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(investment.lastInstallmentPaidOn)}</span>
                      </div>
                    )}
                  </>
                )}
                {investment.sanchayapatraConfig && (
                  <>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Sanchayapatra Scheme</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{investment.sanchayapatraConfig.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Payout Rule</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {Number(investment.sanchayapatraConfig.rate)}% / {investment.sanchayapatraConfig.payoutFrequency.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {(projection?.dpsInstallments?.length || projection?.sanchayapatraPayouts?.length || projection?.maturity) && (
                <div className="space-y-3">
                  {projection.dpsInstallments && projection.dpsInstallments.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Installment Schedule</h3>
                        <span className="text-xs text-slate-400">Unpaid + upcoming</span>
                      </div>
                      <div className="space-y-2">
                        {projection.dpsInstallments.map((item) => (
                          <div key={item.dueDate} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/30">
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatDate(item.dueDate)}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{formatCurrency(item.amount, currency)}</p>
                            </div>
                            <span className={cn('rounded-full px-2 py-1 text-[10px] font-bold', SCHEDULE_STATUS_STYLES[item.status])}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {projection.sanchayapatraPayouts && projection.sanchayapatraPayouts.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Projected Payouts</h3>
                        <span className="text-xs text-slate-400">After tax</span>
                      </div>
                      <div className="space-y-2">
                        {projection.sanchayapatraPayouts.map((item) => (
                          <div key={`${item.date}-${item.label}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/30">
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatDate(item.date)}</p>
                              <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{item.label}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.amount, currency)}</p>
                              <p className="text-[11px] text-slate-400">Tax {formatCurrency(item.taxAmount, currency)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {projection.maturity && (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">Projected Maturity</p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatDate(projection.maturity.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-slate-900 dark:text-white">{formatCurrency(projection.maturity.projectedValue, currency)}</p>
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">Profit {formatCurrency(projection.maturity.projectedReturn, currency)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {investment.notes && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm text-amber-900 dark:text-amber-200">{investment.notes}</p>
                </div>
              )}

              <div className="pt-2">
                <button onClick={() => setShowFundsForm(!showFundsForm)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                  <PiggyBank className="h-4 w-4" /> {isInstallmentInvestment ? 'Pay Installment' : 'Add Funds'}
                </button>
              </div>

              {showFundsForm && (
                <form onSubmit={handleAddFunds} className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {isInstallmentInvestment ? 'This will pay the oldest unpaid installment from the selected account.' : 'This will deduct the amount from the selected account and increase your invested amount.'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <input name="amount" type="number" step="0.01" required placeholder="Amount" defaultValue={investment.monthlyInstallment ? Number(investment.monthlyInstallment) : ''}
                      readOnly={isInstallmentInvestment}
                      className={cn(
                        'px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500',
                        isInstallmentInvestment && 'bg-slate-100 text-slate-500 dark:bg-slate-900/40 dark:text-slate-400'
                      )} />
                    <select name="accountId" required defaultValue={investment.linkedAccountId || ''}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500">
                      <option value="">Select Account...</option>
                      {accounts.filter(a => a.isActive).map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance), currency)})</option>)}
                    </select>
                  </div>
                  <input name="description" placeholder="Description (optional)" defaultValue={isInstallmentInvestment ? `DPS installment for ${investment.name}` : 'Additional Funds'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                  {message && <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2">{message}</p>}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setShowFundsForm(false)} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50">{loading ? 'Saving...' : isInstallmentInvestment ? 'Pay Installment' : 'Add Funds'}</button>
                  </div>
                </form>
              )}

              {investment.status === 'ACTIVE' && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50">
                  <button onClick={() => setShowCloseForm(!showCloseForm)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Mark as Matured / Sell
                  </button>
                </div>
              )}

              {showCloseForm && (
                <form onSubmit={handleClose} className="space-y-3 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Update the status when the investment matures or is sold. This will record a final payout if a value and account are provided.</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <select name="status" required className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500">
                      <option value="MATURED">Matured</option>
                      <option value="SOLD">Sold</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                    <input name="closeDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input name="finalValue" type="number" step="0.01" required placeholder="Final Payout Value" defaultValue={current}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                    <select name="linkedAccountId" defaultValue={investment.linkedAccountId || ''}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500">
                      <option value="">No payout to account</option>
                      {accounts.filter(a => a.isActive).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>

                  <input name="description" placeholder="Closing note (optional)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500" />

                  {message && <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2">{message}</p>}
                  
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setShowCloseForm(false)} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50">{loading ? 'Processing...' : 'Confirm Close'}</button>
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">Return payments are deposited into the selected account.</p>
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
                  <div className="grid grid-cols-2 gap-3">
                    <select name="accountId" required defaultValue={investment.linkedAccountId || ''}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500">
                      <option value="">Deposit Account...</option>
                      {accounts.filter(a => a.isActive).map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance), currency)})</option>)}
                    </select>
                    <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
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
