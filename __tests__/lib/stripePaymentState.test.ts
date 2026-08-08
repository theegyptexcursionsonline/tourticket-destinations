import type Stripe from 'stripe';
import { assertStripePaymentAvailableForBooking } from '@/lib/security/stripePaymentState';

const paymentIntent = (overrides: Partial<Stripe.PaymentIntent> = {}): Stripe.PaymentIntent => ({
  id: 'pi_test',
  object: 'payment_intent',
  status: 'succeeded',
  latest_charge: {
    id: 'ch_test',
    object: 'charge',
    status: 'succeeded',
    paid: true,
    refunded: false,
    amount_refunded: 0,
  } as Stripe.Charge,
  ...overrides,
} as Stripe.PaymentIntent);

describe('assertStripePaymentAvailableForBooking', () => {
  it('accepts a succeeded payment with an unrefunded expanded charge', () => {
    expect(() => assertStripePaymentAvailableForBooking(paymentIntent())).not.toThrow();
  });

  it('rejects a fully refunded succeeded payment', () => {
    expect(() => assertStripePaymentAvailableForBooking(paymentIntent({
      latest_charge: {
        id: 'ch_refunded',
        object: 'charge',
        status: 'succeeded',
        paid: true,
        refunded: true,
        amount_refunded: 8640,
      } as Stripe.Charge,
    }))).toThrow('This payment was refunded and cannot be used to create a booking.');
  });

  it('rejects a partially refunded succeeded payment', () => {
    expect(() => assertStripePaymentAvailableForBooking(paymentIntent({
      latest_charge: {
        id: 'ch_partially_refunded',
        object: 'charge',
        status: 'succeeded',
        paid: true,
        refunded: false,
        amount_refunded: 100,
      } as Stripe.Charge,
    }))).toThrow('This payment was refunded and cannot be used to create a booking.');
  });

  it('fails closed when the latest charge was not expanded', () => {
    expect(() => assertStripePaymentAvailableForBooking(paymentIntent({ latest_charge: 'ch_unexpanded' })))
      .toThrow('Payment status could not be verified.');
  });

  it('rejects an incomplete payment', () => {
    expect(() => assertStripePaymentAvailableForBooking(paymentIntent({ status: 'processing' })))
      .toThrow('Payment has not been completed.');
  });
});
