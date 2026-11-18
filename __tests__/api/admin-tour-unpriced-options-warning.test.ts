// Admin tour save: unpriced booking option warning.
// survive the admin save pipeline: a complete set is stored, a partial or
// negative set is refused or unset, per-slot overrides are cleaned, and an
// option cannot sell a departure the tour does not have. Tenant scoping on the
// update filter is unchanged.
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
const currentTour = {
  _id: id,
  tenantId: 'brand-a',
  tenantIds: ['brand-a'],
  category: null,
  destination: null,
  availability: { slots: [{ time: '10:00', capacity: 10 }, { time: '14:00', capacity: 10 }] },
};

const fullBody = () => ({
  title: 'Guest priced tour',
  description: 'A tour with child and infant prices',
  duration: '8 hours',
  discountPrice: 100,
  destination: id,
  category: [id],
  revenueGuestPrices: { adult: 1, child: '60', infant: '10' },
  availability: {
    type: 'daily',
    availableDays: [0, 1, 2, 3, 4, 5, 6],
    slots: [
      { time: '10:00', capacity: 10, guestPrices: { child: '', infant: '' } },
      { time: '14:00', capacity: 10, guestPrices: { child: 40, infant: '' } },
    ],
  },
  bookingOptions: [
    {
      id: 'opt-private',
      type: 'Per Person',
      label: 'Private',
      price: '150',
      duration: '6 hours',
      guestPrices: { child: '90', infant: '20' },
      timeSlots: [
        { time: '10:00', capacity: 10 },
        { time: '14:00', capacity: 10, price: 200, guestPrices: { child: 75, infant: '' } },
      ],
    },
    {
      id: 'opt-plain',
      type: 'Per Person',
      label: 'Plain',
      price: 80,
      guestPrices: { child: '', infant: '' },
      timeSlots: [{ time: '10:00', capacity: 10 }],
    },
  ],
});

const putRequest = (body: unknown) => ({
  url: `https://dashboard.example/api/admin/tours/${id}?tenantId=brand-a`,
  json: jest.fn().mockResolvedValue(body),
}) as never;


// Saving a tour whose option has no price anywhere still succeeds ("Price on
// request" options are kept on purpose); the response lists those options so
// the editor can warn staff, and the stored prices are exactly what was sent.
const unpricedLabel = 'Private experience';
const withUnpriced = () => {
  const body = fullBody();
  body.bookingOptions.push({
    id: 'opt-unpriced', type: 'Per Person', label: unpricedLabel, price: '0',
    guestPrices: { child: '', infant: '' }, timeSlots: [{ time: '10:00', capacity: 10 }],
  } as never);
  return body;
};

describe('admin tour save warns about unpriced options without blocking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authModule.requireAdminAuth.mockResolvedValue({
      userId: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin', tenantIds: ['brand-a'],
    });
    authModule.canAccessTenant.mockImplementation((_auth: unknown, tenantId: string) => tenantId === 'brand-a');
    authModule.tenantForbiddenResponse.mockImplementation(() => NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    Tour.findById.mockResolvedValue(currentTour);
    (Tour as unknown as Record<string, jest.Mock>).findOneAndUpdate.mockImplementation((_filter: unknown, update: { $set: Record<string, unknown> }) =>
      Promise.resolve({ ...currentTour, ...update.$set, isPublished: false }));
  });

  it('update saves and lists the unpriced option by name', async () => {
    const response = await PUT(putRequest(withUnpriced()), params);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.warnings).toEqual({ unpricedOptions: [unpricedLabel] });
    const [, update] = (Tour as unknown as Record<string, jest.Mock>).findOneAndUpdate.mock.calls[0];
    expect(update.$set.bookingOptions.map((option: { price: unknown }) => Number(option.price))).toEqual([150, 80, 0]);
  });

  it('update of a fully priced tour reports nothing', async () => {
    const response = await PUT(putRequest(fullBody()), params);
    expect(response.status).toBe(200);
    expect((await response.json()).warnings).toEqual({ unpricedOptions: [] });
  });

  it('create saves and lists the unpriced option', async () => {
    Tour.create.mockImplementation((body: Record<string, unknown>) => Promise.resolve({ ...body, _id: { toString: () => id } }));
    Tour.findById.mockReturnValue({ populate: () => ({ populate: () => ({ populate: () => ({ populate: () => ({ populate: () => ({ lean: () => Promise.resolve(null) }) }) }) }) }) });
    const response = await POST({
      url: 'https://dashboard.example/api/admin/tours?tenantId=brand-a',
      json: jest.fn().mockResolvedValue({ ...withUnpriced(), tenantId: 'brand-a' }),
    } as never);
    expect(response.status).toBe(201);
    expect((await response.json()).warnings).toEqual({ unpricedOptions: [unpricedLabel] });
  });
});
