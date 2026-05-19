'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Search, Check } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  group?: string;
}

export type FilterMode = 'include' | 'exclude';

interface MultiSelectFilterProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  mode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
  placeholder?: string;
  copy?: {
    include: string;
    exclude: string;
    not: string;
    selectAll: string;
    deselectAll: string;
    selected: string;
    noOptions: string;
    search: string;
  };
}

export default function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  mode,
  onModeChange,
  placeholder,
  copy,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }
  }, [isOpen]);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(lower));
  }, [options, search]);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectAll = () => {
    const allValues = filteredOptions.map(o => o.value);
    const merged = Array.from(new Set([...selected, ...allValues]));
    onChange(merged);
  };

  const deselectAll = () => {
    if (search) {
      const filteredValues = new Set(filteredOptions.map(o => o.value));
      onChange(selected.filter(v => !filteredValues.has(v)));
    } else {
      onChange([]);
    }
  };

  const removeChip = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(v => v !== value));
  };

  const selectedLabels = selected
    .map(v => options.find(o => o.value === v)?.label)
    .filter(Boolean);

  const allFilteredSelected = filteredOptions.length > 0 && filteredOptions.every(o => selected.includes(o.value));
  const labels = copy || {
    include: 'Include',
    exclude: 'Exclude',
    not: 'NOT',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    selected: 'selected',
    noOptions: 'No options found',
    search: 'Search',
  };

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-w-0 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer
          ${selected.length > 0
            ? mode === 'exclude'
              ? 'border-rose-400 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-500/5'
              : 'border-indigo-400 dark:border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/5'
            : 'border-slate-300 dark:border-slate-600/50 bg-white dark:bg-slate-900/50'
          }
        `}
      >
        <div className="flex-1 min-w-0 truncate">
          {selected.length === 0 ? (
            <span className="text-slate-500 dark:text-slate-400 text-sm">{placeholder || `All ${label}`}</span>
          ) : (
            <span className="text-sm text-slate-900 dark:text-slate-200">
              <span className={`text-xs font-semibold uppercase tracking-wider mr-1 ${mode === 'exclude' ? 'text-rose-500 dark:text-rose-400' : 'text-indigo-500 dark:text-indigo-400'}`}>
                {mode === 'exclude' ? labels.not : ''}
              </span>
              {selectedLabels.length <= 2
                ? selectedLabels.join(', ')
                : `${selectedLabels.length} ${labels.selected}`}
            </span>
          )}
        </div>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            className="shrink-0 p-0.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <ChevronDown className={`shrink-0 h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 top-full mt-1.5 left-0 right-0 min-w-[240px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          
          {/* Include / Exclude Toggle */}
          <div className="flex border-b border-slate-200 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => onModeChange('include')}
              className={`flex-1 px-3 py-2 text-xs font-semibold tracking-wide uppercase text-center transition-colors
                ${mode === 'include'
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }
              `}
            >
              {labels.include}
            </button>
            <button
              type="button"
              onClick={() => onModeChange('exclude')}
              className={`flex-1 px-3 py-2 text-xs font-semibold tracking-wide uppercase text-center transition-colors
                ${mode === 'exclude'
                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-b-2 border-rose-500'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }
              `}
            >
              {labels.exclude}
            </button>
          </div>

          {/* Search */}
          {options.length > 5 && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`${labels.search} ${label.toLowerCase()}...`}
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Select All / Deselect All */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={allFilteredSelected ? deselectAll : selectAll}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              {allFilteredSelected ? labels.deselectAll : labels.selectAll}
            </button>
            {selected.length > 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {selected.length} {labels.selected}
              </span>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto py-1 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                {labels.noOptions}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isChecked = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(option.value)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors
                      ${isChecked
                        ? 'bg-indigo-50 dark:bg-indigo-500/5 text-slate-900 dark:text-slate-200'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }
                    `}
                  >
                    <div className={`shrink-0 w-4 h-4 rounded flex items-center justify-center border transition-colors
                      ${isChecked
                        ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500'
                        : 'border-slate-300 dark:border-slate-600'
                      }
                    `}>
                      {isChecked && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
