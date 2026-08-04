export {};

const mockDestinationFind = jest.fn();
const mockCategoryFind = jest.fn();
const mockAttractionFind = jest.fn();
const mockTourFind = jest.fn();

jest.mock('@/lib/models/Destination', () => ({ __esModule: true, default: { find: mockDestinationFind } }));
jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: { find: mockCategoryFind } }));
jest.mock('@/lib/models/AttractionPage', () => ({ __esModule: true, default: { find: mockAttractionFind } }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { find: mockTourFind } }));

function query(rows: unknown[]) {
  const chain = {
    select: jest.fn(),
    sort: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.lean.mockResolvedValue(rows);
  return chain;
}

describe('default internal links', () => {
  beforeEach(() => jest.clearAllMocks());

  it('builds the six client-requested groups from published tenant-scoped content', async () => {
    mockDestinationFind.mockReturnValue(query([{ _id: 'd1', name: 'Hurghada', slug: 'hurghada', urlType: 'direct' }]));
    mockCategoryFind.mockReturnValue(query([{ _id: 'c1', name: 'Desert Safari', slug: 'desert-safari', urlType: 'direct' }]));
    mockAttractionFind
      .mockReturnValueOnce(query([
        { _id: 'a1', title: 'Pyramids of Giza', slug: 'pyramids-of-giza', pageType: 'attraction', urlType: 'direct' },
        ...Array.from({ length: 8 }, (_, index) => ({
          _id: `a${index + 2}`,
          title: `Attraction ${index + 2}`,
          slug: `attraction-${index + 2}`,
          pageType: 'attraction',
          urlType: 'direct',
        })),
      ]))
      .mockReturnValueOnce(query([{ _id: 'p1', title: 'Family activities', slug: 'family-activities', pageType: 'category', urlType: 'direct' }]));
    mockTourFind.mockReturnValue(query([{ _id: 't1', title: 'Cairo Day Tour', slug: 'cairo-day-tour', urlType: 'direct' }]));

    const { buildDefaultInternalLinks } = await import('@/lib/navigation/defaultInternalLinks');
    const tenantFilter = { tenantId: 'default' };
    const result = await buildDefaultInternalLinks(tenantFilter);

    expect(result.groups.map((group) => group.id)).toEqual([
      'destinations',
      'attraction-categories',
      'popular-attractions',
      'top-attractions',
      'tours-in-egypt',
      'things-to-do',
    ]);
    expect(result.groups[0].links[0].href).toBe('/hurghada');
    expect(result.groups[3].links).toHaveLength(1);
    expect(mockDestinationFind.mock.calls[0][0].$and[0]).toEqual(tenantFilter);
    expect(mockTourFind.mock.calls[0][0].$and[0]).toEqual(tenantFilter);
  });
});
