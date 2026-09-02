export {};

const mockAuthenticate = jest.fn();
const mockDbConnect = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private data: unknown;
    constructor(data: unknown, init?: { status?: number }) {
      this.data = data;
      this.status = init?.status ?? 200;
    }
    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }
    json() { return Promise.resolve(this.data); }
  }
  return { NextRequest: class {}, NextResponse: MockNextResponse };
});
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: (...args: unknown[]) => mockDbConnect(...args) }));
jest.mock('@/lib/revenue/machineResponse', () => ({
  authenticateRevenueRequest: (...args: unknown[]) => mockAuthenticate(...args),
  revenueError: (status: number, code: string, message: string) => {
    const { NextResponse } = jest.requireMock('next/server');
    return NextResponse.json({ error: { code, message } }, { status });
  },
}));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('@/lib/models/Availability', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('@/lib/models/StopSale', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('@/lib/tenant', () => ({ buildStrictTenantQuery: jest.fn(), getTenantConfigCached: jest.fn() }));
jest.mock('mongoose', () => ({
  __esModule: true,
  default: { Types: { ObjectId: { isValid: (value: unknown) => /^[a-f0-9]{24}$/i.test(String(value || '')) } } },
}));

const request = (path: string) => ({ nextUrl: new URL(`https://mountain-tours.example${path}`) }) as never;

describe('RevenuePilot read-route input boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ response: null, tenantId: 'mountain-tours' });
    mockDbConnect.mockResolvedValue(undefined);
  });

  it('rejects non-calendar and reversed departure ranges before querying catalogue data', async () => {
    const { GET } = await import('@/app/api/v1/revenue/departures/route');
    const invalidDay = await GET(request('/api/v1/revenue/departures?tenantId=mountain-tours&from=2026-02-31&to=2026-03-02'));
    const reversed = await GET(request('/api/v1/revenue/departures?tenantId=mountain-tours&from=2026-03-02&to=2026-03-01'));
    expect(invalidDay.status).toBe(400);
    expect(reversed.status).toBe(400);
    expect(jest.requireMock('@/lib/models/Tour').default.find).not.toHaveBeenCalled();
  });

  it('rejects malformed booking limits and incomplete compound cursors', async () => {
    const { GET } = await import('@/app/api/v1/revenue/bookings/route');
    const invalidLimit = await GET(request('/api/v1/revenue/bookings?tenantId=mountain-tours&limit=abc'));
    const orphanAfterId = await GET(request('/api/v1/revenue/bookings?tenantId=mountain-tours&afterId=507f1f77bcf86cd799439011'));
    expect(invalidLimit.status).toBe(422);
    expect(orphanAfterId.status).toBe(422);
    expect(jest.requireMock('@/lib/models/Booking').default.find).not.toHaveBeenCalled();
  });
});
