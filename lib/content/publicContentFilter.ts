/**
 * The trash/visibility filter every storefront read must compose in, the way
 * buildStrictTenantQuery carries tenancy.
 *
 * Admins soft-delete tours, categories and attraction pages by setting
 * `archivedAt` (and unpublishing). Destinations are hard-deleted on this
 * network, so for them the guard reduces to `isPublished`. A query filtering
 * on neither field leaks drafts or trash to customers — which is how deleted
 * test records reached "Explore More Destinations" on the sibling EEO site
 * (client report 2026-08-21); this network had the same unguarded reads.
 *
 * Compose, never replace: `buildStrictTenantQuery({ ...PUBLIC_CONTENT_FILTER }, tenantId)`.
 * `archivedAt: null` also matches documents that never had the field.
 */
export const NOT_ARCHIVED_FILTER = { archivedAt: null } as const;

export const PUBLIC_CONTENT_FILTER = {
  isPublished: true,
  archivedAt: null,
} as const;

/**
 * Adds published + not-archived to an existing query without clobbering a
 * `$or` the caller already built (Mongo allows only one top-level `$or`, so
 * a naive spread silently drops one of them).
 */
export function publicContentQuery<T extends Record<string, unknown>>(
  query: T,
  options: { requirePublished?: boolean } = {},
): T & Record<string, unknown> {
  const { requirePublished = true } = options;
  const filter: Record<string, unknown> = requirePublished
    ? { ...PUBLIC_CONTENT_FILTER }
    : { ...NOT_ARCHIVED_FILTER };
  return { ...query, ...filter };
}
