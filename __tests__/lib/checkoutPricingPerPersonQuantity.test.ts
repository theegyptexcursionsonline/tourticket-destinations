/**
 * Server authority for per-person add-ons after the client-sheet change:
 * the guest's chosen quantity is billed, capped at the paying party size.
 */
jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantId }),
}));

const tourLean = jest.fn();

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
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

import { calculateCheckoutPricing } from '@/lib/security/checkoutPricing';

const tour = (pricingMethod: 'per_person' | 'per_unit', maxQuantity?: number) => ({
  _id: '507f1f77bcf86cd799439011',
  tenantId: 'brand-a',
  title: 'Canonical tour',
  discountPrice: 100,
  addOns: [{ _id: 'addon-1', name: 'Snorkel gear', price: 10, category: 'Experience', pricingMethod, maxQuantity }],
});

describe('per-person add-on quantity is guest-chosen and bounded', () => {
  beforeEach(() => tourLean.mockReset());

  it('bills exactly the chosen units when below the party size', async () => {
    tourLean.mockResolvedValueOnce(tour('per_person'));
    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 3,
      childQuantity: 1,
      addOnQuantityVersion: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: { 'addon-1': 2 },
    }], 'brand-a');
    // base 100×3 + 50×1 = 350; add-on 10 × 2 chosen units = 20
    expect(result.pricing.subtotal).toBe(370);
    expect(result.cart[0].selectedAddOns['addon-1']).toBe(2);
    expect(result.cart[0].selectedAddOnDetails['addon-1']).toMatchObject({ perGuest: true, quantity: 2 });
  });

  it('rejects units above the paying-participant ceiling and ignores infants in that ceiling', async () => {
    tourLean.mockResolvedValueOnce(tour('per_person'));
    await expect(calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 2,
      childQuantity: 1,
      infantQuantity: 2,
      addOnQuantityVersion: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: { 'addon-1': 9 },
    }], 'brand-a')).rejects.toThrow('at most 3');
  });

  it('leaves per-unit add-ons on their requested quantity', async () => {
    tourLean.mockResolvedValueOnce(tour('per_unit', 2));
    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: { 'addon-1': 2 },
    }], 'brand-a');
    expect(result.pricing.subtotal).toBe(120);
    expect(result.cart[0].selectedAddOnDetails['addon-1']).toMatchObject({ perGuest: false, quantity: 2 });
  });

  it('preserves the old whole-party meaning for an unversioned selected toggle', async () => {
    tourLean.mockResolvedValueOnce(tour('per_person'));
    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 2,
      childQuantity: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: { 'addon-1': 1 },
    }], 'brand-a');
    expect(result.pricing.subtotal).toBe(280);
    expect(result.cart[0]).toMatchObject({
      addOnQuantityVersion: 1,
      selectedAddOns: { 'addon-1': 3 },
    });
  });

  it('rejects an excessive per-unit quantity unless the catalogue authorizes it', async () => {
    tourLean.mockResolvedValueOnce(tour('per_unit'));
    await expect(calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: { 'addon-1': 2 },
      addOnQuantityVersion: 1,
    }], 'brand-a')).rejects.toThrow('at most 1');
  });

  it('does not allow an infant-only party to buy a per-person add-on', async () => {
    tourLean.mockResolvedValueOnce(tour('per_person'));
    await expect(calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 0,
      infantQuantity: 1,
      selectedDate: '2099-01-01',
      selectedAddOns: { 'addon-1': 1 },
      addOnQuantityVersion: 1,
    }], 'brand-a')).rejects.toThrow('paying participant');
  });

  it('rejects the implicit Standard side door when the tour has configured options', async () => {
    tourLean.mockResolvedValueOnce({
      ...tour('per_person'),
      bookingOptions: [{
        _id: 'option-1',
        pricingKey: 'shared-cruise',
        type: 'Per Person',
        label: 'Shared cruise',
        price: 120,
      }],
    });
    await expect(calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      selectedDate: '2099-01-01',
      selectedTime: '09:00',
      selectedBookingOption: { id: 'standard-default', pricingKey: 'standard' },
    }], 'brand-a')).rejects.toThrow('configured booking option');
  });
});
