// lib/cache.ts
// Server-side caching utilities.
//
// Netlify's runtime cache handler is currently causing live page crashes when it
// is enabled for this app, so these helpers use a lightweight in-memory
// stale-while-revalidate cache instead of Next/Netlify's persistent cache.
// This gives us ISR-like behavior for warm server instances without touching
// the Blobs-backed runtime path that was crashing production.

import dbConnect from './dbConnect';

type CacheEntry<TResult> = {
  expiresAt: number;
  hasValue: boolean;
  tags?: string[];
  promise?: Promise<TResult>;
  value?: TResult;
};

type GlobalWithAppCache = typeof globalThis & {
  __tourTicketCache?: Map<string, CacheEntry<unknown>>;
};

const globalWithAppCache = globalThis as GlobalWithAppCache;
const memoryCache = globalWithAppCache.__tourTicketCache ?? new Map<string, CacheEntry<unknown>>();

if (!globalWithAppCache.__tourTicketCache) {
  globalWithAppCache.__tourTicketCache = memoryCache;
}

// Cache tags for revalidation
export const CACHE_TAGS = {
  TOURS: 'tours',
  DESTINATIONS: 'destinations',
  CATEGORIES: 'categories',
  REVIEWS: 'reviews',
  TENANT: 'tenant',
} as const;

// Cache durations (in seconds)
export const CACHE_DURATIONS = {
  SHORT: 60,        // 1 minute - for frequently changing data
  MEDIUM: 300,      // 5 minutes - for semi-static data
  LONG: 3600,       // 1 hour - for rarely changing data
  STATIC: 86400,    // 24 hours - for static content
} as const;

function buildCacheKey(keyParts: string[], args: unknown[]): string {
  return JSON.stringify([keyParts, args]);
}

function isFresh<TResult>(entry: CacheEntry<TResult>): boolean {
  return entry.hasValue && entry.expiresAt > Date.now();
}

export function cacheIfAvailable<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyParts: string[],
  options: { revalidate?: number; tags?: string[] } = {}
) {
  const ttlMs = Math.max(0, (options.revalidate ?? CACHE_DURATIONS.MEDIUM) * 1000);

  if (ttlMs === 0) {
    return (...args: TArgs) => fn(...args);
  }

  const loadEntry = (cacheKey: string, args: TArgs, staleEntry?: CacheEntry<TResult>) => {
    let pendingPromise!: Promise<TResult>;
    pendingPromise = fn(...args)
      .then((value) => {
        // If this entry was invalidated while the query was running, do not
        // let the older in-flight result repopulate the cache.
        if (memoryCache.get(cacheKey)?.promise !== pendingPromise) return value;

        memoryCache.set(cacheKey, {
          expiresAt: Date.now() + ttlMs,
          hasValue: true,
          tags: options.tags,
          value,
        } satisfies CacheEntry<TResult>);

        return value;
      })
      .catch((error) => {
        if (staleEntry?.hasValue) {
          memoryCache.set(cacheKey, staleEntry);
        } else {
          memoryCache.delete(cacheKey);
        }

        throw error;
      });

    const pendingEntry: CacheEntry<TResult> = staleEntry?.hasValue
      ? { ...staleEntry, tags: options.tags, promise: pendingPromise }
      : {
          expiresAt: Date.now() + ttlMs,
          hasValue: false,
          tags: options.tags,
          promise: pendingPromise,
        };

    memoryCache.set(cacheKey, pendingEntry as CacheEntry<unknown>);
    return pendingPromise;
  };

  return async (...args: TArgs) => {
    const cacheKey = buildCacheKey(keyParts, args);
    const entry = memoryCache.get(cacheKey) as CacheEntry<TResult> | undefined;

    if (entry && isFresh(entry)) {
      return entry.value as TResult;
    }

    if (entry && entry.hasValue) {
      if (!entry.promise) {
        void loadEntry(cacheKey, args, entry);
      }

      return entry.value as TResult;
    }

    if (entry && entry.promise) {
      return entry.promise;
    }

    return loadEntry(cacheKey, args);
  };
}

/** Clear warm-instance cache entries after a related durable write. */
export function invalidateMemoryCacheTags(tags: string[]) {
  if (tags.length === 0) return 0;

  const targetTags = new Set(tags);
  let deleted = 0;
  for (const [cacheKey, entry] of memoryCache) {
    if (entry.tags?.some((tag) => targetTags.has(tag))) {
      memoryCache.delete(cacheKey);
      deleted += 1;
    }
  }

  return deleted;
}

/**
 * Cached database connection wrapper
 * Ensures connection is established before cached queries
 */
export async function withDbConnection<T>(fn: () => Promise<T>): Promise<T> {
  await dbConnect();
  return fn();
}

/**
 * Create a cached query function with automatic tags
 * Usage:
 *   const getTour = createCachedQuery(
 *     async (slug: string) => Tour.findOne({ slug }).lean(),
 *     ['tours'],
 *     { revalidate: 60 }
 *   );
 */
export function createCachedQuery<TArgs extends unknown[], TResult>(
  queryFn: (...args: TArgs) => Promise<TResult>,
  tags: string[],
  options: { revalidate?: number } = {}
) {
  return cacheIfAvailable(
    async (...args: TArgs) => {
      await dbConnect();
      return queryFn(...args);
    },
    tags,
    {
      revalidate: options.revalidate ?? CACHE_DURATIONS.MEDIUM,
      tags,
    }
  );
}

/**
 * Cached tour fetcher with tenant support
 */
export const getCachedTour = (slug: string, tenantId: string) => {
  return cacheIfAvailable(
    async () => {
      await dbConnect();
      const Tour = (await import('./models/Tour')).default;
      
      const tenantFilter = tenantId !== 'default' 
        ? { $or: [{ tenantId }, { tenantId: 'default' }] }
        : {};
      
      const tour = await Tour.findOne({ slug, ...tenantFilter })
        .populate('destination', 'name slug')
        .populate('category', 'name slug')
        .sort({ tenantId: tenantId !== 'default' ? -1 : 1 })
        .lean();
      
      return tour ? JSON.parse(JSON.stringify(tour)) : null;
    },
    [`tour-${slug}-${tenantId}`],
    {
      revalidate: CACHE_DURATIONS.MEDIUM,
      tags: [CACHE_TAGS.TOURS, `tour-${slug}`],
    }
  )();
};

/**
 * Cached destination fetcher with tenant support
 */
export const getCachedDestination = (slug: string, tenantId: string) => {
  return cacheIfAvailable(
    async () => {
      await dbConnect();
      const Destination = (await import('./models/Destination')).default;
      
      const tenantFilter = tenantId !== 'default' 
        ? { $or: [{ tenantId }, { tenantId: 'default' }] }
        : { tenantId: 'default' };
      
      const destination = await Destination.findOne({ slug, ...tenantFilter })
        .sort({ tenantId: tenantId !== 'default' ? -1 : 1 })
        .lean();
      
      return destination ? JSON.parse(JSON.stringify(destination)) : null;
    },
    [`destination-${slug}-${tenantId}`],
    {
      revalidate: CACHE_DURATIONS.MEDIUM,
      tags: [CACHE_TAGS.DESTINATIONS, `destination-${slug}`],
    }
  )();
};

/**
 * Cached tours by destination
 */
export const getCachedToursByDestination = (destinationId: string, tenantId: string) => {
  return cacheIfAvailable(
    async () => {
      await dbConnect();
      const Tour = (await import('./models/Tour')).default;
      
      const tours = await Tour.find({
        destination: destinationId,
        isPublished: true,
        tenantId
      }).lean();
      
      return JSON.parse(JSON.stringify(tours));
    },
    [`tours-dest-${destinationId}-${tenantId}`],
    {
      revalidate: CACHE_DURATIONS.MEDIUM,
      tags: [CACHE_TAGS.TOURS],
    }
  )();
};

/**
 * Cached categories by tenant
 */
export const getCachedCategories = (tenantId: string) => {
  return cacheIfAvailable(
    async () => {
      await dbConnect();
      const Category = (await import('./models/Category')).default;
      
      const categories = await Category.find({ tenantId }).limit(20).lean();
      return JSON.parse(JSON.stringify(categories));
    },
    [`categories-${tenantId}`],
    {
      revalidate: CACHE_DURATIONS.LONG,
      tags: [CACHE_TAGS.CATEGORIES],
    }
  )();
};

/**
 * Cached reviews for tour
 */
export const getCachedReviews = (tourId: string) => {
  return cacheIfAvailable(
    async () => {
      await dbConnect();
      const Review = (await import('./models/Review')).default;
      
      const reviews = await Review.find({ tour: tourId })
        .populate('user', 'firstName lastName picture')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      
      return JSON.parse(JSON.stringify(reviews));
    },
    [`reviews-${tourId}`],
    {
      revalidate: CACHE_DURATIONS.SHORT,
      tags: [CACHE_TAGS.REVIEWS],
    }
  )();
};

/**
 * Cached featured tours for homepage
 */
export const getCachedFeaturedTours = (tenantId: string, limit: number = 8) => {
  return cacheIfAvailable(
    async () => {
      await dbConnect();
      const Tour = (await import('./models/Tour')).default;
      
      const tours = await Tour.find({
        tenantId,
        isPublished: true,
        isFeatured: true
      })
        .populate('destination', 'name slug')
        .populate('category', 'name slug')
        .limit(limit)
        .lean();
      
      return JSON.parse(JSON.stringify(tours));
    },
    [`featured-tours-${tenantId}-${limit}`],
    {
      revalidate: CACHE_DURATIONS.MEDIUM,
      tags: [CACHE_TAGS.TOURS],
    }
  )();
};

/**
 * Cached destinations for tenant
 */
export const getCachedDestinations = (tenantId: string, limit: number = 10) => {
  return cacheIfAvailable(
    async () => {
      await dbConnect();
      const Destination = (await import('./models/Destination')).default;
      
      const destinations = await Destination.find({ tenantId })
        .sort({ tourCount: -1 })
        .limit(limit)
        .lean();
      
      return JSON.parse(JSON.stringify(destinations));
    },
    [`destinations-${tenantId}-${limit}`],
    {
      revalidate: CACHE_DURATIONS.LONG,
      tags: [CACHE_TAGS.DESTINATIONS],
    }
  )();
};
