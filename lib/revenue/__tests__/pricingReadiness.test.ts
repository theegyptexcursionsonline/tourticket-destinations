import { revenuePilotPricingReadiness } from '@/lib/revenue/pricingReadiness';

const tourId = '68dada7e6617c4b6defc34b5';
const original = { ...process.env };

describe('RevenuePilot pricing readiness posture', () => {
  afterEach(() => {
    process.env = { ...original };
  });

  it('reports only booleans and stays disabled when machine/canary configuration is absent', () => {
    delete process.env.REVENUEPILOT_HMAC_KEYS;
    delete process.env.REVENUEPILOT_HMAC_SCOPES;
    delete process.env.REVENUEPILOT_HMAC_TENANTS;
    delete process.env.REVENUEPILOT_ALLOWED_TOUR_IDS;
    delete process.env.CRON_SECRET;
    delete process.env.REVENUEPILOT_COMMISSIONING_ENABLED;
    delete process.env.REVENUEPILOT_COMMISSIONING_CONFIRMATION;
    delete process.env.REVENUEPILOT_COMMISSIONING_TARGET;
    delete process.env.REVENUEPILOT_COMMISSIONING_NOT_AFTER;
    process.env.REVENUEPILOT_PRICING_API_ENABLED = 'false';
    const result = revenuePilotPricingReadiness(process.env);
    expect(result).toEqual({
      status: 'disabled',
      commissioningStatus: 'disabled',
      productionCanaryPrerequisitesConfigured: false,
      checks: {
        pricingApiEnabled: false,
        hmacKeysConfigured: false,
        dualHmacKeysConfigured: false,
        readScopeConfigured: false,
        writeScopeConfigured: false,
        tenantBindingsConfigured: false,
        tourAllowlistValid: true,
        tourAllowlistEmpty: true,
        exactOneTourCanaryConfigured: false,
        maximumMovementSafe: true,
        pricingProjectionRecoveryConfigured: false,
        commissioningRequested: false,
        commissioningExactTargetConfigured: false,
        commissioningWindowActive: false,
      },
    });
    expect(JSON.stringify(result)).not.toContain(tourId);
  });

  it('recognizes a disabled but fully staged one-tour canary without exposing identifiers', () => {
    process.env.REVENUEPILOT_HMAC_KEYS = `primary:${'a'.repeat(32)},secondary:${'b'.repeat(32)}`;
    process.env.REVENUEPILOT_HMAC_SCOPES = 'primary=read|write,secondary=read|write';
    process.env.REVENUEPILOT_HMAC_TENANTS = 'primary=default,secondary=default';
    process.env.REVENUEPILOT_ALLOWED_TOUR_IDS = tourId;
    process.env.REVENUEPILOT_MAX_WRITE_PERCENT = '5';
    process.env.REVENUEPILOT_PRICING_API_ENABLED = 'false';
    process.env.CRON_SECRET = 'cron-secret-for-pricing-readiness-tests';
    const result = revenuePilotPricingReadiness(process.env);
    expect(result.status).toBe('disabled');
    expect(result.productionCanaryPrerequisitesConfigured).toBe(true);
    expect(result.checks).toMatchObject({ pricingApiEnabled: false, exactOneTourCanaryConfigured: true, maximumMovementSafe: true, pricingProjectionRecoveryConfigured: true });
    expect(JSON.stringify(result)).not.toContain(tourId);
  });

  it('requires two well-formed keys for rotation-safe canary staging', () => {
    process.env.REVENUEPILOT_HMAC_KEYS = `primary:${'a'.repeat(32)},${'b'.repeat(40)}`;
    process.env.REVENUEPILOT_HMAC_SCOPES = 'primary=read|write';
    process.env.REVENUEPILOT_HMAC_TENANTS = 'primary=default';
    process.env.REVENUEPILOT_ALLOWED_TOUR_IDS = tourId;
    process.env.CRON_SECRET = 'cron-secret-for-pricing-readiness-tests';
    const result = revenuePilotPricingReadiness(process.env);
    expect(result.productionCanaryPrerequisitesConfigured).toBe(false);
    expect(result.checks).toMatchObject({ hmacKeysConfigured: true, dualHmacKeysConfigured: false });
  });

  it('fails the prerequisites for malformed allowlists or movement above five percent', () => {
    process.env.REVENUEPILOT_ALLOWED_TOUR_IDS = '*';
    process.env.REVENUEPILOT_MAX_WRITE_PERCENT = '6';
    const result = revenuePilotPricingReadiness(process.env);
    expect(result.productionCanaryPrerequisitesConfigured).toBe(false);
    expect(result.checks).toMatchObject({ tourAllowlistValid: false, maximumMovementSafe: false });
  });

  it('fails canary prerequisites when the projection recovery schedule cannot authenticate', () => {
    process.env.REVENUEPILOT_HMAC_KEYS = `primary:${'a'.repeat(32)},secondary:${'b'.repeat(32)}`;
    process.env.REVENUEPILOT_HMAC_SCOPES = 'primary=read|write,secondary=read|write';
    process.env.REVENUEPILOT_HMAC_TENANTS = 'primary=default,secondary=default';
    process.env.REVENUEPILOT_ALLOWED_TOUR_IDS = tourId;
    delete process.env.CRON_SECRET;
    const result = revenuePilotPricingReadiness(process.env);
    expect(result.productionCanaryPrerequisitesConfigured).toBe(false);
    expect(result.checks.pricingProjectionRecoveryConfigured).toBe(false);
  });

  it('fails closed when any configured machine key lacks an explicit tenant binding', () => {
    process.env.REVENUEPILOT_HMAC_KEYS = `primary:${'a'.repeat(32)},secondary:${'b'.repeat(32)}`;
    process.env.REVENUEPILOT_HMAC_SCOPES = 'primary=read|write,secondary=read|write';
    process.env.REVENUEPILOT_HMAC_TENANTS = 'primary=default';
    process.env.REVENUEPILOT_ALLOWED_TOUR_IDS = tourId;
    process.env.CRON_SECRET = 'cron-secret-for-pricing-readiness-tests';
    const result = revenuePilotPricingReadiness(process.env);
    expect(result.productionCanaryPrerequisitesConfigured).toBe(false);
    expect(result.checks.tenantBindingsConfigured).toBe(false);
  });
});
