export {};
// Two requests opening the same window at the same moment both miss and both
// try to insert; the unique index rejects the loser with E11000. That is the
// exact burst a rate limiter exists to survive — unhandled it produced 500s
// instead of 429s (observed live: 33 of 50 concurrent requests).
//
// These drive the REAL Mongo-backed store through a mocked model, because the
// retry belongs to the unique-index upsert, not to the generic store contract.
const mockFindOneAndUpdate = jest.fn();
jest.mock('@/lib/models/AbuseRateLimit', () => ({
  __esModule: true,
  default: { findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args) },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { consumeAbuseLimit } = require('@/lib/security/distributedAbuseLimit') as typeof import('@/lib/security/distributedAbuseLimit');

const duplicateKeyError = Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
const bucket = { scope: 'checkout-payment-intent:network', identity: 'network:1.2.3.4|agent:test', limit: 3, windowMs: 60_000 };

describe('abuse limiter under concurrency', () => {
  beforeEach(() => mockFindOneAndUpdate.mockReset());

  it('retries once when the unique index rejects a racing insert', async () => {
    mockFindOneAndUpdate
      .mockRejectedValueOnce(duplicateKeyError)
      .mockResolvedValueOnce({ count: 2 });

    const result = await consumeAbuseLimit(bucket);

    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(result.count).toBe(2);
    expect(result.allowed).toBe(true);
  });

  it('still refuses once the count passes the limit', async () => {
    mockFindOneAndUpdate.mockResolvedValue({ count: 4 });
    const result = await consumeAbuseLimit(bucket);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('never fails open on a real store failure', async () => {
    mockFindOneAndUpdate.mockRejectedValue(new Error('connection lost'));
    await expect(consumeAbuseLimit(bucket)).rejects.toThrow('connection lost');
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('gives up rather than retrying a duplicate key forever', async () => {
    mockFindOneAndUpdate.mockRejectedValue(duplicateKeyError);
    await expect(consumeAbuseLimit(bucket)).rejects.toMatchObject({ code: 11000 });
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(2);
  });
});
