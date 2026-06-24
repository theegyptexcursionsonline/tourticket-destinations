// app/llms.txt/route.ts
// Per-tenant llms.txt (https://llmstxt.org) — a curated, LLM-friendly index of
// THIS tenant's site (resolved by request host) so AI assistants can discover
// and cite the right brand's content. Scoped to the tenant: only its
// destinations and published articles are listed, under its own domain.

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Blog from '@/lib/models/Blog';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  const h = await headers();
  const host = h.get('host') || 'egypt-excursionsonline.com';
  const proto = h.get('x-forwarded-proto') || 'https';
  const BASE = `${proto}://${host}`.replace(/\/$/, '');

  let tenantId = 'default';
  let name = 'Egypt Excursions';
  let desc =
    'Book tours and excursions across Egypt and the Red Sea — day trips, Nile cruises, diving, snorkeling and desert safaris, most with hotel pickup.';
  try {
    tenantId = await getTenantFromRequest();
    const cfg = await getTenantPublicConfig(tenantId);
    if (cfg?.name) name = cfg.name;
    if (cfg?.seo?.defaultDescription) desc = cfg.seo.defaultDescription;
  } catch {
    // fall through with defaults
  }

  const lines: string[] = [
    `# ${name}`,
    '',
    `> ${desc}`,
    '',
    '## Key pages',
    `- [Tours](${BASE}/tours): Browse and book all tours and excursions`,
    `- [Destinations](${BASE}/destinations): Destinations we cover`,
    `- [Blog](${BASE}/blog): Travel guides, tips and itineraries`,
    `- [About](${BASE}/about)`,
    `- [Contact](${BASE}/contact)`,
    '',
  ];

  try {
    await dbConnect();

    const dests = await Destination.find({ tenantId }, { name: 1, slug: 1 })
      .limit(30)
      .lean();
    if (dests.length) {
      lines.push('## Destinations');
      for (const d of dests as Array<{ name?: string; slug?: string }>) {
        if (d.slug) lines.push(`- [${d.name ?? d.slug}](${BASE}/destinations/${d.slug})`);
      }
      lines.push('');
    }

    const posts = await Blog.find(
      { tenantId, status: 'published' },
      { title: 1, slug: 1, excerpt: 1 },
    )
      .sort({ publishedAt: -1 })
      .limit(40)
      .lean();
    if (posts.length) {
      lines.push('## Recent articles');
      for (const p of posts as Array<{ title?: string; slug?: string; excerpt?: string }>) {
        if (!p.slug) continue;
        const ex = p.excerpt
          ? `: ${String(p.excerpt).replace(/\s+/g, ' ').slice(0, 140)}`
          : '';
        lines.push(`- [${p.title ?? p.slug}](${BASE}/blog/${p.slug})${ex}`);
      }
      lines.push('');
    }
  } catch {
    // Fall through with the static sections if the DB is unavailable.
  }

  lines.push('## More');
  lines.push(`- [XML sitemap](${BASE}/sitemap.xml)`);
  lines.push('');

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
