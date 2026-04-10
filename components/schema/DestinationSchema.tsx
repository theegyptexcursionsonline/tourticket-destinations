// Place + TouristDestination schema for destination detail pages
import React from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';

interface Tour {
  title: string;
  slug: string;
  image?: string;
  discountPrice?: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
}

interface Props {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  country?: string;
  tours?: Tour[];
}

export default function DestinationSchema({ name, slug, description, image, country, tours = [] }: Props) {
  const destUrl = `${BASE_URL}/destinations/${slug}`;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['TouristDestination', 'Place'],
        name,
        description: description || `Discover tours and excursions in ${name}, ${country || 'Egypt'}`,
        url: destUrl,
        image: image || `${BASE_URL}/og-image.jpg`,
        address: {
          '@type': 'PostalAddress',
          addressLocality: name,
          addressCountry: country || 'EG',
        },
        touristType: ['Sightseeing', 'Adventure', 'Cultural'],
        containsPlace: tours.slice(0, 10).map((t) => ({
          '@type': 'TouristAttraction',
          name: t.title,
          url: `${BASE_URL}/tour/${t.slug}`,
          image: t.image,
        })),
      },
      // tours as ItemList for Things To Do
      ...(tours.length > 0
        ? [
            {
              '@type': 'ItemList',
              name: `Tours in ${name}`,
              numberOfItems: tours.length,
              itemListElement: tours.slice(0, 20).map((t, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${BASE_URL}/tour/${t.slug}`,
                name: t.title,
                image: t.image,
              })),
            },
          ]
        : []),
      // Breadcrumb
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Destinations', item: `${BASE_URL}/destinations` },
          { '@type': 'ListItem', position: 3, name, item: destUrl },
        ],
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
