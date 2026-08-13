'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { CityDesign } from './design';

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
  tenantId: string;
  firstName: string | null;
  code: string;
  label: string;            // "15%" or "$10"
  expiresAt: string | null;
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

export type LayoutProps = { view: OfferView; design: CityDesign; locale: string };

export const pad = (value: number) => String(Math.max(0, value)).padStart(2, '0');

export function money(symbol: string, value: number): string {
  return `${symbol}${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

export function whatsappHref(view: OfferView): string | null {
  if (!view.contact.whatsapp) return null;
  const text = `Hi! I'm looking at my private offer (code ${view.code}).`;
  return `https://wa.me/${view.contact.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function tourHref(view: OfferView, locale: string, slug: string): string {
  return `/${locale}/tours/${slug}?code=${encodeURIComponent(view.code)}`;
}

export function useRemaining(expiresAt: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!expiresAt) return null;
  return Math.max(0, new Date(expiresAt).getTime() - now);
}

export function useCopy(code: string): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      },
      () => { /* the code stays on screen to copy by hand */ },
    );
  };
  return [copied, copy];
}

/**
 * Seconds are always present: a timer that only moves once a minute reads as
 * frozen to a customer who has just landed.
 */
export function Countdown({
  expiresAt,
  tone = 'light',
  compact = false,
}: {
  expiresAt: string | null;
  tone?: 'light' | 'dark';
  compact?: boolean;
}) {
  const remaining = useRemaining(expiresAt);
  if (remaining === null) return null;
  if (remaining === 0) return <span className="text-sm font-semibold text-red-400">This offer has ended</span>;
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  if (compact) {
    return (
      <span className="font-bold tabular-nums">
        {days > 0 ? `${days}d ` : ''}{pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  }
  const units = days > 0
    ? [{ l: 'days', v: days }, { l: 'hrs', v: hours }, { l: 'min', v: minutes }, { l: 'sec', v: seconds }]
    : [{ l: 'hrs', v: hours }, { l: 'min', v: minutes }, { l: 'sec', v: seconds }];
  const cell = tone === 'light'
    ? 'bg-white/[0.08] ring-1 ring-white/15 text-white'
    : 'bg-black/[0.04] ring-1 ring-black/10 text-gray-900';
  const label = tone === 'light' ? 'text-white/60' : 'text-gray-500';
  return (
    <div aria-live="polite" className="flex items-center gap-1.5">
      {units.map((unit, index) => (
        <div key={unit.l} className="flex items-center gap-1.5">
          {index > 0 && <span className={`pb-4 text-lg font-bold ${tone === 'light' ? 'text-white/30' : 'text-gray-300'}`}>:</span>}
          <span className={`flex w-[3.1rem] flex-col items-center rounded-xl py-2 ${cell}`}>
            <span className="text-[1.35rem] font-extrabold leading-none tabular-nums">{pad(unit.v)}</span>
            <span className={`mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${label}`}>{unit.l}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
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

export function Stars({ rating, className = '' }: { rating: number; className?: string }) {
  return (
    <span aria-label={`${rating} out of 5`} className={`text-amber-400 ${className}`}>
      {'★'.repeat(Math.round(rating))}
      <span className="opacity-30">{'★'.repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

/** City signature drawn in the section rhythm — each archetype gets its own. */
export function Motif({ design, className = '' }: { design: CityDesign; className?: string }) {
  const stroke = design.wash;
  if (design.motif === 'wave') {
    return (
      <svg aria-hidden viewBox="0 0 240 12" className={className} fill="none">
        <path d="M0 6c20-8 40 8 60 0s40-8 60 0 40 8 60 0 40-8 60 0" stroke={stroke} strokeWidth="1.5" opacity="0.5" />
      </svg>
    );
  }
  if (design.motif === 'sun') {
    return (
      <svg aria-hidden viewBox="0 0 120 24" className={className} fill="none">
        <circle cx="60" cy="20" r="10" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
        {[...Array(9)].map((_, index) => (
          <line
            key={index}
            x1={60 + Math.cos(Math.PI + (index * Math.PI) / 8) * 14}
            y1={20 + Math.sin(Math.PI + (index * Math.PI) / 8) * 14}
            x2={60 + Math.cos(Math.PI + (index * Math.PI) / 8) * 19}
            y2={20 + Math.sin(Math.PI + (index * Math.PI) / 8) * 19}
            stroke={stroke}
            strokeWidth="1.5"
            opacity="0.45"
          />
        ))}
      </svg>
    );
  }
  if (design.motif === 'column') {
    return (
      <svg aria-hidden viewBox="0 0 160 16" className={className} fill="none">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <rect key={index} x={index * 20 + 4} y="2" width="6" height="12" rx="1" stroke={stroke} strokeWidth="1.2" opacity="0.45" />
        ))}
      </svg>
    );
  }
  if (design.motif === 'ripple') {
    return (
      <svg aria-hidden viewBox="0 0 120 20" className={className} fill="none">
        {[6, 11, 16].map((radius, index) => (
          <ellipse key={radius} cx="60" cy="10" rx={radius * 2.4} ry={radius / 2} stroke={stroke} strokeWidth="1.2" opacity={0.5 - index * 0.13} />
        ))}
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 200 8" className={className} fill="none">
      <line x1="0" y1="2" x2="200" y2="2" stroke={stroke} strokeWidth="1" opacity="0.5" />
      <line x1="0" y1="6" x2="200" y2="6" stroke={stroke} strokeWidth="2" opacity="0.3" />
    </svg>
  );
}

/** Truth strip: only mechanics the platform genuinely guarantees. */
export const TRUST_LINES = [
  'Code verified & applied at checkout',
  'Instant confirmation to your email',
  'Secure card payment by Stripe',
  'Your planner stays one message away',
] as const;

export function TourImage({ tour, sizes }: { tour: OfferTour; sizes: string }) {
  if (!tour.image) return <div className="flex h-full items-center justify-center text-sm text-gray-400">No photo yet</div>;
  return (
    <Image
      src={tour.image}
      alt={tour.title}
      fill
      sizes={sizes}
      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
    />
  );
}

export function BookLink({
  view,
  locale,
  tour,
  className,
  children,
}: {
  view: OfferView;
  locale: string;
  tour: OfferTour;
  className: string;
  children: ReactNode;
}) {
  return (
    <Link href={tourHref(view, locale, tour.slug)} className={className}>
      {children}
    </Link>
  );
}

/** Mobile action bar — shared mechanic, tinted per city. */
export function StickyBar({ view, design }: { view: OfferView; design: CityDesign }) {
  const remaining = useRemaining(view.expiresAt);
  const [copied, copy] = useCopy(view.code);
  if (remaining === 0) return null;
  const hours = remaining === null ? 0 : Math.floor(remaining / 3_600_000);
  const minutes = remaining === null ? 0 : Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = remaining === null ? 0 : Math.floor((remaining % 60_000) / 1000);
  return (
    <div
      className="fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 backdrop-blur-md md:hidden"
      style={{ backgroundColor: `${design.ink}f2` }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" className="min-w-0 text-left" onClick={copy}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
            {copied ? 'Code copied ✓' : remaining === null ? 'Your private code · tap to copy' : `Ends in ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
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

/** Desktop return bar once the hero (and its code) has scrolled away. */
export function DeskBar({ view, design }: { view: OfferView; design: CityDesign }) {
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
      <div
        className="flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-2.5 shadow-lg backdrop-blur-md"
        style={{ backgroundColor: `${design.ink}e6` }}
      >
        <p className="flex items-center gap-3 text-sm text-white/85">
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-white"
            style={{ backgroundColor: view.brandColor }}
          >
            −{view.label}
          </span>
          <button type="button" onClick={copy} className="font-extrabold tracking-[0.12em] text-white hover:opacity-80" title="Copy code">
            {copied ? 'Copied ✓' : view.code}
          </button>
          {view.expiresAt && (
            <span className="text-white/60">
              ends in <Countdown expiresAt={view.expiresAt} compact />
            </span>
          )}
        </p>
        <a href="#tours" className="rounded-full bg-white px-5 py-2 text-xs font-extrabold text-gray-900 hover:bg-gray-100">
          Browse tours
        </a>
      </div>
    </div>
  );
}

export function ClosingCta({ view, design }: { view: OfferView; design: CityDesign }) {
  const wa = whatsappHref(view);
  return (
    <Reveal>
      <div className="relative overflow-hidden rounded-[2rem] px-8 py-14 text-center md:py-16" style={{ backgroundColor: design.ink }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(55% 70% at 50% 120%, ${view.brandColor}55, transparent 70%)` }}
        />
        <p
          className="relative text-3xl font-extrabold leading-snug text-white md:text-4xl"
          style={{ fontFamily: design.display, letterSpacing: design.displayTracking }}
        >
          Ready when you are{view.firstName ? `, ${view.firstName}` : ''}.
        </p>
        <p className="relative mx-auto mt-4 max-w-xl text-white/75">
          Use code{' '}
          <span className="rounded-md bg-white/15 px-2 py-0.5 font-extrabold tracking-[0.14em] text-white">{view.code}</span>{' '}
          at checkout{view.expiresNice ? ` before ${view.expiresNice}` : ''}. Questions? Your planner answers fast.
        </p>
        <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
          <a href="#tours" className="rounded-full bg-white px-7 py-3 text-sm font-extrabold text-gray-900 transition hover:bg-gray-100">
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
  );
}

export function PriceFootnote() {
  return (
    <p className="mt-8 text-center text-xs text-gray-500">
      Prices are live prices with your code applied. The same discount is re-checked and applied at checkout.
    </p>
  );
}
