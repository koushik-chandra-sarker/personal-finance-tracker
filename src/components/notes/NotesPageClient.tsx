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

const modeOptions = [
  { value: 'ALL', label: 'All modes' },
  { value: 'SIMPLE', label: 'Simple' },
  { value: 'EXTENDED', label: 'Extended' },
];

const valueTypeOptions = [
  { value: 'ALL', label: 'All value types' },
  { value: 'MONEY', label: 'Money' },
  { value: 'ASSET', label: 'Asset' },
  { value: 'MONEY_AND_ASSET', label: 'Money + asset' },
  { value: 'OTHER', label: 'Other' },
];

const statusOptions = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const noteStatusOptions = statusOptions.filter(option => option.value !== 'ALL');

const sortOptions = [
  { value: 'createdAt_desc', label: 'Newest first' },
  { value: 'createdAt_asc', label: 'Oldest first' },
  { value: 'due_asc', label: 'Due soon' },
  { value: 'title_asc', label: 'Title A-Z' },
];

const valueTypeLabels: Record<NoteValueType, string> = {
  MONEY: 'Money',
  ASSET: 'Asset',
  MONEY_AND_ASSET: 'Money + asset',
  OTHER: 'Other',
};

const statusLabels: Record<NoteStatus, string> = {
  OPEN: 'Open',
  PARTIAL: 'Partial',
  RETURNED: 'Returned',
  CANCELLED: 'Cancelled',
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
        showMessage('success', result.message);
        router.refresh();
      } else {
        showMessage('error', result.message);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this note?')) return;

    startTransition(async () => {
      const result = await deleteFinancialNoteAction(id);
      showMessage(result.success ? 'success' : 'error', result.message);
      if (result.success) router.refresh();
    });
  };

  const handleStatusChange = (note: FinancialNote, status: NoteStatus) => {
    const formData = noteToFormData(note, {
      status,
      returnedDate: status === 'RETURNED' && !note.returnedDate ? todayInput() : toDateInput(note.returnedDate),
    });

    startTransition(async () => {
      const result = await updateFinancialNoteAction(note.id, formData);
      showMessage(result.success ? 'success' : 'error', result.message);
      if (result.success) router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Loader show={isPending} message="Saving note..." />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {notes.length} saved {notes.length === 1 ? 'record' : 'records'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" /> Add Note
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
          placeholder="Search notes, people, assets, tags..."
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
          placeholder="Tags"
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
          title={notes.length === 0 ? 'No notes yet' : 'No matching notes'}
          description={notes.length === 0 ? 'Create a simple note or track something you expect to get back' : 'Adjust the filters to find another record'}
          icon={<FileText className="h-12 w-12 text-slate-400 dark:text-slate-500" />}
          action={canEdit ? <Button onClick={openCreateModal}><Plus className="h-4 w-4" /> Add Note</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredNotes.map((note) => {
            const dueState = getDueState(note);
            const isExtended = note.mode === 'EXTENDED';

            return (
              <article
                key={note.id}
                className={cn(
                  'rounded-2xl border bg-white dark:bg-slate-800/50 p-5 transition-all',
                  dueState === 'overdue'
                    ? 'border-rose-200 dark:border-rose-500/30'
                    : dueState === 'soon'
                      ? 'border-amber-200 dark:border-amber-500/30'
                      : 'border-slate-200 dark:border-slate-700/50'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={isExtended ? 'info' : 'default'}>{isExtended ? 'Extended' : 'Simple'}</Badge>
                      {note.status && <Badge variant={statusVariant(note.status)}>{statusLabels[note.status]}</Badge>}
                      {dueState === 'overdue' && <Badge variant="danger"><AlertTriangle className="mr-1 h-3 w-3" /> Overdue</Badge>}
                      {dueState === 'soon' && <Badge variant="warning"><Clock3 className="mr-1 h-3 w-3" /> Due soon</Badge>}
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white break-words">{note.title}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">{note.description}</p>
                  </div>

                  {canEdit && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => openEditModal(note)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                        aria-label="Edit note"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {isExtended && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {note.counterpartyName && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <HandCoins className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{note.counterpartyName}</span>
                      </div>
                    )}
                    {note.valueType && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Package className="h-4 w-4 text-slate-400" />
                        <span>{valueTypeLabels[note.valueType]}</span>
                      </div>
                    )}
                    {note.amount !== null && (
                      <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                        <Banknote className="h-4 w-4 text-emerald-500" />
                        <span>{formatCurrency(Number(note.amount), userCurrency)}</span>
                      </div>
                    )}
                    {note.assetName && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Package className="h-4 w-4 text-indigo-500" />
                        <span className="truncate">{note.assetName}</span>
                      </div>
                    )}
                    {note.providedDate && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <CalendarClock className="h-4 w-4 text-slate-400" />
                        <span>Provided {formatDate(note.providedDate)}</span>
                      </div>
                    )}
                    {note.expectedReturnDate && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Clock3 className="h-4 w-4 text-slate-400" />
                        <span>Expected {formatDate(note.expectedReturnDate)}</span>
                      </div>
                    )}
                    {note.returnedDate && (
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Returned {formatDate(note.returnedDate)}</span>
                      </div>
                    )}
                    {canEdit && note.status && (
                      <Select
                        id={`status-${note.id}`}
                        className="py-2"
                        options={noteStatusOptions}
                        value={note.status}
                        onChange={(event) => handleStatusChange(note, event.target.value as NoteStatus)}
                      />
                    )}
                  </div>
                )}

                {note.assetDetails && (
                  <p className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">
                    {note.assetDetails}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {note.tags.map(tag => <Badge key={tag} variant="default">#{tag}</Badge>)}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Updated {formatRelativeDate(note.updatedAt)}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingNote ? 'Edit Note' : 'Add Note'} className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <label className={cn(
              'flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium cursor-pointer transition-colors',
              selectedMode === 'SIMPLE'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                : 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300'
            )}>
              <input type="radio" value="SIMPLE" {...modeField} className="hidden" />
              Simple
            </label>
            <label className={cn(
              'flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium cursor-pointer transition-colors',
              selectedMode === 'EXTENDED'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                : 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300'
            )}>
              <input type="radio" value="EXTENDED" {...modeField} className="hidden" />
              Extended
            </label>
          </div>

          <Input id="title" label="Title" error={errors.title?.message} {...register('title')} />
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description
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

          <Input id="tags" label="Tags" placeholder="loan, land, document" {...register('tags')} />

          {selectedMode === 'EXTENDED' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="counterpartyName" label="Person or Organization" {...register('counterpartyName')} />
                <Select id="valueType" label="Value Type" options={valueTypeOptions.filter(option => option.value !== 'ALL')} {...register('valueType')} />
                <Input id="amount" label={`Amount (${userCurrency})`} type="number" step="0.01" error={errors.amount?.message} {...register('amount')} />
                <Input id="assetName" label="Asset or Item" placeholder="Land, document, gold, equipment" {...register('assetName')} />
                <Input id="providedDate" label="Provided Date" type="date" {...register('providedDate')} />
                <Input id="expectedReturnDate" label="Expected Return Date" type="date" {...register('expectedReturnDate')} />
                <Select id="status" label="Status" options={noteStatusOptions} {...statusField} />
                {selectedStatus === 'RETURNED' && (
                  <Input id="returnedDate" label="Returned Date" type="date" error={errors.returnedDate?.message} {...register('returnedDate')} />
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="assetDetails" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Asset Details
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
            {editingNote ? 'Update Note' : 'Create Note'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
