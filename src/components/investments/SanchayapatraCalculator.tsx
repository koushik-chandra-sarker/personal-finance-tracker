'use client';

import { useState, useMemo, useEffect } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { Calculator, InfoIcon, TrendingUp } from 'lucide-react';

export default function SanchayapatraCalculator({ 
  currency = 'BDT',
  systemConfigs = [] 
}: { 
  currency?: string;
  systemConfigs?: any[];
}) {
  const [amount, setAmount] = useState<number>(100000);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [isCustomRate, setIsCustomRate] = useState(false);
  const [customRate, setCustomRate] = useState<number>(11.52);

  // Set initial selected type once configs are loaded
  useEffect(() => {
    if (systemConfigs.length > 0 && !selectedTypeId) {
      setSelectedTypeId(systemConfigs[0].id);
    }
  }, [systemConfigs, selectedTypeId]);

  const selectedType = useMemo(() => {
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

  // Update custom rate when type changes
  useEffect(() => {
    if (selectedType && !isCustomRate) {
      setCustomRate(selectedType.rate);
    }
  }, [selectedType, isCustomRate]);

  const results = useMemo(() => {
    if (!selectedType) return null;

    const activeRate = isCustomRate ? customRate : selectedType.rate;
    const grossYearly = (amount * activeRate) / 100;
    const taxRate = amount > selectedType.taxThreshold ? selectedType.taxRateAbove : selectedType.taxRateBelow;
    const taxAmount = (grossYearly * taxRate) / 100;
    const netYearly = grossYearly - taxAmount;

    let profitPerInstallment = 0;
    let frequencyLabel = '';

    if (selectedType.payoutFrequency === 'MONTHLY') {
      profitPerInstallment = netYearly / 12;
      frequencyLabel = 'per month';
    } else if (selectedType.payoutFrequency === 'QUARTERLY') {
      profitPerInstallment = netYearly / 4;
      frequencyLabel = 'per quarter';
    } else {
      profitPerInstallment = netYearly * 5; // 5 years total
      frequencyLabel = 'at maturity (5yr)';
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
  }, [amount, selectedType, isCustomRate, customRate]);

  if (systemConfigs.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Profit Calculator</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer">Custom Rate</label>
          <button 
            onClick={() => setIsCustomRate(!isCustomRate)}
            className={cn(
              "w-8 h-4 rounded-full relative transition-colors",
              isCustomRate ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
              isCustomRate ? "right-0.5" : "left-0.5"
            )} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Investment Amount</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currency}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                Profit Rate (%)
                {isCustomRate && <span className="text-[10px] text-indigo-500 font-bold">Manual Override</span>}
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.01"
                  value={isCustomRate ? customRate : (selectedType?.rate || 0)} 
                  disabled={!isCustomRate}
                  onChange={(e) => setCustomRate(Number(e.target.value))}
                  className={cn(
                    "w-full pl-4 pr-8 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors",
                    isCustomRate 
                      ? "border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" 
                      : "border-slate-300 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50 text-slate-400"
                  )}
                />
                <TrendingUp className={cn("absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4", isCustomRate ? "text-indigo-500" : "text-slate-300")} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Sanchayapatra Type</label>
            <div className="grid grid-cols-1 gap-2">
              {systemConfigs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTypeId(t.id)}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold rounded-xl border transition-all text-left flex items-center justify-between",
                    selectedTypeId === t.id 
                      ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 ring-2 ring-indigo-500/20"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  {t.name}
                  {selectedTypeId === t.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {results && selectedType && (
          <>
            <div className="p-5 rounded-2xl bg-indigo-50/30 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Profit Rate</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{results.activeRate}%</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Estimated Profit</span>
                  <span className="text-[10px] text-slate-400">({results.frequencyLabel})</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(results.profitPerInstallment, currency)}</span>
              </div>

              <div className="pt-3 border-t border-indigo-100 dark:border-indigo-500/10 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Net Yearly Profit</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(results.netYearly, currency)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Source Tax ({results.taxRate}%)</p>
                  <p className="text-sm font-bold text-rose-500 mt-0.5">{formatCurrency(results.taxAmount, currency)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
              <InfoIcon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {selectedType.description} <br />
                <span className="font-medium">Tax Threshold:</span> {formatCurrency(selectedType.taxThreshold, currency)}. 
                Above threshold {selectedType.taxRateAbove}% tax applies.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
