// WebSite + WebPage + SiteNavigationElement + BreadcrumbList schema
import React from 'react';
import { requestBaseUrl } from '@/lib/seo/requestBaseUrl';
import { getTenantConfigCached, getTenantFromRequest } from '@/lib/tenant';
import { serializeJsonLd } from '@/lib/security/serializeJsonLd';


interface Props {
  pageName?: string;
  pageDescription?: string;
  pageUrl?: string;
  breadcrumbs?: { name: string; url: string }[];
}

export default async function WebSiteSchema({
  pageName,
  pageDescription,
  pageUrl,
  breadcrumbs,
}: Props) {
  const BASE_URL = await requestBaseUrl();
  // The site described here belongs to the brand the visitor is on. Hardcoded,
  // every white-label WebSite/WebPage node carried the flagship's name — the
  // page titles and OG tags were already tenant-aware, so only the structured
  // data still misnamed the site.
  const tenant = await getTenantConfigCached(await getTenantFromRequest()).catch(() => null);
  const brandName = tenant?.name || 'Egypt Excursions Online';
  const resolvedPageName = pageName || `${brandName} - Tours & Day Trips in Egypt`;
  const resolvedPageDescription = pageDescription
    || `Book tours, day trips and excursions across Egypt with ${brandName}.`;
  // Defaults to this brand's own origin, resolved per request.
  const resolvedPageUrl = pageUrl || BASE_URL;
  const breadcrumbItems = breadcrumbs || [{ name: 'Home', url: BASE_URL }];

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: BASE_URL,
        name: brandName,
        description: 'Tours, day trips, and excursions across Egypt',
        publisher: { '@id': `${BASE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}/tours?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
        inLanguage: ['en', 'ar', 'de', 'it', 'es', 'fr', 'ru', 'pl', 'nl'],
      },
      {
        '@type': 'WebPage',
        '@id': `${resolvedPageUrl}/#webpage`,
        url: resolvedPageUrl,
        name: resolvedPageName,
        description: resolvedPageDescription,
        isPartOf: { '@id': `${BASE_URL}/#website` },
        about: { '@id': `${BASE_URL}/#organization` },
        inLanguage: 'en',
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', 'h2', '.tour-description', '.about-section', 'article'],
        },
      },
      {
        '@type': 'SiteNavigationElement',
        name: 'Main Navigation',
        url: BASE_URL,
        hasPart: [
          { '@type': 'SiteNavigationElement', name: 'Tours', url: `${BASE_URL}/tours` },
          { '@type': 'SiteNavigationElement', name: 'Destinations', url: `${BASE_URL}/destinations` },
          { '@type': 'SiteNavigationElement', name: 'Day Trips', url: `${BASE_URL}/day-trips` },
          { '@type': 'SiteNavigationElement', name: 'Contact', url: `${BASE_URL}/contact` },
        ],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
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
