'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';

const REDIRECT_DELAY = 3000; // 3 seconds

function RedirectingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const destination = searchParams.get('to') || '/checkout';
  const tourName = searchParams.get('tour') || 'Your Experience';
  const imageSrc = searchParams.get('image') || '/newimage.png!bw700';

  useEffect(() => {
    // Redirect after delay
    const redirectTimer = setTimeout(() => {
      router.push(destination);
    }, REDIRECT_DELAY);

    return () => {
      clearTimeout(redirectTimer);
    };
  }, [router, destination]);

  return (
    <div className="min-h-screen bg-white px-4 py-16 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-3xl text-center space-y-10"
      >
        <div className="relative mx-auto w-56 h-56 md:w-64 md:h-64">
          <motion.div
            className="absolute inset-0 rounded-3xl border border-slate-200/80 shadow-xl bg-white"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-0 rounded-3xl overflow-hidden border border-slate-100">
            <Image
              src={imageSrc}
              alt="Preparing your booking"
              fill
              className="object-cover"
              priority
            />
          </div>
          <motion.div
            className="absolute -bottom-4 inset-x-0 mx-auto w-32 h-6 bg-slate-200 rounded-full"
            animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="space-y-4 px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Securing your booking
          </div>
          <h1 className="text-4xl font-semibold text-slate-900">Preparing {tourName}</h1>
          <p className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto">
            Please hold tight while we confirm availability and finalize your checkout experience. This only takes a few seconds.
          </p>
        </div>

        <div className="px-8">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Estimated time</span>
            <span>~3 seconds</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: REDIRECT_DELAY / 1000, ease: 'easeInOut' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs uppercase tracking-[0.3em]">
          {[0, 0.15, 0.3].map((delay) => (
            <motion.span
              key={delay}
              className="h-3 w-3 rounded-full bg-red-500/70"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 1.1, repeat: Infinity, delay }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default function RedirectingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white px-4 py-16 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Loading...
          </div>
        </div>
      </div>
    }>
      <RedirectingContent />
    </Suspense>
  );
}

