/** @jest-environment node */
const mockPrepare = jest.fn();
const mockRecheck = jest.fn();
const mockCreate = jest.fn();
jest.mock('@/lib/checkout/prepareStripeCheckout', () => ({ prepareStripeCheckout: (...args: unknown[]) => mockPrepare(...args), checkoutInputErrorResponse: () => null }));
jest.mock('@/lib/bookings/departureAdmission', () => ({ recheckPreparedDepartures: (...args: unknown[]) => mockRecheck(...args) }));
jest.mock('@/lib/security/guardPaymentEndpoint', () => ({ guardPaymentEndpoint: async () => null }));
jest.mock('@/lib/payments/paymentProviderPolicy', () => ({ resolveExecutablePaymentMethods: jest.fn() }));
jest.mock('stripe', () => ({ __esModule: true, default: jest.fn(() => ({ paymentIntents: { create: (...args: unknown[]) => mockCreate(...args) } })) }));
import { POST } from '@/app/api/checkout/create-payment-intent/route';
describe('payment-element departure recheck', () => {
  const prepared = { cart: [{ id: 'tour-one' }], tenantId: 'brand-one', amountMinor: 10000, currency: 'usd', tenantName: 'Brand', metadata: { departure_deadlines_utc: '[2000000000000]' }, checkoutAttemptId: 'attempt', quoteBinding: 'binding' };
  beforeEach(() => { jest.clearAllMocks(); process.env.STRIPE_SECRET_KEY = 'sk_test_mock'; mockPrepare.mockResolvedValue(prepared); mockRecheck.mockResolvedValue(undefined); mockCreate.mockResolvedValue({ id: 'pi_mock', client_secret: 'test_mock_only' }); });
  it('rechecks the authoritative prepared selection before creating payment', async () => {
    const result = await POST({} as Request);
    expect(result.status).toBe(200);
    expect(mockRecheck).toHaveBeenCalledWith(prepared.cart, prepared.tenantId, prepared.metadata);
    expect(mockRecheck.mock.invocationCallOrder[0]).toBeLessThan(mockCreate.mock.invocationCallOrder[0]);
  });
  it('fails closed with no Stripe effect when departure closes during preparation', async () => {
    mockRecheck.mockRejectedValueOnce(new Error('departure elapsed'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const result = await POST({} as Request);
      expect(result.status).toBe(500);
      expect(mockCreate).not.toHaveBeenCalled();
    } finally { error.mockRestore(); }
  });
});
