jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: ResponseInit = {}) => ({
      status: init.status ?? 200,
      headers: new Headers(init.headers),
      json: async () => body,
    }),
  },
}));

import { GET } from '../route';

const originalEnv = { ...process.env };

describe('GET /api/v1/revenue/readiness', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns only non-secret readiness posture and disables caching', async () => {
    const primarySecret = 'a'.repeat(32);
    const secondarySecret = 'b'.repeat(32);
    const canaryTourId = '68dada7e6617c4b6defc34b5';

    process.env.REVENUEPILOT_HMAC_KEYS = `primary:${primarySecret},secondary:${secondarySecret}`;
    process.env.REVENUEPILOT_HMAC_SCOPES = 'primary=read|write,secondary=read|write';
    process.env.REVENUEPILOT_HMAC_TENANTS = 'primary=default,secondary=default';
    process.env.REVENUEPILOT_ALLOWED_TOUR_IDS = canaryTourId;
    process.env.REVENUEPILOT_MAX_WRITE_PERCENT = '5';
    process.env.REVENUEPILOT_PRICING_API_ENABLED = 'false';
    process.env.CRON_SECRET = 'cron-secret-for-pricing-readiness-route-test';

    const response = await GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toMatchObject({
      status: 'disabled',
      productionCanaryPrerequisitesConfigured: true,
      checks: { pricingProjectionRecoveryConfigured: true },
    });
    expect(Object.values(body.checks).every((value) => typeof value === 'boolean')).toBe(true);
    expect(serialized).not.toContain(primarySecret);
    expect(serialized).not.toContain(secondarySecret);
    expect(serialized).not.toContain(canaryTourId);
  });
});
