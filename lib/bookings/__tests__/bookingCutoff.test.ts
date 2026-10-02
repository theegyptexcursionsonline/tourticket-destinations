import { cutoffScheduleError, cutoffAwareTourPayload, bookingCutoffPayloadError, resolveBookingCutoff, isValidBookingCutoff } from '../bookingCutoff';
import { buildTourDuplicate } from '@/lib/admin/contentDuplication';
describe('booking cutoff contract', () => {
  it.each([0, 1, 120, 43200])('accepts whole duration %s', value => {
    expect(isValidBookingCutoff(value)).toBe(true);
    expect(bookingCutoffPayloadError({ bookingCutoffMinutes: value })).toBeNull();
    expect(resolveBookingCutoff(value)).toBe(value);
  });
  it.each([-1, 43201, 1.5, NaN, Infinity, null, '120'])('rejects invalid setting %s', value => {
    expect(bookingCutoffPayloadError({ bookingCutoffMinutes: value })).toBeTruthy();
    expect(() => resolveBookingCutoff(value)).toThrow();
  });
  it('preserves omitted updates and old records', () => {
    const body = { title: 'Changed' };
    expect(bookingCutoffPayloadError(body)).toBeNull();
    expect(body).toEqual({ title: 'Changed' });
    expect(resolveBookingCutoff(undefined)).toBe(0);
  });
  it('retains cutoff in a draft duplicate', () => {
    expect(buildTourDuplicate({ title: 'Tour', slug: 'tour', bookingCutoffMinutes: 120 }, { id: 'copy', tenantId: 'brand-a', attempt: 0 })).toMatchObject({ bookingCutoffMinutes: 120 });
  });
});

it('omits stale cutoff during unrelated edits but sends deliberate cutoff change alone', () => {
  const loaded = { title: 'Original', bookingCutoffMinutes: 0 };
  const changedTitle = { title: 'Changed', bookingCutoffMinutes: 0 };
  expect(cutoffAwareTourPayload(changedTitle, changedTitle, loaded)).toEqual({ title: 'Changed' });
  const changedCutoff = { ...loaded, bookingCutoffMinutes: 120 };
  expect(cutoffAwareTourPayload(changedCutoff, changedCutoff, loaded)).toEqual({ bookingCutoffMinutes: 120 });
  expect(cutoffAwareTourPayload(changedCutoff, changedCutoff, null)).toEqual(changedCutoff);
});

it('requires an authored departure schedule for a positive cutoff', () => {
  expect(cutoffScheduleError({ bookingCutoffMinutes: 120 })).toBeTruthy();
  expect(cutoffScheduleError({ bookingCutoffMinutes: 120, availability: { slots: [{ time: 'Anytime' }] } })).toBeTruthy();
  expect(cutoffScheduleError({ bookingCutoffMinutes: 120, availability: { slots: [{ time: '09:00' }] } })).toBeNull();
  expect(cutoffScheduleError({ bookingCutoffMinutes: 0 })).toBeNull();
});
