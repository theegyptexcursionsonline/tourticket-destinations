/**
 * Hosted Checkout lifecycle. A guest who backs out of Stripe and clicks Pay
 * again, or who edits the cart in the same tab, must get exactly one payable
 * page: the still-usable one handed back, or a new one opened only after the
 * old one is closed. Two payable pages at once means two charges and two
 * bookings for one order, so every step here fails closed.
 */
const mockPrepare = jest.fn();
const mockSessionCreate = jest.fn();
const mockSessionExpire = jest.fn();
const mockSessionRetrieve = jest.fn();
const mockQuoteUpdate = jest.fn();
const mockQuoteFind = jest.fn();
const mockQuoteUpdateOne = jest.fn();
const mockGuard = jest.fn();
const mockAcquireLease = jest.fn();
const mockReleaseLease = jest.fn();

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
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockSessionCreate(...args),
        expire: (...args: unknown[]) => mockSessionExpire(...args),
        retrieve: (...args: unknown[]) => mockSessionRetrieve(...args),
      },
    },
  })),
}));
jest.mock('@/lib/security/guardPaymentEndpoint', () => ({
  guardPaymentEndpoint: (...args: unknown[]) => mockGuard(...args),
}));
jest.mock('@/lib/checkout/prepareStripeCheckout', () => ({
  prepareStripeCheckout: (...args: unknown[]) => mockPrepare(...args),
  checkoutInputErrorResponse: jest.fn(() => null),
}));
jest.mock('@/lib/checkout/checkoutAttemptLease', () => ({
  acquireCheckoutAttemptLease: (...args: unknown[]) => mockAcquireLease(...args),
  releaseCheckoutAttemptLease: (...args: unknown[]) => mockReleaseLease(...args),
}));
jest.mock('@/lib/models/CheckoutPaymentQuote', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: (...args: unknown[]) => mockQuoteUpdate(...args),
    find: (...args: unknown[]) => mockQuoteFind(...args),
    updateOne: (...args: unknown[]) => mockQuoteUpdateOne(...args),
  },
}));

import { POST } from '@/app/api/checkout/create-checkout-session/route';

const request = () => ({ method: 'POST', headers: { get: () => null } }) as unknown as Request;

const BINDING = 'a'.repeat(64);
const OTHER_BINDING = 'b'.repeat(64);

const prepared = {
  tenantId: 'brand-one',
  tenantName: 'Brand One',
  tenantDomain: 'https://brand-one.example',
  paymentExperience: 'hosted',
  checkoutAttemptId: '123e4567-e89b-42d3-a456-426614174000',
  quoteBinding: BINDING,
  customer: { email: 'guest@example.com', firstName: 'Guest', lastName: 'Customer', phone: '+201000000000' },
  cart: [{ title: 'Nile Cruise' }],
  cartSummary: [{ t: '507f1f77bcf86cd799439011' }],
  pricing: { subtotal: 100, serviceFee: 3, tax: 5, discount: 0, total: 108, currency: 'USD' },
  locale: 'en',
  amountMinor: 10_800,
  currency: 'usd',
  metadata: { tenant_id: 'brand-one', checkout_experience: 'hosted', quote_binding: BINDING },
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

const storedQuote = (overrides: Record<string, unknown> = {}) => ({
  _id: 'quote-1',
  tenantId: prepared.tenantId,
  quoteBinding: BINDING,
  checkoutAttemptId: prepared.checkoutAttemptId,
  checkoutSessionId: 'cs_test_hosted_previous_1',
  paymentExperience: 'hosted',
  status: 'open',
  pricing: prepared.pricing,
  ...overrides,
});

const idempotencyKeyOf = (call: unknown[]) => (call[1] as { idempotencyKey: string }).idempotencyKey;

describe('POST /api/checkout/create-checkout-session', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGuard.mockResolvedValue(null);
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
    mockPrepare.mockResolvedValue(prepared);
    mockAcquireLease.mockResolvedValue('lease-token-1');
    mockReleaseLease.mockResolvedValue(undefined);
    mockQuoteFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    mockQuoteUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    mockSessionCreate.mockResolvedValue({
      id: 'cs_test_hosted_1234567890',
      status: 'open',
      url: 'https://checkout.stripe.com/c/pay/cs_test_hosted_1234567890',
      expires_at: nowSeconds() + 1860,
    });
    mockSessionExpire.mockResolvedValue({ id: 'cs_test_hosted_previous_1', status: 'expired', payment_status: 'unpaid' });
    mockSessionRetrieve.mockResolvedValue({ id: 'cs_test_hosted_previous_1', status: 'expired', payment_status: 'unpaid' });
    mockQuoteUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue({ checkoutSessionId: 'cs_test_hosted_1234567890', checkoutAttemptId: prepared.checkoutAttemptId }) });
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    jest.restoreAllMocks();
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
    }), { idempotencyKey: expect.any(String) });
    // Per-attempt, per-page key: the old fixed key made every second attempt a
    // Stripe idempotency_error for 24 hours.
    expect(idempotencyKeyOf(mockSessionCreate.mock.calls[0])).toMatch(
      new RegExp(`^network-hosted-${prepared.tenantId}-${prepared.checkoutAttemptId}-${BINDING.slice(0, 24)}-[0-9a-f]{16}$`),
    );
    expect(mockQuoteUpdate).toHaveBeenCalledWith(
      { tenantId: prepared.tenantId, quoteBinding: BINDING, status: { $in: ['open', 'expired', 'superseded'] } },
      expect.objectContaining({
        $set: expect.objectContaining({
          checkoutSessionId: 'cs_test_hosted_1234567890',
          status: 'open',
          checkoutExpiresAt: expect.any(Date),
        }),
        $setOnInsert: expect.objectContaining({ paymentExperience: 'hosted' }),
      }),
      { upsert: true, new: true },
    );
  });

  it('records the true page deadline separately from the retention deadline', async () => {
    const expiresAt = nowSeconds() + 1860;
    mockSessionCreate.mockResolvedValueOnce({
      id: 'cs_test_hosted_1234567890',
      status: 'open',
      url: 'https://checkout.stripe.com/c/pay/cs_test_hosted_1234567890',
      expires_at: expiresAt,
    });

    await POST(request());

    const update = mockQuoteUpdate.mock.calls[0][1] as { $set: { checkoutExpiresAt: Date; expiresAt: Date } };
    expect(update.$set.checkoutExpiresAt.getTime()).toBe(expiresAt * 1000);
    expect(update.$set.expiresAt.getTime()).toBe(expiresAt * 1000 + 7 * 24 * 60 * 60 * 1000);
  });

  it('hands back the still-usable page instead of opening a second one', async () => {
    mockQuoteFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([storedQuote()]) });
    mockSessionRetrieve.mockResolvedValue({
      id: 'cs_test_hosted_previous_1',
      status: 'open',
      payment_status: 'unpaid',
      amount_total: 10_800,
      currency: 'usd',
      url: 'https://checkout.stripe.com/c/pay/cs_test_hosted_previous_1',
      expires_at: nowSeconds() + 1800,
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      sessionId: 'cs_test_hosted_previous_1',
      url: 'https://checkout.stripe.com/c/pay/cs_test_hosted_previous_1',
    });
    expect(mockSessionCreate).not.toHaveBeenCalled();
    expect(mockSessionExpire).not.toHaveBeenCalled();
  });

  it('gives every new page its own idempotency key', async () => {
    await POST(request());
    mockSessionCreate.mockResolvedValueOnce({
      id: 'cs_test_hosted_second_1',
      status: 'open',
      url: 'https://checkout.stripe.com/c/pay/cs_test_hosted_second_1',
      expires_at: nowSeconds() + 1860,
    });
    mockQuoteUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue({ checkoutSessionId: 'cs_test_hosted_second_1', checkoutAttemptId: prepared.checkoutAttemptId }) });

    await POST(request());

    expect(mockSessionCreate).toHaveBeenCalledTimes(2);
    expect(idempotencyKeyOf(mockSessionCreate.mock.calls[0]))
      .not.toBe(idempotencyKeyOf(mockSessionCreate.mock.calls[1]));
  });

  it('closes a page that is too close to its deadline before opening a new one', async () => {
    mockQuoteFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([storedQuote()]) });
    mockSessionRetrieve.mockResolvedValue({
      id: 'cs_test_hosted_previous_1',
      status: 'open',
      payment_status: 'unpaid',
      amount_total: 10_800,
      currency: 'usd',
      url: 'https://checkout.stripe.com/c/pay/cs_test_hosted_previous_1',
      expires_at: nowSeconds() + 120,
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockSessionExpire).toHaveBeenCalledWith('cs_test_hosted_previous_1');
    expect(mockSessionCreate).toHaveBeenCalledTimes(1);
    // Marked superseded in our records BEFORE Stripe is asked to close it, so a
    // crash between the two never leaves an untracked payable page.
    const supersedeCall = mockQuoteUpdateOne.mock.invocationCallOrder[0];
    const expireCall = mockSessionExpire.mock.invocationCallOrder[0];
    expect(supersedeCall).toBeLessThan(expireCall);
    expect(mockQuoteUpdateOne).toHaveBeenCalledWith(
      { _id: 'quote-1', tenantId: prepared.tenantId, status: 'open' },
      expect.objectContaining({ $set: { status: 'superseded' } }),
    );
  });

  it('closes the page for the old cart before opening the page for the edited cart', async () => {
    mockQuoteFind.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        storedQuote({ _id: 'quote-old', quoteBinding: OTHER_BINDING, checkoutSessionId: 'cs_test_hosted_oldcart_1' }),
      ]),
    });
    mockSessionExpire.mockResolvedValue({ id: 'cs_test_hosted_oldcart_1', status: 'expired', payment_status: 'unpaid' });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockSessionExpire).toHaveBeenCalledWith('cs_test_hosted_oldcart_1');
    expect(mockSessionExpire.mock.invocationCallOrder[0])
      .toBeLessThan(mockSessionCreate.mock.invocationCallOrder[0]);
  });

  it('refuses without opening a page when the stored page is already paid', async () => {
    mockQuoteFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([storedQuote({ status: 'paid' })]) });

    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ success: false, code: 'CHECKOUT_ALREADY_PAID' });
    expect(mockSessionCreate).not.toHaveBeenCalled();
    expect(mockSessionExpire).not.toHaveBeenCalled();
  });

  it('tells a refunded guest to start a new booking instead of claiming it is paid', async () => {
    mockQuoteFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([storedQuote({ status: 'refunded' })]) });

    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: 'CHECKOUT_REFUNDED',
      message: expect.stringContaining('refunded'),
    });
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('refuses without opening a page when Stripe refuses to close a completed page', async () => {
    mockQuoteFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([storedQuote()]) });
    mockSessionRetrieve.mockResolvedValue({
      id: 'cs_test_hosted_previous_1',
      status: 'complete',
      payment_status: 'paid',
      amount_total: 10_800,
      currency: 'usd',
      url: 'https://checkout.stripe.com/c/pay/cs_test_hosted_previous_1',
      expires_at: nowSeconds() + 120,
    });
    mockSessionExpire.mockRejectedValue(Object.assign(
      new Error('You cannot expire a Checkout Session that is already complete.'),
      { type: 'StripeInvalidRequestError' },
    ));

    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ success: false, code: 'CHECKOUT_ALREADY_PAID' });
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('opens no page when closing the old one fails for any other reason', async () => {
    mockQuoteFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([storedQuote()]) });
    mockSessionRetrieve.mockResolvedValue({
      id: 'cs_test_hosted_previous_1',
      status: 'open',
      payment_status: 'unpaid',
      amount_total: 10_800,
      currency: 'usd',
      url: 'https://checkout.stripe.com/c/pay/cs_test_hosted_previous_1',
      expires_at: nowSeconds() + 120,
    });
    mockSessionExpire.mockRejectedValue(Object.assign(new Error('Stripe is down'), { type: 'StripeAPIError' }));

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('asks the guest to retry when another request holds the checkout lease', async () => {
    mockAcquireLease.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: 'CHECKOUT_PREPARING',
      message: expect.stringContaining('being prepared'),
    });
    expect(mockSessionCreate).not.toHaveBeenCalled();
    expect(mockQuoteFind).not.toHaveBeenCalled();
  });

  it('always releases the checkout lease it took', async () => {
    await POST(request());
    expect(mockReleaseLease).toHaveBeenCalledWith(prepared.tenantId, prepared.checkoutAttemptId, 'lease-token-1');

    mockSessionCreate.mockRejectedValueOnce(new Error('Stripe exploded'));
    await POST(request());
    expect(mockReleaseLease).toHaveBeenCalledTimes(2);
  });

  it('expires the Stripe Session when durable quote persistence fails', async () => {
    mockQuoteUpdate.mockReturnValueOnce({ lean: jest.fn().mockRejectedValue(new Error('database unavailable')) });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(mockSessionExpire).toHaveBeenCalledWith('cs_test_hosted_1234567890');
  });

  it('never overwrites a paid quote: a reopen that finds one closes the new page', async () => {
    mockQuoteUpdate.mockReturnValueOnce({
      lean: jest.fn().mockRejectedValue(Object.assign(new Error('E11000 duplicate key error'), { code: 11000 })),
    });

    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ success: false, code: 'CHECKOUT_ALREADY_SETTLED' });
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

  it('refuses without creating a Stripe Session when the abuse limiter says no', async () => {
    // Unauthenticated payment endpoint: the limiter is the only thing standing
    // between the public and unbounded PaymentIntent/Session creation.
    mockGuard.mockResolvedValue({ status: 429, headers: { 'Retry-After': '600' }, json: async () => ({ success: false }) });

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(mockSessionCreate).not.toHaveBeenCalled();
    expect(mockPrepare).not.toHaveBeenCalled();
    expect(mockAcquireLease).not.toHaveBeenCalled();
  });
});
