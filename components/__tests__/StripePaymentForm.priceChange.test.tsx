import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import StripePaymentForm from '@/components/StripePaymentForm';
import type { AuthoritativePriceQuote } from '@/lib/cart/authoritativeCart';

jest.mock('@stripe/stripe-js', () => ({ loadStripe: jest.fn(() => ({})) }));
jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div>Payment element</div>,
  useStripe: () => null,
  useElements: () => null,
}));
jest.mock('@/contexts/StorefrontThemeContext', () => ({
  useStorefrontTheme: () => ({ resolvedTheme: 'light' }),
}));
jest.mock('@/lib/checkout/checkoutAttempt', () => ({
  clearCheckoutAttemptId: jest.fn(),
  getOrCreateCheckoutAttemptId: () => '123e4567-e89b-42d3-a456-426614174000',
}));

const quote: AuthoritativePriceQuote = {
  tourId: '507f1f77bcf86cd799439011',
  tourTitle: 'Mountain sunrise',
  optionKey: 'premium-sunrise',
  date: '2026-09-12',
  time: '06:30',
  currency: 'USD',
  prices: { adult: 126, child: 70, infant: 5 },
  version: 4,
  sourceVersion: `pv1_${'a'.repeat(64)}`,
  source: 'override',
};

const props = (onPriceChanged: jest.Mock) => ({
  amount: 100,
  currency: 'USD',
  customer: { email: 'guest@example.test', firstName: 'Guest', lastName: 'Customer', phone: '+201000000000' },
  cart: [{
    id: quote.tourId,
    selectedDate: quote.date,
    selectedTime: quote.time,
    quantity: 1,
    childQuantity: 1,
    infantQuantity: 1,
    selectedBookingOption: { id: 'option-0', pricingKey: quote.optionKey },
    guestPrices: { adult: 100, child: 50, infant: 0 },
    priceVersion: 3,
  }],
  pricing: { total: 100, currency: 'USD' },
  onSuccess: jest.fn(),
  onError: jest.fn(),
  onPriceChanged,
});

describe('Stripe price-change recovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      status: 409,
      ok: false,
      json: async () => ({ success: false, code: 'PRICE_CHANGED', quote }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('stops inline payment and requires explicit acceptance of every guest price', async () => {
    const onPriceChanged = jest.fn().mockResolvedValue(true);
    render(<StripePaymentForm {...props(onPriceChanged)} experience="inline" />);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(500);
    });

    expect(screen.getByText('Your price was updated')).toBeInTheDocument();
    expect(screen.getByText('$126.00')).toBeInTheDocument();
    expect(screen.getByText('$70.00')).toBeInTheDocument();
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.queryByText('Payment element')).not.toBeInTheDocument();
    expect(onPriceChanged).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /accept updated price & continue/i }));
    await waitFor(() => expect(onPriceChanged).toHaveBeenCalledWith(quote));
  });

  it('uses the same fail-closed review before opening hosted checkout', async () => {
    const onPriceChanged = jest.fn().mockResolvedValue(false);
    render(<StripePaymentForm {...props(onPriceChanged)} experience="hosted" />);

    fireEvent.click(screen.getByRole('button', { name: /pay securely with stripe/i }));
    expect(await screen.findByText('Your price was updated')).toBeInTheDocument();
    expect(window.location.href).not.toContain('checkout.stripe.com');

    fireEvent.click(screen.getByRole('button', { name: /accept updated price & continue/i }));
    expect(await screen.findByText(/your original cart is unchanged/i)).toBeInTheDocument();
    expect(onPriceChanged).toHaveBeenCalledWith(quote);
  });
});
