/**
 * @jest-environment node
 *
 * Tests for offer calculation utilities from lib/utils/offerCalculations.ts
 */
import {
  daysBetween,
  isOfferValid,
  calculateDiscountedPrice,
  getBestOffer,
  type OfferData,
} from '@/lib/utils/offerCalculations';

function makeOffer(overrides: Partial<OfferData> = {}): OfferData {
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    _id: 'offer1',
    name: 'Test Offer',
    type: 'percentage',
    discountValue: 10,
    startDate: now.toISOString(),
    endDate: future.toISOString(),
    usedCount: 0,
    isActive: true,
    isFeatured: false,
    priority: 1,
    tenantId: 'default',
    ...overrides,
  };
}

describe('Offer Calculations', () => {
  describe('daysBetween', () => {
    it('should return 0 for the same date', () => {
      const date = new Date('2026-01-15');
      expect(daysBetween(date, date)).toBe(0);
    });

    it('should return 1 for consecutive days', () => {
      const d1 = new Date('2026-01-15');
      const d2 = new Date('2026-01-16');
      expect(daysBetween(d1, d2)).toBe(1);
    });

    it('should return positive regardless of order', () => {
      const d1 = new Date('2026-01-15');
      const d2 = new Date('2026-01-20');
      expect(daysBetween(d1, d2)).toBe(5);
      expect(daysBetween(d2, d1)).toBe(5);
    });

    it('should handle cross-month boundaries', () => {
      const d1 = new Date('2026-01-30');
      const d2 = new Date('2026-02-02');
      expect(daysBetween(d1, d2)).toBe(3);
    });
  });

  describe('isOfferValid', () => {
    it('should return true for a valid, active offer within date range', () => {
      const offer = makeOffer();
      expect(isOfferValid(offer)).toBe(true);
    });

    it('should return false for inactive offer', () => {
      const offer = makeOffer({ isActive: false });
      expect(isOfferValid(offer)).toBe(false);
    });

    it('should return false for expired offer', () => {
      const past = new Date('2020-01-01');
      const pastEnd = new Date('2020-12-31');
      const offer = makeOffer({ startDate: past, endDate: pastEnd });
      expect(isOfferValid(offer)).toBe(false);
    });

    it('should return false for future offer not yet started', () => {
      const futureStart = new Date('2030-01-01');
      const futureEnd = new Date('2030-12-31');
      const offer = makeOffer({ startDate: futureStart, endDate: futureEnd });
      expect(isOfferValid(offer)).toBe(false);
    });

    it('should return false when usage limit is reached', () => {
      const offer = makeOffer({ usageLimit: 10, usedCount: 10 });
      expect(isOfferValid(offer)).toBe(false);
    });

    it('should return true when usage limit is not reached', () => {
      const offer = makeOffer({ usageLimit: 10, usedCount: 5 });
      expect(isOfferValid(offer)).toBe(true);
    });
  });

  describe('calculateDiscountedPrice', () => {
    it('should apply percentage discount', () => {
      const offer = makeOffer({ type: 'percentage', discountValue: 20 });
      const result = calculateDiscountedPrice(100, offer);
      expect(result.discountedPrice).toBe(80);
      expect(result.discountAmount).toBe(20);
      expect(result.discountPercentage).toBe(20);
    });

    it('should apply fixed discount', () => {
      const offer = makeOffer({ type: 'fixed', discountValue: 15 });
      const result = calculateDiscountedPrice(100, offer);
      expect(result.discountedPrice).toBe(85);
      expect(result.discountAmount).toBe(15);
    });

    it('should not make price negative', () => {
      const offer = makeOffer({ type: 'fixed', discountValue: 200 });
      const result = calculateDiscountedPrice(100, offer);
      expect(result.discountedPrice).toBeGreaterThanOrEqual(0);
    });

    it('should respect maxDiscount cap', () => {
      const offer = makeOffer({ type: 'percentage', discountValue: 50, maxDiscount: 30 });
      const result = calculateDiscountedPrice(100, offer);
      expect(result.discountAmount).toBe(30);
      expect(result.discountedPrice).toBe(70);
    });

    it('should preserve original price in result', () => {
      const offer = makeOffer({ type: 'percentage', discountValue: 10 });
      const result = calculateDiscountedPrice(100, offer);
      expect(result.originalPrice).toBe(100);
    });

    it('should include the offer in result', () => {
      const offer = makeOffer({ name: 'Summer Sale' });
      const result = calculateDiscountedPrice(100, offer);
      expect(result.offer.name).toBe('Summer Sale');
    });
  });

  describe('getBestOffer', () => {
    it('should return the offer with the highest discount', () => {
      const offers = [
        makeOffer({ _id: 'a', discountValue: 10, priority: 1 }),
        makeOffer({ _id: 'b', discountValue: 25, priority: 1 }),
        makeOffer({ _id: 'c', discountValue: 15, priority: 1 }),
      ];
      const best = getBestOffer(offers, 100);
      expect(best?.offer._id).toBe('b');
    });

    it('should prefer higher priority when discounts are equal', () => {
      const offers = [
        makeOffer({ _id: 'a', discountValue: 20, priority: 1 }),
        makeOffer({ _id: 'b', discountValue: 20, priority: 5 }),
      ];
      const best = getBestOffer(offers, 100);
      expect(best?.offer._id).toBe('b');
    });

    it('should return null for empty offers array', () => {
      const best = getBestOffer([], 100);
      expect(best).toBeNull();
    });

    it('should skip invalid offers', () => {
      const offers = [
        makeOffer({ _id: 'expired', isActive: false, discountValue: 50 }),
        makeOffer({ _id: 'valid', discountValue: 10 }),
      ];
      const best = getBestOffer(offers, 100);
      expect(best?.offer._id).toBe('valid');
    });
  });
});
