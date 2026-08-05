'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import withAuth from '@/components/admin/withAuth';
import { useAdminTenant } from '@/contexts/AdminTenantContext';

interface AuditChange {
  field: string;
  before?: string | number | boolean | string[];
  after?: string | number | boolean | string[];
}

interface AuditEvent {
  id: string;
  actor: { id: string; name: string; email: string; role: string };
  action: string;
  outcome: 'succeeded' | 'rejected' | 'failed' | 'recorded';
  statusCode: number | null;
  resourceType: string;
  resourceId: string;
  resourceLabel: string;
  summary: string;
  changedFields: string[];
  changes: AuditChange[];
  failureCode: string;
  method: string;
  path: string;
  tenantIds: string[];
  requestId: string;
  clientIp: string;
  userAgent: string;
  createdAt: string;
}

interface AuditResponse {
  success: boolean;
  data: AuditEvent[];
  pagination: { hasMore: boolean; nextCursor: string | null };
  stats: {
    total: number;
    today: number;
    administrators: number;
    succeeded: number;
    rejected: number;
    failed: number;
  };
  filters: { actions: string[]; resourceTypes: string[]; outcomes: string[] };
  error?: string;
}

const actionTone: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  update: 'bg-blue-50 text-blue-700 ring-blue-200',
  delete: 'bg-rose-50 text-rose-700 ring-rose-200',
  execute: 'bg-violet-50 text-violet-700 ring-violet-200',
  export: 'bg-amber-50 text-amber-700 ring-amber-200',
  login: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
};

const outcomeTone: Record<string, string> = {
  succeeded: 'bg-emerald-50 text-emerald-800 ring-emerald-300',
  rejected: 'bg-amber-50 text-amber-900 ring-amber-300',
  failed: 'bg-rose-50 text-rose-800 ring-rose-300',
  recorded: 'bg-slate-100 text-slate-700 ring-slate-300',
};

const indicatorTone: Record<string, string> = {
  succeeded: 'border-l-emerald-500',
  rejected: 'border-l-amber-500',
  failed: 'border-l-rose-600',
  recorded: 'border-l-slate-300',
};

const formatCairoTime = (value: string) => new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Africa/Cairo',
}).format(new Date(value));

const formatUtcTime = (value: string) => `${new Date(value).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}`;

const titleCase = (value: string) => value
  .split(/[-_]/g)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const displayValue = (value: AuditChange['after']) => {
  if (Array.isArray(value)) return value.join(', ');
  if (value === undefined) return 'Not captured';
  return String(value);
};

function OutcomeBadge({ outcome }: { outcome: AuditEvent['outcome'] }) {
  const Icon = outcome === 'succeeded' ? CheckCircle2 : outcome === 'recorded' ? Activity : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${outcomeTone[outcome] || outcomeTone.recorded}`}>
      <Icon className="h-3.5 w-3.5" /> {titleCase(outcome)}
    </span>
  );
}

function EventDetails({ event, onClose }: { event: AuditEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="audit-event-title">
      <button type="button" aria-label="Close audit event details" onClick={onClose} className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" />
      <aside className="relative h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        <header className={`sticky top-0 z-10 border-b border-slate-200 border-l-4 bg-white px-5 py-5 sm:px-7 ${indicatorTone[event.outcome] || indicatorTone.recorded}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <OutcomeBadge outcome={event.outcome} />
              <h2 id="audit-event-title" className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{event.summary}</h2>
              <p className="mt-1 text-sm text-slate-500">Immutable event details and safe request context</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Close details"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="space-y-6 p-5 sm:p-7">
          {(event.outcome === 'failed' || event.outcome === 'rejected') ? (
            <section className={`rounded-2xl border p-4 ${event.outcome === 'failed' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`mt-0.5 h-5 w-5 ${event.outcome === 'failed' ? 'text-rose-700' : 'text-amber-700'}`} />
                <div>
                  <p className="font-bold text-slate-950">Action did not complete successfully</p>
                  <p className="mt-1 text-sm text-slate-700">HTTP {event.statusCode || 'error'}{event.failureCode ? ` · ${event.failureCode}` : ''}</p>
                </div>
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Who and when</h3>
            <dl className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold text-slate-500">Administrator</dt><dd className="mt-1 font-semibold text-slate-950">{event.actor.name || event.actor.email || 'Administrator'}</dd>{event.actor.name && event.actor.email ? <dd className="text-xs text-slate-500">{event.actor.email}</dd> : null}</div>
              <div><dt className="text-xs font-semibold text-slate-500">Role</dt><dd className="mt-1 text-sm font-medium text-slate-800">{titleCase(event.actor.role || 'unknown')}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">Cairo time</dt><dd className="mt-1 text-sm font-medium text-slate-800">{formatCairoTime(event.createdAt)}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">UTC time</dt><dd className="mt-1 break-all font-mono text-xs text-slate-700">{formatUtcTime(event.createdAt)}</dd></div>
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Action and target</h3>
            <dl className="mt-3 grid gap-x-5 gap-y-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold text-slate-500">Action</dt><dd className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${actionTone[event.action] || 'bg-slate-50 text-slate-700 ring-slate-200'}`}>{titleCase(event.action)}</span></dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">Section</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{titleCase(event.resourceType)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-500">Affected page or target</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{event.resourceLabel || 'Label not available'}</dd>{event.resourceId ? <dd className="mt-1 break-all font-mono text-xs text-slate-500">{event.resourceId}</dd> : null}</div>
              <div><dt className="text-xs font-semibold text-slate-500">Brand scope</dt><dd className="mt-1 text-sm text-slate-800">{event.tenantIds.join(', ') || 'Not recorded'}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-500">Result</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{event.statusCode ? `HTTP ${event.statusCode}` : 'Legacy record'}</dd></div>
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Changed fields</h3>
            {event.changedFields.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {event.changedFields.map((field) => <span key={field} className="rounded-lg bg-violet-50 px-2.5 py-1.5 font-mono text-xs text-violet-800 ring-1 ring-violet-100">{field}</span>)}
              </div>
            ) : <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No JSON field list was available for this action.</p>}
          </section>

          <section>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Safe recorded values</h3>
              <p className="mt-1 text-xs text-slate-500">Sensitive and customer fields are excluded. Previous values appear only when a route explicitly supplies them.</p>
            </div>
            {event.changes.length ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Field</th><th className="px-4 py-3">Before</th><th className="px-4 py-3">After</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{event.changes.map((change, index) => <tr key={`${change.field}-${index}`}><td className="px-4 py-3 font-mono text-xs text-slate-700">{change.field}</td><td className="px-4 py-3 text-slate-500">{displayValue(change.before)}</td><td className="px-4 py-3 font-medium text-slate-900">{displayValue(change.after)}</td></tr>)}</tbody>
                </table>
              </div>
            ) : <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No safe scalar values were retained for this event.</p>}
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Request provenance</h3>
            <dl className="mt-3 space-y-3 rounded-2xl bg-slate-950 p-4 text-slate-100">
              <div><dt className="text-xs font-semibold text-slate-400">Route</dt><dd className="mt-1 break-all font-mono text-xs">{event.method || '—'} {event.path || '—'}</dd></div>
              <div className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs font-semibold text-slate-400">Request ID</dt><dd className="mt-1 break-all font-mono text-xs">{event.requestId || 'Not provided'}</dd></div><div><dt className="text-xs font-semibold text-slate-400">IP address</dt><dd className="mt-1 font-mono text-xs">{event.clientIp || 'Not provided'}</dd></div></div>
              <div><dt className="text-xs font-semibold text-slate-400">Device / user agent</dt><dd className="mt-1 break-words font-mono text-xs leading-5">{event.userAgent || 'Not provided'}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-400">Event ID</dt><dd className="mt-1 break-all font-mono text-xs">{event.id}</dd></div>
            </dl>
          </section>
        </div>
      </aside>
    </div>
  );
}

function AuditPage() {
  const { selectedTenantId } = useAdminTenant();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, administrators: 0, succeeded: 0, rejected: 0, failed: 0 });
  const [availableFilters, setAvailableFilters] = useState({ actions: [] as string[], resourceTypes: [] as string[], outcomes: [] as string[] });
  const emptyFilters = { actor: '', outcome: 'all', action: 'all', resourceType: 'all', from: '', to: '' };
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
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
      setStats(payload.stats || { total: 0, today: 0, administrators: 0, succeeded: 0, rejected: 0, failed: 0 });
      setAvailableFilters(payload.filters || { actions: [], resourceTypes: [], outcomes: [] });
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
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
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
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || 'Unable to generate the audit report.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eeo-network-admin-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Detailed audit report downloaded');
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : 'Unable to export audit report.');
    } finally {
      setIsExporting(false);
    }
  };

  const statCards = [
    { label: 'Recorded activity', value: stats.total, icon: Activity, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Today', value: stats.today, icon: CalendarDays, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Succeeded', value: stats.succeeded, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Needs attention', value: stats.rejected + stats.failed, icon: AlertTriangle, tone: 'bg-rose-50 text-rose-700' },
  ];

  return (
    <main className="min-h-full bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-violet-600"><ShieldCheck className="h-4 w-4" /> Accountability</div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Audit</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">See what actually succeeded, what was rejected, and what failed—plus the administrator, target, safe field changes, brand scope, and request evidence.</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500"><UserRound className="h-3.5 w-3.5" /> {stats.administrators.toLocaleString()} administrators in the current result</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void loadEvents()} disabled={isLoading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh</button>
            <button type="button" onClick={() => void exportReport()} disabled={isExporting} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50">{isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV</button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Audit summary">
          {statCards.map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold text-slate-950">{value.toLocaleString()}</p></div><span className={`rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></span></div></div>)}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800"><Filter className="h-4 w-4 text-violet-600" /> Filter activity</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="relative"><span className="sr-only">Administrator</span><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={draftFilters.actor} onChange={(event) => setDraftFilters((current) => ({ ...current, actor: event.target.value }))} placeholder="Name or email" className="min-h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label>
            <select aria-label="Outcome" value={draftFilters.outcome} onChange={(event) => setDraftFilters((current) => ({ ...current, outcome: event.target.value }))} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"><option value="all">All outcomes</option>{availableFilters.outcomes.map((outcome) => <option key={outcome} value={outcome}>{titleCase(outcome)}</option>)}</select>
            <select aria-label="Action" value={draftFilters.action} onChange={(event) => setDraftFilters((current) => ({ ...current, action: event.target.value }))} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"><option value="all">All actions</option>{availableFilters.actions.map((action) => <option key={action} value={action}>{titleCase(action)}</option>)}</select>
            <select aria-label="Resource" value={draftFilters.resourceType} onChange={(event) => setDraftFilters((current) => ({ ...current, resourceType: event.target.value }))} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"><option value="all">All sections</option>{availableFilters.resourceTypes.map((resource) => <option key={resource} value={resource}>{titleCase(resource)}</option>)}</select>
            <input aria-label="From date" type="date" value={draftFilters.from} onChange={(event) => setDraftFilters((current) => ({ ...current, from: event.target.value }))} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            <input aria-label="To date" type="date" value={draftFilters.to} onChange={(event) => setDraftFilters((current) => ({ ...current, to: event.target.value }))} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={applyFilters} className="min-h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700">Apply filters</button><button type="button" onClick={resetFilters} className="min-h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">Clear</button></div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-medium text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-violet-600" /> Loading audit activity…</div>
            : error ? <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center"><p className="font-semibold text-rose-700">{error}</p><button type="button" onClick={() => void loadEvents()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Try again</button></div>
              : events.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center"><ShieldCheck className="h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-800">No matching activity</p><p className="mt-1 text-sm text-slate-500">New completed, rejected, and failed admin actions will appear here.</p></div>
                : <>
                  <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4 font-semibold">Time (Cairo)</th><th className="px-5 py-4 font-semibold">Administrator</th><th className="px-5 py-4 font-semibold">Outcome</th><th className="px-5 py-4 font-semibold">Action</th><th className="px-5 py-4 font-semibold">Page / target</th><th className="px-5 py-4 font-semibold">Summary</th><th className="px-5 py-4 font-semibold"><span className="sr-only">Details</span></th></tr></thead><tbody className="divide-y divide-slate-100">{events.map((event) => <tr key={event.id} className={`${event.outcome === 'failed' ? 'bg-rose-50/40 hover:bg-rose-50/70' : event.outcome === 'rejected' ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/80'}`}><td className={`whitespace-nowrap border-l-4 px-5 py-4 text-slate-600 ${indicatorTone[event.outcome] || indicatorTone.recorded}`}>{formatCairoTime(event.createdAt)}</td><td className="px-5 py-4"><p className="font-semibold text-slate-900">{event.actor.name || event.actor.email || 'Administrator'}</p>{event.actor.name && event.actor.email ? <p className="text-xs text-slate-500">{event.actor.email}</p> : null}</td><td className="px-5 py-4"><OutcomeBadge outcome={event.outcome} /></td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${actionTone[event.action] || 'bg-slate-50 text-slate-700 ring-slate-200'}`}>{titleCase(event.action)}</span></td><td className="max-w-52 px-5 py-4"><p className="truncate font-medium text-slate-800" title={event.resourceLabel}>{event.resourceLabel || titleCase(event.resourceType)}</p><p className="max-w-44 truncate font-mono text-xs text-slate-400" title={event.resourceId}>{event.resourceId || '—'}</p></td><td className="max-w-72 px-5 py-4 text-slate-700"><p className="line-clamp-2">{event.summary}</p>{event.changedFields.length ? <p className="mt-1 text-xs text-slate-400">{event.changedFields.length} field{event.changedFields.length === 1 ? '' : 's'} recorded</p> : null}</td><td className="px-5 py-4"><button type="button" onClick={() => setSelectedEvent(event)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800"><Eye className="h-3.5 w-3.5" /> Details</button></td></tr>)}</tbody></table></div>
                  <div className="divide-y divide-slate-100 md:hidden">{events.map((event) => <article key={event.id} className={`space-y-3 border-l-4 p-4 ${indicatorTone[event.outcome] || indicatorTone.recorded} ${event.outcome === 'failed' ? 'bg-rose-50/50' : event.outcome === 'rejected' ? 'bg-amber-50/40' : ''}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{event.actor.name || event.actor.email || 'Administrator'}</p><p className="mt-0.5 text-xs text-slate-500">{formatCairoTime(event.createdAt)} Cairo</p></div><OutcomeBadge outcome={event.outcome} /></div><div className="rounded-xl bg-white/80 px-3 py-3 ring-1 ring-slate-200"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-800">{event.resourceLabel || titleCase(event.resourceType)}</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${actionTone[event.action] || 'bg-slate-50 text-slate-700 ring-slate-200'}`}>{titleCase(event.action)}</span></div><p className="mt-1 text-sm text-slate-600">{event.summary}</p></div><button type="button" onClick={() => setSelectedEvent(event)} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"><Eye className="h-4 w-4" /> View full event</button></article>)}</div>
                </>}
          <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-4 py-3"><button type="button" disabled={cursorHistory.length === 0 || isLoading} onClick={() => { const history = [...cursorHistory]; const previous = history.pop() ?? null; setCursorHistory(history); setCursor(previous); }} className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button><span className="text-xs font-medium text-slate-500">{events.length} records on this page</span><button type="button" disabled={!nextCursor || isLoading} onClick={() => { setCursorHistory((history) => [...history, cursor]); setCursor(nextCursor); }} className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button></footer>
        </section>
      </div>
      {selectedEvent ? <EventDetails event={selectedEvent} onClose={() => setSelectedEvent(null)} /> : null}
    </main>
  );
}

export default withAuth(AuditPage, { permissions: ['manageAudit'] });
