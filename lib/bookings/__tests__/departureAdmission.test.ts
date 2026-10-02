const mockLean = jest.fn();
const mockTenant = jest.fn();
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { findOne: jest.fn(() => ({ select: () => ({ lean: mockLean }) })) } }));
jest.mock('@/lib/tenant', () => ({ buildStrictTenantQuery: (query: object, tenantId: string) => ({ ...query, tenantId }), getTenantConfigCached: (...args: unknown[]) => mockTenant(...args) }));
import Tour from '@/lib/models/Tour';
import { resolveCheckoutDepartureDeadlines, assertCheckoutDepartures, assertFutureDeparture, departureDeadline, futureCatalogueTimes, readDepartureSnapshot, recheckPreparedDepartures } from '../departureAdmission';
const scheduled = { availability: { type: 'daily', slots: [{ time: '09:00' }, { time: '14:00' }] } };
const day = '2026-07-15';
const deadline = Date.parse('2026-07-15T06:00:00Z');
describe('authoritative departure admission', () => {
  afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });
  it('uses the tenant timezone including Cairo summer time', () => {
    expect(departureDeadline(scheduled, { date: day, time: '09:00' }, 'Africa/Cairo')).toBe(deadline);
    expect(departureDeadline(scheduled, { date: '2026-01-15', time: '09:00' }, 'Africa/Cairo')).toBe(Date.parse('2026-01-15T07:00:00Z'));
    expect(departureDeadline(scheduled, { date: day, time: '09:00' }, 'Asia/Tokyo')).toBe(Date.parse('2026-07-15T00:00:00Z'));
  });
  it('rejects a skipped local clock time and closes a repeated time at its first occurrence', () => {
    const tour = { availability: { type: 'daily', slots: [{ time: '01:30' }] } };
    expect(() => departureDeadline(tour, { date: '2026-03-29', time: '01:30' }, 'Europe/London')).toThrow();
    expect(departureDeadline(tour, { date: '2026-10-25', time: '01:30' }, 'Europe/London')).toBe(Date.parse('2026-10-25T00:30:00Z'));
  });
  it('closes at exact departure, without inventing a cutoff duration', () => {
    expect(() => assertFutureDeparture(deadline, deadline - 1)).not.toThrow();
    expect(() => assertFutureDeparture(deadline, deadline)).toThrow();
    expect(() => assertFutureDeparture(deadline, deadline + 1)).toThrow();
  });
  it.each([undefined, '', 'Anytime', '25:00', '08:00'])('rejects missing or forged departure %s', time => {
    expect(() => departureDeadline(scheduled, { date: day, time }, 'Africa/Cairo')).toThrow();
  });
  it('rejects option-only departure records with no authoritative date schedule', () => {
    expect(() => departureDeadline({ bookingOptions: [{ id: 'one', timeSlots: [{ time: '09:00' }] }] }, { date: day, time: '09:00', optionId: 'one' }, 'Africa/Cairo')).toThrow('not scheduled');
  });
  it('surfaces configuration failure instead of advertising an empty sold-out list', () => {
    expect(() => futureCatalogueTimes(scheduled, day, 'Invalid/Zone')).toThrow('timezone is unavailable');
    expect(() => futureCatalogueTimes(scheduled, day, '')).toThrow('timezone is unavailable');
  });
  it('does not infer a date-only grant from missing authored slots', () => {
    expect(() => departureDeadline({}, { date: day }, 'Africa/Cairo')).toThrow('not scheduled');
  });
  it('rejects invalid calendar days and unavailable zones', () => {
    expect(() => departureDeadline(scheduled, { date: '2026-02-31', time: '09:00' }, 'Africa/Cairo')).toThrow();
    expect(() => departureDeadline(scheduled, { date: day, time: '09:00' }, 'Invalid/Zone')).toThrow();
  });
  it('binds both option identity and pricing key, and uses selected option slots', () => {
    const tour = { ...scheduled, bookingOptions: [{ id: 'morning', pricingKey: 'morning-key', timeSlots: [{ time: '10:00' }] }, { id: 'evening', pricingKey: 'evening-key', timeSlots: [{ time: '18:00' }] }] };
    expect(() => departureDeadline(tour, { date: day, time: '18:00', optionId: 'morning', optionKey: 'evening-key' }, 'Africa/Cairo')).toThrow();
    expect(() => departureDeadline(tour, { date: day, time: '09:00', optionId: 'morning' }, 'Africa/Cairo')).toThrow();
    expect(departureDeadline(tour, { date: day, time: '10:00', optionId: 'morning' }, 'Africa/Cairo')).toBe(deadline + 3600000);
  });
  it('does not advertise elapsed slots while retaining later same-day departures', () => {
    expect(futureCatalogueTimes(scheduled, day, 'Africa/Cairo', deadline)).toEqual({ 'standard-default': ['14:00'] });
    expect(futureCatalogueTimes(scheduled, day, 'Africa/Cairo', deadline + 5 * 3600000)).toEqual({ 'standard-default': [] });
  });
  it('rejects malformed or count-mismatched paid deadline evidence', () => {
    expect(readDepartureSnapshot({}, 1)).toBeNull();
    expect(readDepartureSnapshot({ departure_deadlines_utc: JSON.stringify([deadline]) }, 1)).toEqual([deadline]);
    for (const raw of ['{}', '[0]', '[null]', '[1.5]', '[]']) expect(() => readDepartureSnapshot({ departure_deadlines_utc: raw }, 1)).toThrow();
  });
  it('fails payment creation if the authoritative timezone changed after preparation', async () => {
    jest.useFakeTimers().setSystemTime(deadline - 3600000);
    mockTenant.mockResolvedValue({ localization: { defaultTimezone: 'UTC' } });
    mockLean.mockResolvedValue(scheduled);
    await expect(recheckPreparedDepartures([{ id: 'tour-one', selectedDate: day, selectedTime: '09:00' }], 'brand-one', { departure_deadlines_utc: JSON.stringify([deadline]) })).rejects.toThrow('schedule changed');
  });
  it('uses strict tenant catalogue and rechecks after delayed admission reads', async () => {
    jest.useFakeTimers().setSystemTime(deadline - 1);
    mockTenant.mockResolvedValue({ localization: { defaultTimezone: 'Africa/Cairo' } });
    mockLean.mockImplementation(async () => { jest.setSystemTime(deadline); return scheduled; });
    await expect(assertCheckoutDepartures([{ id: 'tour-one', selectedDate: day, selectedTime: '09:00' }], 'brand-one')).rejects.toThrow();
    expect(Tour.findOne).toHaveBeenCalledWith({ _id: 'tour-one', isPublished: true, archivedAt: null, tenantId: 'brand-one' });
  });
});

describe('configured booking close time', () => {
  afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });
  it('closes precisely at cutoff and retains later departures', () => {
    const tour = { ...scheduled, bookingCutoffMinutes: 120 };
    const close = departureDeadline(tour, { date: day, time: '09:00' }, 'Africa/Cairo');
    expect(close).toBe(deadline - 7200000);
    expect(() => assertFutureDeparture(close, close - 1)).not.toThrow();
    expect(() => assertFutureDeparture(close, close)).toThrow();
    expect(futureCatalogueTimes(tour, day, 'Africa/Cairo', close)).toEqual({ 'standard-default': ['14:00'] });
  });
  it('subtracts elapsed duration across midnight and DST', () => {
    expect(departureDeadline({ ...scheduled, bookingCutoffMinutes: 720 }, { date: day, time: '09:00' }, 'Africa/Cairo')).toBe(Date.parse('2026-07-14T18:00:00Z'));
    expect(departureDeadline({ availability: { type: 'daily', slots: [{ time: '01:30' }] }, bookingCutoffMinutes: 120 }, { date: '2026-10-25', time: '01:30' }, 'Europe/London')).toBe(Date.parse('2026-10-24T22:30:00Z'));
  });
  it('rereads setting and rejects stale prepared payment without trusting cart cutoff', async () => {
    jest.useFakeTimers().setSystemTime(deadline - 24 * 3600000);
    mockTenant.mockResolvedValue({ localization: { defaultTimezone: 'Africa/Cairo' } });
    mockLean.mockResolvedValue({ ...scheduled, bookingCutoffMinutes: 120 });
    const cart = [{ id: 'tour-one', selectedDate: day, selectedTime: '09:00', bookingCutoffMinutes: 0 }];
    await expect(assertCheckoutDepartures(cart, 'brand-one')).resolves.toEqual([deadline - 7200000]);
    await expect(recheckPreparedDepartures(cart, 'brand-one', { departure_deadlines_utc: JSON.stringify([deadline]) })).rejects.toThrow('schedule changed');
    expect(readDepartureSnapshot({ departure_deadlines_utc: JSON.stringify([deadline]) }, 1)).toEqual([deadline]);
    await expect(resolveCheckoutDepartureDeadlines(cart, 'brand-one', true)).resolves.toEqual([deadline]);
  });
});
