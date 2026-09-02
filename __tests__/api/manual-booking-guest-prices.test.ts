/**
 * Manual (admin) bookings are priced from the stored tour by the same rule as
 * the online charge: legacy options keep child = half, infant free; a
 * child-priced option and a per-departure override charge the stored guest
 * prices; the unit prices are recorded on the booking.
 */
const mockBookingCreate = jest.fn();
const mockTourLean = jest.fn();
const mockRequireAdminAuth = jest.fn();
const mockSendConfirmation = jest.fn();
const mockResolveEffectivePrice = jest.fn();

jest.mock('next/server', () => ({
  NextRequest: class {},
  // A class so the route's `auth instanceof NextResponse` guard can run.
  NextResponse: class {
    static json(body: unknown, init: { status?: number } = {}) {
      return { status: init.status || 200, json: async () => body };
    }
  },
}));
jest.mock('@/lib/admin/adminAudit', () => ({ withAdminAudit: (handler: unknown) => handler }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => mockBookingCreate(...args),
    findOne: () => ({ lean: async () => null }),
    updateOne: () => ({ catch: () => undefined }),
  },
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: () => ({ lean: (...args: unknown[]) => mockTourLean(...args) }) },
}));
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: { findOne: () => ({ lean: async () => ({ _id: 'user-1', email: 'qa@example.com' }) }), create: jest.fn() },
}));
jest.mock('@/lib/models/SpecialOffer', () => ({
  __esModule: true,
  default: { find: () => ({ sort: () => ({ lean: async () => [] }) }) },
}));
jest.mock('@/lib/auth/adminAuth', () => ({
  requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
  canAccessTenant: () => true,
  tenantForbiddenResponse: () => ({ status: 403 }),
}));
jest.mock('@/lib/tenant', () => ({ getTenantConfigCached: async () => ({ name: 'Brand One', contact: { email: 'ops@example.com' } }) }));
jest.mock('@/lib/email/emailService', () => ({
  EmailService: {
    sendBookingConfirmation: (...args: unknown[]) => mockSendConfirmation(...args),
    sendAdminBookingAlert: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/lib/revenue/pricingResolver', () => ({
  resolveEffectivePrice: (...args: unknown[]) => mockResolveEffectivePrice(...args),
}));

import { POST } from '@/app/api/bookings/manual/route';
import { optionSubtotal } from '@/lib/bookings/optionSubtotal';

const tour = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Nile Cruise',
  discountPrice: 100,
  bookingOptions: [
    { id: 'legacy', pricingKey: 'legacy-key', type: 'Standard', label: 'Standard', price: 100 },
    { id: 'priced', pricingKey: 'family-key', type: 'Family', label: 'Family', price: 100, guestPrices: { adult: 100, child: 70, infant: 15 } },
    {
      id: 'slotted', pricingKey: 'evening-key', type: 'Evening', label: 'Evening', price: 100,
      guestPrices: { adult: 100, child: 70, infant: 15 },
      timeSlots: [{ time: '14:00', guestPrices: { child: 80, infant: 0 } }],
    },
  ],
};

const request = (body: Record<string, unknown>) => ({ json: async () => body }) as never;
const baseBody = {
  tenantId: 'brand-one',
  tourId: tour._id,
  bookingOptionKey: 'legacy-key',
  quoteVersion: 0,
  date: '2099-05-01',
  time: '09:00',
  adults: 2,
  children: 1,
  infants: 1,
  customerName: 'QA Guest',
  customerEmail: 'qa@example.com',
  customerPhone: '+201000000000',
  sendConfirmationEmail: true,
};

describe('POST /api/bookings/manual — guest prices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdminAuth.mockResolvedValue({ userId: 'admin-1', role: 'admin', tenantIds: ['brand-one'] });
    mockTourLean.mockResolvedValue(tour);
    mockBookingCreate.mockImplementation(async (doc: Record<string, unknown>) => ({ ...doc, _id: 'booking-1', toObject: () => doc }));
    mockSendConfirmation.mockResolvedValue(undefined);
    mockResolveEffectivePrice.mockImplementation(async ({ optionKey, time }: { optionKey: string; time: string }) => {
      const prices = optionKey === 'family-key'
        ? { adult: 100, child: 70, infant: 15 }
        : optionKey === 'evening-key' && time === '14:00'
          ? { adult: 100, child: 80, infant: 0 }
          : optionKey === 'evening-key'
            ? { adult: 100, child: 70, infant: 15 }
            : { adult: 100, child: 50, infant: 0 };
      return {
        tourId: tour._id,
        tourTitle: tour.title,
        optionKey,
        date: '2099-05-01',
        time,
        currency: 'USD',
        prices,
        cataloguePrices: prices,
        version: 0,
        overrideId: null,
        executionId: null,
        source: 'catalogue',
        sourceVersion: 'catalogue-v1',
      };
    });
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  const recorded = () => mockBookingCreate.mock.calls[0][0] as Record<string, any>;

  it('legacy option: exactly the previous numbers (child half, infant free), unit prices recorded', async () => {
    const response = await POST(request({ ...baseBody, bookingOptionType: 'Standard' }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.subtotal).toBe(optionSubtotal(tour.bookingOptions[0], 100, 2, 1, 1));
    expect(recorded()).toMatchObject({
      totalPrice: 250,
      guestPrices: { adult: 100, child: 50, infant: 0 },
      selectedBookingOption: { id: 'legacy', pricingKey: 'legacy-key', type: 'Standard', price: 100 },
    });
    expect(mockSendConfirmation.mock.calls[0][0].participantBreakdown).toBe('2 x Adult ($100.00), 1 x Child ($50.00), 1 x Infant (Free)');
  });

  it('child-priced option charges the stored child and infant prices', async () => {
    const response = await POST(request({ ...baseBody, bookingOptionType: 'Family', bookingOptionKey: 'family-key' }));
    expect(response.status).toBe(200);
    expect(recorded()).toMatchObject({ totalPrice: 285, guestPrices: { adult: 100, child: 70, infant: 15 } });
    expect(mockSendConfirmation.mock.calls[0][0].participantBreakdown).toBe('2 x Adult ($100.00), 1 x Child ($70.00), 1 x Infant ($15.00)');
    expect(mockSendConfirmation.mock.calls[0][0].orderedItems[0].guestPrices).toEqual({ adult: 100, child: 70, infant: 15 });
  });

  it('per-departure override prices the 14:00 departure differently from 09:00', async () => {
    await POST(request({ ...baseBody, bookingOptionType: 'Evening', bookingOptionKey: 'evening-key', time: '14:00' }));
    expect(recorded()).toMatchObject({ totalPrice: 280, guestPrices: { adult: 100, child: 80, infant: 0 } });
    mockBookingCreate.mockClear();
    await POST(request({ ...baseBody, bookingOptionType: 'Evening', bookingOptionKey: 'evening-key', time: '09:00' }));
    expect(recorded()).toMatchObject({ totalPrice: 285, guestPrices: { adult: 100, child: 70, infant: 15 } });
  });

  it('rejects an option the stored tour does not have', async () => {
    const response = await POST(request({ ...baseBody, bookingOptionType: 'Missing', bookingOptionKey: 'missing-key' }));
    expect(response.status).toBe(400);
    expect(mockBookingCreate).not.toHaveBeenCalled();
  });

  it('returns a reviewable quote and writes nothing when the client quote version is stale', async () => {
    mockResolveEffectivePrice.mockResolvedValueOnce({
      tourId: tour._id,
      tourTitle: tour.title,
      optionKey: 'legacy-key',
      date: '2099-05-01',
      time: '09:00',
      currency: 'USD',
      prices: { adult: 120, child: 60, infant: 0 },
      cataloguePrices: { adult: 100, child: 50, infant: 0 },
      version: 2,
      overrideId: 'override-2',
      executionId: 'execution-2',
      source: 'override',
      sourceVersion: 'catalogue-v1',
    });

    const response = await POST(request({ ...baseBody, bookingOptionType: 'Standard', quoteVersion: 1 }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'PRICE_CHANGED', quote: { version: 2 } });
    expect(mockBookingCreate).not.toHaveBeenCalled();
  });
});
