'use client';

import Image from 'next/image';
import {
  BookLink,
  BundleBenefits,
  ClosingCta,
  Motif,
  PriceFootnote,
  Stars,
  TourImage,
  TRUST_LINES,
  money,
  useCopy,
  useRemainingMs,
  type LayoutProps,
  type OfferTour,
  type OfferView,
} from './primitives';
import type { CityDesign } from './design';
import { Aurora, CountUp, FlipDigit, Grain, KenBurns, Rise, SheenCta, SplitReveal } from './luxe';

/** Countdown rendered as flip cards — the timer is the page's heartbeat. */
function FlipClock({ expiresAt, tone = 'light' }: { expiresAt: string | null; tone?: 'light' | 'dark' }) {
  const remaining = useRemainingMs(expiresAt);
  if (remaining === null || remaining === 0) return null;
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const units = days > 0
    ? [{ l: 'days', v: days }, { l: 'hrs', v: hours }, { l: 'min', v: minutes }, { l: 'sec', v: seconds }]
    : [{ l: 'hrs', v: hours }, { l: 'min', v: minutes }, { l: 'sec', v: seconds }];
  const shell = tone === 'light'
    ? 'border-white/15 bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
    : 'border-black/10 bg-white text-gray-900 shadow-[0_6px_20px_-14px_rgba(0,0,0,0.5)]';
  const caption = tone === 'light' ? 'text-white/55' : 'text-gray-500';
  return (
    <div aria-live="polite" className="flex items-center gap-2">
      {units.map((unit) => (
        <span key={unit.l} className={`flex w-[3.4rem] flex-col items-center rounded-2xl border py-2.5 backdrop-blur-sm ${shell}`}>
          <span className="text-[1.45rem] font-extrabold leading-none [perspective:400px]">
            <FlipDigit value={String(Math.max(0, unit.v)).padStart(2, '0')} />
          </span>
          <span className={`mt-1.5 text-[9px] font-bold uppercase tracking-[0.2em] ${caption}`}>{unit.l}</span>
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * MARINA — Hurghada. A boarding pass: perforated stub, sea-log rows.
 * ------------------------------------------------------------------ */

function StubCard({ view, design, locale, tour, benefits = false }: LayoutProps & { tour: OfferTour; benefits?: boolean }) {
  return (
    <BookLink
      view={view}
      locale={locale}
      tour={tour}
      className="group flex overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.06] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative w-32 shrink-0 overflow-hidden bg-gray-100 sm:w-44">
        <TourImage tour={tour} sizes="200px" />
      </div>
      <div aria-hidden className="my-3 border-l-2 border-dashed" style={{ borderColor: `${design.wash}33` }} />
      <div className="flex flex-1 flex-col justify-between gap-3 p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: design.wash }}>
            <span>{tour.duration || 'Day trip'}</span>
            {tour.rating !== null && tour.reviewCount > 0 && (
              <span className="text-gray-500">· ★ {tour.rating.toFixed(1)} ({tour.reviewCount})</span>
            )}
          </div>
          <h3 className="mt-1.5 text-[1.05rem] font-bold leading-snug text-gray-900">{tour.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-600">{tour.summary}</p>
          {benefits && <BundleBenefits tour={tour} design={design} />}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-gray-500"><s className="tabular-nums">{money(view.currencySymbol, tour.listPrice)}</s> save {money(view.currencySymbol, tour.saving)}</p>
            <p className="text-[1.4rem] font-extrabold leading-tight tabular-nums text-gray-900">{money(view.currencySymbol, tour.offerPrice)}</p>
          </div>
          <span className="rounded-full px-4 py-2 text-xs font-bold text-white transition-all group-hover:opacity-90" style={{ backgroundColor: view.brandColor }}>Book now →</span>
        </div>
      </div>
    </BookLink>
  );
}

function MarinaLayout({ view, design, locale }: LayoutProps) {
  const [copied, copy] = useCopy(view.code);
  const s = view.stats;
  return (
    <>
      <section className="relative overflow-hidden lg:min-h-[92vh]" style={{ backgroundColor: design.ink }}>
        {view.heroImage && <KenBurns src={view.heroImage} alt={view.heroAlt} />}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10" style={{ background: `linear-gradient(120deg, ${design.ink}f7 0%, ${design.ink}c4 44%, ${design.ink}1f 100%)` }} />
        <Aurora color={view.brandColor} className="z-10" />
        <div className="pointer-events-none absolute inset-0 z-10"><Grain opacity={0.08} /></div>
        <div className="relative z-20 mx-auto flex max-w-6xl flex-col justify-center px-6 pb-14 pt-8 md:pb-24 md:pt-10 lg:min-h-[92vh]">
          {view.logo && <img src={view.logo} alt={view.siteName} className="h-11 w-auto max-w-[200px] self-start object-contain object-left drop-shadow-lg md:h-12" />}
          <p className="mt-9 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.32em] text-white/70">
            {design.kicker}
            <Motif design={design} className="h-4 w-16 opacity-80" />
          </p>
          <SplitReveal
            lines={view.firstName ? [`${view.firstName},`, `your ${view.label} is aboard.`] : [`Your ${view.label}`, 'is aboard.']}
            className="mt-5 max-w-4xl text-[2.1rem] font-extrabold uppercase leading-[0.98] text-white drop-shadow-2xl sm:text-[2.7rem] md:text-[4.6rem] md:leading-[0.92]"
            style={{ fontFamily: design.display, letterSpacing: design.displayTracking }}
          />

          {/* The boarding pass itself: code, window, gate. */}
          <div className="mt-10 max-w-3xl overflow-hidden rounded-2xl bg-white shadow-[0_50px_90px_-40px_rgba(0,0,0,0.9)] ring-1 ring-black/5">
            <div className="flex flex-col sm:flex-row">
              <div className="flex-1 p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Pass holder</p>
                <p className="text-xl font-extrabold text-gray-900">{view.firstName ?? 'Your booking'}</p>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">From</p>
                    <p className="text-lg font-bold tabular-nums text-gray-900">{money(view.currencySymbol, s.fromPrice)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Saves up to</p>
                    <p className="text-lg font-bold" style={{ color: view.brandColor }}>
                      <CountUp value={s.maxSaving} format={(v) => money(view.currencySymbol, v)} />
                    </p>
                  </div>
                </div>
                {view.expiresAt && (
                  <div className="mt-5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Gate closes in</p>
                    <FlipClock expiresAt={view.expiresAt} tone="dark" />
                  </div>
                )}
              </div>
              <div aria-hidden className="relative border-t-2 border-dashed border-gray-300 sm:border-l-2 sm:border-t-0">
                <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full sm:-top-2 sm:left-[-9px]" style={{ backgroundColor: design.ink }} />
                <span className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full sm:bottom-[-9px] sm:left-[-9px] sm:right-auto" style={{ backgroundColor: design.ink }} />
              </div>
              <button type="button" onClick={copy} aria-label={`Copy discount code ${view.code}`} className="flex w-full flex-col items-center justify-center gap-1 p-6 text-center transition-opacity hover:opacity-90 sm:w-56" style={{ backgroundColor: view.brandColor }}>
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">Your code</span>
                <span className="text-2xl font-extrabold tracking-[0.14em] text-white">{view.code}</span>
                <span className="mt-1 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">{copied ? 'Copied ✓' : 'Tap to copy'}</span>
              </button>
            </div>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-[0.9rem] text-white/85">
            {TRUST_LINES.map((line) => (
              <li key={line} className="flex items-center gap-2"><span aria-hidden style={{ color: view.brandColor }}>✓</span>{line}</li>
            ))}
          </ul>
          {s.avgRating !== null && s.reviewTotal > 0 && (
            <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-white/90"><Stars rating={s.avgRating} />{s.avgRating.toFixed(1)} · {s.reviewTotal} reviews</p>
          )}
        </div>
      </section>

      <HowItWorks view={view} design={design} />

      <section id="tours" className="mx-auto max-w-5xl scroll-mt-14 px-6 pt-16">
        <Rise>
          <Heading design={design} index="01" kicker="Manifest" title={design.sections.value}>
            Book more than one and your {view.label} applies to every line.
          </Heading>
        </Rise>
        <div className="mt-8 flex flex-col gap-4">
          {view.bundles.map((tour, index) => (
            <Rise key={tour.id} delay={Math.min(index, 3) * 70}><StubCard view={view} design={design} locale={locale} tour={tour} benefits /></Rise>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pt-16">
        <Rise>
          <Heading design={design} index="02" kicker="Skipper's choice" title={design.sections.picks}>
            Chosen for {view.firstName ?? 'you'} from {view.totalCount} live experiences.
          </Heading>
        </Rise>
        <div className="mt-8 flex flex-col gap-4">
          {view.picks.map((tour, index) => (
            <Rise key={tour.id} delay={Math.min(index, 3) * 70}><StubCard view={view} design={design} locale={locale} tour={tour} /></Rise>
          ))}
        </div>
      </section>

      <QuoteStrip view={view} design={design} />
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-16">
        <ClosingCta view={view} design={design} />
        <PriceFootnote />
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * LAGOON — El Gouna. A bright lookbook: asymmetric grid, soft light.
 * ------------------------------------------------------------------ */

function LookCard({ view, design, locale, tour, feature = false, benefits = false }: LayoutProps & { tour: OfferTour; feature?: boolean; benefits?: boolean }) {
  return (
    <BookLink
      view={view}
      locale={locale}
      tour={tour}
      className={`group relative flex overflow-hidden rounded-[1.75rem] bg-white shadow-sm ring-1 ring-black/[0.05] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${feature ? 'flex-col md:col-span-2 md:row-span-2' : 'flex-col'}`}
    >
      <div className={`relative overflow-hidden bg-gray-100 ${feature ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}>
        <TourImage tour={tour} sizes={feature ? '(max-width: 768px) 100vw, 60vw' : '(max-width: 768px) 100vw, 30vw'} />
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold" style={{ color: design.wash }}>
          save {money(view.currencySymbol, tour.saving)}
        </span>
      </div>
      <div className={`flex flex-1 flex-col ${feature ? 'p-7' : 'p-5'}`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: design.wash }}>
          {tour.duration || 'Experience'}{tour.rating !== null && tour.reviewCount > 0 ? ` · ★ ${tour.rating.toFixed(1)} (${tour.reviewCount})` : ''}
        </p>
        <h3 className={`mt-2 font-extrabold leading-snug text-gray-900 ${feature ? 'text-2xl' : 'text-[1.05rem]'}`} style={{ letterSpacing: design.displayTracking }}>{tour.title}</h3>
        <p className={`mt-2 leading-relaxed text-gray-600 ${feature ? 'line-clamp-3 text-base' : 'line-clamp-2 text-sm'}`}>{tour.summary}</p>
        {benefits && <BundleBenefits tour={tour} design={design} />}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <s className="text-[11px] tabular-nums text-gray-400">{money(view.currencySymbol, tour.listPrice)}</s>
            <p className={`font-extrabold tabular-nums text-gray-900 ${feature ? 'text-3xl' : 'text-[1.5rem]'}`}>{money(view.currencySymbol, tour.offerPrice)}</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold text-white transition-all group-hover:gap-2.5" style={{ backgroundColor: view.brandColor }}>Book now <span aria-hidden>→</span></span>
        </div>
      </div>
    </BookLink>
  );
}

function LagoonLayout({ view, design, locale }: LayoutProps) {
  const [copied, copy] = useCopy(view.code);
  const s = view.stats;
  const [feature, ...rest] = view.picks;
  return (
    <>
      <section className="relative overflow-hidden" style={{ backgroundColor: design.paper }}>
        <Aurora color={view.brandColor} className="opacity-40" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            {view.logo && <img src={view.logo} alt={view.siteName} className="h-11 w-auto max-w-[200px] self-start object-contain object-left md:h-12" />}
            <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: design.wash }}>{design.kicker}</p>
            <SplitReveal
              lines={view.firstName ? [`${view.firstName}, ${view.label} off`, design.heroLine] : [`${view.label} off`, design.heroLine]}
              className="mt-5 text-[2.2rem] font-extrabold leading-[1.04] text-gray-900 sm:text-[2.8rem] md:text-[4.1rem] md:leading-[0.98]"
              style={{ fontFamily: design.display, letterSpacing: design.displayTracking }}
            />
            <p className="mt-5 max-w-lg text-base leading-relaxed text-gray-700 sm:text-lg">
              Live {view.siteName} prices with your code already applied — from {money(view.currencySymbol, s.fromPrice)}, saving up to {money(view.currencySymbol, s.maxSaving)} on a single booking.
            </p>
            <Motif design={design} className="mt-6 h-5 w-40" />

            <div className="mt-7 flex flex-wrap items-center gap-4">
              {/* max-w-full + min-w-0 + wrap: the pill may never spill past a
                  narrow phone edge, whatever length the code is (log #463). */}
              <button type="button" onClick={copy} aria-label={`Copy discount code ${view.code}`} className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-full bg-white py-3 pl-5 pr-3 shadow-lg ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 sm:pl-6">
                <span className="min-w-0 break-all text-lg font-extrabold tracking-[0.12em] text-gray-900 sm:text-xl sm:tracking-[0.16em]">{view.code}</span>
                <span className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold text-white" style={{ backgroundColor: copied ? '#15803d' : view.brandColor }}>{copied ? 'Copied ✓' : `−${view.label}`}</span>
              </button>
              {view.expiresAt && <FlipClock expiresAt={view.expiresAt} tone="dark" />}
            </div>

            <ul className="mt-8 grid max-w-lg grid-cols-1 gap-y-2 text-[0.92rem] text-gray-700 sm:grid-cols-2 sm:gap-x-6">
              {TRUST_LINES.map((line) => (
                <li key={line} className="flex items-center gap-2"><span aria-hidden style={{ color: view.brandColor }}>✓</span>{line}</li>
              ))}
            </ul>
            {s.avgRating !== null && s.reviewTotal > 0 && (
              <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-gray-700"><Stars rating={s.avgRating} />{s.avgRating.toFixed(1)} from {s.reviewTotal} traveller reviews</p>
            )}
            <SheenCta href="#tours" background={view.brandColor} className="mt-8 inline-block rounded-full px-8 py-4 text-sm">
              Browse {view.totalCount} experiences ↓
            </SheenCta>
          </div>

          {view.heroImage && (
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.25rem] shadow-[0_50px_90px_-40px_rgba(6,43,51,0.55)] ring-1 ring-black/5 lg:aspect-[3/4]">
              <Image src={view.heroImage} alt={view.heroAlt} fill priority sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover offer-kenburns" />
            </div>
          )}
        </div>
      </section>

      <HowItWorks view={view} design={design} />

      <section id="tours" className="mx-auto max-w-6xl scroll-mt-14 px-6 pt-16">
        <Rise>
          <Heading design={design} index="01" kicker="Save more" title={design.sections.value}>
            Book several and your {view.label} applies to every one.
          </Heading>
        </Rise>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {view.bundles.map((tour, index) => (
            <Rise key={tour.id} delay={Math.min(index, 2) * 90}><LookCard view={view} design={design} locale={locale} tour={tour} benefits /></Rise>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-16">
        <Rise>
          <Heading design={design} index="02" kicker="Shortlist" title={design.sections.picks}>
            Chosen for {view.firstName ?? 'you'} from {view.totalCount} live experiences.
          </Heading>
        </Rise>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          {feature && <Rise key={feature.id}><LookCard view={view} design={design} locale={locale} tour={feature} feature /></Rise>}
          {rest.map((tour, index) => (
            <Rise key={tour.id} delay={Math.min(index, 3) * 80}><LookCard view={view} design={design} locale={locale} tour={tour} /></Rise>
          ))}
        </div>
      </section>

      <QuoteStrip view={view} design={design} />
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16">
        <ClosingCta view={view} design={design} />
        <PriceFootnote />
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Shared section furniture, tinted by the active design.
 * ------------------------------------------------------------------ */

function Heading({
  design,
  index,
  kicker,
  title,
  children,
  centered = false,
}: {
  design: CityDesign;
  index: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className={`flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] ${centered ? 'justify-center' : ''}`} style={{ color: design.wash }}>
        <span aria-hidden className="h-px w-8" style={{ backgroundColor: design.wash, opacity: 0.5 }} />
        {index} · {kicker}
      </p>
      <h2 className="mt-3 text-3xl font-extrabold leading-tight text-gray-900 md:text-4xl" style={{ fontFamily: design.display, letterSpacing: design.displayTracking }}>{title}</h2>
      <p className="mt-2 text-base leading-relaxed text-gray-600">{children}</p>
    </div>
  );
}

function HowItWorks({ view, design }: { view: OfferView; design: CityDesign }) {
  const steps: Array<[string, string]> = [
    ['1 · Pick your tours', 'Every experience below already shows its price with your code applied.'],
    ['2 · Enter your code', `Type or paste ${view.code} at checkout — it is verified server-side.`],
    ['3 · Get instant confirmation', 'Voucher and pickup details arrive by email the moment you book.'],
  ];
  return (
    <section className="border-b" style={{ borderColor: `${design.wash}1f`, backgroundColor: design.surface }}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-y-6 px-6 py-7 sm:grid-cols-3 sm:gap-x-10">
        {steps.map(([title, body]) => (
          <div key={title}>
            <p className="text-sm font-extrabold uppercase tracking-wide" style={{ color: design.wash }}>{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuoteStrip({ view, design }: { view: OfferView; design: CityDesign }) {
  if (view.quotes.length === 0) return null;
  const s = view.stats;
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16">
      <Rise>
        <Heading
          design={design}
          index="03"
          kicker="Traveller words"
          title={`${design.sections.words}${s.avgRating !== null ? ` ${s.avgRating.toFixed(1)}` : ''}`}
        >
          {s.reviewTotal} reviews across these experiences — a few recent ones.
        </Heading>
      </Rise>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {view.quotes.map((quote, index) => (
          <Rise key={`${quote.name}-${index}`} delay={index * 90}>
            <figure className="flex h-full flex-col rounded-3xl p-6 ring-1 ring-black/[0.06]" style={{ backgroundColor: design.surface }}>
              <Stars rating={quote.rating} />
              <blockquote className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-gray-700">“{quote.text}”</blockquote>
              <figcaption className="mt-4 border-t pt-3 text-sm" style={{ borderColor: `${design.wash}1f` }}>
                <span className="font-bold text-gray-900">{quote.name}</span>
                {quote.tourTitle && <span className="block text-xs text-gray-500">{quote.tourTitle}</span>}
              </figcaption>
            </figure>
          </Rise>
        ))}
      </div>
    </section>
  );
}

export const LAYOUTS = {
  marina: MarinaLayout,
  lagoon: LagoonLayout,
} as const;
