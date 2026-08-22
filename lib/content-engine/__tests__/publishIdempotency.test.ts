const mockCreate = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockUpdateOne = jest.fn();
const mockDeleteOne = jest.fn();

jest.mock('@/lib/models/ContentPublishReceipt', () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
    updateOne: (...args: unknown[]) => mockUpdateOne(...args),
    deleteOne: (...args: unknown[]) => mockDeleteOne(...args),
  },
}));

import {
  CONTENT_PUBLISH_CLAIM_LEASE_MS,
  CONTENT_PUBLISH_RECEIPT_TTL_MS,
  beginContentPublish,
  completeContentPublish,
  contentPublishReceiptId,
  contentPublishReceiptExpiresAt,
  contentPublishResourceId,
  hashPublishRequest,
  readRequiredIdempotencyKey,
  releaseContentPublishClaim,
  type PublishClaim,
} from '@/lib/content-engine/publishIdempotency';

const lean = <T>(value: T) => ({ lean: jest.fn().mockResolvedValue(value) });
const duplicateKey = Object.assign(new Error('duplicate'), { code: 11000 });
const baseInput = {
  idempotencyKey: 'publish-1',
  tenantId: 'cairo-excursions-online',
  contentType: 'blog',
  requestHash: 'hash-1',
  now: new Date('2026-08-22T00:00:00.000Z'),
};

describe('Content Engine publish idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires a bounded printable key and hashes equivalent object order identically', () => {
    expect(readRequiredIdempotencyKey(null)).toEqual({
      ok: false,
      error: 'Idempotency-Key header is required',
    });
    expect(readRequiredIdempotencyKey(' good-key ')).toEqual({ ok: true, key: 'good-key' });
    expect(readRequiredIdempotencyKey('bad\nkey').ok).toBe(false);
    expect(hashPublishRequest({ b: 2, a: 1 })).toBe(hashPublishRequest({ a: 1, b: 2 }));
  });

  it('uses built-in deterministic _id locking before content work, with deterministic resource id, lease, and TTL', async () => {
    mockCreate.mockResolvedValue({ _id: 'receipt-1' });
    const result = await beginContentPublish(baseInput);
    expect(result).toMatchObject({ outcome: 'proceed', receiptId: 'receipt-1', resumed: false });
    if (result.outcome !== 'proceed') throw new Error('expected claim');
    expect(result.resourceId).toBe(contentPublishResourceId(baseInput));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      _id: contentPublishReceiptId(baseInput),
      state: 'pending',
      resourceId: result.resourceId,
      claimExpiresAt: new Date(baseInput.now.getTime() + CONTENT_PUBLISH_CLAIM_LEASE_MS),
      expiresAt: new Date(baseInput.now.getTime() + CONTENT_PUBLISH_RECEIPT_TTL_MS),
    }));
    expect(contentPublishReceiptId(baseInput)).toMatch(/^[a-f0-9]{24}$/);
    expect(contentPublishResourceId(baseInput)).toMatch(/^[a-f0-9]{24}$/);
    expect(contentPublishReceiptId(baseInput)).not.toBe(contentPublishResourceId(baseInput));
  });

  it('replays the original status and response for a completed key', async () => {
    mockCreate.mockRejectedValue(duplicateKey);
    mockFindOne.mockReturnValue(lean({
      _id: 'receipt-1',
      requestHash: 'hash-1',
      resourceId: '111111111111111111111111',
      state: 'completed',
      statusCode: 201,
      response: { id: 'record-1', slug: 'slug' },
    }));
    await expect(beginContentPublish(baseInput)).resolves.toEqual({
      outcome: 'replay',
      status: 201,
      body: { id: 'record-1', slug: 'slug' },
    });
  });

  it('rejects same key with a different body', async () => {
    mockCreate.mockRejectedValue(duplicateKey);
    mockFindOne.mockReturnValue(lean({
      _id: 'receipt-1',
      requestHash: 'different-hash',
      resourceId: '111111111111111111111111',
      state: 'pending',
    }));
    await expect(beginContentPublish(baseInput)).resolves.toMatchObject({
      outcome: 'error',
      status: 409,
      code: 'IDEMPOTENCY_BODY_CONFLICT',
    });
  });

  it('returns a retryable conflict while the same request still holds a live claim', async () => {
    mockCreate.mockRejectedValue(duplicateKey);
    mockFindOne
      .mockReturnValueOnce(lean({
        _id: 'receipt-1',
        requestHash: 'hash-1',
        resourceId: '111111111111111111111111',
        state: 'pending',
      }))
      .mockReturnValueOnce(lean({ state: 'pending' }));
    mockFindOneAndUpdate.mockReturnValue(lean(null));
    await expect(beginContentPublish(baseInput)).resolves.toMatchObject({
      outcome: 'error',
      status: 503,
      code: 'IDEMPOTENCY_IN_PROGRESS',
    });
  });

  it('takes over a stale lease using the original resource id for response-loss recovery', async () => {
    const resourceId = '222222222222222222222222';
    mockCreate.mockRejectedValue(duplicateKey);
    mockFindOne.mockReturnValue(lean({
      _id: 'receipt-1',
      requestHash: 'hash-1',
      resourceId,
      state: 'pending',
    }));
    mockFindOneAndUpdate.mockReturnValue(lean({ _id: 'receipt-1', resourceId }));
    await expect(beginContentPublish(baseInput)).resolves.toMatchObject({
      outcome: 'proceed',
      receiptId: 'receipt-1',
      resourceId,
      resumed: true,
    });
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'receipt-1',
        state: 'pending',
        $or: expect.any(Array),
      }),
      expect.any(Object),
      { new: true },
    );
  });

  it('marks only the owned claim complete and refreshes its retention TTL', async () => {
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    const claim: PublishClaim = {
      outcome: 'proceed',
      receiptId: 'receipt-1',
      claimToken: 'claim-1',
      resourceId: '333333333333333333333333',
      resumed: false,
    };
    await completeContentPublish(claim, 201, { id: 'record-1' });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'receipt-1',
        claimToken: 'claim-1',
        resourceId: claim.resourceId,
        state: 'pending',
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ state: 'completed', statusCode: 201 }),
        $unset: { claimToken: 1, claimExpiresAt: 1 },
      }),
    );
    expect(contentPublishReceiptExpiresAt(0).getTime()).toBe(CONTENT_PUBLISH_RECEIPT_TTL_MS);
  });

  it('fails closed if completion lost ownership and releases only pending owned claims', async () => {
    const claim: PublishClaim = {
      outcome: 'proceed',
      receiptId: 'receipt-1',
      claimToken: 'claim-1',
      resourceId: '333333333333333333333333',
      resumed: false,
    };
    mockUpdateOne.mockResolvedValue({ modifiedCount: 0 });
    await expect(completeContentPublish(claim, 201, {})).rejects.toThrow(
      'Publish receipt claim was lost before completion',
    );
    await releaseContentPublishClaim(claim);
    expect(mockDeleteOne).toHaveBeenCalledWith({
      _id: claim.receiptId,
      claimToken: claim.claimToken,
      resourceId: claim.resourceId,
      state: 'pending',
    });
  });
});
