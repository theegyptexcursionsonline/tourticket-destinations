import { revalidatePath } from 'next/cache';
import { CACHE_TAGS, invalidateMemoryCacheTags } from '@/lib/cache';

const STOREFRONT_ROOTS: Array<[string, 'layout']> = [
  ['/', 'layout'],
  ['/[locale]', 'layout'],
];

/**
 * Purge storefront ISR/CDN entries and warm-instance data after a durable content
 * write. Invalidation is best effort and must not turn a saved admin change
 * into an error response.
 */
export function revalidateStorefrontContent() {
  try {
    invalidateMemoryCacheTags([...Object.values(CACHE_TAGS), 'homepage']);
    for (const [path, type] of STOREFRONT_ROOTS) {
      revalidatePath(path, type);
    }
    return true;
  } catch (error) {
    console.error('Storefront cache revalidation failed after durable write.', error);
    return false;
  }
}

export const revalidateTourStorefront = revalidateStorefrontContent;
