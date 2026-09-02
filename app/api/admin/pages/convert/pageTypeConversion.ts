// Pure draft builder for "Change page type safely" (ported from EEO).
//
// A conversion never mutates the source: it builds an UNPUBLISHED draft of
// the target model carrying the shared content, under the same tenant, with a
// distinct name/slug so it can never collide with the live page. The caller
// validates relationships and persists it via createUniqueDuplicate.

export type AdminPageKind = 'category' | 'attraction' | 'category-landing';

type PageRecord = Record<string, unknown>;

const SHARED_FIELDS = [
  'pageTemplate', 'urlType', 'breadcrumbLabel', 'parentPage', 'cityDestination',
  'description', 'longDescription', 'heroImage', 'images', 'imageMetadata',
  'highlights', 'features', 'faqs', 'travelTips', 'linkedPageIds',
  'linkedCategoryIds', 'linkedPagesTitle', 'linkedPagesSubtitle', 'metaTitle',
  'metaDescription', 'keywords',
] as const;

export const PAGE_KIND_LABELS: Record<AdminPageKind, string> = {
  category: 'Category',
  attraction: 'Attraction',
  'category-landing': 'Category 2',
};

function cloneValue(value: unknown): unknown {
  if (value === null || value === undefined || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value instanceof Map) {
    return Object.fromEntries([...value.entries()].map(([key, item]) => [key, cloneValue(item)]));
  }
  const objectId = value as { toHexString?: () => string };
  if (typeof objectId.toHexString === 'function') return objectId.toHexString();
  return Object.fromEntries(
    Object.entries(value as PageRecord)
      .filter(([key]) => key !== '_id' && key !== '__v')
      .map(([key, item]) => [key, cloneValue(item)]),
  );
}

function pick(source: PageRecord, fields: readonly string[]): PageRecord {
  return Object.fromEntries(
    fields
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, cloneValue(source[field])]),
  );
}

function cleanBaseLabel(value: unknown, fallback: string): string {
  const label = typeof value === 'string' ? value.trim() : '';
  return (label || fallback)
    .replace(/\s+\((?:Category|Attraction|Category 2)(?:\s+\d+)?\)$/i, '')
    .trim() || fallback;
}

function cleanBaseSlug(value: unknown, fallback: string): string {
  const slug = (typeof value === 'string' ? value : fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-(?:category|attraction|category-2)(?:-\d+)?$/i, '')
    .replace(/-+$/g, '');
  return slug || fallback;
}

function convertedIdentity(source: PageRecord, targetKind: AdminPageKind, attempt: number) {
  const typeLabel = PAGE_KIND_LABELS[targetKind];
  const typeSlug = targetKind === 'category-landing' ? 'category-2' : targetKind;
  const ordinal = attempt === 1 ? '' : ` ${attempt}`;
  const slugOrdinal = attempt === 1 ? '' : `-${attempt}`;
  const labelSuffix = ` (${typeLabel}${ordinal})`;
  const slugSuffix = `-${typeSlug}${slugOrdinal}`;
  const baseLabel = cleanBaseLabel(source.name ?? source.title, 'Page');
  const baseSlug = cleanBaseSlug(source.slug, 'page');
  const maxLabel = targetKind === 'category' ? 100 : 200;
  return {
    label: `${baseLabel.slice(0, Math.max(1, maxLabel - labelSuffix.length)).trimEnd()}${labelSuffix}`,
    slug: `${baseSlug.slice(0, Math.max(1, 100 - slugSuffix.length)).replace(/-+$/g, '') || 'page'}${slugSuffix}`,
  };
}

function convertedTranslations(value: unknown, targetKind: AdminPageKind): unknown {
  if (!value || typeof value !== 'object') return value;
  const source = value instanceof Map ? Object.fromEntries(value.entries()) : value as PageRecord;
  return Object.fromEntries(Object.entries(source).map(([locale, rawTranslation]) => {
    const translation = cloneValue(rawTranslation) as PageRecord;
    if (targetKind === 'category') {
      if (translation.title !== undefined) translation.name = translation.title;
      delete translation.title;
      delete translation.gridTitle;
      delete translation.gridSubtitle;
    } else {
      if (translation.name !== undefined) translation.title = translation.name;
      delete translation.name;
    }
    return [locale, translation];
  }));
}

export function isAllowedCrossModelConversion(sourceKind: AdminPageKind, targetKind: AdminPageKind): boolean {
  return sourceKind === 'category'
    ? targetKind === 'attraction' || targetKind === 'category-landing'
    : targetKind === 'category';
}

export function buildPageTypeConversionDraft(params: {
  source: PageRecord;
  sourceKind: AdminPageKind;
  targetKind: AdminPageKind;
  tenantId: string;
  id: string;
  attempt: number;
}): PageRecord {
  if (!isAllowedCrossModelConversion(params.sourceKind, params.targetKind)) {
    throw new Error('Unsupported page-type conversion');
  }

  const { source, targetKind } = params;
  const identity = convertedIdentity(source, targetKind, Math.max(1, Math.floor(params.attempt)));
  const shared = pick(source, SHARED_FIELDS);
  if (source.translations !== undefined) {
    shared.translations = convertedTranslations(source.translations, targetKind);
  }

  if (targetKind === 'category') {
    return {
      ...shared,
      _id: params.id,
      tenantId: params.tenantId,
      name: identity.label,
      slug: identity.slug,
      color: '#3B82F6',
      order: 0,
      popularDestinationIds: [],
      isPublished: false,
      featured: false,
      tourCount: 0,
      archivedAt: null,
    };
  }

  const label = cleanBaseLabel(source.name ?? source.title, 'Page');
  const description = typeof shared.description === 'string' && shared.description.trim()
    ? shared.description.trim()
    : typeof shared.longDescription === 'string' && shared.longDescription.trim()
      ? shared.longDescription.trim().slice(0, 500)
      : label;
  return {
    ...shared,
    _id: params.id,
    tenantId: params.tenantId,
    title: identity.label,
    slug: identity.slug,
    description,
    pageType: targetKind === 'category-landing' ? 'category' : 'attraction',
    ...(targetKind === 'category-landing' ? { categoryId: String(source._id) } : {}),
    gridTitle: typeof source.gridTitle === 'string' && source.gridTitle.trim()
      ? source.gridTitle.trim()
      : label,
    showStats: typeof source.showStats === 'boolean' ? source.showStats : true,
    itemsPerRow: typeof source.itemsPerRow === 'number' ? source.itemsPerRow : 4,
    linkedTourIds: Array.isArray(source.linkedTourIds) ? cloneValue(source.linkedTourIds) : [],
    isPublished: false,
    featured: false,
    archivedAt: null,
  };
}
