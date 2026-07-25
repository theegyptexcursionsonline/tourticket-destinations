export {};

const mockRequireAdminAuth = jest.fn();
const mockCanAccessTenant = jest.fn();
const mockTourFind = jest.fn();
const mockSelect = jest.fn();
const mockSort = jest.fn();
const mockLimit = jest.fn();
const mockLean = jest.fn();

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

jest.mock('mongoose', () => ({
  Types: {
    ObjectId: class MockObjectId {
      constructor(private value: string) {}
      static isValid(value: string) {
        return /^[a-f\d]{24}$/i.test(value);
      }
      toString() {
        return this.value;
      }
    },
  },
}));

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: mockRequireAdminAuth,
  canAccessTenant: mockCanAccessTenant,
  tenantForbiddenResponse: jest.fn(),
}));
jest.mock('@/lib/models/AttractionPage', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { find: mockTourFind },
}));

function installTourQueryMock() {
  const chain = {
    select: mockSelect,
    sort: mockSort,
    limit: mockLimit,
    lean: mockLean,
  };
  mockTourFind.mockReturnValue(chain);
  mockSelect.mockReturnValue(chain);
  mockSort.mockReturnValue(chain);
  mockLimit.mockReturnValue(chain);
  mockLean.mockResolvedValue([]);
}

describe('GET /api/admin/pages/options tenant tour search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({
      id: 'network-admin',
      role: 'super_admin',
      tenantIds: [],
    });
    mockCanAccessTenant.mockReturnValue(true);
    installTourQueryMock();
  });

  it('keeps the selected brand scope and supports exact Tour ID search', async () => {
    const { GET } = await import('@/app/api/admin/pages/options/route');
    const tourId = '64b64c9bfc13ae1f19e8a001';
    const nextUrl = new URL(
      `https://dashboard.egypt-excursionsonline.com/api/admin/pages/options?kind=tours&tenantId=makadi-bay&q=${tourId}`,
    );

    const response = await GET({ nextUrl } as never);
    const filter = mockTourFind.mock.calls[0][0];

    expect(response.status).toBe(200);
    expect(mockCanAccessTenant).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'network-admin' }),
      'makadi-bay',
    );
    expect(filter.tenantId).toBe('makadi-bay');
    expect(filter.$or.some((condition: Record<string, unknown>) => String(condition._id || '') === tourId))
      .toBe(true);
  });

  it('keeps brand scope when searching by Option ID', async () => {
    const { GET } = await import('@/app/api/admin/pages/options/route');
    const optionId = '263173ac-25a6-46ca-a675-ffe907847c12';
    mockLean.mockResolvedValue([{
      _id: '64b64c9bfc13ae1f19e8a001',
      tenantId: 'makadi-bay',
      title: 'Makadi Option Tour',
      bookingOptions: [{ id: optionId }],
    }]);
    const nextUrl = new URL(
      `https://dashboard.egypt-excursionsonline.com/api/admin/pages/options?kind=tours&tenantId=makadi-bay&q=${optionId}`,
    );

    const response = await GET({ nextUrl } as never);
    const body = await response.json();
    const filter = mockTourFind.mock.calls[0][0];

    expect(filter.tenantId).toBe('makadi-bay');
    expect(filter.$or).toContainEqual({ 'bookingOptions.id': optionId });
    expect(body.data[0].matchedOptionIds).toEqual([optionId]);
  });
});
