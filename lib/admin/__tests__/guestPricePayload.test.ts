import { guestPricePayloadError } from '@/lib/admin/guestPricePayload';

describe('admin guest-price payload validation', () => {
  it('accepts complete numeric strings, zero prices and an explicit blank clear', () => {
    expect(guestPricePayloadError({ revenueGuestPrices: { child: '60', infant: '0' } })).toBeNull();
    expect(guestPricePayloadError({ revenueGuestPrices: { child: '', infant: '' } })).toBeNull();
  });

  it.each([
    [{ revenueGuestPrices: { child: 60, infant: '' } }, 'requires both'],
    [{ revenueGuestPrices: { child: -1, infant: 0 } }, 'between 0'],
    [{ revenueGuestPrices: { child: 'nope', infant: 0 } }, 'between 0'],
    [{ revenueGuestPrices: { child: 1_000_000, infant: 0 } }, 'between 0'],
    [{ bookingOptions: [{ guestPrices: { child: 10, infant: Number.NaN } }] }, 'between 0'],
    [{ availability: { slots: [{ guestPrices: { child: Number.POSITIVE_INFINITY } }] } }, 'between 0'],
    [{ bookingOptions: [{ timeSlots: [{ guestPrices: { infant: -1 } }] }] }, 'between 0'],
  ])('rejects malformed values before normalization', (body, message) => {
    expect(guestPricePayloadError(body)).toContain(message);
  });

  it('allows a slot to override only one guest type while the other inherits', () => {
    expect(guestPricePayloadError({
      bookingOptions: [{ timeSlots: [{ guestPrices: { child: 25, infant: '' } }] }],
    })).toBeNull();
  });
});
