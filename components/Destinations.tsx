// components/Destinations.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Destination } from '@/types';
import { Loader2 } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

interface DestinationWithTourCount extends Destination {
  tourCount: number;
}

export default function Destinations() {
  const [destinations, setDestinations] = useState<DestinationWithTourCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant } = useTenant();
  const isSpeedboat = tenant?.tenantId === 'hurghada-speedboat';

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
        
        // Fallback: show mock destinations
        const mockDestinations: DestinationWithTourCount[] = isSpeedboat
          ? [
              {
                _id: 'mock-sb-1',
                name: 'Hurghada Marina',
                slug: 'hurghada-marina',
                country: 'Egypt',
                image: '/tenants/hurghada-speedboat/hero/hero-1.png',
                description: 'Marina departures and private charters',
                tourCount: 5,
              },
              {
                _id: 'mock-sb-2',
                name: 'Giftun Island',
                slug: 'giftun-island',
                country: 'Egypt',
                image: '/tenants/hurghada-speedboat/hero/hero-2.png',
                description: 'Island runs, snorkeling and beach time',
                tourCount: 1,
              },
              {
                _id: 'mock-sb-3',
                name: 'Orange Bay',
                slug: 'orange-bay',
                country: 'Egypt',
                image: '/tenants/hurghada-speedboat/hero/hero-3.png',
                description: 'Turquoise lagoons and soft sand beaches',
                tourCount: 1,
              },
              {
                _id: 'mock-sb-4',
                name: 'Dolphin House',
                slug: 'dolphin-house',
                country: 'Egypt',
                image: '/tenants/hurghada-speedboat/hero/hero-1.png',
                description: 'Swim with wild dolphins in their habitat',
                tourCount: 1,
              },
            ]
          : [
              {
                _id: 'mock-1',
                name: 'Cairo',
                slug: 'cairo',
                country: 'Egypt',
                image: 'https://images.unsplash.com/photo-1539768942893-daf53e448371?w=400&h=400&fit=crop',
                description: 'Ancient capital with pyramids and rich history',
                tourCount: 15,
              },
              {
                _id: 'mock-2',
                name: 'Luxor',
                slug: 'luxor',
                country: 'Egypt',
                image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&h=400&fit=crop',
                description: 'Valley of the Kings and ancient temples',
                tourCount: 12,
              },
              {
                _id: 'mock-3',
                name: 'Alexandria',
                slug: 'alexandria',
                country: 'Egypt',
                image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=400&h=400&fit=crop',
                description: 'Mediterranean coastal city with ancient library',
                tourCount: 8,
              },
              {
                _id: 'mock-4',
                name: 'Aswan',
                slug: 'aswan',
                country: 'Egypt',
                image: 'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=400&h=400&fit=crop',
                description: 'Nile river city with beautiful temples',
                tourCount: 10,
              },
              {
                _id: 'mock-5',
                name: 'Hurghada',
                slug: 'hurghada',
                country: 'Egypt',
                image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=400&fit=crop',
                description: 'Red Sea resort with amazing diving',
                tourCount: 7,
              },
            ];
        setDestinations(mockDestinations);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDestinations();
  }, [tenant?.tenantId, isSpeedboat]);

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
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-6 sm:mb-8 text-center sm:text-left">
          Where are you going?
        </h2>
        <div className="flex justify-center gap-4 sm:gap-6 md:gap-8 flex-wrap">
          {destinations.map((destination) => (
            <Link
              key={destination._id}
              href={`/destinations/${destination.slug}`}
              className="text-center group"
            >
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full overflow-hidden shadow-lg transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl bg-slate-200">
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
              <h3 className="mt-3 sm:mt-4 font-bold text-base sm:text-lg text-slate-800 group-hover:text-red-500 transition-colors">
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