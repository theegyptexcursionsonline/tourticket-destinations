'use client';

import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, Lock, ShieldCheck, CreditCard, CheckCircle2 } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

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
        className="w-full py-4 bg-red-600 text-white font-extrabold text-lg hover:bg-red-700 active:translate-y-[1px] transform-gpu shadow-md transition disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
    <div className="bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 text-white px-6 py-6 md:px-8 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/70 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-300" />
            Secure Payment
          </p>
          <p className="text-3xl font-extrabold mt-2">{formattedTotal}</p>
            <p className="text-sm text-white/80">
              for {numberOfTours} {numberOfTours === 1 ? 'experience' : 'experiences'}
            </p>
        </div>
        <div className="space-y-2 text-sm text-white/90">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-emerald-300" />
            256-bit SSL encryption
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-300" />
            Fraud detection & buyer protection
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 py-8 space-y-6 bg-slate-50/60">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <CreditCard size={16} className="text-slate-400" />
            <span>Visa</span>
            <span>Mastercard</span>
            <span>Amex</span>
            <span>Apple Pay</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs uppercase tracking-wide">
            <CheckCircle2 size={16} />
            No hidden fees
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 md:p-6">
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

        <div className="flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-slate-400" />
            Your card is never stored on our servers
          </div>
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-slate-400" />
            Powered by Stripe
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripePaymentForm;
