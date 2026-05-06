'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Calculator } from 'lucide-react';
import SanchayapatraCalculator from './SanchayapatraCalculator';
import type { ActionResponse } from '@/types';

type TypeConfig = {
  id: string; slug: string; name: string; icon: string; color: string;
  hasInterestRate: boolean; hasReturnFrequency: boolean; hasMaturityDate: boolean;
  hasMonthlyInstallment: boolean; hasQuantity: boolean; hasInstitution: boolean;
  hasAccountNumber: boolean; returnTypes: string[];
};
type Account = { id: string; name: string; type: string; isActive: boolean };
type Investment = {
  id: string; name: string; typeConfigId: string; institutionName?: string | null;
  accountNumber?: string | null; investedAmount: number | string; currentValue: number | string;
  interestRate?: number | string | null; returnFrequency?: string | null;
  purchaseDate: string; maturityDate?: string | null; linkedAccountId?: string | null;
  monthlyInstallment?: number | string | null; quantity?: number | string | null;
  avgBuyPrice?: number | string | null; notes?: string | null; color: string; icon: string;
} | null;

const FREQ_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' }, { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half Yearly' }, { value: 'YEARLY', label: 'Yearly' },
  { value: 'AT_MATURITY', label: 'At Maturity' }, { value: 'ON_SALE', label: 'On Sale' },
];

export default function InvestmentForm({ typeConfigs, accounts, sanchayapatraConfigs, investment, currency, loading, onSubmit, onClose }: {
  typeConfigs: TypeConfig[]; accounts: Account[]; sanchayapatraConfigs: any[]; investment: Investment;
  currency: string; loading: boolean;
  onSubmit: (fd: FormData) => Promise<ActionResponse>;
  onClose: () => void;
}) {
  const isEdit = !!investment;
  const [selectedTypeId, setSelectedTypeId] = useState(investment?.typeConfigId || '');
  const [showCalculator, setShowCalculator] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState('');
  const calcRef = useRef<HTMLDivElement>(null);

  const selectedType = typeConfigs.find((t) => t.id === selectedTypeId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setMessage('');
    const fd = new FormData(e.currentTarget);
    fd.set('typeConfigId', selectedTypeId);
    if (!fd.get('currentValue')) fd.set('currentValue', fd.get('investedAmount') as string);
    const result = await onSubmit(fd);
    if (!result.success) {
      setMessage(result.message);
      if (result.errors) setErrors(result.errors);
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
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{isEdit ? 'Edit' : 'Add'} Investment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">

          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Investment Type *</label>
            <div className="relative">
              <select value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} required
                className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500">
                <option value="">Select type...</option>
                {typeConfigs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Name *</label>
            <input name="name" defaultValue={investment?.name || ''} required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              placeholder="e.g. 5-Year Sanchayapatra" />
          </div>

          {/* Institution + Account Number (conditional) */}
          {selectedType?.hasInstitution && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Institution</label>
                <input name="institutionName" defaultValue={investment?.institutionName || ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Bank / Broker" />
              </div>
              {selectedType?.hasAccountNumber && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Account/Cert No.</label>
                  <input name="accountNumber" defaultValue={investment?.accountNumber || ''}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                </div>
              )}
            </div>
          )}

          {/* Amount fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Invested Amount *</label>
              <input name="investedAmount" type="number" step="0.01" required
                defaultValue={investment ? Number(investment.investedAmount) : ''}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Current Value</label>
              <input name="currentValue" type="number" step="0.01"
                defaultValue={investment ? Number(investment.currentValue) : ''}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                placeholder="Same as invested" />
            </div>
          </div>

          {/* Interest Rate + Frequency (conditional) */}
          {(selectedType?.hasInterestRate || selectedType?.hasReturnFrequency) && (
            <div className="grid grid-cols-2 gap-3">
              {selectedType.hasInterestRate && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    Interest Rate (%)
                    {selectedType?.slug === 'govt_savings' && (
                      <button type="button" onClick={() => {
                        setShowCalculator(!showCalculator);
                        if (!showCalculator) {
                          setTimeout(() => calcRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                        }
                      }} 
                        className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1">
                        <Calculator className="h-3 w-3" /> Calc
                      </button>
                    )}
                  </label>
                  <input name="interestRate" type="number" step="0.001"
                    defaultValue={investment?.interestRate ? Number(investment.interestRate) : ''}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                </div>
              )}
              {selectedType.hasReturnFrequency && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Return Frequency</label>
                  <div className="relative">
                    <select name="returnFrequency" defaultValue={investment?.returnFrequency || ''}
                      className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500">
                      <option value="">Select...</option>
                      {FREQ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity + Avg Buy Price (conditional) */}
          {selectedType?.hasQuantity && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Quantity</label>
                <input name="quantity" type="number" step="0.0001"
                  defaultValue={investment?.quantity ? Number(investment.quantity) : ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Avg Buy Price</label>
                <input name="avgBuyPrice" type="number" step="0.0001"
                  defaultValue={investment?.avgBuyPrice ? Number(investment.avgBuyPrice) : ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
          )}

          {/* Monthly Installment (conditional) */}
          {selectedType?.hasMonthlyInstallment && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Monthly Installment</label>
              <input name="monthlyInstallment" type="number" step="0.01"
                defaultValue={investment?.monthlyInstallment ? Number(investment.monthlyInstallment) : ''}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Purchase Date *</label>
              <input name="purchaseDate" type="date" required defaultValue={fmtDate(investment?.purchaseDate)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
            </div>
            {selectedType?.hasMaturityDate && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Maturity Date</label>
                <input name="maturityDate" type="date" defaultValue={fmtDate(investment?.maturityDate)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
              </div>
            )}
          </div>

          {/* Linked Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Linked Account (optional)</label>
            <div className="relative">
              <select name="linkedAccountId" defaultValue={investment?.linkedAccountId || ''}
                className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500">
                <option value="">None</option>
                {accounts.filter((a) => a.isActive).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Notes</label>
            <textarea name="notes" rows={2} defaultValue={investment?.notes || ''}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none" />
          </div>

          {message && <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-xl px-4 py-2">{message}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !selectedTypeId}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl disabled:opacity-50 transition-all">
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>

          {showCalculator && selectedType?.slug === 'govt_savings' && (
            <div ref={calcRef} className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
              <SanchayapatraCalculator currency={currency} systemConfigs={sanchayapatraConfigs} />
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
