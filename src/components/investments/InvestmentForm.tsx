'use client';

import { useState, useRef } from 'react';
import { X, ChevronDown, Calculator } from 'lucide-react';
import SanchayapatraCalculator from './SanchayapatraCalculator';
import type { ActionResponse } from '@/types';
import { getFrequencyLabel } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

type TypeConfig = {
  id: string; slug: string; name: string; icon: string; color: string;
  hasInterestRate: boolean; hasReturnFrequency: boolean; hasMaturityDate: boolean;
  hasMonthlyInstallment: boolean; hasQuantity: boolean; hasInstitution: boolean;
  hasAccountNumber: boolean; returnTypes: string[];
};
type Account = { id: string; name: string; type: string; isActive: boolean };
type SanchayapatraConfig = {
  id: string;
  name: string;
  rate: number | string;
  taxThreshold: number | string;
  taxRateBelow: number | string;
  taxRateAbove: number | string;
  payoutFrequency: string;
};
type Investment = {
  id: string; name: string; typeConfigId: string; institutionName?: string | null;
  accountNumber?: string | null; investedAmount: number | string; currentValue: number | string;
  interestRate?: number | string | null; returnFrequency?: string | null;
  purchaseDate: string; maturityDate?: string | null; linkedAccountId?: string | null;
  monthlyInstallment?: number | string | null; installmentDueDay?: number | null;
  sanchayapatraConfigId?: string | null; quantity?: number | string | null;
  avgBuyPrice?: number | string | null; notes?: string | null; color: string; icon: string;
} | null;

const FREQ_OPTIONS = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'AT_MATURITY', 'ON_SALE'];

export default function InvestmentForm({ typeConfigs, accounts, sanchayapatraConfigs, investment, currency, loading, onSubmit, onClose }: {
  typeConfigs: TypeConfig[]; accounts: Account[]; sanchayapatraConfigs: SanchayapatraConfig[]; investment: Investment;
  currency: string; loading: boolean;
  onSubmit: (fd: FormData) => Promise<ActionResponse>;
  onClose: () => void;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.pages.investments;
  const isEdit = !!investment;
  const [selectedTypeId, setSelectedTypeId] = useState(investment?.typeConfigId || '');
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedSanchayapatraConfigId, setSelectedSanchayapatraConfigId] = useState(investment?.sanchayapatraConfigId || '');
  const [message, setMessage] = useState('');
  const [investedAmount, setInvestedAmount] = useState<number | ''>(investment?.investedAmount ? Number(investment.investedAmount) : '');
  const calcRef = useRef<HTMLDivElement>(null);

  const selectedType = typeConfigs.find((t) => t.id === selectedTypeId);
  const selectedSanchayapatraConfig = sanchayapatraConfigs.find((config) => config.id === selectedSanchayapatraConfigId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    const fd = new FormData(e.currentTarget);
    fd.set('typeConfigId', selectedTypeId);
    if (!fd.get('currentValue')) fd.set('currentValue', fd.get('investedAmount') as string);
    const result = await onSubmit(fd);
    if (!result.success) {
      setMessage(result.message);
    }
  };

  const fmtDate = (d?: string | null) => {
    if (!d) return '';
    try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] bg-black/60 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700/50 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/50">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200">{isEdit ? copy.editInvestment : copy.addInvestment}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">

          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.investmentType} *</label>
            <div className="relative">
              <select value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} required
                className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500">
                <option value="">{copy.selectType}</option>
                {typeConfigs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.name} *</label>
            <input name="name" defaultValue={investment?.name || ''} required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              placeholder={copy.namePlaceholder} />
          </div>

          {/* Institution + Account Number (conditional) */}
          {selectedType?.hasInstitution && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.institution}</label>
                <input name="institutionName" defaultValue={investment?.institutionName || ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder={copy.institutionPlaceholder} />
              </div>
              {selectedType?.hasAccountNumber && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.accountCertNo}</label>
                  <input name="accountNumber" defaultValue={investment?.accountNumber || ''}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
                </div>
              )}
            </div>
          )}

          {/* Amount fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.investedAmount} *</label>
              <input name="investedAmount" type="number" step="0.01" required
                value={investedAmount}
                onChange={(e) => setInvestedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.currentValueLabel}</label>
              <input name="currentValue" type="number" step="0.01"
                defaultValue={investment ? Number(investment.currentValue) : ''}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                placeholder={copy.sameAsInvested} />
            </div>
          </div>

          {/* Interest Rate + Frequency (conditional) */}
          {(selectedType?.hasInterestRate || selectedType?.hasReturnFrequency) && (
            <div className="grid grid-cols-2 gap-3">
              {selectedType.hasInterestRate && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    {copy.interestRate}
                    {selectedType?.slug === 'govt_savings' && (
                      <button type="button" onClick={() => {
                        setShowCalculator(!showCalculator);
                        if (!showCalculator) {
                          setTimeout(() => calcRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                        }
                      }} 
                        className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1">
                        <Calculator className="h-3 w-3" /> {copy.calculator}
                      </button>
                    )}
                  </label>
                  <input name="interestRate" type="number" step="0.001"
                    defaultValue={investment?.interestRate ? Number(investment.interestRate) : ''}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
                </div>
              )}
              {selectedType.hasReturnFrequency && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.returnFrequency}</label>
                  <div className="relative">
                    <select name="returnFrequency" defaultValue={investment?.returnFrequency || ''}
                      className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500">
                      <option value="">{copy.select}</option>
                      {FREQ_OPTIONS.map((value) => <option key={value} value={value}>{getFrequencyLabel(value, locale)}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedType?.slug === 'govt_savings' ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700/50 dark:bg-slate-900/20">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.sanchayapatraScheme}</label>
              <div className="relative">
                <select
                  name="sanchayapatraConfigId"
                  value={selectedSanchayapatraConfigId}
                  onChange={(event) => setSelectedSanchayapatraConfigId(event.target.value)}
                  className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">{copy.selectScheme}</option>
                  {sanchayapatraConfigs.map((config) => (
                    <option key={config.id} value={config.id}>{config.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              {selectedSanchayapatraConfig && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white px-2 py-2 dark:bg-slate-800/60">
                    <p className="text-[10px] uppercase text-slate-400">{copy.rate}</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{Number(selectedSanchayapatraConfig.rate)}%</p>
                  </div>
                  <div className="rounded-lg bg-white px-2 py-2 dark:bg-slate-800/60">
                    <p className="text-[10px] uppercase text-slate-400">{copy.payout}</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{getFrequencyLabel(selectedSanchayapatraConfig.payoutFrequency, locale)}</p>
                  </div>
                  <div className="rounded-lg bg-white px-2 py-2 dark:bg-slate-800/60">
                    <p className="text-[10px] uppercase text-slate-400">{copy.tax}</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{Number(selectedSanchayapatraConfig.taxRateBelow)}-{Number(selectedSanchayapatraConfig.taxRateAbove)}%</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <input type="hidden" name="sanchayapatraConfigId" value="" />
          )}

          {/* Quantity + Avg Buy Price (conditional) */}
          {selectedType?.hasQuantity && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.quantity}</label>
                <input name="quantity" type="number" step="0.0001"
                  defaultValue={investment?.quantity ? Number(investment.quantity) : ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.avgBuyPrice}</label>
                <input name="avgBuyPrice" type="number" step="0.0001"
                  defaultValue={investment?.avgBuyPrice ? Number(investment.avgBuyPrice) : ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
          )}

          {/* Monthly Installment (conditional) */}
          {selectedType?.hasMonthlyInstallment && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.monthlyInstallment}</label>
                <input name="monthlyInstallment" type="number" step="0.01"
                  defaultValue={investment?.monthlyInstallment ? Number(investment.monthlyInstallment) : ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.dueDay}</label>
                <input name="installmentDueDay" type="number" min={1} max={31} step={1}
                  defaultValue={investment?.installmentDueDay || 5}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.purchaseDate} *</label>
              <input name="purchaseDate" type="date" required defaultValue={fmtDate(investment?.purchaseDate)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
            </div>
            {selectedType?.hasMaturityDate && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.maturityDate}</label>
                <input name="maturityDate" type="date" defaultValue={fmtDate(investment?.maturityDate)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
              </div>
            )}
          </div>

          {/* Linked Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.linkedAccount}</label>
            <div className="relative">
              <select name="linkedAccountId" defaultValue={investment?.linkedAccountId || ''}
                className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500">
                <option value="">{copy.noLinkedAccount}</option>
                {accounts.filter((a) => a.isActive).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.notes}</label>
            <textarea name="notes" rows={2} defaultValue={investment?.notes || ''}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 resize-none" />
          </div>

          {message && <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-xl px-4 py-2">{message}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              {copy.cancel}
            </button>
            <button type="submit" disabled={loading || !selectedTypeId}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl disabled:opacity-50 transition-all">
              {loading ? copy.saving : isEdit ? copy.update : copy.create}
            </button>
          </div>

          {showCalculator && selectedType?.slug === 'govt_savings' && (
            <div ref={calcRef} className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
              <SanchayapatraCalculator 
                currency={currency} 
                systemConfigs={sanchayapatraConfigs} 
                initialAmount={investedAmount === '' ? 0 : Number(investedAmount)} 
              />
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
