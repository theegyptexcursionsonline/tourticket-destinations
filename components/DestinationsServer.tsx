// components/DestinationsServer.tsx
'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Destination } from '@/types';
import { useTenant } from '@/contexts/TenantContext';
import { useTranslations } from 'next-intl';
import { contentPath } from '@/lib/content/contentUrl';
import { ArrowRight } from 'lucide-react';

interface DestinationWithTourCount extends Destination {
  tourCount: number;
}

interface DestinationsServerProps {
  destinations: DestinationWithTourCount[];
}

export default function DestinationsServer({ destinations }: DestinationsServerProps) {
  const { tenant: _tenant } = useTenant();
  const t = useTranslations();

  if (!destinations || destinations.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="container mx-auto px-4 relative z-10">
        <div className="mb-7 text-center sm:mb-10">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {t('homepage.topDestinations')}
            </h2>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              {t('destinations.exploreAll')}
            </p>
          </div>
        </div>

        <div
          className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8"
          style={{ maxWidth: `${destinations.length * 200}px`, margin: '0 auto' }}
        >
          {destinations.map((destination) => (
            <Link key={destination._id} href={contentPath('destination', destination.slug, destination.urlType, null, destination.parentPage?.slug)} className="text-center group w-[calc(50%-8px)] sm:w-auto">
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
                {t('destinations.toursAvailable', { count: destination.tourCount })}
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-8 flex justify-center sm:mt-10">
          <Link
            href="/destinations"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary-color)] px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 sm:text-base"
          >
            {t('common.viewAll')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
