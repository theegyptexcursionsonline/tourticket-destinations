/**
 * Hosted Checkout has more than one page per shopping attempt: a page we
 * replaced can still be paid, and a page for an edited cart can be paid after
 * the guest reopened checkout. The webhook is the only place that sees those
 * payments, so it must book the first one and refund the second — never leave a
 * guest charged without a booking, and never write two bookings for one order.
 */
const mockConstructEvent = jest.fn();
const mockRefundCreate = jest.fn();
const mockBookingCreate = jest.fn();
const mockBookingFind = jest.fn();
const mockTourFindOne = jest.fn();
const mockUserFindOne = jest.fn();
const mockQuoteFindOne = jest.fn();
const mockQuoteUpdateOne = jest.fn();
const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

jest.mock('next/headers', () => ({ headers: async () => ({ get: () => 'sig_test' }) }));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number } = {}) => ({ status: init.status || 200, json: async () => body }),
  },
}));
jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    webhooks: { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) },
    refunds: { create: (...args: unknown[]) => mockRefundCreate(...args) },
  })),
}));
jest.mock('mongoose', () => ({
  __esModule: true,
  default: { startSession: async () => mockSession },
}));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/models/Booking', () => ({
  __esModule: true,
  default: {
    find: (...args: unknown[]) => mockBookingFind(...args),
    findOne: () => ({ lean: async () => null, session: async () => null }),
    create: (...args: unknown[]) => mockBookingCreate(...args),
    updateMany: () => ({ catch: () => undefined }),
  },
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => mockTourFindOne(...args), findById: jest.fn() },
}));
jest.mock('@/lib/models/user', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => mockUserFindOne(...args), create: jest.fn() },
}));
jest.mock('@/lib/models/CheckoutPaymentQuote', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockQuoteFindOne(...args),
    updateOne: (...args: unknown[]) => mockQuoteUpdateOne(...args),
  },
}));
jest.mock('@/lib/models/Availability', () => ({
  __esModule: true,
  default: { findOne: () => ({ session: async () => null }) },
}));
jest.mock('@/lib/models/StopSale', () => ({
  __esModule: true,
  default: { exists: () => ({ session: async () => null }) },
}));
jest.mock('@/lib/tenant', () => ({
  getTenantConfigCached: async () => ({
    name: 'Brand One',
    domain: 'brand-one.example.com',
    payments: { currencySymbol: '$' },
    contact: { email: 'ops@example.com' },
  }),
}));
jest.mock('@/lib/email/emailService', () => ({
  EmailService: {
    sendBookingConfirmation: jest.fn(async () => undefined),
    sendAdminBookingAlert: jest.fn(async () => undefined),
  },
}));
jest.mock('@/lib/bookings/checkoutNotificationDelivery', () => ({
  deliverCheckoutNotifications: async ({ sendCustomer, sendOperator }: { sendCustomer: () => Promise<void>; sendOperator: () => Promise<void> }) => {
    await sendCustomer();
    await sendOperator();
  },
}));
jest.mock('@/lib/security/checkoutPricing', () => ({ calculateCheckoutPricing: jest.fn() }));

import { POST } from '@/app/api/webhooks/stripe/route';
import { packCartMetadata } from '@/lib/checkout/cartMetadata';

const TOUR_ID = '507f1f77bcf86cd799439011';
const ATTEMPT_ID = '123e4567-e89b-42d3-a456-426614174000';
const BINDING = 'a'.repeat(64);
const OTHER_BINDING = 'b'.repeat(64);

const tour = {
  _id: TOUR_ID,
  title: 'Nile Cruise',
  discountPrice: 100,
  bookingOptions: [{ id: 'legacy', type: 'Per Person', label: 'Standard', price: 100 }],
  toObject() { return { ...this }; },
};

// One adult on the legacy option: 100 + 3% fee + 5% tax.
const SUBTOTAL = 100;
const TOTAL = Number((SUBTOTAL + 3 + 5).toFixed(2));
const AMOUNT_MINOR = Math.round(TOTAL * 100);

const cartSummary = [{
  aqv: 1, i: 0, t: TOUR_ID, d: '2026-12-01', tm: '10:00',
  a: 1, c: 0, n: 0, bp: 100, bo: 'legacy', ok: '', bot: 'Standard', boty: 'Per Person', ao: [],
}];

const hostedMetadata = (binding = BINDING) => ({
  has_booking_data: 'true',
  tenant_id: 'brand-one',
  customer_email: 'qa@example.com',
  customer_first_name: 'QA',
  customer_last_name: 'Guest',
  ...packCartMetadata(cartSummary),
  pricing_total: String(TOTAL),
  pricing_subtotal: String(SUBTOTAL),
  pricing_service_fee: '3',
  pricing_tax: '5',
  pricing_discount: '0',
  pricing_currency: 'USD',
  discount_code: 'none',
  checkout_experience: 'hosted',
  checkout_attempt_id: ATTEMPT_ID,
  quote_binding: binding,
  tour_count: '1',
});

const quote = (overrides: Record<string, unknown> = {}) => ({
  _id: 'quote-current',
  tenantId: 'brand-one',
  quoteBinding: BINDING,
  checkoutAttemptId: ATTEMPT_ID,
  checkoutSessionId: 'cs_test_hosted_current',
  paymentExperience: 'hosted',
  status: 'open',
  pricing: { subtotal: SUBTOTAL, serviceFee: 3, tax: 5, discount: 0, total: TOTAL, currency: 'USD' },
  cartSummary,
  ...overrides,
});

const firePaymentIntent = async (id: string, binding = BINDING) => {
  const paymentIntent = {
    id,
    status: 'succeeded',
    amount: AMOUNT_MINOR,
    currency: 'usd',
    metadata: hostedMetadata(binding),
  };
  mockConstructEvent.mockReturnValue({ type: 'payment_intent.succeeded', data: { object: paymentIntent } });
  const response = await POST({ text: async () => '{}' } as unknown as Request);
  return { response, paymentIntent };
};

const fireSessionExpired = async (sessionId: string, binding = BINDING) => {
  mockConstructEvent.mockReturnValue({
    type: 'checkout.session.expired',
    data: {
      object: {
        id: sessionId,
        metadata: { checkout_experience: 'hosted', tenant_id: 'brand-one', quote_binding: binding },
      },
    },
  });
  return POST({ text: async () => '{}' } as unknown as Request);
};

describe('Stripe webhook — hosted checkout lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit';
    mockBookingFind.mockResolvedValue([]);
    mockTourFindOne.mockResolvedValue(tour);
    mockUserFindOne.mockResolvedValue({ _id: 'user-1', email: 'qa@example.com', firstName: 'QA', lastName: 'Guest' });
    mockBookingCreate.mockImplementation(async ([doc]: [Record<string, unknown>]) => [{ ...doc, _id: 'booking-1' }]);
    mockQuoteUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    mockRefundCreate.mockResolvedValue({ id: 're_test_1' });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('books a payment taken on a page we had already replaced', async () => {
    // The guest paid on the superseded page; nothing else was paid for this
    // attempt, so this payment is the order.
    mockQuoteFindOne.mockImplementation((filter: Record<string, unknown>) => ({
      lean: async () => (filter.status === 'paid' ? null : quote({ status: 'superseded' })),
    }));

    const { response } = await firePaymentIntent('pi_test_superseded');

    expect(response.status).toBe(200);
    expect(mockBookingCreate).toHaveBeenCalledTimes(1);
    expect(mockRefundCreate).not.toHaveBeenCalled();
    expect(mockQuoteUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'quote-current', tenantId: 'brand-one' }),
      { $set: { status: 'paid', paymentIntentId: 'pi_test_superseded' } },
    );
  });

  it('refunds a second payment on the same checkout attempt instead of booking it twice', async () => {
    mockQuoteFindOne.mockImplementation((filter: Record<string, unknown>) => ({
      lean: async () => (filter.status === 'paid'
        // The first page of this attempt is already settled by another payment.
        ? quote({ _id: 'quote-first', status: 'paid', paymentIntentId: 'pi_test_first' })
        : quote({ _id: 'quote-second', quoteBinding: OTHER_BINDING, status: 'superseded' })),
    }));

    const { response } = await firePaymentIntent('pi_test_second', OTHER_BINDING);

    expect(response.status).toBe(200);
    expect(mockBookingCreate).not.toHaveBeenCalled();
    expect(mockRefundCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_test_second' }),
      { idempotencyKey: 'network-hosted-refund-pi_test_second' },
    );
    // The winning payment's quote must keep its paid state.
    expect(mockQuoteUpdateOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'quote-first' }),
      expect.anything(),
    );
  });

  it('never relabels a quote another payment paid when refunding this one', async () => {
    mockQuoteFindOne.mockImplementation((filter: Record<string, unknown>) => ({
      lean: async () => (filter.status === 'paid'
        ? quote({ status: 'paid', paymentIntentId: 'pi_test_first' })
        : quote({ status: 'paid', paymentIntentId: 'pi_test_first' })),
    }));

    const { response } = await firePaymentIntent('pi_test_duplicate');

    expect(response.status).toBe(200);
    expect(mockBookingCreate).not.toHaveBeenCalled();
    expect(mockRefundCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_test_duplicate' }),
      { idempotencyKey: 'network-hosted-refund-pi_test_duplicate' },
    );
    const refundWrite = mockQuoteUpdateOne.mock.calls.find(
      (call) => (call[1] as { $set?: { status?: string } })?.$set?.status === 'refunded',
    );
    expect(refundWrite?.[0]).toMatchObject({
      $or: [{ status: { $ne: 'paid' } }, { paymentIntentId: 'pi_test_duplicate' }],
    });
  });

  it('an expired event for a superseded page cannot touch the current page', async () => {
    const response = await fireSessionExpired('cs_test_hosted_superseded');

    expect(response.status).toBe(200);
    expect(mockQuoteUpdateOne).toHaveBeenCalledWith(
      {
        tenantId: 'brand-one',
        quoteBinding: BINDING,
        checkoutSessionId: 'cs_test_hosted_superseded',
        status: 'open',
      },
      { $set: { status: 'expired' } },
    );
  });
});
