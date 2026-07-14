export {};

const mockRequireAdminAuth = jest.fn();
const mockTourFind = jest.fn();
const mockSelect = jest.fn();
const mockPopulate = jest.fn();
const mockSort = jest.fn();
const mockLean = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private data: unknown;
    constructor(data: unknown, init?: { status?: number }) {
      this.data = data;
      this.status = init?.status || 200;
    }
    static json(data: unknown, init?: { status?: number }) { return new MockNextResponse(data, init); }
    async json() { return this.data; }
  }
  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: mockRequireAdminAuth,
  canAccessTenant: () => true,
  tenantForbiddenResponse: () => ({ status: 403 }),
}));
jest.mock('@/lib/algolia', () => ({ syncTourToAlgolia: jest.fn() }));
jest.mock('@/lib/translation/translateService', () => ({ translateTourInBackground: jest.fn() }));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { find: mockTourFind, create: jest.fn(), findById: jest.fn() },
}));

describe('EEO Network GET /api/admin/tours list payload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ role: 'super_admin', tenantIds: ['makadi-bay'] });
    const chain = { select: mockSelect, populate: mockPopulate, sort: mockSort, lean: mockLean };
    mockTourFind.mockReturnValue(chain);
    mockSelect.mockReturnValue(chain);
    mockPopulate.mockReturnValue(chain);
    mockSort.mockReturnValue(chain);
    mockLean.mockResolvedValue([{
      _id: 'tour-1', title: 'Network Tour', tenantId: 'makadi-bay',
      reviews: [{ _id: 'review-1', comment: 'never return this' }],
    }]);
  });

  it('keeps tenant scoping and replaces reviews with reviewCount', async () => {
    const { GET } = await import('@/app/api/admin/tours/route');
    const response = await GET({ url: 'https://dashboard.egypt-excursionsonline.com/api/admin/tours' } as never);
    const body = await response.json();

    expect(mockTourFind).toHaveBeenCalledWith({ tenantId: { $in: ['makadi-bay'] } });
    expect(body.data[0].reviewCount).toBe(1);
    expect(body.data[0].reviews).toBeUndefined();
    expect(mockSelect.mock.calls[0][0]).not.toContain('description');
    expect(mockPopulate).toHaveBeenCalledTimes(2);
    expect(mockPopulate).toHaveBeenNthCalledWith(1, { path: 'category', select: 'name title slug' });
    expect(mockPopulate).toHaveBeenNthCalledWith(2, { path: 'destination', select: 'name title slug' });
  });
});
