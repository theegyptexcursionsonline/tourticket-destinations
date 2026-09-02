const mockSaveObject = jest.fn();
const mockWaitForTask = jest.fn();
const mockGetObject = jest.fn();
const mockAlgoliasearch = jest.fn((_appId?: unknown, _apiKey?: unknown) => ({
  saveObject: mockSaveObject,
  waitForTask: mockWaitForTask,
  getObject: mockGetObject,
}));

jest.mock('algoliasearch', () => ({ algoliasearch: (...args: unknown[]) => mockAlgoliasearch(args[0], args[1]) }));

describe('Algolia tenant-pricing propagation read-back', () => {
  const originalEnv = { ...process.env };
  const tour = {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    title: 'Mountain sunrise',
    slug: 'mountain-sunrise',
    location: 'Giza',
    tags: ['sunrise'],
    category: { _id: 'category-1', name: 'Desert safari' },
    destination: { _id: 'destination-1', name: 'Cairo' },
    isPublished: true,
    tenantId: 'mountain-tours',
    tenantIds: ['mountain-tours', 'partner-brand'],
    pricingSummaries: [
      { tenantId: 'mountain-tours', fromPrice: 80, version: 3, currency: 'USD' },
      { tenantId: 'partner-brand', fromPrice: 75, version: 2, currency: 'EUR' },
    ],
    archivedAt: null,
  };
  let syncTourToAlgoliaVerified: typeof import('@/lib/algolia').syncTourToAlgoliaVerified;

  beforeAll(async () => {
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID = 'test-app';
    process.env.ALGOLIA_WRITE_API_KEY = 'test-write-key';
    ({ syncTourToAlgoliaVerified } = await import('@/lib/algolia'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveObject.mockResolvedValue({ taskID: 42 });
    mockWaitForTask.mockResolvedValue(undefined);
    mockGetObject.mockResolvedValue({
      objectID: '507f1f77bcf86cd799439011',
      tenantIds: tour.tenantIds,
      pricingSummaries: tour.pricingSummaries,
      archivedAt: null,
      category: tour.category,
      destination: tour.destination,
      _tags: ['sunrise', 'Desert safari', 'Cairo', 'Giza'],
    });
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  it('waits for indexing and verifies the exact tenant-scoped pricing projection', async () => {
    await expect(syncTourToAlgoliaVerified(tour)).resolves.toMatchObject({ objectID: '507f1f77bcf86cd799439011' });
    expect(mockSaveObject).toHaveBeenCalledWith(expect.objectContaining({
      indexName: expect.any(String),
      body: expect.objectContaining({
        objectID: '507f1f77bcf86cd799439011',
        tenantIds: tour.tenantIds,
        pricingSummaries: tour.pricingSummaries,
        archivedAt: null,
        category: tour.category,
        destination: tour.destination,
        _tags: ['sunrise', 'Desert safari', 'Cairo', 'Giza'],
      }),
    }));
    expect(mockWaitForTask).toHaveBeenCalledWith(expect.objectContaining({ taskID: 42 }));
    expect(mockGetObject).toHaveBeenCalledWith(expect.objectContaining({
      objectID: '507f1f77bcf86cd799439011',
      attributesToRetrieve: ['objectID', 'tenantIds', 'pricingSummaries', 'archivedAt', 'category', 'destination', '_tags'],
    }));
  });

  it('does not mark propagation verified when another tenant price is stale', async () => {
    mockGetObject.mockResolvedValueOnce({
      objectID: '507f1f77bcf86cd799439011',
      tenantIds: tour.tenantIds,
      pricingSummaries: [tour.pricingSummaries[0]],
      archivedAt: null,
      category: tour.category,
      destination: tour.destination,
      _tags: ['sunrise', 'Desert safari', 'Cairo', 'Giza'],
    });
    await expect(syncTourToAlgoliaVerified(tour)).rejects.toThrow('read-back did not match');
  });

  it('includes archive state in the verified projection contract', async () => {
    const archived = { ...tour, archivedAt: '2026-09-02T00:00:00.000Z' };
    mockGetObject.mockResolvedValueOnce({
      objectID: '507f1f77bcf86cd799439011',
      tenantIds: tour.tenantIds,
      pricingSummaries: tour.pricingSummaries,
      archivedAt: null,
      category: tour.category,
      destination: tour.destination,
      _tags: ['sunrise', 'Desert safari', 'Cairo', 'Giza'],
    });
    await expect(syncTourToAlgoliaVerified(archived)).rejects.toThrow('read-back did not match');
  });

  it('does not report success when taxonomy content was lost during projection', async () => {
    mockGetObject.mockResolvedValueOnce({
      objectID: '507f1f77bcf86cd799439011',
      tenantIds: tour.tenantIds,
      pricingSummaries: tour.pricingSummaries,
      archivedAt: null,
      category: { _id: 'category-1', name: '' },
      destination: tour.destination,
      _tags: ['sunrise', 'Cairo', 'Giza'],
    });
    await expect(syncTourToAlgoliaVerified(tour)).rejects.toThrow('read-back did not match');
  });
});
