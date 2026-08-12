const mockDbConnect = jest.fn();
const mockGetTenant = jest.fn();
const mockQuoteFindOne = jest.fn();
const mockBookingFind = jest.fn();
const mockSessionRetrieve = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) => ({
      status: init.status || 200,
      headers: init.headers || {},
      json: async () => body,
    }),
  },
}));
jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn(() => ({ checkout: { sessions: { retrieve: (...args: unknown[]) => mockSessionRetrieve(...args) } } })),
}));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: (...args: unknown[]) => mockDbConnect(...args) }));
jest.mock('@/lib/tenant', () => ({ getTenantFromRequest: (...args: unknown[]) => mockGetTenant(...args) }));
jest.mock('@/lib/models/CheckoutPaymentQuote', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => mockQuoteFindOne(...args) },
}));
jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: { find: (...args: unknown[]) => mockBookingFind(...args) },
}));

import { GET } from '@/app/api/checkout/session-status/route';

const request = (sessionId: string) => ({
  nextUrl: { searchParams: new URLSearchParams({ session_id: sessionId }) },
}) as any;

describe('GET /api/checkout/session-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
    mockGetTenant.mockResolvedValue('brand-one');
  });

  it('rejects malformed session ids before any provider or database lookup', async () => {
    const response = await GET(request('https://evil.example'));
    expect(response.status).toBe(400);
    expect(mockDbConnect).not.toHaveBeenCalled();
    expect(mockSessionRetrieve).not.toHaveBeenCalled();
  });

  it('does not reveal a checkout session belonging to another tenant', async () => {
    mockQuoteFindOne.mockReturnValue({ select: () => ({ lean: async () => null }) });
    const response = await GET(request('cs_test_1234567890'));
    expect(response.status).toBe(404);
    expect(mockQuoteFindOne).toHaveBeenCalledWith({ tenantId: 'brand-one', checkoutSessionId: 'cs_test_1234567890' });
    expect(mockSessionRetrieve).not.toHaveBeenCalled();
  });

  it('returns booking references only after Stripe metadata and tenant bookings agree', async () => {
    mockQuoteFindOne.mockReturnValue({ select: () => ({ lean: async () => ({ quoteBinding: 'a'.repeat(64), status: 'paid' }) }) });
    mockSessionRetrieve.mockResolvedValue({
      metadata: { has_booking_data: 'true', checkout_experience: 'hosted', tenant_id: 'brand-one', quote_binding: 'a'.repeat(64) },
      payment_intent: 'pi_test_123',
      payment_status: 'paid',
      status: 'complete',
    });
    mockBookingFind.mockReturnValue({
      select: () => ({ sort: () => ({ lean: async () => [{ bookingReference: 'BRAND-100', status: 'Confirmed' }] }) }),
    });
    const response = await GET(request('cs_test_1234567890'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'confirmed', bookingReferences: ['BRAND-100'] });
  });
});
