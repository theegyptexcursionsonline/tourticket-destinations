// components/DestinationsServer.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Destination } from '@/types';
import { useTenant } from '@/contexts/TenantContext';

interface DestinationWithTourCount extends Destination {
  tourCount: number;
}

interface DestinationsServerProps {
  destinations: DestinationWithTourCount[];
}

export default function DestinationsServer({ destinations }: DestinationsServerProps) {
  const { tenant: _tenant } = useTenant();

  if (!destinations || destinations.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7 sm:mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 text-center sm:text-left">
              Where are you going?
            </h2>
            <p className="mt-2 text-sm text-slate-500 text-center sm:text-left">
              Explore destinations and start planning.
            </p>
          </div>

          <Link
            href="/destinations"
            className="text-sm font-semibold inline-flex items-center justify-center rounded-full px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            View all
          </Link>
        </div>

        <div
          className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8"
          style={{ maxWidth: `${destinations.length * 200}px`, margin: '0 auto' }}
        >
          {destinations.map((destination) => (
            <Link key={destination._id} href={`/destinations/${destination.slug}`} className="text-center group w-[calc(50%-8px)] sm:w-auto">
              <div className="mx-auto rounded-full">
                <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full overflow-hidden transform transition-all duration-300 group-hover:scale-[1.06] shadow-lg group-hover:shadow-xl bg-slate-200">
                  {destination.image && destination.image !== 'UPLOAD_IMAGE_URL_HERE' && (
                    <Image
                      src={destination.image}
                      alt={destination.name}
                      width={160}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                </div>
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
