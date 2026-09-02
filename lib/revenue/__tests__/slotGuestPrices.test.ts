import { effectiveSlotGuestPrices } from '@/lib/revenue/guestPrices';

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

  it('falls back safely when no child or infant catalogue price exists', () => {
    expect(effectiveSlotGuestPrices({ adult: 81 })).toEqual({ adult: 81, child: 40.5, infant: 0 });
  });
});
