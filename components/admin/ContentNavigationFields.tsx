'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Link2, Search, X } from 'lucide-react';
import type { ParentPageValue } from '@/lib/content/contentNavigation';

type ParentOption = ParentPageValue & { image?: string; isPublished?: boolean };

interface Props {
  breadcrumbLabel: string;
  parentPage?: ParentPageValue | null;
  onBreadcrumbLabelChange: (value: string) => void;
  onParentPageChange: (value: ParentPageValue | null) => void;
  excludeId?: string;
  tenantId?: string;
}

export default function ContentNavigationFields({
  breadcrumbLabel,
  parentPage,
  onBreadcrumbLabelChange,
  onParentPageChange,
  excludeId,
  tenantId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<ParentOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ kind: 'parents' });
        if (query.trim()) params.set('q', query.trim());
        if (excludeId) params.set('excludeId', excludeId);
        if (tenantId) params.set('tenantId', tenantId);
        const response = await fetch(`/api/admin/pages/options?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Failed to load parent pages');
        const payload = await response.json() as { data?: ParentOption[] };
        setOptions(Array.isArray(payload.data) ? payload.data : []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setOptions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [excludeId, open, query, tenantId]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700"><Link2 className="h-4 w-4" /></div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Navigation & breadcrumbs</h3>
          <p className="mt-1 text-xs text-slate-600">Optionally place this item beneath a destination or page. Leave empty for a direct URL.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="breadcrumbLabel">Breadcrumb label</label>
          <input
            id="breadcrumbLabel"
            value={breadcrumbLabel}
            onChange={(event) => onBreadcrumbLabelChange(event.target.value)}
            maxLength={120}
            placeholder="Defaults to the title"
            className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="relative space-y-2">
          <label className="text-sm font-semibold text-slate-700">Parent page</label>
          {parentPage ? (
            <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 shadow-sm">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{parentPage.label}</p>
                <p className="truncate text-xs text-slate-500">/{parentPage.slug}</p>
              </div>
              <button type="button" onClick={() => onParentPageChange(null)} aria-label="Remove parent page" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-medium text-slate-600 shadow-sm hover:border-indigo-300">
              <span>Select a destination or page</span>
              <ChevronDown className="h-4 w-4" />
            </button>
          )}

          {open && !parentPage ? (
            <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-100 p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search destinations and pages…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {loading ? <p className="p-3 text-sm text-slate-500">Loading…</p> : null}
                {!loading && options.length === 0 ? <p className="p-3 text-sm text-slate-500">No matching parent pages.</p> : null}
                {options.map((option) => (
                  <button
                    key={`${option.kind}:${option.id || option.slug}`}
                    type="button"
                    onClick={() => {
                      onParentPageChange({ id: option.id, slug: option.slug, label: option.label, kind: option.kind });
                      setOpen(false);
                      setQuery('');
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-indigo-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800">{option.label}</span>
                      <span className="block truncate text-xs text-slate-500">/{option.slug}</span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{option.kind === 'category-2' ? 'Category 2' : option.kind}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
