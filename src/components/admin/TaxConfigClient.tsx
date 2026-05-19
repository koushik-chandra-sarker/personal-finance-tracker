'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, Save, Settings2, Trash2, X } from 'lucide-react';
import { deleteTaxConfigAction, saveManualTaxYearConfigsAction, type ManualTaxConfigInput } from '@/actions/tax-config.actions';
import Modal from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/client';

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

type DraftRow = {
  id: string;
  category: 'MALE' | 'FEMALE';
  label: string;
  minAmount: string;
  maxAmount: string;
  rate: string;
};

function getCurrentBangladeshFiscalYear() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 6 ? `${year}-${String(year + 1).slice(2)}` : `${year - 1}-${String(year).slice(2)}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatAmount(value: string | null, locale: string) {
  if (!value) return '∞';
  return Number(value).toLocaleString(locale, { maximumFractionDigits: 0 });
}

function newDraftRow(category: 'MALE' | 'FEMALE' = 'MALE'): DraftRow {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category,
    label: '',
    minAmount: '',
    maxAmount: '',
    rate: '',
  };
}

function rowsFromExisting(rows: TaxConfigClientRow[]) {
  if (rows.length === 0) return [newDraftRow('MALE'), newDraftRow('FEMALE')];
  return rows
    .sort((a, b) => a.category.localeCompare(b.category) || a.slabIndex - b.slabIndex)
    .map((row) => ({
      id: row.id,
      category: row.category,
      label: row.label,
      minAmount: row.minAmount,
      maxAmount: row.maxAmount ?? '',
      rate: row.rate,
    }));
}

export default function TaxConfigClient({ initialConfigs }: { initialConfigs: TaxConfigClientRow[] }) {
  const { locale, messages } = useI18n();
  const copy = messages.pages.taxConfig;
  const [configs, setConfigs] = useState(initialConfigs);
  const [fiscalYear, setFiscalYear] = useState(getCurrentBangladeshFiscalYear());
  const [draftRows, setDraftRows] = useState<DraftRow[]>([newDraftRow('MALE'), newDraftRow('FEMALE')]);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [savingYear, setSavingYear] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const groupedByYear = useMemo(() => {
    const grouped = configs.reduce<Record<string, TaxConfigClientRow[]>>((acc, config) => {
      acc[config.fiscalYear] = acc[config.fiscalYear] ?? [];
      acc[config.fiscalYear].push(config);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, rows]) => ({
        year,
        rows: rows.sort((a, b) => a.category.localeCompare(b.category) || a.slabIndex - b.slabIndex),
      }));
  }, [configs]);

  const fiscalYearOptions = Array.from(new Set([fiscalYear, getCurrentBangladeshFiscalYear(), ...configs.map((config) => config.fiscalYear)])).sort((a, b) => b.localeCompare(a));

  const openYearEditor = (year = fiscalYear) => {
    setFiscalYear(year);
    setDraftRows(rowsFromExisting(configs.filter((config) => config.fiscalYear === year)));
    setError(null);
    setSuccess(null);
    setIsYearModalOpen(true);
  };

  const updateDraftRow = (id: string, field: keyof DraftRow, value: string) => {
    setDraftRows((prev) => prev.map((row) => row.id === id ? { ...row, [field]: value } : row));
  };

  const removeDraftRow = (id: string) => {
    setDraftRows((prev) => prev.filter((row) => row.id !== id));
  };

  const addDraftRow = (category: 'MALE' | 'FEMALE') => {
    setDraftRows((prev) => [...prev, newDraftRow(category)]);
  };

  const buildManualRows = (): ManualTaxConfigInput[] => {
    const counters: Record<'MALE' | 'FEMALE', number> = { MALE: 0, FEMALE: 0 };
    return draftRows
      .filter((row) => row.label.trim() || row.minAmount.trim() || row.rate.trim())
      .map((row) => {
        const slabIndex = counters[row.category];
        counters[row.category] += 1;
        return {
          category: row.category,
          slabIndex,
          minAmount: Number(row.minAmount),
          maxAmount: row.maxAmount.trim() ? Number(row.maxAmount) : null,
          rate: Number(row.rate),
          label: row.label.trim(),
        };
      });
  };

  const handleSaveYear = async () => {
    setSavingYear(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await saveManualTaxYearConfigsAction(fiscalYear, buildManualRows());
      if (res.success && res.data?.configs) {
        setConfigs(res.data.configs);
        setSuccess(res.message || copy.taxYearSaved);
        setIsYearModalOpen(false);
        router.refresh();
      } else {
        setError(res.message || copy.saveFailed);
      }
    } catch (err) {
      setError(getErrorMessage(err, copy.genericError));
    } finally {
      setSavingYear(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(copy.deleteConfirm)) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await deleteTaxConfigAction(id);
      if (res.success) {
        setConfigs((prev) => prev.filter((config) => config.id !== id));
        setSuccess(copy.slabDeleted);
      } else {
        setError(res.message || copy.deleteFailed);
      }
    } catch (err) {
      setError(getErrorMessage(err, copy.genericError));
    }
  };

  const renderTable = (data: TaxConfigClientRow[], title: string) => (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/50">
      <div className="border-b border-slate-100 p-3 dark:border-slate-700/50">
        <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-200">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.label}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.min}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.max}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.rate}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{copy.noSlabs}</td>
              </tr>
            ) : (
              data.map((config) => (
                <tr key={config.id}>
                  <td className="px-4 py-3 text-xs font-medium text-slate-900 dark:text-slate-100">{config.label}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">{formatAmount(config.minAmount, locale)}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">{formatAmount(config.maxAmount, locale)}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-600 dark:text-slate-400">{Number(config.rate).toLocaleString(locale, { maximumFractionDigits: 2 })}%</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(config.id)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10">
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{copy.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[160px_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{copy.fiscalYear}</label>
            <input
              list="taxFiscalYears"
              value={fiscalYear}
              onChange={(event) => setFiscalYear(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              placeholder="2025-26"
            />
            <datalist id="taxFiscalYears">
              {fiscalYearOptions.map((year) => <option key={year} value={year} />)}
            </datalist>
          </div>
          <button
            onClick={() => openYearEditor(fiscalYear)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <Settings2 className="h-4 w-4" /> {copy.setupTaxYear}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 dark:bg-rose-500/10">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-600 dark:bg-emerald-500/10">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.visibleTaxYears}</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-200">{groupedByYear.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.totalSlabs}</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-200">{configs.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.currentEditorFy}</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-200">{fiscalYear}</p>
        </div>
      </div>

      {groupedByYear.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{copy.noTaxYears}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.noTaxYearsHelp}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByYear.map(({ year, rows }) => {
            const maleRows = rows.filter((row) => row.category === 'MALE');
            const femaleRows = rows.filter((row) => row.category === 'FEMALE');
            return (
              <section key={year} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200">{copy.fiscalYearTitle} {year}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{rows.length} {copy.manualSlabsSaved}</p>
                  </div>
                  <button
                    onClick={() => openYearEditor(year)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Settings2 className="h-3.5 w-3.5" /> {copy.editYear}
                  </button>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {renderTable(maleRows, copy.maleGeneral)}
                  {renderTable(femaleRows, copy.femaleSeniorDisabled)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Modal isOpen={isYearModalOpen} onClose={() => setIsYearModalOpen(false)} title={`${copy.manualSetup} - ${fiscalYear}`} size="2xl">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{copy.fiscalYear}</label>
              <input
                value={fiscalYear}
                onChange={(event) => setFiscalYear(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                placeholder="2025-26"
              />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={() => addDraftRow('MALE')} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                <Plus className="h-3.5 w-3.5" /> {copy.maleSlab}
              </button>
              <button onClick={() => addDraftRow('FEMALE')} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                <Plus className="h-3.5 w-3.5" /> {copy.femaleSlab}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/50">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/30">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.category}</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.label}</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.min}</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.max}</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.rate}</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {draftRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">
                      <select
                        value={row.category}
                        onChange={(event) => updateDraftRow(row.id, 'category', event.target.value)}
                        className="w-36 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      >
                        <option value="MALE">{copy.male}</option>
                        <option value="FEMALE">{copy.femaleSenior}</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.label}
                        onChange={(event) => updateDraftRow(row.id, 'label', event.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                        placeholder="Up to BDT 375,000"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.minAmount}
                        onChange={(event) => updateDraftRow(row.id, 'minAmount', event.target.value)}
                        className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-2 text-right text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.maxAmount}
                        onChange={(event) => updateDraftRow(row.id, 'maxAmount', event.target.value)}
                        className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-2 text-right text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                        placeholder={copy.noMax}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.rate}
                        onChange={(event) => updateDraftRow(row.id, 'rate', event.target.value)}
                        className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-2 text-right text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeDraftRow(row.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10">
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {copy.saveHelp}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setIsYearModalOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              {copy.cancel}
            </button>
            <button onClick={handleSaveYear} disabled={savingYear} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              <Save className="h-4 w-4" /> {savingYear ? copy.saving : copy.saveTaxYear}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
