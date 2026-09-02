import { revenuePilotMachineConfiguration } from '@/lib/auth/revenuePilotMachineConfig';
import { parseRevenuePilotAllowedTourIds } from '@/lib/revenue/priceWriteGate';
import { revenueCommissioningArmState } from '@/lib/revenue/commissioningGate';

export function revenuePilotPricingReadiness(env: NodeJS.ProcessEnv = process.env) {
  const machine = revenuePilotMachineConfiguration(env);
  let allowlistValid = true;
  let allowlistSize = 0;
  try {
    allowlistSize = parseRevenuePilotAllowedTourIds(env.REVENUEPILOT_ALLOWED_TOUR_IDS || '').size;
  } catch {
    allowlistValid = false;
  }
  const configuredMovement = Number(env.REVENUEPILOT_MAX_WRITE_PERCENT || 5);
  const maximumMovementSafe = Number.isFinite(configuredMovement) && configuredMovement > 0 && configuredMovement <= 5;
  const commissioning = revenueCommissioningArmState(env);
  const checks = {
    pricingApiEnabled: env.REVENUEPILOT_PRICING_API_ENABLED === 'true',
    hmacKeysConfigured: machine.hmacKeysConfigured,
    dualHmacKeysConfigured: machine.dualHmacKeysConfigured,
    readScopeConfigured: machine.readScopeConfigured,
    writeScopeConfigured: machine.writeScopeConfigured,
    tenantBindingsConfigured: machine.tenantBindingsConfigured,
    tourAllowlistValid: allowlistValid,
    tourAllowlistEmpty: allowlistValid && allowlistSize === 0,
    exactOneTourCanaryConfigured: allowlistValid && allowlistSize === 1,
    maximumMovementSafe,
    pricingProjectionRecoveryConfigured: Boolean(env.CRON_SECRET?.trim()),
    commissioningRequested: env.REVENUEPILOT_COMMISSIONING_ENABLED === 'true',
    commissioningExactTargetConfigured: Boolean(commissioning.target),
    commissioningWindowActive: commissioning.enabled,
  };
  return {
    status: checks.pricingApiEnabled ? 'enabled' as const : 'disabled' as const,
    commissioningStatus: commissioning.enabled ? 'enabled' as const : 'disabled' as const,
    productionCanaryPrerequisitesConfigured: checks.hmacKeysConfigured
      && checks.dualHmacKeysConfigured
      && checks.readScopeConfigured
      && checks.writeScopeConfigured
      && checks.tenantBindingsConfigured
      && checks.exactOneTourCanaryConfigured
      && checks.maximumMovementSafe
      && checks.pricingProjectionRecoveryConfigured,
    checks,
  };
}
