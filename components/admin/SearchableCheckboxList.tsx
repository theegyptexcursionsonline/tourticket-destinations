'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export interface SearchableOption {
  id: string;
  label: string;
}

interface SearchableCheckboxListProps {
  options: SearchableOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyLabel: string;
  searchPlaceholder?: string;
  /**
   * Lists shorter than this hide the search field. Defaults to showing it
   * always: these pickers were reported as hard to use, and a box that
   * disappears when a list happens to be short is the same complaint again.
   */
  searchThreshold?: number;
}

export default function SearchableCheckboxList({
  options,
  selectedIds,
  onToggle,
  emptyLabel,
  searchPlaceholder = 'Search…',
  searchThreshold = 0,
}: SearchableCheckboxListProps) {
  const [query, setQuery] = useState('');
  const selected = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query]);

  if (options.length === 0) {
    return (
      <div className="border border-slate-300 rounded-xl p-4 bg-white">
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-300 rounded-xl bg-white overflow-hidden">
      {options.length >= searchThreshold && (
        <div className="relative border-b border-slate-200">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      )}
      <div className="p-4 max-h-48 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="text-sm text-slate-500">No matches for “{query.trim()}”</p>
        ) : (
          <div className="space-y-2">
            {visible.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(option.id)}
                  onChange={() => onToggle(option.id)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {selected.size > 0 && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          {selected.size} selected
        </div>
      )}
    </div>
  );
}
