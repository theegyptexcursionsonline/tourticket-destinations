// CollectionPage + BreadcrumbList schema for listing pages (destinations, categories, interests, blog)
import React from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';

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

export default function CollectionSchema({ name, description, url, items = [], breadcrumbs }: Props) {
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
        description: description || `Browse ${name} on Egypt Excursions Online`,
        url: fullUrl,
        isPartOf: { '@id': `${BASE_URL}/#website` },
        about: { '@id': `${BASE_URL}/#organization` },
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}
