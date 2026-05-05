'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { createTypeConfigAction, updateTypeConfigAction, deleteTypeConfigAction } from '@/actions/investment-type.actions';
import { Plus, Trash2, Edit3, Settings2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import TypeConfigForm from './TypeConfigForm';
import {
  TrendingUp, Landmark, Banknote, PiggyBank, BarChart3, FileText, Coins, 
  Building2, Shield, ScrollText, Briefcase, Diamond, Globe, Bitcoin, CreditCard, DollarSign
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  'trending-up': TrendingUp, 'landmark': Landmark, 'banknote': Banknote, 
  'piggy-bank': PiggyBank, 'bar-chart-3': BarChart3, 'file-text': FileText,
  'coins': Coins, 'building-2': Building2, 'shield': Shield, 'scroll': ScrollText,
  'briefcase': Briefcase, 'diamond': Diamond, 'globe': Globe, 'bitcoin': Bitcoin,
  'credit-card': CreditCard, 'dollar-sign': DollarSign
};

function getIcon(name: string) { return ICON_MAP[name] || TrendingUp; }

type TypeConfig = {
  id: string; slug: string; name: string; description?: string | null;
  icon: string; color: string; isSystem: boolean; isActive: boolean;
  hasInterestRate: boolean; hasReturnFrequency: boolean; hasMaturityDate: boolean;
  hasMonthlyInstallment: boolean; hasQuantity: boolean; hasInstitution: boolean;
  hasAccountNumber: boolean; returnTypes: string[];
  _count?: { investments: number };
};

export default function TypeConfigListClient({ typeConfigs: initialConfigs }: { typeConfigs: TypeConfig[] }) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<TypeConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async (formData: FormData) => {
    setLoading(true);
    try {
      const result = await createTypeConfigAction(formData);
      if (result.success) {
        setShowForm(false);
        window.location.reload();
      }
      return result;
    } finally { setLoading(false); }
  };

  const handleUpdate = async (id: string, formData: FormData) => {
    setLoading(true);
    try {
      const result = await updateTypeConfigAction(id, formData);
      if (result.success) {
        setEditingConfig(null);
        window.location.reload();
      }
      return result;
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const result = await deleteTypeConfigAction(id);
      if (result.success) {
        setDeleteId(null);
        window.location.reload();
      } else {
        alert(result.message);
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/investments" className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Investment Types</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage instruments and their fields</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingConfig(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
        >
          <Plus className="h-4 w-4" /> Custom Type
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configs.map((config) => {
          const Icon = getIcon(config.icon);
          const activeInvestments = config._count?.investments || 0;

          return (
            <div key={config.id} className={cn(
              "group relative rounded-2xl border bg-white dark:bg-slate-800/50 p-5 transition-all duration-200",
              config.isActive ? "border-slate-200 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:shadow-lg" : "border-slate-200/50 dark:border-slate-700/30 opacity-60"
            )}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: config.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      {config.name}
                      {config.isSystem && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">System</span>}
                      {!config.isActive && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Hidden</span>}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{config.description}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {activeInvestments} {activeInvestments === 1 ? 'investment' : 'investments'}
                </div>
                
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingConfig(config); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" title="Edit Configuration">
                    <Settings2 className="h-4 w-4" />
                  </button>
                  {!config.isSystem && activeInvestments === 0 && (
                    <button onClick={() => setDeleteId(config.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <TypeConfigForm
          config={editingConfig}
          loading={loading}
          onSubmit={editingConfig ? (fd) => handleUpdate(editingConfig.id, fd) : handleCreate}
          onClose={() => { setShowForm(false); setEditingConfig(null); }}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-700/50 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Type?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">This custom investment type will be permanently removed.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
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
