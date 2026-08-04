export {};

const mockRequireAdminAuth = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockBuildDefault = jest.fn();
const mockRevalidate = jest.fn();
const mockGetTenant = jest.fn();

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
  canAccessTenant: jest.fn(() => true),
  adminCanAccessTenant: jest.fn(() => true),
  tenantForbiddenResponse: jest.fn(),
}));
jest.mock('@/lib/tenant', () => ({ getTenantFromRequest: mockGetTenant }));
jest.mock('@/lib/models/InternalLinkBlock', () => ({
  __esModule: true,
  default: { findOne: mockFindOne, findOneAndUpdate: mockFindOneAndUpdate },
}));
jest.mock('@/lib/navigation/defaultInternalLinks', () => ({ buildDefaultInternalLinks: mockBuildDefault }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateStorefrontContent: mockRevalidate }));

const fallback = {
  enabled: true,
  heading: { en: 'Explore Egypt' },
  groups: [{
    id: 'destinations',
    title: { en: 'Destinations' },
    enabled: true,
    links: [{ id: 'hurghada', label: { en: 'Hurghada' }, href: '/hurghada', enabled: true }],
  }],
};
const request = (query: string, body?: unknown) => ({
  nextUrl: { searchParams: new URLSearchParams(query) },
  json: async () => body,
});
const lean = (value: unknown) => ({ lean: jest.fn().mockResolvedValue(value) });

describe('tenant internal-link APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ id: 'admin', role: 'admin', tenantIds: ['hurghada'] });
    mockGetTenant.mockResolvedValue('hurghada');
    mockFindOne.mockReturnValue(lean(null));
    mockBuildDefault.mockResolvedValue(fallback);
  });

  it('requires a selected brand and generates tenant-scoped defaults', async () => {
    const { GET } = await import('@/app/api/admin/internal-link-block/route');
    const missing = await GET(request('') as never);
    expect(missing.status).toBe(400);
    const response = await GET(request('tenantId=hurghada') as never);
    expect(response.status).toBe(200);
    expect(mockBuildDefault).toHaveBeenCalledWith({ tenantId: 'hurghada' });
  });

  it('sanitizes and saves only inside the selected tenant', async () => {
    mockFindOneAndUpdate.mockReturnValue(lean({ ...fallback, tenantId: 'hurghada' }));
    const { PUT } = await import('@/app/api/admin/internal-link-block/route');
    const response = await PUT(request('tenantId=hurghada', fallback) as never);
    expect(response.status).toBe(200);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { tenantId: 'hurghada' },
      expect.objectContaining({ $set: expect.objectContaining({ tenantId: 'hurghada' }) }),
      expect.objectContaining({ upsert: true, runValidators: true }),
    );
    expect(mockRevalidate).toHaveBeenCalledWith('hurghada');
  });

  it('returns the current storefront tenant block from the public endpoint', async () => {
    const { GET } = await import('@/app/api/navigation/internal-links/route');
    const response = await GET(request('locale=en') as never);
    const body = await response.json();
    expect(mockFindOne).toHaveBeenCalledWith({ tenantId: 'hurghada', enabled: true });
    expect(body.data.groups[0].links[0].href).toBe('/hurghada');
  });
});
