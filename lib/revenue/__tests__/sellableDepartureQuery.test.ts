const mockTourFindOne = jest.fn();
const mockAvailabilityFindOne = jest.fn();
const mockStopSaleFind = jest.fn();
const mockBookingFind = jest.fn();

jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { findOne: (...args: unknown[]) => mockTourFindOne(...args) } }));
jest.mock('@/lib/models/Availability', () => ({ __esModule: true, default: { findOne: (...args: unknown[]) => mockAvailabilityFindOne(...args) } }));
jest.mock('@/lib/models/StopSale', () => ({ __esModule: true, default: { find: (...args: unknown[]) => mockStopSaleFind(...args) } }));
jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: { find: (...args: unknown[]) => mockBookingFind(...args) } }));
jest.mock('@/lib/tenant', () => ({ buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantId }) }));
jest.mock('@/lib/revenue/pricingResolver', () => ({
  normalizePriceDate: (value: string) => new Date(`${value}T00:00:00.000Z`),
}));

import { assertRevenuePriceTargetSellable } from '@/lib/revenue/sellableDeparture';

describe('RevenuePilot sellability capacity query', () => {
  it('counts both accepted pending/confirmed status casings', async () => {
    mockTourFindOne.mockReturnValue({
      select: jest.fn(() => ({
        lean: jest.fn(async () => ({
          _id: '507f1f77bcf86cd799439011',
          availability: { type: 'daily', availableDays: [0, 1, 2, 3, 4, 5, 6], slots: [{ time: '10:00', capacity: 10 }] },
          bookingOptions: [],
        })),
      })),
    });
    mockAvailabilityFindOne.mockReturnValue({ select: jest.fn(() => ({ lean: jest.fn(async () => null) })) });
    mockStopSaleFind.mockReturnValue({ select: jest.fn(() => ({ lean: jest.fn(async () => []) })) });
    mockBookingFind.mockReturnValue({ select: jest.fn(() => ({ lean: jest.fn(async () => [
      { adultGuests: 1 },
      { adultGuests: 2 },
    ]) })) });

    const result = await assertRevenuePriceTargetSellable({
      tenantId: 'mountain-tours',
      tourId: '507f1f77bcf86cd799439011',
      optionKey: 'standard',
      date: '2099-09-20',
      time: '10:00',
    });

    expect(mockBookingFind).toHaveBeenCalledWith(expect.objectContaining({
      $and: expect.arrayContaining([
        expect.objectContaining({ status: { $in: ['Pending', 'Confirmed', 'pending', 'confirmed'] } }),
        { tenantId: 'mountain-tours' },
      ]),
    }));
    expect(result).toMatchObject({ capacity: 10, booked: 3, available: 7 });
  });
});
