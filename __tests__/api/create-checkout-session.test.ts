const mockPrepare = jest.fn();
const mockSessionCreate = jest.fn();
const mockSessionExpire = jest.fn();
const mockQuoteUpdate = jest.fn();

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
  default: jest.fn(() => ({
    checkout: { sessions: { create: (...args: unknown[]) => mockSessionCreate(...args), expire: (...args: unknown[]) => mockSessionExpire(...args) } },
  })),
}));
jest.mock('@/lib/checkout/prepareStripeCheckout', () => ({
  prepareStripeCheckout: (...args: unknown[]) => mockPrepare(...args),
  checkoutInputErrorResponse: jest.fn(() => null),
}));
jest.mock('@/lib/models/CheckoutPaymentQuote', () => ({
  __esModule: true,
  default: { findOneAndUpdate: (...args: unknown[]) => mockQuoteUpdate(...args) },
}));

import { POST } from '@/app/api/checkout/create-checkout-session/route';

const request = () => ({ method: 'POST', headers: { get: () => null } }) as unknown as Request;

const prepared = {
  tenantId: 'brand-one',
  tenantName: 'Brand One',
  tenantDomain: 'https://brand-one.example',
  paymentExperience: 'hosted',
  checkoutAttemptId: '123e4567-e89b-42d3-a456-426614174000',
  quoteBinding: 'a'.repeat(64),
  customer: { email: 'guest@example.com', firstName: 'Guest', lastName: 'Customer', phone: '+201000000000' },
  cart: [{ title: 'Nile Cruise' }],
  cartSummary: [{ t: '507f1f77bcf86cd799439011' }],
  pricing: { subtotal: 100, serviceFee: 3, tax: 5, discount: 0, total: 108, currency: 'USD' },
  locale: 'en',
  amountMinor: 10_800,
  currency: 'usd',
  metadata: { tenant_id: 'brand-one', checkout_experience: 'hosted', quote_binding: 'a'.repeat(64) },
};

describe('POST /api/checkout/create-checkout-session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
    mockPrepare.mockResolvedValue(prepared);
    mockSessionCreate.mockResolvedValue({
      id: 'cs_test_hosted_1234567890',
      status: 'open',
      url: 'https://checkout.stripe.com/c/pay/cs_test_hosted_1234567890',
      expires_at: Math.floor(Date.now() / 1000) + 1860,
    });
    mockSessionExpire.mockResolvedValue({ status: 'expired' });
    mockQuoteUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue({ checkoutSessionId: 'cs_test_hosted_1234567890', checkoutAttemptId: prepared.checkoutAttemptId }) });
  });

  it('uses the server-authoritative amount, exact tenant return URL, and durable quote', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mockPrepare).toHaveBeenCalledWith(expect.anything(), 'hosted');
    expect(mockSessionCreate).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'payment',
      ui_mode: 'hosted',
      success_url: 'https://brand-one.example/en/checkout/return?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://brand-one.example/en/checkout?payment=cancelled',
      line_items: [expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 10_800 }) })],
      payment_intent_data: { metadata: prepared.metadata },
    }), { idempotencyKey: `network-hosted-${prepared.tenantId}-${prepared.checkoutAttemptId}-${prepared.quoteBinding.slice(0, 24)}` });
    expect(mockQuoteUpdate).toHaveBeenCalledWith(
      { tenantId: prepared.tenantId, quoteBinding: prepared.quoteBinding },
      expect.objectContaining({ $setOnInsert: expect.objectContaining({ checkoutSessionId: 'cs_test_hosted_1234567890', paymentExperience: 'hosted' }) }),
      { upsert: true, new: true },
    );
  });

  it('expires the Stripe Session when durable quote persistence fails', async () => {
    mockQuoteUpdate.mockReturnValueOnce({ lean: jest.fn().mockRejectedValue(new Error('database unavailable')) });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(mockSessionExpire).toHaveBeenCalledWith('cs_test_hosted_1234567890');
  });

  it('rejects a Stripe lookalike redirect and expires the session', async () => {
    mockSessionCreate.mockResolvedValueOnce({
      id: 'cs_test_hosted_1234567890',
      status: 'open',
      url: 'https://stripe.com.evil.example/pay',
    });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(mockSessionExpire).toHaveBeenCalledWith('cs_test_hosted_1234567890');
    expect(mockQuoteUpdate).not.toHaveBeenCalled();
  });
});
