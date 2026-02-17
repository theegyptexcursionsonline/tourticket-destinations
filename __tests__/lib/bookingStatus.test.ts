/**
 * @jest-environment node
 */
import {
  BOOKING_STATUS,
  BOOKING_STATUS_LABEL,
  toBookingStatusCode,
  toBookingStatusDb,
  BOOKING_STATUSES_DB,
} from '@/lib/constants/bookingStatus';

describe('Booking Status Constants', () => {
  describe('BOOKING_STATUS', () => {
    it('should define all expected status codes', () => {
      expect(BOOKING_STATUS.PENDING).toBe('pending');
      expect(BOOKING_STATUS.CONFIRMED).toBe('confirmed');
      expect(BOOKING_STATUS.COMPLETED).toBe('completed');
      expect(BOOKING_STATUS.CANCELLED).toBe('cancelled');
      expect(BOOKING_STATUS.REFUNDED).toBe('refunded');
      expect(BOOKING_STATUS.PARTIAL_REFUNDED).toBe('partial_refunded');
    });

    it('should have exactly 6 statuses', () => {
      expect(Object.keys(BOOKING_STATUS)).toHaveLength(6);
    });
  });

  describe('BOOKING_STATUS_LABEL', () => {
    it('should map codes to display labels', () => {
      expect(BOOKING_STATUS_LABEL.pending).toBe('Pending');
      expect(BOOKING_STATUS_LABEL.confirmed).toBe('Confirmed');
      expect(BOOKING_STATUS_LABEL.completed).toBe('Completed');
      expect(BOOKING_STATUS_LABEL.cancelled).toBe('Cancelled');
      expect(BOOKING_STATUS_LABEL.refunded).toBe('Refunded');
      expect(BOOKING_STATUS_LABEL.partial_refunded).toBe('Partial Refunded');
    });

    it('should have a label for every status code', () => {
      Object.values(BOOKING_STATUS).forEach(code => {
        expect(BOOKING_STATUS_LABEL[code]).toBeDefined();
      });
    });
  });

  describe('toBookingStatusCode', () => {
    it('should convert lowercase codes', () => {
      expect(toBookingStatusCode('pending')).toBe('pending');
      expect(toBookingStatusCode('confirmed')).toBe('confirmed');
      expect(toBookingStatusCode('completed')).toBe('completed');
      expect(toBookingStatusCode('cancelled')).toBe('cancelled');
      expect(toBookingStatusCode('refunded')).toBe('refunded');
      expect(toBookingStatusCode('partial_refunded')).toBe('partial_refunded');
    });

    it('should convert Title Case labels', () => {
      expect(toBookingStatusCode('Pending')).toBe('pending');
      expect(toBookingStatusCode('Confirmed')).toBe('confirmed');
      expect(toBookingStatusCode('Completed')).toBe('completed');
      expect(toBookingStatusCode('Cancelled')).toBe('cancelled');
      expect(toBookingStatusCode('Refunded')).toBe('refunded');
      expect(toBookingStatusCode('Partial Refunded')).toBe('partial_refunded');
    });

    it('should handle partial-refunded with hyphen', () => {
      expect(toBookingStatusCode('partial-refunded')).toBe('partial_refunded');
    });

    it('should handle whitespace', () => {
      expect(toBookingStatusCode('  pending  ')).toBe('pending');
    });

    it('should return null for invalid values', () => {
      expect(toBookingStatusCode('')).toBeNull();
      expect(toBookingStatusCode('unknown')).toBeNull();
      expect(toBookingStatusCode('active')).toBeNull();
    });

    it('should return null for empty/undefined input', () => {
      expect(toBookingStatusCode('')).toBeNull();
      expect(toBookingStatusCode(undefined as any)).toBeNull();
      expect(toBookingStatusCode(null as any)).toBeNull();
    });
  });

  describe('toBookingStatusDb', () => {
    it('should convert to database display values', () => {
      expect(toBookingStatusDb('pending')).toBe('Pending');
      expect(toBookingStatusDb('confirmed')).toBe('Confirmed');
      expect(toBookingStatusDb('Cancelled')).toBe('Cancelled');
      expect(toBookingStatusDb('Partial Refunded')).toBe('Partial Refunded');
    });

    it('should return null for invalid values', () => {
      expect(toBookingStatusDb('')).toBeNull();
      expect(toBookingStatusDb('invalid')).toBeNull();
    });
  });

  describe('BOOKING_STATUSES_DB', () => {
    it('should include both Title Case and code values', () => {
      expect(BOOKING_STATUSES_DB).toContain('Pending');
      expect(BOOKING_STATUSES_DB).toContain('Confirmed');
      expect(BOOKING_STATUSES_DB).toContain('Completed');
      expect(BOOKING_STATUSES_DB).toContain('Cancelled');
      expect(BOOKING_STATUSES_DB).toContain('Refunded');
      expect(BOOKING_STATUSES_DB).toContain('Partial Refunded');
      expect(BOOKING_STATUSES_DB).toContain('pending');
      expect(BOOKING_STATUSES_DB).toContain('confirmed');
    });

    it('should have 12 entries (6 labels + 6 codes)', () => {
      expect(BOOKING_STATUSES_DB).toHaveLength(12);
    });
  });
});
