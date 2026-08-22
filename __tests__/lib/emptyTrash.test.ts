jest.mock('mongoose', () => ({
  __esModule: true,
  default: { Types: { ObjectId: { isValid: (value: unknown) => /^[0-9a-f]{24}$/i.test(String(value)) } } },
}));

jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantId }),
}));

type Counter = jest.Mock<Promise<number>, [Record<string, unknown>]>;

const makeModel = (docs: Array<Record<string, unknown>>) => {
  const deleted: Array<Record<string, unknown>> = [];
  const model = {
    countDocuments: jest.fn().mockResolvedValue(0) as Counter,
    find: jest.fn(() => ({ select: () => ({ lean: async () => docs }) })),
    findOneAndDelete: jest.fn(async (query: Record<string, unknown>) => {
      deleted.push(query);
      return { _id: 'deleted' };
    }),
    deleted,
  };
  return model;
};

const TOUR_ID = '507f1f77bcf86cd799439011';
const CAT_ID = '507f1f77bcf86cd799439012';
const PAGE_ID = '507f1f77bcf86cd799439013';

const mockTour = makeModel([{ _id: TOUR_ID, title: 'Trashed tour' }]);
const mockCategory = makeModel([{ _id: CAT_ID, name: 'Trashed category' }]);
const mockAttractionPage = makeModel([{ _id: PAGE_ID, title: 'Trashed page' }]);
const mockBooking = { countDocuments: jest.fn().mockResolvedValue(0) as Counter };

jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: mockTour }));
jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: mockCategory }));
jest.mock('@/lib/models/AttractionPage', () => ({ __esModule: true, default: mockAttractionPage }));
jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: mockBooking }));

// require, not import: imports hoist above the mock models declared above.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { emptyTrash, inspectTrash } = require('@/lib/admin/emptyTrash') as typeof import('@/lib/admin/emptyTrash');

describe('Empty trash refuses anything still referenced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTour.countDocuments.mockResolvedValue(0);
    mockCategory.countDocuments.mockResolvedValue(0);
    mockAttractionPage.countDocuments.mockResolvedValue(0);
    mockBooking.countDocuments.mockResolvedValue(0);
    mockTour.deleted.length = 0;
    mockCategory.deleted.length = 0;
    mockAttractionPage.deleted.length = 0;
  });

  it('keeps a tour that has a booking on record', async () => {
    mockBooking.countDocuments.mockResolvedValueOnce(2);
    const report = await emptyTrash('tour', 'brand-a');
    expect(report.deleted).toEqual([]);
    expect(report.blocked[0].blockedReason).toBe('Has 2 bookings on record');
    expect(mockTour.findOneAndDelete).not.toHaveBeenCalled();
  });

  it('keeps a category still used by a tour', async () => {
    mockTour.countDocuments.mockResolvedValueOnce(1);
    const report = await inspectTrash('category', 'brand-a');
    expect(report.blocked[0].blockedReason).toBe('Still used by 1 tour');
  });

  it('keeps a category a category page or link still points at', async () => {
    mockAttractionPage.countDocuments.mockResolvedValueOnce(1);
    const report = await emptyTrash('category', 'brand-a');
    expect(report.deleted).toEqual([]);
    expect(report.blocked[0].blockedReason).toBe('Still linked from 1 page');
    expect(mockAttractionPage.countDocuments).toHaveBeenCalledWith({
      $or: [{ categoryId: CAT_ID }, { linkedCategoryIds: CAT_ID }],
    });
  });

  it('keeps a page that is the parent of a tour, or linked from another page', async () => {
    mockTour.countDocuments.mockResolvedValueOnce(3);
    let report = await inspectTrash('page', 'brand-a');
    expect(report.blocked[0].blockedReason).toBe('Still the parent of 3 tours');

    mockAttractionPage.countDocuments.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    report = await inspectTrash('page', 'brand-a');
    expect(report.blocked[0].blockedReason).toBe('Still linked from 2 pages');
  });

  it('deletes an unreferenced record through a query that re-asserts trashed + tenant', async () => {
    const report = await emptyTrash('page', 'brand-a');
    expect(report.deleted).toEqual([PAGE_ID]);
    expect(mockAttractionPage.deleted[0]).toEqual({
      archivedAt: { $ne: null },
      _id: { $in: [PAGE_ID] },
      tenantId: 'brand-a',
    });
  });

  it('ignores ids that are not ObjectIds instead of widening the delete', async () => {
    await emptyTrash('page', 'brand-a', ['not-an-id']);
    const query = (mockAttractionPage.find as jest.Mock).mock.calls[0][0];
    expect(query._id).toEqual({ $in: [] });
  });
});
