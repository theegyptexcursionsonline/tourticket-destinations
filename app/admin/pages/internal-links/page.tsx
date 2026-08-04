'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowDown, ArrowUp, Eye, EyeOff, Link2, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import {
  INTERNAL_LINK_LOCALES,
  type InternalLinkBlockValue,
  type InternalLinkGroup,
  type InternalLinkLocale,
} from '@/lib/navigation/internalLinks';
import { useAdminTenant } from '@/contexts/AdminTenantContext';

const LOCALE_LABELS: Record<InternalLinkLocale, string> = {
  en: 'English', ar: 'Arabic', de: 'German', fr: 'French', es: 'Spanish', ru: 'Russian',
};

const EMPTY: InternalLinkBlockValue = { enabled: true, heading: { en: 'Explore Egypt' }, groups: [] };
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export default function InternalLinksAdminPage() {
  const { selectedTenantId, getSelectedTenant } = useAdminTenant();
  const selectedTenant = getSelectedTenant();
  const [value, setValue] = useState<InternalLinkBlockValue>(EMPTY);
  const [locale, setLocale] = useState<InternalLinkLocale>('en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedTenantId || selectedTenantId === 'all') {
      queueMicrotask(() => {
        setValue(EMPTY);
        setLoading(false);
      });
      return;
    }
    setLoading(true);
    fetch(`/api/admin/internal-link-block?tenantId=${encodeURIComponent(selectedTenantId)}`)
      .then(async (response) => {
        const payload = await response.json() as { success?: boolean; data?: InternalLinkBlockValue; error?: string };
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to load internal links');
        setValue(payload.data || EMPTY);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load internal links'))
      .finally(() => setLoading(false));
  }, [selectedTenantId]);

  const previewGroup = useMemo(() => value.groups.find((group) => group.enabled) || value.groups[0], [value.groups]);

  const updateGroup = (groupId: string, updater: (group: InternalLinkGroup) => InternalLinkGroup) => {
    setValue((current) => ({ ...current, groups: current.groups.map((group) => group.id === groupId ? updater(group) : group) }));
  };

  const moveGroup = (index: number, direction: -1 | 1) => {
    setValue((current) => {
      const next = [...current.groups];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, groups: next };
    });
  };

  const save = async () => {
    if (!selectedTenantId || selectedTenantId === 'all') {
      toast.error('Select one brand before saving internal links');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/internal-link-block?tenantId=${encodeURIComponent(selectedTenantId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...value, tenantId: selectedTenantId }),
      });
      const payload = await response.json() as { success?: boolean; data?: InternalLinkBlockValue; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to save internal links');
      setValue(payload.data || value);
      toast.success('Internal links updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save internal links');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div>;
  }

  if (!selectedTenantId || selectedTenantId === 'all') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Link2 className="mx-auto h-8 w-8 text-amber-700" />
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Select a brand first</h1>
          <p className="mt-2 text-sm text-slate-600">Each storefront has its own internal-link block. Choose one brand in the header to edit its links safely.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin/pages" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" /> Back to Pages
          </Link>
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-indigo-100 p-3 text-indigo-700"><Link2 className="h-6 w-6" /></span>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Internal links block</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">A reusable, translated discovery block shown before the footer on every public page for <strong>{selectedTenant?.name || selectedTenantId}</strong>.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setValue((current) => ({ ...current, enabled: !current.enabled }))} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${value.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-700'}`}>
            {value.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {value.enabled ? 'Visible on storefront' : 'Hidden on storefront'}
          </button>
          <button type="button" onClick={save} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </button>
        </div>
      </div>

      <div className="mb-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Editing language">
          {INTERNAL_LINK_LOCALES.map((language) => (
            <button key={language} type="button" onClick={() => setLocale(language)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${locale === language ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {LOCALE_LABELS[language]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="text-sm font-bold text-slate-800" htmlFor="internal-link-heading">Section heading ({LOCALE_LABELS[locale]})</label>
            <input id="internal-link-heading" value={value.heading[locale] || ''} onChange={(event) => setValue((current) => ({ ...current, heading: { ...current.heading, [locale]: event.target.value } }))} placeholder={locale === 'en' ? 'Explore Egypt' : value.heading.en || 'Translation'} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            {locale !== 'en' ? <p className="mt-2 text-xs text-slate-500">Empty translations fall back to English.</p> : null}
          </section>

          {value.groups.map((group, groupIndex) => (
            <section key={group.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">{groupIndex + 1}</span>
                <input value={group.title[locale] || ''} onChange={(event) => updateGroup(group.id, (current) => ({ ...current, title: { ...current.title, [locale]: event.target.value } }))} placeholder={locale === 'en' ? 'Group title' : group.title.en || 'Translation'} className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Move group up" onClick={() => moveGroup(groupIndex, -1)} disabled={groupIndex === 0} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label="Move group down" onClick={() => moveGroup(groupIndex, 1)} disabled={groupIndex === value.groups.length - 1} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" aria-label={group.enabled ? 'Hide group' : 'Show group'} onClick={() => updateGroup(group.id, (current) => ({ ...current, enabled: !current.enabled }))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">{group.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                  <button type="button" aria-label="Delete group" onClick={() => setValue((current) => ({ ...current, groups: current.groups.filter((entry) => entry.id !== group.id) }))} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {group.links.map((link) => (
                  <div key={link.id} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(190px,.75fr)_auto] sm:items-center">
                    <input value={link.label[locale] || ''} onChange={(event) => updateGroup(group.id, (current) => ({ ...current, links: current.links.map((entry) => entry.id === link.id ? { ...entry, label: { ...entry.label, [locale]: event.target.value } } : entry) }))} placeholder={locale === 'en' ? 'Link label' : link.label.en || 'Translation'} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500" />
                    <input value={link.href} onChange={(event) => updateGroup(group.id, (current) => ({ ...current, links: current.links.map((entry) => entry.id === link.id ? { ...entry, href: event.target.value } : entry) }))} placeholder="/destination/cairo" className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs outline-none focus:border-indigo-500" />
                    <div className="flex justify-end gap-1">
                      <button type="button" aria-label={link.enabled ? 'Hide link' : 'Show link'} onClick={() => updateGroup(group.id, (current) => ({ ...current, links: current.links.map((entry) => entry.id === link.id ? { ...entry, enabled: !entry.enabled } : entry) }))} className="rounded-lg p-2 text-slate-500 hover:bg-white">{link.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                      <button type="button" aria-label="Delete link" onClick={() => updateGroup(group.id, (current) => ({ ...current, links: current.links.filter((entry) => entry.id !== link.id) }))} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => updateGroup(group.id, (current) => ({ ...current, links: [...current.links, { id: id(`${group.id}-link`), label: { en: '' }, href: '/', enabled: true }] }))} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-dashed border-indigo-300 px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                <Plus className="h-4 w-4" /> Add link
              </button>
            </section>
          ))}

          <button type="button" disabled={value.groups.length >= 8} onClick={() => setValue((current) => ({ ...current, groups: [...current.groups, { id: id('group'), title: { en: '' }, enabled: true, links: [] }] }))} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 px-4 text-sm font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add link group
          </button>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Live preview</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">{value.heading[locale] || value.heading.en || 'Explore Egypt'}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {value.groups.map((group) => <span key={group.id} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">{group.title[locale] || group.title.en || 'Untitled'}</span>)}
            </div>
            {previewGroup ? (
              <div className="mt-4 space-y-2">
                {previewGroup.links.slice(0, 8).map((link, index) => (
                  <div key={link.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-800">
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">{index + 1}</span>
                    <span>{link.label[locale] || link.label.en || 'Untitled link'}</span>
                  </div>
                ))}
              </div>
            ) : <p className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-500">Add a group and links to preview the block.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
