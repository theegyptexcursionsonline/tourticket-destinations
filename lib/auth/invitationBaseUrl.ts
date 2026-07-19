import type { NextRequest } from 'next/server';

/**
 * Builds the base URL for a team-invitation acceptance link from the request
 * the admin is actually on. This keeps the link on the same (branded) host the
 * admin is using — e.g. dashboard.egypt-excursionsonline.com — instead of the
 * raw Netlify URL baked into NEXT_PUBLIC_BASE_URL. On Netlify the public host
 * arrives as x-forwarded-host (edge-set); host is the local fallback.
 */
export function getInvitationBaseUrl(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    || request.headers.get('host')?.trim();
  if (host) {
    const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
    return `${proto}://${host}`;
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXT_PUBLIC_BASE_URL
    || 'https://dashboard.egypt-excursionsonline.com'
  ).replace(/\/$/, '');
}
