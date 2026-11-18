import {
  optionHasRealPrice,
  unpricedBookingOptionNames,
  unpricedOptionsMessage,
  unpricedOptionsWarning,
} from '@/lib/admin/unpricedBookingOptions';

describe('booking options with no real price', () => {
  it('a priced base, with or without start times, is priced', () => {
    expect(optionHasRealPrice({ label: 'Private', price: 60 })).toBe(true);
    expect(optionHasRealPrice({ label: 'Private', price: '60', timeSlots: [{ price: undefined }] })).toBe(true);
  });

  it('a 0 base priced on one start time is priced', () => {
    expect(optionHasRealPrice({ label: 'Shared', price: 0, timeSlots: [{ price: 0 }, { price: 116 }] })).toBe(true);
  });

  it('a 0 or blank base with no priced start time is unpriced', () => {
    expect(optionHasRealPrice({ label: 'A', price: 0 })).toBe(false);
    expect(optionHasRealPrice({ label: 'B', price: '' })).toBe(false);
    expect(optionHasRealPrice({ label: 'C', price: null, timeSlots: [{ price: null }] })).toBe(false);
    expect(optionHasRealPrice({ label: 'D', price: 0, timeSlots: [{}, { price: 0 }] })).toBe(false);
  });

  it('an explicit 0 on every start time is not a price even with a priced base', () => {
    expect(optionHasRealPrice({ label: 'E', price: 60, timeSlots: [{ price: 0 }] })).toBe(false);
  });

  it('hostile values are never a price', () => {
    expect(optionHasRealPrice({ label: 'F', price: -5 })).toBe(false);
    expect(optionHasRealPrice({ label: 'G', price: Number.NaN })).toBe(false);
    expect(optionHasRealPrice({ label: 'H', price: 'abc' })).toBe(false);
    expect(optionHasRealPrice({ label: 'I', price: Infinity })).toBe(false);
    expect(optionHasRealPrice(null)).toBe(false);
  });

  it('lists unpriced options by name in form order, naming blank labels by position', () => {
    expect(unpricedBookingOptionNames([
      { label: 'Private Tour with Transfers', price: 60 },
      { label: '  Private Cairo Experience  ', price: 0 },
      { label: '', price: 0 },
      { title: 'Legacy title', price: 0, timeSlots: [{ price: 0 }] },
      null,
      'junk',
    ])).toEqual(['Private Cairo Experience', 'Option 3', 'Legacy title']);
  });

  it('no options, or not a list, means nothing to warn about', () => {
    expect(unpricedBookingOptionNames([])).toEqual([]);
    expect(unpricedBookingOptionNames(undefined)).toEqual([]);
    expect(unpricedBookingOptionNames({ label: 'x' })).toEqual([]);
    expect(unpricedOptionsWarning(undefined)).toEqual({ unpricedOptions: [] });
  });

  it('wording names each option and says it can still be saved as is', () => {
    expect(unpricedOptionsMessage([])).toBe('');
    expect(unpricedOptionsMessage(['Private Cairo Experience'])).toBe(
      'Saved. "Private Cairo Experience" has no price, so customers see "Price on request" and cannot book it online.',
    );
    expect(unpricedOptionsMessage(['A', 'B'])).toContain('"A", "B" have no price');
  });
});
