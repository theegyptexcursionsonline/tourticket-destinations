jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantId }),
}));

const tourLean = jest.fn();
const discountLean = jest.fn();

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: jest.fn(() => ({ lean: tourLean })) },
}));

jest.mock('@/lib/models/Discount', () => ({
  __esModule: true,
  default: { findOne: jest.fn(() => ({ lean: discountLean })) },
}));

jest.mock('@/lib/models/Availability', () => ({
  __esModule: true,
  default: { findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(null) })) },
}));

jest.mock('@/lib/models/StopSale', () => ({
  __esModule: true,
  default: { exists: jest.fn().mockResolvedValue(null) },
}));

import { calculateCheckoutPricing } from '@/lib/security/checkoutPricing';

describe('checkout pricing security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    discountLean.mockResolvedValue(null);
    tourLean.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      tenantId: 'brand-a',
      title: 'Canonical tour',
      discountPrice: 100,
      bookingOptions: [{ id: 'private', label: 'Private', price: 150 }],
      addOns: [{ _id: 'addon-1', name: 'Lunch', price: 20, category: 'Food' }],
    });
  });

  it('replaces every client-supplied price with database prices', async () => {
    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      title: 'Tampered title',
      price: 0.01,
      discountPrice: 0.01,
      quantity: 2,
      selectedDate: '2099-01-01',
      childQuantity: 1,
      selectedBookingOption: { id: 'private', title: 'Fake', price: 0.01 },
      selectedAddOns: { 'addon-1': 1 },
      selectedAddOnDetails: { 'addon-1': { title: 'Fake', price: 0.01 } },
    }], 'brand-a');

    expect(result.cart[0].title).toBe('Canonical tour');
    expect(result.cart[0].selectedBookingOption.price).toBe(150);
    expect(result.cart[0].selectedAddOnDetails['addon-1'].price).toBe(20);
    expect(result.pricing).toEqual({
      subtotal: 435,
      serviceFee: 13.05,
      tax: 21.75,
      discount: 0,
      total: 469.8,
    });
  });

  it('rejects unknown booking options and add-ons', async () => {
    await expect(calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      selectedDate: '2099-01-01',
      selectedBookingOption: { id: 'forged', price: 0.01 },
    }], 'brand-a')).rejects.toThrow('Invalid booking option');

    await expect(calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: { forged: 1 },
    }], 'brand-a')).rejects.toThrow('Invalid add-on');
  });

  it('charges per-person add-ons once per paying guest — never times the stored quantity, and never for infants', async () => {
    // Legacy clients persisted the guest count (or worse) as the add-on quantity.
    // A per-person (Food) add-on must bill price × (adults + children) only:
    // no quantity multiplication (the guest-count² overcharge) and no infants.
    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 2,
      childQuantity: 1,
      infantQuantity: 2,
      selectedDate: '2099-01-01',
      selectedAddOns: { 'addon-1': 3 },
    }], 'brand-a');

    // base 100×2 + 50×1 = 250; add-on 20 × 3 paying guests = 60 (not 20 × 3 × 3)
    expect(result.pricing.subtotal).toBe(310);
    expect(result.cart[0].selectedAddOnDetails['addon-1'].perGuest).toBe(true);
  });

  it('honours explicit per-unit pricing even for a Food add-on', async () => {
    tourLean.mockResolvedValueOnce({
      _id: '507f1f77bcf86cd799439011',
      tenantId: 'brand-a',
      title: 'Canonical tour',
      discountPrice: 100,
      addOns: [{ _id: 'addon-1', name: 'Lunch box', price: 20, category: 'Food', pricingMethod: 'per_unit' }],
    });

    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 2,
      childQuantity: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: { 'addon-1': 2 },
    }], 'brand-a');

    expect(result.pricing.subtotal).toBe(290); // base 250 + 2 units x 20
    expect(result.cart[0].selectedAddOnDetails['addon-1'].perGuest).toBe(false);
  });

  it('honours explicit per-person pricing outside the Food category and excludes infants', async () => {
    tourLean.mockResolvedValueOnce({
      _id: '507f1f77bcf86cd799439011',
      tenantId: 'brand-a',
      title: 'Canonical tour',
      discountPrice: 100,
      addOns: [{ _id: 'addon-1', name: 'Guide audio', price: 10, category: 'Experience', pricingMethod: 'per_person' }],
    });

    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 2,
      childQuantity: 1,
      infantQuantity: 3,
      selectedDate: '2099-01-01',
      selectedAddOns: { 'addon-1': 9 },
    }], 'brand-a');

    expect(result.pricing.subtotal).toBe(280); // base 250 + 3 paying guests x 10
    expect(result.cart[0].selectedAddOnDetails['addon-1'].perGuest).toBe(true);
  });

  it('rejects tours outside the current tenant', async () => {
    tourLean.mockResolvedValueOnce(null);
    await expect(calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      selectedDate: '2099-01-01',
    }], 'brand-b')).rejects.toThrow('Tour not found');
  });
});
