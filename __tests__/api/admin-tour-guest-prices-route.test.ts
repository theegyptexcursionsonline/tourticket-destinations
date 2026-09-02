// Guest prices (child/infant per tour, per option, per departure) must
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
      { time: '14:00', capacity: 10, guestPrices: { child: 40, infant: -3 } },
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

describe('admin tour update keeps guest prices', () => {
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

  it('stores the tour set, the option set and cleaned per-slot overrides, tenant-scoped', async () => {
    const response = await PUT(putRequest(fullBody()), params);

    expect(response.status).toBe(200);
    const [filter, update] = Tour.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ _id: id, $or: [{ tenantId: 'brand-a' }, { tenantIds: 'brand-a' }] });
    const set = update.$set;
    // Adult mirrors the base price the set was saved with — never the submitted value.
    expect(set.revenueGuestPrices).toEqual({ adult: 100, child: 60, infant: 10 });
    expect(set.availability.slots).toEqual([
      { time: '10:00', capacity: 10 },
      { time: '14:00', capacity: 10, guestPrices: { child: 40 } },
    ]);
    const [priv, plain] = set.bookingOptions;
    expect(priv.duration).toBe('6 hours');
    expect(priv.guestPrices).toEqual({ adult: 150, child: 90, infant: 20 });
    expect(priv.timeSlots).toEqual([
      { time: '10:00', capacity: 10 },
      { time: '14:00', capacity: 10, price: 200, guestPrices: { child: 75 } },
    ]);
    // Blank pair → null so a previously stored set is unset by $set.
    expect(plain.guestPrices).toBeNull();
  });

  it('unsets a partial or negative pair instead of storing half a set', async () => {
    const body = fullBody();
    body.revenueGuestPrices = { adult: 1, child: '60', infant: '' };
    body.bookingOptions[0].guestPrices = { child: '-5', infant: '20' };

    const response = await PUT(putRequest(body), params);

    expect(response.status).toBe(200);
    const set = Tour.findOneAndUpdate.mock.calls[0][1].$set;
    expect(set.revenueGuestPrices).toBeNull();
    expect(set.bookingOptions[0].guestPrices).toBeNull();
  });

  it('leaves the stored tour set alone when the request does not mention it', async () => {
    const response = await PUT(putRequest({ isFeatured: true }), params);

    expect(response.status).toBe(200);
    const set = Tour.findOneAndUpdate.mock.calls[0][1].$set;
    expect('revenueGuestPrices' in set).toBe(false);
    expect('availability' in set).toBe(false);
  });

  it('refuses an option time slot that is not in the tour availability', async () => {
    const body = fullBody();
    body.bookingOptions[0].timeSlots.push({ time: '16:00', capacity: 5 });

    const response = await PUT(putRequest(body), params);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/not in tour availability/);
    expect(Tour.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('checks option slots against the STORED availability when the request omits it', async () => {
    const body = fullBody();
    delete (body as Partial<typeof body>).availability;
    body.bookingOptions[0].timeSlots = [{ time: '09:00', capacity: 5 }];

    const response = await PUT(putRequest(body), params);

    expect(response.status).toBe(400);
    expect(Tour.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('admin tour create keeps guest prices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authModule.requireAdminAuth.mockResolvedValue({
      userId: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin', tenantIds: ['brand-a'],
    });
    authModule.canAccessTenant.mockImplementation((_auth: unknown, tenantId: string) => tenantId === 'brand-a');
    authModule.tenantForbiddenResponse.mockImplementation(() => NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    Tour.create.mockImplementation((body: Record<string, unknown>) => Promise.resolve({ ...body, _id: { toString: () => id } }));
    Tour.findById.mockReturnValue({ populate: () => ({ populate: () => ({ populate: () => ({ populate: () => ({ populate: () => ({ lean: () => Promise.resolve(null) }) }) }) }) }) });
  });

  it('passes the tour set, option sets and per-slot overrides through to create', async () => {
    const body = { ...fullBody(), tenantId: 'brand-a' };
    const response = await POST({
      url: 'https://dashboard.example/api/admin/tours?tenantId=brand-a',
      json: jest.fn().mockResolvedValue(body),
    } as never);

    expect(response.status).toBe(201);
    const created = Tour.create.mock.calls[0][0];
    expect(created.tenantId).toBe('brand-a');
    expect(created.revenueGuestPrices).toEqual({ adult: 100, child: 60, infant: 10 });
    expect(created.bookingOptions[0].guestPrices).toEqual({ adult: 150, child: 90, infant: 20 });
    expect(created.bookingOptions[0].timeSlots[1].guestPrices).toEqual({ child: 75 });
    expect(created.bookingOptions[1].guestPrices).toBeNull();
    expect(created.availability.slots[1].guestPrices).toEqual({ child: 40 });
  });

  it('refuses to create an option that sells a departure the tour does not have', async () => {
    const body = { ...fullBody(), tenantId: 'brand-a' };
    body.bookingOptions[1].timeSlots = [{ time: '23:00', capacity: 2 }];

    const response = await POST({
      url: 'https://dashboard.example/api/admin/tours?tenantId=brand-a',
      json: jest.fn().mockResolvedValue(body),
    } as never);

    expect(response.status).toBe(400);
    expect(Tour.create).not.toHaveBeenCalled();
  });
});
