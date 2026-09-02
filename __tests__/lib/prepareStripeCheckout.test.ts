const mockDbConnect = jest.fn();
const mockGetTenant = jest.fn();
const mockGetTenantConfig = jest.fn();
const mockCalculatePricing = jest.fn();
const mockResolveMethods = jest.fn();

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: (...args: unknown[]) => mockDbConnect(...args) }));
jest.mock('@/lib/tenant', () => ({
  getTenantFromRequest: (...args: unknown[]) => mockGetTenant(...args),
  getTenantConfigCached: (...args: unknown[]) => mockGetTenantConfig(...args),
}));
jest.mock('@/lib/payments/paymentProviderPolicy', () => ({
  resolveExecutablePaymentMethods: (...args: unknown[]) => mockResolveMethods(...args),
}));
jest.mock('@/lib/security/checkoutPricing', () => ({
  calculateCheckoutPricing: (...args: unknown[]) => mockCalculatePricing(...args),
  checkoutFingerprint: jest.fn(() => 'f'.repeat(64)),
  checkoutCustomerRef: jest.fn(() => 'c'.repeat(64)),
}));

import { prepareStripeCheckout, StripeCheckoutInputError } from '@/lib/checkout/prepareStripeCheckout';

const checkoutAttemptId = '123e4567-e89b-42d3-a456-426614174000';
const body = {
  customer: { email: 'Guest@Example.com', firstName: 'Guest', lastName: 'Customer', phone: '+201000000000' },
  cart: [{ _id: '507f1f77bcf86cd799439011', quantity: 1, selectedDate: '2027-02-01' }],
  pricing: { total: 0.01 },
  checkoutAttemptId,
};
const request = (value: unknown) => ({
  headers: { get: () => null },
  text: async () => JSON.stringify(value),
}) as unknown as Request;

describe('prepareStripeCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTenant.mockResolvedValue('brand-one');
    mockGetTenantConfig.mockResolvedValue({
      name: 'Brand One', domain: 'brand-one.example',
      payments: { supportedPaymentMethods: ['card'], paymentExperience: 'hosted', currency: 'USD' },
    });
    mockResolveMethods.mockReturnValue(['card']);
    mockCalculatePricing.mockResolvedValue({
      cart: [{ ...body.cart[0], title: 'Verified Tour', price: 100, discountPrice: 100 }],
      pricing: { subtotal: 100, serviceFee: 3, tax: 5, discount: 0, total: 108 },
    });
  });

  it('ignores client totals and binds the hosted request to the authoritative tenant quote', async () => {
    const prepared = await prepareStripeCheckout(request(body), 'hosted');
    expect(mockCalculatePricing).toHaveBeenCalledWith(body.cart, 'brand-one', undefined);
    expect(prepared).toMatchObject({ tenantId: 'brand-one', amountMinor: 10_800, currency: 'usd', paymentExperience: 'hosted' });
    expect(prepared.customer.email).toBe('guest@example.com');
    expect(prepared.metadata).toMatchObject({ tenant_id: 'brand-one', pricing_total: '108', checkout_experience: 'hosted' });
    expect(prepared.quoteBinding).toMatch(/^[a-f0-9]{64}$/);
  });

  it('carries what the webhook needs to re-resolve each line — option id and departure — and the quoted guest prices only as diagnostics', async () => {
    mockCalculatePricing.mockResolvedValueOnce({
      cart: [{
        ...body.cart[0], title: 'Verified Tour', price: 100, discountPrice: 100,
        quantity: 2, childQuantity: 1, infantQuantity: 1, selectedTime: '14:00',
        selectedBookingOption: { id: 'slotted', title: 'Evening', type: 'Per Person', price: 100 },
        guestPrices: { adult: 100, child: 80, infant: 0 },
      }],
      pricing: { subtotal: 280, serviceFee: 8.4, tax: 14, discount: 0, total: 302.4 },
    });
    const prepared = await prepareStripeCheckout(request(body), 'hosted');
    expect(prepared.cartSummary[0]).toMatchObject({ bo: 'slotted', tm: '14:00', a: 2, c: 1, n: 1, gp: [100, 80, 0] });
    expect(prepared.amountMinor).toBe(30_240);
    // The packed metadata round-trips the re-resolution keys.
    const { unpackCartMetadata } = jest.requireActual('@/lib/checkout/cartMetadata');
    const packed = JSON.parse(unpackCartMetadata(prepared.metadata));
    expect(packed[0]).toMatchObject({ bo: 'slotted', tm: '14:00', gp: [100, 80, 0] });
  });

  it('a validated line without guest prices packs no gp key', async () => {
    const prepared = await prepareStripeCheckout(request(body), 'hosted');
    expect(prepared.cartSummary[0]).not.toHaveProperty('gp', expect.anything());
    expect(JSON.stringify(prepared.cartSummary[0])).not.toContain('"gp"');
  });

  it('fails closed when the route does not match the current tenant presentation', async () => {
    mockGetTenantConfig.mockResolvedValueOnce({
      name: 'Brand One', domain: 'brand-one.example',
      payments: { supportedPaymentMethods: ['card'], paymentExperience: 'inline', currency: 'USD' },
    });
    await expect(prepareStripeCheckout(request(body), 'hosted')).rejects.toMatchObject({
      status: 409, code: 'PAYMENT_EXPERIENCE_MISMATCH',
    } satisfies Partial<StripeCheckoutInputError>);
    expect(mockCalculatePricing).not.toHaveBeenCalled();
  });

  it('rejects checkout before pricing when card payment is disabled', async () => {
    mockResolveMethods.mockReturnValueOnce([]);
    await expect(prepareStripeCheckout(request(body), 'payment-element')).rejects.toMatchObject({
      status: 409, code: 'CARD_PAYMENT_DISABLED',
    } satisfies Partial<StripeCheckoutInputError>);
    expect(mockCalculatePricing).not.toHaveBeenCalled();
  });
});
