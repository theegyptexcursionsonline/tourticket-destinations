// WebSite + WebPage + SiteNavigationElement + BreadcrumbList schema
import React from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';

interface Props {
  pageName?: string;
  pageDescription?: string;
  pageUrl?: string;
  breadcrumbs?: { name: string; url: string }[];
}

export default function WebSiteSchema({
  pageName = 'Egypt Excursions Online - Tours & Day Trips in Egypt',
  pageDescription = 'Book the best tours, day trips, and excursions across Egypt. Explore Hurghada, Cairo, Luxor, Sharm El Sheikh and more.',
  pageUrl = BASE_URL,
  breadcrumbs,
}: Props) {
  const breadcrumbItems = breadcrumbs || [{ name: 'Home', url: BASE_URL }];

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: BASE_URL,
        name: 'Egypt Excursions Online',
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
        '@id': `${pageUrl}/#webpage`,
        url: pageUrl,
        name: pageName,
        description: pageDescription,
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}
