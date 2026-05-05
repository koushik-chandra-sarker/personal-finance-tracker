'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { 
  createInvestmentAction, updateInvestmentAction, deleteInvestmentAction, 
  recordReturnAction, addFundsAction, recordValuationAction 
} from '@/actions/investment.actions';
import {
  TrendingUp, TrendingDown, Plus, Search, Filter, Trash2, Edit3, X,
  Landmark, Banknote, PiggyBank, BarChart3, Coins, Building2, Shield,
  ScrollText, FileText, ChevronDown, ArrowUpRight, ArrowDownRight, Wallet, Eye, Settings2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Link from 'next/link';
import InvestmentForm from './InvestmentForm';
import InvestmentDetail from './InvestmentDetail';

type TypeConfig = {
  id: string; slug: string; name: string; description?: string | null;
  icon: string; color: string; isSystem: boolean;
  hasInterestRate: boolean; hasReturnFrequency: boolean; hasMaturityDate: boolean;
  hasMonthlyInstallment: boolean; hasQuantity: boolean; hasInstitution: boolean;
  hasAccountNumber: boolean; returnTypes: string[];
};

type Account = { id: string; name: string; type: string; balance: number | string; isActive: boolean };

type Investment = {
  id: string; name: string; status: string; institutionName?: string | null;
  accountNumber?: string | null; investedAmount: number | string; currentValue: number | string;
  interestRate?: number | string | null; returnFrequency?: string | null;
  purchaseDate: string; maturityDate?: string | null; soldDate?: string | null;
  monthlyInstallment?: number | string | null; quantity?: number | string | null;
  avgBuyPrice?: number | string | null; notes?: string | null;
  color: string; icon: string; typeConfigId: string;
  typeConfig: TypeConfig;
  linkedAccount?: { id: string; name: string } | null;
  _count: { returns: number; valuations: number };
};

type Allocation = { typeConfigId: string; name: string; color: string; total: number; percentage: number };
type Summary = { totalInvested: number; totalCurrentValue: number; totalReturns: number; unrealisedGainLoss: number; activeCount: number };

const ICON_MAP: Record<string, React.ElementType> = {
  'landmark': Landmark, 'banknote': Banknote, 'piggy-bank': PiggyBank,
  'trending-up': TrendingUp, 'bar-chart-3': BarChart3, 'file-text': FileText,
  'coins': Coins, 'building-2': Building2, 'shield': Shield, 'scroll': ScrollText,
};

function getIcon(name: string) { return ICON_MAP[name] || TrendingUp; }

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  MATURED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  SOLD: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
};

export default function InvestmentPageClient({
  investments: initial, typeConfigs, accounts, summary, allocation, currency,
}: {
  investments: Investment[]; typeConfigs: TypeConfig[]; accounts: Account[];
  summary: Summary; allocation: Allocation[]; currency: string;
}) {
  const router = useRouter();
  const [investments, setInvestments] = useState(initial);
  
  // Sync state with props when router.refresh() fetches new data
  useEffect(() => {
    setInvestments(initial);
  }, [initial]);
  
  const [showForm, setShowForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [viewingInvestment, setViewingInvestment] = useState<Investment | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = investments.filter((inv) => {
    if (search && !inv.name.toLowerCase().includes(search.toLowerCase()) &&
      !(inv.institutionName?.toLowerCase().includes(search.toLowerCase()))) return false;
    if (filterType && inv.typeConfigId !== filterType) return false;
    if (filterStatus && inv.status !== filterStatus) return false;
    return true;
  });

  const handleCreate = async (formData: FormData) => {
    setLoading(true);
    try {
      const result = await createInvestmentAction(formData);
      if (result.success) {
        setShowForm(false);
        router.refresh();
      }
      return result;
    } finally { setLoading(false); }
  };

  const handleUpdate = async (id: string, formData: FormData) => {
    setLoading(true);
    try {
      const result = await updateInvestmentAction(id, formData);
      if (result.success) {
        setEditingInvestment(null);
        router.refresh();
      }
      return result;
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteInvestmentAction(id);
      setDeleteId(null);
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleRecordReturn = async (investmentId: string, formData: FormData) => {
    setLoading(true);
    try {
      const result = await recordReturnAction(investmentId, formData);
      if (result.success) router.refresh();
      return result;
    } finally { setLoading(false); }
  };

  const handleAddFunds = async (investmentId: string, formData: FormData) => {
    setLoading(true);
    try {
      const result = await addFundsAction(investmentId, formData);
      if (result.success) router.refresh();
      return result;
    } finally { setLoading(false); }
  };

  const handleRecordValuation = async (investmentId: string, formData: FormData) => {
    setLoading(true);
    try {
      const result = await recordValuationAction(investmentId, formData);
      if (result.success) router.refresh();
      return result;
    } finally { setLoading(false); }
  };

  const gainLossPercent = summary.totalInvested > 0
    ? ((summary.unrealisedGainLoss / summary.totalInvested) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Investments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track your portfolio &amp; returns</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/investments/types"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
          >
            <Settings2 className="h-4 w-4" /> Manage Types
          </Link>
          <button
            onClick={() => { setEditingInvestment(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
          >
            <Plus className="h-4 w-4" /> Add Investment
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invested', value: summary.totalInvested, icon: Wallet, gradient: 'from-blue-500 to-cyan-500' },
          { label: 'Current Value', value: summary.totalCurrentValue, icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500' },
          { label: 'Total Returns', value: summary.totalReturns, icon: ArrowUpRight, gradient: 'from-amber-500 to-orange-500' },
          {
            label: 'Gain/Loss', value: summary.unrealisedGainLoss,
            icon: summary.unrealisedGainLoss >= 0 ? ArrowUpRight : ArrowDownRight,
            gradient: summary.unrealisedGainLoss >= 0 ? 'from-emerald-500 to-green-500' : 'from-rose-500 to-red-500',
            suffix: ` (${gainLossPercent}%)`
          },
        ].map((card) => (
          <div key={card.label} className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-4 sm:p-5">
            <div className={cn('absolute top-0 right-0 w-20 h-20 rounded-bl-[4rem] opacity-10 bg-gradient-to-br', card.gradient)} />
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br text-white mb-3', card.gradient)}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(Math.abs(card.value), currency)}
              {card.suffix && <span className="text-xs font-medium ml-1">{card.suffix}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Allocation Chart + Filters Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation Pie */}
        {allocation.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Portfolio Allocation</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocation} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {allocation.map((a) => <Cell key={a.typeConfigId} fill={a.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5">
              {allocation.map((a) => (
                <div key={a.typeConfigId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                    <span className="text-slate-600 dark:text-slate-300">{a.name}</span>
                  </div>
                  <span className="font-medium text-slate-900 dark:text-white">{a.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investment List */}
        <div className={cn('space-y-4', allocation.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3')}>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text" placeholder="Search investments..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500">
                  <option value="">All Types</option>
                  {typeConfigs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500">
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="MATURED">Matured</option>
                  <option value="SOLD">Sold</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No investments found</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Add your first investment to start tracking</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((inv) => {
                const Icon = getIcon(inv.typeConfig.icon);
                const invested = Number(inv.investedAmount);
                const current = Number(inv.currentValue);
                const gain = current - invested;
                const gainPct = invested > 0 ? ((gain / invested) * 100).toFixed(1) : '0.0';

                return (
                  <div key={inv.id} className="group relative rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:shadow-lg transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: inv.typeConfig.color }}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{inv.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{inv.typeConfig.name}</p>
                        </div>
                      </div>
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_STYLES[inv.status])}>
                        {inv.status}
                      </span>
                    </div>

                    {inv.institutionName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{inv.institutionName}</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Invested</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(invested, currency)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Current</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(current, currency)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                      <div className={cn('flex items-center gap-1 text-xs font-semibold', gain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                        {gain >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        {formatCurrency(Math.abs(gain), currency)} ({gainPct}%)
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewingInvestment(inv)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" title="View"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => { setEditingInvestment(inv); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" title="Edit"><Edit3 className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteId(inv.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>

                    {inv.maturityDate && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Matures: {formatDate(inv.maturityDate)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <InvestmentForm
          typeConfigs={typeConfigs}
          accounts={accounts}
          investment={editingInvestment}
          currency={currency}
          loading={loading}
          onSubmit={editingInvestment ? (fd) => handleUpdate(editingInvestment.id, fd) : handleCreate}
          onClose={() => { setShowForm(false); setEditingInvestment(null); }}
        />
      )}

      {/* Detail Modal */}
      {viewingInvestment && (
        <InvestmentDetail
          investment={viewingInvestment}
          accounts={accounts}
          currency={currency}
          loading={loading}
          onRecordReturn={(fd) => handleRecordReturn(viewingInvestment.id, fd)}
          onAddFunds={(fd) => handleAddFunds(viewingInvestment.id, fd)}
          onRecordValuation={(fd) => handleRecordValuation(viewingInvestment.id, fd)}
          onClose={() => setViewingInvestment(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-700/50 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Investment?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">This will permanently delete this investment and all its returns.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors">
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
