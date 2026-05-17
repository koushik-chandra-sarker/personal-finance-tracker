'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { type Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { financialNoteSchema, type FinancialNoteInput } from '@/lib/validations/financial-note';
import { createFinancialNoteAction, deleteFinancialNoteAction, updateFinancialNoteAction } from '@/actions/financial-note.actions';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { cn, formatCurrency, formatDate, formatRelativeDate } from '@/lib/utils';
import { useI18n } from '@/i18n/client';
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit2,
  FileText,
  HandCoins,
  Package,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

type NoteMode = 'SIMPLE' | 'EXTENDED';
type NoteValueType = 'MONEY' | 'ASSET' | 'MONEY_AND_ASSET' | 'OTHER';
type NoteStatus = 'OPEN' | 'PARTIAL' | 'RETURNED' | 'CANCELLED';

type FinancialNote = {
  id: string;
  mode: NoteMode;
  title: string;
  description: string;
  tags: string[];
  counterpartyName: string | null;
  valueType: NoteValueType | null;
  amount: string | number | null;
  assetName: string | null;
  assetDetails: string | null;
  providedDate: string | null;
  expectedReturnDate: string | null;
  returnedDate: string | null;
  status: NoteStatus | null;
  createdAt: string;
  updatedAt: string;
  createdByName?: string | null;
  updatedByName?: string | null;
};

function toDateInput(value?: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function isActiveDueStatus(status: NoteStatus | null) {
  return status !== 'RETURNED' && status !== 'CANCELLED';
}

function getDueState(note: FinancialNote) {
  if (!note.expectedReturnDate || !isActiveDueStatus(note.status)) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(note.expectedReturnDate);
  due.setHours(0, 0, 0, 0);
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);

  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 7) return 'soon';
  return 'later';
}

function statusVariant(status: NoteStatus | null): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'RETURNED') return 'success';
  if (status === 'PARTIAL') return 'warning';
  if (status === 'CANCELLED') return 'default';
  return 'info';
}

function noteToFormData(note: FinancialNote, overrides: Partial<FinancialNoteInput> = {}) {
  const formData = new FormData();
  formData.set('mode', overrides.mode || note.mode);
  formData.set('title', overrides.title || note.title);
  formData.set('description', overrides.description || note.description);
  formData.set('tags', overrides.tags ? overrides.tags.join(',') : note.tags.join(','));
  formData.set('counterpartyName', overrides.counterpartyName ?? note.counterpartyName ?? '');
  formData.set('valueType', overrides.valueType ?? note.valueType ?? '');
  formData.set('amount', overrides.amount === undefined ? (note.amount === null ? '' : String(note.amount)) : String(overrides.amount));
  formData.set('assetName', overrides.assetName ?? note.assetName ?? '');
  formData.set('assetDetails', overrides.assetDetails ?? note.assetDetails ?? '');
  formData.set('providedDate', overrides.providedDate ?? toDateInput(note.providedDate));
  formData.set('expectedReturnDate', overrides.expectedReturnDate ?? toDateInput(note.expectedReturnDate));
  formData.set('returnedDate', overrides.returnedDate ?? toDateInput(note.returnedDate));
  formData.set('status', overrides.status ?? note.status ?? '');
  return formData;
}

export default function NotesPageClient({
  notes,
  canEdit,
  userCurrency,
}: {
  notes: FinancialNote[];
  canEdit: boolean;
  userCurrency: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailsNote, setDetailsNote] = useState<FinancialNote | null>(null);
  const [editingNote, setEditingNote] = useState<FinancialNote | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedMode, setSelectedMode] = useState<NoteMode>('SIMPLE');
  const [selectedStatus, setSelectedStatus] = useState<NoteStatus>('OPEN');
  const [filters, setFilters] = useState({
    search: '',
    mode: 'ALL',
    status: 'ALL',
    valueType: 'ALL',
    tags: '',
    dueFrom: '',
    dueTo: '',
    sortBy: 'createdAt_desc',
  });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { locale, messages } = useI18n();
  const copy = messages.pages.notes;
  const common = messages.pages.common;
  const modeOptions = [
    { value: 'ALL', label: copy.allModes },
    { value: 'SIMPLE', label: copy.simple },
    { value: 'EXTENDED', label: copy.extended },
  ];
  const valueTypeOptions = [
    { value: 'ALL', label: copy.allValueTypes },
    { value: 'MONEY', label: copy.money },
    { value: 'ASSET', label: copy.asset },
    { value: 'MONEY_AND_ASSET', label: copy.moneyAndAsset },
    { value: 'OTHER', label: copy.other },
  ];
  const statusOptions = [
    { value: 'ALL', label: copy.allStatuses },
    { value: 'OPEN', label: copy.open },
    { value: 'PARTIAL', label: copy.partial },
    { value: 'RETURNED', label: copy.returned },
    { value: 'CANCELLED', label: copy.cancelled },
  ];
  const noteStatusOptions = statusOptions.filter(option => option.value !== 'ALL');
  const sortOptions = [
    { value: 'createdAt_desc', label: copy.newestFirst },
    { value: 'createdAt_asc', label: copy.oldestFirst },
    { value: 'due_asc', label: copy.dueSoonSort },
    { value: 'title_asc', label: copy.titleAz },
  ];
  const valueTypeLabels: Record<NoteValueType, string> = {
    MONEY: copy.money,
    ASSET: copy.asset,
    MONEY_AND_ASSET: copy.moneyAndAsset,
    OTHER: copy.other,
  };
  const statusLabels: Record<NoteStatus, string> = {
    OPEN: copy.open,
    PARTIAL: copy.partial,
    RETURNED: copy.returned,
    CANCELLED: copy.cancelled,
  };
  const actionMessageMap: Record<string, string> = {
    'Validation failed': copy.messages.validationFailed,
    'Note created': copy.messages.created,
    'Note updated': copy.messages.updated,
    'Note deleted': copy.messages.deleted,
    'Failed to create note': copy.messages.createFailed,
    'Failed to update note': copy.messages.updateFailed,
    'Failed to delete note': copy.messages.deleteFailed,
    'তথ্য যাচাই করা যায়নি': copy.messages.validationFailed,
    'নোট তৈরি হয়েছে': copy.messages.created,
    'নোট আপডেট হয়েছে': copy.messages.updated,
    'নোট ডিলিট হয়েছে': copy.messages.deleted,
    'নোট তৈরি করা যায়নি': copy.messages.createFailed,
    'নোট আপডেট করা যায়নি': copy.messages.updateFailed,
    'নোট ডিলিট করা যায়নি': copy.messages.deleteFailed,
  };
  const localizeActionMessage = (text: string) => actionMessageMap[text] || text;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FinancialNoteInput>({
    resolver: zodResolver(financialNoteSchema) as unknown as Resolver<FinancialNoteInput>,
    defaultValues: {
      mode: 'SIMPLE',
      title: '',
      description: '',
      tags: [],
      status: 'OPEN',
      valueType: 'OTHER',
    },
  });

  const modeField = register('mode', {
    onChange: (event) => setSelectedMode(event.target.value as NoteMode),
  });
  const statusField = register('status', {
    onChange: (event) => setSelectedStatus(event.target.value as NoteStatus),
  });

  const filteredNotes = useMemo(() => {
    const tagFilters = filters.tags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
    const query = filters.search.trim().toLowerCase();

    return notes
      .filter(note => {
        if (filters.mode !== 'ALL' && note.mode !== filters.mode) return false;
        if (filters.status !== 'ALL' && note.status !== filters.status) return false;
        if (filters.valueType !== 'ALL' && note.valueType !== filters.valueType) return false;
        if (tagFilters.length > 0 && !tagFilters.some(tag => note.tags.some(noteTag => noteTag.toLowerCase() === tag))) return false;

        if (filters.dueFrom || filters.dueTo) {
          if (!note.expectedReturnDate) return false;
          const due = new Date(toDateInput(note.expectedReturnDate));
          if (filters.dueFrom && due < new Date(filters.dueFrom)) return false;
          if (filters.dueTo && due > new Date(filters.dueTo)) return false;
        }

        if (!query) return true;
        return [
          note.title,
          note.description,
          note.counterpartyName,
          note.assetName,
          note.assetDetails,
          note.tags.join(' '),
        ].some(value => value?.toLowerCase().includes(query));
      })
      .sort((a, b) => {
        if (filters.sortBy === 'createdAt_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (filters.sortBy === 'due_asc') {
          const aDue = a.expectedReturnDate ? new Date(a.expectedReturnDate).getTime() : Number.POSITIVE_INFINITY;
          const bDue = b.expectedReturnDate ? new Date(b.expectedReturnDate).getTime() : Number.POSITIVE_INFINITY;
          return aDue - bDue;
        }
        if (filters.sortBy === 'title_asc') return a.title.localeCompare(b.title);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [filters, notes]);

  const openCreateModal = () => {
    setEditingNote(null);
    setMessage(null);
    setSelectedMode('SIMPLE');
    setSelectedStatus('OPEN');
    reset({
      mode: 'SIMPLE',
      title: '',
      description: '',
      tags: [],
      status: 'OPEN',
      valueType: 'OTHER',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (note: FinancialNote) => {
    setDetailsNote(null);
    setEditingNote(note);
    setMessage(null);
    setSelectedMode(note.mode);
    setSelectedStatus(note.status || 'OPEN');
    reset({
      mode: note.mode,
      title: note.title,
      description: note.description,
      tags: note.tags,
      counterpartyName: note.counterpartyName || undefined,
      valueType: note.valueType || 'OTHER',
      amount: note.amount === null ? undefined : Number(note.amount),
      assetName: note.assetName || undefined,
      assetDetails: note.assetDetails || undefined,
      providedDate: toDateInput(note.providedDate),
      expectedReturnDate: toDateInput(note.expectedReturnDate),
      returnedDate: toDateInput(note.returnedDate),
      status: note.status || 'OPEN',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNote(null);
  };

  const openDetailsModal = (note: FinancialNote) => {
    setDetailsNote(note);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const onSubmit = async (data: FinancialNoteInput) => {
    const formData = new FormData();
    formData.set('mode', data.mode);
    formData.set('title', data.title);
    formData.set('description', data.description);
    formData.set('tags', (data.tags || []).join(','));
    formData.set('counterpartyName', data.counterpartyName || '');
    formData.set('valueType', data.valueType || '');
    formData.set('amount', data.amount === undefined ? '' : String(data.amount));
    formData.set('assetName', data.assetName || '');
    formData.set('assetDetails', data.assetDetails || '');
    formData.set('providedDate', data.providedDate || '');
    formData.set('expectedReturnDate', data.expectedReturnDate || '');
    formData.set('returnedDate', data.returnedDate || '');
    formData.set('status', data.status || '');

    startTransition(async () => {
      const result = editingNote
        ? await updateFinancialNoteAction(editingNote.id, formData)
        : await createFinancialNoteAction(formData);

      if (result.success) {
        closeModal();
        showMessage('success', localizeActionMessage(result.message));
        router.refresh();
      } else {
        showMessage('error', localizeActionMessage(result.message));
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(copy.deleteConfirm)) return;

    startTransition(async () => {
      const result = await deleteFinancialNoteAction(id);
      showMessage(result.success ? 'success' : 'error', localizeActionMessage(result.message));
      if (result.success) {
        setDetailsNote(prev => prev?.id === id ? null : prev);
        router.refresh();
      }
    });
  };

  const handleStatusChange = (note: FinancialNote, status: NoteStatus) => {
    const formData = noteToFormData(note, {
      status,
      returnedDate: status === 'RETURNED' && !note.returnedDate ? todayInput() : toDateInput(note.returnedDate),
    });

    startTransition(async () => {
      const result = await updateFinancialNoteAction(note.id, formData);
      showMessage(result.success ? 'success' : 'error', localizeActionMessage(result.message));
      if (result.success) router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Loader show={isPending} message={copy.saving} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{copy.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {notes.length} {notes.length === 1 ? copy.savedRecord : copy.savedRecords}
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" /> {copy.addNote}
          </Button>
        )}
      </div>

      {message && (
        <div className={cn(
          'rounded-xl px-4 py-3 text-sm',
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
        )}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_11rem] gap-3">
        <Input
          id="noteSearch"
          placeholder={copy.searchPlaceholder}
          icon={<Search className="h-4 w-4" />}
          value={filters.search}
          onChange={(event) => setFilters(prev => ({ ...prev, search: event.target.value }))}
        />
        <Select
          id="noteModeFilter"
          options={modeOptions}
          value={filters.mode}
          onChange={(event) => setFilters(prev => ({ ...prev, mode: event.target.value }))}
        />
        <Select
          id="noteStatusFilter"
          options={statusOptions}
          value={filters.status}
          onChange={(event) => setFilters(prev => ({ ...prev, status: event.target.value }))}
        />
        <Select
          id="noteSort"
          options={sortOptions}
          value={filters.sortBy}
          onChange={(event) => setFilters(prev => ({ ...prev, sortBy: event.target.value }))}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Select
          id="noteValueTypeFilter"
          options={valueTypeOptions}
          value={filters.valueType}
          onChange={(event) => setFilters(prev => ({ ...prev, valueType: event.target.value }))}
        />
        <Input
          id="noteTagFilter"
          placeholder={copy.tagsPlaceholder}
          value={filters.tags}
          onChange={(event) => setFilters(prev => ({ ...prev, tags: event.target.value }))}
        />
        <Input
          id="noteDueFrom"
          type="date"
          value={filters.dueFrom}
          onChange={(event) => setFilters(prev => ({ ...prev, dueFrom: event.target.value }))}
        />
        <Input
          id="noteDueTo"
          type="date"
          value={filters.dueTo}
          onChange={(event) => setFilters(prev => ({ ...prev, dueTo: event.target.value }))}
        />
      </div>

      {filteredNotes.length === 0 ? (
        <EmptyState
          title={notes.length === 0 ? copy.noNotes : copy.noMatching}
          description={notes.length === 0 ? copy.noNotesHelp : copy.noMatchingHelp}
          icon={<FileText className="h-12 w-12 text-slate-400 dark:text-slate-500" />}
          action={canEdit ? <Button onClick={openCreateModal}><Plus className="h-4 w-4" /> {copy.addNote}</Button> : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-800/50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">{copy.note}</th>
                  <th className="px-4 py-3 font-semibold">{copy.type}</th>
                  <th className="px-4 py-3 font-semibold">{copy.personAsset}</th>
                  <th className="px-4 py-3 font-semibold">{copy.amount}</th>
                  <th className="px-4 py-3 font-semibold">{copy.due}</th>
                  <th className="px-4 py-3 font-semibold">{copy.status}</th>
                  <th className="px-4 py-3 font-semibold">{copy.updated}</th>
                  {canEdit && <th className="px-4 py-3 text-right font-semibold">{copy.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {filteredNotes.map((note) => {
                  const dueState = getDueState(note);
                  const isExtended = note.mode === 'EXTENDED';

                  return (
                    <tr
                      key={note.id}
                      onClick={() => openDetailsModal(note)}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5',
                        dueState === 'overdue' && 'bg-rose-50/50 dark:bg-rose-500/5',
                        dueState === 'soon' && 'bg-amber-50/50 dark:bg-amber-500/5'
                      )}
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="max-w-[24rem]">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{note.title}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{note.description}</p>
                          {note.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {note.tags.slice(0, 3).map(tag => <Badge key={tag} variant="default">#{tag}</Badge>)}
                              {note.tags.length > 3 && <Badge variant="default">+{note.tags.length - 3}</Badge>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1.5">
                          <Badge variant={isExtended ? 'info' : 'default'}>{isExtended ? copy.extended : copy.simple}</Badge>
                          {note.valueType && <p className="text-xs text-slate-500 dark:text-slate-400">{valueTypeLabels[note.valueType]}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">
                        <div className="max-w-[14rem] space-y-1">
                          <p className="truncate">{note.counterpartyName || '-'}</p>
                          {note.assetName && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{note.assetName}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top font-medium text-slate-900 dark:text-white">
                        {note.amount !== null ? formatCurrency(Number(note.amount), userCurrency, locale) : '-'}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {note.expectedReturnDate ? (
                          <div className="space-y-1">
                            <p className="text-slate-700 dark:text-slate-200">{formatDate(note.expectedReturnDate, undefined, locale)}</p>
                            {dueState === 'overdue' && <Badge variant="danger"><AlertTriangle className="mr-1 h-3 w-3" /> {copy.overdue}</Badge>}
                            {dueState === 'soon' && <Badge variant="warning"><Clock3 className="mr-1 h-3 w-3" /> {copy.dueSoon}</Badge>}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {canEdit && note.status ? (
                          <div onClick={(event) => event.stopPropagation()}>
                            <Select
                              id={`status-${note.id}`}
                              className="py-2"
                              options={noteStatusOptions}
                              value={note.status}
                              onChange={(event) => handleStatusChange(note, event.target.value as NoteStatus)}
                            />
                          </div>
                        ) : note.status ? (
                          <Badge variant={statusVariant(note.status)}>{statusLabels[note.status]}</Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-500 dark:text-slate-400">
                        {formatRelativeDate(note.updatedAt, locale)}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 align-top">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditModal(note);
                              }}
                              className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                              aria-label={copy.editAria}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(note.id);
                              }}
                              className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                              aria-label={copy.deleteAria}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={!!detailsNote} onClose={() => setDetailsNote(null)} title={detailsNote?.title || copy.noteDetails} className="max-w-2xl">
        {detailsNote && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant={detailsNote.mode === 'EXTENDED' ? 'info' : 'default'}>{detailsNote.mode === 'EXTENDED' ? copy.extended : copy.simple}</Badge>
              {detailsNote.status && <Badge variant={statusVariant(detailsNote.status)}>{statusLabels[detailsNote.status]}</Badge>}
              {getDueState(detailsNote) === 'overdue' && <Badge variant="danger"><AlertTriangle className="mr-1 h-3 w-3" /> {copy.overdue}</Badge>}
              {getDueState(detailsNote) === 'soon' && <Badge variant="warning"><Clock3 className="mr-1 h-3 w-3" /> {copy.dueSoon}</Badge>}
            </div>

            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
              {detailsNote.description}
            </p>

            {detailsNote.mode === 'EXTENDED' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {detailsNote.counterpartyName && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <HandCoins className="h-4 w-4 text-slate-400" />
                    <span>{detailsNote.counterpartyName}</span>
                  </div>
                )}
                {detailsNote.valueType && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Package className="h-4 w-4 text-slate-400" />
                    <span>{valueTypeLabels[detailsNote.valueType]}</span>
                  </div>
                )}
                {detailsNote.amount !== null && (
                  <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                    <Banknote className="h-4 w-4 text-emerald-500" />
                    <span>{formatCurrency(Number(detailsNote.amount), userCurrency, locale)}</span>
                  </div>
                )}
                {detailsNote.assetName && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Package className="h-4 w-4 text-indigo-500" />
                    <span>{detailsNote.assetName}</span>
                  </div>
                )}
                {detailsNote.providedDate && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <CalendarClock className="h-4 w-4 text-slate-400" />
                    <span>{copy.provided} {formatDate(detailsNote.providedDate, undefined, locale)}</span>
                  </div>
                )}
                {detailsNote.expectedReturnDate && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Clock3 className="h-4 w-4 text-slate-400" />
                    <span>{copy.expected} {formatDate(detailsNote.expectedReturnDate, undefined, locale)}</span>
                  </div>
                )}
                {detailsNote.returnedDate && (
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{copy.returned} {formatDate(detailsNote.returnedDate, undefined, locale)}</span>
                  </div>
                )}
              </div>
            )}

            {detailsNote.assetDetails && (
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                <p className="mb-1 font-medium text-slate-900 dark:text-white">{copy.assetDetails}</p>
                <p className="whitespace-pre-wrap break-words">{detailsNote.assetDetails}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700/50">
              <div className="flex flex-wrap gap-1.5">
                {detailsNote.tags.map(tag => <Badge key={tag} variant="default">#{tag}</Badge>)}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">{copy.updatedPrefix} {formatRelativeDate(detailsNote.updatedAt, locale)}</p>
            </div>

            {canEdit && (
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => openEditModal(detailsNote)}>
                  <Edit2 className="h-4 w-4" /> {common.edit}
                </Button>
                <Button type="button" variant="danger" onClick={() => handleDelete(detailsNote.id)}>
                  <Trash2 className="h-4 w-4" /> {common.delete}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingNote ? copy.editNote : copy.addNote} className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <label className={cn(
              'flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium cursor-pointer transition-colors',
              selectedMode === 'SIMPLE'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                : 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300'
            )}>
              <input type="radio" value="SIMPLE" {...modeField} className="hidden" />
              {copy.simple}
            </label>
            <label className={cn(
              'flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium cursor-pointer transition-colors',
              selectedMode === 'EXTENDED'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                : 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300'
            )}>
              <input type="radio" value="EXTENDED" {...modeField} className="hidden" />
              {copy.extended}
            </label>
          </div>

          <Input id="title" label={copy.titleLabel} error={errors.title?.message} {...register('title')} />
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {copy.description}
            </label>
            <textarea
              id="description"
              rows={4}
              className={cn(
                'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition-all',
                'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                'dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-400',
                errors.description && 'border-red-500'
              )}
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-500 dark:text-red-400">{errors.description.message}</p>}
          </div>

          <Input id="tags" label={copy.tags} placeholder={copy.tagsExample} {...register('tags')} />

          {selectedMode === 'EXTENDED' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="counterpartyName" label={copy.personOrg} {...register('counterpartyName')} />
                <Select id="valueType" label={copy.valueType} options={valueTypeOptions.filter(option => option.value !== 'ALL')} {...register('valueType')} />
                <Input id="amount" label={`${copy.amount} (${userCurrency})`} type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />
                <Input id="assetName" label={copy.assetItem} placeholder={copy.assetItemPlaceholder} {...register('assetName')} />
                <Input id="providedDate" label={copy.providedDate} type="date" {...register('providedDate')} />
                <Input id="expectedReturnDate" label={copy.expectedReturnDate} type="date" {...register('expectedReturnDate')} />
                <Select id="status" label={copy.status} options={noteStatusOptions} {...statusField} />
                {selectedStatus === 'RETURNED' && (
                  <Input id="returnedDate" label={copy.returnedDate} type="date" error={errors.returnedDate?.message} {...register('returnedDate')} />
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="assetDetails" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {copy.assetDetails}
                </label>
                <textarea
                  id="assetDetails"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600/50 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-400"
                  {...register('assetDetails')}
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isPending} disabled={!canEdit}>
            {editingNote ? copy.updateNote : copy.createNote}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
