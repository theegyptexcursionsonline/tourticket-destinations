'use client';

import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { BreadcrumbItem } from '@/lib/content/breadcrumbs';

export default function ContentBreadcrumbs({
  items,
  tone = 'light',
}: {
  items: BreadcrumbItem[];
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1.5 text-sm ${dark ? 'text-white/80' : 'text-slate-600'}`}>
      {items.map((item, index) => {
        const current = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex min-w-0 items-center gap-1.5">
            {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-55" aria-hidden="true" /> : null}
            {item.href && !current ? (
              <Link href={item.href} className={`truncate font-medium underline-offset-4 hover:underline ${dark ? 'hover:text-white' : 'hover:text-slate-950'}`}>
                {item.label}
              </Link>
            ) : (
              <span aria-current={current ? 'page' : undefined} className={`truncate ${current ? (dark ? 'font-semibold text-white' : 'font-semibold text-slate-900') : ''}`}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
