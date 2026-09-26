/**
 * The lease is the only thing preventing two concurrent requests from leaving
 * two payable Stripe Checkout pages behind for one shopping attempt, so a lost
 * race must read as "held", never as success.
 */
const mockFindOneAndUpdate = jest.fn();
const mockDeleteOne = jest.fn();
const mockFindOne = jest.fn();

jest.mock('@/lib/models/CheckoutAttemptLease', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
    findOne: (...args: unknown[]) => mockFindOne(...args),
    deleteOne: (...args: unknown[]) => mockDeleteOne(...args),
  },
}));

import {
  CHECKOUT_ATTEMPT_LEASE_MS,
  acquireCheckoutAttemptLease,
  holdsCheckoutAttemptLease,
  releaseCheckoutAttemptLease,
} from '@/lib/checkout/checkoutAttemptLease';

const TENANT = 'brand-one';
const ATTEMPT = '123e4567-e89b-42d3-a456-426614174000';

describe('checkout attempt lease', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteOne.mockResolvedValue({ deletedCount: 1 });
    mockFindOne.mockReturnValue({ lean: async () => ({ _id: 'lease-1' }) });
  });

  it('claims a lapsed or absent lease and returns its own token', async () => {
    mockFindOneAndUpdate.mockImplementation((_filter: unknown, update: { $set: { leaseToken: string } }) => ({
      lean: async () => ({ leaseToken: update.$set.leaseToken }),
    }));

    const token = await acquireCheckoutAttemptLease(TENANT, ATTEMPT);

    expect(token).toEqual(expect.any(String));
    const [filter, update] = mockFindOneAndUpdate.mock.calls[0] as [
      Record<string, any>,
      { $set: { leaseExpiresAt: Date } },
    ];
    expect(filter).toMatchObject({ tenantId: TENANT, checkoutAttemptId: ATTEMPT });
    // Only a lease whose deadline has passed may be taken over.
    expect(filter.leaseExpiresAt.$lte).toBeInstanceOf(Date);
    const held = update.$set.leaseExpiresAt.getTime() - filter.leaseExpiresAt.$lte.getTime();
    expect(held).toBe(CHECKOUT_ATTEMPT_LEASE_MS);
  });

  it('reports the lease as held when someone else owns the document', async () => {
    mockFindOneAndUpdate.mockReturnValue({ lean: async () => ({ leaseToken: 'someone-else' }) });
    await expect(acquireCheckoutAttemptLease(TENANT, ATTEMPT)).resolves.toBeNull();
  });

  it('reports the lease as held when the unique index rejects the insert', async () => {
    // A live lease makes the filter miss, so the upsert tries to insert and the
    // index rejects it. That is contention, not an outage.
    mockFindOneAndUpdate.mockImplementation(() => ({
      lean: async () => { throw Object.assign(new Error('E11000 duplicate key error'), { code: 11000 }); },
    }));
    await expect(acquireCheckoutAttemptLease(TENANT, ATTEMPT)).resolves.toBeNull();
  });

  it('never swallows a real database failure into a free lease', async () => {
    mockFindOneAndUpdate.mockImplementation(() => ({
      lean: async () => { throw new Error('connection reset'); },
    }));
    await expect(acquireCheckoutAttemptLease(TENANT, ATTEMPT)).rejects.toThrow('connection reset');
  });

  it('is short enough to expire before the platform kills the function', async () => {
    // Netlify stops these functions at 26s (netlify.toml). A lease longer than
    // that locks a guest out of paying long after they saw an error.
    expect(CHECKOUT_ATTEMPT_LEASE_MS).toBeLessThanOrEqual(20_000);
  });

  it('confirms the claim is still ours and still live', async () => {
    await expect(holdsCheckoutAttemptLease(TENANT, ATTEMPT, 'token-1')).resolves.toBe(true);
    const [filter] = mockFindOne.mock.calls[0] as [Record<string, any>];
    expect(filter).toMatchObject({ tenantId: TENANT, checkoutAttemptId: ATTEMPT, leaseToken: 'token-1' });
    expect(filter.leaseExpiresAt.$gt).toBeInstanceOf(Date);
  });

  it('reports the claim as lost when the record is gone or taken over', async () => {
    mockFindOne.mockReturnValue({ lean: async () => null });
    await expect(holdsCheckoutAttemptLease(TENANT, ATTEMPT, 'token-1')).resolves.toBe(false);
  });

  it('reports the claim as lost when the lease cannot be read', async () => {
    mockFindOne.mockReturnValue({ lean: async () => { throw new Error('connection reset'); } });
    await expect(holdsCheckoutAttemptLease(TENANT, ATTEMPT, 'token-1')).resolves.toBe(false);
  });

  it('releases only its own claim', async () => {
    await releaseCheckoutAttemptLease(TENANT, ATTEMPT, 'token-1');
    expect(mockDeleteOne).toHaveBeenCalledWith({
      tenantId: TENANT,
      checkoutAttemptId: ATTEMPT,
      leaseToken: 'token-1',
    });
  });
});
