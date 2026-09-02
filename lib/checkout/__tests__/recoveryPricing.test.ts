import {
  recoveryAddOnsTotal,
  recoveryAddOnUnits,
  recoverPaidCartLine,
  recoveryGuestPrices,
  recoveryTourSubtotal,
} from '@/lib/checkout/recoveryPricing';

describe('immutable paid-price recovery', () => {
  it('reads complete guest-price snapshots from both compact and named shapes', () => {
    expect(recoveryGuestPrices({ bp: 100, gp: [100, 40, 0] })).toEqual({ adult: 100, child: 40, infant: 0 });
    expect(recoveryGuestPrices({ bp: 100, gp: { adult: 110, child: 55, infant: 5 } })).toEqual({ adult: 110, child: 55, infant: 5 });
  });

  it('rejects corrupt paid price and add-on snapshots', () => {
    expect(() => recoveryGuestPrices({ gp: { adult: -1 } })).toThrow('Invalid paid price snapshot');
    expect(() => recoveryAddOnsTotal({ aqv: 1, a: 1, ao: [{ q: 1, p: -5 }] })).toThrow('Invalid paid add-on snapshot');
  });

  it('honours chosen per-person units for new payments and clamps them to paying guests', () => {
    const item = { aqv: 1, a: 2, c: 1 };
    expect(recoveryAddOnUnits(item, { q: 2, pg: true })).toBe(2);
    expect(recoveryAddOnUnits(item, { q: 9, pg: true })).toBe(3);
    expect(recoveryAddOnUnits(item, { q: 2, pg: false })).toBe(2);
  });

  it('preserves the old whole-paying-party rule only for in-flight legacy payments', () => {
    expect(recoveryAddOnUnits({ a: 2, c: 1 }, { q: 1, pg: true })).toBe(3);
    expect(recoveryAddOnUnits({ a: 2, c: 0 }, { q: 0, pg: true })).toBe(0);
  });

  it('reconstructs guest-priced and whole-unit tour totals from the paid snapshot', () => {
    const prices = { adult: 100, child: 50, infant: 5 };
    expect(recoveryTourSubtotal({ a: 2, c: 1, n: 1 }, { type: 'Per Person' }, prices)).toBe(255);
    expect(recoveryTourSubtotal({ a: 3, c: 1, n: 0, us: 2, up: 180 }, { type: 'Per Group' }, prices)).toBe(360);
    expect(recoveryAddOnsTotal({ aqv: 1, a: 2, c: 1, ao: [{ q: 2, p: 10, pg: true }, { q: 3, p: 5, pg: false }] })).toBe(35);
  });

  it('reconstructs a complete paid option after the live option was removed', () => {
    const recovered = recoverPaidCartLine({
      t: 'tour-1', d: '2026-09-10', tm: '14:00', a: 3, c: 1, n: 0,
      bo: 'removed-option', ok: 'removed-option-key', bot: 'Private group', boty: 'Per Group',
      bp: 180, gp: [180, 90, 0], us: 2, up: 180, pv: 3, psv: 'pv1_snapshot',
      aqv: 1, ao: [{ id: 'meal', q: 2, p: 10, pg: true, t: 'Meal' }],
    }, { id: 'tour-1', title: 'Desert Tour', originalPrice: 220 });

    expect(recovered.lineSubtotal).toBe(380);
    expect(recovered.cartItem.selectedBookingOption).toMatchObject({
      id: 'removed-option', pricingKey: 'removed-option-key', type: 'Per Group', minCapacity: 2,
    });
    expect(recovered.cartItem.selectedAddOns).toEqual({ meal: 2 });
  });

  it('rejects malformed dates and incomplete paid guest snapshots', () => {
    const base = { t: 'tour-1', tm: '10:00', a: 1, bo: 'standard-default', ok: 'standard' };
    expect(() => recoverPaidCartLine({ ...base, d: '2026-02-31', gp: [100, 50, 0] }, { id: 'tour-1', title: 'Tour' }))
      .toThrow('Invalid paid cart snapshot');
    expect(() => recoverPaidCartLine({ ...base, d: '2026-09-10', gp: [100, 50] }, { id: 'tour-1', title: 'Tour' }))
      .toThrow('Incomplete paid price snapshot');
  });
});
