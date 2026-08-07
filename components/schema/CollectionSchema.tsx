// CollectionPage + BreadcrumbList schema for listing pages (destinations, categories, interests, blog)
import React from 'react';
import { headers } from 'next/headers';
import { serializeJsonLd } from '@/lib/security/serializeJsonLd';

// One build serves every white-label brand, so a build-time base URL is always
// the wrong brand for someone. Left as an env constant, these listing pages
// published structured data pointing at the shared Netlify host — a customer
// site telling search engines it lives somewhere else, and leaking the internal
// deployment name onto a branded surface. Resolve the origin per request
// instead; the env value stays only as a build/test fallback.
const FALLBACK_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';

async function requestBaseUrl(): Promise<string> {
  try {
    const headerList = await headers();
    const host = headerList.get('x-tenant-domain') || headerList.get('host');
    if (!host) return FALLBACK_BASE_URL;
    const forwardedProto = headerList.get('x-forwarded-proto');
    const protocol = forwardedProto || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return `${protocol}://${host}`;
  } catch {
    return FALLBACK_BASE_URL;
  }
}

interface ListItem {
  name: string;
  url: string;
  image?: string;
}

interface Props {
  name: string;
  description?: string;
  url: string;
  items?: ListItem[];
  breadcrumbs?: { name: string; url: string }[];
}

export default async function CollectionSchema({ name, description, url, items = [], breadcrumbs }: Props) {
  const BASE_URL = await requestBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const crumbs = breadcrumbs || [
    { name: 'Home', url: BASE_URL },
    { name, url: fullUrl },
  ];

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name,
        // Naming one brand here put that brand's name on every other brand's
        // pages. The collection name alone is brand-neutral and true anywhere.
        description: description || `Browse ${name}`,
        url: fullUrl,
        isPartOf: { '@id': `${BASE_URL}/#website` },
        about: { '@id': `${BASE_URL}/#organization` },
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', '.collection-description'],
        },
      },
      ...(items.length > 0
        ? [
            {
              '@type': 'ItemList',
              name,
              numberOfItems: items.length,
              itemListElement: items.slice(0, 30).map((item, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: item.name,
                url: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
                ...(item.image ? { image: item.image } : {}),
              })),
            },
          ]
        : []),
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          item: c.url.startsWith('http') ? c.url : `${BASE_URL}${c.url}`,
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }}
    />
  );
}
