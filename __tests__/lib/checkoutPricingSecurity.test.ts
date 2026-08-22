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
      bookingOptions: [
        { id: 'private', label: 'Private', price: 150 },
        { id: 'couple', type: 'Per Couple', label: 'Couple escape', price: 150, minCapacity: 2, maxCapacity: 4 },
      ],
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

  it('charges a Per Group option once for the whole booking, never per guest', async () => {
    // The client's reported overcharge: a $323.18 group option billed $1,131.13
    // for 3.5 participants. The Stripe amount is built here, so this is the
    // number that reaches the card.
    tourLean.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      tenantId: 'brand-a',
      title: 'Desert safari',
      discountPrice: 100,
      bookingOptions: [{ id: 'group', type: 'Per Group', label: 'Private group', price: 323.18 }],
      addOns: [],
    });

    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 3,
      childQuantity: 1,
      selectedDate: '2099-01-01',
      selectedBookingOption: { id: 'group' },
    }], 'brand-a');

    expect(result.pricing.subtotal).toBeCloseTo(323.18, 2);
  });

  it('steps a Per Couple option up in whole couples', async () => {
    tourLean.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      tenantId: 'brand-a',
      title: 'Sunset cruise',
      discountPrice: 100,
      bookingOptions: [{ id: 'couple', type: 'Per Couple', label: 'Couple package', price: 80 }],
      addOns: [],
    });

    const three = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011', quantity: 3, childQuantity: 0, selectedDate: '2099-01-01',
      selectedBookingOption: { id: 'couple' },
    }], 'brand-a');
    expect(three.pricing.subtotal).toBe(160); // 3 people → 2 couples

    const two = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011', quantity: 2, childQuantity: 0, selectedDate: '2099-01-01',
      selectedBookingOption: { id: 'couple' },
    }], 'brand-a');
    expect(two.pricing.subtotal).toBe(80);
  });

  it('keeps Per Person options on the per-guest rule with children at half', async () => {
    tourLean.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      tenantId: 'brand-a',
      title: 'City tour',
      discountPrice: 100,
      bookingOptions: [{ id: 'std', type: 'Per Person', label: 'Standard', price: 50 }],
      addOns: [],
    });
    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011', quantity: 2, childQuantity: 1, selectedDate: '2099-01-01',
      selectedBookingOption: { id: 'std' },
    }], 'brand-a');
    expect(result.pricing.subtotal).toBe(125);
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
  it('refuses a party below the option minimum, however the browser was told', async () => {
    await expect(calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      childQuantity: 0,
      selectedDate: '2099-01-01',
      selectedBookingOption: { id: 'couple', price: 0.01 },
    }], 'brand-a')).rejects.toThrow('This option needs at least 2 participants');
  });

  it('refuses a party past the option maximum', async () => {
    await expect(calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 4,
      childQuantity: 1,
      selectedDate: '2099-01-01',
      selectedBookingOption: { id: 'couple', price: 0.01 },
    }], 'brand-a')).rejects.toThrow('This option takes at most 4 participants');
  });

  it('bills a party inside the window in whole couples', async () => {
    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 3,
      childQuantity: 0,
      selectedDate: '2099-01-01',
      selectedBookingOption: { id: 'couple', price: 0.01 },
    }], 'brand-a');

    expect(result.pricing.subtotal).toBe(300);
  });

});

describe('checkout pricing applies the tour discount exactly like the booking writer', () => {
  // The payment intent (this module) and the post-payment booking writer both
  // price through authoritativeBasePrice. These tests pin the charged amount
  // to the discounted quote the sidebar shows, so the two can never drift.
  const discountedTour = {
    _id: '507f1f77bcf86cd799439011',
    tenantId: 'brand-a',
    title: 'Discounted tour',
    price: 100,
    discountPrice: 100,
    discountPercent: 20,
    bookingOptions: [
      {
        id: 'private',
        label: 'Private',
        price: 150,
        applyTourDiscount: true,
        timeSlots: [
          { time: '14:00', price: 200 },
          { time: '16:00' },
        ],
      },
      { id: 'group', label: 'Group', price: 90, applyTourDiscount: false },
    ],
    addOns: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    discountLean.mockResolvedValue(null);
    tourLean.mockResolvedValue(discountedTour);
  });

  it('charges the discounted option price when the option opted in', async () => {
    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 2,
      selectedDate: '2099-01-01',
      selectedBookingOption: { id: 'private', price: 0.01 },
    }], 'brand-a');

    // 150 - 20% = 120 per adult
    expect(result.cart[0].selectedBookingOption.price).toBe(120);
    expect(result.cart[0].discountPrice).toBe(120);
    expect(result.pricing.subtotal).toBe(240);
    expect(result.pricing.total).toBe(259.2); // + 3% fee + 5% tax
  });

  it('charges full price for an option that did not opt in to the discount', async () => {
    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      selectedDate: '2099-01-01',
      selectedBookingOption: { id: 'group' },
    }], 'brand-a');

    expect(result.cart[0].selectedBookingOption.price).toBe(90);
    expect(result.pricing.subtotal).toBe(90);
  });

  it('discounts a time-slot price override when one matches the selected time', async () => {
    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      selectedDate: '2099-01-01',
      selectedTime: '14:00',
      selectedBookingOption: { id: 'private' },
    }], 'brand-a');

    // slot 200 - 20% = 160
    expect(result.cart[0].selectedBookingOption.price).toBe(160);
    expect(result.pricing.subtotal).toBe(160);
  });

  it('falls back to the discounted option base when the slot has no price', async () => {
    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      selectedDate: '2099-01-01',
      selectedTime: '16:00',
      selectedBookingOption: { id: 'private' },
    }], 'brand-a');

    expect(result.cart[0].selectedBookingOption.price).toBe(120);
    expect(result.pricing.subtotal).toBe(120);
  });

  it('still rejects an option whose stored price is invalid', async () => {
    tourLean.mockResolvedValueOnce({
      ...discountedTour,
      bookingOptions: [{ id: 'broken', label: 'Broken', price: Number.NaN }],
    });
    await expect(calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      selectedDate: '2099-01-01',
      selectedBookingOption: { id: 'broken' },
    }], 'brand-a')).rejects.toThrow('Invalid tour price');
  });

  it('applies the percentage to the no-option tour base price', async () => {
    const result = await calculateCheckoutPricing([{
      id: '507f1f77bcf86cd799439011',
      quantity: 1,
      selectedDate: '2099-01-01',
    }], 'brand-a');

    // The percentage always applies to the tour base; only named booking
    // options require the explicit opt-in checkbox.
    expect(result.pricing.subtotal).toBe(80);
  });

});
