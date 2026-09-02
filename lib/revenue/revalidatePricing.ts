import { revalidatePath } from 'next/cache';

const PRICING_PATHS: Array<[string, 'page']> = [
  ['/[locale]', 'page'],
  ['/[locale]/[slug]', 'page'],
  ['/[locale]/tours', 'page'],
  ['/[locale]/search', 'page'],
  ['/[locale]/destinations/[slug]', 'page'],
  ['/[locale]/categories/[slug]', 'page'],
  ['/[locale]/egypt', 'page'],
];

/** Cache invalidation must never turn an already durable price write into a 500. */
export function revalidatePricingPaths() {
  // Route-level integration tests invoke handlers without a Next request store.
  // Keep this escape hatch unavailable in production so durable writes always
  // attempt the same cache invalidation as live API requests.
  if (process.env.NODE_ENV !== 'production' && process.env.REVENUEPILOT_SKIP_CACHE_REVALIDATION === 'true') return true;
  try {
    for (const [path, type] of PRICING_PATHS) revalidatePath(path, type);
    return true;
  } catch (error) {
    console.error('Pricing cache revalidation failed after durable write.', error);
    return false;
  }
}

