export {};

const mockGetTenantFromRequest = jest.fn();
const mockBuildStrictTenantQuery = jest.fn(
  (filter: Record<string, unknown>, tenantId: string) => ({
    ...filter,
    $or: [{ tenantId }, { tenantIds: tenantId }],
  }),
);
const mockDbConnect = jest.fn();
const mockCategoryFindOne = jest.fn();
const mockCategoryFind = jest.fn();
const mockTourFind = jest.fn();
const mockTourCountDocuments = jest.fn();
const mockReviewFind = jest.fn();
const mockReviewAggregate = jest.fn();

function createQueryChain(result: unknown[] = []) {
  const chain: Record<string, jest.Mock> = {};
  for (const method of ['populate', 'sort', 'limit', 'select']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.lean = jest.fn().mockResolvedValue(result);
  return chain;
}

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private data: unknown;
    constructor(data: unknown, init?: { status?: number }) {
      this.data = data;
      this.status = init?.status ?? 200;
    }
    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }
    async json() { return this.data; }
  }
  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => (...args: unknown[]) => mockDbConnect(...args));
jest.mock('@/lib/tenant', () => ({
  getTenantFromRequest: () => mockGetTenantFromRequest(),
  buildStrictTenantQuery: (...args: [Record<string, unknown>, string]) =>
    mockBuildStrictTenantQuery(...args),
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockCategoryFindOne(...args),
    find: (...args: unknown[]) => mockCategoryFind(...args),
  },
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    find: (...args: unknown[]) => mockTourFind(...args),
    countDocuments: (...args: unknown[]) => mockTourCountDocuments(...args),
  },
}));
jest.mock('@/lib/models/Review', () => ({
  __esModule: true,
  default: {
    find: (...args: unknown[]) => mockReviewFind(...args),
    aggregate: (...args: unknown[]) => mockReviewAggregate(...args),
  },
}));
jest.mock('@/lib/models/Destination', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: {} }));

describe('interest detail public tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTenantFromRequest.mockResolvedValue('trusted-brand');
    mockDbConnect.mockResolvedValue(undefined);
    mockCategoryFind.mockImplementation(() => createQueryChain());
    mockTourFind.mockImplementation(() => createQueryChain());
    mockTourCountDocuments.mockResolvedValue(0);
    mockReviewFind.mockImplementation(() => createQueryChain());
    mockReviewAggregate.mockResolvedValue([]);
  });

  it('resolves duplicate category slugs only inside the trusted tenant and scopes tours/reviews', async () => {
    mockCategoryFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'category-own', slug: 'diving', name: 'Diving' }),
    });
    const tourChain = createQueryChain([
      { _id: 'tour-own', title: 'Reef dive', image: '/reef.jpg', rating: 5 },
    ]);
    mockTourFind.mockReturnValue(tourChain);
    mockTourCountDocuments.mockResolvedValue(1);

    const url = new URL('https://trusted.example/api/interests/diving?tenantId=attacker');
    const request = {
      url: url.toString(),
      nextUrl: url,
      headers: new Headers({ 'x-tenant-id': 'attacker-header' }),
    };
    const { GET } = await import('@/app/api/interests/[slug]/route');
    const response = await GET(request as never, { params: Promise.resolve({ slug: 'diving' }) });

    expect(response.status).toBe(200);
    expect(mockDbConnect).toHaveBeenCalledWith('trusted-brand');
    const categoryQuery = mockCategoryFindOne.mock.calls[0][0];
    expect(categoryQuery.$and[0]).toEqual({
      isPublished: true,
      archivedAt: null,
      $or: [{ tenantId: 'trusted-brand' }, { tenantIds: 'trusted-brand' }],
    });
    expect(categoryQuery.$and[1].$or[0]).toEqual({ slug: 'diving' });

    const expectedTourVisibility = {
      isPublished: true,
      archivedAt: null,
      $or: [{ tenantId: 'trusted-brand' }, { tenantIds: 'trusted-brand' }],
    };
    expect(mockTourFind).toHaveBeenCalledWith({
      $and: [expectedTourVisibility, { category: { $in: ['category-own'] } }],
    });
    expect(mockTourCountDocuments).toHaveBeenCalledWith({
      $and: [expectedTourVisibility, { category: { $in: ['category-own'] } }],
    });
    expect(mockReviewFind).toHaveBeenCalledWith({
      tenantId: 'trusted-brand',
      tour: { $in: ['tour-own'] },
    });
    expect(mockReviewAggregate).toHaveBeenCalledWith([
      { $match: { tenantId: 'trusted-brand', tour: { $in: ['tour-own'] } } },
      expect.objectContaining({ $group: expect.any(Object) }),
    ]);
    expect(JSON.stringify([
      ...mockCategoryFindOne.mock.calls,
      ...mockTourFind.mock.calls,
      ...mockTourCountDocuments.mock.calls,
      ...mockReviewFind.mock.calls,
      ...mockReviewAggregate.mock.calls,
    ])).not.toContain('attacker');

    const population = tourChain.populate.mock.calls.map((call) => call[0]);
    expect(population).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: 'destination',
        match: expect.objectContaining({
          isPublished: true,
          $or: [{ tenantId: 'trusted-brand' }, { tenantIds: 'trusted-brand' }],
        }),
      }),
      expect.objectContaining({
        path: 'category',
        match: expectedTourVisibility,
      }),
    ]));
  });

  it('keeps the keyword fallback inside the same published, non-archived tenant scope', async () => {
    mockCategoryFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    const url = new URL('https://trusted.example/api/interests/desert-safari?tenantId=attacker');
    const { GET } = await import('@/app/api/interests/[slug]/route');
    const response = await GET(
      { url: url.toString(), nextUrl: url, headers: new Headers() } as never,
      { params: Promise.resolve({ slug: 'desert-safari' }) },
    );

    expect(response.status).toBe(200);
    const fallbackQuery = mockTourFind.mock.calls[0][0];
    expect(fallbackQuery.$and[0]).toEqual({
      isPublished: true,
      archivedAt: null,
      $or: [{ tenantId: 'trusted-brand' }, { tenantIds: 'trusted-brand' }],
    });
    expect(fallbackQuery.$and[1].$or).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: expect.objectContaining({ $options: 'i' }) }),
      expect.objectContaining({ tags: expect.any(Object) }),
    ]));
  });
});
