export {};

/**
 * Behavioural cover for the destination Trash lifecycle.
 *
 * The string-level contract test proves the source reads correctly; this one
 * drives the real route handlers and asserts what they do to the database:
 * archive rather than delete, never touch the linked tours, and restore as a
 * draft. Client report (MT sheet, 02 Sep): "unable to delete destinations".
 */

const mockRequireAdminAuth = jest.fn();
const mockFindById = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockFindOneAndDelete = jest.fn();
const mockTourUpdateMany = jest.fn();
const mockTourCountDocuments = jest.fn();
const mockRevalidate = jest.fn();
const mockCanAccessTenant = jest.fn();
const mockTenantForbiddenResponse = jest.fn();
const mockTenantFindOne = jest.fn();

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

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('mongoose', () => ({
  __esModule: true,
  default: { Types: { ObjectId: { isValid: jest.fn().mockReturnValue(true) } } },
}));
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler }));
jest.mock('@/lib/admin/auditStamp', () => ({ auditStamp: () => ({}) }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateStorefrontContent: (...a: unknown[]) => mockRevalidate(...a) }));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: (...a: unknown[]) => mockRequireAdminAuth(...a),
  canAccessTenant: (...a: unknown[]) => mockCanAccessTenant(...a),
  tenantForbiddenResponse: (...a: unknown[]) => mockTenantForbiddenResponse(...a),
  requireAdminTenantAccess: () => null,
}));
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: {
    findById: (...a: unknown[]) => mockFindById(...a),
    findOne: (...a: unknown[]) => mockFindOne(...a),
    findOneAndUpdate: (...a: unknown[]) => mockFindOneAndUpdate(...a),
    findOneAndDelete: (...a: unknown[]) => mockFindOneAndDelete(...a),
  },
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    updateMany: (...a: unknown[]) => mockTourUpdateMany(...a),
    countDocuments: (...a: unknown[]) => mockTourCountDocuments(...a),
  },
}));
jest.mock('@/lib/models/Tenant', () => ({
  __esModule: true,
  default: {
    findOne: (...a: unknown[]) => mockTenantFindOne(...a),
  },
}));

const DESTINATION_ID = '507f1f77bcf86cd799439011';
const buildRequest = (body?: unknown, query = '') => ({
  url: `https://dashboard.example/api/admin/destinations/${DESTINATION_ID}${query}`,
  method: body ? 'PUT' : 'DELETE',
  json: async () => body ?? {},
  headers: { get: () => null },
});
const request = (body?: unknown, query = '') => buildRequest(body, query) as never;
const params = { params: Promise.resolve({ id: DESTINATION_ID }) };

describe('destination Trash route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ userId: 'admin-1', role: 'super_admin', tenantIds: [], permissions: ['manageContent'] });
    mockCanAccessTenant.mockReturnValue(true);
    mockTenantForbiddenResponse.mockImplementation((context?: {
      resourceName: string;
      tenantName: string;
      separateAdmin?: boolean;
    }) => ({
      status: 403,
      json: async () => ({
        success: false,
        error: context
          ? context.separateAdmin
            ? `This ${context.resourceName} belongs to ${context.tenantName}. Make this change in the ${context.tenantName} admin.`
            : `This ${context.resourceName} belongs to ${context.tenantName}. Only an administrator assigned to that brand can make this change.`
          : 'You do not have access to this tenant.',
      }),
    }));
    mockTenantFindOne.mockReturnValue({
      select: () => ({ lean: async () => ({ name: 'Brand One' }) }),
    });
    mockFindById.mockReturnValue({ select: () => ({ lean: async () => ({ _id: DESTINATION_ID, tenantId: 'brand-one' }) }) });
    mockFindOne.mockResolvedValue({ _id: DESTINATION_ID, tenantId: 'brand-one', archivedAt: new Date() });
    mockFindOneAndUpdate.mockResolvedValue({ _id: DESTINATION_ID, archivedAt: new Date(), tenantId: 'brand-one' });
    // The destination the client could not delete had tours pointing at it.
    mockTourCountDocuments.mockResolvedValue(3);
  });

  it('archives the destination instead of refusing when tours are linked', async () => {
    const { DELETE } = await import('@/app/api/admin/destinations/[id]/route');
    const response = await DELETE(request(), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true });
    expect(String(body.message)).toContain('moved to Trash');

    const [filter, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter).toMatchObject({ _id: DESTINATION_ID, tenantId: 'brand-one' });
    expect(update.$set).toMatchObject({ isPublished: false });
    expect(update.$set.archivedAt).toBeInstanceOf(Date);
  });

  it('never hard-deletes the destination or unlinks its tours', async () => {
    const { DELETE } = await import('@/app/api/admin/destinations/[id]/route');
    await DELETE(request(), params);

    expect(mockFindOneAndDelete).not.toHaveBeenCalled();
    // The old force path unset `destination` on every linked tour.
    expect(mockTourUpdateMany).not.toHaveBeenCalled();
  });

  it('refuses a destination outside the caller tenant scope', async () => {
    mockFindById.mockReturnValue({ select: () => ({ lean: async () => ({ _id: DESTINATION_ID, tenantId: 'brand-two' }) }) });
    const { DELETE } = await import('@/app/api/admin/destinations/[id]/route');
    const response = await DELETE(request(undefined, '?tenantId=brand-one'), params);

    expect(response.status).toBe(403);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('names the owning network brand for a genuinely unassigned admin without mutating', async () => {
    mockCanAccessTenant.mockReturnValue(false);
    mockTenantFindOne.mockReturnValue({
      select: () => ({ lean: async () => ({ name: 'Brand Two' }) }),
    });
    mockFindById.mockReturnValue({ select: () => ({ lean: async () => ({ _id: DESTINATION_ID, tenantId: 'brand-two' }) }) });
    const { DELETE } = await import('@/app/api/admin/destinations/[id]/route');
    const response = await DELETE(request(), params);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe(
      'This destination belongs to Brand Two. Only an administrator assigned to that brand can make this change.',
    );
    expect(mockTenantFindOne).toHaveBeenCalledWith({ tenantId: 'brand-two' });
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('directs default-site destinations to the separate EEO admin without a lookup or mutation', async () => {
    mockCanAccessTenant.mockReturnValue(false);
    mockFindById.mockReturnValue({ select: () => ({ lean: async () => ({ _id: DESTINATION_ID, tenantId: 'default' }) }) });
    const { DELETE } = await import('@/app/api/admin/destinations/[id]/route');
    const response = await DELETE(request(), params);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe(
      'This destination belongs to Egypt Excursions Online. Make this change in the Egypt Excursions Online admin.',
    );
    expect(mockTenantFindOne).not.toHaveBeenCalled();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('keeps the generic 403 and performs no write when brand-name lookup fails', async () => {
    mockCanAccessTenant.mockReturnValue(false);
    mockTenantFindOne.mockReturnValue({
      select: () => ({ lean: async () => { throw new Error('lookup unavailable'); } }),
    });
    const { DELETE } = await import('@/app/api/admin/destinations/[id]/route');
    const response = await DELETE(request(), params);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('You do not have access to this tenant.');
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('uses the same fail-closed contextual denial before an update write', async () => {
    mockCanAccessTenant.mockReturnValue(false);
    mockTenantFindOne.mockReturnValue({
      select: () => ({ lean: async () => ({ name: 'Brand One' }) }),
    });
    const { PUT } = await import('@/app/api/admin/destinations/[id]/route');
    const response = await PUT(request({ name: 'Cairo', description: 'x' }), params);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('This destination belongs to Brand One.');
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('restores from Trash as a draft and clears the archive stamp', async () => {
    mockFindOneAndUpdate.mockResolvedValue({ _id: DESTINATION_ID, archivedAt: null, isPublished: false });
    const { PUT } = await import('@/app/api/admin/destinations/[id]/route');
    const response = await PUT(request({ restoreFromTrash: true }), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(String(body.message)).toContain('restored from Trash');
    const [, update] = mockFindOneAndUpdate.mock.calls[0];
    expect(update.$set).toMatchObject({ archivedAt: null, archivedBy: null, isPublished: false });
  });

  it('ignores archive fields a client tries to set on a normal update', async () => {
    const { PUT } = await import('@/app/api/admin/destinations/[id]/route');
    await PUT(request({ name: 'Cairo', description: 'x', archivedAt: null, archivedBy: 'someone' }), params);

    for (const call of mockFindOneAndUpdate.mock.calls) {
      const update = call[1] || {};
      const payload = JSON.stringify(update);
      expect(payload).not.toContain('"archivedBy":"someone"');
    }
  });
});
