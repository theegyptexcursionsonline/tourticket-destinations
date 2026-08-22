import {
  capacityAvailability,
  capacityBlockedMessage,
  defaultMinCapacity,
  effectiveMinCapacity,
  effectiveUnitSize,
  isUnitPricedType,
  minCapacityRequired,
  unitCount,
  unitCountLabel,
  unitPricingForOption,
} from '@/lib/bookings/unitPricing';

describe('unit-priced option types', () => {
  it.each([
    ['Per Couple', true],
    ['Per Family', true],
    ['Per Group', true],
    ['per group', true],
    ['Per Person', false],
    ['', false],
    [undefined, false],
  ])('classifies %p as unit-priced: %p', (type, expected) => {
    expect(isUnitPricedType(type as string | undefined)).toBe(expected);
  });

  it('editor defaults follow the client decision: person 1, couple 2, family 4, group none', () => {
    expect(defaultMinCapacity('Per Person')).toBe(1);
    expect(defaultMinCapacity('Per Couple')).toBe(2);
    expect(defaultMinCapacity('Per Family')).toBe(4);
    expect(defaultMinCapacity('Per Group')).toBeNull();
    expect(minCapacityRequired('Per Group')).toBe(true);
    expect(minCapacityRequired('Per Person')).toBe(false);
  });

  it('an authored minimum overrides the type default', () => {
    expect(effectiveMinCapacity({ type: 'Per Family', minCapacity: 6 })).toBe(6);
    expect(effectiveMinCapacity({ type: 'Per Family' })).toBe(4);
    expect(effectiveMinCapacity({ type: 'Per Group' })).toBeNull();
    expect(effectiveMinCapacity({ type: 'Per Person' })).toBeNull();
  });
});

describe('step-up unit charging (client examples, sheet 2026-08-20)', () => {
  it('Per Couple, min 2: 4 participants are 2 couples; 3 round up to 2 couples', () => {
    expect(unitCount(4, 2)).toBe(2);
    expect(unitCount(3, 2)).toBe(2);
    expect(unitCount(2, 2)).toBe(1);
  });

  it('Per Family, min 4: 8 participants are 2 families; 5 round up to 2', () => {
    expect(unitCount(8, 4)).toBe(2);
    expect(unitCount(5, 4)).toBe(2);
  });

  it('Per Group, min 5: 10 participants are 2 groups; 6 round up to 2', () => {
    expect(unitCount(10, 5)).toBe(2);
    expect(unitCount(6, 5)).toBe(2);
  });

  it('a legacy group option with no capacity charges exactly one unit', () => {
    expect(effectiveUnitSize({ type: 'Per Group' })).toBeNull();
    expect(unitCount(7, null)).toBe(1);
    expect(unitCount(7, 0)).toBe(1);
  });

  it('labels units in the customer wording', () => {
    expect(unitCountLabel('Per Couple', 2)).toBe('2 couples');
    expect(unitCountLabel('Per Family', 1)).toBe('1 family');
    expect(unitCountLabel('Per Family', 2)).toBe('2 families');
    expect(unitCountLabel('Per Group', 3)).toBe('3 groups');
  });
});

describe('capacity availability gates', () => {
  it('blocks below the minimum with a customer-facing reason', () => {
    const availability = capacityAvailability({ type: 'Per Couple' }, 1);
    expect(availability).toEqual({ available: false, reason: 'below_minimum', limit: 2 });
    expect(capacityBlockedMessage(availability)).toBe('Requires at least 2 participants');
  });

  it('blocks above the maximum', () => {
    const availability = capacityAvailability({ type: 'Per Couple', maxCapacity: 4 }, 5);
    expect(availability).toEqual({ available: false, reason: 'above_maximum', limit: 4 });
    expect(capacityBlockedMessage(availability)).toBe('Available for up to 4 participants');
  });

  it('per person stays available at any count unless a maximum is authored', () => {
    expect(capacityAvailability({ type: 'Per Person' }, 1).available).toBe(true);
    expect(capacityAvailability({ type: 'Per Person' }, 40).available).toBe(true);
    expect(capacityAvailability({ type: 'Per Person', maxCapacity: 6 }, 7).available).toBe(false);
  });

  it('a legacy group option has no minimum but honours an authored maximum', () => {
    expect(capacityAvailability({ type: 'Per Group' }, 1).available).toBe(true);
    expect(capacityAvailability({ type: 'Per Group', maxCapacity: 8 }, 9).available).toBe(false);
  });
});

describe('unit pricing derivation for checkout', () => {
  it('emits nothing for per-person options', () => {
    expect(unitPricingForOption({ type: 'Per Person' }, 100)).toBeNull();
  });

  it('emits the unit size and price for configured unit options', () => {
    expect(unitPricingForOption({ type: 'Per Couple', minCapacity: 2 }, 200)).toEqual({ unitSize: 2, unitPrice: 200 });
  });

  it('marks a legacy group as whole-booking with unit size 0', () => {
    expect(unitPricingForOption({ type: 'Per Group' }, 500)).toEqual({ unitSize: 0, unitPrice: 500, wholeBooking: true });
  });
});
