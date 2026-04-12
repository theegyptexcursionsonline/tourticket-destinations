// Organization + LocalBusiness + TravelAgency schema for homepage
import React from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';

export default function OrganizationSchema() {
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['TravelAgency', 'LocalBusiness', 'Organization'],
        '@id': `${BASE_URL}/#organization`,
        name: 'Egypt Excursions Online',
        alternateName: 'EEO',
        url: BASE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${BASE_URL}/logo.png`,
          width: 512,
          height: 512,
        },
        image: `${BASE_URL}/og-image.jpg`,
        description:
          'Egypt Excursions Online offers unforgettable tours, day trips, and excursions across Egypt including Hurghada, Cairo, Luxor, Sharm El Sheikh, and Aswan.',
        telephone: '+20-100-000-0000',
        email: 'info@egypt-excursionsonline.com',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Hurghada',
          addressLocality: 'Hurghada',
          addressRegion: 'Red Sea Governorate',
          addressCountry: 'EG',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 27.2579,
          longitude: 33.8116,
        },
        areaServed: [
          { '@type': 'Country', name: 'Egypt' },
          { '@type': 'City', name: 'Hurghada' },
          { '@type': 'City', name: 'Cairo' },
          { '@type': 'City', name: 'Luxor' },
          { '@type': 'City', name: 'Sharm El Sheikh' },
          { '@type': 'City', name: 'Aswan' },
        ],
        priceRange: '$$',
        currenciesAccepted: 'USD, EUR, GBP',
        paymentAccepted: 'Credit Card, PayPal, Cash',
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '00:00',
          closes: '23:59',
        },
        sameAs: [
          'https://www.facebook.com/egyptexcursionsonline',
          'https://www.instagram.com/egyptexcursionsonline',
          'https://www.tripadvisor.com/Attraction_Review-Egypt_Excursions_Online',
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          reviewCount: '2450',
          bestRating: '5',
          worstRating: '1',
        },
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', '.organization-description'],
        },
        makesOffer: {
          '@type': 'AggregateOffer',
          lowPrice: '15',
          highPrice: '500',
          priceCurrency: 'USD',
          offerCount: '200',
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Egypt Tours & Excursions',
          itemListElement: [
            { '@type': 'Product', name: 'Day Tours', description: 'Guided day tours across Egypt' },
            { '@type': 'Product', name: 'Multi-Day Tours', description: 'Extended tours and packages' },
            { '@type': 'Event', name: 'Nile Cruises', description: 'Cruise the Nile with expert guides' },
          ],
        },
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
