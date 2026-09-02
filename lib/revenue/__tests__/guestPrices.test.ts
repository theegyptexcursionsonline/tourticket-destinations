import {
  cleanAvailabilitySlotGuestPrices,
  cleanBookingOptionGuestPrices,
  cleanSlotGuestPrices,
  effectiveSlotGuestPrices,
  guestPricedSubtotal,
  guestPricesFromBase,
  hasOnlyConfiguredTimeSlots,
  hasPartialGuestPrices,
  normalizeGuestPriceSet,
  pruneBookingOptionTimeSlots,
  resolveCatalogueGuestPrices,
} from '@/lib/revenue/guestPrices';
import { optionSubtotal } from '@/lib/bookings/optionSubtotal';

describe('normalizeGuestPriceSet', () => {
  it('stores a complete set with adult mirroring the price it is saved against', () => {
    expect(normalizeGuestPriceSet(120, { adult: 999, child: '70', infant: 15 })).toEqual({ adult: 120, child: 70, infant: 15 });
  });

  it.each([
    ['blank pair', { child: '', infant: '' }],
    ['partial pair (child only)', { child: 70, infant: '' }],
    ['partial pair (infant only)', { child: '', infant: 0 }],
    ['negative child', { child: -1, infant: 0 }],
    ['non-numeric', { child: 'abc', infant: 0 }],
    ['not an object', 'nope'],
    ['undefined', undefined],
  ])('returns null for %s', (_label, value) => {
    expect(normalizeGuestPriceSet(120, value)).toBeNull();
  });

  it('returns null when the adult price itself is invalid', () => {
    expect(normalizeGuestPriceSet('', { child: 1, infant: 0 })).toBeNull();
    expect(normalizeGuestPriceSet(-5, { child: 1, infant: 0 })).toBeNull();
  });
});

describe('hasPartialGuestPrices', () => {
  it('flags exactly one of child/infant filled', () => {
    expect(hasPartialGuestPrices({ child: '10', infant: '' })).toBe(true);
    expect(hasPartialGuestPrices({ child: '', infant: 0 })).toBe(true);
    expect(hasPartialGuestPrices({ child: '', infant: '' })).toBe(false);
    expect(hasPartialGuestPrices({ child: 10, infant: 0 })).toBe(false);
    expect(hasPartialGuestPrices(undefined)).toBe(false);
  });
});

describe('cleanSlotGuestPrices', () => {
  it('keeps independent overrides and drops blank or invalid values', () => {
    expect(cleanSlotGuestPrices({ child: '80', infant: '' })).toEqual({ child: 80 });
    expect(cleanSlotGuestPrices({ child: -1, infant: 5 })).toEqual({ infant: 5 });
    expect(cleanSlotGuestPrices({ child: '', infant: '' })).toBeUndefined();
    expect(cleanSlotGuestPrices(null)).toBeUndefined();
  });
});

describe('effectiveSlotGuestPrices', () => {
  it('uses independent slot overrides and inherits omitted guest prices', () => {
    expect(effectiveSlotGuestPrices({
      adult: 120,
      base: { adult: 120, child: 70, infant: 15 },
      slot: { guestPrices: { child: 80 } },
    })).toEqual({ adult: 120, child: 80, infant: 15 });
  });

  it('applies the option discount to every explicit slot price', () => {
    expect(effectiveSlotGuestPrices({
      adult: 90,
      base: { adult: 100, child: 60, infant: 20 },
      slot: { guestPrices: { child: 50, infant: 10 } },
      discountPercent: 10,
      applyDiscount: true,
    })).toEqual({ adult: 90, child: 45, infant: 9 });
  });

  it('falls back to the network default when no child or infant catalogue price exists', () => {
    expect(effectiveSlotGuestPrices({ adult: 81 })).toEqual({ adult: 81, child: 40.5, infant: 0 });
  });
});

describe('guestPricesFromBase', () => {
  it('uses the explicit set when complete, otherwise child half and infant free', () => {
    expect(guestPricesFromBase(100, { adult: 100, child: 70, infant: 10 })).toEqual({ adult: 100, child: 70, infant: 10 });
    expect(guestPricesFromBase(100, { adult: 100, child: 70 } as never)).toEqual({ adult: 100, child: 50, infant: 0 });
    expect(guestPricesFromBase(100)).toEqual({ adult: 100, child: 50, infant: 0 });
  });
});

describe('resolveCatalogueGuestPrices', () => {
  const tour = {
    discountPrice: 100,
    discountPercent: 20,
    revenueGuestPrices: { adult: 100, child: 60, infant: 10 },
    availability: { slots: [{ time: '10:00' }, { time: '14:00', price: 200, guestPrices: { child: 120 } }] },
    bookingOptions: [
      {
        id: 'private',
        type: 'Per Person',
        price: 150,
        applyTourDiscount: true,
        guestPrices: { adult: 150, child: 90, infant: 20 },
        timeSlots: [{ time: '10:00' }, { time: '14:00', price: 200, guestPrices: { child: 100, infant: 0 } }],
      },
      { id: 'plain', type: 'Per Person', price: 80 },
    ],
  };

  it('charges the option set, discounted with the adult price', () => {
    expect(resolveCatalogueGuestPrices(tour, { selectedBookingOption: { id: 'private' }, selectedTime: '10:00' }))
      .toEqual({ adult: 120, child: 72, infant: 16 });
  });

  it('prefers the selected departure override on the option', () => {
    expect(resolveCatalogueGuestPrices(tour, { selectedBookingOption: { id: 'private' }, selectedTime: '14:00' }))
      .toEqual({ adult: 160, child: 80, infant: 0 });
  });

  it('falls back to the network default for an option without guest prices', () => {
    expect(resolveCatalogueGuestPrices(tour, { selectedBookingOption: { id: 'plain' }, selectedTime: '10:00' }))
      .toEqual({ adult: 80, child: 40, infant: 0 });
  });

  it('uses the tour-level RevenuePilot set and universal slot override when no option is chosen', () => {
    expect(resolveCatalogueGuestPrices(tour, { selectedBookingOption: null, selectedTime: '10:00' }))
      .toEqual({ adult: 80, child: 48, infant: 8 });
    expect(resolveCatalogueGuestPrices(tour, { selectedBookingOption: null, selectedTime: '14:00' }))
      .toEqual({ adult: 160, child: 96, infant: 8 });
  });

  it('refuses an option the tour does not have instead of pricing it', () => {
    expect(() => resolveCatalogueGuestPrices(tour, { selectedBookingOption: { id: 'ghost' }, selectedTime: null }))
      .toThrow('Pricing option unavailable');
  });
});

describe('guestPricedSubtotal', () => {
  const prices = { adult: 100, child: 70, infant: 10 };

  it('charges each guest type its own price for Per Person options', () => {
    expect(guestPricedSubtotal({ type: 'Per Person' }, prices, 2, 1, 1)).toBe(280);
    expect(guestPricedSubtotal(null, prices, 1, 2, 0)).toBe(240);
  });

  it('delegates whole-unit options to the shared optionSubtotal rule', () => {
    const couple = { type: 'Per Couple', minCapacity: 2 };
    expect(guestPricedSubtotal(couple, prices, 2, 1, 1)).toBe(optionSubtotal(couple, prices.adult, 2, 1, 1));
    expect(guestPricedSubtotal(couple, prices, 2, 1, 1)).toBe(200);
  });

  it('matches the legacy half-price rule when only a base price exists', () => {
    expect(guestPricedSubtotal({ type: 'Per Person' }, guestPricesFromBase(100), 2, 1, 3))
      .toBe(optionSubtotal({ type: 'Per Person' }, 100, 2, 1, 3));
  });
});

describe('server-side clean helpers', () => {
  it('normalises the option set against the option price and cleans each slot', () => {
    expect(cleanBookingOptionGuestPrices({
      price: 150,
      guestPrices: { adult: 1, child: '90', infant: '20' },
      timeSlots: [
        { time: '10:00', guestPrices: { child: '', infant: '' } },
        { time: '14:00', guestPrices: { child: 100, infant: -2 } },
      ],
    })).toEqual({
      price: 150,
      guestPrices: { adult: 150, child: 90, infant: 20 },
      timeSlots: [{ time: '10:00' }, { time: '14:00', guestPrices: { child: 100 } }],
    });
  });

  it('nulls a partial option set so a stale stored set is unset on update', () => {
    expect(cleanBookingOptionGuestPrices({ price: 150, guestPrices: { child: 90, infant: '' } }).guestPrices).toBeNull();
    expect('guestPrices' in cleanBookingOptionGuestPrices({ price: 150 })).toBe(false);
  });

  it('cleans universal availability slots the same way', () => {
    expect(cleanAvailabilitySlotGuestPrices({
      type: 'daily',
      slots: [{ time: '10:00', capacity: 10, guestPrices: { child: 'x', infant: 5 } }],
    })).toEqual({ type: 'daily', slots: [{ time: '10:00', capacity: 10, guestPrices: { infant: 5 } }] });
  });

  it('prunes option slots the tour availability no longer has, keeping everything else', () => {
    const pruned = pruneBookingOptionTimeSlots(
      [
        { id: 'a', timeSlots: [{ time: '07:00', guestPrices: { child: 42 } }, { time: '07:30' }] },
        { id: 'b' },
      ],
      [{ time: '07:00' }, { time: '08:00' }],
    );
    expect(pruned).toEqual([
      { id: 'a', timeSlots: [{ time: '07:00', guestPrices: { child: 42 } }] },
      { id: 'b' },
    ]);
  });

  it('only accepts option time slots that exist in the tour availability', () => {
    const availability = [{ time: '10:00' }, { time: '14:00' }];
    expect(hasOnlyConfiguredTimeSlots([{ time: '10:00' }], availability)).toBe(true);
    expect(hasOnlyConfiguredTimeSlots([], availability)).toBe(true);
    expect(hasOnlyConfiguredTimeSlots([{ time: '16:00' }], availability)).toBe(false);
    expect(hasOnlyConfiguredTimeSlots([{}], availability)).toBe(false);
  });
});
