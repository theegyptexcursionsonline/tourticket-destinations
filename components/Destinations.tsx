// components/Destinations.tsx
'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Destination } from '@/types';
import { useTenant } from '@/contexts/TenantContext';
import { contentPath } from '@/lib/content/contentUrl';

interface DestinationWithTourCount extends Destination {
  tourCount: number;
}

export default function Destinations() {
  const [destinations, setDestinations] = useState<DestinationWithTourCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant } = useTenant();

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch from new cached API endpoint
        const tenantId = tenant?.tenantId || 'default';
        const response = await fetch(`/api/destinations?tenantId=${encodeURIComponent(tenantId)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch destinations: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch destinations');
        }

        setDestinations(data.data || []);
      } catch (error) {
        console.error('Failed to fetch destinations:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        
        setDestinations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDestinations();
  }, [tenant?.tenantId]);

  if (isLoading) {
    return (
      <section className="bg-white py-16 animate-pulse">
        <div className="container mx-auto px-4">
          <div className="h-10 w-1/3 bg-slate-200 rounded-lg mb-8" />
          <div className="flex justify-center gap-8 flex-wrap">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="text-center group cursor-pointer">
                <div className="w-40 h-40 rounded-full bg-slate-200 shadow-lg" />
                <div className="h-6 w-24 mx-auto mt-4 bg-slate-200 rounded" />
                <div className="h-4 w-16 mx-auto mt-2 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error && destinations.length === 0) {
    return (
      <section className="bg-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-slate-800 mb-4">
            Where are you going?
          </h2>
          <p className="text-slate-600 mb-6">
            Unable to load destinations. Please try again later.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-6 sm:mb-8 text-center sm:text-start">
          Where are you going?
        </h2>
        <div className="flex gap-x-4 sm:gap-x-6 gap-y-6 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
          {destinations.map((destination) => (
            <Link
              key={destination._id}
              href={contentPath('destination', destination.slug, destination.urlType, null, destination.parentPage?.slug)}
              className="text-center group flex-shrink-0"
            >
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden shadow-lg transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl bg-slate-200 mx-auto">
                {destination.image && destination.image !== 'UPLOAD_IMAGE_URL_HERE' && (
                  <Image
                    src={destination.image}
                    alt={destination.name}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"></div>
              </div>
              <h3 className="mt-3 sm:mt-4 font-bold text-base sm:text-lg text-slate-800 group-hover:text-[var(--primary-color)] transition-colors">
                {destination.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                {destination.tourCount} tour{destination.tourCount !== 1 ? 's' : ''}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
