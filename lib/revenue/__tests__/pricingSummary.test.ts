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
  it('includes standard and option prices, including legitimate zero prices', () => {
    expect(catalogueFromPrice({ discountPrice: 100, bookingOptions: [{ price: 120 }, { price: 80 }] })).toBe(80);
    expect(catalogueFromPrice({ discountPrice: 100, bookingOptions: [{ price: 0 }] })).toBe(0);
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
