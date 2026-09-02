'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, Loader2, Lock, ShieldCheck, X } from 'lucide-react';
import { clearCheckoutAttemptId, getOrCreateCheckoutAttemptId } from '@/lib/checkout/checkoutAttempt';
import type { PaymentExperience } from '@/lib/checkout/paymentExperience';
import { isAllowedStripeCheckoutUrl } from '@/lib/checkout/stripeCheckoutDestination';
import { useStorefrontTheme } from '@/contexts/StorefrontThemeContext';
import {
  isAuthoritativePriceQuote,
  type AuthoritativePriceQuote,
} from '@/lib/cart/authoritativeCart';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

type Customer = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  emergencyContact?: string;
  hotelPickupDetails?: string;
  hotelPickupLocation?: { address?: string; lat: number; lng: number; placeId?: string; name?: string } | null;
  specialRequests?: string;
};

export interface StripePaymentFormProps {
  amount: number;
  currency: string;
  customer: Customer;
  cart: Array<Record<string, unknown>>;
  pricing: Record<string, any>;
  discountCode?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onPriceChanged: (quote: AuthoritativePriceQuote) => Promise<boolean> | boolean;
  experience?: PaymentExperience;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function PriceChangeReview({
  quote,
  accepting,
  error,
  onAccept,
}: {
  quote: AuthoritativePriceQuote;
  accepting: boolean;
  error: string;
  onAccept: () => void;
}) {
  const formatPrice = (price: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: quote.currency,
  }).format(price);

  return (
    <div role="alert" aria-live="assertive" className="overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-sm">
      <div className="flex items-start gap-3 bg-amber-50 px-5 py-4">
        <AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={22} aria-hidden="true" />
        <div>
          <p className="font-extrabold text-slate-950">Your price was updated</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            The price changed before payment. You have not been charged. Review and accept the server-verified quote to continue.
          </p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{quote.tourTitle || 'Selected experience'}</p>
          <p className="mt-1 text-sm text-slate-600">{quote.date} at {quote.time} · {quote.currency}</p>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            {(['adult', 'child', 'infant'] as const).map((guestType) => (
              <div key={guestType} className="rounded-lg bg-white px-3 py-3 ring-1 ring-slate-200">
                <dt className="text-[11px] font-semibold capitalize text-slate-500">{guestType}</dt>
                <dd className="mt-1 text-sm font-extrabold text-slate-900">{formatPrice(quote.prices[guestType])}</dd>
              </div>
            ))}
          </dl>
        </div>
        {error && <p role="status" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
        <button
          type="button"
          onClick={onAccept}
          disabled={accepting}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {accepting ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
          {accepting ? 'Saving updated quote…' : 'Accept updated price & continue'}
        </button>
        <p className="text-center text-xs text-slate-500">Payment is prepared only after you accept this quote.</p>
      </div>
    </div>
  );
}

function PaymentFields({
  onSuccess,
  onError,
  processing,
  setProcessing,
}: {
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
  processing: boolean;
  setProcessing: (value: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const submit = async () => {
    if (!stripe || !elements || processing) return;
    setProcessing(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });
      if (result.error) {
        onError(result.error.message || 'Payment failed. Please try another payment method.');
      } else if (result.paymentIntent?.status === 'succeeded') {
        clearCheckoutAttemptId();
        onSuccess(result.paymentIntent.id);
      } else {
        onError('Stripe is still processing this payment. Please wait and try again.');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Payment could not be completed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="button"
        disabled={!stripe || processing}
        onClick={() => void submit()}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
      >
        {processing ? <Loader2 className="animate-spin" size={20} /> : <Lock size={18} />}
        {processing ? 'Processing payment…' : 'Complete payment'}
      </button>
      <p className="text-center text-xs text-slate-500">Stripe securely handles the payment details. This website never stores your card number.</p>
    </div>
  );
}

function PaymentPanel({
  customer,
  cart,
  pricing,
  discountCode,
  experience: _experience,
  onSuccess,
  onError,
  onPriceChanged,
  onProcessingChange,
}: StripePaymentFormProps & {
  experience: 'inline' | 'modal';
  onProcessingChange: (value: boolean) => void;
}) {
  const { resolvedTheme } = useStorefrontTheme();
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [pendingPriceChange, setPendingPriceChange] = useState<AuthoritativePriceQuote | null>(null);
  const [acceptingPriceChange, setAcceptingPriceChange] = useState(false);
  const [priceChangeError, setPriceChangeError] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);
  const customerPayload = useMemo(() => ({
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    emergencyContact: customer.emergencyContact,
    hotelPickupDetails: customer.hotelPickupDetails,
    hotelPickupLocation: customer.hotelPickupLocation,
    specialRequests: customer.specialRequests,
  }), [customer]);
  const requestSignature = useMemo(() => JSON.stringify({ customer: customerPayload, cart, pricing, discountCode }), [customerPayload, cart, pricing, discountCode]);

  const setBusy = useCallback((value: boolean) => {
    setProcessing(value);
    onProcessingChange(value);
  }, [onProcessingChange]);

  useEffect(() => {
    if (pendingPriceChange) {
      setLoading(false);
      return;
    }
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerPayload.email);
    if (!customerPayload.firstName || !customerPayload.lastName || !customerPayload.phone || !emailValid || cart.length === 0 || Number(pricing.total) <= 0) {
      setLoading(false);
      setClientSecret('');
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const checkoutAttemptId = getOrCreateCheckoutAttemptId();
        const response = await fetch('/api/checkout/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer: customerPayload, cart, pricing, discountCode, checkoutAttemptId }),
        });
        const payload = await response.json() as { success?: boolean; clientSecret?: string; code?: string; message?: string; quote?: unknown };
        if (response.status === 409 && payload.code === 'PRICE_CHANGED' && isAuthoritativePriceQuote(payload.quote)) {
          if (active) {
            setClientSecret('');
            setPendingPriceChange(payload.quote);
            setPriceChangeError('');
          }
          return;
        }
        if (!response.ok || payload.success !== true || !payload.clientSecret) {
          throw new Error(payload.message || 'Secure payment could not be prepared.');
        }
        if (active) setClientSecret(payload.clientSecret);
      } catch (error) {
        if (active) {
          setClientSecret('');
          onError(error instanceof Error ? error.message : 'Secure payment could not be prepared.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 500);
    return () => { active = false; window.clearTimeout(timer); };
    // The serialized signature deliberately owns retries; using object identity
    // here would create a new PaymentIntent on every checkout render.
  }, [requestSignature, customerPayload, cart, pricing, discountCode, onError, pendingPriceChange, retryNonce]);

  const acceptUpdatedPrice = async () => {
    if (!pendingPriceChange || acceptingPriceChange) return;
    setAcceptingPriceChange(true);
    setPriceChangeError('');
    try {
      const accepted = await onPriceChanged(pendingPriceChange);
      if (!accepted) {
        setPriceChangeError('We could not save the updated quote. Your original cart is unchanged. Please try again.');
        return;
      }
      setClientSecret('');
      setPendingPriceChange(null);
      setLoading(true);
      setRetryNonce((current) => current + 1);
    } catch {
      setPriceChangeError('We could not save the updated quote. Your original cart is unchanged. Please try again.');
    } finally {
      setAcceptingPriceChange(false);
    }
  };

  if (pendingPriceChange) {
    return (
      <PriceChangeReview
        quote={pendingPriceChange}
        accepting={acceptingPriceChange}
        error={priceChangeError}
        onAccept={() => void acceptUpdatedPrice()}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-center" role="status">
        <Loader2 className="animate-spin text-red-600" size={28} />
        <p className="font-semibold text-slate-900">Preparing secure payment</p>
        <p className="text-sm text-slate-500">Connecting to Stripe and confirming the current total.</p>
      </div>
    );
  }
  if (!clientSecret || !stripePromise) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5" role="alert">
        <div className="flex items-center gap-2 font-semibold text-red-700"><AlertCircle size={20} /> Secure payment is unavailable</div>
        <p className="mt-2 text-sm text-red-700/80">Check your contact details, then try again. If the problem continues, contact support.</p>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: resolvedTheme === 'dark' ? 'night' as const : 'stripe' as const,
      inputs: 'spaced' as const,
      labels: 'above' as const,
      variables: {
        colorPrimary: '#dc2626', colorBackground: resolvedTheme === 'dark' ? '#111827' : '#ffffff', colorText: resolvedTheme === 'dark' ? '#f8fafc' : '#0f172a', colorDanger: '#dc2626',
        colorSuccess: '#059669', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontSizeBase: '16px', spacingUnit: '4px', borderRadius: '12px',
      },
      rules: {
        '.Input': { border: resolvedTheme === 'dark' ? '1px solid #475569' : '1px solid #cbd5e1', padding: '13px 14px' },
        '.Input:focus': { borderColor: '#dc2626', boxShadow: '0 0 0 3px rgba(220,38,38,.14)' },
        '.Label': { color: resolvedTheme === 'dark' ? '#e2e8f0' : '#334155', fontSize: '14px', fontWeight: '600' },
        '.Tab': { border: resolvedTheme === 'dark' ? '1px solid #475569' : '1px solid #e2e8f0', boxShadow: 'none', padding: '11px 14px' },
        '.Tab--selected': { borderColor: '#dc2626', boxShadow: '0 0 0 1px #dc2626' },
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFields onSuccess={onSuccess} onError={onError} processing={processing} setProcessing={setBusy} />
    </Elements>
  );
}

function HostedLauncher({ amount, currency, customer, cart, pricing, discountCode, onError, onPriceChanged }: StripePaymentFormProps) {
  const [redirecting, setRedirecting] = useState(false);
  const [pendingPriceChange, setPendingPriceChange] = useState<AuthoritativePriceQuote | null>(null);
  const [acceptingPriceChange, setAcceptingPriceChange] = useState(false);
  const [priceChangeError, setPriceChangeError] = useState('');
  const valid = Boolean(customer.firstName && customer.lastName && customer.phone && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email));
  const total = new Intl.NumberFormat('en-US', { style: 'currency', currency: String(pricing.currency || currency || 'USD') }).format(Number(pricing.total ?? amount ?? 0));

  const start = async () => {
    if (!valid || redirecting) return;
    setRedirecting(true);
    try {
      const localeCandidate = window.location.pathname.split('/').filter(Boolean)[0] || 'en';
      const locale = ['en', 'de', 'es', 'fr', 'ru'].includes(localeCandidate) ? localeCandidate : 'en';
      const checkoutAttemptId = getOrCreateCheckoutAttemptId();
      const response = await fetch('/api/checkout/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, cart, pricing, discountCode, checkoutAttemptId, locale }),
      });
      const payload = await response.json() as { success?: boolean; url?: unknown; code?: string; message?: string; quote?: unknown };
      if (response.status === 409 && payload.code === 'PRICE_CHANGED' && isAuthoritativePriceQuote(payload.quote)) {
        setPendingPriceChange(payload.quote);
        setPriceChangeError('');
        setRedirecting(false);
        return;
      }
      if (!response.ok || payload.success !== true || !isAllowedStripeCheckoutUrl(payload.url)) {
        throw new Error(payload.message || 'Stripe Checkout could not be opened.');
      }
      window.location.assign(String(payload.url));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Stripe Checkout could not be opened.');
      setRedirecting(false);
    }
  };

  const acceptUpdatedPrice = async () => {
    if (!pendingPriceChange || acceptingPriceChange) return;
    setAcceptingPriceChange(true);
    setPriceChangeError('');
    try {
      const accepted = await onPriceChanged(pendingPriceChange);
      if (!accepted) {
        setPriceChangeError('We could not save the updated quote. Your original cart is unchanged. Please try again.');
        return;
      }
      setPendingPriceChange(null);
    } catch {
      setPriceChangeError('We could not save the updated quote. Your original cart is unchanged. Please try again.');
    } finally {
      setAcceptingPriceChange(false);
    }
  };

  if (pendingPriceChange) {
    return (
      <PriceChangeReview
        quote={pendingPriceChange}
        accepting={acceptingPriceChange}
        error={priceChangeError}
        onAccept={() => void acceptUpdatedPrice()}
      />
    );
  }

  return (
    <section data-testid="hosted-payment-experience" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><ArrowRight size={23} /></div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-950">Continue to Stripe Checkout</h3>
            <p className="mt-1 max-w-lg text-sm leading-6 text-slate-500">Pay on Stripe’s secure hosted page, then return here for verified booking status.</p>
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Total due</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{total}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void start()}
        disabled={!valid || redirecting}
        className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
      >
        {redirecting ? <Loader2 className="animate-spin" size={19} /> : <Lock size={18} />}
        {redirecting ? 'Opening Stripe Checkout…' : 'Pay securely with Stripe'}
        {!redirecting && <ArrowRight size={18} />}
      </button>
      {!valid && <p className="mt-3 text-center text-sm text-slate-500">Complete your name, email, and phone number to continue.</p>}
      <p className="mt-3 text-center text-xs text-slate-400">Cards, Link, and eligible wallets are shown by Stripe for this device.</p>
    </section>
  );
}

export default function StripePaymentForm(props: StripePaymentFormProps) {
  const { amount, currency, customer, cart, pricing, experience = 'inline', isOpen, onOpenChange } = props;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const open = isOpen ?? uncontrolledOpen;
  const setOpen = useCallback((value: boolean) => onOpenChange ? onOpenChange(value) : setUncontrolledOpen(value), [onOpenChange]);
  const valid = Boolean(customer.firstName && customer.lastName && customer.phone && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email));
  const total = new Intl.NumberFormat('en-US', { style: 'currency', currency: String(pricing.currency || currency || 'USD') }).format(Number(pricing.total ?? amount ?? 0));

  useEffect(() => {
    if (experience !== 'modal' || !open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !processing) setOpen(false);
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', keydown); };
  }, [experience, open, processing, setOpen]);

  if (experience === 'hosted') return <HostedLauncher {...props} />;

  if (experience === 'inline') {
    return (
      <section data-testid="inline-payment-experience" aria-labelledby="inline-payment-title" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_22px_60px_-36px_rgba(15,23,42,0.55)]">
        <header className="relative overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-7 sm:py-7">
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><CreditCard size={20} /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">Secure inline checkout</p>
                <h3 id="inline-payment-title" className="mt-1 text-xl font-black text-white sm:text-2xl">Complete your payment</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">Cards and eligible wallets stay on this page while Stripe handles the payment details.</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 sm:text-right"><p className="text-xs uppercase tracking-wider text-slate-400">Total due</p><p className="mt-1 text-2xl font-black">{total}</p></div>
          </div>
          <div className="relative mt-5 flex flex-wrap gap-4 border-t border-white/10 pt-4 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" /> Stripe protected</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> Total confirmed before charge</span>
          </div>
        </header>
        <div className="bg-slate-50/80 p-3 sm:p-5"><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><PaymentPanel {...props} experience="inline" onProcessingChange={setProcessing} /></div></div>
      </section>
    );
  }

  const dialog = open && valid && typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !processing) setOpen(false); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="secure-payment-title" className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white"><Lock size={18} /></div><div><h2 id="secure-payment-title" className="text-xl font-extrabold text-slate-950">Secure checkout</h2><p className="mt-0.5 text-sm text-slate-500">{total} for {cart.length} {cart.length === 1 ? 'experience' : 'experiences'}</p></div></div>
          <button ref={closeButtonRef} type="button" onClick={() => { if (!processing) setOpen(false); }} disabled={processing} aria-label="Close secure payment" className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X size={22} /></button>
        </header>
        <div data-testid="modal-payment-content" className="overflow-y-auto px-5 py-5 sm:px-6"><PaymentPanel {...props} experience="modal" onProcessingChange={setProcessing} /></div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 sm:px-6"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> Protected by Stripe</span><span>Card details are never stored here</span></footer>
      </section>
    </div>, document.body) : null;

  return (
    <>
      <section data-testid="modal-payment-experience" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><CreditCard size={23} /></div><div><h3 className="text-lg font-extrabold text-slate-950">Pay securely in the next step</h3><p className="mt-1 text-sm leading-6 text-slate-500">Open a focused Stripe payment window without leaving this website.</p></div></div>
          <div className="sm:text-right"><p className="text-xs uppercase tracking-wider text-slate-400">Total due</p><p className="mt-1 text-2xl font-black text-slate-950">{total}</p></div>
        </div>
        <button ref={openButtonRef} type="button" onClick={() => { if (valid) setOpen(true); }} disabled={!valid} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-base font-extrabold text-white shadow-md hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"><Lock size={17} /> Continue to secure payment <ArrowRight size={18} /></button>
        {!valid && <p className="mt-3 text-center text-sm text-slate-500">Complete your name, email, and phone number to continue.</p>}
      </section>
      {dialog}
    </>
  );
}
