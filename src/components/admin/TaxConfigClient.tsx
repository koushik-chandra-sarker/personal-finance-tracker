'use client';

import { useState } from 'react';
import { DownloadCloud, Plus, Trash2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { autoFetchTaxConfigsAction, deleteTaxConfigAction, createTaxConfigAction } from '@/actions/tax-config.actions';
import Modal from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';

export type TaxConfigClientRow = {
  id: string;
  fiscalYear: string;
  category: 'MALE' | 'FEMALE';
  slabIndex: number;
  minAmount: string;
  maxAmount: string | null;
  rate: string;
  label: string;
  isActive: boolean;
  source: string | null;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_SOURCE_URL = 'https://taxsummaries.pwc.com/bangladesh/individual/taxes-on-personal-income';

function getCurrentBangladeshFiscalYear() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 6 ? `${year}-${String(year + 1).slice(2)}` : `${year - 1}-${String(year).slice(2)}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An error occurred.';
}

function formatAmount(value: string | null) {
  if (!value) return '∞';
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function TaxConfigClient({ initialConfigs }: { initialConfigs: TaxConfigClientRow[] }) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fiscalYear, setFiscalYear] = useState(getCurrentBangladeshFiscalYear());
  const [sourceUrl, setSourceUrl] = useState(DEFAULT_SOURCE_URL);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleAutoFetch = async () => {
    setIsFetching(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await autoFetchTaxConfigsAction(fiscalYear, sourceUrl);
      if (res.success) {
        if (res.data?.configs) setConfigs(res.data.configs);
        setSuccess(res.message || 'Successfully fetched tax configs.');
        router.refresh();
      } else {
        setError(res.message || 'Failed to fetch tax configs.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
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
    } catch (err) {
      setError(getErrorMessage(err));
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
        if (res.data) setConfigs(prev => [...prev.filter(config => config.id !== res.data!.id), res.data!]);
        setIsModalOpen(false);
        setSuccess('Successfully added tax slab.');
        router.refresh(); // Server action handles revalidation, wait for data to refresh
      } else {
        setError(res.message || 'Failed to create tax slab.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const fiscalYearOptions = Array.from(new Set([fiscalYear, getCurrentBangladeshFiscalYear(), ...configs.map(c => c.fiscalYear)])).sort((a, b) => b.localeCompare(a));
  const maleConfigs = configs.filter(c => c.category === 'MALE' && c.fiscalYear === fiscalYear);
  const femaleConfigs = configs.filter(c => c.category === 'FEMALE' && c.fiscalYear === fiscalYear);
  const visibleConfigs = [...maleConfigs, ...femaleConfigs];
  const latestSource = visibleConfigs.find(config => config.source)?.source;

  const renderTable = (data: TaxConfigClientRow[], title: string) => (
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
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatAmount(config.minAmount)}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatAmount(config.maxAmount)}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{Number(config.rate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
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
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tax Configuration</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage live tax slabs for the salary planner.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[140px_minmax(260px,1fr)_auto_auto]">
          <div className="relative">
            <input
              list="taxFiscalYears"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
              placeholder="2025-26"
              aria-label="Fiscal year"
            />
            <datalist id="taxFiscalYears">
              {fiscalYearOptions.map(year => <option key={year} value={year} />)}
            </datalist>
          </div>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none"
            placeholder="Source URL"
            aria-label="Tax source URL"
          />
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
            Fetch
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Selected FY</p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{fiscalYear}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Slabs</p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{visibleConfigs.length}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Latest Source</p>
            {latestSource ? (
              <a href={latestSource.split('|').at(-1)?.trim()} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Open source <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Manual or not fetched</p>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          The fetcher reads the selected internet source and imports the resident individual table plus the women/senior exemption note. It replaces only the selected fiscal year.
        </p>
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
