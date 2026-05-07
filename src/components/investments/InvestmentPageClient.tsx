'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { 
  createInvestmentAction, updateInvestmentAction, deleteInvestmentAction, 
  recordReturnAction, addFundsAction, recordValuationAction, closeInvestmentAction 
} from '@/actions/investment.actions';
import { 
  TrendingUp, Plus, Search, Trash2, Edit3,
  ChevronDown, ArrowUpRight, ArrowDownRight, Wallet,
  Landmark, Banknote, PiggyBank,
  BarChart3, Coins, Building2, Shield, ScrollText, FileText, Eye, Settings2, RefreshCw, X, Calendar
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import InvestmentForm from './InvestmentForm';
import InvestmentDetail from './InvestmentDetail';
import MaturityTimeline from './MaturityTimeline';

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
type InvestmentView = 'dashboard' | 'portfolio';
type InvestmentRouteTarget = 'dashboard' | 'portfolio' | 'types';
type MaturityInvestment = {
  id: string;
  name: string;
  maturityDate: string | null;
  investedAmount: number | string;
  typeConfig: { name: string; color: string; icon: string };
};
type SanchayapatraConfig = {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  rate: number | string;
  taxThreshold: number | string;
  taxRateBelow: number | string;
  taxRateAbove: number | string;
  payoutFrequency: string;
};

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

const STATUS_FILTERS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'MATURED', label: 'Matured' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function formatSignedCurrency(value: number, currency: string) {
  return `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value), currency)}`;
}

export default function InvestmentPageClient({
  investments: initial, typeConfigs, accounts, sanchayapatraConfigs, summary, allocation, maturities, growthData, currency, view = 'dashboard',
}: {
  investments: Investment[]; typeConfigs: TypeConfig[]; accounts: Account[]; sanchayapatraConfigs: SanchayapatraConfig[];
  summary: Summary; allocation: Allocation[]; maturities: MaturityInvestment[]; growthData: { name: string; value: number }[]; currency: string;
  view?: InvestmentView;
}) {
  const router = useRouter();
  const [isPendingRefresh, startRefreshTransition] = useTransition();
  const [investments, setInvestments] = useState(initial);
  const [mounted, setMounted] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<InvestmentRouteTarget | null>(null);
  
  useEffect(() => {
    setMounted(true);
    setInvestments(initial);
    setIsRefreshingData(false);
    setNavigatingTo(null);
  }, [initial, view]);
  
  const [showForm, setShowForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [viewingInvestment, setViewingInvestment] = useState<Investment | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState('');
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  const showRefreshLoader = (isRefreshingData || isPendingRefresh) && !showForm && !viewingInvestment && !deleteId;
  const isDashboardView = view === 'dashboard';
  const isPortfolioView = view === 'portfolio';
  const HeaderIcon = isPortfolioView ? Wallet : TrendingUp;
  const pageTitle = isPortfolioView ? 'Portfolio' : 'Investments Dashboard';
  const pageDescription = isPortfolioView
    ? 'Search, filter, and manage each investment position.'
    : 'Track performance, allocation, returns, and upcoming maturities.';
  const portfolioRouteTarget: InvestmentRouteTarget = isPortfolioView ? 'dashboard' : 'portfolio';
  const portfolioRouteHref = isPortfolioView ? '/investments' : '/investments/portfolio';
  const isRouteNavigationPending = navigatingTo !== null;
  const isPortfolioRouteLoading = navigatingTo === portfolioRouteTarget;
  const isTypesRouteLoading = navigatingTo === 'types';

  const refreshInvestmentData = () => {
    setIsRefreshingData(true);
    startRefreshTransition(() => {
      router.refresh();
    });
  };

  const handleRouteNavigation = (target: InvestmentRouteTarget, href: string) => {
    setNavigatingTo(target);
    router.push(href);
  };

  const filtered = investments.filter((inv) => {
    if (search && !inv.name.toLowerCase().includes(search.toLowerCase()) &&
      !(inv.institutionName?.toLowerCase().includes(search.toLowerCase()))) return false;
    if (filterType && inv.typeConfigId !== filterType) return false;
    if (filterStatus && inv.status !== filterStatus) return false;
    return true;
  });
  const hasActiveFilters = Boolean(search || filterType || filterStatus);
  const selectedTypeName = typeConfigs.find((type) => type.id === filterType)?.name;
  const selectedStatusLabel = STATUS_FILTERS.find((status) => status.value === filterStatus)?.label;
  const clearPortfolioFilters = () => {
    setSearch('');
    setFilterType('');
    setFilterStatus('');
  };

  const handleCreate = async (formData: FormData) => {
    setLoading(true);
    try {
      const result = await createInvestmentAction(formData);
      if (result.success) {
        setShowForm(false);
        refreshInvestmentData();
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
        refreshInvestmentData();
      }
      return result;
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    setDeleteMessage('');
    try {
      const result = await deleteInvestmentAction(id);
      if (result.success) {
        setDeleteId(null);
        refreshInvestmentData();
      } else {
        setDeleteMessage(result.message);
      }
    } finally { setLoading(false); }
  };

  const handleRecordReturn = async (investmentId: string, formData: FormData) => {
    setLoading(true);
    try {
      const result = await recordReturnAction(investmentId, formData);
      if (result.success) refreshInvestmentData();
      return result;
    } finally { setLoading(false); }
  };

  const handleAddFunds = async (investmentId: string, formData: FormData) => {
    setLoading(true);
    try {
      const result = await addFundsAction(investmentId, formData);
      if (result.success) refreshInvestmentData();
      return result;
    } finally { setLoading(false); }
  };
  const handleRecordValuation = async (investmentId: string, formData: FormData) => {
    setLoading(true);
    try {
      const result = await recordValuationAction(investmentId, formData);
      if (result.success) refreshInvestmentData();
      return result;
    } finally { setLoading(false); }
  };

  const handleCloseInvestment = async (id: string, formData: FormData) => {
    setLoading(true);
    try {
      const result = await closeInvestmentAction(id, formData);
      if (result.success) refreshInvestmentData();
      return result;
    } finally { setLoading(false); }
  };

  const gainLossPercent = summary.totalInvested > 0
    ? ((summary.unrealisedGainLoss / summary.totalInvested) * 100).toFixed(1) : '0.0';
  const activeCount = investments.filter((inv) => inv.status === 'ACTIVE').length;
  const totalPositions = investments.length;
  const returnRate = summary.totalInvested > 0
    ? ((summary.totalReturns / summary.totalInvested) * 100).toFixed(1)
    : '0.0';
  const topAllocation = allocation.reduce<Allocation | undefined>((top, item) => {
    if (!top || item.total > top.total) return item;
    return top;
  }, undefined);
  const nextMaturity = maturities.find((inv) => inv.maturityDate);
  const summaryCards: Array<{
    label: string;
    value: string;
    detail: string;
    icon: React.ElementType;
    color: string;
    bg: string;
  }> = [
    {
      label: 'Current Value',
      value: formatCurrency(summary.totalCurrentValue, currency),
      detail: `${formatCurrency(summary.totalInvested, currency)} invested`,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'Gain/Loss',
      value: formatSignedCurrency(summary.unrealisedGainLoss, currency),
      detail: `${gainLossPercent}% unrealized`,
      icon: summary.unrealisedGainLoss >= 0 ? ArrowUpRight : ArrowDownRight,
      color: summary.unrealisedGainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      bg: summary.unrealisedGainLoss >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10',
    },
    {
      label: 'Realized Returns',
      value: formatCurrency(summary.totalReturns, currency),
      detail: `${returnRate}% of invested`,
      icon: Wallet,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-500/10',
    },
    {
      label: 'Positions',
      value: String(totalPositions),
      detail: `${activeCount} active`,
      icon: BarChart3,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
  ];
  const portfolioCards: Array<{
    label: string;
    value: string;
    detail: string;
    icon: React.ElementType;
    color: string;
    bg: string;
  }> = [
    {
      label: 'Total value',
      value: formatCurrency(summary.totalCurrentValue, currency),
      detail: `${formatCurrency(summary.totalInvested, currency)} invested`,
      icon: Wallet,
      color: 'text-slate-900 dark:text-white',
      bg: 'bg-slate-100 dark:bg-slate-700/50',
    },
    {
      label: 'Gain/loss',
      value: formatSignedCurrency(summary.unrealisedGainLoss, currency),
      detail: `${gainLossPercent}% unrealized`,
      icon: summary.unrealisedGainLoss >= 0 ? ArrowUpRight : ArrowDownRight,
      color: summary.unrealisedGainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      bg: summary.unrealisedGainLoss >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10',
    },
    {
      label: 'Returns',
      value: formatCurrency(summary.totalReturns, currency),
      detail: `${returnRate}% of invested`,
      icon: TrendingUp,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-500/10',
    },
    {
      label: 'Positions',
      value: `${activeCount}/${totalPositions}`,
      detail: 'active positions',
      icon: BarChart3,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {showRefreshLoader && (
        <div role="status" aria-live="polite" className="fixed right-4 top-20 z-40 flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-lg shadow-slate-900/10 dark:border-indigo-500/30 dark:bg-slate-800 dark:text-slate-100">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
          Updating investments...
        </div>
      )}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <HeaderIcon className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{pageTitle}</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{pageDescription}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
              {activeCount} active
            </span>
            {topAllocation && (
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                Top: {topAllocation.name} {topAllocation.percentage}%
              </span>
            )}
            {nextMaturity?.maturityDate && (
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                Next maturity {formatDate(nextMaturity.maturityDate)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => handleRouteNavigation(portfolioRouteTarget, portfolioRouteHref)}
            disabled={loading || isRouteNavigationPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60 sm:w-auto"
          >
            {isPortfolioRouteLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : isPortfolioView ? <BarChart3 className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
            {isPortfolioView ? 'Dashboard' : 'Portfolio'}
          </button>
          <button
            onClick={() => handleRouteNavigation('types', '/investments/types')}
            disabled={loading || isRouteNavigationPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60 sm:w-auto"
          >
            {isTypesRouteLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
            Manage Types
          </button>
          <button
            onClick={() => { setEditingInvestment(null); setShowForm(true); }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-700 sm:w-auto"
          >
            <Plus className="h-4 w-4" /> Add Investment
          </button>
        </div>
      </div>

      {isDashboardView && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700/70 dark:bg-slate-800/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500">{card.label}</p>
                    <p className={cn('mt-2 truncate text-lg font-extrabold tabular-nums sm:text-xl', card.color)}>{card.value}</p>
                  </div>
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', card.bg)}>
                    <card.icon className={cn('h-4 w-4', card.color)} />
                  </span>
                </div>
                <p className="mt-3 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{card.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700/70 dark:bg-slate-800/60">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Portfolio Growth</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Last 12 months</p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  Net Worth
                </div>
              </div>

              <div className="mt-5 h-[320px] w-full">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData}>
                      <defs>
                        <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                        tickFormatter={(v) => formatCurrency(v, currency).split('.')[0]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        itemStyle={{ color: isDark ? '#ffffff' : '#0f172a' }}
                        formatter={(value: unknown) => [formatCurrency(Number(value), currency), 'Total Value']}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#growthGradient)"
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {allocation.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700/70 dark:bg-slate-800/60">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Allocation</h3>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{allocation.length} types</span>
                  </div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={allocation} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={2}>
                          {allocation.map((a) => <Cell key={a.typeConfigId} fill={a.color} />)}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {allocation.slice(0, 4).map((a) => (
                      <div key={a.typeConfigId} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
                          <span className="truncate text-slate-600 dark:text-slate-300">{a.name}</span>
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">{a.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <MaturityTimeline investments={maturities} currency={currency} />
            </div>
          </div>
        </>
      )}

      {isPortfolioView && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {portfolioCards.map((card) => (
              <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700/70 dark:bg-slate-800/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{card.label}</p>
                    <p className={cn('mt-2 truncate text-lg font-bold tabular-nums', card.color)}>{card.value}</p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{card.detail}</p>
                  </div>
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', card.bg)}>
                    <card.icon className={cn('h-4 w-4', card.color)} />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700/70 dark:bg-slate-800/60">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Positions</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {filtered.length} of {investments.length} shown
                </p>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearPortfolioFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <div className="relative min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or institution"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 transition-colors focus:outline-none focus:border-indigo-500 dark:border-slate-700/70 dark:bg-slate-900/30 dark:text-white"
                />
              </div>
              <div className="relative min-w-0">
                <select
                  value={filterType}
                  onChange={(event) => setFilterType(event.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-900 transition-colors focus:outline-none focus:border-indigo-500 dark:border-slate-700/70 dark:bg-slate-900/30 dark:text-white"
                >
                  <option value="">All types</option>
                  {typeConfigs.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="relative min-w-0">
                <select
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-900 transition-colors focus:outline-none focus:border-indigo-500 dark:border-slate-700/70 dark:bg-slate-900/30 dark:text-white"
                >
                  <option value="">All status</option>
                  {STATUS_FILTERS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                {search && <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-700/60">Search: {search}</span>}
                {selectedTypeName && <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-700/60">Type: {selectedTypeName}</span>}
                {selectedStatusLabel && <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-700/60">Status: {selectedStatusLabel}</span>}
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800/40">
              <TrendingUp className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="font-medium text-slate-600 dark:text-slate-300">No investments found</p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                {hasActiveFilters ? 'Try a different filter set.' : 'Add your first investment to start tracking.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearPortfolioFilters}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
                >
                  <X className="h-4 w-4" />
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((inv) => {
                const Icon = getIcon(inv.typeConfig.icon);
                const invested = Number(inv.investedAmount);
                const current = Number(inv.currentValue);
                const gain = current - invested;
                const gainPct = invested > 0 ? ((gain / invested) * 100).toFixed(1) : '0.0';
                const progress = invested > 0 ? Math.min(Math.max((current / invested) * 100, 4), 100) : 4;
                const isPositive = gain >= 0;

                return (
                  <div key={inv.id} className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-200 hover:border-indigo-200 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-800/60 dark:hover:border-indigo-500/40">
                    <button
                      type="button"
                      onClick={() => setViewingInvestment(inv)}
                      className="flex flex-1 flex-col p-5 text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: inv.typeConfig.color }}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{inv.name}</h3>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{inv.typeConfig.name}</p>
                          </div>
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_STYLES[inv.status])}>
                          {inv.status}
                        </span>
                      </div>

                      <div className="mt-5">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Current value</p>
                        <div className="mt-1 flex items-baseline justify-between gap-3">
                          <p className="truncate text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(current, currency)}</p>
                          <p className={cn('flex shrink-0 items-center gap-1 text-sm font-semibold', isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                            {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            {gainPct}%
                          </p>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/70">
                          <div
                            className={cn('h-full rounded-full', isPositive ? 'bg-emerald-500' : 'bg-rose-500')}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Invested</p>
                          <p className="mt-1 truncate font-semibold text-slate-900 dark:text-white">{formatCurrency(invested, currency)}</p>
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Gain/loss</p>
                          <p className={cn('mt-1 truncate font-semibold', isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                            {formatSignedCurrency(gain, currency)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                        {inv.institutionName && (
                          <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-700/60">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{inv.institutionName}</span>
                          </span>
                        )}
                        {inv.linkedAccount && (
                          <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-700/60">
                            <Wallet className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{inv.linkedAccount.name}</span>
                          </span>
                        )}
                        {inv.maturityDate && (
                          <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-700/60">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{formatDate(inv.maturityDate)}</span>
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => setViewingInvestment(inv)}
                        className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingInvestment(inv); setShowForm(true); }}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                          aria-label={`Edit ${inv.name}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDeleteId(inv.id); setDeleteMessage(''); }}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                          aria-label={`Delete ${inv.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <InvestmentForm
          typeConfigs={typeConfigs}
          accounts={accounts}
          sanchayapatraConfigs={sanchayapatraConfigs}
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
          onCloseInvestment={handleCloseInvestment}
          onClose={() => setViewingInvestment(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-700/50 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Investment?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Only investments without linked financial history can be deleted.</p>
            {deleteMessage && <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2 mt-3">{deleteMessage}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setDeleteId(null); setDeleteMessage(''); }} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
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
