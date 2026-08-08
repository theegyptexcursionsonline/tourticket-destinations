import type Stripe from 'stripe';

/**
 * A succeeded PaymentIntent can later be partially or fully refunded. Stripe
 * keeps the intent in the `succeeded` state, so checkout must inspect the
 * expanded charge before converting the payment into a booking.
 */
export function assertStripePaymentAvailableForBooking(paymentIntent: Stripe.PaymentIntent): void {
  if (paymentIntent.status !== 'succeeded') {
    throw new Error('Payment has not been completed. Please complete the payment and try again.');
  }

  const charge = paymentIntent.latest_charge;
  if (!charge || typeof charge === 'string') {
    throw new Error('Payment status could not be verified. Please restart checkout.');
  }

  if (charge.status !== 'succeeded' || !charge.paid) {
    throw new Error('Payment has not been completed. Please complete the payment and try again.');
  }

  if (charge.refunded || Number(charge.amount_refunded || 0) > 0) {
    throw new Error('This payment was refunded and cannot be used to create a booking. Please restart checkout.');
  }
}
