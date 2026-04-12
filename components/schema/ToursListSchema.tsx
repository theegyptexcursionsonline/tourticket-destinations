// ItemList schema for tour listing pages — Google Things To Do
import React from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';

interface TourItem {
  title: string;
  slug: string;
  image?: string;
  discountPrice?: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  duration?: string;
}

interface Props {
  tours: TourItem[];
  listName?: string;
  listDescription?: string;
}

export default function ToursListSchema({
  tours,
  listName = 'Popular Tours & Excursions in Egypt',
  listDescription = 'Browse the best-rated tours, day trips, and activities across Egypt',
}: Props) {
  if (!tours || tours.length === 0) return null;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    description: listDescription,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.tours-list-description'],
    },
    numberOfItems: tours.length,
    itemListElement: tours.map((tour, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/tour/${tour.slug}`,
      name: tour.title,
      image: tour.image,
      item: {
        '@type': 'TouristTrip',
        name: tour.title,
        url: `${BASE_URL}/tour/${tour.slug}`,
        image: tour.image,
        description: tour.title,
        offers: {
          '@type': 'Offer',
          price: (tour.discountPrice || tour.originalPrice || 0).toString(),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        ...(tour.rating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: tour.rating.toString(),
                reviewCount: (tour.reviewCount || 1).toString(),
                bestRating: '5',
              },
            }
          : {}),
        provider: { '@id': `${BASE_URL}/#organization` },
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}
