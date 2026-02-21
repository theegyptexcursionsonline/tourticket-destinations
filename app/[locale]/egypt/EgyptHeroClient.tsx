// app/egypt/EgyptHeroClient.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';

export default function EgyptHeroClient() {
  const bgRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScrollRef = useRef<number>(0);
  const [, setLoaded] = useState(false);

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const onScroll = () => {
      lastScrollRef.current = window.scrollY || window.pageYOffset;
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(updateParallax);
    };
    const updateParallax = () => {
      const el = bgRef.current;
      if (el) {
        const scroll = lastScrollRef.current;
        const y = Math.max(Math.min(scroll * 0.12, 120), -40);
        el.style.transform = `translate3d(0, ${y}px, 0) scale(1.02)`;
      }
      rafRef.current = null;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [prefersReducedMotion]);

  return (
    <section className="relative overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          ref={bgRef}
          className="absolute inset-0 will-change-transform transition-transform duration-700 ease-out"
          aria-hidden
          style={{ transform: 'translate3d(0,0,0) scale(1.02)' }}
        >
          <Image
            src="/hero3.png"
            alt="Pyramids and Nile"
            fill
            className="object-cover object-center"
            priority
            sizes="(min-width:1024px) 1200px, 100vw"
          />

          {/* cinematic overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0.55)_0%,_rgba(0,0,0,0.0)_45%)] pointer-events-none" />
          <div className="absolute inset-0 bg-noise opacity-6 pointer-events-none" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 md:px-8 pt-32 md:pt-48 pb-28 md:pb-40">
        <div className="max-w-4xl mx-auto text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              <span className="block text-amber-300/95">Discover Egypt</span>
              <span className="block text-white text-2xl sm:text-3xl font-medium mt-2">
                Nile journeys, ancient wonders & timeless stories
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-amber-100/95 max-w-3xl mx-auto leading-relaxed">
              Sail the Nile at sunset, walk among the pyramids at dawn — curated luxury experiences that blend history, culture, and comfort.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/egypt"
                className="inline-flex items-center gap-3 px-12 py-4 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-semibold shadow-2xl hover:scale-[1.02] transition"
              >
                <span>Explore Egypt</span>
                <ArrowRight size={18} />
              </Link>

              <Link
                href="/egypt-video"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-black/45 border border-white/10 text-white font-medium shadow backdrop-blur-sm hover:bg-black/30 transition"
              >
                <Play size={16} />
                <span>Watch Video</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <noscript>
        <div className="absolute inset-0">
          <Image src="/hero3.png" alt="Pyramids of Egypt" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
      </noscript>

      <style jsx global>{`
        .bg-noise {
          background-image:
            radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            radial-gradient(rgba(0,0,0,0.02) 1px, transparent 1px);
          background-position: 0 0, 8px 8px;
          background-size: 16px 16px;
        }
        @media (prefers-reduced-motion: reduce) {
          .will-change-transform, .transition-transform { transition: none !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
}
