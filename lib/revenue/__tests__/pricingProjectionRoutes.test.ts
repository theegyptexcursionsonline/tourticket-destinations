const mockAuthenticateRevenueRequest = jest.fn();

export {};
const mockApplyPriceWrite = jest.fn();
const mockValidatePriceWrite = jest.fn();
const mockRollbackPriceExecution = jest.fn();
const mockResolveEffectivePrice = jest.fn();
const mockReconcileTourPricingProjection = jest.fn();
const mockRevalidatePricingPaths = jest.fn();
const mockExecutionFindOne = jest.fn();
const mockTourFindOne = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private data: unknown;

    constructor(data: unknown, init?: { status?: number }) {
      this.data = data;
      this.status = init?.status || 200;
    }

    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }

    async json() {
      return this.data;
    }
  }

  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: jest.fn((query: unknown, tenantId: string) => ({ ...(query as object), tenantIds: tenantId })),
  getTenantConfigCached: jest.fn().mockResolvedValue({ isActive: true, payments: { currency: 'USD' } }),
}));
jest.mock('@/lib/revenue/machineResponse', () => ({
  authenticateRevenueRequest: mockAuthenticateRevenueRequest,
  revenueError: (status: number, code: string, message: string) => ({ status, code, message }),
}));
jest.mock('@/lib/revenue/priceWriteGate', () => ({
  requireRevenueIdempotencyKey: jest.fn(() => 'idem-projection-replay'),
  RevenuePricingWriteError: class RevenuePricingWriteError extends Error {},
}));
jest.mock('@/lib/revenue/priceWrite', () => ({
  applyPriceWrite: mockApplyPriceWrite,
  validatePriceWrite: mockValidatePriceWrite,
}));
jest.mock('@/lib/revenue/priceRollback', () => ({ rollbackPriceExecution: mockRollbackPriceExecution }));
jest.mock('@/lib/revenue/pricingResolver', () => ({ resolveEffectivePrice: mockResolveEffectivePrice }));
jest.mock('@/lib/revenue/revalidatePricing', () => ({ revalidatePricingPaths: mockRevalidatePricingPaths }));
jest.mock('@/lib/revenue/pricingSummary', () => {
  return {
    reconcileTourPricingProjection: mockReconcileTourPricingProjection,
    pricingProjectionStatus: (tour: {
      pricingSummaries?: Array<{ tenantId: string; version?: number }>;
      pricingSearchProjections?: Array<{ tenantId: string; status?: string; summaryVersion?: number; authoritativeVersion?: number }>;
    } | null, tenantId: string, authoritativeVersion?: number) => {
      const summary = tour?.pricingSummaries?.find((entry) => entry.tenantId === tenantId);
      const projection = tour?.pricingSearchProjections?.find((entry) => entry.tenantId === tenantId);
      const summaryVersion = Number(summary?.version ?? -1);
      const projectionVersion = Number(projection?.summaryVersion ?? -1);
      const versionMatches = summaryVersion >= 0
        && summaryVersion === projectionVersion
        && (authoritativeVersion === undefined || Number(projection?.authoritativeVersion ?? -1) === authoritativeVersion);
      const verified = projection?.status === 'verified' && versionMatches;
      return {
        state: verified ? 'verified' : projection?.status === 'failed' ? 'failed' : 'pending',
        verified,
        versionMatches,
      };
    },
  };
});
jest.mock('@/lib/models/RevenuePriceExecution', () => ({
  __esModule: true,
  default: { findOne: mockExecutionFindOne },
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: mockTourFindOne, updateOne: jest.fn(), find: jest.fn() },
}));

const priceInput = {
  tenantId: 'default',
  currency: 'USD',
  target: {
    tourId: '68dada7e6617c4b6defc34b5',
    optionKey: 'standard',
    date: '2026-08-01',
    time: '10:00',
  },
};

const request = () => ({
  text: jest.fn().mockResolvedValue('{}'),
  headers: { get: jest.fn(() => 'idem-projection-replay') },
}) as never;

describe('RevenuePilot projection replay routes', () => {
  const originalPricingEnabled = process.env.REVENUEPILOT_PRICING_API_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REVENUEPILOT_PRICING_API_ENABLED = 'true';
    mockAuthenticateRevenueRequest.mockResolvedValue({ response: null, tenantId: 'default' });
    mockValidatePriceWrite.mockReturnValue(priceInput);
    mockReconcileTourPricingProjection.mockResolvedValue({ summaryRefreshed: true, searchSynced: true, summary: { version: 3 } });
  });

  afterAll(() => {
    if (originalPricingEnabled === undefined) delete process.env.REVENUEPILOT_PRICING_API_ENABLED;
    else process.env.REVENUEPILOT_PRICING_API_ENABLED = originalPricingEnabled;
  });

  it('repairs the listing/search projection when an apply is replayed', async () => {
    mockApplyPriceWrite.mockResolvedValue({
      state: 'replayed',
      replayed: true,
      outcome: 'applied',
      receipt: { appliedVersion: 3 },
      effective: { version: 3 },
    });
    const { POST } = await import('@/app/api/v1/revenue/prices/apply/route');

    const response = await POST(request());
    const body = await response.json();

    expect(mockReconcileTourPricingProjection).toHaveBeenCalledWith(priceInput.target.tourId, 'default', 'USD', 3);
    expect(body.channelPropagation.eeo_direct).toBe('verified');
    expect(body.pricingProjection).toMatchObject({ summaryRefreshed: true, searchSynced: true, authoritativeVersion: 3 });
  });

  it('keeps the applied receipt successful while reporting durable projection repair failure', async () => {
    mockApplyPriceWrite.mockResolvedValue({
      state: 'replayed',
      replayed: true,
      outcome: 'applied',
      receipt: { appliedVersion: 3 },
      effective: { version: 3 },
    });
    mockReconcileTourPricingProjection.mockResolvedValueOnce({ summaryRefreshed: false, searchSynced: false, summary: null });
    const { POST } = await import('@/app/api/v1/revenue/prices/apply/route');

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.state).toBe('replayed');
    expect(body.channelPropagation.eeo_direct).toBe('failed');
    expect(body.pricingProjection).toMatchObject({ summaryRefreshed: false, searchSynced: false, authoritativeVersion: 3 });
  });

  it('repairs the listing/search projection when a rollback is replayed', async () => {
    const receipt = {
      tenantId: 'default',
      currency: 'USD',
      target: { ...priceInput.target, date: new Date('2026-08-01T00:00:00.000Z') },
    };
    mockRollbackPriceExecution.mockResolvedValue({ state: 'rollback_applied', replayed: true, receipt });
    mockResolveEffectivePrice.mockResolvedValue({ version: 4 });
    const { POST } = await import('@/app/api/v1/revenue/prices/[executionId]/rollback/route');

    const response = await POST(request(), { params: Promise.resolve({ executionId: 'exec-1' }) });
    const body = await response.json();

    expect(mockReconcileTourPricingProjection).toHaveBeenCalledWith(priceInput.target.tourId, 'default', 'USD', 4);
    expect(body.channelPropagation.eeo_direct).toBe('verified');
    expect(body.pricingProjection.authoritativeVersion).toBe(4);
  });

  it('does not report full propagation for a verified but stale projection version', async () => {
    const receipt = {
      target: { ...priceInput.target, date: new Date('2026-08-01T00:00:00.000Z') },
      tenantId: 'default',
      appliedVersion: 3,
      effectivePrices: { adult: 104, child: 52, infant: 0 },
      currency: 'USD',
      state: 'applied',
      readbackAttempts: [],
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn(() => ({ state: 'verified' })),
    };
    mockExecutionFindOne.mockResolvedValue(receipt);
    mockResolveEffectivePrice.mockResolvedValue({ version: 3, prices: receipt.effectivePrices, currency: 'USD' });
    mockTourFindOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          pricingSummaries: [{ tenantId: 'default', version: 3 }],
          pricingSearchProjections: [{
            tenantId: 'default',
            status: 'verified',
            summaryVersion: 2,
            authoritativeVersion: 3,
            projectionToken: 'stale-generation',
          }],
        }),
      }),
    });
    const { GET } = await import('@/app/api/v1/revenue/prices/[executionId]/route');

    const response = await GET(request(), { params: Promise.resolve({ executionId: 'exec-1' }) });
    const body = await response.json();

    expect(body.verified).toBe(true);
    expect(body.projectionVersionMatches).toBe(false);
    expect(body.fullyPropagated).toBe(false);
    expect(body.channelPropagation.eeo_direct).toBe('pending');
  });
});
