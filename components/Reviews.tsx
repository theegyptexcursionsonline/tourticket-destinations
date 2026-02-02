'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';
import { Star } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import type { IReviewsContent, IReviewItem } from '@/lib/models/Tenant';

// Props interface for server-side content injection
export interface ReviewsProps {
  content?: IReviewsContent | null;
  elfsightAppId?: string;
}

type Review = IReviewItem;

// Fallback reviews (used when DB content is not available)
const FALLBACK_REVIEWS: Record<string, Review[]> = {
  'hurghada-speedboat': [
    {
      name: 'Sophie',
      country: 'Germany',
      review:
        'Best speedboat trip ever! The snorkeling at Giftun Island was incredible. So many colorful fish!',
      rating: 5,
      datePublished: '2024-11-20',
    },
    {
      name: 'James',
      country: 'UK',
      review:
        'Swimming with dolphins at Dolphin House was a dream come true. Captain Ahmed was fantastic!',
      rating: 5,
      datePublished: '2024-11-05',
    },
    {
      name: 'Anna',
      country: 'Russia',
      review:
        'Orange Bay is paradise! Crystal clear water, white sand beach. Perfect day trip from Hurghada.',
      rating: 5,
      datePublished: '2024-10-28',
    },
  ],
  'default': [
    {
      name: 'Aisha',
      country: 'Egypt',
      review:
        'Amazing Nile sunset cruise—the guide was exceptional and the dinner unforgettable.',
      rating: 5,
      datePublished: '2024-11-12',
    },
    {
      name: 'Luca',
      country: 'Italy',
      review:
        'Private pyramid tour at sunrise was once-in-a-lifetime. Highly recommended.',
      rating: 5,
      datePublished: '2024-10-02',
    },
    {
      name: 'Maya',
      country: 'UK',
      review:
        'Seamless booking and the felucca ride on the Nile was so peaceful and beautiful.',
      rating: 5,
      datePublished: '2024-09-15',
    },
  ],
};

const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const avatarColor = (name: string) => {
  const colors = [
    'from-amber-400 to-amber-500',
    'from-rose-400 to-rose-500',
    'from-indigo-400 to-indigo-500',
    'from-green-400 to-green-500',
    'from-sky-400 to-sky-500',
    'from-pink-400 to-pink-500',
  ];
  const idx =
    Math.abs(
      name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0),
    ) % colors.length;
  return colors[idx];
};

export default function Reviews({
  content: dbContent,
  elfsightAppId: propElfsightAppId = '0fea9001-da59-4955-b598-76327377c50c',
}: ReviewsProps) {
  const { tenant } = useTenant();
  const tenantId = tenant?.tenantId || 'default';

  // Use DB content if available, otherwise fall back to hardcoded content
  const fallbackReviews = FALLBACK_REVIEWS[tenantId] || FALLBACK_REVIEWS['default'];
  const reviewsData = dbContent?.reviews?.length ? dbContent.reviews : fallbackReviews;
  const title = dbContent?.title || 'What Our Guests Say';
  const subtitle = dbContent?.subtitle || 'Real stories from our valued customers.';
  const elfsightAppId = dbContent?.elfsightAppId || propElfsightAppId;
  const showElfsightWidget = dbContent?.showElfsightWidget !== false;

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const tryInit = () => {
      try {
        if (typeof w?.elfsightInit === 'function') {
          w.elfsightInit();
        } else if (w?.Elf && typeof w.Elf.init === 'function') {
          w.Elf.init();
        }
      } catch {
        // ignore
      }
    };
    tryInit();
    const t = setTimeout(tryInit, 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Script
        src="https://elfsightcdn.com/platform.js"
        strategy="afterInteractive"
      />

      <section className="bg-gray-50 py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4">
          {/* Heading */}
          <div className="mb-8 sm:mb-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              {title}
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              {subtitle}
            </p>
          </div>

          {/* Row 1: Our reviews */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-12 sm:mb-14 md:mb-16">
            {reviewsData.map((r, i) => (
              <article key={i} className="bg-white p-4 sm:p-5 md:p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-3">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full mr-3 sm:mr-4 flex items-center justify-center text-white font-semibold text-xs sm:text-sm bg-gradient-to-br ${avatarColor(
                      r.name,
                    )}`}
                    title={r.name}
                  >
                    {initials(r.name)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base text-gray-800">{r.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500">{r.country}</p>
                  </div>
                </div>

                <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm leading-relaxed">"{r.review}"</p>

                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, idx) => (
                    <Star
                      key={idx}
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${
                        idx < r.rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                      fill="currentColor"
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* Row 2: Elfsight widget, full width */}
          {showElfsightWidget && (
            <div className="w-full">
              <div
                className={`elfsight-app-${elfsightAppId}`}
                data-elfsight-app-lazy
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
