// A tour's main image is required. The admin create and update routes refuse a
// body that sets it blank or to the never-existing placeholder path, so a
// saved tour can never end up with no photo. A partial update that leaves the
// image alone (a booking cutoff, a relationship sync) still saves.
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

jest.mock('mongoose', () => {
  function MockObjectId(this: { value?: string }, value?: string) {
    this.value = value;
  }
  MockObjectId.isValid = jest.fn().mockReturnValue(true);
  return {
    __esModule: true,
    default: { Types: { ObjectId: MockObjectId } },
  };
});
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
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

import { PUT } from '@/app/api/admin/tours/[id]/route';
import { POST } from '@/app/api/admin/tours/route';
import { MAIN_IMAGE_REQUIRED_MESSAGE, MISSING_MAIN_IMAGE_PATH } from '@/lib/admin/tourMainImage';

const authModule = jest.requireMock('@/lib/auth/adminAuth') as {
  requireAdminAuth: jest.Mock;
  canAccessTenant: jest.Mock;
  tenantForbiddenResponse: jest.Mock;
};
const Tour = jest.requireMock('@/lib/models/Tour').default as {
  findById: jest.Mock;
  findOneAndUpdate: jest.Mock;
  create: jest.Mock;
};
const { NextResponse } = jest.requireMock('next/server');

const id = '507f1f77bcf86cd799439011';
const params = { params: Promise.resolve({ id }) };
const realImage = 'https://res.cloudinary.com/demo/image/upload/v1/tours/kom-ombo.webp';
const currentTour = {
  _id: id,
  tenantId: 'brand-a',
  tenantIds: ['brand-a'],
  image: realImage,
  category: null,
  destination: null,
  availability: { slots: [{ time: '10:00', capacity: 10 }] },
};

const tourBody = (image?: unknown) => ({
  title: 'Edfu and Kom Ombo day trip',
  description: 'Two temples on the Nile',
  duration: '12 hours',
  discountPrice: 50,
  destination: id,
  category: [id],
  difficulty: 'Mittel',
  ...(image === undefined ? {} : { image }),
});

const putRequest = (body: unknown) => ({
  url: `https://dashboard.example/api/admin/tours/${id}?tenantId=brand-a`,
  json: jest.fn().mockResolvedValue(body),
}) as never;

const postRequest = (body: unknown) => ({
  url: 'https://dashboard.example/api/admin/tours?tenantId=brand-a',
  json: jest.fn().mockResolvedValue(body),
}) as never;

beforeEach(() => {
  jest.clearAllMocks();
  authModule.requireAdminAuth.mockResolvedValue({
    userId: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin', tenantIds: ['brand-a'],
  });
  authModule.canAccessTenant.mockImplementation((_auth: unknown, tenantId: string) => tenantId === 'brand-a');
  authModule.tenantForbiddenResponse.mockImplementation(() => NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
  Tour.findById.mockResolvedValue(currentTour);
  Tour.findOneAndUpdate.mockImplementation((_filter: unknown, update: { $set: Record<string, unknown> }) =>
    Promise.resolve({ ...currentTour, ...update.$set, isPublished: false }));
});

describe('admin tour update requires a real main image', () => {
  it.each(['', '   ', null, MISSING_MAIN_IMAGE_PATH])('refuses to save main image %p', async image => {
    const response = await PUT(putRequest(tourBody(image)), params);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ success: false, error: MAIN_IMAGE_REQUIRED_MESSAGE });
    expect(Tour.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('saves a real main image and normalizes the stored difficulty', async () => {
    const response = await PUT(putRequest(tourBody(realImage)), params);

    expect(response.status).toBe(200);
    const [, update] = Tour.findOneAndUpdate.mock.calls[0];
    expect(update.$set.image).toBe(realImage);
    expect(update.$set.difficulty).toBe('Moderate');
  });

  it('leaves a partial update that does not touch the image alone', async () => {
    const response = await PUT(putRequest({ bookingCutoffMinutes: 120 }), params);

    expect(response.status).toBe(200);
    const [, update] = Tour.findOneAndUpdate.mock.calls[0];
    expect(update.$set).not.toHaveProperty('image');
  });
});

describe('admin tour create requires a real main image', () => {
  beforeEach(() => {
    Tour.create.mockImplementation((body: Record<string, unknown>) => Promise.resolve({ ...body, _id: { toString: () => id } }));
    Tour.findById.mockReturnValue({ populate: () => ({ populate: () => ({ populate: () => ({ populate: () => ({ populate: () => ({ lean: () => Promise.resolve(null) }) }) }) }) }) });
  });

  it.each(['', MISSING_MAIN_IMAGE_PATH])('refuses to create a tour with main image %p', async image => {
    const response = await POST(postRequest({ ...tourBody(image), tenantId: 'brand-a' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ success: false, error: MAIN_IMAGE_REQUIRED_MESSAGE });
    expect(Tour.create).not.toHaveBeenCalled();
  });

  it('creates a tour with a real main image', async () => {
    const response = await POST(postRequest({ ...tourBody(realImage), tenantId: 'brand-a' }));

    expect(response.status).toBe(201);
    expect(Tour.create.mock.calls[0][0].image).toBe(realImage);
  });
});
