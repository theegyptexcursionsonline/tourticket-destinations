export {};
// A limiter must never take checkout down. When this guard was added it
// produced 500s under concurrency on the deployed sites that do not reproduce
// locally; a customer who cannot pay is a worse outcome than abuse that gets
// through, so an unexpected limiter failure lets the request proceed and is
// logged. A genuine refusal still returns 429.
const mockEnforce = jest.fn();
jest.mock('@/lib/security/distributedAbuseLimit', () => ({
  enforcePublicActionLimits: (...args: unknown[]) => mockEnforce(...args),
}));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) => ({
      status: init.status || 200, headers: init.headers || {}, json: async () => body,
    }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { guardPaymentEndpoint } = require('@/lib/security/guardPaymentEndpoint') as typeof import('@/lib/security/guardPaymentEndpoint');

const request = () => ({ headers: { get: () => null } }) as unknown as Request;

describe('payment endpoint guard', () => {
  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    mockEnforce.mockReset();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it('lets an allowed request through', async () => {
    mockEnforce.mockResolvedValue({ allowed: true, count: 1, limit: 30, retryAfterSeconds: 600 });
    expect(await guardPaymentEndpoint(request(), 'checkout-payment-intent')).toBeNull();
  });

  it('refuses a genuinely over-limit request with 429 and Retry-After', async () => {
    mockEnforce.mockResolvedValue({ allowed: false, count: 31, limit: 30, retryAfterSeconds: 42 });
    const response = await guardPaymentEndpoint(request(), 'checkout-payment-intent');
    expect(response).not.toBeNull();
    expect(response!.status).toBe(429);
    // The mocked NextResponse hands back a plain object, so read it as one
    // rather than through the DOM Headers type.
    const headers = response!.headers as unknown as Record<string, string>;
    expect(headers['Retry-After']).toBe('42');
  });

  it('allows the payment through — and logs — when the limiter itself fails', async () => {
    mockEnforce.mockRejectedValue(new Error('counter unavailable'));
    expect(await guardPaymentEndpoint(request(), 'checkout-payment-intent')).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    expect(String(errorSpy.mock.calls[0][0])).toContain('abuse-limit');
  });

  it('never lets a limiter failure surface as a 5xx to the customer', async () => {
    mockEnforce.mockRejectedValue(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));
    await expect(guardPaymentEndpoint(request(), 'checkout-session')).resolves.toBeNull();
  });
});
