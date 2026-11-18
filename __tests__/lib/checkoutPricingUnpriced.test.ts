// #2727: checkout refused only a whole cart of $0, so a $0 line (an option left
// at its 0 starting base, or a start time not priced yet) could ride along
// beside a priced tour. Every line now needs a real adult / unit price before
// a payment is prepared.
jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantId }),
}));

const tourLean = jest.fn();
const mockResolveEffectivePrice = jest.fn();

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: jest.fn(() => ({ lean: tourLean })) },
}));
jest.mock('@/lib/models/Discount', () => ({
  __esModule: true,
  default: { findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(null) })) },
}));
jest.mock('@/lib/models/Availability', () => ({
  __esModule: true,
  default: { findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(null) })) },
}));
jest.mock('@/lib/models/StopSale', () => ({
  __esModule: true,
  default: { exists: jest.fn().mockResolvedValue(null) },
}));
jest.mock('@/lib/revenue/pricingResolver', () => ({
  resolveEffectivePrice: (...args: unknown[]) => mockResolveEffectivePrice(...args),
}));

import Tour from '@/lib/models/Tour';
import { calculateCheckoutPricing, PriceUnavailableError } from '@/lib/security/checkoutPricing';

const PRICED = '507f1f77bcf86cd799439011';
const UNPRICED = '507f1f77bcf86cd799439012';

const pricedTour = {
  _id: PRICED,
  tenantId: 'brand-a',
  title: 'Priced tour',
  discountPrice: 60,
  bookingOptions: [{ id: 'priced', pricingKey: 'priced', label: 'Priced', price: 60 }],
};
const zeroBaseTour = {
  _id: UNPRICED,
  tenantId: 'brand-a',
  title: 'Zero base tour',
  discountPrice: 0,
  bookingOptions: [
    // 0 base, priced only at 08:00; 10:00 inherits the 0 base.
    { id: 'shared', pricingKey: 'shared', label: 'Shared', price: 0, timeSlots: [{ time: '08:00', price: 116 }, { time: '10:00' }] },
    // Never priced anywhere.
    { id: 'private', pricingKey: 'private', label: 'Private', price: 0 },
    // A whole-unit option left at 0.
    { id: 'group', pricingKey: 'group', type: 'Per Group', label: 'Group', price: 0, minCapacity: 1, maxCapacity: 8 },
    // Child priced, adult not.
    { id: 'kids', pricingKey: 'kids', label: 'Kids', price: 0, guestPrices: { adult: 0, child: 20, infant: 0 } },
  ],
};

const line = (id: string, option: string | null, extra: Record<string, unknown> = {}) => ({
  id,
  quantity: 2,
  selectedDate: '2099-01-01',
  ...(option ? { selectedBookingOption: { id: option, price: 999 } } : {}),
  ...extra,
});

describe('checkout refuses a line without a real price', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.REVENUEPILOT_PRICING_API_ENABLED;
    tourLean.mockImplementation(async () => {
      const query = (Tour.findOne as jest.Mock).mock.calls.at(-1)?.[0];
      return query?._id === UNPRICED ? zeroBaseTour : pricedTour;
    });
  });

  it('still prices a normal priced line', async () => {
    const result = await calculateCheckoutPricing([line(PRICED, 'priced')], 'brand-a');
    expect(result.cart[0].price).toBe(60);
    expect(result.pricing.subtotal).toBe(120);
  });

  it('accepts a 0-base option at a start time that has its own price', async () => {
    const result = await calculateCheckoutPricing([line(UNPRICED, 'shared', { selectedTime: '08:00' })], 'brand-a');
    expect(result.cart[0].price).toBe(116);
    expect(result.pricing.subtotal).toBe(232);
  });

  it('refuses the same option at a start time that inherits the 0 base', async () => {
    await expect(calculateCheckoutPricing([line(UNPRICED, 'shared', { selectedTime: '10:00' })], 'brand-a'))
      .rejects.toBeInstanceOf(PriceUnavailableError);
  });

  it('refuses an option priced nowhere, with a 409-mappable code', async () => {
    const attempt = calculateCheckoutPricing([line(UNPRICED, 'private')], 'brand-a');
    await expect(attempt).rejects.toMatchObject({ code: 'PRICE_UNAVAILABLE' });
  });

  it('refuses a whole-unit option whose unit price is 0', async () => {
    await expect(calculateCheckoutPricing([line(UNPRICED, 'group')], 'brand-a'))
      .rejects.toBeInstanceOf(PriceUnavailableError);
  });

  it('refuses an option with a child price but no adult price', async () => {
    await expect(calculateCheckoutPricing([line(UNPRICED, 'kids', { childQuantity: 1 })], 'brand-a'))
      .rejects.toBeInstanceOf(PriceUnavailableError);
  });

  it('refuses a mixed cart: a $0 line can no longer ride along beside a priced one', async () => {
    await expect(calculateCheckoutPricing([
      line(PRICED, 'priced'),
      line(UNPRICED, 'private'),
    ], 'brand-a')).rejects.toBeInstanceOf(PriceUnavailableError);
  });

  it('refuses a single-price tour (no options) whose price is 0', async () => {
    tourLean.mockResolvedValueOnce({ _id: UNPRICED, tenantId: 'brand-a', title: 'Bare', discountPrice: 0, bookingOptions: [] });
    await expect(calculateCheckoutPricing([line(UNPRICED, null)], 'brand-a'))
      .rejects.toBeInstanceOf(PriceUnavailableError);
  });

  it('keeps an infant at 0 when the adult is priced (infants may travel free)', async () => {
    const result = await calculateCheckoutPricing([line(PRICED, 'priced', { infantQuantity: 1 })], 'brand-a');
    expect(result.cart[0].guestPrices.infant).toBe(0);
    expect(result.pricing.subtotal).toBe(120);
  });

  it('refuses a dated quote whose adult price is 0, and accepts a priced dated quote', async () => {
    process.env.REVENUEPILOT_PRICING_API_ENABLED = 'true';
    mockResolveEffectivePrice.mockResolvedValueOnce({
      version: 3, sourceVersion: 'v3', source: 'override', prices: { adult: 0, child: 0, infant: 0 },
    });
    await expect(calculateCheckoutPricing([
      line(PRICED, 'priced', { selectedTime: '09:00', priceVersion: 3, selectedBookingOption: { id: 'priced', pricingKey: 'priced' } }),
    ], 'brand-a')).rejects.toBeInstanceOf(PriceUnavailableError);

    tourLean.mockResolvedValueOnce({ ...pricedTour, bookingOptions: [{ id: 'priced', pricingKey: 'priced', label: 'Priced', price: 60 }] });
    mockResolveEffectivePrice.mockResolvedValueOnce({
      version: 4, sourceVersion: 'v4', source: 'override', prices: { adult: 70, child: 35, infant: 0 },
    });
    const result = await calculateCheckoutPricing([
      line(PRICED, 'priced', { selectedTime: '09:00', priceVersion: 4, priceSourceVersion: 'v4', selectedBookingOption: { id: 'priced', pricingKey: 'priced' } }),
    ], 'brand-a');
    expect(result.cart[0].price).toBe(70);
  });

  it('reads every tour through the tenant-scoped query', async () => {
    await calculateCheckoutPricing([line(PRICED, 'priced')], 'brand-a');
    expect(Tour.findOne).toHaveBeenCalledWith(expect.objectContaining({ _id: PRICED, tenantId: 'brand-a' }));
  });
});
