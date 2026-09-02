export {};

const mockGetTenantFromRequest = jest.fn();
const mockBuildStrictTenantQuery = jest.fn(
  (filter: Record<string, unknown>, tenantId: string) => ({
    ...filter,
    $or: [{ tenantId }, { tenantIds: tenantId }],
  }),
);
const mockDbConnect = jest.fn();
const mockTourFind = jest.fn();

function createQueryChain(result: unknown[] = []) {
  const chain: Record<string, jest.Mock> = {};
  for (const method of ['select', 'populate', 'sort', 'limit']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.lean = jest.fn().mockResolvedValue(result);
  return chain;
}

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
    async json() { return this.data; }
  }
  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => (...args: unknown[]) => mockDbConnect(...args));
jest.mock('@/lib/tenant', () => ({
  getTenantFromRequest: () => mockGetTenantFromRequest(),
  buildStrictTenantQuery: (...args: [Record<string, unknown>, string]) =>
    mockBuildStrictTenantQuery(...args),
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    find: (...args: unknown[]) => mockTourFind(...args),
    distinct: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    Types: {
      ObjectId: class MockObjectId {
        constructor(public value: string) {}
      },
    },
  },
}));

describe('public search tenant authority', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTenantFromRequest.mockResolvedValue('trusted-brand');
    mockDbConnect.mockResolvedValue(undefined);
    mockTourFind.mockImplementation(() => createQueryChain());
  });

  it('ignores hostile query/header tenant values in live search and excludes archived tours', async () => {
    const url = new URL('https://trusted.example/api/search/live?tenantId=attacker');
    const request = {
      url: url.toString(),
      nextUrl: url,
      headers: new Headers({ 'x-tenant-id': 'attacker-header' }),
    };

    const { GET } = await import('@/app/api/search/live/route');
    const response = await GET(request as never);

    expect(response.status).toBe(200);
    expect(mockDbConnect).toHaveBeenCalledWith('trusted-brand');
    expect(mockBuildStrictTenantQuery).toHaveBeenCalledWith(
      { isPublished: true, archivedAt: null },
      'trusted-brand',
    );
    expect(mockTourFind).toHaveBeenCalledWith({
      isPublished: true,
      archivedAt: null,
      $or: [{ tenantId: 'trusted-brand' }, { tenantIds: 'trusted-brand' }],
    });
  });

  it('keeps the trusted tenant clause when price alternatives are added to full search', async () => {
    const request = {
      url: 'https://trusted.example/api/search/tours?tenantId=attacker&minPrice=0&maxPrice=100',
      headers: new Headers({ 'x-tenant-id': 'attacker-header' }),
    };

    const { GET } = await import('@/app/api/search/tours/route');
    const response = await GET(request as Request);

    expect(response.status).toBe(200);
    expect(mockDbConnect).toHaveBeenCalledWith('trusted-brand');
    expect(mockTourFind).toHaveBeenCalledWith({
      $and: [
        {
          isPublished: true,
          archivedAt: null,
          $or: [{ tenantId: 'trusted-brand' }, { tenantIds: 'trusted-brand' }],
        },
        {
          $or: [
            { discountPrice: { $gte: 0, $lte: 100 } },
            { price: { $gte: 0, $lte: 100 } },
          ],
        },
      ],
    });
    expect(JSON.stringify(mockTourFind.mock.calls[0][0])).not.toContain('attacker');
  });
});
