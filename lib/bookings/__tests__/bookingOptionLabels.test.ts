import { bookingOptionUnitLabel } from '@/lib/bookings/bookingOptionLabels';

describe('bookingOptionUnitLabel', () => {
  it.each([['Per Person', 'per person'], ['Per Couple', 'per couple'], ['Per Group', 'per group'], ['Per Family', 'per family']])('maps %s truthfully', (type, expected) => {
    expect(bookingOptionUnitLabel(type)).toBe(expected);
  });
  it('uses a neutral label for unknown legacy types', () => expect(bookingOptionUnitLabel('')).toBe('per booking'));
});
