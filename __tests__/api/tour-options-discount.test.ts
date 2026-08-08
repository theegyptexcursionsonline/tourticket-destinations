jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    _data: unknown;
    constructor(init?: { status?: number }) { this.status = init?.status || 200; }
    async json() { return this._data; }
    static json(data: unknown, init?: { status?: number }) {
      const response = new MockNextResponse(init);
      response._data = data;
      return response;
    }
  }
  return { NextResponse: MockNextResponse };
});

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/tenant', () => ({
  buildStrictTenantQuery: (query: Record<string, unknown>, tenantId: string) => ({ ...query, tenantId }),
  getTenantFromRequest: jest.fn().mockResolvedValue('marsa-alam-excursions'),
}));

const tourLean = jest.fn();
const tourFindOne = jest.fn(() => ({ lean: tourLean }));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => (tourFindOne as jest.Mock)(...args) },
}));

import { GET } from '@/app/api/tours/[tourId]/options/route';
import { authoritativeBasePrice } from '@/lib/pricing/authoritativePrice';

const TOUR_ID = '507f1f77bcf86cd799439011';
const discountedTour = {
  _id: TOUR_ID,
  title: 'Discounted tour',
  discountPrice: 100,
  discountPercent: 20,
  duration: '3 hours',
  availability: { slots: [{ time: '09:00', capacity: 10, price: 75 }, { time: '11:00', capacity: 8 }] },
  bookingOptions: [
    {
      id: 'private-id',
      pricingKey: 'private-key',
      type: 'Per Person',
      label: 'Private',
      price: 150,
      applyTourDiscount: true,
      timeSlots: [{ time: '14:00', capacity: 6, price: 200 }, { time: '16:00' }],
    },
    { id: 'group-id', pricingKey: 'group-key', type: 'Per Person', label: 'Group', price: 90 },
  ],
};

const request = {} as Request;
const context = { params: Promise.resolve({ tourId: TOUR_ID }) };

describe('GET /api/tours/[tourId]/options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tourLean.mockResolvedValue(discountedTour);
  });

  it('quotes opted-in options and their configured slots through the charge helper', async () => {
    const response = await GET(request, context);
    const options = await (response as unknown as { json: () => Promise<any[]> }).json();
    const privateOption = options.find((option) => option.pricingKey === 'private-key');
    expect(privateOption.price).toBe(120);
    expect(privateOption.originalPrice).toBe(150);
    expect(privateOption.discount).toBe(20);
    const slot = privateOption.timeSlots.find((entry: { time: string }) => entry.time === '14:00');
    expect(slot.price).toBe(160);
    expect(slot.originalPrice).toBe(200);
    expect(slot.price).toBe(authoritativeBasePrice(discountedTour, {
      selectedBookingOption: { id: 'private-id' },
      selectedTime: '14:00',
    }));
  });

  it('keeps non-opted options at full price on inherited universal slots', async () => {
    const response = await GET(request, context);
    const options = await (response as unknown as { json: () => Promise<any[]> }).json();
    const group = options.find((option) => option.pricingKey === 'group-key');
    expect(group.price).toBe(90);
    expect(group.timeSlots.find((entry: { time: string }) => entry.time === '09:00').price).toBe(90);
  });

  it('applies the tour percentage to standard and universal-slot prices', async () => {
    tourLean.mockResolvedValueOnce({ ...discountedTour, bookingOptions: [] });
    const response = await GET(request, context);
    const [standard] = await (response as unknown as { json: () => Promise<any[]> }).json();
    expect(standard.price).toBe(80);
    expect(standard.originalPrice).toBe(100);
    expect(standard.timeSlots.find((entry: { time: string }) => entry.time === '09:00')).toMatchObject({
      price: 60,
      originalPrice: 75,
    });
  });
});
