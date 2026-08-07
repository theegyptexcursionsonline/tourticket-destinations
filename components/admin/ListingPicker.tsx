'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, MapPin, X } from 'lucide-react';

/**
 * Searchable multi-select used by the admin Listings tabs.
 *
 * Extracted from AttractionPageForm so the Category editor curates its
 * "other page listings" through the same control — two copies of a picker
 * drift, and the tenantId it forwards is what keeps one brand's search from
 * returning another brand's pages.
 */
export interface PickerOption {
  id: string;
  title: string;
  slug?: string;
  image?: string;
  kind?: string;
  isPublished?: boolean;
  matchedOptionIds?: string[];
}

const FormLabel = ({ icon: Icon, children }: { icon?: React.ElementType; children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-3">
    {Icon && <Icon className="h-4 w-4 text-indigo-500" />}
    <label className="text-sm font-semibold text-slate-700">{children}</label>
  </div>
);

const SmallHint = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-2 text-xs text-slate-500">{children}</p>
);

const inputBase = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700";

export default function ListingPicker({
  label,
  hint,
  placeholder,
  optionsKind,
  tenantId,
  excludeId,
  selected,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  optionsKind: 'tours' | 'pages';
  tenantId?: string;
  excludeId?: string;
  selected: PickerOption[];
  onChange: (next: PickerOption[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickerOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    const timer = window.setTimeout(async () => {
      if (!trimmed) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const params = new URLSearchParams({ kind: optionsKind, q: trimmed });
        if (tenantId) params.set('tenantId', tenantId);
        if (excludeId) params.set('excludeId', excludeId);
        const res = await fetch(`/api/admin/pages/options?${params.toString()}`);
        const json = await res.json();
        if (json.success) setResults(json.data as PickerOption[]);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, optionsKind, excludeId, tenantId]);

  const selectedIds = new Set(selected.map((item) => item.id));

  return (
    <div className="space-y-3">
      <FormLabel icon={MapPin}>{label}</FormLabel>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          className={inputBase}
          placeholder={placeholder}
        />
        {open && query.trim() && (
          <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {searching && (
              <div className="px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </div>
            )}
            {!searching && results.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500">No matches</div>
            )}
            {!searching && results.map((option) => {
              const already = selectedIds.has(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={already}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (already) return;
                    onChange([...selected, option]);
                    setQuery('');
                    setResults([]);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-indigo-50 transition-colors ${already ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {option.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={option.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-700">{option.title}</span>
                    {optionsKind === 'tours' && (
                      <span className="block truncate font-mono text-[10px] text-slate-400">
                        Tour ID: {option.id}
                      </span>
                    )}
                    {option.matchedOptionIds?.length ? (
                      <span className="block truncate font-mono text-[10px] font-semibold text-indigo-600">
                        Matched Option ID: {option.matchedOptionIds.join(', ')}
                      </span>
                    ) : null}
                  </span>
                  {option.kind && (
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">{option.kind.replace('-', ' ')}</span>
                  )}
                  {option.isPublished === false && (
                    <span className="text-[10px] uppercase tracking-wide text-amber-500">draft</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {selected.length > 0 ? (
        <div className="space-y-2">
          {selected.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              <span className="text-xs font-bold text-slate-400 w-5">{index + 1}.</span>
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-slate-200 flex-shrink-0" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-700">{item.title}</span>
                {optionsKind === 'tours' && (
                  <span className="block truncate font-mono text-[10px] text-slate-400">
                    Tour ID: {item.id}
                  </span>
                )}
              </span>
              {item.kind && (
                <span className="text-[10px] uppercase tracking-wide text-slate-400">{item.kind.replace('-', ' ')}</span>
              )}
              <button
                type="button"
                onClick={() => onChange(selected.filter((entry) => entry.id !== item.id))}
                className="text-red-400 hover:text-red-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">Nothing selected yet</p>
      )}
      <SmallHint>{hint}</SmallHint>
    </div>
  );
}
