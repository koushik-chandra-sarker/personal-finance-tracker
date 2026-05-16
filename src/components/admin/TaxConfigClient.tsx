'use client';

import { useState } from 'react';
import { DownloadCloud, Plus, Pencil, Trash2, CheckCircle2, XCircle, AlertCircle, Save } from 'lucide-react';
import { autoFetchTaxConfigsAction, deleteTaxConfigAction, createTaxConfigAction } from '@/actions/tax-config.actions';
import { TaxCategory, TaxConfig } from '@prisma/client';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function TaxConfigClient({ initialConfigs }: { initialConfigs: TaxConfig[] }) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fiscalYear, setFiscalYear] = useState('2025-26');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleAutoFetch = async () => {
    setIsFetching(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await autoFetchTaxConfigsAction(fiscalYear);
      if (res.success) {
        setSuccess(res.message || 'Successfully fetched tax configs.');
        router.refresh();
      } else {
        setError(res.message || 'Failed to fetch tax configs.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax slab?')) return;
    
    setError(null);
    try {
      const res = await deleteTaxConfigAction(id);
      if (res.success) {
        setConfigs(prev => prev.filter(c => c.id !== id));
      } else {
        setError(res.message || 'Failed to delete config.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await createTaxConfigAction(formData);
      if (res.success) {
        setIsModalOpen(false);
        setSuccess('Successfully added tax slab.');
        router.refresh(); // Server action handles revalidation, wait for data to refresh
      } else {
        setError(res.message || 'Failed to create tax slab.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const maleConfigs = configs.filter(c => c.category === 'MALE' && c.fiscalYear === fiscalYear);
  const femaleConfigs = configs.filter(c => c.category === 'FEMALE' && c.fiscalYear === fiscalYear);

  const renderTable = (data: TaxConfig[], title: string) => (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden mb-6">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title} Slabs</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/30">
              <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Label</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Min</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Max</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Rate (%)</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No slabs found for {title}.</td>
              </tr>
            ) : (
              data.map(config => (
                <tr key={config.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{config.label}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{config.minAmount.toString()}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{config.maxAmount ? config.maxAmount.toString() : '∞'}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{config.rate.toString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(config.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tax Configuration</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage tax slabs for the salary planner.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={fiscalYear} 
            onChange={(e) => setFiscalYear(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="2025-26">2025-26</option>
            <option value="2024-25">2024-25</option>
          </select>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Slab
          </button>
          <button 
            onClick={handleAutoFetch} 
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isFetching ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
            Auto-Fetch from Internet
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 text-sm text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          {renderTable(maleConfigs, 'Male (General)')}
        </div>
        <div>
          {renderTable(femaleConfigs, 'Female / Senior / Disabled')}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Tax Slab">
        <form onSubmit={handleCreate} className="space-y-4">
          <input type="hidden" name="fiscalYear" value={fiscalYear} />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select name="category" className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="MALE">Male (General)</option>
                <option value="FEMALE">Female / Senior / Disabled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Slab Index</label>
              <input type="number" name="slabIndex" required className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0 for first slab" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Label</label>
            <input type="text" name="label" required className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Up to ৳3,50,000" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Min Amount</label>
              <input type="number" name="minAmount" required className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Max Amount</label>
              <input type="number" name="maxAmount" className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Leave empty if None" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tax Rate (%)</label>
              <input type="number" step="0.01" name="rate" required className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Saving...' : 'Save Slab'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
