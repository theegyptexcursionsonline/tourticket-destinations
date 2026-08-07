import { Types } from 'mongoose';

/**
 * Keep only the ids that actually belong to the given tenant.
 *
 * Curated relationships (popular destinations, linked pages/categories) arrive
 * as raw ObjectIds in an admin request body. A stored id is a request, not a
 * grant: an admin scoped to one brand can read another brand's ids from any
 * public listing and paste them in. The storefront resolvers scope their reads,
 * so a foreign id renders nothing — but it stays in the document, silently
 * broken, and every future reader has to remember to re-scope. Reject it at the
 * boundary instead, so what is stored is true.
 *
 * Unknown or malformed ids are dropped rather than throwing: the operator's
 * other edits should still save.
 */
type OwnedKind = 'destination' | 'attractionPage' | 'category';

type OwnedIdLookup = (filter: Record<string, unknown>) => Promise<Array<{ _id: unknown }>>;

// Models are imported lazily, at call time. Importing all three eagerly would
// register three Mongoose schemas in every route that merely wants to validate
// an id list — which is both wasteful and enough to break route tests that
// stub mongoose. Each model has a differently-typed `find`, so narrow it to the
// one shape this helper needs rather than fighting the union.
const LOOKUP_FOR_KIND: Record<OwnedKind, OwnedIdLookup> = {
  destination: async (filter) => {
    const { default: Destination } = await import('@/lib/models/Destination');
    return Destination.find(filter).select('_id').lean() as Promise<Array<{ _id: unknown }>>;
  },
  attractionPage: async (filter) => {
    const { default: AttractionPage } = await import('@/lib/models/AttractionPage');
    return AttractionPage.find(filter).select('_id').lean() as Promise<Array<{ _id: unknown }>>;
  },
  category: async (filter) => {
    const { default: Category } = await import('@/lib/models/Category');
    return Category.find(filter).select('_id').lean() as Promise<Array<{ _id: unknown }>>;
  },
};

export async function filterTenantOwnedIds(
  ids: unknown,
  kind: OwnedKind,
  tenantId: string,
): Promise<string[]> {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  if (!tenantId) return [];

  const candidates = ids
    .map((id) => String(id))
    .filter((id) => Types.ObjectId.isValid(id));
  if (candidates.length === 0) return [];

  const owned = await LOOKUP_FOR_KIND[kind]({ _id: { $in: candidates }, tenantId });
  const ownedIds = new Set(owned.map((doc) => String(doc._id)));
  // Preserve the operator's ordering — these lists are display order.
  return candidates.filter((id) => ownedIds.has(id));
}

/**
 * Normalise every tenant-owned id array on a category body in place.
 * Only keys the caller actually sent are touched, so a partial update (an
 * archive toggle, say) cannot blank a curated list it never mentioned.
 */
export async function scopeCategoryRelationIds(
  body: Record<string, unknown>,
  tenantId: string,
): Promise<void> {
  const fields: Array<[string, OwnedKind]> = [
    ['popularDestinationIds', 'destination'],
    ['linkedPageIds', 'attractionPage'],
    ['linkedCategoryIds', 'category'],
  ];

  for (const [key, kind] of fields) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    body[key] = await filterTenantOwnedIds(body[key], kind, tenantId);
  }
}
