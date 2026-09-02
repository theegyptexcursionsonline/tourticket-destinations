const mockTourFind = jest.fn();
const mockTourUpdateOne = jest.fn();
const mockAvailabilityLean = jest.fn();
const mockAvailabilityFind = jest.fn((_query?: unknown) => ({ lean: mockAvailabilityLean }));
const mockOverrideExists = jest.fn();
const mockOverrideUpdateOne = jest.fn();
const mockRefreshTourPricingSummary = jest.fn();

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { find: (...args: unknown[]) => mockTourFind(...args), updateOne: (...args: unknown[]) => mockTourUpdateOne(...args) },
}));
jest.mock('@/lib/models/Availability', () => ({
  __esModule: true,
  default: { find: (query: unknown) => mockAvailabilityFind(query) },
}));
jest.mock('@/lib/models/RevenuePriceOverride', () => ({
  __esModule: true,
  default: {
    exists: (...args: unknown[]) => mockOverrideExists(...args),
    updateOne: (...args: unknown[]) => mockOverrideUpdateOne(...args),
  },
}));
jest.mock('@/lib/revenue/pricingSummary', () => ({
  refreshTourPricingSummary: (...args: unknown[]) => mockRefreshTourPricingSummary(...args),
}));
jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantId }),
  getTenantConfigCached: jest.fn().mockResolvedValue({ isActive: true, payments: { currency: 'USD' } }),
}));

import { backfillRevenuePricing } from '@/lib/revenue/pricingBackfill';

type TourState = {
  _id: string;
  tenantId: string;
  discountPrice: number;
  discountPercent?: number;
  revenueGuestPrices?: { adult: number; child: number; infant: number };
  bookingOptions: Array<Record<string, unknown>>;
  addOns: Array<Record<string, unknown>>;
};

function installTourState(initial: TourState) {
  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  const state = clone(initial);
  mockTourFind.mockImplementation(async () => [{
    _id: state._id,
    tenantId: state.tenantId,
    discountPrice: state.discountPrice,
    discountPercent: state.discountPercent,
    revenueGuestPrices: state.revenueGuestPrices,
    bookingOptions: state.bookingOptions,
    addOns: state.addOns,
    toObject: () => clone(state),
  }]);
  mockTourUpdateOne.mockImplementation(async (_query, update) => {
    Object.assign(state, clone(update.$set));
    return { acknowledged: true, modifiedCount: 1 };
  });
  return state;
}

describe('RevenuePilot pricing backfill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAvailabilityLean.mockResolvedValue([]);
    mockOverrideExists.mockResolvedValue(null);
    mockOverrideUpdateOne.mockResolvedValue({ acknowledged: true });
    mockRefreshTourPricingSummary.mockResolvedValue(undefined);
  });

  it('rewrites legacy add-on assignments to the immutable option key without mutating a dry run', async () => {
    const state = installTourState({
      _id: '507f1f77bcf86cd799439011',
      tenantId: 'mountain-tours',
      discountPrice: 100,
      bookingOptions: [{ id: 'legacy-opt', label: 'Private', type: 'Per Person', price: 150 }],
      addOns: [{ name: 'Lunch', price: 20, bookingOptionKeys: ['legacy-opt'] }],
    });
    const scope = { tenantId: 'mountain-tours' };

    const planned = await backfillRevenuePricing(true, scope);
    expect(planned).toMatchObject({ toursKeyed: 1, addOnAssignmentsRewritten: 1 });
    expect(mockTourUpdateOne).not.toHaveBeenCalled();
    expect(state.bookingOptions[0].pricingKey).toBeUndefined();
    expect(state.addOns[0].bookingOptionKeys).toEqual(['legacy-opt']);
    expect(mockAvailabilityFind).not.toHaveBeenCalled();

    const applied = await backfillRevenuePricing(false, scope);
    const durableKey = String(state.bookingOptions[0].pricingKey);
    expect(applied).toMatchObject({ toursKeyed: 1, addOnAssignmentsRewritten: 1 });
    expect(durableKey).toMatch(/^private-[a-f0-9]{12}$/);
    expect(state.addOns[0].bookingOptionKeys).toEqual([durableKey]);
    expect(state.bookingOptions.some((option) => option.pricingKey === durableKey)).toBe(true);

    mockTourUpdateOne.mockClear();
    const replay = await backfillRevenuePricing(false, scope);
    expect(replay).toMatchObject({ toursKeyed: 0, addOnAssignmentsRewritten: 0 });
    expect(mockTourUpdateOne).not.toHaveBeenCalled();
    expect(state.addOns[0].bookingOptionKeys).toEqual([durableKey]);
  });

  it('imports a zero-option legacy slot with the authored child/infant policy and a rollback-safe baseline', async () => {
    installTourState({
      _id: '507f1f77bcf86cd799439012',
      tenantId: 'mountain-tours',
      discountPrice: 100,
      revenueGuestPrices: { adult: 100, child: 80, infant: 15 },
      bookingOptions: [],
      addOns: [],
    });
    mockAvailabilityLean.mockResolvedValue([{
      _id: 'availability-1',
      tour: '507f1f77bcf86cd799439012',
      date: new Date('2026-09-20T00:00:00.000Z'),
      slots: [{ time: '10:00', capacity: 10, price: 140 }],
    }]);
    let overrideExists = false;
    mockOverrideExists.mockImplementation(async () => overrideExists);
    mockOverrideUpdateOne.mockImplementation(async () => {
      overrideExists = true;
      return { acknowledged: true, upsertedCount: 1 };
    });

    const dryRun = await backfillRevenuePricing(true, { tenantId: 'mountain-tours' });
    expect(dryRun.legacyOverridesImported).toBe(1);
    expect(mockOverrideUpdateOne).not.toHaveBeenCalled();

    const applied = await backfillRevenuePricing(false, { tenantId: 'mountain-tours' });
    expect(applied.legacyOverridesImported).toBe(1);
    expect(mockOverrideUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'mountain-tours', optionKey: 'standard', time: '10:00' }),
      { $setOnInsert: expect.objectContaining({
        prices: { adult: 140, child: 80, infant: 15 },
        cataloguePrices: { adult: 140, child: 80, infant: 15 },
        previousPrices: { adult: 140, child: 80, infant: 15 },
      }) },
      { upsert: true },
    );

    mockOverrideUpdateOne.mockClear();
    const replay = await backfillRevenuePricing(false, { tenantId: 'mountain-tours' });
    expect(replay.legacyOverridesImported).toBe(0);
    expect(mockOverrideUpdateOne).not.toHaveBeenCalled();
  });
});
