/**
 * When the server says the cart is already paid, the guest should land on their
 * confirmation, not on an error they can do nothing about. The decision is pure
 * so the page it sends them to can never be built from an unchecked value.
 */
import { alreadyPaidReturnPath } from '@/lib/checkout/checkoutConflictRedirect';

describe('alreadyPaidReturnPath', () => {
  it('sends an already-paid guest to the confirmation for that page', () => {
    expect(alreadyPaidReturnPath({ code: 'CHECKOUT_ALREADY_PAID', sessionId: 'cs_test_abc123' }, 'de'))
      .toBe('/de/checkout/return?session_id=cs_test_abc123');
    expect(alreadyPaidReturnPath({ code: 'CHECKOUT_ALREADY_PAID', sessionId: 'cs_live_XYZ789' }, 'en'))
      .toBe('/en/checkout/return?session_id=cs_live_XYZ789');
  });

  it('ignores any other outcome', () => {
    expect(alreadyPaidReturnPath({ code: 'CHECKOUT_PREPARING', sessionId: 'cs_test_abc123' }, 'en')).toBeNull();
    expect(alreadyPaidReturnPath({ code: 'CHECKOUT_REFUNDED', sessionId: 'cs_test_abc123' }, 'en')).toBeNull();
    expect(alreadyPaidReturnPath({ sessionId: 'cs_test_abc123' }, 'en')).toBeNull();
  });

  it('refuses a page id that is not a Stripe Checkout Session id', () => {
    for (const sessionId of [
      undefined,
      '',
      'pi_test_abc123',
      'cs_abc123',
      'cs_test_',
      'cs_test_abc123 ',
      'cs_test_abc/../..',
      'cs_test_abc?x=1',
      'https://evil.example/cs_test_abc123',
      'cs_test_abc123#frag',
    ]) {
      expect(alreadyPaidReturnPath({ code: 'CHECKOUT_ALREADY_PAID', sessionId }, 'en')).toBeNull();
    }
  });

  it('falls back to English rather than trusting an unknown locale in a path', () => {
    expect(alreadyPaidReturnPath({ code: 'CHECKOUT_ALREADY_PAID', sessionId: 'cs_test_abc123' }, '../admin'))
      .toBe('/en/checkout/return?session_id=cs_test_abc123');
    expect(alreadyPaidReturnPath({ code: 'CHECKOUT_ALREADY_PAID', sessionId: 'cs_test_abc123' }, 'fr'))
      .toBe('/fr/checkout/return?session_id=cs_test_abc123');
  });
});
