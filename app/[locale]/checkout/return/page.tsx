'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock3, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { clearCheckoutAttemptId } from '@/lib/checkout/checkoutAttempt';

type CheckoutStatus = 'loading' | 'confirmed' | 'processing' | 'open' | 'expired' | 'refunded' | 'error';

function HostedCheckoutReturnContent() {
  const searchParams = useSearchParams();
  const params = useParams<{ locale?: string }>();
  const sessionId = searchParams.get('session_id') || '';
  const locale = typeof params.locale === 'string' ? params.locale : 'en';
  const [status, setStatus] = useState<CheckoutStatus>('loading');
  const [references, setReferences] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const { clearCart } = useCart();

  const checkStatus = useCallback(async (signal?: AbortSignal) => {
    if (!sessionId) {
      setStatus('error');
      setMessage('This checkout confirmation link is invalid.');
      return;
    }
    try {
      const response = await fetch(`/api/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`, {
        cache: 'no-store',
        signal,
      });
      const payload = await response.json() as {
        success?: boolean;
        status?: CheckoutStatus;
        bookingReferences?: string[];
        message?: string;
      };
      if (!response.ok || payload.success !== true || !payload.status) {
        throw new Error(payload.message || 'Booking confirmation could not be loaded.');
      }
      setStatus(payload.status);
      setReferences(Array.isArray(payload.bookingReferences) ? payload.bookingReferences : []);
      setMessage('');
    } catch (error) {
      if (signal?.aborted) return;
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Booking confirmation could not be loaded.');
    }
  }, [sessionId]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void checkStatus(controller.signal));
    return () => controller.abort();
  }, [attempt, checkStatus]);

  useEffect(() => {
    if (status !== 'processing' && status !== 'open') return;
    const delay = attempt < 12 ? 2_500 : attempt < 36 ? 5_000 : 20_000;
    const timeout = window.setTimeout(() => setAttempt((value) => value + 1), delay);
    return () => window.clearTimeout(timeout);
  }, [status, attempt]);

  useEffect(() => {
    if (status !== 'confirmed') return;
    clearCheckoutAttemptId();
    clearCart();
  }, [status, clearCart]);

  const content = status === 'confirmed'
    ? {
        icon: <CheckCircle2 className="h-12 w-12 text-emerald-600" />,
        eyebrow: 'Payment confirmed',
        title: 'Your booking is confirmed',
        body: 'Stripe confirmed your payment and your booking is safely recorded. A confirmation email is on its way.',
      }
    : status === 'expired'
      ? {
          icon: <Clock3 className="h-12 w-12 text-amber-600" />,
          eyebrow: 'Checkout expired',
          title: 'No payment was completed',
          body: 'This Stripe Checkout session expired before payment. You can return to the tours and start again.',
        }
      : status === 'refunded'
        ? {
            icon: <AlertCircle className="h-12 w-12 text-amber-600" />,
            eyebrow: 'Payment returned',
            title: 'Your payment was safely refunded',
            body: 'We could not safely create this booking, so the payment was returned automatically. Contact support if you need help.',
          }
        : status === 'error'
          ? {
              icon: <AlertCircle className="h-12 w-12 text-red-600" />,
              eyebrow: 'Confirmation unavailable',
              title: 'We could not confirm this booking yet',
              body: message || 'Please retry. If you were charged, do not pay again—contact support with your Stripe receipt.',
            }
          : {
              icon: <Loader2 className="h-12 w-12 animate-spin text-red-600" />,
              eyebrow: 'Secure payment received',
              title: 'Finalizing your booking',
              body: 'Stripe is confirming the payment with our booking system. Keep this page open; it will update automatically.',
            };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:py-20">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-slate-950 px-6 py-7 text-white sm:px-9">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            <ShieldCheck size={16} /> Stripe secure checkout
          </div>
          <p className="mt-3 text-sm text-slate-300">Verified booking confirmation</p>
        </div>
        <div className="px-6 py-9 text-center sm:px-10 sm:py-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">{content.icon}</div>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-red-600">{content.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{content.title}</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">{content.body}</p>

          {references.length > 0 && (
            <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Booking reference{references.length > 1 ? 's' : ''}</p>
              <p className="mt-2 text-lg font-black text-emerald-950">{references.join(' · ')}</p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {status === 'error' && (
              <button
                type="button"
                onClick={() => { setStatus('loading'); setAttempt((value) => value + 1); }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white"
              >
                <RefreshCw size={17} /> Check again
              </button>
            )}
            {(['confirmed', 'expired', 'refunded'] as CheckoutStatus[]).includes(status) && (
              <Link
                href={`/${locale}`}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-extrabold text-white"
              >
                Return to experiences
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function HostedCheckoutReturnPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-red-600" /></main>}>
      <HostedCheckoutReturnContent />
    </Suspense>
  );
}
