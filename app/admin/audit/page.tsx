'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import withAuth from '@/components/admin/withAuth';
import { useAdminTenant } from '@/contexts/AdminTenantContext';

interface AuditEvent {
  id: string;
  actor: { id: string; name: string; email: string; role: string };
  action: string;
  resourceType: string;
  resourceId: string;
  summary: string;
  method: string;
  tenantIds: string[];
  createdAt: string;
}

interface AuditResponse {
  success: boolean;
  data: AuditEvent[];
  pagination: { hasMore: boolean; nextCursor: string | null };
  stats: { total: number; today: number; administrators: number };
  filters: { actions: string[]; resourceTypes: string[] };
  error?: string;
}

const actionTone: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  update: 'bg-blue-50 text-blue-700 ring-blue-200',
  delete: 'bg-rose-50 text-rose-700 ring-rose-200',
  execute: 'bg-violet-50 text-violet-700 ring-violet-200',
  export: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const formatTime = (value: string) => new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

const titleCase = (value: string) => value
  .split(/[-_]/g)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

function AuditPage() {
  const { selectedTenantId } = useAdminTenant();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, administrators: 0 });
  const [availableFilters, setAvailableFilters] = useState({ actions: [] as string[], resourceTypes: [] as string[] });
  const [draftFilters, setDraftFilters] = useState({ actor: '', action: 'all', resourceType: 'all', from: '', to: '' });
  const [filters, setFilters] = useState(draftFilters);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: '25' });
    if (selectedTenantId) params.set('tenantId', selectedTenantId);
    if (cursor) params.set('cursor', cursor);
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') params.set(key, value);
    });
    return params;
  }, [cursor, filters, selectedTenantId]);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/audit?${query.toString()}`, { cache: 'no-store' });
      const payload = await response.json() as AuditResponse;
      if (!response.ok) throw new Error(payload.error || 'Unable to load audit activity.');
      setEvents(payload.data || []);
      setStats(payload.stats || { total: 0, today: 0, administrators: 0 });
      setAvailableFilters(payload.filters || { actions: [], resourceTypes: [] });
      setNextCursor(payload.pagination?.nextCursor || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load audit activity.');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    queueMicrotask(() => void loadEvents());
  }, [loadEvents]);

  const applyFilters = () => {
    setCursor(null);
    setCursorHistory([]);
    setFilters(draftFilters);
  };

  const resetFilters = () => {
    const cleared = { actor: '', action: 'all', resourceType: 'all', from: '', to: '' };
    setDraftFilters(cleared);
    setFilters(cleared);
    setCursor(null);
    setCursorHistory([]);
  };

  const exportReport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams(query);
      params.delete('cursor');
      params.delete('limit');
      params.set('format', 'csv');
      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!response.ok) throw new Error('Unable to generate the audit report.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eeo-network-admin-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Audit report downloaded');
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : 'Unable to export audit report.');
    } finally {
      setIsExporting(false);
    }
  };

  const statCards = [
    { label: 'Recorded activity', value: stats.total, icon: Activity, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Today', value: stats.today, icon: CalendarDays, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Administrators', value: stats.administrators, icon: UserRound, tone: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <main className="min-h-full bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">
              <ShieldCheck className="h-4 w-4" /> Accountability
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Audit</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review authorized admin requests for the selected brand, identify who performed them, and download a filtered report.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void loadEvents()} disabled={isLoading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button type="button" onClick={() => void exportReport()} disabled={isExporting} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
            </button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Audit summary">
          {statCards.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-950">{value.toLocaleString()}</p>
                </div>
                <span className={`rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></span>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800"><Filter className="h-4 w-4 text-violet-600" /> Filter activity</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative xl:col-span-1">
              <span className="sr-only">Administrator</span>
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input value={draftFilters.actor} onChange={(event) => setDraftFilters((current) => ({ ...current, actor: event.target.value }))} placeholder="Name or email" className="min-h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </label>
            <select aria-label="Action" value={draftFilters.action} onChange={(event) => setDraftFilters((current) => ({ ...current, action: event.target.value }))} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
              <option value="all">All actions</option>
              {availableFilters.actions.map((action) => <option key={action} value={action}>{titleCase(action)}</option>)}
            </select>
            <select aria-label="Resource" value={draftFilters.resourceType} onChange={(event) => setDraftFilters((current) => ({ ...current, resourceType: event.target.value }))} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
              <option value="all">All sections</option>
              {availableFilters.resourceTypes.map((resource) => <option key={resource} value={resource}>{titleCase(resource)}</option>)}
            </select>
            <input aria-label="From date" type="date" value={draftFilters.from} onChange={(event) => setDraftFilters((current) => ({ ...current, from: event.target.value }))} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            <input aria-label="To date" type="date" value={draftFilters.to} onChange={(event) => setDraftFilters((current) => ({ ...current, to: event.target.value }))} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={applyFilters} className="min-h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700">Apply filters</button>
            <button type="button" onClick={resetFilters} className="min-h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">Clear</button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-medium text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-violet-600" /> Loading audit activity…</div>
          ) : error ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center"><p className="font-semibold text-rose-700">{error}</p><button type="button" onClick={() => void loadEvents()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Try again</button></div>
          ) : events.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center"><ShieldCheck className="h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-800">No matching activity</p><p className="mt-1 text-sm text-slate-500">New authorized admin requests will appear here automatically.</p></div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4 font-semibold">Time</th><th className="px-5 py-4 font-semibold">Administrator</th><th className="px-5 py-4 font-semibold">Action</th><th className="px-5 py-4 font-semibold">Section</th><th className="px-5 py-4 font-semibold">Brand</th><th className="px-5 py-4 font-semibold">Reference</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((event) => (
                      <tr key={event.id} className="hover:bg-slate-50/80">
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatTime(event.createdAt)}</td>
                        <td className="px-5 py-4"><p className="font-semibold text-slate-900">{event.actor.name || event.actor.email || 'Administrator'}</p>{event.actor.name && event.actor.email ? <p className="text-xs text-slate-500">{event.actor.email}</p> : null}</td>
                        <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${actionTone[event.action] || 'bg-slate-50 text-slate-700 ring-slate-200'}`}>{titleCase(event.action)}</span></td>
                        <td className="px-5 py-4 font-medium text-slate-700">{titleCase(event.resourceType)}</td>
                        <td className="max-w-48 px-5 py-4 text-xs text-slate-600">{event.tenantIds.length ? event.tenantIds.join(', ') : 'All brands'}</td>
                        <td className="max-w-48 truncate px-5 py-4 font-mono text-xs text-slate-500" title={event.resourceId}>{event.resourceId || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-slate-100 md:hidden">
                {events.map((event) => (
                  <article key={event.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{event.actor.name || event.actor.email || 'Administrator'}</p><p className="mt-0.5 text-xs text-slate-500">{formatTime(event.createdAt)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${actionTone[event.action] || 'bg-slate-50 text-slate-700 ring-slate-200'}`}>{titleCase(event.action)}</span></div>
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="font-medium text-slate-700">{titleCase(event.resourceType)}</span><span className="max-w-40 truncate font-mono text-xs text-slate-500">{event.resourceId || '—'}</span></div>
                    <p className="text-xs font-medium text-slate-500">Brand: {event.tenantIds.length ? event.tenantIds.join(', ') : 'All brands'}</p>
                  </article>
                ))}
              </div>
            </>
          )}
          <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-4 py-3">
            <button type="button" disabled={cursorHistory.length === 0 || isLoading} onClick={() => { const history = [...cursorHistory]; const previous = history.pop() ?? null; setCursorHistory(history); setCursor(previous); }} className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button>
            <span className="text-xs font-medium text-slate-500">{events.length} records on this page</span>
            <button type="button" disabled={!nextCursor || isLoading} onClick={() => { setCursorHistory((history) => [...history, cursor]); setCursor(nextCursor); }} className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
          </footer>
        </section>
      </div>
    </main>
  );
}

export default withAuth(AuditPage, { permissions: ['manageAudit'] });
