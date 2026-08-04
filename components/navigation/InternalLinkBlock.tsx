'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import type { LocalizedInternalLinkBlock } from '@/lib/navigation/internalLinks';

const cache = new Map<string, LocalizedInternalLinkBlock | null>();

export default function InternalLinkBlock() {
  const locale = useLocale();
  const [block, setBlock] = useState<LocalizedInternalLinkBlock | null>(() => cache.get(locale) || null);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const cached = cache.get(locale);
    if (cached !== undefined) {
      queueMicrotask(() => setBlock(cached));
      return undefined;
    }
    const controller = new AbortController();
    fetch(`/api/navigation/internal-links?locale=${encodeURIComponent(locale)}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ data?: LocalizedInternalLinkBlock }> : null)
      .then((payload) => {
        if (controller.signal.aborted) return;
        const next = payload?.data?.enabled && payload.data.groups.length > 0 ? payload.data : null;
        cache.set(locale, next);
        setBlock(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) cache.set(locale, null);
      });
    return () => controller.abort();
  }, [locale]);

  const activeGroup = useMemo(() => {
    if (!block) return null;
    return block.groups.find((group) => group.id === activeId) || block.groups[0] || null;
  }, [activeId, block]);

  if (!block || !activeGroup) return null;

  return (
    <section aria-labelledby="internal-links-heading" className="border-y border-slate-200 bg-slate-50/80">
      <div className="container mx-auto px-4 py-8 sm:py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Discover more</p>
            <h2 id="internal-links-heading" className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {block.heading || 'Explore Egypt'}
            </h2>
          </div>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div role="tablist" aria-label="Explore links" className="flex min-w-max gap-2">
            {block.groups.map((group) => (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={activeGroup.id === group.id}
                onClick={() => setActiveId(group.id)}
                className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${
                  activeGroup.id === group.id
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:text-slate-950'
                }`}
              >
                {group.title}
              </button>
            ))}
          </div>
        </div>

        <div role="tabpanel" className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeGroup.links.map((link, index) => (
            <Link
              key={link.id}
              href={link.href}
              className="group flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:text-red-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-100 px-1.5 text-xs font-bold tabular-nums text-slate-500 group-hover:bg-red-50 group-hover:text-red-700">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 leading-snug">{link.label}</span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-red-600" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
