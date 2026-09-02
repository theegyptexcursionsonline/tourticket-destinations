export {};

const mockTourFindOne = jest.fn();
const mockLean = jest.fn();
const mockBuildStrictTenantQuery = jest.fn(
  (filter: Record<string, unknown>, tenantId: string) => ({ ...filter, tenantScope: tenantId }),
);

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
  return { NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/tenant', () => ({
  getTenantFromRequest: jest.fn().mockResolvedValue('hurghada-speedboat'),
  buildStrictTenantQuery: (...args: [Record<string, unknown>, string]) => mockBuildStrictTenantQuery(...args),
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: mockTourFindOne },
}));

describe('public tour add-ons pricing contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTourFindOne.mockReturnValue({ lean: mockLean });
  });

  it('returns an empty collection when the operator authored no add-ons', async () => {
    mockLean.mockResolvedValue({ _id: 'tour-1', addOns: [] });

    const { GET } = await import('@/app/api/tours/[tourId]/addons/route');
    const response = await GET({} as never, { params: Promise.resolve({ tourId: 'tour-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it('preserves a legitimate zero price and the authored group without fabricating discounts', async () => {
    mockLean.mockResolvedValue({
      _id: 'tour-1',
      addOns: [
        {
          _id: 'addon-free',
          name: 'Accessibility transfer',
          description: 'Adapted vehicle transfer',
          price: 0,
          category: 'Transport',
          pricingMethod: 'per_unit',
          groupKey: 'transfers',
          groupTitle: 'Transfers',
          bookingOptionKeys: ['private-tour'],
        },
        { _id: 'invalid', name: '', price: 99 },
      ],
    });

    const { GET } = await import('@/app/api/tours/[tourId]/addons/route');
    const response = await GET({} as never, { params: Promise.resolve({ tourId: 'tour-1' }) });
    const body = await response.json();

    expect(body).toEqual([
      expect.objectContaining({
        id: 'addon-free',
        title: 'Accessibility transfer',
        price: 0,
        groupKey: 'transfers',
        groupTitle: 'Transfers',
        bookingOptionKeys: ['private-tour'],
        perGuest: false,
        pricingMethod: 'per_unit',
      }),
    ]);
    expect(body[0]).not.toHaveProperty('originalPrice');
    expect(body[0]).not.toHaveProperty('savings');
    expect(mockBuildStrictTenantQuery).toHaveBeenCalledWith(
      { _id: 'tour-1', isPublished: true, archivedAt: null },
      'hurghada-speedboat',
    );
  });
});
