type TenantSearchHit = Record<string, unknown>;

const GERMAN_SEARCH_TEXT_PATTERN =
  /\b(und|mit|von|nach|tage|stunden|uhr|abholung|ausflug|kreuzfahrt|erlebnis|ganzt[aä]gig|halbt[aä]gig|gef[üu]hrte|privat|inklusive|schnorchel|pyramiden|entdeckung|abendessen|zur|zum)\b/i;

const SEARCH_TOUR_TEXT_FIELDS = [
  'title',
  'description',
  'location',
  'duration',
  'tags',
  'highlights',
];

const asRecord = (value: unknown): TenantSearchHit | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as TenantSearchHit;
};

const getTranslationBucket = (hit: TenantSearchHit, locale: string) => {
  const translations = asRecord(hit.translations);
  if (!translations) return undefined;
  const normalizedLocale = locale.toLowerCase();
  return asRecord(translations[normalizedLocale]) || asRecord(translations[normalizedLocale.split('-')[0]]);
};

const localizeTourSearchHit = <T extends TenantSearchHit>(hit: T, locale: string): T => {
  const bucket = getTranslationBucket(hit, locale);
  if (!bucket) return hit;

  const localizedFields: TenantSearchHit = {};
  for (const field of SEARCH_TOUR_TEXT_FIELDS) {
    const value = bucket[field];
    if (typeof value === 'string' && value.trim()) localizedFields[field] = value;
    if (Array.isArray(value) && value.length > 0) localizedFields[field] = value;
  }

  return Object.keys(localizedFields).length > 0 ? ({ ...hit, ...localizedFields } as T) : hit;
};

const collectSearchText = (hit: TenantSearchHit) =>
  SEARCH_TOUR_TEXT_FIELDS.flatMap((field) => {
    const value = hit[field];
    if (typeof value === 'string') return [value.replace(/<[^>]+>/g, ' ')];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
    return [];
  }).join(' ');

export const searchTourHitLooksGerman = (hit: TenantSearchHit) =>
  GERMAN_SEARCH_TEXT_PATTERN.test(collectSearchText(hit));

const tourSearchHitKey = (hit: TenantSearchHit) =>
  String(hit.slug || hit.objectID || hit._id || '').trim().toLowerCase();

const scoreTourSearchHit = (hit: TenantSearchHit, locale: string) => {
  const localizedHit = localizeTourSearchHit(hit, locale);
  const german = searchTourHitLooksGerman(localizedHit);
  const wantsGerman = locale.toLowerCase().startsWith('de');
  const hasLocaleTranslation = Boolean(getTranslationBucket(hit, locale));
  let score = hasLocaleTranslation ? 12 : 0;
  score += wantsGerman ? (german ? 10 : 0) : (german ? -20 : 10);
  if (typeof localizedHit.title === 'string' && localizedHit.title.trim()) score += 2;
  if (typeof localizedHit.description === 'string' && localizedHit.description.trim()) score += 1;
  if (typeof localizedHit.image === 'string' && localizedHit.image.trim()) score += 1;
  return score;
};

const toTenantIdList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(toTenantIdList);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  if (value && typeof value === 'object' && 'tenantId' in value) {
    return toTenantIdList((value as { tenantId?: unknown }).tenantId);
  }

  return [];
};

export function searchHitBelongsToTenant(hit: TenantSearchHit, tenantId?: string | null): boolean {
  const normalizedTenantId = (tenantId || 'default').trim().toLowerCase();

  if (!normalizedTenantId || normalizedTenantId === 'all') {
    return true;
  }

  const hitTenantIds = [
    ...toTenantIdList(hit.tenantId),
    ...toTenantIdList(hit.tenant_id),
    ...toTenantIdList(hit.tenantIds),
    ...toTenantIdList(hit.tenant_ids),
    ...toTenantIdList(hit.brandId),
    ...toTenantIdList(hit.brandIds),
    ...toTenantIdList(hit.tenant),
    ...toTenantIdList(hit.tenants),
  ];

  if (hitTenantIds.length === 0) {
    return normalizedTenantId === 'default';
  }

  return hitTenantIds.includes(normalizedTenantId);
}

export function filterSearchHitsByTenant<T extends TenantSearchHit>(
  hits: T[],
  tenantId?: string | null
): T[] {
  return hits.filter((hit) => searchHitBelongsToTenant(hit, tenantId));
}

export function filterTourSearchHitsByTenant<T extends TenantSearchHit>(
  hits: T[],
  tenantId?: string | null,
  locale = 'en'
): T[] {
  const bestByRoute = new Map<string, T>();
  for (const hit of filterSearchHitsByTenant(hits, tenantId)) {
    const key = tourSearchHitKey(hit);
    if (!key) continue;
    const existing = bestByRoute.get(key);
    if (!existing || scoreTourSearchHit(hit, locale) > scoreTourSearchHit(existing, locale)) {
      bestByRoute.set(key, hit);
    }
  }

  const localized = Array.from(bestByRoute.values()).map((hit) => localizeTourSearchHit(hit, locale));
  if (locale.toLowerCase().startsWith('de')) return localized;
  return localized.filter((hit) => !searchTourHitLooksGerman(hit));
}
