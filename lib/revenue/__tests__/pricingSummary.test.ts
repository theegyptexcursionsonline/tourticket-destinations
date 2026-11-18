jest.mock('@/lib/models/RevenuePriceOverride', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: jest.fn((query: unknown, tenantId: string) => ({ ...(query as object), tenantIds: tenantId })),
  getTenantConfigCached: jest.fn(),
}));

import { catalogueFromPrice } from '@/lib/revenue/pricingSummary';

describe('catalogueFromPrice', () => {
  it('includes standard and option prices, never a 0 (an unpriced option is not a $0 price)', () => {
    expect(catalogueFromPrice({ discountPrice: 100, bookingOptions: [{ price: 120 }, { price: 80 }] })).toBe(80);
    // #2727: this used to expect 0 ("legitimate zero prices"); a 0 option is
    // not priced yet and must never become the listing "from" price.
    expect(catalogueFromPrice({ discountPrice: 100, bookingOptions: [{ price: 0 }] })).toBeNull();
    expect(catalogueFromPrice({ discountPrice: 100, bookingOptions: [{ price: 0 }, { price: 70 }] })).toBe(70);
    expect(catalogueFromPrice({ discountPrice: 0, bookingOptions: [{ price: 0, timeSlots: [{ price: 0 }, { price: 33 }] }] })).toBe(33);
    expect(catalogueFromPrice({ discountPrice: 0, bookingOptions: [] })).toBeNull();
  });

  it('uses the cheapest chargeable slot and applies discounts only for opted-in options', () => {
    expect(catalogueFromPrice({
      discountPrice: 25,
      discountPercent: 20,
      bookingOptions: [{
        price: 150,
        applyTourDiscount: true,
        timeSlots: [{ price: 50 }, { price: 200 }],
      }],
    })).toBe(40);
  });

  it('does not advertise the tour fallback when booking options are required', () => {
    expect(catalogueFromPrice({
      discountPrice: 25,
      bookingOptions: [{ price: 120, applyTourDiscount: false }],
    })).toBe(120);
  });

  it('advertises the automatically discounted tour base when no options exist', () => {
    expect(catalogueFromPrice({ discountPrice: 100, discountPercent: 20, bookingOptions: [] })).toBe(80);
  });

  it('ignores invalid prices and returns null when no catalogue price is usable', () => {
    expect(catalogueFromPrice({ discountPrice: Number.NaN, bookingOptions: [{ price: -1 }] })).toBeNull();
  });
});
