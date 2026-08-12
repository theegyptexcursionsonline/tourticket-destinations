'use client';

import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, Lock, ShieldCheck, CreditCard, CheckCircle2 } from 'lucide-react';

// Keep non-payment pages usable when Stripe is intentionally unavailable
// (for example, isolated CI). Checkout renders its unavailable state instead
// of asking Stripe.js to parse an undefined key.
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  clientSecret: _clientSecret,
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      onError(err.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      <button
        type="button"
        disabled={!stripe || isProcessing}
        onClick={handleSubmit}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:translate-y-[1px] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
      >
        {isProcessing ? (
          <Loader2 className="animate-spin" size={24} />
        ) : (
          <>
            <Lock size={18} />
            <span>Complete Payment</span>
          </>
        )}
      </button>

      <p className="text-xs text-slate-500 text-center">
        Your payment is secured by Stripe. We never store your card details.
      </p>
    </div>
  );
};

interface StripePaymentFormProps {
  amount: number;
  currency: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
  };
  cart: any[];
  pricing: any;
  discountCode?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  currency,
  customer,
  cart,
  pricing,
  discountCode,
  onSuccess,
  onError,
}) => {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Helper function to validate email format
    const isValidEmail = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    // Validate customer data before creating PaymentIntent
    if (!customer.email || !customer.firstName || !customer.lastName) {
      setIsLoading(false);
      return;
    }

    // Validate email format
    if (!isValidEmail(customer.email)) {
      setIsLoading(false);
      return;
    }

    // Validate cart has items
    if (!cart || cart.length === 0) {
      setIsLoading(false);
      return;
    }

    // Validate pricing
    if (!pricing || pricing.total <= 0) {
      setIsLoading(false);
      return;
    }

    // Debounce payment intent creation to avoid creating it while user is typing
    const timeoutId = setTimeout(() => {
      const createPaymentIntent = async () => {
        try {
          const response = await fetch('/api/checkout/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer,
              pricing,
              cart,
              discountCode,
            }),
          });

          const data = await response.json();

          if (data.success && data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            // Don't show error toast here, just log it
            console.error('Failed to create payment intent:', data.message);
            onError(data.message || 'Failed to initialize payment');
          }
        } catch (error) {
          // Don't show error toast here, just log it
          console.error('Error creating payment intent:', error);
          onError('Failed to initialize payment');
        } finally {
          setIsLoading(false);
        }
      };

      createPaymentIntent();
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timeoutId);
  }, [amount, currency, customer, cart, pricing, discountCode, onError]);

  if (isLoading) {
    return (
      <div className="bg-white/80 border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <Loader2 className="animate-spin text-red-600" size={28} />
        </div>
        <p className="text-lg font-semibold text-slate-900">Preparing secure payment</p>
        <p className="text-sm text-slate-500 max-w-sm">
          Please wait while we create a secure connection with our payment partner.
        </p>
      </div>
    );
  }

  // Helper function to validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Show message if customer data is incomplete or invalid
  if (!customer.email || !customer.firstName || !customer.lastName || !isValidEmail(customer.email)) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center gap-3">
          <Lock size={20} className="text-emerald-400" />
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">Secure Checkout</p>
            <p className="text-lg font-semibold">Contact details required</p>
          </div>
        </div>
        <div className="px-6 py-8 text-center space-y-3">
          <p className="text-base text-slate-600">
            {!customer.email || !customer.firstName || !customer.lastName
              ? 'Please complete your contact information above to unlock payment.'
              : 'Please enter a valid email address to continue with payment.'}
          </p>
          <p className="text-sm text-slate-400">We use your details to send booking confirmations and receipts.</p>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to initialize payment. Please refresh and try again.
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#dc2626',
        colorBackground: '#ffffff',
        colorText: '#1e293b',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  const displayTotal = pricing?.total ?? amount ?? 0;
  const displayCurrency = (pricing?.currency || currency || 'USD').toUpperCase();
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: displayCurrency,
    minimumFractionDigits: 2,
  });
  const formattedTotal = formatter.format(displayTotal);
  const numberOfTours = cart?.length || 1;

  return (
    <section
      data-testid="inline-payment-experience"
      aria-labelledby="inline-payment-title"
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_22px_60px_-36px_rgba(15,23,42,0.55)]"
    >
      <header className="relative overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-red-600/25 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-inset ring-white/15">
              <CreditCard size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">Secure inline checkout</p>
              <h3 id="inline-payment-title" className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Complete your payment</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">Cards and eligible wallets stay on this page while Stripe handles the payment details.</p>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/15 sm:min-w-36 sm:text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Total due</p>
            <p className="mt-1 text-2xl font-black text-white">{formattedTotal}</p>
            <p className="mt-1 text-xs text-slate-300">{numberOfTours} {numberOfTours === 1 ? 'experience' : 'experiences'}</p>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" aria-hidden="true" /> Stripe protected</span>
          <span className="inline-flex items-center gap-1.5"><Lock size={14} className="text-slate-300" aria-hidden="true" /> Encrypted payment</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" aria-hidden="true" /> Total confirmed before charge</span>
        </div>
      </header>

      <div className="bg-slate-50/80 p-3 sm:p-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm
              clientSecret={clientSecret}
              onSuccess={onSuccess}
              onError={onError}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          </Elements>
        </div>

      </div>
      <footer className="flex flex-col gap-1.5 border-t border-slate-200 bg-white px-5 py-4 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <span>Payment details are handled by Stripe.</span>
        <span>We do not store your card number.</span>
      </footer>
    </section>
  );
};

export default StripePaymentForm;
