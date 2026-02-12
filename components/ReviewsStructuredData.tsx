// components/ReviewsStructuredData.tsx
// Server component — outputs JSON-LD in initial HTML for best SEO
import React from 'react';

const reviewsData = [
  {
    name: 'Aisha',
    country: 'Egypt',
    review: 'Amazing Nile sunset cruise—the guide was exceptional and the dinner unforgettable.',
    rating: 5,
    datePublished: '2024-11-12',
    image: '/images/reviews/aisha.jpg'
  },
  {
    name: 'Luca',
    country: 'Italy',
    review: 'Private pyramid tour at sunrise was once-in-a-lifetime. Highly recommended.',
    rating: 5,
    datePublished: '2024-10-02',
    image: '/images/reviews/luca.jpg'
  },
  {
    name: 'Maya',
    country: 'UK',
    review: 'Seamless booking and the felucca ride on the Nile was so peaceful and beautiful.',
    rating: 5,
    datePublished: '2024-09-15',
    image: '/images/reviews/maya.jpg'
  },
  {
    name: 'Omar',
    country: 'UAE',
    review: 'Great arrangement, professional guide and excellent hospitality.',
    rating: 4,
    datePublished: '2024-08-20',
    image: '/images/reviews/omar.jpg'
  }
];

export default function ReviewsStructuredData() {
  const sum = reviewsData.reduce((s, r) => s + r.rating, 0);
  const avg = +(sum / reviewsData.length).toFixed(1);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction', // choose a matching type for your business
    name: 'Egypt Excursions Online',
    image: reviewsData.map((r) => `https://your-domain.com${r.image}`), // replace with your real domain
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: avg.toString(),
      reviewCount: reviewsData.length.toString(),
      bestRating: '5',
      worstRating: '1'
    },
    review: reviewsData.map((r) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: r.name
      },
      datePublished: r.datePublished,
      reviewBody: r.review,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating.toString(),
        bestRating: '5'
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
       
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld, null, 2) }}
    />
  );
}
