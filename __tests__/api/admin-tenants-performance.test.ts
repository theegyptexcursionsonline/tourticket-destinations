export {};

const mockRequireAdminAuth = jest.fn();
const mockCountDocuments = jest.fn();
const mockFind = jest.fn();
const mockSort = jest.fn();
const mockSkip = jest.fn();
const mockLimit = jest.fn();
const mockSelect = jest.fn();
const mockLean = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    headers = { set: jest.fn() };
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
jest.mock('@/lib/auth/adminAuth', () => ({ requireAdminAuth: mockRequireAdminAuth }));
jest.mock('@/lib/tenant', () => ({
  getDefaultTenantConfig: jest.fn(),
  clearTenantCache: jest.fn(),
}));
jest.mock('@/lib/models/Tenant', () => ({
  __esModule: true,
  default: {
    countDocuments: mockCountDocuments,
    find: mockFind,
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

describe('GET /api/admin/tenants performance contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ tenantIds: ['makadi-bay', 'el-gouna'] });
    const chain = { sort: mockSort, skip: mockSkip, limit: mockLimit, select: mockSelect, lean: mockLean };
    mockFind.mockReturnValue(chain);
    mockSort.mockReturnValue(chain);
    mockSkip.mockReturnValue(chain);
    mockLimit.mockReturnValue(chain);
    mockSelect.mockReturnValue(chain);
    mockLean.mockResolvedValue([{ tenantId: 'makadi-bay', name: 'Makadi Bay' }]);
    mockCountDocuments.mockResolvedValue(1);
  });

  it('keeps tenant scope, caps pagination, and returns only card fields', async () => {
    const { GET } = await import('@/app/api/admin/tenants/route');
    const response = await GET({
      url: 'https://dashboard.egypt-excursionsonline.com/api/admin/tenants?limit=999&skip=-5',
    } as never);
    const body = await response.json();

    expect(mockCountDocuments).toHaveBeenCalledWith({ tenantId: { $in: ['makadi-bay', 'el-gouna'] } });
    expect(mockFind).toHaveBeenCalledWith({ tenantId: { $in: ['makadi-bay', 'el-gouna'] } });
    expect(mockLimit).toHaveBeenCalledWith(100);
    expect(mockSkip).toHaveBeenCalledWith(0);
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('branding.logo'));
    expect(mockSelect.mock.calls[0][0]).not.toContain('integrations');
    expect(body.pagination).toMatchObject({ total: 1, limit: 100, skip: 0, hasMore: false });
  });

  it('escapes search input before constructing Mongo regex filters', async () => {
    const { GET } = await import('@/app/api/admin/tenants/route');
    await GET({
      url: 'https://dashboard.egypt-excursionsonline.com/api/admin/tenants?search=%28a%2B%29%2B%24',
    } as never);

    const query = mockFind.mock.calls[0][0];
    expect(query.$or[0].name.$regex).toBe('\\(a\\+\\)\\+\\$');
  });
});
