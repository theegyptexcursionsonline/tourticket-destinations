import { execFileSync } from 'node:child_process';
import { validateNetlifyRevenueEvidence, validateRevenueProductionReadiness, type RevenueProductionProfile } from '../lib/revenue/productionVerifier';

const BASE_URL = (process.env.REVENUEPILOT_BASE_URL || '').replace(/\/$/, '');
const NETLIFY_SITE_ID = process.env.REVENUEPILOT_NETLIFY_SITE_ID || '';
const NETLIFY_CLI = 'netlify-cli@26.2.0';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function command(commandName: string, args: string[]) {
  try {
    return execFileSync(commandName, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    const status = error && typeof error === 'object' && 'status' in error ? String(error.status) : 'unknown';
    throw new Error(`${commandName} evidence command failed with status ${status}.`);
  }
}

function netlifyApi(method: string, data: Record<string, unknown>) {
  return JSON.parse(command('npx', ['--yes', NETLIFY_CLI, 'api', method, '--data', JSON.stringify(data)]));
}

function netlifyLogs() {
  const raw = command('npx', ['--yes', NETLIFY_CLI, 'logs', '--source', 'functions', '--function', 'revenue-maintenance', '--since', '30m', '--json']);
  return raw.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith('{')).map((line) => JSON.parse(line));
}

async function jsonRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
  const raw = await response.text();
  assert(raw.length <= 64 * 1024, `${path} returned an unexpectedly large response.`);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new Error(`${path} did not return JSON.`);
  }
  return { response, body };
}

function machineUnauthorized(body: unknown) {
  if (!body || typeof body !== 'object' || !('error' in body)) return false;
  const error = (body as { error?: unknown }).error;
  return Boolean(error)
    && typeof error === 'object'
    && (error as { code?: unknown }).code === 'MACHINE_UNAUTHORIZED';
}

async function run() {
  assert(/^https:\/\/[a-z0-9.-]+$/i.test(BASE_URL), 'REVENUEPILOT_BASE_URL must be an HTTPS origin.');
  assert(/^[a-z0-9-]{8,}$/i.test(NETLIFY_SITE_ID), 'REVENUEPILOT_NETLIFY_SITE_ID is required.');
  const profile = process.env.REVENUEPILOT_PRODUCTION_PROFILE || 'closed';
  assert(profile === 'closed' || profile === 'canary-staged', 'REVENUEPILOT_PRODUCTION_PROFILE must be closed or canary-staged.');

  const readiness = await jsonRequest('/api/v1/revenue/readiness');
  assert(readiness.response.status === 200, 'Revenue readiness endpoint did not return 200.');
  assert((readiness.response.headers.get('cache-control') || '').includes('no-store'), 'Revenue readiness response must be no-store.');
  const posture = validateRevenueProductionReadiness(readiness.body, profile as RevenueProductionProfile);

  const catalogue = await jsonRequest('/api/v1/revenue/catalog');
  assert(catalogue.response.status === 401 && machineUnauthorized(catalogue.body), 'Anonymous machine catalogue access was not rejected.');

  const apply = await jsonRequest('/api/v1/revenue/prices/apply', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert(apply.response.status === 401 && machineUnauthorized(apply.body), 'Anonymous price execution was not rejected before write processing.');

  const cron = await jsonRequest('/api/cron/pricing-summaries');
  assert(cron.response.status === 401
    && Boolean(cron.body)
    && typeof cron.body === 'object'
    && (cron.body as { error?: unknown }).error === 'Unauthorized', 'Anonymous pricing recovery access was not rejected.');

  const headCommit = command('git', ['rev-parse', 'HEAD']);
  const deployment = validateNetlifyRevenueEvidence({
    headCommit,
    deploys: netlifyApi('listSiteDeploys', { site_id: NETLIFY_SITE_ID, per_page: 20 }),
    functions: netlifyApi('searchSiteFunctions', { site_id: NETLIFY_SITE_ID }),
    logs: netlifyLogs(),
  });

  console.log(JSON.stringify({
    verified: true,
    profile,
    baseUrl: BASE_URL,
    pricingStatus: posture.status,
    canaryPrerequisitesConfigured: posture.productionCanaryPrerequisitesConfigured,
    tourAllowlist: profile === 'closed' ? 'empty' : 'exactly_one',
    machineAuthentication: 'required',
    cronAuthentication: 'required',
    deploy: {
      id: deployment.deployId,
      commit: deployment.commit.slice(0, 7),
      publishedAt: deployment.publishedAt,
    },
    recovery: {
      schedule: deployment.schedule,
      latestSuccessAt: deployment.latestRecoveryAt,
    },
  }, null, 2));
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? `Revenue production verification failed: ${error.message}` : 'Revenue production verification failed.');
  process.exitCode = 1;
});
