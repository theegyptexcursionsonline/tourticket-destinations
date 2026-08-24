'use client';

import React, { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { safeRelativeRedirect } from '@/lib/security/safeRedirect';

/**
 * The hand-off between "Book" and the checkout page.
 *
 * It used to sit on a hardcoded 3-second `setTimeout` — three seconds of dead
 * time charged to every customer at the exact moment they had decided to pay,
 * advertised to them as "~3 seconds". The wait bought nothing: checkout was
 * never being prepared during it.
 *
 * Now the destination is prefetched on mount and the customer is moved as soon
 * as it is ready. A short floor keeps the screen from flashing past unread;
 * a ceiling guarantees the page never becomes a dead end even if the prefetch
 * stalls, and a real link appears if navigation is somehow blocked.
 */
const MIN_VISIBLE_MS = 400;   // long enough to read, short enough not to wait
const MAX_WAIT_MS = 2000;     // hard ceiling: never hold a paying customer longer
const MANUAL_LINK_MS = 1200;  // if we are still here, offer a way through

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * useSyncExternalStore, not an effect: matchMedia is an external store, and
 * seeding it with setState inside an effect costs a cascading render on a
 * screen whose whole job is to be quick.
 */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

function RedirectingContent() {
  const t = useTranslations('redirectingPage');
  const router = useRouter();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion();

  const destination = safeRelativeRedirect(searchParams.get('to'), '/checkout');
  const tourName = searchParams.get('tour') || t('defaultTourName');
  // The tour the customer is actually buying, when the caller passes it.
  // No stock filler: an empty frame beats someone else's photo.
  const tourImage = searchParams.get('image');

  const [showManualLink, setShowManualLink] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    const go = () => {
      if (navigated.current) return;
      navigated.current = true;
      // replace, not push: Back from checkout must reach the tour, not bounce
      // the customer through this screen again.
      router.replace(destination);
    };

    router.prefetch(destination);

    const floor = setTimeout(go, MIN_VISIBLE_MS);
    const ceiling = setTimeout(go, MAX_WAIT_MS);
    const manual = setTimeout(() => setShowManualLink(true), MANUAL_LINK_MS);

    return () => {
      clearTimeout(floor);
      clearTimeout(ceiling);
      clearTimeout(manual);
    };
  }, [router, destination]);

  const animate = !reducedMotion;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-16 flex items-center justify-center">
      {/* Brand aurora. Two blurred gradient fields, no image request. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -top-32 -left-24 h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-red-500/35 via-orange-500/25 to-transparent blur-3xl ${animate ? 'animate-[drift_14s_ease-in-out_infinite]' : ''}`}
        />
        <div
          className={`absolute -bottom-40 -right-20 h-[34rem] w-[34rem] rounded-full bg-gradient-to-tr from-amber-400/25 via-rose-500/20 to-transparent blur-3xl ${animate ? 'animate-[drift_18s_ease-in-out_infinite_reverse]' : ''}`}
        />
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`relative w-full max-w-xl text-center ${animate ? 'animate-[rise_500ms_cubic-bezier(0.16,1,0.3,1)_both]' : ''}`}
      >
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
          {/* The tour itself, or a drawn scene — never foreign stock art. */}
          <div className="relative mx-auto mb-8 h-32 w-32 sm:h-36 sm:w-36">
            <div
              className={`absolute -inset-3 rounded-full bg-gradient-to-tr from-red-500 via-orange-400 to-amber-300 opacity-70 blur-lg ${animate ? 'animate-pulse' : ''}`}
              aria-hidden
            />
            <div className="relative h-full w-full overflow-hidden rounded-full border border-white/25 bg-slate-900 shadow-xl">
              {tourImage ? (
                <Image src={tourImage} alt={t('imageAlt')} fill sizes="144px" className="object-cover" priority />
              ) : (
                <BoardingPassMark animate={animate} />
              )}
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
            <span className={`h-1.5 w-1.5 rounded-full bg-emerald-400 ${animate ? 'animate-pulse' : ''}`} />
            {t('badge')}
          </div>

          <h1 className="mt-5 text-2xl sm:text-3xl font-semibold leading-tight text-white text-balance">
            {t('title', { tourName })}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm sm:text-base leading-relaxed text-slate-300/90">
            {t('description')}
          </p>

          {/* An indeterminate sweep. The old bar animated to 100% over exactly
              three seconds, which turned a progress indicator into a countdown
              for work that was not happening. */}
          <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
            <div
              className={`h-full w-1/3 rounded-full bg-gradient-to-r from-red-500 via-orange-400 to-amber-300 ${animate ? 'animate-[sweep_1.1s_ease-in-out_infinite]' : 'w-full'}`}
            />
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            <ShieldMark />
            {t('secureNote')}
          </div>

          {/* Never a dead end: if we are still here, the customer gets a door. */}
          <a
            href={destination}
            className={`mt-6 inline-block text-sm font-semibold text-orange-300 underline underline-offset-4 transition-opacity hover:text-orange-200 ${showManualLink ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            {t('continueManually')}
          </a>
        </div>
      </div>

      <style jsx global>{`
        @keyframes sweep {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(410%); }
        }
        @keyframes drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(2rem, 1.5rem, 0) scale(1.08); }
        }
        @keyframes rise {
          from { opacity: 0; transform: translate3d(0, 12px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[sweep_1\\.1s_ease-in-out_infinite\\],
          .animate-\\[drift_14s_ease-in-out_infinite\\],
          .animate-\\[drift_18s_ease-in-out_infinite_reverse\\],
          .animate-\\[rise_500ms_cubic-bezier\\(0\\.16\\,1\\,0\\.3\\,1\\)_both\\] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/** Drawn, not photographed: a boarding-pass mark in the brand's own colours. */
function BoardingPassMark({ animate }: { animate: boolean }) {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" role="presentation" aria-hidden>
      <defs>
        <linearGradient id="rp-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="rp-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="55%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#fcd34d" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" fill="url(#rp-sky)" />
      <path d="M8 62c14-6 22-2 30-8s10-18 22-22" stroke="url(#rp-brand)" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.55" strokeDasharray="4 6" />
      <g transform="translate(30 26)">
        <path
          d="M18 2c1.7 0 3 1.3 3 3v13.6l14 8.2v3.6l-14-4.2v10.2l4.6 3.2v3.2L18 41.4l-7.6 1.4v-3.2l4.6-3.2V26.2L1 30.4v-3.6l14-8.2V5c0-1.7 1.3-3 3-3z"
          fill="url(#rp-brand)"
        >
          {animate && (
            <animateTransform attributeName="transform" type="translate" values="0 1.5; 0 -1.5; 0 1.5" dur="3.2s" repeatCount="indefinite" />
          )}
        </path>
      </g>
      <circle cx="70" cy="24" r="2.5" fill="#fcd34d" opacity="0.8" />
      <circle cx="20" cy="20" r="1.6" fill="#fb923c" opacity="0.6" />
      <circle cx="76" cy="70" r="1.8" fill="#ef4444" opacity="0.5" />
    </svg>
  );
}

function ShieldMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2l7 3v6c0 5-3.4 8.6-7 11-3.6-2.4-7-6-7-11V5l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RedirectingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 px-5 py-16 flex items-center justify-center">
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-red-500 via-orange-400 to-amber-300" />
      </div>
    </div>
  );
}

export default function RedirectingPage() {
  return (
    <Suspense fallback={<RedirectingFallback />}>
      <RedirectingContent />
    </Suspense>
  );
}
