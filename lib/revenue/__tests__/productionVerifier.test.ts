import { validateNetlifyRevenueEvidence, validateRevenueProductionReadiness } from '@/lib/revenue/productionVerifier';

const readiness = (overrides: Record<string, boolean> = {}) => ({
  status: 'disabled',
  commissioningStatus: 'disabled',
  productionCanaryPrerequisitesConfigured: false,
  checks: {
    pricingApiEnabled: false,
    hmacKeysConfigured: true,
    dualHmacKeysConfigured: true,
    readScopeConfigured: true,
    writeScopeConfigured: true,
    tenantBindingsConfigured: true,
    tourAllowlistValid: true,
    tourAllowlistEmpty: true,
    exactOneTourCanaryConfigured: false,
    maximumMovementSafe: true,
    pricingProjectionRecoveryConfigured: true,
    commissioningRequested: false,
    commissioningExactTargetConfigured: false,
    commissioningWindowActive: false,
    ...overrides,
  },
});

const deploymentEvidence = (overrides: Partial<Parameters<typeof validateNetlifyRevenueEvidence>[0]> = {}) => ({
  headCommit: 'a'.repeat(40),
  deploys: [{ id: 'deploy-1', state: 'ready', context: 'production', commit_ref: 'a'.repeat(40), published_at: '2026-07-15T21:40:00.000Z' }],
  functions: { functions: [{ n: 'revenue-maintenance', schedule: '*/5 * * * *' }] },
  logs: [{
    timestamp: '2026-07-15T21:45:00.000Z',
    function: 'revenue-maintenance',
    message: JSON.stringify({ level: 'info', message: 'Revenue maintenance result.', route: '/api/cron/pricing-summaries', status: 200, success: true }),
  }],
  now: new Date('2026-07-15T21:50:00.000Z'),
  ...overrides,
});

describe('RevenuePilot production verifier', () => {
  it('certifies only the closed, disabled posture by default', () => {
    expect(validateRevenueProductionReadiness(readiness(), 'closed')).toMatchObject({
      status: 'disabled',
      productionCanaryPrerequisitesConfigured: false,
      checks: { tourAllowlistEmpty: true, pricingProjectionRecoveryConfigured: true },
    });
  });

  it('certifies a disabled one-tour handoff only under the explicit canary-staged profile', () => {
    const staged = readiness({ tourAllowlistEmpty: false, exactOneTourCanaryConfigured: true });
    staged.productionCanaryPrerequisitesConfigured = true;
    expect(validateRevenueProductionReadiness(staged, 'canary-staged').checks.exactOneTourCanaryConfigured).toBe(true);
    expect(() => validateRevenueProductionReadiness(staged, 'closed')).toThrow('Closed posture');
  });

  it('fails closed for enabled writes, missing recovery, or an unreviewed response schema', () => {
    expect(() => validateRevenueProductionReadiness({ ...readiness({ pricingApiEnabled: true }), status: 'enabled' }, 'closed')).toThrow('must remain disabled');
    expect(() => validateRevenueProductionReadiness(readiness({ pricingProjectionRecoveryConfigured: false }), 'closed')).toThrow('pricingProjectionRecoveryConfigured');
    expect(() => validateRevenueProductionReadiness({ ...readiness(), unexpected: true }, 'closed')).toThrow('schema changed');
  });

  it('fails closed when tenant bindings are incomplete or commissioning is armed', () => {
    expect(() => validateRevenueProductionReadiness(readiness({ tenantBindingsConfigured: false }), 'closed')).toThrow('tenantBindingsConfigured');
    expect(() => validateRevenueProductionReadiness({ ...readiness(), commissioningStatus: 'enabled' }, 'closed')).toThrow('commissioning');
    expect(() => validateRevenueProductionReadiness(readiness({ commissioningRequested: true }), 'closed')).toThrow('commissioning');
  });

  it('requires the live Netlify deploy to match HEAD and include the five-minute recovery schedule', () => {
    expect(validateNetlifyRevenueEvidence(deploymentEvidence())).toMatchObject({
      deployId: 'deploy-1',
      schedule: '*/5 * * * *',
      latestRecoveryAt: '2026-07-15T21:45:00.000Z',
    });
    expect(() => validateNetlifyRevenueEvidence(deploymentEvidence({ headCommit: 'b'.repeat(40) }))).toThrow('does not match local HEAD');
    expect(() => validateNetlifyRevenueEvidence(deploymentEvidence({ functions: { functions: [] } }))).toThrow('five-minute schedule');
  });

  it('requires a fresh successful recovery run after the published deploy', () => {
    expect(() => validateNetlifyRevenueEvidence(deploymentEvidence({
      logs: [{
        timestamp: '2026-07-15T21:39:59.000Z',
        function: 'revenue-maintenance',
        message: JSON.stringify({ message: 'Revenue maintenance result.', route: '/api/cron/pricing-summaries', status: 200, success: true }),
      }],
    }))).toThrow('after the live deploy');
    expect(() => validateNetlifyRevenueEvidence(deploymentEvidence({ now: new Date('2026-07-15T22:00:01.000Z') }))).toThrow('stale');
  });
});
