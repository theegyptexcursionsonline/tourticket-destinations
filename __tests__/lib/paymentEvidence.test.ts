import { bookingPaymentFields, isDuplicateKeyError } from '@/lib/security/paymentEvidence';

describe('booking payment evidence', () => {
  it('confirms only against a succeeded payment, with evidence attached', () => {
    const fields = bookingPaymentFields({ paymentId: 'pi_123', status: 'succeeded' }, 75.6);
    expect(fields.status).toBe('Confirmed');
    expect(fields.paymentStatus).toBe('paid');
    expect(fields.amountPaid).toBe(75.6);
    expect(fields.paymentConfirmedBy).toBe('stripe:pi_123');
    expect(fields.paymentConfirmedAt).toBeInstanceOf(Date);
  });

  it('stays pending when the provider has not settled', () => {
    for (const payment of [
      null,
      undefined,
      { paymentId: 'pi_1', status: 'requires_payment_method' },
      { paymentId: 'pi_1', status: 'processing' },
      { paymentId: '', status: 'succeeded' },
    ]) {
      const fields = bookingPaymentFields(payment as any, 75.6);
      expect(fields.status).toBe('Pending');
      expect(fields.paymentStatus).toBe('pending');
      expect(fields.amountPaid).toBe(0);
      expect(fields.paymentConfirmedBy).toBeUndefined();
    }
  });

  it('never marks a pay-later booking as paid', () => {
    const fields = bookingPaymentFields({ paymentId: 'pi_9', status: 'succeeded' }, 40, { method: 'pay_later' });
    expect(fields.status).toBe('Pending');
    expect(fields.paymentStatus).toBe('pending');
  });

  it('recognises a duplicate-key rejection so a second writer is not an error', () => {
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
    expect(isDuplicateKeyError(new Error('boom'))).toBe(false);
  });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The El Gouna incident (11 Aug): one Stripe charge produced two booking rows
 * from two different writers, and rows were written "Confirmed" with no
 * payment evidence at all — 15 payments across the network carry same-tour
 * duplicates and 8 paid rows have no proof of payment.
 */
describe('money-path writers', () => {
  const checkout = readFileSync(path.join(process.cwd(), 'app/api/checkout/route.ts'), 'utf8');
  const webhook = readFileSync(path.join(process.cwd(), 'app/api/webhooks/stripe/route.ts'), 'utf8');

  it('never hardcodes a confirmed status on a payment-derived booking', () => {
    const createBlock = checkout.slice(checkout.indexOf('await Booking.create(['), checkout.indexOf('createdBookings.push(booking)'));
    expect(createBlock).not.toContain("status: 'Confirmed'");
    expect(createBlock).toContain('status: evidence.status');
    expect(createBlock).toContain('paymentConfirmedBy: evidence.paymentConfirmedBy');
  });

  it('records provider evidence in the webhook writer too', () => {
    expect(webhook).toContain('bookingPaymentFields(');
  });

  it('treats a duplicate key as convergence, not a customer-facing failure', () => {
    expect(checkout).toContain('isDuplicateKeyError(bookingError)');
    expect(webhook).toContain('isDuplicateKeyError(createError)');
    // Both must look the existing row up by the same identity the unique index uses.
    expect(checkout).toContain('paymentItemIndex: i');
    expect(webhook).toContain('paymentItemIndex: cartIndex');
  });
});
