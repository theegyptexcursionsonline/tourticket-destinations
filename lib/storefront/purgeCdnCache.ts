/**
 * Purge the Netlify durable edge cache by tag.
 *
 * Storefront pages are served with `Netlify-CDN-Cache-Control: durable,
 * s-maxage=900, stale-while-revalidate=86400`. Next's `revalidatePath` clears
 * the framework's own cache but cannot touch that edge copy, so an admin change
 * to curated content (Top 10, Best Deals) kept showing the previous version for
 * up to fifteen minutes — and longer while the stale copy was being revalidated.
 *
 * Requires NETLIFY_PURGE_TOKEN and NETLIFY_SITE_ID. Without them the purge is
 * skipped with a clear log line rather than failing the admin save; pages then
 * refresh on the existing timer as before.
 */
const PURGE_ENDPOINT = 'https://api.netlify.com/api/v1/purge';

let warnedAboutMissingConfig = false;

export function cdnPurgeConfigured(): boolean {
  return Boolean(process.env.NETLIFY_PURGE_TOKEN && process.env.NETLIFY_SITE_ID);
}

export async function purgeStorefrontCdnCache(tenantId?: string): Promise<boolean> {
  const token = process.env.NETLIFY_PURGE_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!token || !siteId) {
    if (!warnedAboutMissingConfig) {
      warnedAboutMissingConfig = true;
      console.warn(
        '[cdn] NETLIFY_PURGE_TOKEN / NETLIFY_SITE_ID are not set, so edge cache is not purged on save. ' +
        'Storefront changes will appear when the cache expires instead of immediately.',
      );
    }
    return false;
  }

  const tags = tenantId ? ['storefront', `tenant-${tenantId}`] : ['storefront'];

  try {
    const response = await fetch(PURGE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ site_id: siteId, cache_tags: tags }),
    });

    if (!response.ok) {
      console.error(`[cdn] Purge rejected (${response.status}): ${await response.text().catch(() => '')}`);
      return false;
    }
    return true;
  } catch (error) {
    // A save that succeeded must not be reported as failed because the CDN
    // could not be reached.
    console.error('[cdn] Purge request failed:', error);
    return false;
  }
}
