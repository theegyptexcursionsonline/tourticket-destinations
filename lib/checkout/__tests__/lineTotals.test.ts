import {
  lineAddOnQuantity,
  lineAddOnsTotal,
  lineBasePrice,
  lineGuestBreakdown,
  lineGuestPrices,
  lineTotal,
  lineTourSubtotal,
} from '@/lib/checkout/lineTotals';
import { optionSubtotal } from '@/lib/bookings/optionSubtotal';

// The catalogue snapshot a cart line carries (BookingSidebar spreads the
// tour's bookingOptions and discountPercent into the item).
const bookingOptions = [
  { id: 'legacy', type: 'Per Person', label: 'Standard', price: 100 },
  { id: 'priced', type: 'Per Person', label: 'Family friendly', price: 100, guestPrices: { adult: 100, child: 70, infant: 15 } },
  {
    id: 'slotted',
    type: 'Per Person',
    label: 'Evening',
    price: 100,
    guestPrices: { adult: 100, child: 70, infant: 15 },
    timeSlots: [{ time: '14:00', guestPrices: { child: 80, infant: 0 } }, { time: '09:00' }],
  },
  { id: 'couple', type: 'Per Couple', label: 'Couple', price: 150, minCapacity: 2, maxCapacity: 4, guestPrices: { adult: 150, child: 1, infant: 1 } },
];

const line = (optionId: string, overrides: Record<string, unknown> = {}) => ({
  bookingOptions,
  discountPercent: 0,
  quantity: 2,
  childQuantity: 1,
  infantQuantity: 1,
  selectedTime: '09:00',
  price: 100,
  discountPrice: 100,
  selectedBookingOption: { ...bookingOptions.find((option) => option.id === optionId)!, title: 'x' },
  ...overrides,
});

describe('lineGuestPrices', () => {
  it('legacy option (no guest prices) is the network default: child half, infant free', () => {
    expect(lineGuestPrices(line('legacy'))).toEqual({ adult: 100, child: 50, infant: 0 });
  });

  it('a child-priced option quotes its stored child and infant prices', () => {
    expect(lineGuestPrices(line('priced'))).toEqual({ adult: 100, child: 70, infant: 15 });
  });

  it('a per-departure override wins for the selected time only', () => {
    expect(lineGuestPrices(line('slotted', { selectedTime: '14:00' }))).toEqual({ adult: 100, child: 80, infant: 0 });
    expect(lineGuestPrices(line('slotted', { selectedTime: '09:00' }))).toEqual({ adult: 100, child: 70, infant: 15 });
  });

  it('a server-validated guestPrices set on the line is the authority over the snapshot', () => {
    expect(lineGuestPrices(line('legacy', { guestPrices: { adult: 100, child: 33, infant: 3 } })))
      .toEqual({ adult: 100, child: 33, infant: 3 });
  });

  it('ignores a partial or malformed guestPrices set and resolves from the snapshot', () => {
    expect(lineGuestPrices(line('priced', { guestPrices: { child: 1 } }))).toEqual({ adult: 100, child: 70, infant: 15 });
    expect(lineGuestPrices(line('priced', { guestPrices: { adult: 100, child: -1, infant: 0 } }))).toEqual({ adult: 100, child: 70, infant: 15 });
  });

  it('a stale line whose option is gone falls back to the default instead of throwing', () => {
    expect(lineGuestPrices(line('legacy', { selectedBookingOption: { id: 'removed', price: 90, title: 'Gone' } })))
      .toEqual({ adult: 90, child: 45, infant: 0 });
  });

  it('a line without any snapshot (legacy localStorage cart) uses the quoted base price', () => {
    expect(lineGuestPrices({ price: 80, quantity: 1 })).toEqual({ adult: 80, child: 40, infant: 0 });
    expect(lineBasePrice({ selectedBookingOption: { price: 0 }, discountPrice: 55 })).toBe(55);
  });
});

describe('lineTourSubtotal — identical to the previous rule for legacy tours', () => {
  it.each([
    [1, 0, 0],
    [2, 1, 1],
    [3, 2, 0],
    [1, 3, 2],
  ])('%i adults, %i children, %i infants match optionSubtotal exactly', (adults, children, infants) => {
    const item = line('legacy', { quantity: adults, childQuantity: children, infantQuantity: infants });
    expect(lineTourSubtotal(item)).toBe(optionSubtotal(item.selectedBookingOption, 100, adults, children, infants));
  });

  it('child-priced option: adults × adult + children × child + infants × infant', () => {
    expect(lineTourSubtotal(line('priced'))).toBe(200 + 70 + 15);
  });

  it('per-departure override changes only the departure it is set on', () => {
    expect(lineTourSubtotal(line('slotted', { selectedTime: '14:00' }))).toBe(200 + 80 + 0);
    expect(lineTourSubtotal(line('slotted', { selectedTime: '09:00' }))).toBe(200 + 70 + 15);
  });

  it('a whole-unit option is charged per unit — guest prices never apply per head', () => {
    // 4 participants in a couple option (unit 2) = 2 couples × 150.
    expect(lineTourSubtotal(line('couple'))).toBe(300);
    expect(lineGuestBreakdown(line('couple'))).toEqual([]);
  });
});

describe('add-ons follow the server clamp', () => {
  const selectedAddOnDetails = {
    lunch: { title: 'Lunch', price: 20, perGuest: true },
    photos: { title: 'Photos', price: 35, perGuest: false },
  };
  const withAddOns = line('priced', { addOnQuantityVersion: 1, selectedAddOns: { lunch: 1, photos: 2 }, selectedAddOnDetails: {
    ...selectedAddOnDetails,
    photos: { ...selectedAddOnDetails.photos, maxQuantity: 2 },
  } });

  it('bills a per-person add-on for the units chosen, capped at paying participants, never auto-multiplied', () => {
    expect(lineAddOnQuantity(withAddOns, 'lunch')).toBe(1);
    expect(lineAddOnQuantity(line('priced', { selectedAddOns: { lunch: 9 }, selectedAddOnDetails }), 'lunch')).toBe(3);
    expect(lineAddOnQuantity(withAddOns, 'photos')).toBe(2);
    expect(lineAddOnQuantity(withAddOns, 'unknown')).toBe(0);
  });

  it('totals add-ons and the line', () => {
    expect(lineAddOnsTotal(withAddOns)).toBe(20 + 70);
    expect(lineTotal(withAddOns)).toBe(285 + 90);
  });

  it('keeps legacy unversioned per-person toggles charged for the whole paying party', () => {
    const legacy = line('priced', { selectedAddOns: { lunch: 1 }, selectedAddOnDetails });
    expect(lineAddOnQuantity(legacy, 'lunch')).toBe(3);
    expect(lineAddOnsTotal(legacy)).toBe(60);
  });
});

describe('lineGuestBreakdown', () => {
  it('flags child/infant lines that differ from the network default', () => {
    expect(lineGuestBreakdown(line('priced'))).toEqual([
      { guest: 'adult', count: 2, unitPrice: 100, total: 200, differsFromDefault: false },
      { guest: 'child', count: 1, unitPrice: 70, total: 70, differsFromDefault: true },
      { guest: 'infant', count: 1, unitPrice: 15, total: 15, differsFromDefault: true },
    ]);
  });

  it('a legacy line has nothing that differs from the default', () => {
    expect(lineGuestBreakdown(line('legacy')).every((entry) => !entry.differsFromDefault)).toBe(true);
  });
});
