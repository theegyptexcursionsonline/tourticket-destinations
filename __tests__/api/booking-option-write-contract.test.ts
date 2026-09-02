export {};

const mockRequireAdminAuth = jest.fn();
const mockCanAccessTenant = jest.fn();
const mockFindById = jest.fn();
const mockSave = jest.fn();
const mockPreservePricingKeys = jest.fn();
const mockRefreshSummaries = jest.fn();
const mockSyncSearch = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private body: unknown;
    constructor(body: unknown, init: { status?: number } = {}) {
      this.body = body;
      this.status = init.status ?? 200;
    }
    static json(body: unknown, init?: { status?: number }) { return new MockNextResponse(body, init); }
    json() { return Promise.resolve(this.body); }
  }
  return { NextRequest: class {}, NextResponse: MockNextResponse };
});
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
  canAccessTenant: (...args: unknown[]) => mockCanAccessTenant(...args),
  tenantForbiddenResponse: () => {
    const { NextResponse } = jest.requireMock('next/server');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  },
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findById: (...args: unknown[]) => mockFindById(...args) },
}));
jest.mock('@/lib/revenue/pricingKeys', () => ({
  preserveBookingOptionPricingKeys: (...args: unknown[]) => mockPreservePricingKeys(...args),
}));
jest.mock('@/lib/revenue/pricingSummary', () => ({
  refreshTourPricingSummaries: (...args: unknown[]) => mockRefreshSummaries(...args),
  syncTourPricingSearchIndex: (...args: unknown[]) => mockSyncSearch(...args),
}));

const makeTour = () => ({
  _id: '507f1f77bcf86cd799439011',
  tenantId: 'mountain-tours',
  tenantIds: ['mountain-tours', 'partner-brand'],
  isPublished: true,
  availability: { slots: [{ time: '06:30' }, { time: '08:00' }] },
  bookingOptions: [{
    id: 'option-existing',
    pricingKey: 'premium-sunrise',
    label: 'Premium sunrise',
    type: 'Per Person',
    price: 100,
    guestPrices: { adult: 100, child: 50, infant: 0 },
    timeSlots: [{ time: '06:30' }],
  }],
  save: mockSave,
});

const request = (body: Record<string, unknown>) => ({ json: async () => body }) as never;

describe('PUT /api/tours/[tourId]/booking-options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ userId: 'admin-1', tenantIds: ['mountain-tours'] });
    mockCanAccessTenant.mockImplementation((_auth: unknown, tenantId: string) => tenantId === 'mountain-tours');
    mockFindById.mockResolvedValue(makeTour());
    mockSave.mockResolvedValue(undefined);
    mockPreservePricingKeys.mockImplementation((_tourId: string, existing: Array<Record<string, unknown>>, incoming: Array<Record<string, unknown>>) => [
      { ...incoming[0], pricingKey: existing[0]?.pricingKey || 'generated-key' },
    ]);
    mockRefreshSummaries.mockResolvedValue([]);
    mockSyncSearch.mockResolvedValue(true);
  });

  it('rejects partial child/infant pricing and leaves the tour untouched', async () => {
    const { PUT } = await import('@/app/api/tours/[tourId]/booking-options/route');
    const response = await PUT(
      request({ index: 0, option: { id: 'option-existing', price: 110, guestPrices: { child: 55 } } }),
      { params: Promise.resolve({ tourId: '507f1f77bcf86cd799439011' }) },
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/child and infant/i) });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('rejects stale positional edits when the immutable option id no longer matches', async () => {
    const { PUT } = await import('@/app/api/tours/[tourId]/booking-options/route');
    const response = await PUT(
      request({ index: 0, option: { id: 'different-option', price: 110, guestPrices: { child: 55, infant: 0 } } }),
      { params: Promise.resolve({ tourId: '507f1f77bcf86cd799439011' }) },
    );
    expect(response.status).toBe(409);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('rejects a time slot that is not configured on the tour', async () => {
    const { PUT } = await import('@/app/api/tours/[tourId]/booking-options/route');
    const response = await PUT(
      request({ index: 0, option: { id: 'option-existing', price: 110, guestPrices: { child: 55, infant: 0 }, timeSlots: [{ time: '23:59' }] } }),
      { params: Promise.resolve({ tourId: '507f1f77bcf86cd799439011' }) },
    );
    expect(response.status).toBe(400);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('preserves the server-owned pricing key and refreshes every selling projection after save', async () => {
    const tour = makeTour();
    mockFindById.mockResolvedValue(tour);
    const { PUT } = await import('@/app/api/tours/[tourId]/booking-options/route');
    const response = await PUT(
      request({
        index: 0,
        option: {
          id: 'option-existing',
          pricingKey: 'attacker-controlled-key',
          label: 'Premium sunrise',
          type: 'Per Person',
          price: 110,
          guestPrices: { child: 55, infant: 5 },
          timeSlots: [{ time: '06:30' }],
        },
      }),
      { params: Promise.resolve({ tourId: '507f1f77bcf86cd799439011' }) },
    );

    expect(response.status).toBe(200);
    expect(tour.bookingOptions[0]).toMatchObject({
      id: 'option-existing',
      pricingKey: 'premium-sunrise',
      guestPrices: { adult: 110, child: 55, infant: 5 },
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockRefreshSummaries).toHaveBeenCalledWith(tour._id, ['mountain-tours', 'partner-brand']);
    expect(mockSyncSearch).toHaveBeenCalledWith(tour._id, 'mountain-tours');
    expect(mockSyncSearch).toHaveBeenCalledWith(tour._id, 'partner-brand');
  });
});
