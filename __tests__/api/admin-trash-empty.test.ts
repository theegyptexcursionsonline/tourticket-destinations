export {};

/**
 * Empty trash (parity with EEO, client request 2026-08-21) on a multi-site
 * network: irreversible, so it must be super-admin only, scoped to a site the
 * caller can access, and must refuse any trashed tour that still has a
 * booking on record.
 */

const mockRequireAdminAuth = jest.fn();
const mockCanAccessTenant = jest.fn(() => true);
const mockTourFind = jest.fn();
const mockTourDelete = jest.fn();
const mockBookingCount = jest.fn();
const mockAudit = jest.fn();
const mockRevalidate = jest.fn();

jest.mock('mongoose', () => {
  class MockObjectId {
    constructor(public value: string) {}
    static isValid(value: unknown) { return /^[a-f\d]{24}$/i.test(String(value)); }
    toString() { return this.value; }
  }
  return { __esModule: true, default: { Types: { ObjectId: MockObjectId } }, Types: { ObjectId: MockObjectId } };
});

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private data: unknown;
    constructor(data: unknown, init?: { status?: number }) { this.data = data; this.status = init?.status || 200; }
    static json(data: unknown, init?: { status?: number }) { return new MockNextResponse(data, init); }
    async json() { return this.data; }
  }
  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
// lib/tenant pulls the Tenant model (real mongoose); the scoping helper is pure.
jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: (base: Record<string, unknown>, tenantId: string) => ({
    ...base,
    $or: [{ tenantId }, { tenantIds: tenantId }],
  }),
}));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: mockRequireAdminAuth,
  canAccessTenant: mockCanAccessTenant,
  tenantForbiddenResponse: () =>
    jest.requireMock('next/server').NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }),
}));
jest.mock('@/lib/admin/adminAudit', () => ({
  withAdminAudit: (handler: unknown) => handler,
  registerAdminAuditDetail: mockAudit,
}));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateStorefrontContent: mockRevalidate }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { find: mockTourFind, findOneAndDelete: mockTourDelete, countDocuments: jest.fn() } }));
jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: { find: jest.fn(), findOneAndDelete: jest.fn(), countDocuments: jest.fn() } }));
jest.mock('@/lib/models/AttractionPage', () => ({ __esModule: true, default: { find: jest.fn(), findOneAndDelete: jest.fn() } }));
jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: { countDocuments: mockBookingCount } }));

const TRASHED = [
  { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', title: 'Old test tour' },
  { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', title: 'Retired tour with bookings' },
];

function chain(docs: unknown[]) {
  const c = { select: jest.fn(), lean: jest.fn() };
  c.select.mockReturnValue(c);
  c.lean.mockResolvedValue(docs);
  return c;
}

const req = (url: string, body?: unknown) =>
  ({ url: `https://admin.example${url}`, json: async () => body ?? {} }) as never;

describe('/api/admin/trash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTourFind.mockImplementation(() => chain(TRASHED));
    mockTourDelete.mockImplementation(async (query: { _id: string }) => ({ _id: query._id }));
    mockBookingCount.mockImplementation(async ({ tour }: { tour: string }) => (tour === TRASHED[1]._id ? 2 : 0));
  });

  it('previews the purge for a site admin, naming what would be kept and why', async () => {
    mockRequireAdminAuth.mockResolvedValue({ role: 'admin', tenantIds: ['hurghada-safari'] });
    const { GET } = await import('@/app/api/admin/trash/route');
    const res = await GET(req('/api/admin/trash?kind=tour&tenantId=hurghada-safari'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.inspected).toBe(2);
    expect(body.blocked).toEqual([
      expect.objectContaining({ id: TRASHED[1]._id, blockedReason: 'Has 2 bookings on record' }),
    ]);
    // the query is scoped to the named site and to trashed records only
    expect(mockTourFind.mock.calls[0][0]).toMatchObject({
      archivedAt: { $ne: null },
      $or: [{ tenantId: 'hurghada-safari' }, { tenantIds: 'hurghada-safari' }],
    });
  });

  it('refuses a site admin who omits the site instead of purging across the network', async () => {
    mockRequireAdminAuth.mockResolvedValue({ role: 'admin', tenantIds: ['hurghada-safari'] });
    const { GET } = await import('@/app/api/admin/trash/route');
    const res = await GET(req('/api/admin/trash?kind=tour'));
    expect(res.status).toBe(400);
    expect(mockTourFind).not.toHaveBeenCalled();
  });

  it('refuses a site the caller cannot access', async () => {
    mockRequireAdminAuth.mockResolvedValue({ role: 'admin', tenantIds: ['hurghada-safari'] });
    mockCanAccessTenant.mockImplementationOnce(() => false);
    const { GET } = await import('@/app/api/admin/trash/route');
    const res = await GET(req('/api/admin/trash?kind=tour&tenantId=another-site'));
    expect(mockCanAccessTenant).toHaveBeenCalledWith(expect.anything(), 'another-site');
    expect(res.status).toBe(403);
  });

  it('only a super administrator may permanently delete', async () => {
    mockRequireAdminAuth.mockResolvedValue({ role: 'admin', tenantIds: ['hurghada-safari'] });
    const { DELETE } = await import('@/app/api/admin/trash/route');
    const res = await DELETE(req('/api/admin/trash?kind=tour&tenantId=hurghada-safari'));
    expect(res.status).toBe(403);
    expect(mockTourDelete).not.toHaveBeenCalled();
  });

  it('deletes only the safe records, one at a time, re-asserting trash + site in each delete', async () => {
    mockRequireAdminAuth.mockResolvedValue({ role: 'super_admin', tenantIds: [] });
    const { DELETE } = await import('@/app/api/admin/trash/route');
    const res = await DELETE(req('/api/admin/trash?kind=tour&tenantId=hurghada-safari'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.deleted).toEqual([TRASHED[0]._id]);
    expect(body.blocked.map((b: { id: string }) => b.id)).toEqual([TRASHED[1]._id]);
    expect(mockTourDelete).toHaveBeenCalledTimes(1);
    expect(mockTourDelete.mock.calls[0][0]).toMatchObject({
      archivedAt: { $ne: null },
      _id: { $in: [TRASHED[0]._id] },
      $or: [{ tenantId: 'hurghada-safari' }, { tenantIds: 'hurghada-safari' }],
    });
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', resourceType: 'trash:tour' }));
    expect(mockRevalidate).toHaveBeenCalledWith('hurghada-safari');
  });

  it('rejects an unknown trash type before touching the database', async () => {
    mockRequireAdminAuth.mockResolvedValue({ role: 'super_admin', tenantIds: [] });
    const { DELETE } = await import('@/app/api/admin/trash/route');
    const res = await DELETE(req('/api/admin/trash?kind=destination'));
    expect(res.status).toBe(400);
    expect(mockTourFind).not.toHaveBeenCalled();
  });
});
