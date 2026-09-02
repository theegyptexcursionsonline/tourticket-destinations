import { execFileSync } from 'node:child_process';

function runMaintenance({
  baseUrl,
  secret,
  responseStatus = 200,
  responseSuccess = true,
}: {
  baseUrl?: string;
  secret?: string;
  responseStatus?: number;
  responseSuccess?: boolean;
}) {
  const env = { ...process.env };
  delete env.REVENUEPILOT_BASE_URL;
  delete env.CRON_SECRET;
  if (baseUrl) env.REVENUEPILOT_BASE_URL = baseUrl;
  if (secret) env.CRON_SECRET = secret;
  const source = `
    globalThis.fetch = async (url, init) => {
      globalThis.__request = { url: String(url), redirect: init.redirect, userAgent: init.headers['user-agent'], authorized: init.headers.authorization === 'Bearer test-only-secret' };
      return Response.json({ success: ${JSON.stringify(responseSuccess)} }, { status: ${responseStatus} });
    };
    const mod = await import('./netlify/functions/revenue-maintenance.mjs');
    const response = await mod.default();
    const raw = await response.text();
    let body = raw;
    try { body = JSON.parse(raw); } catch {}
    console.log('RESULT:' + JSON.stringify({ status: response.status, body, request: globalThis.__request || null, schedule: mod.config.schedule }));
  `;
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const resultLine = output.split(/\r?\n/).find((line) => line.startsWith('RESULT:'));
  if (!resultLine) throw new Error('Scheduled function did not emit a test result.');
  return JSON.parse(resultLine.slice('RESULT:'.length));
}

describe('RevenuePilot scheduled projection recovery', () => {
  it('fails closed when the secret or canonical HTTPS origin is missing', () => {
    expect(runMaintenance({})).toMatchObject({ status: 503, request: null, schedule: '*/5 * * * *' });
    expect(runMaintenance({ baseUrl: 'http://insecure.example', secret: 'test-only-secret' })).toMatchObject({ status: 503, request: null });
  });

  it('calls only the authenticated pricing-summary recovery route', () => {
    expect(runMaintenance({
      baseUrl: 'https://mountain-tours.example',
      secret: 'test-only-secret',
    })).toMatchObject({
      status: 200,
      body: { success: true, results: [{ route: '/api/cron/pricing-summaries', status: 200, success: true }] },
      request: {
        url: 'https://mountain-tours.example/api/cron/pricing-summaries',
        redirect: 'error',
        userAgent: 'mountain-tour-revenue-maintenance/1.0',
        authorized: true,
      },
    });
  });

  it('surfaces an unsuccessful recovery run as a retryable function failure', () => {
    expect(runMaintenance({
      baseUrl: 'https://mountain-tours.example',
      secret: 'test-only-secret',
      responseStatus: 500,
      responseSuccess: false,
    })).toMatchObject({ status: 502, body: { success: false } });
  });
});
