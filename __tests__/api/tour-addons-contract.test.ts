export {};

const mockTourFindOne = jest.fn();
const mockLean = jest.fn();

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
  buildStrictTenantQuery: jest.fn((filter) => filter),
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

  it('exposes an explicit pricing method for every generated fallback add-on', async () => {
    mockLean.mockResolvedValue({ _id: 'tour-1', addOns: [] });

    const { GET } = await import('@/app/api/tours/[tourId]/addons/route');
    const response = await GET({} as never, { params: Promise.resolve({ tourId: 'tour-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(4);
    expect(body.every((addOn: { pricingMethod?: string }) =>
      addOn.pricingMethod === 'per_unit' || addOn.pricingMethod === 'per_person',
    )).toBe(true);
    expect(body.find((addOn: { id: string }) => addOn.id === 'refreshment-upgrade-fallback'))
      .toMatchObject({ perGuest: true, pricingMethod: 'per_person' });
  });
});
