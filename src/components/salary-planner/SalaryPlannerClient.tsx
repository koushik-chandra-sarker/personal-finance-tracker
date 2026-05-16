'use client';

import { useCallback, useState, useMemo, useTransition } from 'react';
import { Calculator, DollarSign, TrendingUp, Minus, Plus, Trash2, PieChart, BarChart3, Info, ChevronDown, ChevronUp, Save, FolderOpen, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateSalary, DEFAULT_STRUCTURE, DEFAULT_DEDUCTIONS, getSalaryValidationMessages, type SalaryStructure, type DeductionItem, type TaxSlab } from '@/lib/salary-calculator';
import { deleteSalaryScenarioAction, saveSalaryScenarioAction } from '@/actions/salary-planner.actions';
import type { SalaryBudgetCategory, SalaryBudgetRule, SalaryScenarioPayload, SalaryScenarioRow, SalaryTaxCategory } from '@/types/salary-planner';
import SalaryCharts from './SalaryCharts';
import SalaryBudgetPlanner, { DEFAULT_SALARY_BUDGET_CATEGORIES } from './SalaryBudgetPlanner';

function fmt(n: number, currency: string) {
  const sym: Record<string, string> = { BDT: '৳', USD: '$', EUR: '€', GBP: '£', INR: '₹' };
  const s = sym[currency] || currency + ' ';
  return s + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function SalaryPlannerClient({ 
  currency, 
  initialFiscalYear,
  fiscalYears,
  taxConfigsByYear,
  initialScenarios,
}: { 
  currency: string;
  initialFiscalYear: string;
  fiscalYears: string[];
  taxConfigsByYear: Record<string, { male: TaxSlab[]; female: TaxSlab[] }>;
  initialScenarios: SalaryScenarioRow[];
}) {
  const [grossMonthly, setGrossMonthly] = useState(50000);
  const [structure, setStructure] = useState<SalaryStructure>({ ...DEFAULT_STRUCTURE });
  const [deductions, setDeductions] = useState<DeductionItem[]>(DEFAULT_DEDUCTIONS.map(d => ({ ...d })));
  const [taxCategory, setTaxCategory] = useState<SalaryTaxCategory>('male');
  const [bonusMonths, setBonusMonths] = useState(2);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(initialFiscalYear);
  const [planName, setPlanName] = useState('Current Salary Plan');
  const [scenarios, setScenarios] = useState<SalaryScenarioRow[]>(initialScenarios);
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenarios[0]?.id ?? '');
  const [editingScenarioId, setEditingScenarioId] = useState<string | undefined>();
  const [compareScenarioId, setCompareScenarioId] = useState(initialScenarios[0]?.id ?? '');
  const [budgetRule, setBudgetRule] = useState<SalaryBudgetRule>('50-30-20');
  const [budgetCategories, setBudgetCategories] = useState<SalaryBudgetCategory[]>(DEFAULT_SALARY_BUDGET_CATEGORIES.map(category => ({ ...category })));
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tax' | 'compare' | 'charts' | 'planner'>('overview');

  const getSlabs = useCallback((fiscalYear: string, category: SalaryTaxCategory) => {
    const yearConfig = taxConfigsByYear[fiscalYear];
    const slabs = category === 'female' ? yearConfig?.female : yearConfig?.male;
    return slabs?.length ? slabs : undefined;
  }, [taxConfigsByYear]);

  const result = useMemo(() => calculateSalary(grossMonthly, structure, deductions, taxCategory, bonusMonths, getSlabs(selectedFiscalYear, 'male'), getSlabs(selectedFiscalYear, 'female')), [grossMonthly, structure, deductions, taxCategory, bonusMonths, selectedFiscalYear, getSlabs]);

  const budgetTotal = useMemo(() => budgetCategories.reduce((sum, category) => sum + category.percent, 0), [budgetCategories]);
  const validationMessages = useMemo(() => {
    const messages = getSalaryValidationMessages(grossMonthly, structure, deductions, bonusMonths);
    const activeConfig = taxConfigsByYear[selectedFiscalYear];
    if (!activeConfig?.male?.length && !activeConfig?.female?.length) {
      messages.push(`No active tax config was found for FY ${selectedFiscalYear}. Default Bangladesh slabs are being used.`);
    }
    if (budgetTotal !== 100) {
      messages.push(`Budget allocation is ${budgetTotal}%. Keep it at 100% before using this as a monthly plan.`);
    }
    return messages;
  }, [grossMonthly, structure, deductions, bonusMonths, selectedFiscalYear, taxConfigsByYear, budgetTotal]);

  const buildPayload = (name = planName): SalaryScenarioPayload => ({
    name: name.trim() || 'Salary Plan',
    fiscalYear: selectedFiscalYear,
    currency,
    taxCategory,
    grossMonthly,
    bonusMonths,
    structure,
    deductions,
    budgetRule,
    budgetCategories,
  });

  const upsertLocalScenario = (scenario: SalaryScenarioRow) => {
    setScenarios(prev => {
      const exists = prev.some(item => item.id === scenario.id);
      const next = exists ? prev.map(item => item.id === scenario.id ? scenario : item) : [scenario, ...prev];
      return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
    setSelectedScenarioId(scenario.id);
    setCompareScenarioId(current => current || scenario.id);
    setEditingScenarioId(scenario.id);
  };

  const handleSave = (mode: 'update' | 'new') => {
    setMessage(null);
    const id = mode === 'update' ? editingScenarioId : undefined;
    const payload = buildPayload(mode === 'new' && editingScenarioId ? `${planName} Copy` : planName);
    startTransition(async () => {
      const res = await saveSalaryScenarioAction(payload, id);
      if (res.success && res.data) {
        upsertLocalScenario(res.data);
        setPlanName(res.data.name);
        setMessage({ type: 'success', text: res.message });
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    });
  };

  const loadScenario = (scenario: SalaryScenarioRow) => {
    setPlanName(scenario.name);
    setSelectedFiscalYear(scenario.fiscalYear);
    setTaxCategory(scenario.taxCategory);
    setGrossMonthly(scenario.grossMonthly);
    setBonusMonths(scenario.bonusMonths);
    setStructure({ ...scenario.structure });
    setDeductions(scenario.deductions.map(deduction => ({ ...deduction })));
    setBudgetRule(scenario.budgetRule);
    setBudgetCategories(scenario.budgetCategories.map(category => ({ ...category })));
    setSelectedScenarioId(scenario.id);
    setEditingScenarioId(scenario.id);
    setMessage({ type: 'success', text: `${scenario.name} loaded.` });
  };

  const handleLoadSelected = () => {
    const scenario = scenarios.find(item => item.id === selectedScenarioId);
    if (scenario) loadScenario(scenario);
  };

  const handleDeleteSelected = () => {
    const scenario = scenarios.find(item => item.id === selectedScenarioId);
    if (!scenario || !confirm(`Delete salary plan "${scenario.name}"?`)) return;
    setMessage(null);
    startTransition(async () => {
      const res = await deleteSalaryScenarioAction(scenario.id);
      if (res.success) {
        setScenarios(prev => prev.filter(item => item.id !== scenario.id));
        if (editingScenarioId === scenario.id) setEditingScenarioId(undefined);
        if (compareScenarioId === scenario.id) setCompareScenarioId('');
        setSelectedScenarioId('');
        setMessage({ type: 'success', text: res.message });
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    });
  };

  const compareScenario = scenarios.find(item => item.id === compareScenarioId);
  const compareResult = compareScenario
    ? calculateSalary(
      compareScenario.grossMonthly,
      compareScenario.structure,
      compareScenario.deductions,
      compareScenario.taxCategory,
      compareScenario.bonusMonths,
      getSlabs(compareScenario.fiscalYear, 'male'),
      getSlabs(compareScenario.fiscalYear, 'female'),
    )
    : null;

  const addDeduction = () => {
    setDeductions(prev => [...prev, { id: `custom-${Date.now()}`, label: 'New Deduction', amount: 0, isPercentage: false }]);
  };

  const updateDeduction = (index: number, field: keyof DeductionItem, value: string | number | boolean) => {
    setDeductions(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const removeDeduction = (index: number) => {
    setDeductions(prev => prev.filter((_, i) => i !== index));
  };

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
            Bangladesh Fiscal Year {selectedFiscalYear} &middot; Tax Calculation &amp; Saved Scenarios
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            FY
            <select
              value={selectedFiscalYear}
              onChange={(event) => setSelectedFiscalYear(event.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {fiscalYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
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

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)_auto] lg:items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Plan Name</label>
            <input
              type="text"
              value={planName}
              onChange={(event) => setPlanName(event.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Saved Plans</label>
            <select
              value={selectedScenarioId}
              onChange={(event) => setSelectedScenarioId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">No saved plan selected</option>
              {scenarios.map(scenario => (
                <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleLoadSelected}
              disabled={!selectedScenarioId || isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <FolderOpen className="h-3.5 w-3.5" /> Load
            </button>
            <button
              onClick={() => handleSave('update')}
              disabled={!editingScenarioId || isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> Update
            </button>
            <button
              onClick={() => handleSave('new')}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Save New
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={!selectedScenarioId || isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
        {message && (
          <div className={cn('mt-3 rounded-xl px-3 py-2 text-xs font-medium', message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300')}>
            {message.text}
          </div>
        )}
        {validationMessages.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                {validationMessages.map(item => <p key={item}>{item}</p>)}
              </div>
            </div>
          </div>
        )}
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
            {([['overview', 'Overview'], ['tax', 'Tax Breakdown'], ['compare', 'Compare'], ['charts', 'Charts'], ['planner', 'Budget Planner']] as const).map(([key, label]) => (
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
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tax Slab Breakdown — FY {selectedFiscalYear}</h3>
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

          {activeTab === 'compare' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden">
              <div className="flex flex-col gap-3 p-5 border-b border-slate-100 dark:border-slate-700/50 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-indigo-500" /> Compare With Saved Plan
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Current inputs are compared against one saved salary scenario.</p>
                </div>
                <select
                  value={compareScenarioId}
                  onChange={(event) => setCompareScenarioId(event.target.value)}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose saved plan</option>
                  {scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
                </select>
              </div>
              {compareScenario && compareResult ? (
                <div className="p-5 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Current Plan', name: planName, fiscalYear: selectedFiscalYear, net: result.netMonthly, tax: result.totalTax },
                      { label: 'Saved Plan', name: compareScenario.name, fiscalYear: compareScenario.fiscalYear, net: compareResult.netMonthly, tax: compareResult.totalTax },
                    ].map(item => (
                      <div key={item.label} className="rounded-xl border border-slate-200 dark:border-slate-700/50 p-4">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</p>
                        <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">FY {item.fiscalYear}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Net Monthly</p>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(item.net, currency)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Annual Tax</p>
                            <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{fmt(item.tax, currency)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/30">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Metric</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Current</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Saved</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Difference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {[
                          ['Monthly Gross', result.grossMonthly, compareResult.grossMonthly],
                          ['Monthly Net', result.netMonthly, compareResult.netMonthly],
                          ['Annual Gross', result.grossAnnual, compareResult.grossAnnual],
                          ['Annual Net', result.netAnnual, compareResult.netAnnual],
                          ['Annual Tax', result.totalTax, compareResult.totalTax],
                        ].map(([label, current, saved]) => {
                          const diff = Number(current) - Number(saved);
                          return (
                            <tr key={label}>
                              <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">{label}</td>
                              <td className="px-4 py-3 text-right text-xs font-semibold text-slate-900 dark:text-white">{fmt(Number(current), currency)}</td>
                              <td className="px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">{fmt(Number(saved), currency)}</td>
                              <td className={cn('px-4 py-3 text-right text-xs font-bold', diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                                {diff >= 0 ? '+' : ''}{fmt(diff, currency)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Save at least one salary plan to compare.</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Use Save New after entering a salary, then return here to compare offers or revisions.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'charts' && (
            <SalaryCharts result={result} currency={currency} />
          )}

          {activeTab === 'planner' && (
            <SalaryBudgetPlanner
              netMonthly={result.netMonthly}
              currency={currency}
              budgetRule={budgetRule}
              budgetCategories={budgetCategories}
              onBudgetChange={({ rule, categories }) => {
                setBudgetRule(rule);
                setBudgetCategories(categories);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
