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
  const { tenant } = useTenant();
  const isSpeedboat = tenant?.tenantId === 'hurghada-speedboat';

  if (!destinations || destinations.length === 0) {
    return null;
  }

  return (
    <section
      className={`py-12 sm:py-16 ${
        isSpeedboat
          ? 'relative overflow-hidden bg-gradient-to-b from-[#06101F] via-[#0A1628] to-[#0D1F35]'
          : 'bg-white'
      }`}
    >
      {isSpeedboat && (
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(0, 212, 255, 0.16), transparent 42%), radial-gradient(circle at 80% 10%, rgba(255, 107, 53, 0.10), transparent 42%), radial-gradient(circle at 50% 100%, rgba(0, 212, 255, 0.10), transparent 55%)',
          }}
        />
      )}

      <div className="container mx-auto px-4 relative z-10">
        <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7 sm:mb-10`}>
          <div>
            <h2
              className={`text-2xl sm:text-3xl font-extrabold ${
                isSpeedboat ? 'text-white' : 'text-slate-800'
              } text-center sm:text-left`}
            >
              {isSpeedboat ? 'Pick your next splash spot' : 'Where are you going?'}
            </h2>
            <p className={`mt-2 text-sm ${isSpeedboat ? 'text-gray-300' : 'text-slate-500'} text-center sm:text-left`}>
              {isSpeedboat
                ? 'Fast island runs, dolphin encounters, and marina departures — all from Hurghada.'
                : 'Explore destinations and start planning.'}
            </p>
          </div>

          <Link
            href="/destinations"
            className={`text-sm font-semibold inline-flex items-center justify-center rounded-full px-4 py-2 border transition-colors ${
              isSpeedboat
                ? 'border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10 hover:border-cyan-300/50'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            View all
          </Link>
        </div>

        <div
          className={`grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-6 md:gap-8 justify-items-center ${
            isSpeedboat ? '' : ''
          }`}
        >
          {destinations.map((destination) => (
            <Link key={destination._id} href={`/destinations/${destination.slug}`} className="text-center group w-full max-w-[190px]">
              {/* Ring wrapper (speedboat gets a glow/gradient border) */}
              <div
                className={`mx-auto rounded-full ${
                  isSpeedboat
                    ? 'p-[3px] bg-gradient-to-br from-cyan-400/70 via-sky-500/35 to-orange-500/25 shadow-[0_0_0_1px_rgba(0,212,255,0.12),0_18px_55px_-22px_rgba(0,212,255,0.55)] group-hover:shadow-[0_0_0_1px_rgba(0,212,255,0.20),0_24px_70px_-28px_rgba(0,212,255,0.65)] transition-shadow'
                    : ''
                }`}
              >
                <div
                  className={`relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full overflow-hidden transform transition-all duration-300 group-hover:scale-[1.06] ${
                    isSpeedboat ? 'bg-white/10 ring-1 ring-white/10' : 'shadow-lg group-hover:shadow-xl bg-slate-200'
                  }`}
                >
                  {destination.image && destination.image !== 'UPLOAD_IMAGE_URL_HERE' && (
                    <Image
                      src={destination.image}
                      alt={destination.name}
                      width={160}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div
                    className={`absolute inset-0 transition-colors ${
                      isSpeedboat ? 'bg-gradient-to-t from-black/45 via-black/10 to-transparent group-hover:from-black/55' : 'bg-black/20 group-hover:bg-black/30'
                    }`}
                  />
                </div>
              </div>

              <h3
                className={`mt-3 sm:mt-4 font-bold text-base sm:text-lg transition-colors ${
                  isSpeedboat ? 'text-white group-hover:text-cyan-200' : 'text-slate-800 group-hover:text-red-500'
                }`}
              >
                {destination.name}
              </h3>

              <p className={`text-xs sm:text-sm ${isSpeedboat ? 'text-gray-300' : 'text-slate-500'}`}>
                <span className={isSpeedboat ? 'text-cyan-200 font-semibold' : ''}>
                  {destination.tourCount}
                </span>{' '}
                tour{destination.tourCount !== 1 ? 's' : ''}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
