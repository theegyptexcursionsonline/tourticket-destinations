export {};

const mockDestinationFindOne = jest.fn();
const mockCategoryFindOne = jest.fn();
const mockAttractionFindOne = jest.fn();

jest.mock('@/lib/models/Destination', () => ({ __esModule: true, default: { findOne: mockDestinationFindOne } }));
jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: { findOne: mockCategoryFindOne } }));
jest.mock('@/lib/models/AttractionPage', () => ({ __esModule: true, default: { findOne: mockAttractionFindOne } }));

function query(value: unknown) {
  const chain = { select: jest.fn(), lean: jest.fn() };
  chain.select.mockReturnValue(chain);
  chain.lean.mockResolvedValue(value);
  return chain;
}

describe('parent-page validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves the authoritative tenant parent label, slug and public URL', async () => {
    mockDestinationFindOne.mockReturnValue(query({
      _id: 'parent-id',
      name: 'Hurghada',
      slug: 'hurghada',
      urlType: 'destination',
      parentPage: null,
    }));
    const { validateParentPageSelection } = await import('@/lib/content/validateParentPage');
    const tenantFilter = { tenantId: 'default' };

    await expect(validateParentPageSelection({
      parentPage: { id: 'parent-id', slug: 'spoofed', label: 'Spoofed', kind: 'destination' },
      currentId: 'child-id',
      currentSlug: 'luxor-day-trip',
      tenantFilter,
    })).resolves.toEqual({
      id: 'parent-id',
      slug: 'hurghada',
      label: 'Hurghada',
      kind: 'destination',
      href: '/destination/hurghada',
    });
    expect(mockDestinationFindOne.mock.calls[0][0].$and[0]).toEqual(tenantFilter);
  });

  it('rejects unavailable, self-referential and cyclic parents', async () => {
    const { ParentPageValidationError, validateParentPageSelection } = await import('@/lib/content/validateParentPage');
    mockDestinationFindOne.mockReturnValueOnce(query(null));
    await expect(validateParentPageSelection({
      parentPage: { id: 'missing', slug: 'missing', label: 'Missing', kind: 'destination' },
      tenantFilter: { tenantId: 'default' },
    })).rejects.toBeInstanceOf(ParentPageValidationError);

    await expect(validateParentPageSelection({
      parentPage: { id: 'same', slug: 'same', label: 'Same', kind: 'destination' },
      currentId: 'same',
      tenantFilter: { tenantId: 'default' },
    })).rejects.toThrow(/own parent/i);

    mockDestinationFindOne
      .mockReturnValueOnce(query({
        _id: 'parent', name: 'Parent', slug: 'parent', parentPage: { id: 'child', kind: 'destination' },
      }))
      .mockReturnValueOnce(query({ _id: 'child', name: 'Child', slug: 'child', parentPage: null }));
    await expect(validateParentPageSelection({
      parentPage: { id: 'parent', slug: 'parent', label: 'Parent', kind: 'destination' },
      currentId: 'child',
      currentSlug: 'child',
      tenantFilter: { tenantId: 'default' },
    })).rejects.toThrow(/cycle/i);
  });
});
