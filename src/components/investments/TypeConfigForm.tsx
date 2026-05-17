'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { ActionResponse } from '@/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

type TypeConfig = {
  id: string; slug: string; name: string; description?: string | null;
  icon: string; color: string; isSystem: boolean; isActive: boolean;
  hasInterestRate: boolean; hasReturnFrequency: boolean; hasMaturityDate: boolean;
  hasMonthlyInstallment: boolean; hasQuantity: boolean; hasInstitution: boolean;
  hasAccountNumber: boolean; returnTypes: string[];
};

const ICONS = ['trending-up', 'landmark', 'banknote', 'piggy-bank', 'bar-chart-3', 'file-text', 'coins', 'building-2', 'shield', 'scroll', 'briefcase', 'diamond', 'globe', 'bitcoin', 'credit-card', 'dollar-sign'];
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b'];

const RETURN_TYPES_OPTIONS = ['INTEREST', 'DIVIDEND', 'CAPITAL_GAIN', 'COUPON', 'RENTAL', 'MATURITY_BENEFIT', 'STAKING_REWARD', 'PROFIT_SHARE', 'OTHER'];
const FIELD_KEYS = [
  'hasInterestRate',
  'hasReturnFrequency',
  'hasMaturityDate',
  'hasMonthlyInstallment',
  'hasQuantity',
  'hasInstitution',
  'hasAccountNumber',
] as const;

export default function TypeConfigForm({ config, loading, onSubmit, onClose }: {
  config: TypeConfig | null;
  loading: boolean;
  onSubmit: (fd: FormData) => Promise<ActionResponse>;
  onClose: () => void;
}) {
  const { messages } = useI18n();
  const copy = messages.pages.investments;
  const isEdit = !!config;
  const isSystem = config?.isSystem || false;
  
  const [icon, setIcon] = useState(config?.icon || 'trending-up');
  const [color, setColor] = useState(config?.color || '#6366f1');
  const [returnTypes, setReturnTypes] = useState<string[]>(config?.returnTypes || []);
  const [isActive, setIsActive] = useState(config?.isActive ?? true);
  
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState('');

  const toggleReturnType = (type: string) => {
    if (returnTypes.includes(type)) {
      setReturnTypes(returnTypes.filter(t => t !== type));
    } else {
      setReturnTypes([...returnTypes, type]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setMessage('');
    const fd = new FormData(e.currentTarget);
    fd.set('icon', icon);
    fd.set('color', color);
    fd.set('returnTypes', returnTypes.join(','));
    fd.set('isActive', isActive.toString());
    if (isSystem) {
      fd.set('isSystem', 'true');
    }
    
    // Checkbox values are only present in FormData if checked, and their value is "on" by default.
    // We need to set them explicitly to 'true' or 'false' for the action
    if (!isSystem) {
      FIELD_KEYS.forEach(field => {
        fd.set(field, fd.get(field) === 'on' ? 'true' : 'false');
      });
    }

    const result = await onSubmit(fd);
    if (!result.success) {
      setMessage(result.message);
      if (result.errors) setErrors(result.errors);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] bg-black/60 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700/50 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/50">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isEdit ? (isSystem ? copy.systemInvestmentType : copy.editInvestmentType) : copy.createCustomType}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {message && <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-xl px-4 py-2">{message}</p>}

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700/50">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{copy.activeStatus}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{copy.activeStatusHelp}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {!isSystem && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.name} *</label>
                  <input name="name" defaultValue={config?.name || ''} required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Cryptocurrency" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.slug} *</label>
                  <input name="slug" defaultValue={config?.slug || ''} required readOnly={isEdit}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm focus:outline-none focus:border-indigo-500",
                      isEdit ? "text-slate-500 bg-slate-50 dark:bg-slate-800 cursor-not-allowed" : "text-slate-900 dark:text-white"
                    )}
                    placeholder="e.g. crypto" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{copy.description}</label>
                <input name="description" defaultValue={config?.description || ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Short description of this investment type" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Icon Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">{copy.icon}</label>
                  <div className="flex flex-wrap gap-2">
                    {ICONS.map((i) => (
                      <button key={i} type="button" onClick={() => setIcon(i)}
                        className={cn(
                          "p-2 rounded-xl border transition-all",
                          icon === i ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "border-slate-200 dark:border-slate-700/50 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <i data-lucide={i} className="h-5 w-5"></i>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">{copy.color}</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                          color === c ? "ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-800" : "hover:scale-110"
                        )}
                      >
                        {color === c && <Check className="h-4 w-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{copy.fieldConfiguration}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{copy.fieldConfigurationHelp}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FIELD_KEYS.map((field) => (
                    <label key={field} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/30 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <input 
                        type="checkbox" 
                        name={field} 
                        defaultChecked={config ? config[field] : field === 'hasMaturityDate' || field === 'hasInstitution' || field === 'hasAccountNumber'} 
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" 
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{copy.fields[field]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{copy.returnTypes}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{copy.returnTypesHelp}</p>
                
                <div className="flex flex-wrap gap-2">
                  {RETURN_TYPES_OPTIONS.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleReturnType(type)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        returnTypes.includes(type)
                          ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300"
                      )}
                    >
                      {type.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {isSystem && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold mb-1">{copy.systemDefaultType}</p>
              <p>{copy.systemDefaultTypeHelp}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              {copy.cancel}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl disabled:opacity-50 transition-all">
              {loading ? copy.saving : isEdit ? copy.update : copy.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
