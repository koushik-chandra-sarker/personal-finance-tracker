'use client';

import { useState, useMemo } from 'react';
import { Calculator, DollarSign, TrendingUp, Minus, Plus, Trash2, PieChart, BarChart3, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateSalary, DEFAULT_STRUCTURE, DEFAULT_DEDUCTIONS, type SalaryStructure, type DeductionItem } from '@/lib/salary-calculator';
import SalaryCharts from './SalaryCharts';
import SalaryBudgetPlanner from './SalaryBudgetPlanner';

function fmt(n: number, currency: string) {
  const sym: Record<string, string> = { BDT: '৳', USD: '$', EUR: '€', GBP: '£', INR: '₹' };
  const s = sym[currency] || currency + ' ';
  return s + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function SalaryPlannerClient({ 
  currency, 
  customMaleSlabs, 
  customFemaleSlabs 
}: { 
  currency: string;
  customMaleSlabs?: any[];
  customFemaleSlabs?: any[];
}) {
  const [grossMonthly, setGrossMonthly] = useState(50000);
  const [structure, setStructure] = useState<SalaryStructure>({ ...DEFAULT_STRUCTURE });
  const [deductions, setDeductions] = useState<DeductionItem[]>(DEFAULT_DEDUCTIONS.map(d => ({ ...d })));
  const [taxCategory, setTaxCategory] = useState<'male' | 'female'>('male');
  const [bonusMonths, setBonusMonths] = useState(2);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tax' | 'charts' | 'planner'>('overview');

  const result = useMemo(() => calculateSalary(grossMonthly, structure, deductions, taxCategory, bonusMonths, customMaleSlabs, customFemaleSlabs), [grossMonthly, structure, deductions, taxCategory, bonusMonths, customMaleSlabs, customFemaleSlabs]);

  const addDeduction = () => {
    setDeductions(prev => [...prev, { id: `custom-${Date.now()}`, label: 'New Deduction', amount: 0, isPercentage: false }]);
  };

  const updateDeduction = (index: number, field: keyof DeductionItem, value: string | number | boolean) => {
    setDeductions(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const removeDeduction = (index: number) => {
    setDeductions(prev => prev.filter((_, i) => i !== index));
  };

  const currentFY = (() => {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 6 ? `${y}-${(y + 1).toString().slice(2)}` : `${y - 1}-${y.toString().slice(2)}`;
  })();

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <Calculator className="h-6 w-6" />
            </div>
            Salary Planner
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Bangladesh Fiscal Year {currentFY} &middot; Tax Calculation &amp; Breakdown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tax Category:</span>
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {(['male', 'female'] as const).map(cat => (
              <button key={cat} onClick={() => setTaxCategory(cat)}
                className={cn('px-4 py-2 text-xs font-semibold capitalize transition-all', taxCategory === cat ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700')}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Gross Monthly', value: result.grossMonthly, icon: DollarSign, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
          { label: 'Net Monthly', value: result.netMonthly, icon: TrendingUp, gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/20' },
          { label: 'Annual Tax', value: result.totalTax, icon: Minus, gradient: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/20' },
          { label: 'Effective Tax Rate', value: null, icon: PieChart, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', display: `${result.effectiveTaxRate.toFixed(1)}%` },
        ].map((card, i) => (
          <div key={i} className={cn('rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-4 sm:p-5 animate-slide-up', `stagger-${i + 1}`)}>
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('p-1.5 rounded-lg bg-gradient-to-br text-white shadow-lg', card.gradient, card.shadow)}>
                <card.icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {card.display ?? fmt(card.value!, currency)}
            </p>
          </div>
        ))}
      </div>

      {/* Input & Results */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Inputs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Gross Salary */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-indigo-500" /> Gross Salary
            </h2>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Monthly Gross ({currency})</label>
            <input type="number" value={grossMonthly} onChange={e => setGrossMonthly(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Festival Bonus (months):</label>
              <input type="number" min={0} max={6} value={bonusMonths} onChange={e => setBonusMonths(Math.max(0, Math.min(6, Number(e.target.value))))}
                className="w-16 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm text-center text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          {/* Salary Structure */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5">
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white">
              <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-purple-500" /> Salary Structure</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Basic (% of Gross)', key: 'basicPercent' as const, min: 30, max: 100 },
                  { label: 'House Rent (% of Basic)', key: 'houseRentPercent' as const, min: 0, max: 100 },
                  { label: 'Medical (% of Basic)', key: 'medicalPercent' as const, min: 0, max: 100 },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{f.label}</label>
                    <input type="number" min={f.min} max={f.max} value={structure[f.key]}
                      onChange={e => setStructure(prev => ({ ...prev, [f.key]: Math.max(f.min, Math.min(f.max, Number(e.target.value))) }))}
                      className="w-full mt-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Conveyance (flat {currency})</label>
                  <input type="number" min={0} value={structure.conveyanceFlat}
                    onChange={e => setStructure(prev => ({ ...prev, conveyanceFlat: Math.max(0, Number(e.target.value)) }))}
                    className="w-full mt-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
            )}
          </div>

          {/* Deductions */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Minus className="h-4 w-4 text-rose-500" /> Monthly Deductions
            </h2>
            <div className="space-y-3">
              {deductions.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2">
                  <input type="text" value={d.label} onChange={e => updateDeduction(i, 'label', e.target.value)}
                    className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                  <input type="number" min={0} value={d.amount} onChange={e => updateDeduction(i, 'amount', Math.max(0, Number(e.target.value)))}
                    className="w-20 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-2 text-xs text-center text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                  <select value={d.isPercentage ? 'pct' : 'flat'} onChange={e => updateDeduction(i, 'isPercentage', e.target.value === 'pct')}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-1.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none">
                    <option value="flat">{currency}</option>
                    <option value="pct">%</option>
                  </select>
                  <button onClick={() => removeDeduction(i)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addDeduction}
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Deduction
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tab Navigation */}
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {([['overview', 'Overview'], ['tax', 'Tax Breakdown'], ['charts', 'Charts'], ['planner', 'Budget Planner']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={cn('flex-1 px-4 py-2.5 text-xs font-semibold transition-all', activeTab === key ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700')}>
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Salary Breakdown</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {[
                  { label: 'Basic Salary', monthly: result.basicMonthly, annual: result.basicAnnual, color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'House Rent', monthly: result.houseRentMonthly, annual: result.houseRentAnnual, color: 'text-purple-600 dark:text-purple-400' },
                  { label: 'Medical', monthly: result.medicalMonthly, annual: result.medicalAnnual, color: 'text-teal-600 dark:text-teal-400' },
                  { label: 'Conveyance', monthly: result.conveyanceMonthly, annual: result.conveyanceAnnual, color: 'text-amber-600 dark:text-amber-400' },
                  { label: 'Other Allowance', monthly: result.otherAllowanceMonthly, annual: result.otherAllowanceAnnual, color: 'text-slate-600 dark:text-slate-400' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-3">
                    <span className={cn('text-sm font-medium', row.color)}>{row.label}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{fmt(row.monthly, currency)}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">/ mo</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-slate-700/30">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Gross Monthly</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{fmt(result.grossMonthly, currency)}</span>
                </div>
                {result.deductionDetails.filter(d => d.monthly > 0).map(d => (
                  <div key={d.label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-medium text-rose-600 dark:text-rose-400">(-) {d.label}</span>
                    <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">{fmt(d.monthly, currency)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-medium text-rose-600 dark:text-rose-400">(-) Monthly Tax</span>
                  <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">{fmt(result.monthlyTax, currency)}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Net Take-Home (Monthly)</span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{fmt(result.netMonthly, currency)}</span>
                </div>
              </div>
              {/* Annual summary */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/50">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Annual Summary</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Gross Annual', value: result.grossAnnual, color: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Total Deductions', value: result.totalDeductionsAnnual, color: 'text-orange-600 dark:text-orange-400' },
                    { label: 'Total Tax', value: result.totalTax, color: 'text-rose-600 dark:text-rose-400' },
                    { label: 'Net Annual', value: result.netAnnual, color: 'text-emerald-600 dark:text-emerald-400' },
                  ].map(item => (
                    <div key={item.label} className="bg-white dark:bg-slate-700/40 rounded-xl p-3 border border-slate-200 dark:border-slate-600/50">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                      <p className={cn('text-sm font-bold mt-1', item.color)}>{fmt(item.value, currency)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tax Slab Breakdown — FY {currentFY}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Info className="h-3 w-3" /> {taxCategory === 'female' ? 'Female/Senior/Disabled' : 'Male (General)'} tax slabs applied
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/30">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Slab</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Rate</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Taxable</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {result.taxSlabBreakdown.map((row, i) => (
                      <tr key={i} className={cn(row.taxableAmount > 0 ? '' : 'opacity-40')}>
                        <td className="px-5 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">{row.slab.label}</td>
                        <td className="px-5 py-3 text-xs text-right font-semibold text-slate-900 dark:text-white">{row.slab.rate}%</td>
                        <td className="px-5 py-3 text-xs text-right text-slate-600 dark:text-slate-400">{fmt(row.taxableAmount, currency)}</td>
                        <td className="px-5 py-3 text-xs text-right font-semibold text-rose-600 dark:text-rose-400">{fmt(row.tax, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-rose-50 dark:bg-rose-500/10 font-bold">
                      <td colSpan={2} className="px-5 py-3 text-xs text-rose-700 dark:text-rose-400">Total Tax</td>
                      <td className="px-5 py-3 text-xs text-right text-slate-600 dark:text-slate-400">{fmt(result.taxableIncome, currency)}</td>
                      <td className="px-5 py-3 text-xs text-right text-rose-700 dark:text-rose-400">{fmt(result.totalTax, currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="p-5 bg-amber-50 dark:bg-amber-500/5 border-t border-amber-200 dark:border-amber-500/20">
                <p className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Minimum tax for Dhaka/Chittagong city corporations: ৳5,000. For other city corporations: ৳4,000.
                    Other areas: ৳3,000. This calculator shows slab-based tax only — consult an advisor for rebates and surcharges.
                  </span>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'charts' && (
            <SalaryCharts result={result} currency={currency} />
          )}

          {activeTab === 'planner' && (
            <SalaryBudgetPlanner netMonthly={result.netMonthly} currency={currency} />
          )}
        </div>
      </div>
    </div>
  );
}
