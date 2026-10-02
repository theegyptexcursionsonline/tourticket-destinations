/** @jest-environment node */
const mockRetrieve = jest.fn();
const mockBookingFind = jest.fn();
const mockUserFind = jest.fn();
const mockUserCreate = jest.fn();
const mockSend = jest.fn();
const mockStartSession = jest.fn();
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: { find: (...args: unknown[]) => mockBookingFind(...args), create: jest.fn() } }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: { findOne: (...args: unknown[]) => mockUserFind(...args), create: (...args: unknown[]) => mockUserCreate(...args) } }));
jest.mock('@/lib/models/Discount', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Availability', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/StopSale', () => ({ __esModule: true, default: {} }));
jest.mock('mongoose', () => ({ __esModule: true, default: { startSession: (...args: unknown[]) => mockStartSession(...args) } }));
jest.mock('@/lib/email/emailService', () => ({ EmailService: { sendWelcomeEmail: (...args: unknown[]) => mockSend(...args), sendBookingConfirmation: (...args: unknown[]) => mockSend(...args) } }));
jest.mock('@/lib/tenant', () => ({ getTenantFromRequest: async () => 'brand-one', getTenantConfigCached: async () => ({ localization: { defaultTimezone: 'Africa/Cairo' }, payments: { supportedPaymentMethods: ['card'] } }) }));
jest.mock('@/lib/security/checkoutPricing', () => ({ calculateCheckoutPricing: async (cart: unknown) => ({ cart, pricing: { subtotal: 100, serviceFee: 3, tax: 5, discount: 0, total: 108 } }), checkoutCustomerRef: () => 'customer-bound', checkoutFingerprint: () => 'cart-bound', CheckoutPriceChangedError: class extends Error {} }));
jest.mock('@/lib/jwt', () => ({ signToken: async () => 'mock_receipt_only' }));
jest.mock('stripe', () => ({ __esModule: true, default: jest.fn(() => ({ paymentIntents: { retrieve: (...args: unknown[]) => mockRetrieve(...args) } })) }));
import { POST } from '@/app/api/checkout/route';
const deadline = Date.parse('2026-07-15T06:00:00Z');
const body = { cart: [{ id: 'tour-one', title: 'Tour', selectedDate: '2026-07-15', selectedTime: '09:00', quantity: 1 }], customer: { firstName: 'QA', lastName: 'Customer', email: 'qa@example.invalid' }, paymentMethod: 'card', paymentDetails: { paymentIntentId: 'pi_owned' } };
const request = () => ({ json: async () => body }) as Request;
describe('MT paid callback departure processing', () => {
  beforeEach(() => {
    jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(deadline);
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    mockRetrieve.mockResolvedValue({ id: 'pi_owned', status: 'succeeded', amount: 10800, currency: 'usd', latest_charge: { status: 'succeeded', paid: true, refunded: false }, metadata: { has_booking_data: 'true', tenant_id: 'brand-one', customer_ref: 'customer-bound', pricing_currency: 'USD', checkout_fingerprint: 'cart-bound', tour_count: '1', departure_deadlines_utc: JSON.stringify([deadline]), discount_code: 'none' } });
    mockBookingFind.mockReturnValue({ lean: async () => [] });
  });
  afterEach(() => jest.useRealTimers());
  it('returns truthful processing after cutoff with no new user, booking transaction, or mail', async () => {
    const response = await POST(request()); const result = await response.json();
    expect(response.status).toBe(202); expect(result.status).toBe('processing'); expect(result.success).toBeUndefined();
    expect(mockUserFind).not.toHaveBeenCalled(); expect(mockUserCreate).not.toHaveBeenCalled(); expect(mockStartSession).not.toHaveBeenCalled(); expect(mockSend).not.toHaveBeenCalled();
  });
  it('retains an already-completed owned booking replay after departure', async () => {
    mockBookingFind.mockReturnValue({ lean: async () => [{ _id: 'booking-one', bookingReference: 'OWNED-BOOKING', tour: 'tour-one', dateString: '2026-07-15', time: '09:00', adultGuests: 1, status: 'Confirmed', paymentStatus: 'paid', totalPrice: 108, amountPaid: 108 }] });
    const response = await POST(request()); const result = await response.json();
    expect(response.status).toBe(200); expect(result.success).toBe(true); expect(result.duplicate).toBe(true); expect(result.bookingId).toBe('OWNED-BOOKING');
    expect(mockUserCreate).not.toHaveBeenCalled(); expect(mockStartSession).not.toHaveBeenCalled(); expect(mockSend).not.toHaveBeenCalled();
  });
  it.each([{ paymentItemIndex: 9 }, { tour: 'wrong-tour' }, { time: '10:00' }, { adultGuests: 2 }])('defers mismatched replay %j', async (mismatch) => {
    mockBookingFind.mockReturnValue({ lean: async () => [{ _id: 'booking-one', tour: 'tour-one', dateString: '2026-07-15', time: '09:00', adultGuests: 1, status: 'Confirmed', paymentStatus: 'paid', totalPrice: 108, amountPaid: 108, ...mismatch }] });
    const response = await POST(request()); expect(response.status).toBe(202); expect((await response.json()).success).toBeUndefined(); expect(mockUserCreate).not.toHaveBeenCalled();
  });
  it('does not report a Pending or unpaid existing row as a completed booking', async () => {
    mockBookingFind.mockReturnValue({ lean: async () => [{ _id: 'booking-one', bookingReference: 'OWNED-BOOKING', status: 'Pending', paymentStatus: 'pending', totalPrice: 108, amountPaid: 0 }] });
    const response = await POST(request());
    expect(response.status).toBe(202);
    expect((await response.json()).success).toBeUndefined();
    expect(mockUserCreate).not.toHaveBeenCalled();
    expect(mockStartSession).not.toHaveBeenCalled();
  });
  it('does not defer an unrelated payment as an authorized processing response', async () => {
    const intent = await mockRetrieve(); intent.metadata.customer_ref = 'another-customer'; mockRetrieve.mockResolvedValue(intent);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try { const response = await POST(request()); expect(response.status).not.toBe(202); expect(mockBookingFind).not.toHaveBeenCalled(); expect(mockUserCreate).not.toHaveBeenCalled(); } finally { error.mockRestore(); }
  });
});
