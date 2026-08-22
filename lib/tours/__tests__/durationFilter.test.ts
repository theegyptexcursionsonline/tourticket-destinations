import {
  parseDurationSpan,
  durationMatchesBucket,
  parseDurationBuckets,
  durationValuesMatchingBuckets,
} from '../durationFilter';

// The real vocabulary, taken from the live catalogue on 2026-08-20.
const CATALOGUE = [
  '4 hours', '3 hours', '2 hours', '8 hours', '5 hours', '7 hours', '6 hours',
  '10 hours', '2 - 5 hours', '2 days', 'Variable', '2.5 hours', '12 hours',
  '15-20 minutes flight', '16 hours',
];

describe('reading a duration', () => {
  it('reads a single figure', () => {
    expect(parseDurationSpan('4 hours')).toEqual({ minHours: 4, maxHours: 4 });
    expect(parseDurationSpan('2.5 hours')).toEqual({ minHours: 2.5, maxHours: 2.5 });
  });

  it('reads a range as a span', () => {
    expect(parseDurationSpan('2 - 5 hours')).toEqual({ minHours: 2, maxHours: 5 });
  });

  it('converts days and minutes to hours', () => {
    expect(parseDurationSpan('2 days')).toEqual({ minHours: 48, maxHours: 48 });
    const flight = parseDurationSpan('15-20 minutes flight')!;
    expect(flight.minHours).toBeCloseTo(0.25);
    expect(flight.maxHours).toBeCloseTo(0.333, 2);
  });

  it('refuses to guess when there is no figure', () => {
    expect(parseDurationSpan('Variable')).toBeNull();
    expect(parseDurationSpan('')).toBeNull();
    expect(parseDurationSpan(null)).toBeNull();
    expect(parseDurationSpan(undefined)).toBeNull();
  });
});

describe('matching a bucket', () => {
  it('puts a single figure in the bucket that contains it', () => {
    expect(durationMatchesBucket('2 hours', 0, 2)).toBe(true);
    expect(durationMatchesBucket('4 hours', 2, 4)).toBe(true);
    expect(durationMatchesBucket('8 hours', 6, 24)).toBe(true);
    expect(durationMatchesBucket('8 hours', 0, 2)).toBe(false);
  });

  it('puts a range in every bucket it overlaps, because either choice could take it', () => {
    expect(durationMatchesBucket('2 - 5 hours', 2, 4)).toBe(true);
    expect(durationMatchesBucket('2 - 5 hours', 4, 6)).toBe(true);
    expect(durationMatchesBucket('2 - 5 hours', 6, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('never claims an unreadable duration matches', () => {
    for (const [min, max] of [[0, 2], [2, 4], [4, 6], [6, 24]]) {
      expect(durationMatchesBucket('Variable', min, max)).toBe(false);
    }
  });

  it('treats a multi-day tour as long, not short', () => {
    expect(durationMatchesBucket('2 days', 0, 2)).toBe(false);
    expect(durationMatchesBucket('2 days', 6, Number.POSITIVE_INFINITY)).toBe(true);
  });
});

describe('the bucket syntax the search page sends', () => {
  it('parses the UI values', () => {
    // The last bucket is "more than 6 hours", so its top is open.
    expect(parseDurationBuckets('0-2,2-4,4-6,6-24'))
      .toEqual([[0, 2], [2, 4], [4, 6], [6, Number.POSITIVE_INFINITY]]);
  });

  it('ignores anything malformed rather than throwing', () => {
    expect(parseDurationBuckets('')).toEqual([]);
    expect(parseDurationBuckets('abc')).toEqual([]);
    expect(parseDurationBuckets('0-2,broken')).toEqual([[0, 2]]);
    expect(parseDurationBuckets(null)).toEqual([]);
  });
});

describe('narrowing the catalogue to a bucket', () => {
  it('selects only the stored values a bucket covers', () => {
    const short = durationValuesMatchingBuckets(CATALOGUE, [[0, 2]]);
    expect(short).toEqual(expect.arrayContaining(['2 hours', '15-20 minutes flight']));
    expect(short).not.toContain('8 hours');
    expect(short).not.toContain('2 days');
    expect(short).not.toContain('Variable');
  });

  it('covers the long bucket including multi-day tours', () => {
    const long = durationValuesMatchingBuckets(CATALOGUE, parseDurationBuckets('6-24'));
    expect(long).toEqual(expect.arrayContaining(['8 hours', '10 hours', '12 hours', '16 hours', '2 days']));
    expect(long).not.toContain('2 hours');
  });

  it('unions several buckets without repeating a value', () => {
    const combined = durationValuesMatchingBuckets(CATALOGUE, [[0, 2], [2, 4]]);
    expect(new Set(combined).size).toBe(combined.length);
    expect(combined).toContain('2 hours');
    expect(combined).toContain('3 hours');
  });

  it('returns nothing when asked for no bucket, so the filter is never silently dropped', () => {
    expect(durationValuesMatchingBuckets(CATALOGUE, [])).toEqual([]);
  });

  it('survives nulls and blanks in the stored data', () => {
    expect(durationValuesMatchingBuckets([null, undefined, '', '  ', '3 hours'], [[2, 4]]))
      .toEqual(['3 hours']);
  });
});
