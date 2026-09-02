export type RevenueProductionProfile = 'closed' | 'canary-staged';

const READINESS_ROOT_KEYS = ['checks', 'commissioningStatus', 'productionCanaryPrerequisitesConfigured', 'status'] as const;
const READINESS_CHECK_KEYS = [
  'pricingApiEnabled',
  'hmacKeysConfigured',
  'dualHmacKeysConfigured',
  'readScopeConfigured',
  'writeScopeConfigured',
  'tenantBindingsConfigured',
  'tourAllowlistValid',
  'tourAllowlistEmpty',
  'exactOneTourCanaryConfigured',
  'maximumMovementSafe',
  'pricingProjectionRecoveryConfigured',
  'commissioningRequested',
  'commissioningExactTargetConfigured',
  'commissioningWindowActive',
] as const;

type ReadinessCheck = typeof READINESS_CHECK_KEYS[number];
type ReadinessPayload = {
  status: 'disabled';
  commissioningStatus: 'disabled';
  productionCanaryPrerequisitesConfigured: boolean;
  checks: Record<ReadinessCheck, boolean>;
};

type NetlifyDeploy = {
  id?: unknown;
  state?: unknown;
  context?: unknown;
  commit_ref?: unknown;
  published_at?: unknown;
};

type NetlifyFunction = {
  n?: unknown;
  name?: unknown;
  schedule?: unknown;
};

type NetlifyLog = {
  timestamp?: unknown;
  time?: unknown;
  ts?: unknown;
  function?: unknown;
  function_name?: unknown;
  name?: unknown;
  message?: unknown;
  msg?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertExactKeys(value: Record<string, unknown>, expected: readonly string[], label: string) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} schema changed; production verification requires review.`);
  }
}

function requireBoolean(value: Record<string, unknown>, key: string, label: string) {
  if (typeof value[key] !== 'boolean') throw new Error(`${label}.${key} must be a boolean.`);
  return value[key] as boolean;
}

function requireString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value;
}

export function validateRevenueProductionReadiness(input: unknown, profile: RevenueProductionProfile): ReadinessPayload {
  if (!isRecord(input)) throw new Error('Revenue readiness response must be an object.');
  assertExactKeys(input, READINESS_ROOT_KEYS, 'Revenue readiness response');
  if (input.status !== 'disabled') throw new Error('Revenue pricing writes must remain disabled during owner handoff.');
  if (input.commissioningStatus !== 'disabled') throw new Error('Revenue one-time commissioning must remain disabled during owner handoff.');
  if (!isRecord(input.checks)) throw new Error('Revenue readiness checks must be an object.');
  assertExactKeys(input.checks, READINESS_CHECK_KEYS, 'Revenue readiness checks');

  const checks = Object.fromEntries(READINESS_CHECK_KEYS.map((key) => [
    key,
    requireBoolean(input.checks as Record<string, unknown>, key, 'Revenue readiness checks'),
  ])) as Record<ReadinessCheck, boolean>;
  const prerequisites = requireBoolean(input, 'productionCanaryPrerequisitesConfigured', 'Revenue readiness response');

  for (const key of [
    'hmacKeysConfigured',
    'dualHmacKeysConfigured',
    'readScopeConfigured',
    'writeScopeConfigured',
    'tenantBindingsConfigured',
    'tourAllowlistValid',
    'maximumMovementSafe',
    'pricingProjectionRecoveryConfigured',
  ] as const) {
    if (!checks[key]) throw new Error(`Revenue production check failed: ${key}.`);
  }
  if (checks.pricingApiEnabled) throw new Error('Revenue pricing writes must remain disabled during owner handoff.');
  if (checks.commissioningRequested || checks.commissioningExactTargetConfigured || checks.commissioningWindowActive) {
    throw new Error('Revenue one-time commissioning must remain fully disarmed during owner handoff.');
  }

  if (profile === 'closed') {
    if (prerequisites) throw new Error('Closed posture must not report canary prerequisites as configured.');
    if (!checks.tourAllowlistEmpty || checks.exactOneTourCanaryConfigured) {
      throw new Error('Closed posture requires an empty TourTicket tour allowlist.');
    }
  } else {
    if (!prerequisites) throw new Error('Canary-staged posture requires every production prerequisite.');
    if (checks.tourAllowlistEmpty || !checks.exactOneTourCanaryConfigured) {
      throw new Error('Canary-staged posture requires exactly one approved TourTicket tour.');
    }
  }

  return {
    status: 'disabled',
    commissioningStatus: 'disabled',
    productionCanaryPrerequisitesConfigured: prerequisites,
    checks,
  };
}

export function validateNetlifyRevenueEvidence(input: {
  headCommit: string;
  deploys: unknown;
  functions: unknown;
  logs: unknown;
  now?: Date;
  maximumRecoveryAgeMs?: number;
}) {
  const headCommit = requireString(input.headCommit, 'Local HEAD commit');
  if (!Array.isArray(input.deploys)) throw new Error('Netlify deploy evidence must be an array.');
  const productionDeploy = (input.deploys as NetlifyDeploy[]).find((deploy) => deploy.context === 'production' && deploy.state === 'ready');
  if (!productionDeploy) throw new Error('No ready Netlify production deploy was found.');
  const deployCommit = requireString(productionDeploy.commit_ref, 'Netlify production commit');
  if (deployCommit !== headCommit) throw new Error('Netlify production does not match local HEAD.');
  const deployId = requireString(productionDeploy.id, 'Netlify production deploy ID');
  const publishedAt = new Date(requireString(productionDeploy.published_at, 'Netlify production publish time'));
  if (!Number.isFinite(publishedAt.getTime())) throw new Error('Netlify production publish time is invalid.');

  if (!isRecord(input.functions) || !Array.isArray(input.functions.functions)) {
    throw new Error('Netlify function evidence is unavailable.');
  }
  const maintenance = (input.functions.functions as NetlifyFunction[]).find((entry) => (entry.n ?? entry.name) === 'revenue-maintenance');
  if (!maintenance || maintenance.schedule !== '*/5 * * * *') {
    throw new Error('Revenue maintenance must be deployed on the five-minute schedule.');
  }

  if (!Array.isArray(input.logs)) throw new Error('Netlify recovery logs must be an array.');
  const successfulRuns = (input.logs as NetlifyLog[]).flatMap((entry) => {
    const functionName = entry.function ?? entry.function_name ?? entry.name;
    if (functionName !== 'revenue-maintenance') return [];
    const timestamp = new Date(String(entry.timestamp ?? entry.time ?? entry.ts ?? ''));
    if (!Number.isFinite(timestamp.getTime()) || timestamp < publishedAt) return [];
    const rawMessage = entry.message ?? entry.msg;
    if (typeof rawMessage !== 'string') return [];
    try {
      const message = JSON.parse(rawMessage.trim()) as Record<string, unknown>;
      if (message.message !== 'Revenue maintenance result.'
        || message.route !== '/api/cron/pricing-summaries'
        || message.status !== 200
        || message.success !== true) return [];
      return [timestamp];
    } catch {
      return [];
    }
  }).sort((left, right) => right.getTime() - left.getTime());
  if (successfulRuns.length === 0) throw new Error('No successful revenue maintenance run was found after the live deploy.');

  const now = input.now ?? new Date();
  const maximumRecoveryAgeMs = input.maximumRecoveryAgeMs ?? 12 * 60 * 1000;
  if (now.getTime() - successfulRuns[0].getTime() > maximumRecoveryAgeMs) {
    throw new Error('The latest successful revenue maintenance run is stale.');
  }

  return {
    deployId,
    commit: deployCommit,
    publishedAt: publishedAt.toISOString(),
    schedule: maintenance.schedule,
    latestRecoveryAt: successfulRuns[0].toISOString(),
  };
}
