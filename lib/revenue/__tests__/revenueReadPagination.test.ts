export {};

const mockAuthenticate = jest.fn();
const mockDbConnect = jest.fn();
const mockTourFind = jest.fn();
const mockAvailabilityFind = jest.fn();
const mockBookingFind = jest.fn();
const mockStopSaleFind = jest.fn();
let nextTourRows: Array<Record<string, unknown>> = [];

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private data: unknown;
    constructor(data: unknown, init?: { status?: number }) {
      this.data = data;
      this.status = init?.status ?? 200;
    }
    static json(data: unknown, init?: { status?: number }) { return new MockNextResponse(data, init); }
    json() { return Promise.resolve(this.data); }
  }
  return { NextRequest: class {}, NextResponse: MockNextResponse };
});
jest.mock('mongoose', () => ({
  __esModule: true,
  default: { Types: { ObjectId: { isValid: (value: unknown) => /^[a-f0-9]{24}$/i.test(String(value || '')) } } },
}));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: (...args: unknown[]) => mockDbConnect(...args) }));
jest.mock('@/lib/revenue/machineResponse', () => ({
  authenticateRevenueRequest: (...args: unknown[]) => mockAuthenticate(...args),
  revenueError: (status: number, code: string, message: string) => {
    const { NextResponse } = jest.requireMock('next/server');
    return NextResponse.json({ error: { code, message } }, { status });
  },
}));
jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantId }),
  getTenantConfigCached: jest.fn().mockResolvedValue({ isActive: true, payments: { currency: 'USD' } }),
}));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { find: (...args: unknown[]) => mockTourFind(...args) } }));
jest.mock('@/lib/models/Availability', () => ({ __esModule: true, default: { find: (...args: unknown[]) => mockAvailabilityFind(...args) } }));
jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: { find: (...args: unknown[]) => mockBookingFind(...args) } }));
jest.mock('@/lib/models/StopSale', () => ({ __esModule: true, default: { find: (...args: unknown[]) => mockStopSaleFind(...args) } }));
jest.mock('@/lib/revenue/pricingVersion', () => ({ pricingCatalogueVersion: (tour: { _id: unknown }) => `pv-${tour._id}` }));
jest.mock('@/lib/revenue/pricingSummary', () => ({
  tenantPricingSummary: jest.fn(() => null),
  tenantPricingProjection: jest.fn(() => null),
  pricingProjectionStatus: jest.fn(() => ({ state: 'pending' })),
}));

import { encodeRevenueCursor } from '@/lib/revenue/pagination';

const ids = [
  '507f1f77bcf86cd799439011',
  '507f1f77bcf86cd799439012',
  '507f1f77bcf86cd799439013',
];

function request(path: string) {
  return { nextUrl: new URL(`https://mountain-tours.example${path}`) } as never;
}

function queryWithRows(rows: Array<Record<string, unknown>>) {
  return {
    select: jest.fn(() => ({
      sort: jest.fn(() => ({
        limit: jest.fn(() => ({ lean: jest.fn(async () => rows) })),
      })),
    })),
  };
}

const catalogueTours = [
  {
    _id: ids[0], title: 'Configured options', slug: 'configured-options', discountPrice: 100, discountPercent: 20,
    revenueGuestPrices: { adult: 100, child: 70, infant: 5 }, updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    bookingOptions: [
      { pricingKey: 'discounted-opt', label: 'Discounted', type: 'Per Person', price: 150, applyTourDiscount: true, guestPrices: { adult: 150, child: 70, infant: 5 } },
      { pricingKey: 'plain-opt', label: 'Plain', type: 'Per Person', price: 200, applyTourDiscount: false, guestPrices: { adult: 200, child: 100, infant: 10 } },
    ],
  },
  {
    _id: ids[1], title: 'Standard only', slug: 'standard-only', discountPrice: 150, discountPercent: 20,
    revenueGuestPrices: { adult: 150, child: 70, infant: 5 }, bookingOptions: [], updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  },
  {
    _id: ids[2], title: 'Tail tour', slug: 'tail-tour', discountPrice: 80,
    bookingOptions: [], updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  },
];

describe('RevenuePilot catalog cursor pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ response: null, tenantId: 'mountain-tours' });
    mockDbConnect.mockResolvedValue(undefined);
    mockTourFind.mockImplementation(() => queryWithRows(nextTourRows));
  });

  it('reaches the tail without overlap and exports only actual option products', async () => {
    const { GET } = await import('@/app/api/v1/revenue/catalog/route');
    nextTourRows = catalogueTours;
    const firstResponse = await GET(request('/api/v1/revenue/catalog?limit=2'));
    const first = await firstResponse.json() as any;
    expect(first.tours.map((tour: { id: string }) => tour.id)).toEqual(ids.slice(0, 2));
    expect(first.nextCursor).toEqual(expect.any(String));
    expect(first.tours[0].options.map((option: { key: string }) => option.key)).toEqual(['discounted-opt', 'plain-opt']);
    expect(first.tours[0].options[0]).toMatchObject({ guestPrices: { adult: 120, child: 56, infant: 4 }, guestPricesVerified: true });
    expect(first.tours[0].options[1]).toMatchObject({ guestPrices: { adult: 200, child: 100, infant: 10 }, guestPricesVerified: true });
    expect(first.tours[1].options).toEqual([expect.objectContaining({
      key: 'standard',
      guestPrices: { adult: 120, child: 56, infant: 4 },
      guestPricesVerified: true,
    })]);

    nextTourRows = [catalogueTours[2]];
    const secondResponse = await GET(request(`/api/v1/revenue/catalog?limit=2&cursor=${first.nextCursor}`));
    const second = await secondResponse.json() as any;
    expect(second.tours.map((tour: { id: string }) => tour.id)).toEqual([ids[2]]);
    expect(second.nextCursor).toBeNull();
    expect(new Set([...first.tours, ...second.tours].map((tour: { id: string }) => tour.id))).toEqual(new Set(ids));
    expect(mockTourFind).toHaveBeenLastCalledWith(expect.objectContaining({
      tenantId: 'mountain-tours',
      _id: { $gt: ids[1] },
    }));
  });

  it('rejects a cross-tenant cursor before a catalogue query', async () => {
    const { GET } = await import('@/app/api/v1/revenue/catalog/route');
    const cursor = encodeRevenueCursor({ resource: 'catalog', tenantId: 'other-tenant', afterId: ids[0] });
    const response = await GET(request(`/api/v1/revenue/catalog?cursor=${cursor}`));
    expect(response.status).toBe(422);
    expect(mockTourFind).not.toHaveBeenCalled();
  });
});

describe('RevenuePilot departure cursor pagination', () => {
  const date = '2099-09-20';
  const scheduledTours = ids.map((_id) => ({
    _id,
    availability: { type: 'daily', availableDays: [0, 1, 2, 3, 4, 5, 6], slots: [{ time: '10:00', capacity: 10 }] },
    bookingOptions: [],
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ response: null, tenantId: 'mountain-tours' });
    mockDbConnect.mockResolvedValue(undefined);
    mockTourFind.mockImplementation(() => queryWithRows(nextTourRows));
    mockAvailabilityFind.mockReturnValue({ lean: jest.fn(async () => []) });
    mockBookingFind.mockImplementation(() => ({ select: jest.fn(() => ({ lean: jest.fn(async () => [
      { tour: ids[0], date: new Date(`${date}T00:00:00.000Z`), time: '10:00', adultGuests: 1, updatedAt: new Date('2026-09-01T00:00:00.000Z') },
      { tour: ids[1], date: new Date(`${date}T00:00:00.000Z`), time: '10:00', adultGuests: 2, updatedAt: new Date('2026-09-01T00:00:00.000Z') },
    ]) })) }));
    mockStopSaleFind.mockImplementation(() => ({ select: jest.fn(() => ({ lean: jest.fn(async () => []) })) }));
  });

  it('bounds source tours in the database and reaches every generated departure exactly once', async () => {
    const { GET } = await import('@/app/api/v1/revenue/departures/route');
    nextTourRows = scheduledTours;
    const firstResponse = await GET(request(`/api/v1/revenue/departures?from=${date}&to=${date}&limit=2`));
    const first = await firstResponse.json() as any;
    expect(first.departures.map((row: { tourId: string }) => row.tourId)).toEqual(ids.slice(0, 2));
    expect(first.departures.map((row: { booked: number }) => row.booked)).toEqual([1, 2]);
    expect(first.nextCursor).toEqual(expect.any(String));
    expect(mockBookingFind).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'mountain-tours',
      tour: { $in: ids.slice(0, 2) },
      status: { $in: ['Pending', 'Confirmed', 'pending', 'confirmed'] },
    }));

    nextTourRows = [scheduledTours[2]];
    const secondResponse = await GET(request(`/api/v1/revenue/departures?from=${date}&to=${date}&limit=2&cursor=${first.nextCursor}`));
    const second = await secondResponse.json() as any;
    expect(second.departures.map((row: { tourId: string }) => row.tourId)).toEqual([ids[2]]);
    expect(second.nextCursor).toBeNull();
    expect(new Set([...first.departures, ...second.departures].map((row: { tourId: string }) => row.tourId))).toEqual(new Set(ids));
    expect(mockTourFind).toHaveBeenLastCalledWith(expect.objectContaining({ tenantId: 'mountain-tours', _id: { $gt: ids[1] } }));
  });

  it('rejects malformed cursors before reading tours or related records', async () => {
    const { GET } = await import('@/app/api/v1/revenue/departures/route');
    const response = await GET(request(`/api/v1/revenue/departures?from=${date}&to=${date}&cursor=not+a+cursor`));
    expect(response.status).toBe(422);
    expect(mockTourFind).not.toHaveBeenCalled();
    expect(mockAvailabilityFind).not.toHaveBeenCalled();
    expect(mockBookingFind).not.toHaveBeenCalled();
  });
});
