import { revalidatePath } from 'next/cache';
import { CACHE_TAGS, invalidateMemoryCacheTags } from '@/lib/cache';
import { purgeStorefrontCdnCache } from './purgeCdnCache';

const STOREFRONT_ROOTS: Array<[string, 'layout']> = [
  ['/', 'layout'],
  ['/[locale]', 'layout'],
];

/**
 * Purge storefront ISR/CDN entries and warm-instance data after a durable content
 * write. Invalidation is best effort and must not turn a saved admin change
 * into an error response.
 */
export function revalidateStorefrontContent(tenantId?: string) {
  try {
    invalidateMemoryCacheTags([...Object.values(CACHE_TAGS), 'homepage']);
    for (const [path, type] of STOREFRONT_ROOTS) {
      revalidatePath(path, type);
    }
    // The edge copy outlives revalidatePath, so purge it too. Deliberately not
    // awaited: the admin save is already durable and must not wait on, or fail
    // because of, the CDN.
    void purgeStorefrontCdnCache(tenantId);
    return true;
  } catch (error) {
    console.error('Storefront cache revalidation failed after durable write.', error);
    return false;
  }
}

export const revalidateTourStorefront = revalidateStorefrontContent;
