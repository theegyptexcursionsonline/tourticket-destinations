export {};

const mockRequireAdminAuth = jest.fn();
const mockReviewFind = jest.fn();
const mockCountDocuments = jest.fn();
const mockAggregate = jest.fn();

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
    async json() { return this.data; }
  }
  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: mockRequireAdminAuth,
  canAccessTenant: (_auth: unknown, tenantId: string) => ['makadi-bay', 'cairo-excursions-online'].includes(tenantId),
  tenantForbiddenResponse: () => ({ status: 403 }),
}));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Review', () => ({
  __esModule: true,
  default: { find: mockReviewFind, countDocuments: mockCountDocuments, aggregate: mockAggregate },
}));

function installFind(rows: unknown[]) {
  const chain = {
    populate: jest.fn(), sort: jest.fn(), skip: jest.fn(), limit: jest.fn(), lean: jest.fn(),
  };
  chain.populate.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.skip.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.lean.mockResolvedValue(rows);
  mockReviewFind.mockReturnValue(chain);
}

describe('EEO Network GET /api/admin/reviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({
      role: 'super_admin',
      tenantIds: ['makadi-bay', 'cairo-excursions-online'],
    });
    installFind([{ _id: 'network-review', tenantId: 'makadi-bay', verified: true }]);
    mockCountDocuments.mockResolvedValue(1);
    mockAggregate.mockResolvedValue([{ total: 1, pending: 0, approved: 1, avgRating: 5 }]);
  });

  it('scopes All Brands to authorized network tenants and returns server stats', async () => {
    const { GET } = await import('@/app/api/admin/reviews/route');
    const response = await GET({ url: 'https://dashboard.egypt-excursionsonline.com/api/admin/reviews' } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockReviewFind).toHaveBeenCalledWith({
      tenantId: { $in: ['makadi-bay', 'cairo-excursions-online'] },
    });
    expect(mockAggregate).toHaveBeenCalledWith(expect.arrayContaining([
      { $match: { tenantId: { $in: ['makadi-bay', 'cairo-excursions-online'] } } },
    ]));
    expect(body.data).toHaveLength(1);
    expect(body.stats).toEqual({
      totalReviews: 1,
      pendingReviews: 0,
      approvedReviews: 1,
      averageRating: 5,
    });
  });

  it('combines selected tenant, status and bounded pagination filters', async () => {
    const { GET } = await import('@/app/api/admin/reviews/route');
    const response = await GET({
      url: 'https://dashboard.egypt-excursionsonline.com/api/admin/reviews?tenantId=makadi-bay&status=pending&page=-2&limit=900',
    } as never);
    const body = await response.json();

    expect(mockReviewFind).toHaveBeenCalledWith({
      tenantId: 'makadi-bay',
      verified: { $ne: true },
    });
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(100);
  });
});
