'use client';

import { useState, useMemo, useEffect } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { Calculator, Info, ChevronDown } from 'lucide-react';
import { useI18n } from '@/i18n/client';

export default function SanchayapatraCalculator({ 
  currency = 'BDT',
  systemConfigs = [],
  initialAmount = 0
}: { 
  currency?: string;
  systemConfigs?: any[];
  initialAmount?: number | string;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.pages.investments;
  const [amount, setAmount] = useState<number | ''>(Number(initialAmount) || '');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [isCustomRate, setIsCustomRate] = useState(false);
  const [customRate, setCustomRate] = useState<number>(11.52);

  // Sync with initialAmount if it changes from parent
  useEffect(() => {
    if (initialAmount !== undefined && initialAmount !== null && initialAmount !== '') {
      setAmount(Number(initialAmount));
    } else if (initialAmount === '' || initialAmount === 0) {
      setAmount('');
    }
  }, [initialAmount]);

  useEffect(() => {
    if (systemConfigs && systemConfigs.length > 0 && !selectedTypeId) {
      setSelectedTypeId(systemConfigs[0].id);
    }
  }, [systemConfigs, selectedTypeId]);

  const selectedType = useMemo(() => {
    if (!systemConfigs) return null;
    const config = systemConfigs.find(t => t.id === selectedTypeId);
    if (!config) return null;
    return {
      ...config,
      rate: Number(config.rate),
      taxThreshold: Number(config.taxThreshold),
      taxRateBelow: Number(config.taxRateBelow),
      taxRateAbove: Number(config.taxRateAbove),
    };
  }, [selectedTypeId, systemConfigs]);

  useEffect(() => {
    if (selectedType && !isCustomRate) {
      setCustomRate(selectedType.rate);
    }
  }, [selectedType, isCustomRate]);

  const results = useMemo(() => {
    if (!selectedType || !amount || isNaN(Number(amount))) return null;

    const numAmount = Number(amount);
    const activeRate = isCustomRate ? customRate : selectedType.rate;
    const grossYearly = (numAmount * activeRate) / 100;
    const taxRate = numAmount > selectedType.taxThreshold ? selectedType.taxRateAbove : selectedType.taxRateBelow;
    const taxAmount = (grossYearly * taxRate) / 100;
    const netYearly = grossYearly - taxAmount;

    let profitPerInstallment = 0;
    let frequencyLabel = '';

    if (selectedType.payoutFrequency === 'MONTHLY') {
      profitPerInstallment = netYearly / 12;
      frequencyLabel = copy.estimatedMonthlyProfit;
    } else if (selectedType.payoutFrequency === 'QUARTERLY') {
      profitPerInstallment = netYearly / 4;
      frequencyLabel = copy.estimatedQuarterlyProfit;
    } else {
      profitPerInstallment = netYearly * 5; 
      frequencyLabel = copy.netProfitAtMaturity;
    }

    return {
      grossYearly,
      taxAmount,
      netYearly,
      profitPerInstallment,
      frequencyLabel,
      taxRate,
      activeRate
    };
  }, [amount, selectedType, isCustomRate, customRate, copy.estimatedMonthlyProfit, copy.estimatedQuarterlyProfit, copy.netProfitAtMaturity]);

  if (!systemConfigs || systemConfigs.length === 0) return null;

  return (
    <div className="w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{copy.calculator}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase">{copy.customRate}</span>
          <input 
            type="checkbox" 
            checked={isCustomRate} 
            onChange={(e) => setIsCustomRate(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600"
          />
        </div>
      </div>

      <div className="p-5 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">{copy.amount} ({currency})</label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={copy.enterAmount}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white rounded-lg focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">{copy.schemeType}</label>
            <div className="relative">
              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white rounded-lg appearance-none focus:border-indigo-500 outline-none"
              >
                {systemConfigs.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {!isCustomRate && selectedType && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">{copy.officialRate}</label>
              <div className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-sm font-bold text-indigo-600 dark:text-indigo-400 rounded-lg">
                {selectedType.rate}%
              </div>
            </div>
          )}

          {isCustomRate && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5 uppercase">{copy.manualRate}</label>
              <input 
                type="number" 
                step="0.01"
                value={customRate} 
                onChange={(e) => setCustomRate(Number(e.target.value))}
                className="w-full px-4 py-2 border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-500/10 text-sm font-bold text-indigo-700 dark:text-indigo-300 rounded-lg outline-none"
              />
            </div>
          )}
        </div>

        {results && selectedType && amount !== '' ? (
          <div className="p-5 rounded-xl bg-indigo-600 text-white space-y-4">
            <div>
              <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-1">{results.frequencyLabel}</p>
              <p className="text-3xl font-black">{formatCurrency(results.profitPerInstallment, currency, locale)}</p>
            </div>
            
            <div className="pt-4 border-t border-indigo-500 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-indigo-200 text-[10px] font-bold uppercase mb-0.5">{copy.yearlyNet}</p>
                <p className="text-base font-bold">{formatCurrency(results.netYearly, currency, locale)}</p>
              </div>
              <div>
                <p className="text-indigo-200 text-[10px] font-bold uppercase mb-0.5">{copy.yearlyTax} ({results.taxRate}%)</p>
                <p className="text-base font-bold text-indigo-100">{formatCurrency(results.taxAmount, currency, locale)}</p>
              </div>
            </div>
          </div>
        ) : null}

        {selectedType && (
          <div className="flex gap-2 text-slate-500 dark:text-slate-400">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-xs leading-relaxed">
                <span className="font-bold text-slate-700 dark:text-slate-300">{selectedType.name}</span>: {selectedType.description}
              </p>
              <p className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded inline-block">
                {copy.taxBelowAbove}: {selectedType.taxRateBelow}% (below {formatCurrency(selectedType.taxThreshold, currency, locale)}), {selectedType.taxRateAbove}% (above)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
