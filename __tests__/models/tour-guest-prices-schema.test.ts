/** @jest-environment node */
// The Tour schema is the last line of defence for guest prices: a stored set
// must be complete and non-negative, and per-departure overrides must be
// real amounts. Compiled through Mongoose, not asserted on source text.
import Tour from '@/lib/models/Tour';

const objectId = '507f1f77bcf86cd799439011';

const baseTour = (overrides: Record<string, unknown> = {}) => ({
  tenantId: 'brand-a',
  title: 'Guest priced tour',
  slug: 'guest-priced-tour',
  description: 'A tour long enough to satisfy the description minimum length.',
  discountPrice: 100,
  duration: '8 hours',
  image: '/images/tour.jpg',
  destination: objectId,
  category: [objectId],
  ...overrides,
});

const errorPaths = (doc: Record<string, unknown>) => Object.keys(new Tour(doc).validateSync()?.errors || {});

describe('Tour guest-price schema', () => {
  it('accepts a complete tour set, option set and per-slot overrides', () => {
    const doc = new Tour(baseTour({
      revenueGuestPrices: { adult: 100, child: 60, infant: 10 },
      availability: { type: 'daily', slots: [{ time: '10:00', capacity: 10, guestPrices: { child: 40 } }] },
      bookingOptions: [{
        id: 'opt-1',
        type: 'Per Person',
        label: 'Private',
        price: 150,
        duration: '6 hours',
        guestPrices: { adult: 150, child: 90, infant: 20 },
        timeSlots: [{ time: '10:00', capacity: 10, guestPrices: { infant: 0 } }],
      }],
    }));

    expect(doc.validateSync()).toBeUndefined();
    const stored = doc.toObject();
    expect(stored.revenueGuestPrices).toEqual({ adult: 100, child: 60, infant: 10 });
    expect(stored.bookingOptions?.[0]?.guestPrices).toEqual({ adult: 150, child: 90, infant: 20 });
    expect(stored.bookingOptions?.[0]?.timeSlots?.[0]?.guestPrices).toEqual({ infant: 0 });
    expect(stored.availability?.slots?.[0]?.guestPrices).toEqual({ child: 40 });
  });

  it('rejects negative guest prices everywhere they can be stored', () => {
    expect(errorPaths(baseTour({ revenueGuestPrices: { adult: 100, child: -1, infant: 0 } })))
      .toContain('revenueGuestPrices.child');
    expect(errorPaths(baseTour({
      bookingOptions: [{ type: 'Per Person', label: 'Private', price: 150, guestPrices: { adult: 150, child: 90, infant: -5 } }],
    }))).toContain('bookingOptions.0.guestPrices.infant');
    expect(errorPaths(baseTour({
      bookingOptions: [{ type: 'Per Person', label: 'Private', price: 150, timeSlots: [{ time: '10:00', guestPrices: { child: -2 } }] }],
    }))).toContain('bookingOptions.0.timeSlots.0.guestPrices.child');
    expect(errorPaths(baseTour({
      availability: { type: 'daily', slots: [{ time: '10:00', capacity: 10, guestPrices: { infant: -1 } }] },
    }))).toContain('availability.slots.0.guestPrices.infant');
  });

  it('rejects a partial tour or option set — child and infant travel together', () => {
    expect(errorPaths(baseTour({ revenueGuestPrices: { adult: 100, child: 60 } })))
      .toContain('revenueGuestPrices.infant');
    expect(errorPaths(baseTour({
      bookingOptions: [{ type: 'Per Person', label: 'Private', price: 150, guestPrices: { adult: 150, infant: 0 } }],
    }))).toContain('bookingOptions.0.guestPrices.child');
  });

  it('allows a slot override with only one of child/infant (the other inherits)', () => {
    expect(errorPaths(baseTour({
      availability: { type: 'daily', slots: [{ time: '10:00', capacity: 10, guestPrices: { child: 40 } }] },
    }))).toEqual([]);
  });

  it('allows the sets to be absent (network default: child half, infant free)', () => {
    expect(errorPaths(baseTour({ bookingOptions: [{ type: 'Per Person', label: 'Private', price: 150 }] }))).toEqual([]);
  });
});
