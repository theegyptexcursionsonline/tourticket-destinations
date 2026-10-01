import { extractBookingReference } from '@/lib/booking/bookingReference';
import { whatsAppLink } from '@/lib/contact/whatsAppLink';

describe('extractBookingReference', () => {
  it.each([
    ['HEO-12345678-AB12CD', 'HEO-12345678-AB12CD'],
    ['heo-12345678-ab12cd', 'HEO-12345678-AB12CD'],
    ['  HEO-12345678-AB12CD\n', 'HEO-12345678-AB12CD'],
    ['Booking HEO-12345678-AB12CD', 'HEO-12345678-AB12CD'],
    ['#HEO-12345678-AB12CD.', 'HEO-12345678-AB12CD'],
    ['ＨＥＯ－１２３４５６７８－ＡＢ１２ＣＤ', 'HEO-12345678-AB12CD'],
    ['MULTI-1759320000000', 'MULTI-1759320000000'],
  ])('finds the reference in %j', (input, expected) => {
    expect(extractBookingReference(input)).toBe(expected);
  });

  it.each(['', '   ', 'my holiday', 'HEO', 'A-1', 'Booking', `${'A'.repeat(30)}-${'B'.repeat(20)}`])(
    'returns null for %j',
    (input) => {
      expect(extractBookingReference(input)).toBeNull();
    },
  );
});

describe('whatsAppLink', () => {
  it('builds a wa.me link from a configured number', () => {
    expect(whatsAppLink('+20 114 225 5624')).toBe('https://wa.me/201142255624');
    expect(whatsAppLink('0049 151 2345 6789')).toBe('https://wa.me/4915123456789');
  });

  it.each([undefined, null, '', '12345', '+20 000 000 0000', '+1 0000000', '1'.repeat(16)])(
    'offers nothing for %j',
    (value) => {
      expect(whatsAppLink(value)).toBeNull();
    },
  );
});
