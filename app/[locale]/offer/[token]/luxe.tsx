'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** One place to ask whether motion is welcome. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

function useInView<T extends HTMLElement>(rootMargin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setSeen(true);
        observer.disconnect();
      }
    }, { rootMargin });
    observer.observe(node);
    // Content must never stay hidden if observation never fires.
    const failSafe = setTimeout(() => setSeen(true), 1400);
    return () => { observer.disconnect(); clearTimeout(failSafe); };
  }, [rootMargin]);
  return [ref, seen] as const;
}

/** Reading-position bar. Thin, brand-tinted, never in the way. */
export function ScrollProgress({ color }: { color: string }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div
        className="h-full origin-left transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})`, background: `linear-gradient(90deg, transparent, ${color}, #ffffff)` }}
      />
    </div>
  );
}

/** Film grain: stops large flat gradients from looking like plastic. */
export function Grain({ opacity = 0.06 }: { opacity?: number }) {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full mix-blend-overlay" style={{ opacity }}>
      <filter id="offer-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#offer-grain)" />
    </svg>
  );
}

/** Soft brand-coloured light sources behind hero content. */
export function Aurora({ color, className = '' }: { color: string; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute -left-24 top-[-18%] h-[38rem] w-[38rem] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${color}59, transparent 68%)` }}
      />
      <div
        className="absolute -right-32 bottom-[-28%] h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${color}40, transparent 70%)` }}
      />
    </div>
  );
}

/** Hero photography with a slow push-in; stills for reduced motion. */
export function KenBurns({
  src,
  alt,
  className = '',
  parallax = true,
}: {
  src: string;
  alt: string;
  className?: string;
  parallax?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (reduced || !parallax) return;
    const onScroll = () => setOffset(Math.min(120, window.scrollY * 0.18));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [reduced, parallax]);
  return (
    <div aria-hidden className={`absolute inset-0 z-0 overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 will-change-transform"
        style={{ transform: `translate3d(0, ${offset}px, 0)`, transition: 'transform 120ms linear' }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority
          sizes="100vw"
          className={`object-cover ${reduced ? '' : 'offer-kenburns'}`}
        />
      </div>
    </div>
  );
}

/**
 * Headline reveal: each line rises from behind its own mask. This is the first
 * thing a customer sees, so it is the one place worth spending motion on.
 */
export function SplitReveal({
  lines,
  className = '',
  style,
  delay = 0,
}: {
  lines: string[];
  className?: string;
  style?: CSSProperties;
  delay?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(timer);
  }, []);
  return (
    <h1 className={className} style={style}>
      {lines.map((line, index) => (
        <span key={line + index} className="block overflow-hidden">
          <span
            className="block will-change-transform"
            style={{
              transform: reduced || shown ? 'translateY(0)' : 'translateY(110%)',
              opacity: reduced || shown ? 1 : 0,
              transition: reduced ? 'none' : 'transform 900ms cubic-bezier(0.16,1,0.3,1), opacity 700ms ease-out',
              transitionDelay: `${delay + index * 110}ms`,
            }}
          >
            {line}
          </span>
        </span>
      ))}
    </h1>
  );
}

/** A digit that flips when it changes — the timer reads alive, not printed. */
export function FlipDigit({ value, className = '' }: { value: string; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const [flipping, setFlipping] = useState(false);
  useEffect(() => {
    if (value === display) return;
    if (reduced) return setDisplay(value);
    setFlipping(true);
    const timer = setTimeout(() => {
      setDisplay(value);
      setFlipping(false);
    }, 130);
    return () => clearTimeout(timer);
  }, [value, display, reduced]);
  return (
    <span
      className={`inline-block tabular-nums will-change-transform ${className}`}
      style={{
        transform: flipping ? 'translateY(-38%) rotateX(52deg)' : 'translateY(0) rotateX(0deg)',
        opacity: flipping ? 0.35 : 1,
        transition: reduced ? 'none' : 'transform 130ms ease-in, opacity 130ms ease-in',
      }}
    >
      {display}
    </span>
  );
}

/** Money that counts up once, when it scrolls into view. */
export function CountUp({
  value,
  format,
  className = '',
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced) { setShown(value); return; }
    let frame = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [seen, value, reduced]);
  return <span ref={ref} className={`tabular-nums ${className}`}>{format(shown)}</span>;
}

/** Primary action with a light sweep — the page's most important pixel. */
export function SheenCta({
  href,
  children,
  background,
  className = '',
  onClick,
}: {
  href?: string;
  children: ReactNode;
  background: string;
  className?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
      <span aria-hidden className="offer-sheen offer-sheen-auto pointer-events-none absolute inset-0 z-0" />
    </>
  );
  const base = `group relative isolate overflow-hidden text-center font-extrabold text-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 ${className}`;
  if (href) {
    return (
      <a href={href} className={base} style={{ backgroundColor: background }} onClick={onClick}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={base} style={{ backgroundColor: background }} onClick={onClick}>
      {content}
    </button>
  );
}

/** Section entrance: content rises and settles, staggered by index. */
export function Rise({
  children,
  delay = 0,
  distance = 22,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{
        transform: reduced || seen ? 'translateY(0) scale(1)' : `translateY(${distance}px) scale(0.985)`,
        opacity: reduced || seen ? 1 : 0,
        transition: reduced ? 'none' : 'transform 760ms cubic-bezier(0.16,1,0.3,1), opacity 620ms ease-out',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Exit-intent rescue. When the cursor leaves through the top of the viewport —
 * the close-tab gesture — offer the code one last time. Once per session per
 * code, desktop pointers only, honest content only (the real code, the real
 * countdown, the real planner contact). Escape or the backdrop dismisses it.
 */
export function ExitRescue({
  code,
  label,
  color,
  expiresAt,
  firstName,
  whatsappHref,
  onCopy,
  copied,
}: {
  code: string;
  label: string;
  color: string;
  expiresAt: string | null;
  firstName: string | null;
  whatsappHref: string | null;
  onCopy: () => void;
  copied: boolean;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const key = `offer-exit-shown:${code}`;
    if (window.sessionStorage.getItem(key)) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const onOut = (event: MouseEvent) => {
      if (event.clientY > 0 || event.relatedTarget) return;
      window.sessionStorage.setItem(key, '1');
      setOpen(true);
      window.removeEventListener('mouseout', onOut);
    };
    window.addEventListener('mouseout', onOut);
    return () => window.removeEventListener('mouseout', onOut);
  }, [code]);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your discount is still available"
        className="relative w-full max-w-md rounded-[1.75rem] bg-white p-8 text-center shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          ×
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-500">Before you go</p>
        <p className="mt-3 text-2xl font-extrabold leading-snug text-gray-900">
          {firstName ? `${firstName}, your ${label} is still yours.` : `Your ${label} is still yours.`}
        </p>
        {expiresAt && (
          <p className="mt-2 text-sm text-gray-600">
            It ends in <ExitCountdown expiresAt={expiresAt} /> — after that the code stops working.
          </p>
        )}
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy discount code ${code}`}
          className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-4 text-left transition hover:border-gray-400"
        >
          <span className="text-xl font-extrabold tracking-[0.16em] text-gray-900">{code}</span>
          <span className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white" style={{ backgroundColor: copied ? '#15803d' : color }}>
            {copied ? 'Copied ✓' : 'Copy code'}
          </span>
        </button>
        <a
          href="#tours"
          onClick={() => setOpen(false)}
          className="offer-sheen-host group relative mt-4 block w-full overflow-hidden rounded-2xl py-3.5 text-center text-[15px] font-extrabold text-white shadow-lg transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: color }}
        >
          <span className="relative z-10">Keep browsing with {label} off</span>
          <span aria-hidden className="offer-sheen offer-sheen-auto pointer-events-none absolute inset-0 z-0" />
        </a>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-sm font-semibold text-gray-600 underline-offset-4 hover:underline"
          >
            Not sure? Ask your planner on WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

function ExitCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const pad2 = (v: number) => String(v).padStart(2, '0');
  return (
    <strong className="tabular-nums">
      {days > 0 ? `${days}d ${pad2(hours)}:${pad2(minutes)}` : `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`}
    </strong>
  );
}

/** Always-there code rail on desktop, so the offer is never more than a glance away. */
export function CodeRail({
  code,
  label,
  color,
  onCopy,
  copied,
}: {
  code: string;
  label: string;
  color: string;
  onCopy: () => void;
  copied: boolean;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 620);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy discount code ${code}`}
      className={`fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 rounded-full border border-white/15 bg-black/70 px-3 py-5 backdrop-blur-md transition-all duration-500 xl:flex ${visible ? 'translate-x-0 opacity-100' : 'translate-x-24 opacity-0'}`}
    >
      <span className="rounded-full px-2 py-1 text-[10px] font-extrabold text-white" style={{ backgroundColor: color }}>−{label}</span>
      <span className="text-[11px] font-bold tracking-[0.3em] text-white [writing-mode:vertical-rl]">{copied ? 'COPIED ✓' : code}</span>
    </button>
  );
}
