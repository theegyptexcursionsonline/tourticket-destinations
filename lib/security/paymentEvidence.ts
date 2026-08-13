/**
 * Payment evidence for a booking.
 *
 * A booking may only present itself as paid when the provider actually said so.
 * Writing `status: 'Confirmed'` with no evidence — which is what these routes
 * used to do — produces records that look settled in the admin while nothing
 * proves a charge, and it is why a booking could appear confirmed with no
 * payment notification behind it.
 */
export type VerifiedPayment = {
  paymentId: string;
  status: string;
  amount?: number;
  /** Providers return more than this helper needs; extra fields are ignored. */
  [key: string]: unknown;
};

export type BookingPaymentFields = {
  status: 'Confirmed' | 'Pending';
  paymentStatus: 'paid' | 'pending';
  amountPaid: number;
  paymentConfirmedAt?: Date;
  paymentConfirmedBy?: string;
};

/**
 * Derive the booking's status and payment evidence from what the provider
 * returned. Anything short of a succeeded payment stays Pending and unpaid —
 * fail closed, never optimistic.
 */
export function bookingPaymentFields(
  payment: VerifiedPayment | null | undefined,
  itemTotal: number,
  options: { method?: string } = {},
): BookingPaymentFields {
  const succeeded = payment?.status === 'succeeded' && Boolean(payment?.paymentId);
  if (!succeeded) {
    return { status: 'Pending', paymentStatus: 'pending', amountPaid: 0 };
  }
  const paidByCard = (options.method || 'card').toLowerCase() !== 'pay_later';
  if (!paidByCard) {
    return { status: 'Pending', paymentStatus: 'pending', amountPaid: 0 };
  }
  return {
    status: 'Confirmed',
    paymentStatus: 'paid',
    amountPaid: Number(itemTotal.toFixed(2)),
    paymentConfirmedAt: new Date(),
    paymentConfirmedBy: `stripe:${payment!.paymentId}`,
  };
}

/** A duplicate-key rejection means another writer already created this row. */
export function isDuplicateKeyError(error: unknown): boolean {
  const code = (error as { code?: number })?.code;
  return code === 11000;
}
