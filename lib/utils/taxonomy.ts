type TaxonomyLike = {
  _id?: unknown;
  slug?: string | null;
  name?: string | null;
  tourCount?: number | null;
  featured?: boolean | null;
  isPublished?: boolean | null;
  image?: string | null;
  description?: string | null;
};

function normalizeValue(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function getTaxonomyKey(item: TaxonomyLike) {
  const slug = normalizeValue(item.slug);
  if (slug) return `slug:${slug}`;

  const name = normalizeValue(item.name);
  if (name) return `name:${name}`;

  return null;
}

function getScore(item: TaxonomyLike) {
  return (
    (Number(item.tourCount) || 0) * 100 +
    (item.featured ? 25 : 0) +
    (item.isPublished !== false ? 10 : 0) +
    (item.image ? 5 : 0) +
    (item.description ? 2 : 0)
  );
}

export function dedupeTaxonomyEntries<T extends TaxonomyLike>(items: T[]): T[] {
  const entries = new Map<string, T>();

  for (const item of items) {
    const key = getTaxonomyKey(item);
    if (!key) continue;

    const existing = entries.get(key);
    if (!existing || getScore(item) > getScore(existing)) {
      entries.set(key, item);
    }
  }

  return Array.from(entries.values());
}

export function filterVisibleTaxonomyEntries<T extends TaxonomyLike>(
  items: T[],
  options?: { requireTours?: boolean }
): T[] {
  const requireTours = options?.requireTours ?? false;

  return dedupeTaxonomyEntries(items).filter((item) => {
    if (!normalizeValue(item.name) || !normalizeValue(item.slug)) {
      return false;
    }

    if (item.isPublished === false) {
      return false;
    }

    if (!requireTours) {
      return true;
    }

    return (Number(item.tourCount) || 0) > 0;
  });
}
