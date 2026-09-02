/**
 * One tour, one party, every path — the Stripe amount authority
 * (calculateCheckoutPricing), the browser cart/checkout line
 * (lib/checkout/lineTotals over the catalogue snapshot the cart carries), the
 * post-payment booking writer and the manual booking routes
 * (lib/bookings/storedLinePricing) must produce the SAME tour subtotal and
 * the SAME unit prices. For a legacy tour that number is exactly the previous
 * optionSubtotal result.
 */
jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantId }),
}));

const tourLean = jest.fn();

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
import { lineGuestPrices, lineTourSubtotal } from '@/lib/checkout/lineTotals';
import { priceStoredLine } from '@/lib/bookings/storedLinePricing';
import { optionSubtotal } from '@/lib/bookings/optionSubtotal';

const TOUR_ID = '507f1f77bcf86cd799439011';
const tour = {
  _id: TOUR_ID,
  tenantId: 'brand-a',
  title: 'Parity tour',
  discountPrice: 100,
  discountPercent: 10,
  bookingOptions: [
    { id: 'legacy', type: 'Per Person', label: 'Standard', price: 100 },
    { id: 'priced', type: 'Per Person', label: 'Family', price: 100, guestPrices: { adult: 100, child: 70, infant: 15 } },
    {
      id: 'slotted', type: 'Per Person', label: 'Evening', price: 100,
      guestPrices: { adult: 100, child: 70, infant: 15 },
      timeSlots: [{ time: '14:00', guestPrices: { child: 80, infant: 0 } }, { time: '09:00' }],
    },
    { id: 'discounted', type: 'Per Person', label: 'Promo', price: 100, applyTourDiscount: true, guestPrices: { adult: 100, child: 70, infant: 15 } },
    { id: 'couple', type: 'Per Couple', label: 'Couple', price: 150, minCapacity: 2, maxCapacity: 4, guestPrices: { adult: 150, child: 1, infant: 1 } },
  ],
  addOns: [],
};

const party = { adults: 2, children: 1, infants: 1 };

// What BookingSidebar puts in the cart: the tour snapshot plus the selection.
const cartLine = (optionId: string, selectedTime: string) => {
  const option = tour.bookingOptions.find((candidate) => candidate.id === optionId)!;
  return {
    _id: TOUR_ID,
    bookingOptions: tour.bookingOptions,
    discountPercent: tour.discountPercent,
    discountPrice: tour.discountPrice,
    price: option.price,
    quantity: party.adults,
    childQuantity: party.children,
    infantQuantity: party.infants,
    selectedDate: '2099-05-01',
    selectedTime,
    selectedBookingOption: { id: option.id, title: option.label, type: option.type, price: option.price },
  };
};

const scenarios: Array<[string, string, string, number]> = [
  ['legacy option (child half, infant free)', 'legacy', '09:00', 250],
  ['child-priced option', 'priced', '09:00', 285],
  ['per-departure override at 14:00', 'slotted', '14:00', 280],
  ['per-departure override not selected (09:00)', 'slotted', '09:00', 285],
  ['discounted option (10% on every guest price: 2 × 90 + 63 + 13.5)', 'discounted', '09:00', 256.5],
  ['whole-unit option (2 couples × 150)', 'couple', '09:00', 300],
];

describe('guest prices — every path prices the same line identically', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tourLean.mockResolvedValue(tour);
  });

  it.each(scenarios)('%s', async (_label, optionId, selectedTime, expectedSubtotal) => {
    const line = cartLine(optionId, selectedTime);
    const option = tour.bookingOptions.find((candidate) => candidate.id === optionId)!;

    // 1. The Stripe amount authority.
    const authority = await calculateCheckoutPricing([line], 'brand-a');
    expect(authority.pricing.subtotal).toBe(expectedSubtotal);
    const validated = authority.cart[0];

    // 2. The browser cart / checkout page, from the snapshot the line carries.
    expect(lineTourSubtotal(line)).toBe(expectedSubtotal);
    expect(lineGuestPrices(line)).toEqual(validated.guestPrices);

    // 3. The post-payment booking writer and the manual booking routes.
    const stored = priceStoredLine({ tour, option, selectedTime, ...party });
    expect(stored.tourSubtotal).toBe(expectedSubtotal);
    expect(stored.guestPrices).toEqual(validated.guestPrices);

    // 4. Surfaces that only have the validated line (emails, receipt) agree too.
    expect(lineTourSubtotal(validated)).toBe(expectedSubtotal);
  });

  it('a legacy tour produces exactly the previous optionSubtotal numbers on every path', async () => {
    const legacy = tour.bookingOptions[0];
    const previous = optionSubtotal(legacy, 100, party.adults, party.children, party.infants);
    const line = cartLine('legacy', '09:00');
    const authority = await calculateCheckoutPricing([line], 'brand-a');
    expect(authority.pricing.subtotal).toBe(previous);
    expect(lineTourSubtotal(line)).toBe(previous);
    expect(priceStoredLine({ tour, option: legacy, selectedTime: '09:00', ...party }).tourSubtotal).toBe(previous);
    expect(authority.cart[0].guestPrices).toEqual({ adult: 100, child: 50, infant: 0 });
  });

  it('client-supplied guest prices on the submitted cart never reach the charge', async () => {
    const line = { ...cartLine('priced', '09:00'), guestPrices: { adult: 1, child: 1, infant: 1 } };
    const authority = await calculateCheckoutPricing([line], 'brand-a');
    expect(authority.pricing.subtotal).toBe(285);
    expect(authority.cart[0].guestPrices).toEqual({ adult: 100, child: 70, infant: 15 });
  });
});
