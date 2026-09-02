// Revenue pricing summaries are an authoritative recovery path, not a
// browser-driven task. Keep this schedule authenticated, bounded, and
// independent of RevenuePilot's write switches.
const ROUTES = ['/api/cron/pricing-summaries'];

const configuredOrigin = () => {
  const raw = process.env.REVENUEPILOT_BASE_URL?.trim() || '';
  let origin;
  try {
    origin = new URL(raw);
  } catch {
    return null;
  }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return null;
  return origin.origin;
};

const revenueMaintenance = async () => {
  const secret = process.env.CRON_SECRET?.trim();
  const baseUrl = configuredOrigin();
  if (!secret || !baseUrl) {
    console.error(JSON.stringify({ level: 'error', message: 'Revenue maintenance is not configured.', code: !secret ? 'CRON_SECRET_MISSING' : 'BASE_URL_INVALID' }));
    return new Response('Revenue maintenance is not configured.', { status: 503 });
  }

  const results = await Promise.all(ROUTES.map(async (route) => {
    try {
      const response = await fetch(`${baseUrl}${route}`, {
        headers: { authorization: `Bearer ${secret}`, 'user-agent': 'mountain-tour-revenue-maintenance/1.0' },
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
      });
      const body = await response.json().catch(() => null);
      const success = response.ok && body?.success === true;
      console.log(JSON.stringify({ level: success ? 'info' : 'error', message: 'Revenue maintenance result.', route, status: response.status, success }));
      return { route, status: response.status, success };
    } catch (error) {
      const code = error instanceof Error && error.name === 'TimeoutError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE';
      console.error(JSON.stringify({ level: 'error', message: 'Revenue maintenance request failed.', route, code }));
      return { route, status: 0, success: false };
    }
  }));

  const success = results.every((result) => result.success);
  return Response.json({ success, results }, { status: success ? 200 : 502 });
};

export default revenueMaintenance;
export const config = { schedule: '*/5 * * * *' };
