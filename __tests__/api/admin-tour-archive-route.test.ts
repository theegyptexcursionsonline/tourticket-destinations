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

jest.mock('mongoose', () => ({
  __esModule: true,
  default: { Types: { ObjectId: { isValid: jest.fn().mockReturnValue(true) } } },
}));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));
jest.mock('@/lib/models/Destination', () => ({ __esModule: true, default: { findById: jest.fn() } }));
jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: { find: jest.fn(), findById: jest.fn() } }));
jest.mock('@/lib/algolia', () => ({
  syncTourToAlgolia: jest.fn().mockResolvedValue(undefined),
  deleteTourFromAlgolia: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: jest.fn(),
  canAccessTenant: jest.fn(),
  tenantForbiddenResponse: jest.fn(),
}));
jest.mock('@/lib/admin/auditStamp', () => ({
  auditStamp: jest.fn(() => ({ id: 'admin-1', name: 'Admin', email: 'admin@example.com' })),
}));
jest.mock('@/lib/translation/translateService', () => ({ translateTourInBackground: jest.fn() }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateTourStorefront: jest.fn() }));
jest.mock('@/lib/revenue/pricingSummary', () => ({
  refreshTourPricingSummaries: jest.fn().mockResolvedValue([]),
  syncTourPricingSearchIndex: jest.fn().mockResolvedValue(true),
}));

import { DELETE, PUT } from '@/app/api/admin/tours/[id]/route';

const authModule = jest.requireMock('@/lib/auth/adminAuth') as {
  requireAdminAuth: jest.Mock;
  canAccessTenant: jest.Mock;
  tenantForbiddenResponse: jest.Mock;
};
const Tour = jest.requireMock('@/lib/models/Tour').default as {
  findById: jest.Mock;
  findOneAndUpdate: jest.Mock;
};
const { NextResponse } = jest.requireMock('next/server');

const id = '507f1f77bcf86cd799439011';
const params = { params: Promise.resolve({ id }) };
const currentTour = {
  _id: id,
  tenantId: 'primary-brand',
  tenantIds: ['secondary-brand'],
  category: null,
  destination: null,
};

describe('admin tour archive and restore behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authModule.requireAdminAuth.mockResolvedValue({
      userId: 'admin-1',
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
      tenantIds: ['secondary-brand'],
    });
    authModule.canAccessTenant.mockImplementation((_auth: unknown, tenantId: string) => tenantId === 'secondary-brand');
    authModule.tenantForbiddenResponse.mockImplementation(() => NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    Tour.findById.mockResolvedValue(currentTour);
  });

  it('short-circuits when the principal lacks manageTours', async () => {
    authModule.requireAdminAuth.mockResolvedValueOnce(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));

    const response = await DELETE({ url: 'https://dashboard.example/api/admin/tours/x' } as never, params);

    expect(response.status).toBe(403);
    expect(Tour.findById).not.toHaveBeenCalled();
    expect(Tour.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a tenant the authenticated admin cannot access', async () => {
    authModule.canAccessTenant.mockReturnValue(false);

    const response = await DELETE({ url: `https://dashboard.example/api/admin/tours/${id}?tenantId=other-brand` } as never, params);

    expect(response.status).toBe(403);
    expect(Tour.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('archives a shared tour through its secondary brand without deleting it', async () => {
    const archivedTour = { _id: { toString: () => id }, archivedAt: new Date('2026-08-03T00:00:00.000Z') };
    Tour.findOneAndUpdate.mockResolvedValueOnce(archivedTour);

    const response = await DELETE({
      url: `https://dashboard.example/api/admin/tours/${id}?tenantId=secondary-brand`,
    } as never, params);

    expect(response.status).toBe(200);
    expect(Tour.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: id,
        $or: [
          { tenantId: 'secondary-brand' },
          { tenantIds: 'secondary-brand' },
        ],
      },
      {
        $set: expect.objectContaining({
          isPublished: false,
          archivedAt: expect.any(Date),
          archivedBy: 'admin-1',
        }),
      },
      { new: true },
    );
  });

  it('restores to draft without fabricating availability', async () => {
    Tour.findOneAndUpdate.mockResolvedValueOnce({ ...currentTour, isPublished: false });
    const request = {
      url: `https://dashboard.example/api/admin/tours/${id}?tenantId=secondary-brand`,
      json: jest.fn().mockResolvedValue({ restoreFromArchive: true }),
    } as never;

    const response = await PUT(request, params);

    expect(response.status).toBe(200);
    expect(Tour.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: id,
        $or: [
          { tenantId: 'secondary-brand' },
          { tenantIds: 'secondary-brand' },
        ],
      },
      {
        $set: expect.objectContaining({
          archivedAt: null,
          archivedBy: null,
          updatedBy: expect.objectContaining({ id: 'admin-1' }),
        }),
      },
      expect.objectContaining({ new: true, runValidators: true }),
    );
    const update = Tour.findOneAndUpdate.mock.calls[0][1].$set;
    expect(update).not.toHaveProperty('availability');
    expect(update).not.toHaveProperty('restoreFromArchive');
  });
});
