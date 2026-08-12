'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export type OfferTour = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  image: string | null;
  duration: string | null;
  listPrice: number;
  offerPrice: number;
  saving: number;
  rating: number | null;
  reviewCount: number;
};

export type OfferView = {
  firstName: string;
  code: string;
  label: string;            // "15%" or "$10"
  expiresAt: string;
  currencySymbol: string;
  siteName: string;
  logo: string | null;
  brandColor: string;
  heroImage: string | null;
  heroAlt: string;
  bundles: OfferTour[];
  picks: OfferTour[];
  totalCount: number;
};

const pad = (value: number) => String(Math.max(0, value)).padStart(2, '0');

function useRemaining(expiresAt: string): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, new Date(expiresAt).getTime() - now);
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const remaining = useRemaining(expiresAt);
  if (remaining === 0) return <span className="text-sm font-semibold text-red-300">This offer has ended</span>;
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const units = days > 0
    ? [{ l: 'days', v: days }, { l: 'hrs', v: hours }, { l: 'min', v: minutes }]
    : [{ l: 'hrs', v: hours }, { l: 'min', v: minutes }, { l: 'sec', v: seconds }];
  return (
    <div aria-live="polite" className="flex items-center gap-2">
      {units.map((unit, index) => (
        <div key={unit.l} className="flex items-center gap-2">
          {index > 0 && <span className="pb-4 text-xl font-bold text-white/30">:</span>}
          <span className="flex w-[3.3rem] flex-col items-center rounded-xl border border-white/15 bg-white/10 py-2.5 backdrop-blur-sm">
            <span className="text-2xl font-extrabold leading-none tabular-nums text-white">{pad(unit.v)}</span>
            <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">{unit.l}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function CodeTicket({ code, label, brandColor }: { code: string; label: string; brandColor: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy discount code ${code}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        } catch {
          /* code stays visible to copy by hand */
        }
      }}
      className="group relative flex items-stretch overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      <span className="flex flex-col justify-center gap-0.5 px-5 py-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Your private code</span>
        <span className="text-2xl font-extrabold tracking-[0.14em] text-gray-900">{code}</span>
      </span>
      <span aria-hidden className="my-2 w-px border-l-2 border-dashed border-gray-300" />
      <span
        className="flex flex-col items-center justify-center gap-1 px-5 text-white transition-opacity group-hover:opacity-90"
        style={{ backgroundColor: brandColor }}
      >
        <span className="text-lg font-extrabold leading-none">−{label}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
          {copied ? 'Copied ✓' : 'Tap to copy'}
        </span>
      </span>
    </button>
  );
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setShown(true);
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setShown(true);
        observer.disconnect();
      }
    }, { rootMargin: '0px 0px -40px 0px' });
    observer.observe(node);
    // Selling content must never stay hidden if observation never fires.
    const failSafe = setTimeout(() => setShown(true), 1500);
    return () => { observer.disconnect(); clearTimeout(failSafe); };
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-500 ease-out ${shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
    >
      {children}
    </div>
  );
}

function TourCard({ tour, view, locale }: { tour: OfferTour; view: OfferView; locale: string }) {
  const money = (value: number) => `${view.currencySymbol}${value.toFixed(2)}`;
  return (
    <Link
      href={`/${locale}/tours/${tour.slug}?code=${encodeURIComponent(view.code)}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-black/[0.07] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {tour.image ? (
          <Image
            src={tour.image}
            alt={tour.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">{view.siteName}</div>
        )}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
        {tour.duration && (
          <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-gray-900">
            {tour.duration}
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-gray-900/90 px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur-sm">
          −{view.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        {tour.rating !== null && tour.reviewCount > 0 && (
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-gray-700">
            <span aria-hidden className="text-amber-500">★</span>
            {tour.rating.toFixed(1)}
            <span className="font-normal text-gray-500">({tour.reviewCount})</span>
          </p>
        )}
        <h3 className="text-[1.05rem] font-bold leading-snug text-gray-900">{tour.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-gray-600">{tour.summary}</p>
        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3 border-t border-gray-100 pt-4">
            <div>
              <p className="text-[11px] font-medium text-gray-500">
                <s className="tabular-nums">{money(tour.listPrice)}</s>
                <span className="ml-1">save {money(tour.saving)}</span>
              </p>
              <p className="text-[1.6rem] font-extrabold leading-tight tabular-nums text-gray-900">
                {money(tour.offerPrice)}
              </p>
            </div>
            <span className="mb-0.5 flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-gray-900 py-2.5 pl-4 pr-3 text-xs font-bold text-white transition-all group-hover:gap-2.5 group-hover:bg-gray-800">
              Book now
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function StickyBar({ view }: { view: OfferView }) {
  const remaining = useRemaining(view.expiresAt);
  const [copied, setCopied] = useState(false);
  if (remaining === 0) return null;
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-2xl bg-gray-900/95 shadow-2xl backdrop-blur-md md:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(view.code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch { /* visible anyway */ }
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
            {copied ? 'Code copied ✓' : `Ends in ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
          </p>
          <p className="text-base font-extrabold tracking-[0.14em] text-white">{view.code}</p>
        </button>
        <a href="#tours" className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-gray-900">
          See tours ↓
        </a>
      </div>
    </div>
  );
}

export default function OfferPageClient({ view, locale }: { view: OfferView; locale: string }) {
  const totalSaving = [...view.bundles, ...view.picks].reduce((sum, tour) => sum + tour.saving, 0);
  return (
    <main className="min-h-screen bg-gray-50 pb-28 md:pb-0">
      <section className="relative isolate overflow-hidden bg-gray-900">
        {view.heroImage && (
          <Image
            src={view.heroImage}
            alt={view.heroAlt}
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
        )}
        {/* Scrims: the headline has to stay readable over any photograph, so the
            image sits under a vertical wash plus a left-weighted one behind the copy. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-gray-950/85 via-gray-950/70 to-gray-950/95" />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-gray-950/85 via-gray-950/45 to-transparent" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${view.brandColor}, transparent)` }}
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-10 md:pb-24 md:pt-12">
          {view.logo && (
            <img
              src={view.logo}
              alt={view.siteName}
              className="h-11 w-auto drop-shadow-lg md:h-12"
            />
          )}

          <div className="mt-8 flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white ring-1 ring-white/25"
              style={{ backgroundColor: view.brandColor }}
            >
              {view.firstName.charAt(0).toUpperCase()}
            </span>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/80">
              A private offer, prepared by your personal planner
            </p>
          </div>

          <h1 className="mt-7 max-w-4xl text-[2.5rem] font-extrabold leading-[1.07] tracking-tight text-white drop-shadow-sm md:text-[3.75rem]">
            {view.firstName}, your {view.label} is ready to use.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">
            A hand-picked selection at live {view.siteName} prices. Your code applies at checkout on every tour
            below — on as many bookings as you make before it ends.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-6">
            <CodeTicket code={view.code} label={view.label} brandColor={view.brandColor} />
            <div>
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">Offer ends in</p>
              <Countdown expiresAt={view.expiresAt} />
            </div>
          </div>

          <ul className="mt-12 grid max-w-3xl grid-cols-1 gap-x-8 gap-y-2.5 text-[0.92rem] text-white/85 sm:grid-cols-2">
            {[
              'Free cancellation up to 24h on most tours',
              'Hotel pickup included where offered',
              'Licensed local guides, small groups',
              'Your code is applied and verified at checkout',
            ].map((line) => (
              <li key={line} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: view.brandColor }}
                >
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-gray-100 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            ['Booked direct, priced better', 'Your planner’s code beats marketplace pricing — no middleman fee.'],
            ['Instant confirmation', 'Voucher and pickup details arrive the moment you book.'],
            ['A real person, always', 'Your planner stays one message away, before and during your trip.'],
          ].map(([title, body]) => (
            <div key={title} className="py-6 sm:px-8 sm:first:pl-0 sm:last:pr-0">
              <p className="text-sm font-extrabold uppercase tracking-wide text-gray-900">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {view.bundles.length > 0 && (
        <section id="tours" className="mx-auto max-w-6xl scroll-mt-6 px-6 pt-16">
          <Reveal>
            <div className="max-w-2xl">
              <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500">
                <span aria-hidden className="h-px w-8 bg-gray-400" />
                01 · Save more
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
                Book bundles &amp; save more
              </h2>
              <p className="mt-2 text-base leading-relaxed text-gray-600">
                Best-value picks — book several and your {view.label} applies to every one. Booking all of these
                saves {view.currencySymbol}{totalSaving.toFixed(2)}.
              </p>
            </div>
          </Reveal>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {view.bundles.map((tour, index) => (
              <Reveal key={tour.id} delay={Math.min(index, 2) * 80}>
                <TourCard tour={tour} view={view} locale={locale} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16">
        <Reveal>
          <div className="max-w-2xl">
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500">
              <span aria-hidden className="h-px w-8 bg-gray-400" />
              02 · Hand-picked
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
              Top tours recommended by your personal planner
            </h2>
            <p className="mt-2 text-base leading-relaxed text-gray-600">
              Chosen for {view.firstName} from {view.totalCount} live experiences.
            </p>
          </div>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {view.picks.map((tour, index) => (
            <Reveal key={tour.id} delay={Math.min(index, 3) * 70}>
              <TourCard tour={tour} view={view} locale={locale} />
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="relative mt-16 overflow-hidden rounded-[2rem] bg-gray-900 px-8 py-14 text-center md:py-16">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_115%,rgba(255,255,255,0.14),transparent_70%)]" />
            <p className="relative text-3xl font-extrabold leading-snug text-white md:text-4xl">
              Ready when you are, {view.firstName}.
            </p>
            <p className="relative mx-auto mt-4 max-w-xl text-white/70">
              Use code{' '}
              <span className="rounded-md bg-white/15 px-2 py-0.5 font-extrabold tracking-[0.14em] text-white">{view.code}</span>{' '}
              at checkout before the timer ends. Questions? Reply to your planner any time.
            </p>
          </div>
        </Reveal>
        <p className="mt-8 text-center text-xs text-gray-500">
          Prices are live prices with your code applied. The same discount is re-checked and applied at checkout.
        </p>
      </section>

      <StickyBar view={view} />
    </main>
  );
}
