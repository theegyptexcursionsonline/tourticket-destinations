// lib/constants/bookingStatus.ts
/**
 * Booking status constants + helpers.
 *
 * UI/API STATUS CODES (lowercase) — used in filters and can be accepted by APIs:
 * - refunded
 * - partial_refunded
 *
 * DB/UI DISPLAY VALUES (Title Case) — what we store on Booking.status:
 * - Confirmed, Pending, Completed, Cancelled, Refunded, Partial Refunded
 */

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIAL_REFUNDED: 'partial_refunded',
} as const;

export type BookingStatusCode = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const BOOKING_STATUS_LABEL: Record<BookingStatusCode, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partial_refunded: 'Partial Refunded',
};

export type BookingStatusDb =
  | 'Pending'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled'
  | 'Refunded'
  | 'Partial Refunded'
  // Backward compatibility (if any older records stored codes)
  | BookingStatusCode;

export function toBookingStatusCode(value: string): BookingStatusCode | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase().replace(/\s+/g, '_');

  // Map title-case labels to codes
  if (normalized === 'pending') return BOOKING_STATUS.PENDING;
  if (normalized === 'confirmed') return BOOKING_STATUS.CONFIRMED;
  if (normalized === 'completed') return BOOKING_STATUS.COMPLETED;
  if (normalized === 'cancelled') return BOOKING_STATUS.CANCELLED;
  if (normalized === 'refunded') return BOOKING_STATUS.REFUNDED;
  if (normalized === 'partial_refunded' || normalized === 'partial-refunded') return BOOKING_STATUS.PARTIAL_REFUNDED;

  return null;
}

export function toBookingStatusDb(value: string): BookingStatusDb | null {
  const code = toBookingStatusCode(value);
  if (!code) return null;
  return BOOKING_STATUS_LABEL[code] as BookingStatusDb;
}

export const BOOKING_STATUSES_DB: BookingStatusDb[] = [
  'Pending',
  'Confirmed',
  'Completed',
  'Cancelled',
  'Refunded',
  'Partial Refunded',
  // accept codes too
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.REFUNDED,
  BOOKING_STATUS.PARTIAL_REFUNDED,
];


