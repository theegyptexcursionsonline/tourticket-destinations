import { shouldRedirectEmptyCheckout } from '../cartReadiness';

describe('checkout cart readiness', () => {
  it('keeps a customer on checkout while a stored cart is still restoring', () => {
    expect(shouldRedirectEmptyCheckout({
      isCartReady: false,
      cartLength: 0,
      isConfirmed: false,
    })).toBe(false);
  });

  it('keeps a restored non-empty cart on checkout', () => {
    expect(shouldRedirectEmptyCheckout({
      isCartReady: true,
      cartLength: 1,
      isConfirmed: false,
    })).toBe(false);
  });

  it('leaves checkout only after an empty cart has finished restoring', () => {
    expect(shouldRedirectEmptyCheckout({
      isCartReady: true,
      cartLength: 0,
      isConfirmed: false,
    })).toBe(true);
  });

  it('does not leave the confirmation screen after checkout clears the cart', () => {
    expect(shouldRedirectEmptyCheckout({
      isCartReady: true,
      cartLength: 0,
      isConfirmed: true,
    })).toBe(false);
  });
});
