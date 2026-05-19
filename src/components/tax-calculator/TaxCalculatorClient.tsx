'use client';

import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, BadgePercent, Banknote, Calculator, FileText, Landmark, MapPin, Minus, Percent, Plus, ReceiptText, RotateCcw, ShieldCheck, Trash2, WalletCards } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { cn, formatCurrency } from '@/lib/utils';
import {
  calculateEmploymentTaxBase,
  calculateSalary,
  calculateTax,
  DEFAULT_DEDUCTIONS,
  DEFAULT_STRUCTURE,
  getSalaryValidationMessages,
  type DeductionItem,
  type SalaryStructure,
  type SalaryTaxCategory,
  type TaxSlab,
} from '@/lib/salary-calculator';

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

type TaxCalculatorClientProps = {
  currency: string;
  initialFiscalYear: string;
  fiscalYears: string[];
  taxConfigsByYear: Record<string, { male: TaxSlab[]; female: TaxSlab[] }>;
};

function fmt(value: number, currency: string, locale = 'bn-BD') {
  return formatCurrency(value, currency, locale);
}

function fmtSigned(value: number, currency: string, locale = 'bn-BD') {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${fmt(value, currency, locale)}`;
}

function optionalNumberValue(value: number) {
  return value === 0 ? '' : String(value);
}

function parseOptionalNumber(value: string) {
  return value === '' ? 0 : Number(value);
}

function createPayrollRow(id: string, label: string, months: number, grossMonthly: number, pfMonthly = 0, taxDeductedMonthly = 0): PayrollVariationRow {
  return { id, label, months, grossMonthly, pfMonthly, taxDeductedMonthly };
}

function getDeduction(deductions: DeductionItem[], id: string) {
  return deductions.find(item => item.id === id);
}

export default function TaxCalculatorClient({
  currency,
  initialFiscalYear,
  fiscalYears,
  taxConfigsByYear,
}: TaxCalculatorClientProps) {
  const { locale, messages } = useI18n();
  const copy = messages.pages.salaryPlanner;

  const [grossMonthly, setGrossMonthly] = useState(75000);
  const [structure, setStructure] = useState<SalaryStructure>({ ...DEFAULT_STRUCTURE });
  const [deductions, setDeductions] = useState<DeductionItem[]>(DEFAULT_DEDUCTIONS.map(item => ({ ...item })));
  const [taxCategory, setTaxCategory] = useState<SalaryTaxCategory>('male');
  const [bonusMonths, setBonusMonths] = useState(2);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(initialFiscalYear);
  const [minimumTaxArea, setMinimumTaxArea] = useState<typeof MINIMUM_TAX_OPTIONS[number]['key']>('dhakaChittagong');
  const [investmentRebate, setInvestmentRebate] = useState(0);
  const [includePfInRebate, setIncludePfInRebate] = useState(false);
  const [pfRebateRate, setPfRebateRate] = useState(15);
  const [otherTaxAdjustment, setOtherTaxAdjustment] = useState(0);
  const [monthlyTaxDeducted, setMonthlyTaxDeducted] = useState(0);
  const [additionalTaxPaid, setAdditionalTaxPaid] = useState(0);
  const [actualFestivalBonusAnnual, setActualFestivalBonusAnnual] = useState(0);
  const [usePayrollVariations, setUsePayrollVariations] = useState(false);
  const [payrollRowsCustomized, setPayrollRowsCustomized] = useState(false);
  const [payrollRows, setPayrollRows] = useState<PayrollVariationRow[]>([
    createPayrollRow('before-increment', copy.beforeIncrement, 9, 75000),
    createPayrollRow('after-increment', copy.afterIncrement, 3, 75000),
  ]);

  const getSlabs = useCallback((fiscalYear: string, category: SalaryTaxCategory) => {
    const yearConfig = taxConfigsByYear[fiscalYear];
    const slabs = category === 'female' ? yearConfig?.female : yearConfig?.male;
    return slabs?.length ? slabs : undefined;
  }, [taxConfigsByYear]);

  const result = useMemo(() => calculateSalary(
    grossMonthly,
    structure,
    deductions,
    taxCategory,
    bonusMonths,
    getSlabs(selectedFiscalYear, 'male'),
    getSlabs(selectedFiscalYear, 'female'),
  ), [grossMonthly, structure, deductions, taxCategory, bonusMonths, selectedFiscalYear, getSlabs]);

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

    const grossAnnual = totals.salaryGrossAnnual + effectiveFestivalBonusAnnual + totals.variablePfAnnual;
    const { employmentExemptionAnnual, taxableIncome } = calculateEmploymentTaxBase(grossAnnual);
    const tax = calculateTax(taxableIncome, result.taxSlabBreakdown.map(row => row.slab));

    return {
      ...totals,
      bonusAnnual: effectiveFestivalBonusAnnual,
      grossAnnual,
      totalDeductionsAnnual: totals.variablePfAnnual + (nonPfMonthlyDeductions * 12),
      employmentExemptionAnnual,
      taxableIncome,
      slabTax: tax.total,
      taxSlabBreakdown: tax.breakdown,
      alreadyPaid: totals.variableTaxDeductedAnnual + additionalTaxPaid,
      pfAnnual: totals.variablePfAnnual,
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
    currentPfMonthly,
    result.basicAnnual,
    result.conveyanceAnnual,
    result.grossMonthly,
    result.houseRentAnnual,
    result.medicalAnnual,
    result.otherAllowanceAnnual,
    result.taxSlabBreakdown,
    result.totalDeductionsAnnual,
    effectiveFestivalBonusAnnual,
    monthlyTaxDeducted,
    additionalTaxPaid,
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
    alreadyPaid: payrollTaxBase.alreadyPaid,
    pfAnnual: payrollTaxBase.pfAnnual,
  } : standardTaxBase, [usePayrollVariations, payrollTaxBase, standardTaxBase]);

  const pfRebate = useMemo(() => includePfInRebate ? (taxBase.pfAnnual * Math.max(0, pfRebateRate)) / 100 : 0, [includePfInRebate, taxBase.pfAnnual, pfRebateRate]);
  const totalRebate = useMemo(() => investmentRebate + pfRebate, [investmentRebate, pfRebate]);
  const employeeTaxWorksheet = useMemo(() => {
    const minimumTax = MINIMUM_TAX_OPTIONS.find(option => option.key === minimumTaxArea)?.amount ?? 0;
    const taxAfterRebate = Math.max(0, taxBase.slabTax - totalRebate);
    const taxAfterMinimum = Math.max(taxAfterRebate, taxBase.taxableIncome > 0 ? minimumTax : 0);
    const estimatedAnnualTax = Math.max(0, taxAfterMinimum + otherTaxAdjustment);
    const balance = estimatedAnnualTax - taxBase.alreadyPaid;
    const taxFreeBand = taxBase.taxSlabBreakdown.find(row => row.slab.rate === 0)?.slab.max ?? 0;

    return {
      minimumTax,
      taxAfterRebate,
      estimatedAnnualTax,
      monthlyWithholdingTarget: estimatedAnnualTax / 12,
      alreadyPaid: taxBase.alreadyPaid,
      balance,
      taxFreeBand,
    };
  }, [minimumTaxArea, taxBase, totalRebate, otherTaxAdjustment]);

  const validationMessages = useMemo(() => {
    const messages = getSalaryValidationMessages(grossMonthly, structure, deductions, bonusMonths);
    const activeConfig = taxConfigsByYear[selectedFiscalYear];
    if (!activeConfig?.male?.length && !activeConfig?.female?.length) {
      messages.push(`${copy.noTaxConfig} ${copy.fiscalYearShort} ${selectedFiscalYear}`);
    }
    if (usePayrollVariations && payrollTaxBase.months !== 12) {
      messages.push(`${copy.totalMonths}: ${payrollTaxBase.months}. ${copy.adjustPeriods}`);
    }
    return messages;
  }, [grossMonthly, structure, deductions, bonusMonths, selectedFiscalYear, taxConfigsByYear, copy, usePayrollVariations, payrollTaxBase.months]);

  const updateGrossMonthly = (nextGrossMonthly: number) => {
    setGrossMonthly(nextGrossMonthly);
    if (!payrollRowsCustomized) {
      setPayrollRows(prev => prev.map(row => ({ ...row, grossMonthly: nextGrossMonthly })));
    }
  };

  const updateStructure = (field: keyof SalaryStructure, value: number) => {
    setStructure(prev => ({ ...prev, [field]: Math.max(0, value) }));
  };

  const updateDeduction = (id: string, value: number) => {
    setDeductions(prev => prev.map(item => item.id === id ? { ...item, amount: Math.max(0, value) } : item));
  };

  const updatePayrollRow = (id: string, field: keyof PayrollVariationRow, value: string | number) => {
    setPayrollRowsCustomized(true);
    setPayrollRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      if (field === 'label') return { ...row, label: String(value) };
      return { ...row, [field]: Math.max(0, Number(value)) };
    }));
  };

  const resetPayrollRowsFromCurrent = () => {
    setPayrollRowsCustomized(false);
    setPayrollRows([
      createPayrollRow('before-increment', copy.beforeIncrement, 9, grossMonthly, currentPfMonthly, monthlyTaxDeducted),
      createPayrollRow('after-increment', copy.afterIncrement, 3, grossMonthly, currentPfMonthly, monthlyTaxDeducted),
    ]);
  };

  const addPayrollRow = () => {
    setPayrollRowsCustomized(true);
    setPayrollRows(prev => [...prev, createPayrollRow(`period-${Date.now()}`, `${copy.period} ${prev.length + 1}`, 1, grossMonthly, currentPfMonthly, monthlyTaxDeducted)]);
  };

  const removePayrollRow = (id: string) => {
    setPayrollRowsCustomized(true);
    setPayrollRows(prev => prev.filter(row => row.id !== id));
  };

  const pfDeduction = getDeduction(deductions, 'pf');
  const insuranceDeduction = getDeduction(deductions, 'insurance');
  const otherDeduction = getDeduction(deductions, 'other');
  const balanceIsDue = employeeTaxWorksheet.balance >= 0;

  const summaryCards = [
    { label: copy.grossAnnualIncome, value: taxBase.grossAnnual, icon: Banknote, tone: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: copy.taxableIncome, value: taxBase.taxableIncome, icon: Percent, tone: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: copy.estimatedAnnualTax, value: employeeTaxWorksheet.estimatedAnnualTax, icon: Landmark, tone: 'text-rose-600 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-500/10' },
    { label: balanceIsDue ? copy.balanceDue : copy.possibleRefund, value: Math.abs(employeeTaxWorksheet.balance), icon: FileText, tone: balanceIsDue ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300', bg: balanceIsDue ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10' },
  ];

  const incomeRows = [
    { label: copy.basicSalary, value: taxBase.basicAnnual, taxable: true },
    { label: copy.houseRent, value: taxBase.houseRentAnnual, taxable: false },
    { label: copy.medical, value: taxBase.medicalAnnual, taxable: false },
    { label: copy.conveyance, value: taxBase.conveyanceAnnual, taxable: false },
    { label: copy.otherAllowance, value: taxBase.otherAllowanceAnnual, taxable: true },
    { label: copy.festivalBonus, value: taxBase.bonusAnnual, taxable: true },
    { label: copy.employerPfContribution, value: taxBase.pfAnnual, taxable: true },
  ] as const;

  const filingRows = [
    [copy.taxFreeBand, employeeTaxWorksheet.taxFreeBand],
    [copy.slabBasedAnnualTax, taxBase.slabTax],
    [copy.manualRebate, -investmentRebate],
    [`${copy.pfRebate}${includePfInRebate ? ` (${pfRebateRate}%)` : ''}`, -pfRebate],
    [copy.minimumTaxApplied, employeeTaxWorksheet.minimumTax],
    [copy.otherAdjustment, otherTaxAdjustment],
    [copy.estimatedAnnualTax, employeeTaxWorksheet.estimatedAnnualTax],
    [copy.alreadyPaidWithheld, -employeeTaxWorksheet.alreadyPaid],
  ] as const;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden animate-fade-in">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                <Calculator className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-200 sm:text-2xl">{copy.taxCalculatorTitle}</h1>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{copy.taxCalculatorSubtitle}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(10rem,12rem)_minmax(12rem,16rem)]">
            <label className="min-w-0 space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.fiscalYearShort}</span>
              <select
                value={selectedFiscalYear}
                onChange={(event) => setSelectedFiscalYear(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              >
                {fiscalYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <div className="min-w-0 space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.maleSlabs}</span>
              <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600">
                {(['male', 'female'] as const).map(category => (
                  <button
                    key={category}
                    onClick={() => setTaxCategory(category)}
                    className={cn('px-3 py-2.5 text-xs font-bold capitalize transition-colors', taxCategory === category ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600')}
                  >
                    {category === 'female' ? copy.female : copy.male}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid border-t border-slate-100 dark:border-slate-700/50 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="min-w-0 border-t border-slate-100 p-4 first:border-t-0 dark:border-slate-700/50 sm:border-l sm:border-t-0 sm:first:border-l-0 xl:p-5">
              <div className="flex items-center gap-2">
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', card.bg, card.tone)}>
                  <card.icon className="h-4 w-4" />
                </div>
                <p className="min-w-0 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{card.label}</p>
              </div>
              <p className={cn('mt-3 break-words text-lg font-bold leading-tight sm:text-xl', card.tone)}>{fmt(card.value, currency, locale)}</p>
            </div>
          ))}
        </div>
      </section>

      {validationMessages.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              {validationMessages.map(item => <p key={item}>{item}</p>)}
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)_minmax(0,0.95fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <WalletCards className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">{copy.grossSalary}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="min-w-0 space-y-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.monthlyGross} ({currency})</span>
              <input type="number" min={0} value={grossMonthly} onChange={event => updateGrossMonthly(Math.max(0, Number(event.target.value)))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
            </label>
            <label className="min-w-0 space-y-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.festivalBonus}</span>
              <input type="number" min={0} max={6} value={bonusMonths} onChange={event => setBonusMonths(Math.max(0, Math.min(6, Number(event.target.value))))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
            </label>
            <label className="min-w-0 space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.actualFestivalBonusAnnual}</span>
              <input type="number" min={0} placeholder="0" value={optionalNumberValue(actualFestivalBonusAnnual)} onChange={event => setActualFestivalBonusAnnual(Math.max(0, parseOptionalNumber(event.target.value)))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
              <span className="block text-[11px] leading-4 text-slate-400 dark:text-slate-500">{copy.actualFestivalBonusHelp}</span>
            </label>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-700/50">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{copy.salaryStructure}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: copy.basicPercent, field: 'basicPercent' as const, max: 100 },
                { label: copy.houseRentPercent, field: 'houseRentPercent' as const, max: 100 },
                { label: copy.medicalPercent, field: 'medicalPercent' as const, max: 100 },
                { label: copy.conveyanceFlat, field: 'conveyanceFlat' as const, max: Infinity },
              ].map(item => (
                <label key={item.field} className="min-w-0 space-y-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</span>
                  <input type="number" min={0} max={Number.isFinite(item.max) ? item.max : undefined} value={structure[item.field]} onChange={event => updateStructure(item.field, Number(event.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Minus className="h-4 w-4 text-rose-600 dark:text-rose-300" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">{copy.monthlyDeductions}</h2>
          </div>
          <div className="grid gap-3">
            <label className="min-w-0 space-y-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{pfDeduction?.label ?? copy.pfDeduction}</span>
              <input type="number" min={0} placeholder="0" value={optionalNumberValue(pfDeduction?.amount ?? 0)} onChange={event => updateDeduction('pf', parseOptionalNumber(event.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
              <span className="block text-[11px] leading-4 text-slate-400 dark:text-slate-500">{copy.pfRebateBase}: {fmt(taxBase.pfAnnual, currency, locale)}</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="min-w-0 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{insuranceDeduction?.label ?? 'Insurance'}</span>
                <input type="number" min={0} placeholder="0" value={optionalNumberValue(insuranceDeduction?.amount ?? 0)} onChange={event => updateDeduction('insurance', parseOptionalNumber(event.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
              </label>
              <label className="min-w-0 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{otherDeduction?.label ?? copy.otherAllowance}</span>
                <input type="number" min={0} placeholder="0" value={optionalNumberValue(otherDeduction?.amount ?? 0)} onChange={event => updateDeduction('other', parseOptionalNumber(event.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
              </label>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900/30">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-slate-500 dark:text-slate-400">{copy.monthlyImpact}</span>
              <span className="break-words text-right font-bold text-rose-600 dark:text-rose-300">{fmt(result.totalDeductionsMonthly, currency, locale)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <BadgePercent className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">{copy.taxInputs}</h2>
          </div>
          <div className="grid gap-3">
            <label className="min-w-0 space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"><MapPin className="h-3.5 w-3.5" /> {copy.minimumTaxArea}</span>
              <select
                value={minimumTaxArea}
                onChange={(event) => setMinimumTaxArea(event.target.value as typeof minimumTaxArea)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              >
                {MINIMUM_TAX_OPTIONS.map(option => <option key={option.key} value={option.key}>{copy.minimumTaxOptions[option.key]}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="min-w-0 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.monthlyTaxDeducted}</span>
                <input type="number" min={0} placeholder="0" value={optionalNumberValue(monthlyTaxDeducted)} disabled={usePayrollVariations} onChange={event => setMonthlyTaxDeducted(Math.max(0, parseOptionalNumber(event.target.value)))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
              </label>
              <label className="min-w-0 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.additionalTaxPaid}</span>
                <input type="number" min={0} placeholder="0" value={optionalNumberValue(additionalTaxPaid)} onChange={event => setAdditionalTaxPaid(Math.max(0, parseOptionalNumber(event.target.value)))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="min-w-0 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.manualRebate}</span>
                <input type="number" min={0} placeholder="0" value={optionalNumberValue(investmentRebate)} onChange={event => setInvestmentRebate(Math.max(0, parseOptionalNumber(event.target.value)))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
              </label>
              <label className="min-w-0 space-y-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.otherTaxAdjustment}</span>
                <input type="number" placeholder="0" value={optionalNumberValue(otherTaxAdjustment)} onChange={event => setOtherTaxAdjustment(parseOptionalNumber(event.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
              </label>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700/50 dark:bg-slate-900/30">
              <label className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.calculateOnPf}</span>
                <input type="checkbox" checked={includePfInRebate} onChange={event => setIncludePfInRebate(event.target.checked)} className="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600" />
              </label>
              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem] xl:grid-cols-1">
                <span className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">{copy.pfRebate}: {fmt(pfRebate, currency, locale)}</span>
                <input type="number" min={0} max={100} value={pfRebateRate} disabled={!includePfInRebate} onChange={event => setPfRebateRate(Math.min(100, Math.max(0, Number(event.target.value))))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-700/50 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">{copy.payrollVariation}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.payrollVariationHelp}</p>
          </div>
          <label className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700/50 dark:bg-slate-900/30 sm:w-auto sm:min-w-72">
            <span className="min-w-0 text-xs font-semibold text-slate-700 dark:text-slate-200">{copy.usePayrollVariations}</span>
            <input type="checkbox" checked={usePayrollVariations} onChange={event => setUsePayrollVariations(event.target.checked)} className="h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600" />
          </label>
        </div>

        {usePayrollVariations ? (
          <div className="space-y-3 p-4 sm:p-5">
            {payrollRows.map(row => (
              <div key={row.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700/50 dark:bg-slate-900/30">
                <div className="grid gap-3 md:grid-cols-[minmax(11rem,1.2fr)_minmax(5rem,0.45fr)_repeat(3,minmax(7rem,0.8fr))_2.5rem] md:items-end">
                  <label className="min-w-0 space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{copy.period}</span>
                    <input value={row.label} onChange={event => updatePayrollRow(row.id, 'label', event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                  </label>
                  <label className="min-w-0 space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{copy.months}</span>
                    <input type="number" min={0} max={12} value={row.months} onChange={event => updatePayrollRow(row.id, 'months', event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                  </label>
                  <label className="min-w-0 space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{copy.grossPerMonth}</span>
                    <input type="number" min={0} value={row.grossMonthly} onChange={event => updatePayrollRow(row.id, 'grossMonthly', event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                  </label>
                  <label className="min-w-0 space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{copy.pfDeduction}</span>
                    <input type="number" min={0} placeholder="0" value={optionalNumberValue(row.pfMonthly)} onChange={event => updatePayrollRow(row.id, 'pfMonthly', parseOptionalNumber(event.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                  </label>
                  <label className="min-w-0 space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{copy.taxDeducted}</span>
                    <input type="number" min={0} placeholder="0" value={optionalNumberValue(row.taxDeductedMonthly)} onChange={event => updatePayrollRow(row.id, 'taxDeductedMonthly', parseOptionalNumber(event.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                  </label>
                  <button onClick={() => removePayrollRow(row.id)} className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-500 hover:bg-rose-50 dark:border-rose-500/20 dark:bg-slate-800 dark:hover:bg-rose-500/10" aria-label={copy.delete}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-slate-800/70">
                    <span className="text-slate-500 dark:text-slate-400">{copy.annualGross}</span>
                    <p className="mt-1 font-bold text-slate-900 dark:text-slate-200">{fmt(row.grossMonthly * row.months, currency, locale)}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-slate-800/70">
                    <span className="text-slate-500 dark:text-slate-400">{copy.pfDeduction}</span>
                    <p className="mt-1 font-bold text-slate-900 dark:text-slate-200">{fmt(row.pfMonthly * row.months, currency, locale)}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-slate-800/70">
                    <span className="text-slate-500 dark:text-slate-400">{copy.taxDeducted}</span>
                    <p className="mt-1 font-bold text-slate-900 dark:text-slate-200">{fmt(row.taxDeductedMonthly * row.months, currency, locale)}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className={cn('text-xs font-semibold', payrollTaxBase.months === 12 ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300')}>
                {copy.totalMonths}: {payrollTaxBase.months}. {payrollTaxBase.months === 12 ? copy.fullFiscalYearCovered : copy.adjustPeriods}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button onClick={resetPayrollRowsFromCurrent} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                  <RotateCcw className="h-3.5 w-3.5" /> {copy.reset}
                </button>
                <button onClick={addPayrollRow} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                  <Plus className="h-3.5 w-3.5" /> {copy.period}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 p-4 text-xs sm:grid-cols-3 sm:p-5">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/30">
              <p className="font-semibold text-slate-500 dark:text-slate-400">{copy.usingCurrentGross}</p>
              <p className="mt-1 break-words text-sm font-bold text-slate-900 dark:text-slate-200">{fmt(grossMonthly, currency, locale)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/30">
              <p className="font-semibold text-slate-500 dark:text-slate-400">{copy.pfRebateBase}</p>
              <p className="mt-1 break-words text-sm font-bold text-slate-900 dark:text-slate-200">{fmt(taxBase.pfAnnual, currency, locale)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/30">
              <p className="font-semibold text-slate-500 dark:text-slate-400">{copy.alreadyPaidDeducted}</p>
              <p className="mt-1 break-words text-sm font-bold text-slate-900 dark:text-slate-200">{fmt(employeeTaxWorksheet.alreadyPaid, currency, locale)}</p>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
            <div className="border-b border-slate-100 p-4 dark:border-slate-700/50 sm:p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">{copy.filingSummary}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{taxCategory === 'female' ? copy.femaleSlabs : copy.maleSlabs} {copy.slabsFromAdmin}</p>
            </div>
            <div className="grid gap-3 p-4 sm:p-5">
              {[
                { label: copy.monthlyPayrollTarget, value: employeeTaxWorksheet.monthlyWithholdingTarget, icon: ReceiptText, tone: 'text-indigo-600 dark:text-indigo-300' },
                { label: copy.alreadyPaidDeducted, value: employeeTaxWorksheet.alreadyPaid, icon: ShieldCheck, tone: 'text-emerald-600 dark:text-emerald-300' },
                { label: balanceIsDue ? copy.estimatedBalanceDue : copy.estimatedOverpaidRefund, value: Math.abs(employeeTaxWorksheet.balance), icon: FileText, tone: balanceIsDue ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300' },
              ].map(item => (
                <div key={item.label} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700/50 dark:bg-slate-900/30">
                  <div className="flex min-w-0 items-center gap-2">
                    <item.icon className={cn('h-4 w-4 shrink-0', item.tone)} />
                    <span className="min-w-0 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{item.label}</span>
                  </div>
                  <span className={cn('shrink-0 text-right text-sm font-bold', item.tone)}>{fmt(item.value, currency, locale)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
            <div className="border-b border-slate-100 p-4 dark:border-slate-700/50 sm:p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">{copy.annualIncomeToTaxable}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.taxableIncomeHint}</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {incomeRows.map((row) => (
                <div key={row.label} className={cn('grid gap-2 px-4 py-3 sm:flex sm:items-start sm:justify-between sm:gap-4 sm:px-5', !row.taxable && 'bg-emerald-50/50 dark:bg-emerald-500/5')}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('min-w-0 text-xs font-medium leading-5', row.taxable ? 'text-slate-600 dark:text-slate-300' : 'text-emerald-700 dark:text-emerald-300')}>{row.label}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', row.taxable ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300')}>
                        {row.taxable ? copy.taxable : copy.nonTaxable}
                      </span>
                    </div>
                    {!row.taxable && (
                      <p className="mt-1 text-[11px] leading-4 text-emerald-700/80 dark:text-emerald-300/80">{copy.taxExemptAllowanceHint}</p>
                    )}
                  </div>
                  <span className={cn('min-w-0 break-words text-xs font-bold sm:shrink-0 sm:text-right', row.taxable ? 'text-slate-900 dark:text-slate-200' : 'text-emerald-700 dark:text-emerald-300')}>
                    {fmt(row.value, currency, locale)}
                  </span>
                </div>
              ))}
              <div className="grid gap-1 bg-slate-50 px-4 py-3 dark:bg-slate-700/30 sm:flex sm:items-start sm:justify-between sm:gap-4 sm:px-5">
                <span className="min-w-0 text-xs font-bold text-slate-900 dark:text-slate-200">{copy.grossAnnualIncome}</span>
                <span className="min-w-0 break-words text-xs font-bold text-slate-900 dark:text-slate-200 sm:shrink-0 sm:text-right">{fmt(taxBase.grossAnnual, currency, locale)}</span>
              </div>
              <div className="grid gap-1 px-4 py-3 sm:flex sm:items-start sm:justify-between sm:gap-4 sm:px-5">
                <span className="min-w-0 text-xs font-medium leading-5 text-rose-600 dark:text-rose-400">{copy.employmentExemption}</span>
                <span className="min-w-0 break-words text-xs font-bold text-rose-600 dark:text-rose-400 sm:shrink-0 sm:text-right">{fmt(taxBase.employmentExemptionAnnual, currency, locale)}</span>
              </div>
              <div className="bg-emerald-50 p-3 dark:bg-emerald-500/10 sm:p-4">
                <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-sm shadow-emerald-500/10 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <div className="grid gap-2 sm:flex sm:items-start sm:justify-between sm:gap-4">
                    <span className="min-w-0 text-sm font-bold text-emerald-700 dark:text-emerald-300">{copy.taxableIncome}</span>
                    <span className="min-w-0 break-words text-xl font-extrabold leading-tight text-emerald-700 dark:text-emerald-300 sm:shrink-0 sm:text-right">
                      {fmt(taxBase.taxableIncome, currency, locale)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-emerald-700/80 dark:text-emerald-300/80">{copy.taxableIncomeShortHint}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
            <div className="border-b border-slate-100 p-4 dark:border-slate-700/50 sm:p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">{copy.employeeTaxWorksheet}</h2>
            </div>
            <div className="p-4 sm:p-5">
              <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div className="bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900/30 dark:text-slate-400">{copy.filingSummary}</div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filingRows.map(([label, value]) => (
                    <div key={label} className="grid gap-1 px-4 py-3 sm:flex sm:items-start sm:justify-between sm:gap-3">
                      <span className="min-w-0 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">{label}</span>
                      <span className={cn('min-w-0 break-words text-xs font-bold sm:shrink-0 sm:text-right', Number(value) < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200')}>
                        {Number(value) < 0 ? fmtSigned(Number(value), currency, locale) : fmt(Number(value), currency, locale)}
                      </span>
                    </div>
                  ))}
                  <div className={cn('grid gap-1 px-4 py-3 sm:flex sm:items-start sm:justify-between sm:gap-3', balanceIsDue ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10')}>
                    <span className={cn('min-w-0 text-xs font-bold leading-5', balanceIsDue ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300')}>
                      {balanceIsDue ? copy.estimatedBalanceDue : copy.estimatedOverpaidRefund}
                    </span>
                    <span className={cn('min-w-0 break-words text-xs font-bold sm:shrink-0 sm:text-right', balanceIsDue ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300')}>
                      {fmt(Math.abs(employeeTaxWorksheet.balance), currency, locale)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
            <div className="border-b border-slate-100 p-4 dark:border-slate-700/50 sm:p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">{copy.slabCalculation}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.taxableIncomeShortHint}</p>
            </div>
            <div className="p-4 sm:p-5">
              <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[38%]" />
                    <col className="w-[24%]" />
                    <col className="w-[14%]" />
                    <col className="w-[24%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-900/30">
                      <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-4">{copy.slab}</th>
                      <th className="px-2 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-4">{copy.taxableInSlab}</th>
                      <th className="px-2 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-4">{copy.rate}</th>
                      <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-4">{copy.tax}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {taxBase.taxSlabBreakdown.map((row, index) => {
                      const isActive = row.taxableAmount > 0;
                      return (
                        <tr key={`${row.slab.label}-${index}`} className={cn(isActive ? 'bg-rose-50/50 dark:bg-rose-500/10' : 'bg-white opacity-65 dark:bg-slate-800/50')}>
                          <td className="min-w-0 px-3 py-3 align-top text-xs font-semibold leading-5 text-slate-700 dark:text-slate-200 sm:px-4">
                            <span className="block break-words">{row.slab.label}</span>
                          </td>
                          <td className="px-2 py-3 align-top text-right text-xs font-semibold leading-5 text-slate-700 dark:text-slate-200 sm:px-4">
                            <span className="block break-words">{fmt(row.taxableAmount, currency, locale)}</span>
                          </td>
                          <td className="px-2 py-3 align-top text-right text-xs font-bold leading-5 text-slate-900 dark:text-slate-200 sm:px-4">{row.slab.rate}%</td>
                          <td className={cn('px-3 py-3 align-top text-right text-xs font-extrabold leading-5 sm:px-4', isActive ? 'text-rose-600 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400')}>
                            <span className="block break-words">{fmt(row.tax, currency, locale)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50 sm:p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200">{copy.employeeTaxDocuments}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                locale === 'bn-BD' ? 'TIN / ই-রিটার্ন অ্যাকাউন্ট তথ্য' : 'TIN / e-return account information',
                locale === 'bn-BD' ? 'নিয়োগকর্তার বেতন সার্টিফিকেট' : 'Salary certificate from employer',
                locale === 'bn-BD' ? 'মাসিক কর কর্তন বা TDS সার্টিফিকেট' : 'Monthly tax deduction or TDS certificate',
                locale === 'bn-BD' ? 'বিনিয়োগ ও PF রিবেট ডকুমেন্ট বা কন্ট্রিবিউশন প্রমাণ' : 'Investment and PF rebate documents or contribution proof',
              ].map(item => (
                <div key={item} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="min-w-0">{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.taxDisclaimer}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
