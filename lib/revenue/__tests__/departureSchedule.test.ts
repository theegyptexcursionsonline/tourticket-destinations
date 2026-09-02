import { localDepartureToUtc, parseIsoDateOnly } from '@/lib/revenue/departureSchedule';

describe('localDepartureToUtc', () => {
  it('uses the Cairo winter offset', () => {
    expect(localDepartureToUtc('2026-01-15', '10:00')).toBe('2026-01-15T08:00:00.000Z');
  });

  it('uses the Cairo daylight-saving offset', () => {
    expect(localDepartureToUtc('2026-07-15', '10:00')).toBe('2026-07-15T07:00:00.000Z');
  });

  it('rejects ambiguous input formats', () => {
    expect(() => localDepartureToUtc('15-07-2026', '10am')).toThrow('Invalid local departure');
    expect(() => localDepartureToUtc('2026-02-31', '10:00')).toThrow('Invalid local departure');
    expect(() => localDepartureToUtc('2026-07-15', '24:00')).toThrow('Invalid local departure');
    expect(parseIsoDateOnly('2026-02-28')).toEqual(new Date('2026-02-28T00:00:00.000Z'));
  });
});
