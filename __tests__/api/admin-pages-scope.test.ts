export {};

const mockRequireAdminAuth = jest.fn();
const mockCanAccessTenant = jest.fn(() => true);
const mockPageFind = jest.fn();
const mockCategoryFind = jest.fn();
const mockPageCount = jest.fn();
const mockCategoryCount = jest.fn();

jest.mock('mongoose', () => {
  class MockObjectId {
    constructor(public value: string) {}
    static isValid(value: unknown) { return /^[a-f\d]{24}$/i.test(String(value)); }
    getTimestamp() { return new Date(0); }
    toString() { return this.value; }
  }
  return { Types: { ObjectId: MockObjectId } };
});

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
  canAccessTenant: mockCanAccessTenant,
  adminCanAccessTenant: mockCanAccessTenant,
  tenantForbiddenResponse: () => ({ status: 403 }),
}));
jest.mock('@/lib/models/AttractionPage', () => ({
  __esModule: true,
  default: { find: mockPageFind, countDocuments: mockPageCount },
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: { find: mockCategoryFind, countDocuments: mockCategoryCount },
}));

function chainFind(mock: jest.Mock) {
  const chain = { select: jest.fn(), sort: jest.fn(), limit: jest.fn(), lean: jest.fn() };
  chain.select.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.lean.mockResolvedValue([]);
  mock.mockReturnValue(chain);
}

describe('GET /api/admin/pages tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chainFind(mockPageFind);
    chainFind(mockCategoryFind);
    mockPageCount.mockResolvedValue(0);
    mockCategoryCount.mockResolvedValue(0);
  });

  it('limits All Brands to a non-super-admin assigned brands', async () => {
    mockRequireAdminAuth.mockResolvedValue({
      role: 'admin',
      tenantIds: ['makadi-bay', 'el-gouna'],
    });
    const { GET } = await import('@/app/api/admin/pages/route');
    const response = await GET({
      nextUrl: new URL('https://dashboard.example/api/admin/pages'),
    } as never);

    expect(response.status).toBe(200);
    expect(mockPageFind).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: { $in: ['makadi-bay', 'el-gouna'] },
    }));
    expect(mockCategoryFind).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: { $in: ['makadi-bay', 'el-gouna'] },
    }));
  });

  it('uses the selected brand as the exact tenant scope', async () => {
    mockRequireAdminAuth.mockResolvedValue({ role: 'super_admin', tenantIds: [] });
    const { GET } = await import('@/app/api/admin/pages/route');
    await GET({
      nextUrl: new URL('https://dashboard.example/api/admin/pages?tenantId=makadi-bay'),
    } as never);

    expect(mockCanAccessTenant).toHaveBeenCalledWith(expect.anything(), 'makadi-bay');
    expect(mockPageFind).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'makadi-bay' }));
    expect(mockCategoryFind).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'makadi-bay' }));
  });
});
