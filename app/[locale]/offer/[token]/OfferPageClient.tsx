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

export type OfferQuote = {
  name: string;
  rating: number;
  text: string;
  tourTitle: string | null;
};

export type OfferView = {
  firstName: string | null; // null on campaign links — greeting goes generic
  code: string;
  label: string;            // "15%" or "$10"
  expiresAt: string | null; // null when the code has no expiry — timers hide
  expiresNice: string | null;
  currencySymbol: string;
  siteName: string;
  logo: string | null;
  brandColor: string;
  heroImage: string | null;
  heroAlt: string;
  bundles: OfferTour[];
  picks: OfferTour[];
  totalCount: number;
  stats: { fromPrice: number; maxSaving: number; avgRating: number | null; reviewTotal: number };
  quotes: OfferQuote[];
  contact: { whatsapp: string | null; phone: string | null; email: string | null };
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

function money(symbol: string, value: number): string {
  return `${symbol}${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

function useCopy(code: string): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      },
      () => { /* code stays visible to copy by hand */ },
    );
  };
  return [copied, copy];
}

function Countdown({ expiresAt, compact = false }: { expiresAt: string; compact?: boolean }) {
  const remaining = useRemaining(expiresAt);
  if (remaining === 0) return <span className="text-sm font-semibold text-red-300">This offer has ended</span>;
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  if (compact) {
    return (
      <span className="tabular-nums font-bold">
        {days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
      </span>
    );
  }
  // Seconds are always shown: a timer that only moves once a minute reads as
  // frozen to the customer who just landed.
  const units = days > 0
    ? [{ l: 'days', v: days }, { l: 'hrs', v: hours }, { l: 'min', v: minutes }, { l: 'sec', v: seconds }]
    : [{ l: 'hrs', v: hours }, { l: 'min', v: minutes }, { l: 'sec', v: seconds }];
  return (
    <div aria-live="polite" className="flex items-center gap-1.5">
      {units.map((unit, index) => (
        <div key={unit.l} className="flex items-center gap-1.5">
          {index > 0 && <span className="pb-4 text-lg font-bold text-white/40">:</span>}
          <span className="flex w-[3.1rem] flex-col items-center rounded-xl bg-white/[0.08] py-2 ring-1 ring-white/15">
            <span className="text-[1.35rem] font-extrabold leading-none tabular-nums text-white">{pad(unit.v)}</span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/60">{unit.l}</span>
          </span>
        </div>
      ))}
    </div>
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

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5`} className="text-amber-400">
      {'★'.repeat(Math.round(rating))}
      <span className="text-gray-300">{'★'.repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

/** The glass panel that carries the whole conversion mechanic: code, timer, terms. */
function OfferPanel({ view }: { view: OfferView }) {
  const [copied, copy] = useCopy(view.code);
  return (
    <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-md md:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Your private code</p>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-extrabold text-white"
          style={{ backgroundColor: view.brandColor }}
        >
          −{view.label} OFF
        </span>
      </div>

      <button
        type="button"
        aria-label={`Copy discount code ${view.code}`}
        onClick={copy}
        className="group mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 text-left shadow-lg transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        <span className="text-2xl font-extrabold tracking-[0.16em] text-gray-900">{view.code}</span>
        <span
          className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white transition-opacity group-hover:opacity-90"
          style={{ backgroundColor: copied ? '#15803d' : '#111827' }}
        >
          {copied ? 'Copied ✓' : 'Tap to copy'}
        </span>
      </button>

      {view.expiresAt && (
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Offer ends in</p>
            <Countdown expiresAt={view.expiresAt} />
          </div>
        </div>
      )}

      <p className="mt-5 border-t border-white/10 pt-4 text-[13px] leading-relaxed text-white/75">
        Valid on every tour below{view.expiresNice ? <> until <span className="font-bold text-white">{view.expiresNice}</span></> : null} — on as
        many bookings as you make. The code is re-checked and applied at checkout.
      </p>

      <a
        href="#tours"
        className="mt-5 block w-full rounded-2xl py-3.5 text-center text-[15px] font-extrabold text-white shadow-lg transition-transform duration-200 hover:-translate-y-0.5"
        style={{ backgroundColor: view.brandColor }}
      >
        Browse {view.totalCount} experiences ↓
      </a>
    </div>
  );
}

function TourCard({ tour, view, locale }: { tour: OfferTour; view: OfferView; locale: string }) {
  const percent = Math.round((tour.saving / tour.listPrice) * 100);
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
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          {tour.duration && (
            <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-gray-900">
              {tour.duration}
            </span>
          )}
          {tour.rating !== null && tour.reviewCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              <span aria-hidden className="text-amber-400">★</span>
              {tour.rating.toFixed(1)}
              <span className="font-medium text-white/75">({tour.reviewCount})</span>
            </span>
          )}
        </div>
        <span
          className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white shadow-md"
          style={{ backgroundColor: view.brandColor }}
        >
          −{view.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[1.05rem] font-bold leading-snug text-gray-900">{tour.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-gray-600">{tour.summary}</p>
        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3 border-t border-gray-100 pt-4">
            <div>
              <p className="text-[11px] font-medium text-gray-500">
                <s className="tabular-nums">{money(view.currencySymbol, tour.listPrice)}</s>
                <span className="ml-1.5 rounded-md bg-green-50 px-1.5 py-0.5 font-bold text-green-700">
                  −{percent}% · save {money(view.currencySymbol, tour.saving)}
                </span>
              </p>
              <p className="text-[1.55rem] font-extrabold leading-tight tabular-nums text-gray-900">
                {money(view.currencySymbol, tour.offerPrice)}
                <span className="ml-1 text-xs font-semibold text-gray-500">with code</span>
              </p>
            </div>
            <span
              className="mb-0.5 flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full py-2.5 pl-4 pr-3 text-xs font-bold text-white shadow-sm transition-all group-hover:gap-2.5 group-hover:opacity-90"
              style={{ backgroundColor: view.brandColor }}
            >
              Book now
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SectionHeading({ index, kicker, title, body }: { index: string; kicker: string; title: string; body: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500">
        <span aria-hidden className="h-px w-8 bg-gray-400" />
        {index} · {kicker}
      </p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">{title}</h2>
      <p className="mt-2 text-base leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}

/** Desktop top bar that appears once the hero (and its code panel) scrolls away. */
function DeskBar({ view }: { view: OfferView }) {
  const [visible, setVisible] = useState(false);
  const [copied, copy] = useCopy(view.code);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 560);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-0 z-50 hidden justify-center transition-transform duration-300 md:flex ${visible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <div className="flex w-full max-w-6xl items-center justify-between gap-4 border-b border-white/10 bg-gray-950/90 px-6 py-2.5 shadow-lg backdrop-blur-md">
        <p className="flex items-center gap-3 text-sm text-white/85">
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-white"
            style={{ backgroundColor: view.brandColor }}
          >
            −{view.label}
          </span>
          <button
            type="button"
            onClick={copy}
            className="font-extrabold tracking-[0.12em] text-white hover:opacity-80"
            title="Copy code"
          >
            {copied ? 'Copied ✓' : view.code}
          </button>
          {view.expiresAt && (
            <span className="text-white/60">
              ends in <Countdown expiresAt={view.expiresAt} compact />
            </span>
          )}
        </p>
        <a
          href="#tours"
          className="rounded-full bg-white px-5 py-2 text-xs font-extrabold text-gray-900 hover:bg-gray-100"
        >
          Browse tours
        </a>
      </div>
    </div>
  );
}

function StickyBar({ view }: { view: OfferView }) {
  const remaining = useRemaining(view.expiresAt ?? '9999-12-31T00:00:00Z');
  const [copied, copy] = useCopy(view.code);
  if (remaining === 0) return null;
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-2xl bg-gray-950/95 shadow-2xl ring-1 ring-white/10 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" className="min-w-0 text-left" onClick={copy}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
            {copied ? 'Code copied ✓' : view.expiresAt ? `Ends in ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : 'Your private code · tap to copy'}
          </p>
          <p className="text-base font-extrabold tracking-[0.14em] text-white">{view.code}</p>
        </button>
        <a
          href="#tours"
          className="shrink-0 rounded-full px-5 py-2.5 text-sm font-bold text-white"
          style={{ backgroundColor: view.brandColor }}
        >
          See tours ↓
        </a>
      </div>
    </div>
  );
}

export default function OfferPageClient({ view, locale }: { view: OfferView; locale: string }) {
  const bundleSaving = view.bundles.reduce((sum, tour) => sum + tour.saving, 0);
  const s = view.stats;
  const wa = view.contact.whatsapp
    ? `https://wa.me/${view.contact.whatsapp}?text=${encodeURIComponent(`Hi! I'm looking at my private offer (code ${view.code}).`)}`
    : null;

  return (
    <main className="min-h-screen bg-gray-50 pb-28 md:pb-0">
      <DeskBar view={view} />

      <section className="relative overflow-hidden bg-gray-900">
        {/* Explicit positive layers only. A negative z-index inside this section
            put the photograph behind the section's own background at desktop
            widths, so the hero rendered as a black box. */}
        {view.heroImage && (
          <div aria-hidden className="absolute inset-0 z-0">
            <Image
              src={view.heroImage}
              alt={view.heroAlt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        )}
        {/* Scrims: dark enough for copy, light enough that the destination
            photography still sells the trip — the previous wash buried it. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-gray-950/65 via-gray-950/20 to-gray-950/70" />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-gray-950/55 via-gray-950/15 to-transparent" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1"
          style={{ background: `linear-gradient(90deg, transparent, ${view.brandColor}, transparent)` }}
        />

        <div className="relative z-20 mx-auto max-w-6xl px-6 pb-14 pt-8 md:pb-20 md:pt-10">
          {view.logo && (
            <img src={view.logo} alt={view.siteName} className="h-11 w-auto drop-shadow-lg md:h-12" />
          )}

          <div className="mt-8 grid items-end gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center gap-2.5">
                {view.firstName && (
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white ring-1 ring-white/25"
                    style={{ backgroundColor: view.brandColor }}
                  >
                    {view.firstName.charAt(0).toUpperCase()}
                  </span>
                )}
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/80">
                  A private offer from your personal planner
                </p>
              </div>

              <h1 className="mt-6 max-w-3xl text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-lg md:text-[3.6rem]">
                {view.firstName ? `${view.firstName}, take ${view.label} off every experience.` : `Take ${view.label} off every experience.`}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white drop-shadow-md md:text-xl">
                Hand-picked at live {view.siteName} prices — from {money(view.currencySymbol, s.fromPrice)} with
                your code, saving up to {money(view.currencySymbol, s.maxSaving)} on a single booking.
              </p>

              {s.avgRating !== null && s.reviewTotal > 0 && (
                <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-white/90">
                  <Stars rating={s.avgRating} />
                  {s.avgRating.toFixed(1)} from {s.reviewTotal} traveller reviews
                </p>
              )}

              <ul className="mt-7 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-2.5 text-[0.92rem] text-white/85 sm:grid-cols-2">
                {[
                  'Code verified & applied at checkout',
                  'Instant confirmation to your email',
                  'Secure card payment by Stripe',
                  'Your planner stays one message away',
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

            <OfferPanel view={view} />
          </div>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-gray-100 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            ['1 · Pick your tours', 'Every experience below already shows its price with your code applied.'],
            ['2 · Enter your code', `Type or paste ${view.code} at checkout — it is verified server-side.`],
            ['3 · Get instant confirmation', 'Voucher and pickup details arrive by email the moment you book.'],
          ].map(([title, body]) => (
            <div key={title} className="py-6 sm:px-8 sm:first:pl-0 sm:last:pr-0">
              <p className="text-sm font-extrabold uppercase tracking-wide text-gray-900">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {view.bundles.length > 0 && (
        <section id="tours" className="mx-auto max-w-6xl scroll-mt-14 px-6 pt-16">
          <Reveal>
            <SectionHeading
              index="01"
              kicker="Save more"
              title="Book bundles & save more"
              body={
                <>
                  Best-value picks — book several and your {view.label} applies to every one. Booking all{' '}
                  {view.bundles.length} saves {money(view.currencySymbol, Number(bundleSaving.toFixed(2)))}.
                </>
              }
            />
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

      <section className="mx-auto max-w-6xl px-6 pt-16">
        <Reveal>
          <SectionHeading
            index="02"
            kicker="Hand-picked"
            title="Top tours recommended by your personal planner"
            body={<>Chosen for {view.firstName ?? 'you'} from {view.totalCount} live experiences.</>}
          />
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {view.picks.map((tour, index) => (
            <Reveal key={tour.id} delay={Math.min(index, 3) * 70}>
              <TourCard tour={tour} view={view} locale={locale} />
            </Reveal>
          ))}
        </div>
      </section>

      {view.quotes.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pt-16">
          <Reveal>
            <SectionHeading
              index="03"
              kicker="Traveller words"
              title={`Why travellers rate ${view.siteName}${s.avgRating !== null ? ` ${s.avgRating.toFixed(1)}` : ''}`}
              body={<>{s.reviewTotal} reviews across these experiences — a few recent ones.</>}
            />
          </Reveal>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {view.quotes.map((quote, index) => (
              <Reveal key={`${quote.name}-${index}`} delay={index * 80}>
                <figure className="flex h-full flex-col rounded-3xl bg-white p-6 ring-1 ring-black/[0.07]">
                  <Stars rating={quote.rating} />
                  <blockquote className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-gray-700">
                    “{quote.text}”
                  </blockquote>
                  <figcaption className="mt-4 border-t border-gray-100 pt-3 text-sm">
                    <span className="font-bold text-gray-900">{quote.name}</span>
                    {quote.tourTitle && <span className="block text-xs text-gray-500">{quote.tourTitle}</span>}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-gray-950 px-8 py-14 text-center md:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(55% 70% at 50% 120%, ${view.brandColor}55, transparent 70%)` }}
            />
            <p className="relative text-3xl font-extrabold leading-snug text-white md:text-4xl">
              Ready when you are{view.firstName ? `, ${view.firstName}` : ''}.
            </p>
            <p className="relative mx-auto mt-4 max-w-xl text-white/75">
              Use code{' '}
              <span className="rounded-md bg-white/15 px-2 py-0.5 font-extrabold tracking-[0.14em] text-white">{view.code}</span>{' '}
              at checkout{view.expiresNice ? ` before ${view.expiresNice}` : ''}. Questions? Your planner answers fast.
            </p>
            <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#tours"
                className="rounded-full bg-white px-7 py-3 text-sm font-extrabold text-gray-900 transition hover:bg-gray-100"
              >
                Browse the tours ↑
              </a>
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full px-7 py-3 text-sm font-extrabold text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#25D366' }}
                >
                  WhatsApp your planner
                </a>
              )}
              {!wa && view.contact.email && (
                <a
                  href={`mailto:${view.contact.email}`}
                  className="rounded-full border border-white/25 px-7 py-3 text-sm font-extrabold text-white transition hover:bg-white/10"
                >
                  Email your planner
                </a>
              )}
            </div>
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
