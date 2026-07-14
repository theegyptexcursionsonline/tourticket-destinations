export {};

const mockRequireAdminAuth = jest.fn();
const mockDbConnect = jest.fn();
const mockCountDocuments = jest.fn();
const mockFind = jest.fn();
const mockGetTenantFromRequest = jest.fn();

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

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: mockDbConnect }));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: mockRequireAdminAuth,
  canAccessTenant: (_auth: unknown, tenantId: string) => tenantId === 'makadi-bay',
  tenantForbiddenResponse: () => ({ status: 403 }),
}));
jest.mock('@/lib/tenant', () => ({
  getTenantFromRequest: mockGetTenantFromRequest,
  buildTenantQuery: jest.fn((filter) => filter),
}));
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: { countDocuments: mockCountDocuments, find: mockFind, create: jest.fn() },
}));

describe('admin tour form destination lookup', () => {
  it('uses the explicitly selected brand instead of the dashboard host default', async () => {
    mockRequireAdminAuth.mockResolvedValue({ role: 'super_admin', tenantIds: ['makadi-bay'] });
    mockGetTenantFromRequest.mockResolvedValue('default');
    mockCountDocuments.mockResolvedValue(1);
    mockFind.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: 'destination-1' }]) });

    const { GET } = await import('@/app/api/admin/tours/destinations/route');
    const response = await GET({
      url: 'https://dashboard.egypt-excursionsonline.com/api/admin/tours/destinations?tenantId=makadi-bay',
    } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockDbConnect).toHaveBeenCalledWith('makadi-bay');
    expect(mockCountDocuments).toHaveBeenCalledWith({ tenantId: 'makadi-bay' });
    expect(mockGetTenantFromRequest).not.toHaveBeenCalled();
    expect(body.success).toBe(true);
  });
});
