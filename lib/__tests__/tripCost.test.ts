// lib/__tests__/tripCost.test.ts
import { computeTripCost, clamp, TRIP_STYLES, VISA_PER_PERSON, formatUsd } from '../tripCost';

describe('tripCost — clamp', () => {
  it('clamps into range and defaults NaN to min', () => {
    expect(clamp(5, 1, 30)).toBe(5);
    expect(clamp(0, 1, 30)).toBe(1);
    expect(clamp(99, 1, 30)).toBe(30);
    expect(clamp('abc', 1, 30)).toBe(1);
  });
});

describe('tripCost — computeTripCost', () => {
  it('defaults to 7 days / 2 travellers / comfort', () => {
    const r = computeTripCost();
    expect(r.days).toBe(7);
    expect(r.travelers).toBe(2);
    expect(r.style).toBe('comfort');
  });

  it('per-person = perDay * days + visa; total = perPerson * travelers', () => {
    const r = computeTripCost({ days: 10, travelers: 2, style: 'budget' });
    const s = TRIP_STYLES.budget;
    const perDay = s.hotel + s.food + s.transport + s.activities;
    expect(r.perDay).toBe(perDay);
    expect(r.perPerson).toBe(Math.round(perDay * 10 + VISA_PER_PERSON));
    expect(r.total).toBe(r.perPerson * 2);
  });

  it('applies the 15% shared-transport discount for 3+ travellers', () => {
    const two = computeTripCost({ travelers: 2, style: 'luxury' });
    const three = computeTripCost({ travelers: 3, style: 'luxury' });
    expect(two.breakdown.transport).toBe(TRIP_STYLES.luxury.transport);
    expect(three.breakdown.transport).toBeCloseTo(TRIP_STYLES.luxury.transport * 0.85);
    expect(three.perDay).toBeLessThan(two.perDay);
  });

  it('falls back to comfort on unknown style and clamps extremes', () => {
    const r = computeTripCost({ style: 'presidential', days: 400, travelers: -3 });
    expect(r.style).toBe('comfort');
    expect(r.days).toBe(30);
    expect(r.travelers).toBe(1);
  });

  it('luxury costs more than comfort costs more than budget', () => {
    const b = computeTripCost({ style: 'budget' }).total;
    const c = computeTripCost({ style: 'comfort' }).total;
    const l = computeTripCost({ style: 'luxury' }).total;
    expect(b).toBeLessThan(c);
    expect(c).toBeLessThan(l);
  });
});

describe('tripCost — formatUsd', () => {
  it('rounds and formats with thousands separators', () => {
    expect(formatUsd(1234.6)).toBe('$1,235');
    expect(formatUsd(25)).toBe('$25');
  });
});
