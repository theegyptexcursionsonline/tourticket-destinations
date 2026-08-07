import { headers } from 'next/headers';

/**
 * The origin of the brand the visitor is actually on.
 *
 * One build serves every white-label brand here, so a build-time
 * NEXT_PUBLIC_BASE_URL is always the wrong brand for someone. Left as a
 * constant, the schema components published the flagship's domain — and on some
 * pages the shared deployment host — as each brand's own identity, telling
 * search engines a customer's site lives somewhere else.
 *
 * The env value survives only as a build/test fallback, for the cases where no
 * request context exists (static generation, unit tests).
 */
const FALLBACK_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';

export async function requestBaseUrl(): Promise<string> {
  try {
    const headerList = await headers();
    const host = headerList.get('x-tenant-domain') || headerList.get('host');
    if (!host) return FALLBACK_BASE_URL;
    const forwardedProto = headerList.get('x-forwarded-proto');
    const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    return `${forwardedProto || (isLocal ? 'http' : 'https')}://${host}`;
  } catch {
    return FALLBACK_BASE_URL;
  }
}
