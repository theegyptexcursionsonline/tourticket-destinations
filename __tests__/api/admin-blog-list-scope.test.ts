export {};

// The admin blog page no longer reads posts itself; it relies entirely on
// GET /api/admin/blog for who may see which brand's posts. Pin that boundary:
// no session → 401 and no read; a foreign brand → 403 and no read; "All
// brands" → only the caller's own brands.

const mockRequireAdminAuth = jest.fn();
const mockFind = jest.fn();

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

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateStorefrontContent: jest.fn() }));
jest.mock('@/lib/auth/adminAuth', () => {
  const { NextResponse } = jest.requireMock('next/server');
  const forbidden = () => NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  const allowed = (auth: { role: string; tenantIds: string[] }, tenantId: unknown) =>
    auth.role === 'super_admin' || (typeof tenantId === 'string' && auth.tenantIds.includes(tenantId));
  return {
    requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
    canAccessTenant: allowed,
    tenantForbiddenResponse: forbidden,
    requireAdminTenantAccess: (auth: { role: string; tenantIds: string[] }, tenantId: unknown) =>
      (allowed(auth, tenantId) ? null : forbidden()),
  };
});
jest.mock('@/lib/models/Blog', () => ({ __esModule: true, default: { find: (...args: unknown[]) => mockFind(...args) } }));

const BRAND = 'hurghada-excursions-online';
const OTHER = 'luxor-excursions';

function admin(role: string, tenantIds: string[]) {
  return { userId: 'a'.repeat(24), role, permissions: ['manageContent'], tenantIds, twoFactorEnabled: true };
}

async function get(url: string) {
  const { GET } = await import('@/app/api/admin/blog/route');
  return GET({ url, nextUrl: new URL(url) } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFind.mockReturnValue({ sort: () => ({ lean: async () => [{ title: 'Own brand post' }] }) });
});

describe('GET /api/admin/blog — the only way the admin blog page gets posts', () => {
  it('refuses a request without an admin session before reading anything', async () => {
    const { NextResponse } = jest.requireMock('next/server');
    mockRequireAdminAuth.mockResolvedValue(NextResponse.json({ success: false }, { status: 401 }));

    const response = await get('https://dashboard.example/api/admin/blog');

    expect(response.status).toBe(401);
    expect(mockFind).not.toHaveBeenCalled();
  });

  it("refuses a brand editor asking for another brand's posts, before reading anything", async () => {
    mockRequireAdminAuth.mockResolvedValue(admin('content', [BRAND]));

    const response = await get(`https://dashboard.example/api/admin/blog?tenantId=${OTHER}`);

    expect(response.status).toBe(403);
    expect(mockFind).not.toHaveBeenCalled();
  });

  it("gives a brand editor their own brand's posts", async () => {
    mockRequireAdminAuth.mockResolvedValue(admin('content', [BRAND]));

    const response = await get(`https://dashboard.example/api/admin/blog?tenantId=${BRAND}`);

    expect(response.status).toBe(200);
    expect(mockFind).toHaveBeenCalledWith({ tenantId: BRAND });
    await expect(response.json()).resolves.toEqual({ success: true, data: [{ title: 'Own brand post' }] });
  });

  it('scopes "All brands" to the caller\'s own brands', async () => {
    mockRequireAdminAuth.mockResolvedValue(admin('admin', [BRAND]));

    const response = await get('https://dashboard.example/api/admin/blog');

    expect(response.status).toBe(200);
    expect(mockFind).toHaveBeenCalledWith({ tenantId: { $in: [BRAND] } });
  });
});
