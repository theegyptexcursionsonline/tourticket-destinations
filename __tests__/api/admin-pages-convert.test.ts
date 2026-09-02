export {};

// POST /api/admin/pages/convert — "Change page type safely" (parity with EEO).
// The source is never mutated; the draft lands unpublished under the SOURCE's
// tenant, and a caller who cannot access that tenant is refused before any
// write happens.

const mockRequireAdminAuth = jest.fn();
const mockCanAccessTenant = jest.fn();
const mockCategoryFindOne = jest.fn();
const mockCategoryCount = jest.fn();
const mockCategoryCreate = jest.fn();
const mockAttractionFindOne = jest.fn();
const mockAttractionCreate = jest.fn();
const mockDestinationCount = jest.fn();
const mockValidateParent = jest.fn();
const mockValidateLinks = jest.fn();
const mockRegisterAudit = jest.fn();
const mockRevalidate = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private body: unknown;
    constructor(body: unknown, status = 200) {
      this.body = body;
      this.status = status;
    }
    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init?.status || 200);
    }
    json() {
      return Promise.resolve(this.body);
    }
  }
  return { NextResponse: MockNextResponse, NextRequest: class {} };
});
jest.mock('mongoose', () => {
  function MockObjectId() {
    return { toString: () => '68e1825fe6bab638df5a7f99' };
  }
  MockObjectId.isValid = jest.fn((value: unknown) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value));
  return {
    __esModule: true,
    default: { Types: { ObjectId: MockObjectId } },
    Types: { ObjectId: MockObjectId },
  };
});
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
  canAccessTenant: (...args: unknown[]) => mockCanAccessTenant(...args),
  tenantForbiddenResponse: () => {
    const { NextResponse } = jest.requireMock('next/server');
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  },
}));
jest.mock('@/lib/admin/adminAudit', () => ({
  registerAdminAuditDetail: (...args: unknown[]) => mockRegisterAudit(...args),
  withAdminAudit: (handler: unknown) => handler,
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => ({ lean: () => mockCategoryFindOne(...args) }),
    countDocuments: (...args: unknown[]) => mockCategoryCount(...args),
    create: (...args: unknown[]) => mockCategoryCreate(...args),
  },
}));
jest.mock('@/lib/models/AttractionPage', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => ({ lean: () => mockAttractionFindOne(...args) }),
    create: (...args: unknown[]) => mockAttractionCreate(...args),
  },
}));
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: { countDocuments: (...args: unknown[]) => mockDestinationCount(...args) },
}));
jest.mock('@/lib/content/contentNavigation', () => ({
  sanitizeContentNavigation: (value: Record<string, unknown>) => ({ parentPage: value.parentPage ?? null }),
}));
jest.mock('@/lib/content/validateParentPage', () => ({
  ParentPageValidationError: class ParentPageValidationError extends Error {},
  validateParentPageSelection: (...args: unknown[]) => mockValidateParent(...args),
}));
jest.mock('@/lib/attractionPages/validatePageLinks', () => ({
  PageLinkValidationError: class PageLinkValidationError extends Error {},
  validateAndNormalizePageLinks: (...args: unknown[]) => mockValidateLinks(...args),
}));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({
  revalidateStorefrontContent: (...args: unknown[]) => mockRevalidate(...args),
}));

const validId = '64b000000000000000000001';

function request(body: Record<string, unknown>) {
  return {
    method: 'POST',
    url: 'http://localhost/api/admin/pages/convert',
    nextUrl: new URL('http://localhost/api/admin/pages/convert'),
    headers: new Headers({ 'content-type': 'application/json' }),
    json: jest.fn().mockResolvedValue(body),
  } as never;
}

describe('POST /api/admin/pages/convert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ userId: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin', tenantIds: ['brand-a'] });
    mockCanAccessTenant.mockImplementation((_auth: unknown, tenantId: string) => tenantId === 'brand-a');
    mockValidateParent.mockResolvedValue(null);
    mockValidateLinks.mockResolvedValue({ linkedPageIds: [], linkedCategoryIds: [] });
    mockDestinationCount.mockResolvedValue(1);
    mockCategoryCount.mockResolvedValue(1);
  });

  it('fails closed when the caller lacks content-management permission', async () => {
    const { NextResponse } = jest.requireMock('next/server');
    mockRequireAdminAuth.mockResolvedValue(
      NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }),
    );
    const { POST } = await import('@/app/api/admin/pages/convert/route');
    const response = await POST(request({ id: validId, sourceKind: 'category', targetKind: 'attraction' }));
    expect(response.status).toBe(403);
    expect(mockCategoryFindOne).not.toHaveBeenCalled();
  });

  it.each([
    ['not-an-id', 'category', 'attraction'],
    [validId, 'category', 'category'],
    [validId, 'attraction', 'category-landing'],
    [validId, 'nonsense', 'category'],
  ])('rejects invalid and unsafe conversion pairs (%s %s -> %s)', async (id, sourceKind, targetKind) => {
    const { POST } = await import('@/app/api/admin/pages/convert/route');
    const response = await POST(request({ id, sourceKind, targetKind }));
    expect(response.status).toBe(400);
    expect(mockCategoryFindOne).not.toHaveBeenCalled();
    expect(mockAttractionFindOne).not.toHaveBeenCalled();
  });

  it('creates an unpublished Attraction draft in the source tenant without mutating the Category', async () => {
    const source = {
      _id: validId,
      tenantId: 'brand-a',
      name: 'Desert Safari',
      slug: 'desert-safari',
      description: 'Shared copy',
      heroImage: '/desert.jpg',
      archivedAt: null,
      isPublished: true,
    };
    mockCategoryFindOne.mockResolvedValue(source);
    mockAttractionCreate.mockImplementation(async (draft) => ({ ...draft }));

    const { POST } = await import('@/app/api/admin/pages/convert/route');
    const response = await POST(request({ id: validId, sourceKind: 'category', targetKind: 'attraction' }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.editHref).toMatch(/^\/admin\/attraction-pages\//);
    expect(mockCategoryFindOne).toHaveBeenCalledWith({ _id: validId, archivedAt: null });
    expect(mockAttractionCreate).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'brand-a',
      title: 'Desert Safari (Attraction)',
      slug: 'desert-safari-attraction',
      pageType: 'attraction',
      isPublished: false,
      archivedAt: null,
      createdBy: expect.objectContaining({ id: 'admin-1' }),
    }));
    // parent + links are validated inside the source tenant only
    expect(mockValidateParent).toHaveBeenCalledWith(expect.objectContaining({ tenantFilter: { tenantId: 'brand-a' } }));
    expect(mockValidateLinks).toHaveBeenCalledWith(expect.any(Object), 'brand-a', '68e1825fe6bab638df5a7f99');
    expect(source).toMatchObject({ name: 'Desert Safari', isPublished: true, archivedAt: null });
    expect(mockRegisterAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'create',
      resourceType: 'pages',
      tenantIds: ['brand-a'],
    }));
    expect(mockRevalidate).toHaveBeenCalled();
  });

  it('refuses to convert a page that belongs to a brand the caller cannot access', async () => {
    mockCategoryFindOne.mockResolvedValue({
      _id: validId, tenantId: 'brand-b', name: 'Other Brand', slug: 'other-brand', archivedAt: null,
    });
    const { POST } = await import('@/app/api/admin/pages/convert/route');
    const response = await POST(request({ id: validId, sourceKind: 'category', targetKind: 'attraction' }));

    expect(response.status).toBe(403);
    expect(mockCanAccessTenant).toHaveBeenCalledWith(expect.anything(), 'brand-b');
    expect(mockAttractionCreate).not.toHaveBeenCalled();
    expect(mockCategoryCreate).not.toHaveBeenCalled();
    expect(mockRegisterAudit).not.toHaveBeenCalled();
  });

  it('creates a Category 2 draft linked to its active source Category, checked inside the tenant', async () => {
    mockCategoryFindOne.mockResolvedValue({
      _id: validId, tenantId: 'brand-a', name: 'Boat Trips', slug: 'boat-trips', description: 'Shared copy', archivedAt: null,
    });
    mockAttractionCreate.mockImplementation(async (draft) => ({ ...draft }));
    const { POST } = await import('@/app/api/admin/pages/convert/route');
    const response = await POST(request({ id: validId, sourceKind: 'category', targetKind: 'category-landing' }));

    expect(response.status).toBe(201);
    expect(mockCategoryCount).toHaveBeenCalledWith({ tenantId: 'brand-a', _id: validId, archivedAt: null });
    expect(mockAttractionCreate).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'brand-a',
      pageType: 'category',
      categoryId: validId,
      title: 'Boat Trips (Category 2)',
      slug: 'boat-trips-category-2',
      isPublished: false,
    }));
  });

  it('creates a Category draft from an Attraction page', async () => {
    mockAttractionFindOne.mockResolvedValue({
      _id: validId, tenantId: 'brand-a', title: 'Giza Plateau', slug: 'giza-plateau', description: 'Shared copy',
      pageType: 'attraction', archivedAt: null, translations: { de: { title: 'Gizeh', gridTitle: 'x' } },
    });
    mockCategoryCreate.mockImplementation(async (draft) => ({ ...draft }));
    const { POST } = await import('@/app/api/admin/pages/convert/route');
    const response = await POST(request({ id: validId, sourceKind: 'attraction', targetKind: 'category' }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.editHref).toMatch(/^\/admin\/categories\//);
    expect(mockAttractionFindOne).toHaveBeenCalledWith({ _id: validId, pageType: 'attraction', archivedAt: null });
    expect(mockCategoryCreate).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'brand-a',
      name: 'Giza Plateau (Category)',
      slug: 'giza-plateau-category',
      isPublished: false,
      translations: { de: { name: 'Gizeh' } },
    }));
  });

  it('returns 404 when the source is missing or already in the trash', async () => {
    mockAttractionFindOne.mockResolvedValue(null);
    const { POST } = await import('@/app/api/admin/pages/convert/route');
    const response = await POST(request({ id: validId, sourceKind: 'attraction', targetKind: 'category' }));
    expect(response.status).toBe(404);
    expect(mockAttractionCreate).not.toHaveBeenCalled();
    expect(mockCategoryCreate).not.toHaveBeenCalled();
  });

  it('rejects a transfer whose city relationship is unavailable in the tenant', async () => {
    mockCategoryFindOne.mockResolvedValue({
      _id: validId, tenantId: 'brand-a', name: 'City page', slug: 'city-page', description: 'Shared copy',
      urlType: 'city', cityDestination: '64b000000000000000000099', archivedAt: null,
    });
    mockDestinationCount.mockResolvedValue(0);
    const { POST } = await import('@/app/api/admin/pages/convert/route');
    const response = await POST(request({ id: validId, sourceKind: 'category', targetKind: 'attraction' }));
    const payload = await response.json();
    expect(response.status).toBe(409);
    expect(payload.code).toBe('SOURCE_RELATIONSHIP_INVALID');
    expect(mockDestinationCount).toHaveBeenCalledWith({ tenantId: 'brand-a', _id: '64b000000000000000000099', archivedAt: null });
    expect(mockAttractionCreate).not.toHaveBeenCalled();
  });

  it('retries the identity on a duplicate-key collision instead of failing', async () => {
    mockCategoryFindOne.mockResolvedValue({
      _id: validId, tenantId: 'brand-a', name: 'Desert Safari', slug: 'desert-safari', description: 'x', archivedAt: null,
    });
    mockAttractionCreate
      .mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 11000 }))
      .mockImplementation(async (draft) => ({ ...draft }));
    const { POST } = await import('@/app/api/admin/pages/convert/route');
    const response = await POST(request({ id: validId, sourceKind: 'category', targetKind: 'attraction' }));
    expect(response.status).toBe(201);
    expect(mockAttractionCreate).toHaveBeenCalledTimes(2);
    expect(mockAttractionCreate).toHaveBeenLastCalledWith(expect.objectContaining({
      title: 'Desert Safari (Attraction 2)',
      slug: 'desert-safari-attraction-2',
    }));
  });
});
