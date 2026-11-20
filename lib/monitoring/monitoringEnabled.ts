/**
 * Decides whether error monitoring may send anything.
 *
 * Only a real production deploy reports. Local development servers, local
 * `next build && next start` runs, deploy previews and branch deploys all stay
 * silent, so they can never consume the production error allowance or mix
 * localhost noise into production issues.
 *
 * `deployContext` is the Netlify build context (`CONTEXT`), baked into the
 * bundle at build time through `next.config.ts` `env` as
 * `SENTRY_DEPLOY_CONTEXT`. A build made anywhere other than Netlify has no
 * context and therefore never reports.
 */
export type MonitoringDecisionInput = {
  nodeEnv: string | undefined;
  deployContext: string | undefined;
  /** Browser hostname when known; omitted on the server. */
  hostname?: string | null;
};

const LOCAL_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::1', '[::1]']);

export function isLocalHostname(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const host = hostname.trim().toLowerCase();
  if (LOCAL_HOSTNAMES.has(host)) return true;
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.test')) return true;
  return /^127(?:\.\d{1,3}){3}$/.test(host);
}

export function shouldEnableMonitoring({ nodeEnv, deployContext, hostname }: MonitoringDecisionInput): boolean {
  if (nodeEnv !== 'production') return false;
  if (deployContext !== 'production') return false;
  if (isLocalHostname(hostname)) return false;
  return true;
}

/**
 * Server errors that are produced by clients we do not control and that no
 * code change on our side can address. Kept deliberately narrow.
 *
 * - The router state header error is thrown by Next.js when a request carries
 *   a `Next-Router-State-Tree` header in a format the running version does not
 *   accept. It was seen only from an automated client replaying an outdated
 *   header format; real visitors send the header the current bundle builds.
 */
export const IGNORED_SERVER_ERRORS: ReadonlyArray<RegExp> = Object.freeze([
  /The router state header was sent but could not be parsed/,
]);
