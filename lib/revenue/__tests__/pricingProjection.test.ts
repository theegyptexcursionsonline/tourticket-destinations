jest.mock('@/lib/algolia', () => ({
  syncTourToAlgoliaVerified: jest.fn(),
  deleteTourFromAlgolia: jest.fn(),
}));

jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantId }),
  getTenantConfigCached: jest.fn(),
}));

jest.mock('@/lib/models/RevenuePriceOverride', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), find: jest.fn(), updateOne: jest.fn() },
}));

import Tour from '@/lib/models/Tour';
import { syncTourToAlgoliaVerified } from '@/lib/algolia';
import {
  pricingProjectionRetryDelayMs,
  pricingProjectionStatus,
  reconcileTourPricingProjection,
  refreshExpiredPricingSummaries,
  syncTourPricingSearchIndex,
  tenantPricingProjection,
  tenantPricingSummary,
} from '@/lib/revenue/pricingSummary';

const mockFindOne = Tour.findOne as jest.Mock;
const mockFind = Tour.find as jest.Mock;
const mockUpdateOne = Tour.updateOne as jest.Mock;
const mockSyncTourToAlgolia = syncTourToAlgoliaVerified as jest.Mock;

const leanResult = <T>(value: T) => ({ lean: jest.fn().mockResolvedValue(value) });
const populatedLeanResult = <T>(value: T) => {
  const lean = jest.fn().mockResolvedValue(value);
  const populateDestination = jest.fn().mockReturnValue({ lean });
  const populateCategory = jest.fn().mockReturnValue({ populate: populateDestination });
  return { chain: { populate: populateCategory }, populateCategory, populateDestination, lean };
};
const findResult = <T>(value: T) => ({
  select: jest.fn().mockReturnValue({
    limit: jest.fn().mockReturnValue(leanResult(value)),
  }),
});

describe('tenant-scoped durable pricing search projection', () => {
  const originalAppId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const originalWriteKey = process.env.ALGOLIA_WRITE_API_KEY;
  const originalSkip = process.env.REVENUEPILOT_SKIP_SEARCH_SYNC;
  let projectionQuery: ReturnType<typeof populatedLeanResult>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID = 'test-app';
    process.env.ALGOLIA_WRITE_API_KEY = 'test-write-key';
    delete process.env.REVENUEPILOT_SKIP_SEARCH_SYNC;
    mockUpdateOne.mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1 });
    projectionQuery = populatedLeanResult({
      _id: 'tour-1',
      isPublished: true,
      tags: ['sunrise'],
      category: { _id: 'category-1', name: 'Desert safari' },
      destination: { _id: 'destination-1', name: 'Cairo' },
      pricingSummaries: [
        { tenantId: 'brand-a', version: 4 },
        { tenantId: 'brand-b', version: 9 },
      ],
      pricingSearchProjections: [
        { tenantId: 'brand-a', summaryVersion: 4, authoritativeVersion: 4, projectionToken: 'projection-a-4', attempts: 1 },
        { tenantId: 'brand-b', summaryVersion: 9, authoritativeVersion: 9, projectionToken: 'projection-b-9', attempts: 1 },
      ],
    });
    mockFindOne.mockReturnValue(projectionQuery.chain);
  });

  afterAll(() => {
    if (originalAppId === undefined) delete process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
    else process.env.NEXT_PUBLIC_ALGOLIA_APP_ID = originalAppId;
    if (originalWriteKey === undefined) delete process.env.ALGOLIA_WRITE_API_KEY;
    else process.env.ALGOLIA_WRITE_API_KEY = originalWriteKey;
    if (originalSkip === undefined) delete process.env.REVENUEPILOT_SKIP_SEARCH_SYNC;
    else process.env.REVENUEPILOT_SKIP_SEARCH_SYNC = originalSkip;
  });

  it('uses only the requested tenant summary and projection', () => {
    const tour = {
      pricingSummaries: [{ tenantId: 'brand-a', version: 4 }, { tenantId: 'brand-b', version: 9 }],
      pricingSearchProjections: [
        { tenantId: 'brand-a', status: 'verified' as const, summaryVersion: 4, authoritativeVersion: 4, projectionToken: 'a', attempts: 1 },
        { tenantId: 'brand-b', status: 'failed' as const, summaryVersion: 9, authoritativeVersion: 9, projectionToken: 'b', attempts: 3 },
      ],
    };
    expect(tenantPricingSummary(tour, 'brand-a')).toMatchObject({ version: 4 });
    expect(tenantPricingProjection(tour, 'brand-b')).toMatchObject({ status: 'failed' });
    expect(pricingProjectionStatus(tour, 'brand-a', 4)).toMatchObject({ state: 'verified', verified: true, versionMatches: true });
    expect(pricingProjectionStatus(tour, 'brand-b', 9)).toMatchObject({ state: 'failed', verified: false, versionMatches: true });
  });

  it('persists a failed delivery only in the requested tenant ledger', async () => {
    mockSyncTourToAlgolia.mockRejectedValueOnce(new Error('temporary outage'));
    await expect(syncTourPricingSearchIndex('tour-1', 'brand-a')).resolves.toBe(false);

    const failedCall = mockUpdateOne.mock.calls.find(([, update]) => update?.$set?.['pricingSearchProjections.$[projection].status'] === 'failed');
    expect(failedCall?.[0]).toMatchObject({ _id: 'tour-1', tenantId: 'brand-a' });
    expect(failedCall?.[1].$set).toMatchObject({
      'pricingSearchProjections.$[projection].lastErrorCode': 'ALGOLIA_SYNC_FAILED',
      'pricingSearchProjections.$[projection].nextAttemptAt': expect.any(Date),
    });
    expect(failedCall?.[2]).toEqual({ arrayFilters: [expect.objectContaining({ 'projection.tenantId': 'brand-a' })] });
  });

  it('marks the exact projection generation verified only after Algolia read-back', async () => {
    mockSyncTourToAlgolia.mockResolvedValueOnce(undefined);
    await expect(syncTourPricingSearchIndex('tour-1', 'brand-a')).resolves.toBe(true);

    expect(projectionQuery.populateCategory).toHaveBeenCalledWith('category', 'name');
    expect(projectionQuery.populateDestination).toHaveBeenCalledWith('destination', 'name');
    expect(mockSyncTourToAlgolia).toHaveBeenCalledWith(expect.objectContaining({
      _id: 'tour-1',
      category: { _id: 'category-1', name: 'Desert safari' },
      destination: { _id: 'destination-1', name: 'Cairo' },
    }));
    const verifiedCall = mockUpdateOne.mock.calls.find(([, update]) => update?.$set?.['pricingSearchProjections.$[projection].status'] === 'verified');
    expect(verifiedCall?.[0]).toMatchObject({
      _id: 'tour-1',
      tenantId: 'brand-a',
      pricingSearchProjections: { $elemMatch: { tenantId: 'brand-a', summaryVersion: 4, projectionToken: 'projection-a-4' } },
    });
  });

  it('does not let an older delivery verify a replaced generation', async () => {
    mockSyncTourToAlgolia.mockResolvedValueOnce(undefined);
    mockUpdateOne
      .mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 })
      .mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 });
    await expect(syncTourPricingSearchIndex('tour-1', 'brand-a')).resolves.toBe(false);
  });

  it('drains only due tenant projections from the bounded cron window', async () => {
    mockFind.mockReturnValueOnce(findResult([{
      _id: 'tour-1',
      pricingSummaries: [{ tenantId: 'brand-a', currency: 'USD', validThrough: new Date('2099-01-01') }],
      pricingSearchProjections: [{ tenantId: 'brand-a', status: 'pending', authoritativeVersion: 4 }],
    }]));
    mockSyncTourToAlgolia.mockResolvedValueOnce(undefined);

    const result = await refreshExpiredPricingSummaries(25);
    expect(result).toMatchObject({ refreshed: 0, projectionAttempts: 1 });
    expect(result.results).toEqual([{ tourId: 'tour-1', tenantId: 'brand-a', searchSynced: true }]);
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ $or: expect.any(Array) }));
  });

  it('uses bounded exponential backoff', () => {
    expect(pricingProjectionRetryDelayMs(1)).toBe(60_000);
    expect(pricingProjectionRetryDelayMs(2)).toBe(120_000);
    expect(pricingProjectionRetryDelayMs(99)).toBe(3_600_000);
  });

  it('durably queues a tenant-scoped failed summary rebuild for cron repair', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockFindOne.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error('database interruption')) }),
    });

    await expect(reconcileTourPricingProjection('tour-1', 'brand-a', 'USD', 7)).resolves.toMatchObject({
      summaryRefreshed: false,
      searchSynced: false,
    });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'tour-1', tenantId: 'brand-a' }),
      [expect.objectContaining({ $set: expect.objectContaining({ pricingSearchProjections: expect.any(Object) }) })],
    );
    errorSpy.mockRestore();
  });
});
