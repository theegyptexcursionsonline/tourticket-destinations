jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    _data: unknown;
    constructor(init?: { status?: number }) { this.status = init?.status || 200; }
    async json() { return this._data; }
    static json(data: unknown, init?: { status?: number }) {
      const response = new MockNextResponse(init);
      response._data = data;
      return response;
    }
  }
  return { NextResponse: MockNextResponse, NextRequest: class {} };
});

jest.mock('mongoose', () => {
  class MockObjectId {
    toString() { return '507f1f77bcf86cd799439099'; }
  }
  return {
    __esModule: true,
    default: { Types: { ObjectId: Object.assign(MockObjectId, { isValid: (id: string) => /^[a-f\d]{24}$/i.test(id) }) } },
    Types: { ObjectId: Object.assign(MockObjectId, { isValid: (id: string) => /^[a-f\d]{24}$/i.test(id) }) },
  };
});

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

const mockRequireAdminAuth = jest.fn();
const mockCanAccessTenant = jest.fn();
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
  canAccessTenant: (...args: unknown[]) => mockCanAccessTenant(...args),
  tenantForbiddenResponse: () => {
    const { NextResponse } = jest.requireMock('next/server');
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  },
}));

jest.mock('@/lib/admin/adminAudit', () => ({
  registerAdminAuditDetail: jest.fn(),
  withAdminAudit: (handler: unknown) => handler,
}));
jest.mock('@/lib/content/contentNavigation', () => ({ sanitizeContentNavigation: (value: unknown) => value }));
jest.mock('@/lib/content/validateParentPage', () => ({
  ParentPageValidationError: class ParentPageValidationError extends Error {},
  validateParentPageSelection: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/attractionPages/validatePageLinks', () => ({
  PageLinkValidationError: class PageLinkValidationError extends Error {},
  validateAndNormalizePageLinks: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({
  revalidateTourStorefront: jest.fn(),
  revalidateStorefrontContent: jest.fn(),
}));
jest.mock('@/lib/revenue/pricingSummary', () => ({
  refreshTourPricingSummaries: jest.fn().mockResolvedValue([]),
  syncTourPricingSearchIndex: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantId }),
}));

const mockTourFindById = jest.fn();
const mockTourCreate = jest.fn();
const mockTourCount = jest.fn();
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => mockTourFindById(...args),
    create: (...args: unknown[]) => mockTourCreate(...args),
    countDocuments: (...args: unknown[]) => mockTourCount(...args),
  },
}));

const mockDestinationFindById = jest.fn();
const mockDestinationCreate = jest.fn();
const mockDestinationCount = jest.fn();
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => mockDestinationFindById(...args),
    create: (...args: unknown[]) => mockDestinationCreate(...args),
    countDocuments: (...args: unknown[]) => mockDestinationCount(...args),
  },
}));

const mockCategoryCount = jest.fn();
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: { countDocuments: (...args: unknown[]) => mockCategoryCount(...args) },
}));

const mockPageFindOne = jest.fn();
const mockPageCreate = jest.fn();
jest.mock('@/lib/models/AttractionPage', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockPageFindOne(...args),
    create: (...args: unknown[]) => mockPageCreate(...args),
  },
}));

import { NextResponse } from 'next/server';
import { POST as duplicateTour } from '@/app/api/admin/tours/[id]/duplicate/route';
import { POST as duplicateDestination } from '@/app/api/admin/destinations/[id]/duplicate/route';
import { POST as duplicatePage } from '@/app/api/admin/pages/duplicate/route';

const ID = '507f1f77bcf86cd799439011';
const request = { json: jest.fn(), url: 'https://dashboard.test/api/admin' } as any;

const lean = (value: unknown) => ({ lean: jest.fn().mockResolvedValue(value) });

describe('tenant-safe duplicate routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ userId: 'admin', role: 'admin', permissions: ['manageContent', 'manageTours'] });
    mockCanAccessTenant.mockReturnValue(true);
    mockDestinationCount.mockResolvedValue(1);
    mockCategoryCount.mockResolvedValue(1);
    mockTourCount.mockResolvedValue(0);
  });

  it('enforces admin authentication before every duplication', async () => {
    const blocked = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mockRequireAdminAuth.mockResolvedValue(blocked);
    request.json.mockResolvedValue({ kind: 'attraction', id: ID });
    await expect(duplicateTour(request, { params: Promise.resolve({ id: ID }) })).resolves.toHaveProperty('status', 401);
    await expect(duplicateDestination(request, { params: Promise.resolve({ id: ID }) })).resolves.toHaveProperty('status', 401);
    await expect(duplicatePage(request)).resolves.toHaveProperty('status', 401);
  });

  it('creates an unpublished tour copy and preserves the source', async () => {
    const source = {
      _id: ID,
      tenantId: 'brand-a',
      title: 'Test Tour',
      slug: 'test-tour',
      destination: ID,
      category: [ID],
      bookingOptions: [],
      isPublished: true,
    };
    mockTourFindById.mockReturnValue(lean(source));
    mockTourCreate.mockImplementation(async (draft) => draft);
    const response = await duplicateTour(request, { params: Promise.resolve({ id: ID }) });
    const body = await response.json() as any;
    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({ title: 'Test Tour (Copy)', slug: 'test-tour-copy', isPublished: false });
    expect(source.isPublished).toBe(true);
  });

  it('rejects a cross-tenant tour copy', async () => {
    mockTourFindById.mockReturnValue(lean({ tenantId: 'brand-b', title: 'Test', slug: 'test', destination: ID, category: [ID] }));
    mockCanAccessTenant.mockReturnValue(false);
    await expect(duplicateTour(request, { params: Promise.resolve({ id: ID }) })).resolves.toHaveProperty('status', 403);
    expect(mockTourCreate).not.toHaveBeenCalled();
  });

  it('creates an unpublished destination copy', async () => {
    mockDestinationFindById.mockReturnValue(lean({ tenantId: 'brand-a', name: 'Test Place', slug: 'test-place', description: 'Safe' }));
    mockDestinationCreate.mockImplementation(async (draft) => ({ _id: ID, ...draft }));
    const response = await duplicateDestination(request, { params: Promise.resolve({ id: ID }) });
    const body = await response.json() as any;
    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({ name: 'Test Place (Copy)', slug: 'test-place-copy', isPublished: false });
  });

  it('creates an unpublished attraction-page copy', async () => {
    request.json.mockResolvedValue({ kind: 'attraction', id: ID });
    mockPageFindOne.mockReturnValue(lean({ tenantId: 'brand-a', title: 'Test Page', slug: 'test-page', pageType: 'attraction' }));
    mockPageCreate.mockImplementation(async (draft) => draft);
    const response = await duplicatePage(request);
    const body = await response.json() as any;
    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({ title: 'Test Page (Copy)', slug: 'test-page-copy', isPublished: false });
  });
});
