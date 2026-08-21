export {};

const mockSearch = jest.fn();
const mockGetTenant = jest.fn();

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
    async json() { return this.data; }
  }
  return { NextResponse: MockNextResponse };
});

jest.mock('@/lib/algolia', () => ({
  ALGOLIA_INDEX_NAME: 'tours',
  algoliaClient: () => ({ search: mockSearch }),
}));
jest.mock('@/lib/tenant', () => ({ getTenantFromRequest: mockGetTenant }));

describe('public Algolia search tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTenant.mockResolvedValue('cairo-excursions-online');
    mockSearch.mockResolvedValue({
      results: [{ hits: [], nbHits: 0, page: 0, nbPages: 0, hitsPerPage: 20, query: '' }],
    });
  });

  it('uses only the server-resolved storefront tenant', async () => {
    const { GET } = await import('@/app/api/search/algolia/route');
    const response = await GET({
      url: 'https://cairoexcursionsonline.com/api/search/algolia?q=cairo&tenantId=sharm-ausfluege',
    } as Request);

    expect(response.status).toBe(200);
    expect(mockSearch).toHaveBeenCalledWith({
      requests: [expect.objectContaining({
        filters: 'isPublished:true AND (tenantId:"cairo-excursions-online" OR tenantIds:"cairo-excursions-online")',
      })],
    });
  });

  it('fails closed before search when tenant routing is malformed', async () => {
    mockGetTenant.mockResolvedValue('cairo OR tenantId:sharm');
    const { GET } = await import('@/app/api/search/algolia/route');
    const response = await GET({
      url: 'https://example.com/api/search/algolia?q=cairo',
    } as Request);

    expect(response.status).toBe(500);
    expect(mockSearch).not.toHaveBeenCalled();
  });
});
