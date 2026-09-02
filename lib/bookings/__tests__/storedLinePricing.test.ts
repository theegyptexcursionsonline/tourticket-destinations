import { allocateChargedTotal, priceStoredLine } from '@/lib/bookings/storedLinePricing';
import { optionSubtotal } from '@/lib/bookings/optionSubtotal';

const tour = {
  _id: 't1',
  discountPrice: 90,
  discountPercent: 10,
  revenueGuestPrices: { adult: 90, child: 40, infant: 5 },
  availability: { slots: [{ time: '09:00', capacity: 10 }, { time: '14:00', capacity: 10, guestPrices: { child: 45 } }] },
  bookingOptions: [
    { id: 'legacy', type: 'Per Person', label: 'Standard', price: 100 },
    { id: 'priced', type: 'Per Person', label: 'Family', price: 100, guestPrices: { adult: 100, child: 70, infant: 15 } },
    {
      id: 'slotted', type: 'Per Person', label: 'Evening', price: 100,
      guestPrices: { adult: 100, child: 70, infant: 15 },
      timeSlots: [{ time: '14:00', guestPrices: { child: 80, infant: 0 } }],
    },
    { id: 'discounted', type: 'Per Person', label: 'Promo', price: 100, applyTourDiscount: true, guestPrices: { adult: 100, child: 70, infant: 15 } },
    { type: 'Per Couple', label: 'Legacy couple without id', price: 150, minCapacity: 2 },
  ],
};
const option = (id: string) => tour.bookingOptions.find((candidate) => candidate.id === id)!;

describe('priceStoredLine', () => {
  it('legacy option: adult × price, child half, infant free — exactly the previous rule', () => {
    const priced = priceStoredLine({ tour, option: option('legacy'), selectedTime: '09:00', adults: 2, children: 1, infants: 1 });
    expect(priced.guestPrices).toEqual({ adult: 100, child: 50, infant: 0 });
    expect(priced.tourSubtotal).toBe(optionSubtotal(option('legacy'), 100, 2, 1, 1));
    expect(priced.unitPriced).toBe(false);
  });

  it('child-priced option charges the stored child and infant prices', () => {
    const priced = priceStoredLine({ tour, option: option('priced'), selectedTime: '09:00', adults: 2, children: 1, infants: 1 });
    expect(priced.guestPrices).toEqual({ adult: 100, child: 70, infant: 15 });
    expect(priced.tourSubtotal).toBe(285);
  });

  it('per-departure override applies to that departure only', () => {
    expect(priceStoredLine({ tour, option: option('slotted'), selectedTime: '14:00', adults: 2, children: 1, infants: 1 }))
      .toMatchObject({ guestPrices: { adult: 100, child: 80, infant: 0 }, tourSubtotal: 280 });
    expect(priceStoredLine({ tour, option: option('slotted'), selectedTime: '09:00', adults: 2, children: 1, infants: 1 }))
      .toMatchObject({ guestPrices: { adult: 100, child: 70, infant: 15 }, tourSubtotal: 285 });
  });

  it('applies the tour discount to every guest price of an opted-in option', () => {
    expect(priceStoredLine({ tour, option: option('discounted'), selectedTime: null, adults: 1, children: 1, infants: 1 }))
      .toMatchObject({ guestPrices: { adult: 90, child: 63, infant: 13.5 }, tourSubtotal: 166.5 });
  });

  it('prices exactly the option the caller matched, even a legacy option with no id', () => {
    const legacyCouple = tour.bookingOptions[4];
    const priced = priceStoredLine({ tour, option: legacyCouple, selectedTime: null, adults: 2, children: 1, infants: 0 });
    // 3 participants in a couple option = 2 units × 150.
    expect(priced).toMatchObject({ unitPriced: true, tourSubtotal: 300, guestPrices: { adult: 150 } });
  });

  it('with no option, prices from the tour-level guest prices and universal slot overrides', () => {
    expect(priceStoredLine({ tour, option: null, selectedTime: '09:00', adults: 1, children: 1, infants: 1 }))
      .toMatchObject({ guestPrices: { adult: 81, child: 36, infant: 4.5 } });
    expect(priceStoredLine({ tour, option: null, selectedTime: '14:00', adults: 1, children: 1, infants: 1 }))
      .toMatchObject({ guestPrices: { adult: 81, child: 40.5, infant: 4.5 } });
  });

  it('reads a Mongoose document through toObject so schema paths are not lost', () => {
    const doc = { toObject: () => tour };
    const optionDoc = { toObject: () => option('priced') };
    expect(priceStoredLine({ tour: doc as never, option: optionDoc as never, selectedTime: null, adults: 1, children: 1, infants: 0 }))
      .toMatchObject({ tourSubtotal: 170 });
  });

  it('never matches the pinned option by the caller-supplied id of another option', () => {
    // Two options share a type; the caller matched the second one.
    const twin = { ...tour, bookingOptions: [option('legacy'), { ...option('priced'), id: 'legacy' }] };
    expect(priceStoredLine({ tour: twin, option: twin.bookingOptions[1], selectedTime: null, adults: 1, children: 1, infants: 0 }).tourSubtotal).toBe(170);
  });
});

describe('allocateChargedTotal', () => {
  it('a single line records the charge exactly', () => {
    expect(allocateChargedTotal([250], 270)).toEqual([270]);
    expect(allocateChargedTotal([33.33], 36)).toEqual([36]);
  });

  it('splits a multi-line charge by subtotal in whole cents that sum to the charge', () => {
    const shares = allocateChargedTotal([100, 50, 33.33], 197.99);
    expect(shares.reduce((sum, value) => sum + Math.round(value * 100), 0)).toBe(19799);
    expect(shares.every((value) => Number.isInteger(Math.round(value * 100)))).toBe(true);
    expect(shares[0]).toBeGreaterThan(shares[1]);
  });

  it('handles zero subtotals without dividing by zero', () => {
    expect(allocateChargedTotal([0, 0], 10)).toEqual([5, 5]);
    expect(allocateChargedTotal([], 10)).toEqual([]);
  });
});
