import { isTourScheduled } from '@/lib/revenue/departureSchedule';

describe('recurring departure materialization', () => {
  it('honors recurring weekdays and blocked dates', () => {
    const tour = { availability: { type: 'daily', availableDays: [3], blockedDates: [new Date('2026-08-12T00:00:00.000Z')] } };
    expect(isTourScheduled(tour, new Date('2026-08-05T00:00:00.000Z'))).toBe(true);
    expect(isTourScheduled(tour, new Date('2026-08-06T00:00:00.000Z'))).toBe(false);
    expect(isTourScheduled(tour, new Date('2026-08-12T00:00:00.000Z'))).toBe(false);
  });

  it('honors explicit-date schedules', () => {
    const tour = { availability: { type: 'specific_dates', specificDates: [new Date('2026-08-10T00:00:00.000Z')] } };
    expect(isTourScheduled(tour, new Date('2026-08-10T00:00:00.000Z'))).toBe(true);
    expect(isTourScheduled(tour, new Date('2026-08-11T00:00:00.000Z'))).toBe(false);
  });
});
