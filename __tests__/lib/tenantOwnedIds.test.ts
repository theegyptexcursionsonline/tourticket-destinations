/**
 * @jest-environment node
 */
import { filterTenantOwnedIds, scopeCategoryRelationIds } from '@/lib/admin/tenantOwnedIds';

// jest.mock factories are hoisted above the file body, so anything they touch
// must be `mock`-prefixed and resolved lazily at call time.
const mockFind = jest.fn();
let mockOwned: Array<{ _id: string }> = [];

// A function declaration, because jest.mock is hoisted above `const`.
function mockModel() {
  return {
    find: (filter: Record<string, unknown>) => {
      mockFind(filter);
      return { select: () => ({ lean: () => Promise.resolve(mockOwned) }) };
    },
  };
}

jest.mock('@/lib/models/Destination', () => mockModel());
jest.mock('@/lib/models/AttractionPage', () => mockModel());
jest.mock('@/lib/models/Category', () => mockModel());

const A = '68dada7e6617c4b6defc34b5';
const B = '68dada796617c4b6defc34ac';
const C = '68dae6b66617c4b6defc34d0';

describe('tenant-owned id scoping', () => {
  beforeEach(() => { mockFind.mockReset(); mockOwned = []; });

  it('drops an id belonging to another brand', async () => {
    mockOwned = [{ _id: A }];
    const kept = await filterTenantOwnedIds([A, B], 'destination', 'hurghada');

    expect(kept).toEqual([A]);
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'hurghada' }));
  });

  it('preserves the operator ordering, which is display order', async () => {
    mockOwned = [{ _id: A }, { _id: B }, { _id: C }];
    expect(await filterTenantOwnedIds([C, A, B], 'attractionPage', 'cairo')).toEqual([C, A, B]);
  });

  it('drops malformed ids without discarding the valid ones', async () => {
    mockOwned = [{ _id: A }];
    expect(await filterTenantOwnedIds([A, 'not-an-id', ''], 'category', 'luxor')).toEqual([A]);
  });

  it('never queries, and never keeps anything, without a tenant', async () => {
    expect(await filterTenantOwnedIds([A], 'category', '')).toEqual([]);
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('only rewrites the id fields the request actually sent', async () => {
    mockOwned = [{ _id: A }];
    // An archive toggle sends one key; a curated list it never mentioned must
    // survive untouched rather than being blanked to [].
    const body: Record<string, unknown> = { archivedAt: null, linkedPageIds: [A, B] };
    await scopeCategoryRelationIds(body, 'hurghada');

    expect(body.linkedPageIds).toEqual([A]);
    expect('popularDestinationIds' in body).toBe(false);
    expect('linkedCategoryIds' in body).toBe(false);
    expect(body.archivedAt).toBeNull();
  });
});
