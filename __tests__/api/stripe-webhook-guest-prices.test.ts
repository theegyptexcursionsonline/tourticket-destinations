/**
 * The Stripe webhook is the post-payment booking writer. New intents carry an
 * immutable server-created price snapshot; legacy intents re-resolve from the
 * stored tour. Both paths record adult/child/infant unit prices and require a
 * totalPrice equal to what Stripe actually charged.
 */
const mockConstructEvent = jest.fn();
const mockRefundCreate = jest.fn();
const mockBookingCreate = jest.fn();
const mockBookingFind = jest.fn();
const mockTourFindOne = jest.fn();
const mockUserFindOne = jest.fn();
const mockSendConfirmation = jest.fn();
const mockSendAdminAlert = jest.fn();
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
  default: { findOne: () => ({ lean: async () => null }), updateOne: jest.fn() },
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
  getTenantConfigCached: async () => ({ name: 'Brand One', payments: { currencySymbol: '$' }, contact: { email: 'ops@example.com' } }),
}));
jest.mock('@/lib/email/emailService', () => ({
  EmailService: {
    sendBookingConfirmation: (...args: unknown[]) => mockSendConfirmation(...args),
    sendAdminBookingAlert: (...args: unknown[]) => mockSendAdminAlert(...args),
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
import { optionSubtotal } from '@/lib/bookings/optionSubtotal';

const TOUR_ID = '507f1f77bcf86cd799439011';
const tour = {
  _id: TOUR_ID,
  title: 'Nile Cruise',
  discountPrice: 100,
  bookingOptions: [
    { id: 'legacy', type: 'Per Person', label: 'Standard', price: 100 },
    { id: 'priced', type: 'Per Person', label: 'Family', price: 100, guestPrices: { adult: 100, child: 70, infant: 15 } },
    {
      id: 'slotted', type: 'Per Person', label: 'Evening', price: 100,
      guestPrices: { adult: 100, child: 70, infant: 15 },
      timeSlots: [{ time: '14:00', guestPrices: { child: 80, infant: 0 } }],
    },
    { id: 'couple', type: 'Per Couple', label: 'Couple', price: 150, minCapacity: 2, maxCapacity: 4 },
  ],
  toObject() { return { ...this }; },
};

type Line = {
  bo: string;
  ok?: string;
  tm?: string;
  a: number;
  c: number;
  n: number;
  bp?: number;
  gp?: [number, number, number];
  bot?: string;
  boty?: string;
  us?: number;
  up?: number;
  aqv?: number;
  ao?: Array<Record<string, unknown>>;
};

function metadataFor(lines: Line[], pricing: { subtotal: number; total: number; discount?: number }) {
  const summary = lines.map((line, index) => ({
    i: index, t: TOUR_ID, d: '2099-05-01', tm: line.tm || '09:00',
    a: line.a, c: line.c, n: line.n,
    aqv: line.aqv,
    bp: line.bp ?? 100,
    gp: line.gp,
    bo: line.bo,
    ok: line.ok,
    bot: line.bot || 'Option',
    boty: line.boty || 'Per Person',
    us: line.us,
    up: line.up,
    ao: line.ao || [],
  }));
  return {
    has_booking_data: 'true',
    tenant_id: 'brand-one',
    customer_email: 'qa@example.com',
    customer_first_name: 'QA',
    customer_last_name: 'Guest',
    ...packCartMetadata(summary),
    pricing_total: String(pricing.total),
    pricing_subtotal: String(pricing.subtotal),
    pricing_service_fee: String(Number((pricing.subtotal * 0.03).toFixed(2))),
    pricing_tax: String(Number((pricing.subtotal * 0.05).toFixed(2))),
    pricing_discount: String(pricing.discount || 0),
    pricing_currency: 'USD',
    discount_code: 'none',
    checkout_experience: 'inline',
    tour_count: String(lines.length),
  };
}

const orderTotal = (subtotal: number, discount = 0) =>
  Number((subtotal + Number((subtotal * 0.03).toFixed(2)) + Number((subtotal * 0.05).toFixed(2)) - discount).toFixed(2));

async function fire(lines: Line[], subtotal: number, amountMinor?: number, discount = 0) {
  const total = orderTotal(subtotal, discount);
  const paymentIntent = {
    id: 'pi_test_guest',
    status: 'succeeded',
    amount: amountMinor ?? Math.round(total * 100),
    currency: 'usd',
    metadata: metadataFor(lines, { subtotal, total, discount }),
  };
  mockConstructEvent.mockReturnValue({ type: 'payment_intent.succeeded', data: { object: paymentIntent } });
  const response = await POST({ text: async () => '{}' } as unknown as Request);
  return { response, paymentIntent };
}

describe('Stripe webhook — guest prices on the recorded booking', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit';
    mockBookingFind.mockResolvedValue([]);
    mockTourFindOne.mockResolvedValue(tour);
    mockUserFindOne.mockResolvedValue({ _id: 'user-1', email: 'qa@example.com', firstName: 'QA', lastName: 'Guest' });
    mockBookingCreate.mockImplementation(async ([doc]: [Record<string, unknown>]) => [{ ...doc, _id: 'booking-1' }]);
    mockSendConfirmation.mockResolvedValue(undefined);
    mockSendAdminAlert.mockResolvedValue(undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const recorded = () => mockBookingCreate.mock.calls[0][0][0] as Record<string, any>;

  it('legacy tour: child half, infant free — the previous numbers, now recorded with unit prices', async () => {
    const legacySubtotal = optionSubtotal(tour.bookingOptions[0], 100, 2, 1, 1); // 250
    const { response, paymentIntent } = await fire([{ bo: 'legacy', a: 2, c: 1, n: 1 }], legacySubtotal);
    expect(response.status).toBe(200);
    expect(mockBookingCreate).toHaveBeenCalledTimes(1);
    expect(recorded()).toMatchObject({
      guestPrices: { adult: 100, child: 50, infant: 0 },
      adultGuests: 2, childGuests: 1, infantGuests: 1,
      totalPrice: 270,
      amountPaid: 270,
      selectedBookingOption: { id: 'legacy', type: 'Per Person', price: 100 },
    });
    expect(Math.round(recorded().totalPrice * 100)).toBe(paymentIntent.amount);
  });

  it('child-priced option: stored child and infant prices are charged and recorded', async () => {
    const { response, paymentIntent } = await fire([{ bo: 'priced', a: 2, c: 1, n: 1 }], 285);
    expect(response.status).toBe(200);
    expect(recorded()).toMatchObject({ guestPrices: { adult: 100, child: 70, infant: 15 }, totalPrice: 307.8 });
    expect(Math.round(recorded().totalPrice * 100)).toBe(paymentIntent.amount);
    // The confirmation email carries the recorded unit prices.
    expect(mockSendConfirmation.mock.calls[0][0].orderedItems[0].guestPrices).toEqual({ adult: 100, child: 70, infant: 15 });
  });

  it('per-departure override: the 14:00 departure prices children at 80 and infants free', async () => {
    const { response, paymentIntent } = await fire([{ bo: 'slotted', tm: '14:00', a: 2, c: 1, n: 1 }], 280);
    expect(response.status).toBe(200);
    expect(recorded()).toMatchObject({ guestPrices: { adult: 100, child: 80, infant: 0 }, totalPrice: 302.4, time: '14:00' });
    expect(Math.round(recorded().totalPrice * 100)).toBe(paymentIntent.amount);
  });

  it('ignores the adult price in the metadata — the stored tour is the authority', async () => {
    // bp says 1, the stored option says 100; the charge was for 100.
    const { response } = await fire([{ bo: 'legacy', a: 1, c: 0, n: 0, bp: 1 }], 100);
    expect(response.status).toBe(200);
    expect(recorded()).toMatchObject({ guestPrices: { adult: 100, child: 50, infant: 0 }, selectedBookingOption: { price: 100 }, totalPrice: 108 });
  });

  it('a whole-unit option is still charged per unit', async () => {
    // 4 participants in a couple option = 2 × 150.
    const { response } = await fire([{ bo: 'couple', a: 2, c: 1, n: 1 }], 300);
    expect(response.status).toBe(200);
    expect(recorded()).toMatchObject({ totalPrice: 324, selectedBookingOption: { type: 'Per Couple' } });
  });

  it('per-person add-ons are billed for the units chosen, clamped — never multiplied by the party', async () => {
    const addOn = { id: 'lunch', q: 1, p: 20, pg: true, t: 'Lunch' };
    // 285 tour + 1 × 20 lunch.
    const { response } = await fire([{ bo: 'priced', a: 2, c: 1, n: 1, aqv: 1, ao: [addOn] }], 305);
    expect(response.status).toBe(200);
    expect(recorded()).toMatchObject({ selectedAddOns: { lunch: 1 }, totalPrice: 329.4 });
  });

  it('charged ≠ recomputed: no booking is written, the mismatch is logged, the event is failed for retry', async () => {
    // The metadata describes the legacy option (250) but Stripe took the
    // child-priced amount (307.80) — the stored tour cannot explain the charge.
    const { response } = await fire([{ bo: 'legacy', a: 2, c: 1, n: 1 }], 250, 30780);
    expect(response.status).toBe(503);
    expect(mockBookingCreate).not.toHaveBeenCalled();
    expect(mockSession.startTransaction).not.toHaveBeenCalled();
    expect(mockSendConfirmation).not.toHaveBeenCalled();
    const mismatch = errorSpy.mock.calls.find((call) => String(call[0]).includes('PRICE MISMATCH'));
    expect(mismatch).toBeDefined();
    expect(mismatch![0]).toContain('Stripe charged 30780');
    expect(mismatch![0]).toContain('price this order at 27000');
    expect(mismatch![1].lines[0]).toMatchObject({ option: 'legacy', storedNow: { adult: 100, child: 50, infant: 0 } });
  });

  it('an option that no longer exists on the stored tour cannot be priced — no booking, retried', async () => {
    const { response } = await fire([{ bo: 'removed', a: 1, c: 0, n: 0 }], 100);
    expect(response.status).toBe(503);
    expect(mockBookingCreate).not.toHaveBeenCalled();
  });

  it('honours a paid immutable quote even if the option is removed after Stripe accepts payment', async () => {
    const { response, paymentIntent } = await fire([{
      bo: 'removed-after-payment',
      ok: 'removed-stable-key',
      bot: 'Paid private option',
      boty: 'Per Person',
      a: 2,
      c: 1,
      n: 1,
      bp: 120,
      gp: [120, 70, 5],
      aqv: 1,
    }], 315);
    expect(response.status).toBe(200);
    expect(recorded()).toMatchObject({
      guestPrices: { adult: 120, child: 70, infant: 5 },
      selectedBookingOption: {
        id: 'removed-after-payment',
        pricingKey: 'removed-stable-key',
        title: 'Paid private option',
        type: 'Per Person',
        price: 120,
      },
      totalPrice: 340.2,
    });
    expect(Math.round(recorded().totalPrice * 100)).toBe(paymentIntent.amount);
  });

  it('multi-line orders record totals that sum exactly to the charge', async () => {
    const { response, paymentIntent } = await fire([
      { bo: 'legacy', a: 2, c: 1, n: 1 },
      { bo: 'priced', a: 1, c: 1, n: 0 },
    ], 250 + 170);
    expect(response.status).toBe(200);
    expect(mockBookingCreate).toHaveBeenCalledTimes(2);
    const totals = mockBookingCreate.mock.calls.map((call) => Math.round(call[0][0].totalPrice * 100));
    expect(totals.reduce((sum, value) => sum + value, 0)).toBe(paymentIntent.amount);
    expect(mockBookingCreate.mock.calls[1][0][0].guestPrices).toEqual({ adult: 100, child: 70, infant: 15 });
  });
});
