export {};

const mockRequireAdminAuth = jest.fn();
const mockCanAccessTenant = jest.fn();
const mockTenantForbiddenResponse = jest.fn();
const mockDbConnect = jest.fn();
const mockPageFindOne = jest.fn();
const mockCategoryFindOne = jest.fn();
const mockPageSave = jest.fn();
const mockPagePopulate = jest.fn();
const mockPageConstructor = jest.fn();
const mockValidateLinks = jest.fn();
const mockValidateParent = jest.fn();
const mockRevalidate = jest.fn();

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

jest.mock('@/lib/admin/adminAudit', () => ({
  registerAdminAuditDetail: jest.fn(),
  withAdminAudit: (handler: unknown) => handler,
}));
jest.mock('@/lib/admin/contentPageAudit', () => ({
  contentPageAuditDetail: jest.fn(() => ({})),
}));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: mockRequireAdminAuth,
  canAccessTenant: mockCanAccessTenant,
  tenantForbiddenResponse: mockTenantForbiddenResponse,
}));
jest.mock('@/lib/dbConnect', () => ({
  __esModule: true,
  default: mockDbConnect,
}));
jest.mock('@/lib/models/AttractionPage', () => ({
  __esModule: true,
  default: Object.assign(mockPageConstructor, {
    findOne: mockPageFindOne,
  }),
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: { findOne: mockCategoryFindOne },
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));
jest.mock('@/lib/attractionPages/validatePageLinks', () => ({
  PageLinkValidationError: class MockPageLinkValidationError extends Error {},
  validateAndNormalizePageLinks: mockValidateLinks,
}));
jest.mock('@/lib/content/validateParentPage', () => ({
  ParentPageValidationError: class MockParentPageValidationError extends Error {},
  validateParentPageSelection: mockValidateParent,
}));
jest.mock('@/lib/content/contentNavigation', () => ({
  sanitizeContentNavigation: jest.fn(() => ({})),
}));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({
  revalidateStorefrontContent: mockRevalidate,
}));

const tenantId = 'marsa-alam-excursions';
const categoryId = '64b64c9bfc13ae1f19e8a001';
const minimalDraft = {
  tenantId,
  title: 'QA MT Category 2',
  slug: 'qa-mt-category-2',
  description: 'A reversible test page.',
  pageType: 'category',
  categoryId,
  isPublished: false,
  linkedTourIds: [],
  linkedPageIds: [],
  linkedCategoryIds: [],
};

function request(body: Record<string, unknown>, scopedTenantId = tenantId) {
  return {
    url: `https://dashboard.example/api/admin/attraction-pages?tenantId=${scopedTenantId}`,
    json: jest.fn().mockResolvedValue(body),
  };
}

describe('POST /api/admin/attraction-pages Category 2 creation', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({
      id: 'network-admin',
      role: 'admin',
      tenantIds: [tenantId],
      permissions: ['manageContent'],
    });
    mockCanAccessTenant.mockReturnValue(true);
    const { NextResponse } = await import('next/server');
    mockTenantForbiddenResponse.mockImplementation(() => NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 },
    ));
    mockDbConnect.mockResolvedValue(undefined);
    mockPageFindOne.mockResolvedValue(null);
    mockCategoryFindOne.mockResolvedValue({ _id: categoryId, tenantId });
    mockValidateParent.mockResolvedValue(null);
    mockValidateLinks.mockResolvedValue({
      linkedTourIds: [],
      linkedPageIds: [],
      linkedCategoryIds: [],
    });
    mockPageSave.mockResolvedValue(undefined);
    mockPagePopulate.mockResolvedValue(undefined);
    mockPageConstructor.mockImplementation((body) => ({
      ...body,
      _id: '64b64c9bfc13ae1f19e8a099',
      save: mockPageSave,
      populate: mockPagePopulate,
    }));
  });

  it('creates a tenant-scoped draft from the minimal visible fields', async () => {
    const { POST } = await import('@/app/api/admin/attraction-pages/route');
    const response = await POST(request(minimalDraft) as never);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(mockCanAccessTenant).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'network-admin' }),
      tenantId,
    );
    expect(mockCategoryFindOne).toHaveBeenCalledWith({ _id: categoryId, tenantId });
    expect(mockPageConstructor).toHaveBeenCalledWith(expect.objectContaining({
      tenantId,
      categoryId,
      pageType: 'category',
      isPublished: false,
      gridTitle: 'QA MT Category 2',
    }));
    expect(mockPageSave).toHaveBeenCalledTimes(1);
  });

  it('fails closed when a caller lacks the required admin permission', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireAdminAuth.mockResolvedValue(NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 },
    ));
    const { POST } = await import('@/app/api/admin/attraction-pages/route');
    const response = await POST(request(minimalDraft) as never);

    expect(response.status).toBe(403);
    expect(mockDbConnect).not.toHaveBeenCalled();
    expect(mockPageConstructor).not.toHaveBeenCalled();
  });

  it('rejects a body tenant that differs from the selected brand', async () => {
    const { POST } = await import('@/app/api/admin/attraction-pages/route');
    const response = await POST(request({
      ...minimalDraft,
      tenantId: 'foreign-brand',
    }) as never);

    expect(response.status).toBe(403);
    expect(mockPageConstructor).not.toHaveBeenCalled();
  });

  it('rejects a category that does not belong to the selected brand', async () => {
    mockCategoryFindOne.mockResolvedValue(null);
    const { POST } = await import('@/app/api/admin/attraction-pages/route');
    const response = await POST(request(minimalDraft) as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Category not found');
    expect(mockCategoryFindOne).toHaveBeenCalledWith({ _id: categoryId, tenantId });
    expect(mockPageConstructor).not.toHaveBeenCalled();
  });

  it('keeps category association mandatory and reports it by name', async () => {
    const { POST } = await import('@/app/api/admin/attraction-pages/route');
    const response = await POST(request({
      ...minimalDraft,
      categoryId: '',
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Category');
    expect(mockCategoryFindOne).not.toHaveBeenCalled();
    expect(mockPageConstructor).not.toHaveBeenCalled();
  });

  it('requires hero media before publication while keeping draft creation unblocked', async () => {
    const { POST } = await import('@/app/api/admin/attraction-pages/route');
    const response = await POST(request({
      ...minimalDraft,
      isPublished: true,
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Hero Image');
    expect(mockPageConstructor).not.toHaveBeenCalled();
  });
});
