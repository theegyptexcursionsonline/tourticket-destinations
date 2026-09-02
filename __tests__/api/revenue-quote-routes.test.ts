export {};

const mockDbConnect = jest.fn();
const mockRequireAdminAuth = jest.fn();
const mockCanAccessTenant = jest.fn();
const mockTourFindOne = jest.fn();
const mockResolveEffectivePrice = jest.fn();
const mockGetTenantFromRequest = jest.fn();
const mockRequireCronSecret = jest.fn();
const mockRefreshExpiredPricingSummaries = jest.fn();
const mockBuildStrictTenantQuery = jest.fn((query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantIds: tenantId }));

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    headers: Headers;
    private body: unknown;

    constructor(body: unknown, init: { status?: number; headers?: HeadersInit } = {}) {
      this.body = body;
      this.status = init.status ?? 200;
      this.headers = new Headers(init.headers);
    }

    static json(body: unknown, init?: { status?: number; headers?: HeadersInit }) {
      return new MockNextResponse(body, init);
    }

    json() {
      return Promise.resolve(this.body);
    }
  }
  return { NextRequest: class {}, NextResponse: MockNextResponse };
});
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: (...args: unknown[]) => mockDbConnect(...args) }));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
  canAccessTenant: (...args: unknown[]) => mockCanAccessTenant(...args),
  tenantForbiddenResponse: () => {
    const { NextResponse } = jest.requireMock('next/server');
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  },
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => mockTourFindOne(...args) },
}));
jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: (...args: unknown[]) => mockBuildStrictTenantQuery(...(args as [Record<string, unknown>, string])),
  getTenantFromRequest: (...args: unknown[]) => mockGetTenantFromRequest(...args),
}));
jest.mock('@/lib/pricing/effectivePrice', () => ({
  effectiveOptionPrice: jest.fn(() => ({ price: 120, originalPrice: 150 })),
  effectiveTourPrice: jest.fn(() => ({ price: 80, originalPrice: 100 })),
}));
jest.mock('@/lib/revenue/pricingResolver', () => ({
  resolveEffectivePrice: (...args: unknown[]) => mockResolveEffectivePrice(...args),
}));
jest.mock('@/lib/security/cronAuth', () => ({
  requireCronSecret: (...args: unknown[]) => mockRequireCronSecret(...args),
}));
jest.mock('@/lib/revenue/pricingSummary', () => ({
  refreshExpiredPricingSummaries: (...args: unknown[]) => mockRefreshExpiredPricingSummaries(...args),
}));

const request = (path: string) => ({
  nextUrl: new URL(`https://mountain-tours.example${path}`),
  headers: new Headers(),
}) as never;

describe('Revenue-aware quote route boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
    mockRequireAdminAuth.mockResolvedValue({ userId: 'admin-1', tenantIds: ['mountain-tours'] });
    mockCanAccessTenant.mockReturnValue(true);
    mockGetTenantFromRequest.mockResolvedValue('mountain-tours');
    mockResolveEffectivePrice.mockResolvedValue({
      tourId: 'tour-1',
      optionKey: 'premium-sunrise',
      date: '2026-09-12',
      time: '06:30',
      currency: 'USD',
      prices: { adult: 120, child: 60, infant: 0 },
      version: 3,
    });
    mockRefreshExpiredPricingSummaries.mockResolvedValue({ refreshed: 2, projectionAttempts: 1, results: [] });
  });

  it('requires manageBookings before loading admin options', async () => {
    const { NextResponse } = jest.requireMock('next/server');
    mockRequireAdminAuth.mockResolvedValue(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }));
    const { GET } = await import('@/app/api/bookings/manual/options/route');
    const response = await GET(request('/api/bookings/manual/options?tenantId=mountain-tours&tourId=tour-1'));
    expect(response.status).toBe(401);
    expect(mockRequireAdminAuth).toHaveBeenCalledWith(expect.anything(), { permissions: ['manageBookings'] });
    expect(mockTourFindOne).not.toHaveBeenCalled();
  });

  it('returns only active, tenant-scoped options with stable pricing keys', async () => {
    mockTourFindOne.mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: 'tour-1',
          title: 'Mountain sunrise',
          duration: '3 hours',
          discountPrice: 80,
          bookingOptions: [{ id: 'legacy-id', pricingKey: 'premium-sunrise', label: 'Premium sunrise', type: 'Per Person', price: 120, timeSlots: [{ time: '06:30' }] }],
        }),
      }),
    });
    const { GET } = await import('@/app/api/bookings/manual/options/route');
    const response = await GET(request('/api/bookings/manual/options?tenantId=mountain-tours&tourId=tour-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, private');
    expect(mockBuildStrictTenantQuery).toHaveBeenCalledWith({ _id: 'tour-1', archivedAt: null }, 'mountain-tours');
    expect(body.options).toEqual([expect.objectContaining({
      id: 'legacy-id',
      pricingKey: 'premium-sunrise',
      price: 120,
      originalPrice: 150,
      duration: '3 hours',
      timeSlots: [{ id: 'slot-1', time: '06:30' }],
    })]);
  });

  it('forbids cross-tenant admin quotes before resolving a price', async () => {
    mockCanAccessTenant.mockReturnValue(false);
    const { GET } = await import('@/app/api/bookings/manual/quote/route');
    const response = await GET(request('/api/bookings/manual/quote?tenantId=other-brand&tourId=tour-1&optionKey=standard&date=2026-09-12&time=06%3A30'));
    expect(response.status).toBe(403);
    expect(mockResolveEffectivePrice).not.toHaveBeenCalled();
  });

  it('resolves a complete admin target in the authorized tenant without caching it', async () => {
    const { GET } = await import('@/app/api/bookings/manual/quote/route');
    const response = await GET(request('/api/bookings/manual/quote?tenantId=mountain-tours&tourId=tour-1&optionKey=premium-sunrise&date=2026-09-12&time=06%3A30'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, private');
    expect(mockResolveEffectivePrice).toHaveBeenCalledWith({
      tenantId: 'mountain-tours', tourId: 'tour-1', optionKey: 'premium-sunrise', date: '2026-09-12', time: '06:30',
    });
  });

  it('binds public quotes to the request tenant and rejects incomplete targets', async () => {
    const { GET } = await import('@/app/api/tours/[tourId]/quote/route');
    const incomplete = await GET(request('/api/tours/tour-1/quote?date=2026-09-12'), { params: Promise.resolve({ tourId: 'tour-1' }) });
    expect(incomplete.status).toBe(400);
    expect(mockResolveEffectivePrice).not.toHaveBeenCalled();

    const response = await GET(
      request('/api/tours/tour-1/quote?date=2026-09-12&time=06%3A30&optionKey=premium-sunrise'),
      { params: Promise.resolve({ tourId: 'tour-1' }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, private');
    expect(mockResolveEffectivePrice).toHaveBeenCalledWith({
      tenantId: 'mountain-tours', tourId: 'tour-1', optionKey: 'premium-sunrise', date: '2026-09-12', time: '06:30',
    });
  });

  it('requires cron authentication before draining durable projection recovery', async () => {
    const { NextResponse } = jest.requireMock('next/server');
    mockRequireCronSecret.mockReturnValueOnce(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const { GET } = await import('@/app/api/cron/pricing-summaries/route');
    const denied = await GET(request('/api/cron/pricing-summaries'));
    expect(denied.status).toBe(401);
    expect(mockRefreshExpiredPricingSummaries).not.toHaveBeenCalled();

    mockRequireCronSecret.mockReturnValue(null);
    const accepted = await GET(request('/api/cron/pricing-summaries'));
    await expect(accepted.json()).resolves.toEqual({ success: true, refreshed: 2, projectionAttempts: 1, results: [] });
    expect(mockRefreshExpiredPricingSummaries).toHaveBeenCalledTimes(1);
  });
});
