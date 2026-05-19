'use client';

import { useCallback, useState, useMemo, useTransition } from 'react';
import { Calculator, DollarSign, TrendingUp, Minus, Plus, Trash2, PieChart, BarChart3, Info, ChevronDown, ChevronUp, Save, FolderOpen, AlertTriangle, ArrowLeftRight, FileText, Landmark, MapPin, ReceiptText, ShieldCheck } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { calculateEmploymentTaxBase, calculateSalary, calculateTax, DEFAULT_STRUCTURE, DEFAULT_DEDUCTIONS, getSalaryValidationMessages, type SalaryStructure, type DeductionItem, type TaxSlab } from '@/lib/salary-calculator';
import { deleteSalaryScenarioAction, saveSalaryScenarioAction } from '@/actions/salary-planner.actions';
import type { SalaryBudgetCategory, SalaryBudgetRule, SalaryScenarioPayload, SalaryScenarioRow, SalaryTaxCategory } from '@/types/salary-planner';
import SalaryCharts from './SalaryCharts';
import SalaryBudgetPlanner, { DEFAULT_SALARY_BUDGET_CATEGORIES } from './SalaryBudgetPlanner';
import { useI18n } from '@/i18n/client';

function fmt(n: number, currency: string, locale = 'bn-BD') {
  return formatCurrency(n, currency, locale);
}

function fmtSigned(n: number, currency: string, locale = 'bn-BD') {
  const prefix = n > 0 ? '+' : '';
  return `${prefix}${fmt(n, currency, locale)}`;
}

const MINIMUM_TAX_OPTIONS = [
  { key: 'dhakaChittagong', amount: 5000 },
  { key: 'otherCity', amount: 4000 },
  { key: 'otherArea', amount: 3000 },
  { key: 'none', amount: 0 },
] as const;

type PayrollVariationRow = {
  id: string;
  label: string;
  months: number;
  grossMonthly: number;
  pfMonthly: number;
  taxDeductedMonthly: number;
};

function createPayrollRow(label: string, months: number, grossMonthly: number, pfMonthly = 0, taxDeductedMonthly = 0): PayrollVariationRow {
  return {
    id: `payroll-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label,
    months,
    grossMonthly,
    pfMonthly,
    taxDeductedMonthly,
  };
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
  const { locale, messages } = useI18n();
  const copy = messages.pages.salaryPlanner;
  const [grossMonthly, setGrossMonthly] = useState(50000);
  const [structure, setStructure] = useState<SalaryStructure>({ ...DEFAULT_STRUCTURE });
  const [deductions, setDeductions] = useState<DeductionItem[]>(DEFAULT_DEDUCTIONS.map(d => ({ ...d })));
  const [taxCategory, setTaxCategory] = useState<SalaryTaxCategory>('male');
  const [bonusMonths, setBonusMonths] = useState(2);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(initialFiscalYear);
  const [planName, setPlanName] = useState<string>(copy.currentSalaryPlan);
  const [scenarios, setScenarios] = useState<SalaryScenarioRow[]>(initialScenarios);
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenarios[0]?.id ?? '');
  const [editingScenarioId, setEditingScenarioId] = useState<string | undefined>();
  const [compareScenarioId, setCompareScenarioId] = useState(initialScenarios[0]?.id ?? '');
  const [budgetRule, setBudgetRule] = useState<SalaryBudgetRule>('50-30-20');
  const [budgetCategories, setBudgetCategories] = useState<SalaryBudgetCategory[]>(DEFAULT_SALARY_BUDGET_CATEGORIES.map(category => ({ ...category })));
  const [minimumTaxArea, setMinimumTaxArea] = useState<typeof MINIMUM_TAX_OPTIONS[number]['key']>('dhakaChittagong');
  const [investmentRebate, setInvestmentRebate] = useState(0);
  const [includePfInRebate, setIncludePfInRebate] = useState(false);
  const [pfRebateRate, setPfRebateRate] = useState(15);
  const [otherTaxAdjustment, setOtherTaxAdjustment] = useState(0);
  const [monthlyTaxDeducted, setMonthlyTaxDeducted] = useState(0);
  const [additionalTaxPaid, setAdditionalTaxPaid] = useState(0);
  const [actualFestivalBonusAnnual, setActualFestivalBonusAnnual] = useState(0);
  const [usePayrollVariations, setUsePayrollVariations] = useState(false);
  const [payrollRows, setPayrollRows] = useState<PayrollVariationRow[]>([
    createPayrollRow(copy.beforeIncrement, 6, 50000),
    createPayrollRow(copy.afterIncrement, 6, 50000),
  ]);
  const [payrollRowsCustomized, setPayrollRowsCustomized] = useState(false);
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
  const computedFestivalBonusAnnual = useMemo(() => result.basicMonthly * bonusMonths, [result.basicMonthly, bonusMonths]);
  const effectiveFestivalBonusAnnual = useMemo(() => actualFestivalBonusAnnual > 0 ? actualFestivalBonusAnnual : computedFestivalBonusAnnual, [actualFestivalBonusAnnual, computedFestivalBonusAnnual]);
  const currentPfMonthly = useMemo(() => result.deductionDetails.find(item => /pf|provident/i.test(item.label))?.monthly ?? 0, [result.deductionDetails]);
  const nonPfMonthlyDeductions = useMemo(() => result.deductionDetails
    .filter(item => !/pf|provident/i.test(item.label))
    .reduce((sum, item) => sum + item.monthly, 0), [result.deductionDetails]);
  const payrollTaxBase = useMemo(() => {
    const totals = payrollRows.reduce((acc, row) => {
      const months = Math.max(0, row.months);
      const rowBasicMonthly = (row.grossMonthly * structure.basicPercent) / 100;
      const rowHouseRentMonthly = (rowBasicMonthly * structure.houseRentPercent) / 100;
      const rowMedicalMonthly = (rowBasicMonthly * structure.medicalPercent) / 100;
      const rowOtherAllowanceMonthly = Math.max(0, row.grossMonthly - rowBasicMonthly - rowHouseRentMonthly - rowMedicalMonthly - structure.conveyanceFlat);

      acc.months += months;
      acc.basicAnnual += rowBasicMonthly * months;
      acc.houseRentAnnual += rowHouseRentMonthly * months;
      acc.medicalAnnual += rowMedicalMonthly * months;
      acc.conveyanceAnnual += structure.conveyanceFlat * months;
      acc.otherAllowanceAnnual += rowOtherAllowanceMonthly * months;
      acc.salaryGrossAnnual += row.grossMonthly * months;
      acc.variablePfAnnual += row.pfMonthly * months;
      acc.variableTaxDeductedAnnual += row.taxDeductedMonthly * months;
      return acc;
    }, {
      months: 0,
      basicAnnual: 0,
      houseRentAnnual: 0,
      medicalAnnual: 0,
      conveyanceAnnual: 0,
      otherAllowanceAnnual: 0,
      salaryGrossAnnual: 0,
      variablePfAnnual: 0,
      variableTaxDeductedAnnual: 0,
    });

    const bonusAnnual = effectiveFestivalBonusAnnual;
    const grossAnnualWithBonus = totals.salaryGrossAnnual + bonusAnnual + totals.variablePfAnnual;
    const totalDeductionsAnnual = totals.variablePfAnnual + (nonPfMonthlyDeductions * 12);
    const { employmentExemptionAnnual, taxableIncome } = calculateEmploymentTaxBase(grossAnnualWithBonus);
    const slabs = result.taxSlabBreakdown.map(row => row.slab);
    const tax = calculateTax(taxableIncome, slabs);

    return {
      ...totals,
      bonusAnnual,
      grossAnnual: grossAnnualWithBonus,
      totalDeductionsAnnual,
      employmentExemptionAnnual,
      taxableIncome,
      slabTax: tax.total,
      taxSlabBreakdown: tax.breakdown,
      alreadyDeductedAnnual: totals.variableTaxDeductedAnnual + additionalTaxPaid,
    };
  }, [payrollRows, structure, effectiveFestivalBonusAnnual, result.taxSlabBreakdown, nonPfMonthlyDeductions, additionalTaxPaid]);
  const standardTaxBase = useMemo(() => {
    const pfAnnual = currentPfMonthly * 12;
    const grossAnnual = (result.grossMonthly * 12) + effectiveFestivalBonusAnnual + pfAnnual;
    const { employmentExemptionAnnual, taxableIncome } = calculateEmploymentTaxBase(grossAnnual);
    const tax = calculateTax(taxableIncome, result.taxSlabBreakdown.map(row => row.slab));

    return {
      basicAnnual: result.basicAnnual,
      houseRentAnnual: result.houseRentAnnual,
      medicalAnnual: result.medicalAnnual,
      conveyanceAnnual: result.conveyanceAnnual,
      otherAllowanceAnnual: result.otherAllowanceAnnual,
      bonusAnnual: effectiveFestivalBonusAnnual,
      grossAnnual,
      totalDeductionsAnnual: result.totalDeductionsAnnual,
      employmentExemptionAnnual,
      taxableIncome,
      slabTax: tax.total,
      taxSlabBreakdown: tax.breakdown,
      alreadyPaid: (monthlyTaxDeducted * 12) + additionalTaxPaid,
      pfAnnual,
    };
  }, [
    result.basicAnnual,
    result.houseRentAnnual,
    result.medicalAnnual,
    result.conveyanceAnnual,
    result.otherAllowanceAnnual,
    result.grossMonthly,
    result.totalDeductionsAnnual,
    result.taxSlabBreakdown,
    effectiveFestivalBonusAnnual,
    monthlyTaxDeducted,
    additionalTaxPaid,
    currentPfMonthly,
  ]);

  const taxBase = useMemo(() => usePayrollVariations ? {
    basicAnnual: payrollTaxBase.basicAnnual,
    houseRentAnnual: payrollTaxBase.houseRentAnnual,
    medicalAnnual: payrollTaxBase.medicalAnnual,
    conveyanceAnnual: payrollTaxBase.conveyanceAnnual,
    otherAllowanceAnnual: payrollTaxBase.otherAllowanceAnnual,
    bonusAnnual: payrollTaxBase.bonusAnnual,
    grossAnnual: payrollTaxBase.grossAnnual,
    totalDeductionsAnnual: payrollTaxBase.totalDeductionsAnnual,
    employmentExemptionAnnual: payrollTaxBase.employmentExemptionAnnual,
    taxableIncome: payrollTaxBase.taxableIncome,
    slabTax: payrollTaxBase.slabTax,
    taxSlabBreakdown: payrollTaxBase.taxSlabBreakdown,
    alreadyPaid: payrollTaxBase.alreadyDeductedAnnual,
    pfAnnual: payrollTaxBase.variablePfAnnual,
  } : standardTaxBase, [usePayrollVariations, payrollTaxBase, standardTaxBase]);
  const pfRebate = useMemo(() => includePfInRebate ? (taxBase.pfAnnual * Math.max(0, pfRebateRate)) / 100 : 0, [includePfInRebate, taxBase.pfAnnual, pfRebateRate]);
  const totalRebate = useMemo(() => investmentRebate + pfRebate, [investmentRebate, pfRebate]);
  const employeeTaxWorksheet = useMemo(() => {
    const minimumTax = MINIMUM_TAX_OPTIONS.find(option => option.key === minimumTaxArea)?.amount ?? 0;
    const taxAfterRebate = Math.max(0, taxBase.slabTax - totalRebate);
    const taxAfterMinimum = Math.max(taxAfterRebate, taxBase.taxableIncome > 0 ? minimumTax : 0);
    const estimatedAnnualTax = Math.max(0, taxAfterMinimum + otherTaxAdjustment);
    const alreadyPaid = taxBase.alreadyPaid;
    const balance = estimatedAnnualTax - alreadyPaid;
    const taxFreeBand = taxBase.taxSlabBreakdown.find(row => row.slab.rate === 0)?.slab.max ?? 0;

    return {
      minimumTax,
      taxAfterRebate,
      estimatedAnnualTax,
      monthlyWithholdingTarget: estimatedAnnualTax / 12,
      alreadyPaid,
      balance,
      taxFreeBand,
    };
  }, [minimumTaxArea, taxBase, totalRebate, otherTaxAdjustment]);

  const budgetTotal = useMemo(() => budgetCategories.reduce((sum, category) => sum + category.percent, 0), [budgetCategories]);
  const validationMessages = useMemo(() => {
    const messages = getSalaryValidationMessages(grossMonthly, structure, deductions, bonusMonths);
    const activeConfig = taxConfigsByYear[selectedFiscalYear];
    if (!activeConfig?.male?.length && !activeConfig?.female?.length) {
      messages.push(`${copy.noTaxConfig} ${copy.fiscalYearShort} ${selectedFiscalYear}`);
    }
    if (budgetTotal !== 100) {
      messages.push(`${copy.budgetAllocationWarning} ${budgetTotal}%. ${copy.budgetAllocationHelp}`);
    }
    return messages;
  }, [grossMonthly, structure, deductions, bonusMonths, selectedFiscalYear, taxConfigsByYear, budgetTotal, copy]);

  const buildPayload = (name = planName): SalaryScenarioPayload => ({
    name: name.trim() || copy.salaryPlan,
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
    const payload = buildPayload(mode === 'new' && editingScenarioId ? `${planName} ${copy.copySuffix}` : planName);
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
    updateGrossMonthly(scenario.grossMonthly);
    setBonusMonths(scenario.bonusMonths);
    setStructure({ ...scenario.structure });
    setDeductions(scenario.deductions.map(deduction => ({ ...deduction })));
    setBudgetRule(scenario.budgetRule);
    setBudgetCategories(scenario.budgetCategories.map(category => ({ ...category })));
    setSelectedScenarioId(scenario.id);
    setEditingScenarioId(scenario.id);
    setMessage({ type: 'success', text: `${scenario.name} ${copy.loaded}` });
  };

  const handleLoadSelected = () => {
    const scenario = scenarios.find(item => item.id === selectedScenarioId);
    if (scenario) loadScenario(scenario);
  };

  const handleDeleteSelected = () => {
    const scenario = scenarios.find(item => item.id === selectedScenarioId);
    if (!scenario || !confirm(`${copy.deleteConfirm} "${scenario.name}"?`)) return;
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
    setDeductions(prev => [...prev, { id: `custom-${Date.now()}`, label: copy.addDeduction, amount: 0, isPercentage: false }]);
  };

  const updateDeduction = (index: number, field: keyof DeductionItem, value: string | number | boolean) => {
    setDeductions(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const removeDeduction = (index: number) => {
    setDeductions(prev => prev.filter((_, i) => i !== index));
  };

  const updateGrossMonthly = (nextGrossMonthly: number) => {
    setGrossMonthly(nextGrossMonthly);
    if (!payrollRowsCustomized) {
      setPayrollRows(prev => prev.map(row => ({ ...row, grossMonthly: nextGrossMonthly })));
    }
  };

  const updatePayrollRow = (id: string, field: keyof PayrollVariationRow, value: string | number) => {
    setPayrollRowsCustomized(true);
    setPayrollRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      if (field === 'label') return { ...row, label: String(value) };
      return { ...row, [field]: Math.max(0, Number(value)) };
    }));
  };

  const removePayrollRow = (id: string) => {
    setPayrollRowsCustomized(true);
    setPayrollRows(prev => prev.filter(row => row.id !== id));
  };

  const addPayrollRow = () => {
    setPayrollRowsCustomized(true);
    setPayrollRows(prev => [...prev, createPayrollRow(`${copy.period} ${prev.length + 1}`, 1, grossMonthly, currentPfMonthly, monthlyTaxDeducted)]);
  };

  const resetPayrollRowsFromCurrent = () => {
    setPayrollRowsCustomized(false);
    setPayrollRows([
      createPayrollRow(copy.beforeIncrement, 6, grossMonthly, currentPfMonthly, monthlyTaxDeducted),
      createPayrollRow(copy.afterIncrement, 6, grossMonthly, currentPfMonthly, monthlyTaxDeducted),
    ]);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 overflow-x-hidden animate-fade-in sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-lg shadow-emerald-500/25">
              <Calculator className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <span className="min-w-0">{copy.title}</span>
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {copy.subtitle} {selectedFiscalYear} &middot; {copy.taxCalculation}
          </p>
        </div>
        <div className="grid gap-3 sm:flex sm:items-center">
          <label className="grid gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 sm:flex sm:items-center sm:gap-2">
            <span>{copy.fiscalYearShort}</span>
            <select
              value={selectedFiscalYear}
              onChange={(event) => setSelectedFiscalYear(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
            >
              {fiscalYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 sm:flex">
            {(['male', 'female'] as const).map(cat => (
              <button key={cat} onClick={() => setTaxCategory(cat)}
                className={cn('px-4 py-2 text-xs font-semibold capitalize transition-all', taxCategory === cat ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700')}>
                {cat === 'female' ? copy.female : copy.male}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)_auto] lg:items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{copy.planName}</label>
            <input
              type="text"
              value={planName}
              onChange={(event) => setPlanName(event.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{copy.savedPlans}</label>
            <select
              value={selectedScenarioId}
              onChange={(event) => setSelectedScenarioId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">{copy.noSavedPlan}</option>
              {scenarios.map(scenario => (
                <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              onClick={handleLoadSelected}
              disabled={!selectedScenarioId || isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <FolderOpen className="h-3.5 w-3.5" /> {copy.load}
            </button>
            <button
              onClick={() => handleSave('update')}
              disabled={!editingScenarioId || isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {copy.update}
            </button>
            <button
              onClick={() => handleSave('new')}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> {copy.saveNew}
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={!selectedScenarioId || isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> {copy.delete}
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
      <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {[
          { label: copy.grossMonthly, value: result.grossMonthly, icon: DollarSign, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
          { label: copy.netMonthly, value: result.netMonthly, icon: TrendingUp, gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/20' },
          { label: copy.annualTax, value: result.totalTax, icon: Minus, gradient: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/20' },
          { label: copy.effectiveTaxRate, value: null, icon: PieChart, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', display: `${result.effectiveTaxRate.toFixed(1)}%` },
        ].map((card, i) => (
          <div key={i} className={cn('min-w-0 rounded-2xl border border-slate-200 bg-white p-4 animate-slide-up dark:border-slate-700/50 dark:bg-slate-800/50 sm:p-5', `stagger-${i + 1}`)}>
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('p-1.5 rounded-lg bg-gradient-to-br text-white shadow-lg', card.gradient, card.shadow)}>
                <card.icon className="h-3.5 w-3.5" />
              </div>
              <span className="min-w-0 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{card.label}</span>
            </div>
            <p className="break-words text-lg font-bold leading-tight text-slate-900 dark:text-white sm:text-xl">
              {card.display ?? fmt(card.value!, currency, locale)}
            </p>
          </div>
        ))}
      </div>

      {/* Input & Results */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-5 lg:gap-6">
        {/* Left: Inputs */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {/* Gross Salary */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <DollarSign className="h-4 w-4 shrink-0 text-indigo-500" /> <span className="min-w-0">{copy.grossSalary}</span>
            </h2>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{copy.monthlyGross} ({currency})</label>
            <input type="number" value={grossMonthly} onChange={e => updateGrossMonthly(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.festivalBonus}:</label>
              <input type="number" min={0} max={6} value={bonusMonths} onChange={e => setBonusMonths(Math.max(0, Math.min(6, Number(e.target.value))))}
                className="w-16 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm text-center text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          {/* Salary Structure */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50 sm:p-5">
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-start justify-between gap-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
              <span className="flex min-w-0 items-start gap-2"><BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" /> <span className="min-w-0">{copy.salaryStructure}</span></span>
              {showAdvanced ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-3">
                {[
                  { label: copy.basicPercent, key: 'basicPercent' as const, min: 30, max: 100 },
                  { label: copy.houseRentPercent, key: 'houseRentPercent' as const, min: 0, max: 100 },
                  { label: copy.medicalPercent, key: 'medicalPercent' as const, min: 0, max: 100 },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{f.label}</label>
                    <input type="number" min={f.min} max={f.max} value={structure[f.key]}
                      onChange={e => setStructure(prev => ({ ...prev, [f.key]: Math.max(f.min, Math.min(f.max, Number(e.target.value))) }))}
                      className="w-full mt-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.conveyanceFlat} ({currency})</label>
                  <input type="number" min={0} value={structure.conveyanceFlat}
                    onChange={e => setStructure(prev => ({ ...prev, conveyanceFlat: Math.max(0, Number(e.target.value)) }))}
                    className="w-full mt-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
            )}
          </div>

          {/* Deductions */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Minus className="h-4 w-4 shrink-0 text-rose-500" /> <span className="min-w-0">{copy.monthlyDeductions}</span>
              </h2>
              <div className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                {fmt(result.totalDeductionsMonthly, currency, locale)}
              </div>
            </div>
            <div className="space-y-3">
              {deductions.map((d, i) => (
                <div key={d.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700/50 dark:bg-slate-900/30">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(5rem,7rem)_5.5rem_auto] sm:items-end">
                    <label className="grid min-w-0 gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{copy.deductionName}</span>
                      <input type="text" value={d.label} onChange={e => updateDeduction(i, 'label', e.target.value)}
                        className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                    </label>
                    <label className="grid min-w-0 gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{copy.deductionAmount}</span>
                      <input type="number" min={0} value={d.amount} onChange={e => updateDeduction(i, 'amount', Math.max(0, Number(e.target.value)))}
                        className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                    </label>
                    <label className="grid min-w-0 gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{copy.deductionMode}</span>
                      <select value={d.isPercentage ? 'pct' : 'flat'} onChange={e => updateDeduction(i, 'isPercentage', e.target.value === 'pct')}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                        <option value="flat">{currency}</option>
                        <option value="pct">%</option>
                      </select>
                    </label>
                    <button onClick={() => removeDeduction(i)} className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-500 transition-colors hover:bg-rose-50 dark:border-rose-500/20 dark:bg-slate-800 dark:hover:bg-rose-500/10" aria-label={copy.delete}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs dark:bg-slate-800/70">
                    <span className="font-medium text-slate-500 dark:text-slate-400">{copy.monthlyImpact}</span>
                    <span className="min-w-0 break-words text-right font-bold text-rose-600 dark:text-rose-300">
                      {fmt(result.deductionDetails[i]?.monthly ?? 0, currency, locale)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addDeduction}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 px-3 py-2.5 text-xs font-semibold text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/15">
              <Plus className="h-3.5 w-3.5" /> {copy.addDeduction}
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="min-w-0 space-y-4 lg:col-span-3">
          {/* Tab Navigation */}
          <div className="-mx-1 overflow-x-auto px-1">
            <div className="flex min-w-max overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 sm:min-w-0">
            {([['overview', copy.overview], ['tax', copy.taxBreakdown], ['compare', copy.compare], ['charts', copy.charts], ['planner', copy.budgetPlanner]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={cn('min-w-24 flex-1 px-3 py-2.5 text-xs font-semibold transition-all sm:min-w-0 sm:px-4', activeTab === key ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700')}>
                {label}
              </button>
            ))}
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
              <div className="border-b border-slate-100 p-4 dark:border-slate-700/50 sm:p-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{copy.salaryBreakdown}</h3>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                {[
                  { label: copy.basicSalary, monthly: result.basicMonthly, annual: result.basicAnnual, color: 'text-blue-600 dark:text-blue-400' },
                  { label: copy.houseRent, monthly: result.houseRentMonthly, annual: result.houseRentAnnual, color: 'text-purple-600 dark:text-purple-400' },
                  { label: copy.medical, monthly: result.medicalMonthly, annual: result.medicalAnnual, color: 'text-teal-600 dark:text-teal-400' },
                  { label: copy.conveyance, monthly: result.conveyanceMonthly, annual: result.conveyanceAnnual, color: 'text-amber-600 dark:text-amber-400' },
                  { label: copy.otherAllowance, monthly: result.otherAllowanceMonthly, annual: result.otherAllowanceAnnual, color: 'text-slate-600 dark:text-slate-400' },
                ].map(row => (
                  <div key={row.label} className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700/50 dark:bg-slate-900/30">
                    <p className={cn('text-sm font-bold leading-5', row.color)}>{row.label}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="min-w-0 rounded-xl bg-white p-2 dark:bg-slate-800/70">
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{copy.monthlyLabel}</p>
                        <p className="mt-1 break-words text-sm font-bold text-slate-900 dark:text-white">{fmt(row.monthly, currency, locale)}</p>
                      </div>
                      <div className="min-w-0 rounded-xl bg-white p-2 dark:bg-slate-800/70">
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{copy.annualLabel}</p>
                        <p className="mt-1 break-words text-sm font-bold text-slate-900 dark:text-white">{fmt(row.annual, currency, locale)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-900/20 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700/50 dark:bg-slate-800/80">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.grossMonthly}</p>
                    <p className="mt-1 break-words text-base font-bold text-slate-900 dark:text-white">{fmt(result.grossMonthly, currency, locale)}</p>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-rose-100 bg-white p-3 dark:border-rose-500/20 dark:bg-slate-800/80">
                    <p className="text-xs font-semibold text-rose-500 dark:text-rose-300">(-) {copy.monthlyTax}</p>
                    <p className="mt-1 break-words text-base font-bold text-rose-600 dark:text-rose-300">{fmt(result.monthlyTax, currency, locale)}</p>
                  </div>
                  {result.deductionDetails.filter(d => d.monthly > 0).map(d => (
                    <div key={d.label} className="min-w-0 rounded-2xl border border-rose-100 bg-white p-3 dark:border-rose-500/20 dark:bg-slate-800/80">
                      <p className="text-xs font-semibold leading-5 text-rose-500 dark:text-rose-300">(-) {d.label}</p>
                      <p className="mt-1 break-words text-base font-bold text-rose-600 dark:text-rose-300">{fmt(d.monthly, currency, locale)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 p-4 dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-green-500/10">
                  <p className="text-sm font-bold leading-5 text-emerald-700 dark:text-emerald-300">{copy.netTakeHomeMonthly}</p>
                  <p className="mt-1 break-words text-xl font-bold text-emerald-700 dark:text-emerald-300">{fmt(result.netMonthly, currency, locale)}</p>
                </div>
              </div>
              <div className="border-t border-slate-100 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50 sm:p-5">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{copy.annualSummary}</h4>
                <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
                  {[
                    { label: copy.grossAnnual, value: result.grossAnnual, color: 'text-blue-600 dark:text-blue-400' },
                    { label: copy.totalDeductions, value: result.totalDeductionsAnnual, color: 'text-orange-600 dark:text-orange-400' },
                    { label: copy.totalTax, value: result.totalTax, color: 'text-rose-600 dark:text-rose-400' },
                    { label: copy.netAnnual, value: result.netAnnual, color: 'text-emerald-600 dark:text-emerald-400' },
                  ].map(item => (
                    <div key={item.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600/50 dark:bg-slate-700/40">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                      <p className={cn('mt-1 break-words text-sm font-bold', item.color)}>{fmt(item.value, currency, locale)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden">
                <div className="border-b border-slate-100 p-4 dark:border-slate-700/50 sm:p-5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{copy.employeeTaxWorksheet} — {copy.fiscalYearShort} {selectedFiscalYear}</h3>
                  <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    <Info className="mt-0.5 h-3 w-3 shrink-0" /> <span>{taxCategory === 'female' ? copy.femaleSlabs : copy.maleSlabs} {copy.slabsFromAdmin} {usePayrollVariations ? copy.usingPayrollRows : copy.usingCurrentGross}</span>
                  </p>
                </div>

                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4 sm:p-5">
                  <label className="min-w-0 space-y-1.5">
                    <span className="flex items-start gap-1.5 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span className="min-w-0">{copy.minimumTaxArea}</span></span>
                    <select
                      value={minimumTaxArea}
                      onChange={(event) => setMinimumTaxArea(event.target.value as typeof minimumTaxArea)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    >
                      {MINIMUM_TAX_OPTIONS.map(option => <option key={option.key} value={option.key}>{copy.minimumTaxOptions[option.key]}</option>)}
                    </select>
                  </label>
                  <label className="min-w-0 space-y-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.manualRebate}</span>
                    <input type="number" min={0} value={investmentRebate} onChange={event => setInvestmentRebate(Math.max(0, Number(event.target.value)))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                  </label>
                  <div className="min-w-0 space-y-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.pfRebate}</span>
                    <label className="flex min-h-[42px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700/50 dark:bg-slate-900/30">
                      <span className="min-w-0 font-medium leading-5 text-slate-700 dark:text-slate-200">{copy.calculateOnPf}</span>
                      <input type="checkbox" checked={includePfInRebate} onChange={event => setIncludePfInRebate(event.target.checked)} className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600" />
                    </label>
                    <p className="text-[11px] leading-4 text-slate-400 dark:text-slate-500">
                      {copy.pfRebateBase}: {fmt(taxBase.pfAnnual, currency, locale)}
                    </p>
                  </div>
                  <label className="min-w-0 space-y-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.pfRebateRate}</span>
                    <input type="number" min={0} max={100} value={pfRebateRate} disabled={!includePfInRebate} onChange={event => setPfRebateRate(Math.min(100, Math.max(0, Number(event.target.value))))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                  </label>
                  <label className="min-w-0 space-y-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.monthlyTaxDeducted}</span>
                    <input type="number" min={0} value={monthlyTaxDeducted} disabled={usePayrollVariations} onChange={event => setMonthlyTaxDeducted(Math.max(0, Number(event.target.value)))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                  </label>
                  <label className="min-w-0 space-y-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.otherTaxAdjustment}</span>
                    <input type="number" value={otherTaxAdjustment} onChange={event => setOtherTaxAdjustment(Number(event.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                  </label>
                  <label className="min-w-0 space-y-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.additionalTaxPaid}</span>
                    <input type="number" min={0} value={additionalTaxPaid} onChange={event => setAdditionalTaxPaid(Math.max(0, Number(event.target.value)))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                  </label>
                  <label className="min-w-0 space-y-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.actualFestivalBonusAnnual}</span>
                    <input type="number" min={0} value={actualFestivalBonusAnnual} onChange={event => setActualFestivalBonusAnnual(Math.max(0, Number(event.target.value)))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                    <span className="block text-[11px] leading-4 text-slate-400 dark:text-slate-500">{copy.actualFestivalBonusHelp}</span>
                  </label>
                  <div className="flex items-end md:col-span-2">
                    <label className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700/50 dark:bg-slate-900/30">
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{copy.usePayrollVariations}</span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">{copy.usePayrollVariationsHelp}</span>
                      </span>
                      <input type="checkbox" checked={usePayrollVariations} onChange={event => setUsePayrollVariations(event.target.checked)} className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600" />
                    </label>
                  </div>
                </div>
              </div>

              {usePayrollVariations && (
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50 overflow-hidden">
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-700/50 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{copy.payrollVariation}</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.payrollVariationHelp}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button onClick={resetPayrollRowsFromCurrent} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{copy.reset}</button>
                      <button onClick={addPayrollRow} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"><Plus className="h-3.5 w-3.5" /> {copy.period}</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto" aria-label={copy.payrollVariation}>
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/30">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.period}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.months}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.grossPerMonth}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.pfDeduction}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.taxDeducted}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.annualGross}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {payrollRows.map(row => (
                          <tr key={row.id}>
                            <td className="px-4 py-3">
                              <input value={row.label} onChange={event => updatePayrollRow(row.id, 'label', event.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input type="number" min={0} max={12} value={row.months} onChange={event => updatePayrollRow(row.id, 'months', event.target.value)}
                                className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-2 text-right text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input type="number" min={0} value={row.grossMonthly} onChange={event => updatePayrollRow(row.id, 'grossMonthly', event.target.value)}
                                className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-2 text-right text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input type="number" min={0} value={row.pfMonthly} onChange={event => updatePayrollRow(row.id, 'pfMonthly', event.target.value)}
                                className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-2 text-right text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input type="number" min={0} value={row.taxDeductedMonthly} onChange={event => updatePayrollRow(row.id, 'taxDeductedMonthly', event.target.value)}
                                className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-2 text-right text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-semibold text-slate-900 dark:text-white">{fmt(row.grossMonthly * row.months, currency)}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => removePayrollRow(row.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={cn('border-t px-4 py-3 text-xs font-medium leading-5 sm:px-5', payrollTaxBase.months === 12 ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300')}>
                    {copy.totalMonths}: {payrollTaxBase.months}. {payrollTaxBase.months === 12 ? copy.fullFiscalYearCovered : copy.adjustPeriods}
                    {payrollRowsCustomized ? ' Main gross salary changes will not overwrite customized periods. Use Reset to sync periods from the current gross salary.' : ' Period gross values are synced from the main gross salary until you edit the period table.'}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: copy.estimatedAnnualTax, value: employeeTaxWorksheet.estimatedAnnualTax, icon: Landmark, color: 'text-rose-600 dark:text-rose-400' },
                  { label: copy.monthlyPayrollTarget, value: employeeTaxWorksheet.monthlyWithholdingTarget, icon: ReceiptText, color: 'text-indigo-600 dark:text-indigo-400' },
                  { label: copy.alreadyPaidDeducted, value: employeeTaxWorksheet.alreadyPaid, icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: employeeTaxWorksheet.balance >= 0 ? copy.balanceDue : copy.possibleRefund, value: Math.abs(employeeTaxWorksheet.balance), icon: FileText, color: employeeTaxWorksheet.balance >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
                ].map(item => (
                  <div key={item.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
                    <div className="mb-2 flex items-center gap-2">
                      <item.icon className={cn('h-4 w-4 shrink-0', item.color)} />
                      <p className="min-w-0 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{item.label}</p>
                    </div>
                    <p className={cn('break-words text-lg font-bold', item.color)}>{fmt(item.value, currency, locale)}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
                  <div className="border-b border-slate-100 p-4 dark:border-slate-700/50 sm:p-5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{copy.annualIncomeToTaxable}</h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {[
                      [copy.basicSalary, taxBase.basicAnnual],
                      [copy.houseRent, taxBase.houseRentAnnual],
                      [copy.medical, taxBase.medicalAnnual],
                      [copy.conveyance, taxBase.conveyanceAnnual],
                      [copy.otherAllowance, taxBase.otherAllowanceAnnual],
                      [copy.festivalBonus, taxBase.bonusAnnual],
                      [copy.employerPfContribution, taxBase.pfAnnual],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="grid gap-1 px-4 py-3 sm:flex sm:items-start sm:justify-between sm:gap-3 sm:px-5">
                        <span className="min-w-0 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">{label}</span>
                        <span className="min-w-0 break-words text-xs font-semibold text-slate-900 dark:text-white sm:shrink-0 sm:text-right">{fmt(Number(value), currency, locale)}</span>
                      </div>
                    ))}
                    <div className="grid gap-1 bg-slate-50 px-4 py-3 dark:bg-slate-700/30 sm:flex sm:items-start sm:justify-between sm:gap-3 sm:px-5">
                      <span className="min-w-0 text-xs font-bold text-slate-900 dark:text-white">{copy.grossAnnualIncome}</span>
                      <span className="min-w-0 break-words text-xs font-bold text-slate-900 dark:text-white sm:shrink-0 sm:text-right">{fmt(taxBase.grossAnnual, currency, locale)}</span>
                    </div>
                    <div className="grid gap-1 px-4 py-3 sm:flex sm:items-start sm:justify-between sm:gap-3 sm:px-5">
                      <span className="min-w-0 text-xs font-medium leading-5 text-rose-600 dark:text-rose-400">{copy.employmentExemption}</span>
                      <span className="min-w-0 break-words text-xs font-semibold text-rose-600 dark:text-rose-400 sm:shrink-0 sm:text-right">{fmt(taxBase.employmentExemptionAnnual, currency, locale)}</span>
                    </div>
                    <div className="grid gap-1 bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10 sm:flex sm:items-start sm:justify-between sm:gap-3 sm:px-5">
                      <span className="min-w-0 text-xs font-bold text-emerald-700 dark:text-emerald-300">{copy.taxableIncome}</span>
                      <span className="min-w-0 break-words text-xs font-bold text-emerald-700 dark:text-emerald-300 sm:shrink-0 sm:text-right">{fmt(taxBase.taxableIncome, currency, locale)}</span>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
                  <div className="border-b border-slate-100 p-4 dark:border-slate-700/50 sm:p-5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{copy.filingSummary}</h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {[
                      [copy.taxFreeBand, employeeTaxWorksheet.taxFreeBand],
                      [copy.slabBasedAnnualTax, taxBase.slabTax],
                      [copy.manualRebate, -investmentRebate],
                      [`${copy.pfRebate}${includePfInRebate ? ` (${pfRebateRate}%)` : ''}`, -pfRebate],
                      [copy.minimumTaxApplied, employeeTaxWorksheet.minimumTax],
                      [copy.otherAdjustment, otherTaxAdjustment],
                      [copy.estimatedAnnualTax, employeeTaxWorksheet.estimatedAnnualTax],
                      [copy.alreadyPaidWithheld, -employeeTaxWorksheet.alreadyPaid],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="grid gap-1 px-4 py-3 sm:flex sm:items-start sm:justify-between sm:gap-3 sm:px-5">
                        <span className="min-w-0 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">{label}</span>
                        <span className={cn('min-w-0 break-words text-xs font-semibold sm:shrink-0 sm:text-right', Number(value) < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white')}>
                          {Number(value) < 0 ? fmtSigned(Number(value), currency, locale) : fmt(Number(value), currency, locale)}
                        </span>
                      </div>
                    ))}
                    <div className={cn('grid gap-1 px-4 py-3 sm:flex sm:items-start sm:justify-between sm:gap-3 sm:px-5', employeeTaxWorksheet.balance >= 0 ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10')}>
                      <span className={cn('min-w-0 text-xs font-bold leading-5', employeeTaxWorksheet.balance >= 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300')}>
                        {employeeTaxWorksheet.balance >= 0 ? copy.estimatedBalanceDue : copy.estimatedOverpaidRefund}
                      </span>
                      <span className={cn('min-w-0 break-words text-xs font-bold sm:shrink-0 sm:text-right', employeeTaxWorksheet.balance >= 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300')}>
                        {fmt(Math.abs(employeeTaxWorksheet.balance), currency, locale)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden">
                <div className="border-b border-slate-100 p-4 dark:border-slate-700/50 sm:p-5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{copy.slabCalculation}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-700/30">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.slab}</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.rate}</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.taxableInSlab}</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.tax}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {taxBase.taxSlabBreakdown.map((row, i) => (
                        <tr key={`${row.slab.label}-${i}`} className={cn(row.taxableAmount > 0 ? '' : 'opacity-40')}>
                          <td className="px-5 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">{row.slab.label}</td>
                          <td className="px-5 py-3 text-xs text-right font-semibold text-slate-900 dark:text-white">{row.slab.rate}%</td>
                          <td className="px-5 py-3 text-xs text-right text-slate-600 dark:text-slate-400">{fmt(row.taxableAmount, currency, locale)}</td>
                          <td className="px-5 py-3 text-xs text-right font-semibold text-rose-600 dark:text-rose-400">{fmt(row.tax, currency, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50 sm:p-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{copy.employeeTaxDocuments}</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    locale === 'bn-BD' ? 'TIN / ই-রিটার্ন অ্যাকাউন্ট তথ্য' : 'TIN / e-return account information',
                    locale === 'bn-BD' ? 'নিয়োগকর্তার বেতন সার্টিফিকেট' : 'Salary certificate from employer',
                    locale === 'bn-BD' ? 'মাসিক কর কর্তন বা TDS সার্টিফিকেট' : 'Monthly tax deduction or TDS certificate',
                    locale === 'bn-BD' ? 'বিনিয়োগ ও PF রিবেট ডকুমেন্ট বা কন্ট্রিবিউশন প্রমাণ' : 'Investment and PF rebate documents or contribution proof',
                    locale === 'bn-BD' ? 'ব্যাংক, মোবাইল ব্যাংকিং বা চালান পেমেন্ট প্রমাণ' : 'Bank, mobile banking, or challan payment proof',
                    locale === 'bn-BD' ? 'থাকলে আগের রিটার্ন অ্যাকনলেজমেন্ট' : 'Previous return acknowledgement if available',
                  ].map(item => (
                    <div key={item} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="min-w-0">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  {copy.taxDisclaimer}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-700/50 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-indigo-500" /> {copy.compareWithSavedPlan}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.compareHelp}</p>
                </div>
                <select
                  value={compareScenarioId}
                  onChange={(event) => setCompareScenarioId(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white sm:w-auto sm:min-w-56"
                >
                  <option value="">{copy.chooseSavedPlan}</option>
                  {scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
                </select>
              </div>
              {compareScenario && compareResult ? (
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { label: copy.currentPlan, name: planName, fiscalYear: selectedFiscalYear, net: result.netMonthly, tax: result.totalTax },
                      { label: copy.savedPlan, name: compareScenario.name, fiscalYear: compareScenario.fiscalYear, net: compareResult.netMonthly, tax: compareResult.totalTax },
                    ].map(item => (
                      <div key={item.label} className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700/50">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</p>
                        <p className="mt-1 break-words text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">FY {item.fiscalYear}</p>
                        <div className="mt-3 grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{copy.netMonthly}</p>
                            <p className="break-words text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(item.net, currency, locale)}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{copy.annualTax}</p>
                            <p className="break-words text-sm font-bold text-rose-600 dark:text-rose-400">{fmt(item.tax, currency, locale)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/30">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.metric}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.current}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.saved}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.difference}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {[
                          [copy.monthlyGross, result.grossMonthly, compareResult.grossMonthly],
                          [copy.netMonthly, result.netMonthly, compareResult.netMonthly],
                          [copy.grossAnnual, result.grossAnnual, compareResult.grossAnnual],
                          [copy.netAnnual, result.netAnnual, compareResult.netAnnual],
                          [copy.annualTax, result.totalTax, compareResult.totalTax],
                        ].map(([label, current, saved]) => {
                          const diff = Number(current) - Number(saved);
                          return (
                            <tr key={label}>
                              <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">{label}</td>
                              <td className="px-4 py-3 text-right text-xs font-semibold text-slate-900 dark:text-white">{fmt(Number(current), currency, locale)}</td>
                              <td className="px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">{fmt(Number(saved), currency, locale)}</td>
                              <td className={cn('px-4 py-3 text-right text-xs font-bold', diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                                {diff >= 0 ? '+' : ''}{fmt(diff, currency, locale)}
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
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.saveAtLeastOne}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.saveAtLeastOneHelp}</p>
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
