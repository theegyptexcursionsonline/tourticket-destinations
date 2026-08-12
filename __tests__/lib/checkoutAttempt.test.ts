import {
  clearCheckoutAttemptId,
  getOrCreateCheckoutAttemptId,
  normalizeCheckoutAttemptId,
} from '@/lib/checkout/checkoutAttempt';

describe('checkout attempt identity', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('normalizes only RFC 4122 version-4 attempt ids', () => {
    expect(normalizeCheckoutAttemptId('123E4567-E89B-42D3-A456-426614174000'))
      .toBe('123e4567-e89b-42d3-a456-426614174000');
    expect(normalizeCheckoutAttemptId('123e4567-e89b-12d3-a456-426614174000')).toBeNull();
    expect(normalizeCheckoutAttemptId('../attempt')).toBeNull();
  });

  it('reuses one tab-scoped id until checkout completes, then rotates it', () => {
    const randomUUID = jest.spyOn(window.crypto, 'randomUUID')
      .mockReturnValueOnce('123e4567-e89b-42d3-a456-426614174000')
      .mockReturnValueOnce('123e4567-e89b-42d3-b456-426614174001');
    expect(getOrCreateCheckoutAttemptId()).toBe('123e4567-e89b-42d3-a456-426614174000');
    expect(getOrCreateCheckoutAttemptId()).toBe('123e4567-e89b-42d3-a456-426614174000');
    clearCheckoutAttemptId();
    expect(getOrCreateCheckoutAttemptId()).toBe('123e4567-e89b-42d3-b456-426614174001');
    expect(randomUUID).toHaveBeenCalledTimes(2);
  });
});
