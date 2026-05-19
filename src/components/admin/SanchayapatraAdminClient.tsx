'use client';

import { useState } from 'react';
import { Save, AlertCircle, CheckCircle2, Edit3, Trash2, Plus, X } from 'lucide-react';
import { 
  updateSanchayapatraConfigAction, 
  createSanchayapatraConfigAction, 
  deleteSanchayapatraConfigAction 
} from '@/actions/sanchayapatra-config.actions';
import { useI18n } from '@/i18n/client';

export default function SanchayapatraAdminClient({ initialConfigs }: { initialConfigs: any[] }) {
  const { messages } = useI18n();
  const copy = messages.pages.admin.investmentConfig;
  const common = messages.pages.admin.common;
  const [configs, setConfigs] = useState(initialConfigs);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ success: boolean, message: string } | null>(null);

  const handleOpenModal = (config: any = null) => {
    setSelectedConfig(config);
    setIsModalOpen(true);
    setStatus(null);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const formData = new FormData(e.currentTarget);
    const result = selectedConfig 
      ? await updateSanchayapatraConfigAction(selectedConfig.id, formData)
      : await createSanchayapatraConfigAction(formData);

    setLoading(false);
    if (result.success) {
      setIsModalOpen(false);
      // In a real app, revalidatePath handles this, but for local state:
      window.location.reload(); 
    } else {
      setStatus({ success: false, message: result.message || copy.errorSaving });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(copy.deleteConfirm)) return;
    setIsDeleting(id);
    const result = await deleteSanchayapatraConfigAction(id);
    setIsDeleting(null);
    if (result.success) {
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="h-4 w-4" />
          {copy.addConfiguration}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{copy.typeName}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{copy.frequency}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{copy.rate}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">{common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {initialConfigs.map((config) => (
                <tr 
                  key={config.id} 
                  onClick={() => handleOpenModal(config)}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-slate-200">{config.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono uppercase">{config.type}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded uppercase">
                      {config.payoutFrequency}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                    {Number(config.rate)}%
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(config); }}
                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button 
                        disabled={isDeleting === config.id}
                        onClick={(e) => { e.stopPropagation(); handleDelete(config.id); }}
                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">
                  {selectedConfig ? copy.editConfiguration : copy.addNewConfiguration}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{copy.modalHelp}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{copy.uniqueSlug}</label>
                  <input 
                    name="type" 
                    defaultValue={selectedConfig?.type} 
                    required 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{copy.displayName}</label>
                  <input 
                    name="name" 
                    defaultValue={selectedConfig?.name} 
                    required 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{copy.description}</label>
                <textarea 
                  name="description" 
                  defaultValue={selectedConfig?.description || ''} 
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm resize-none focus:ring-2 ring-indigo-500/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{copy.profitFrequency}</label>
                  <select 
                    name="payoutFrequency" 
                    defaultValue={selectedConfig?.payoutFrequency || 'MONTHLY'}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 ring-indigo-500/20 outline-none"
                  >
                    <option value="MONTHLY">{copy.monthly}</option>
                    <option value="QUARTERLY">{copy.quarterly}</option>
                    <option value="AT_MATURITY">{copy.atMaturity}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{copy.profitRate}</label>
                  <input 
                    name="rate" 
                    type="number" 
                    step="0.01" 
                    defaultValue={selectedConfig ? Number(selectedConfig.rate) : 11.52} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">{copy.taxThreshold}</label>
                  <input name="taxThreshold" type="number" defaultValue={selectedConfig ? Number(selectedConfig.taxThreshold) : 500000} className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">{copy.taxBelow}</label>
                  <input name="taxRateBelow" type="number" defaultValue={selectedConfig ? Number(selectedConfig.taxRateBelow) : 5} className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">{copy.taxAbove}</label>
                  <input name="taxRateAbove" type="number" defaultValue={selectedConfig ? Number(selectedConfig.taxRateAbove) : 10} className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
                </div>
              </div>

              {status && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-xs">
                  <AlertCircle className="h-4 w-4" />
                  {status.message}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
                >
                  {common.cancel}
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-[2] px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {loading ? common.saving : copy.saveConfiguration}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
