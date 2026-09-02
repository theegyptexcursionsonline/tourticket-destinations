import type { AuditActor } from '@/lib/admin/auditStamp';
import { finalizeAddOnAssignments, stripBookingOptionClientKeys } from '@/lib/admin/addOnAssignments';
import { ensureBookingOptionPricingKeys } from '@/lib/revenue/pricingKeys';

type SourceRecord = Record<string, unknown>;

const TOUR_COPY_FIELDS = [
  'tenantIds', 'breadcrumbLabel', 'parentPage', 'destination', 'category',
  'description', 'longDescription', 'price', 'originalPrice', 'discountPrice', 'discountPercent', 'revenueGuestPrices',
  'duration', 'difficulty', 'maxGroupSize', 'location', 'image', 'images',
  'imageMetadata', 'includes', 'highlights', 'whatsIncluded', 'whatsNotIncluded',
  'tags', 'itinerary', 'faq', 'bookingOptions', 'addOns', 'whatToBring',
  'whatToWear', 'physicalRequirements', 'accessibilityInfo', 'groupSize',
  'transportationDetails', 'mealInfo', 'weatherPolicy', 'photoPolicy', 'tipPolicy',
  'healthSafety', 'culturalInfo', 'seasonalVariations', 'localCustoms',
  'notSuitableFor', 'needToKnow', 'meetingPoint', 'languages', 'ageRestriction',
  'cancellationPolicy', 'operatedBy', 'availability', 'attractions', 'interests',
  'metaTitle', 'metaDescription', 'keywords', 'translations',
] as const;

const DESTINATION_COPY_FIELDS = [
  'breadcrumbLabel', 'parentPage', 'country', 'image', 'images', 'imageMetadata',
  'description', 'longDescription', 'coordinates', 'currency', 'timezone',
  'bestTimeToVisit', 'highlights', 'thingsToDo', 'localCustoms',
  'visaRequirements', 'languagesSpoken', 'emergencyNumber', 'averageTemperature',
  'climate', 'weatherWarnings', 'faqs', 'travelTips', 'bestDealTourIds',
  'topTourIds', 'metaTitle', 'metaDescription', 'keywords', 'tags', 'translations',
] as const;

const PAGE_COPY_FIELDS = [
  'description', 'longDescription', 'pageType', 'pageTemplate', 'categoryId',
  'breadcrumbLabel', 'parentPage', 'cityDestination', 'heroImage', 'images',
  'imageMetadata', 'highlights', 'features', 'faqs', 'travelTips',
  'linkedTourIds', 'linkedPageIds', 'linkedCategoryIds', 'linkedPagesTitle',
  'linkedPagesSubtitle', 'gridTitle', 'gridSubtitle', 'showStats', 'itemsPerRow',
  'metaTitle', 'metaDescription', 'keywords', 'translations',
] as const;

function cloneValue(value: unknown): unknown {
  if (value === null || value === undefined || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value instanceof Map) {
    return Object.fromEntries([...value.entries()].map(([key, item]) => [key, cloneValue(item)]));
  }
  const objectId = value as { toHexString?: () => string };
  if (typeof objectId.toHexString === 'function') return objectId.toHexString();

  const clone: SourceRecord = {};
  for (const [key, item] of Object.entries(value as SourceRecord)) {
    if (key === '_id' || key === '__v') continue;
    clone[key] = cloneValue(item);
  }
  return clone;
}

function pick(source: SourceRecord, fields: readonly string[]): SourceRecord {
  const result: SourceRecord = {};
  for (const field of fields) {
    if (source[field] !== undefined) result[field] = cloneValue(source[field]);
  }
  return result;
}

function baseLabel(value: unknown, fallback: string): string {
  return ((typeof value === 'string' ? value.trim() : '') || fallback)
    .replace(/\s+\(Copy(?:\s+\d+)?\)$/i, '')
    .trim() || fallback;
}

function baseSlug(value: unknown, fallback: string): string {
  return (typeof value === 'string' ? value : fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-copy(?:-\d+)?$/i, '') || fallback;
}

export function duplicateIdentity(params: {
  label: unknown;
  slug: unknown;
  attempt: number;
  labelLimit: number;
  slugLimit?: number;
  fallback: string;
}) {
  const attempt = Math.max(1, Math.floor(params.attempt));
  const labelSuffix = attempt === 1 ? ' (Copy)' : ` (Copy ${attempt})`;
  const slugSuffix = attempt === 1 ? '-copy' : `-copy-${attempt}`;
  const label = baseLabel(params.label, params.fallback);
  const slug = baseSlug(params.slug, params.fallback.toLowerCase());
  const slugLimit = params.slugLimit ?? 100;
  return {
    label: `${label.slice(0, Math.max(1, params.labelLimit - labelSuffix.length)).trimEnd()}${labelSuffix}`,
    slug: `${slug.slice(0, Math.max(1, slugLimit - slugSuffix.length)).replace(/-+$/g, '')}${slugSuffix}`,
  };
}

export function buildTourDuplicate(source: SourceRecord, params: { id: string; tenantId: string; attempt: number }) {
  const identity = duplicateIdentity({
    label: source.title, slug: source.slug, attempt: params.attempt,
    labelLimit: 200, slugLimit: 100, fallback: 'Tour',
  });
  const draft = pick(source, TOUR_COPY_FIELDS);
  const sourceOptions = Array.isArray(draft.bookingOptions) ? draft.bookingOptions : [];
  const unkeyedOptions: Array<SourceRecord & {
    clientKey: string;
    id?: string;
    pricingKey?: string;
    label?: string;
    type?: string;
  }> = sourceOptions.map((option, index) => {
    const content = cloneValue(option) as SourceRecord;
    const clientKey = String(content.pricingKey || content.id || content._id || '');
    delete content._id;
    delete content.id;
    delete content.pricingKey;
    return { ...content, id: `copy-${params.id}-${index + 1}`, clientKey };
  });
  const keyedOptions = ensureBookingOptionPricingKeys(params.id, unkeyedOptions) || [];
  const addOns = finalizeAddOnAssignments(draft.addOns, keyedOptions);
  return {
    ...draft,
    _id: params.id,
    tenantId: params.tenantId,
    title: identity.label,
    slug: identity.slug,
    bookingOptions: stripBookingOptionClientKeys(keyedOptions),
    addOns,
    isPublished: false,
    isFeatured: false,
    reviews: [],
    bookings: 0,
    rating: 0,
  };
}

export function buildDestinationDuplicate(
  source: SourceRecord,
  params: { tenantId: string; attempt: number; actor?: AuditActor },
) {
  const identity = duplicateIdentity({
    label: source.name, slug: source.slug, attempt: params.attempt,
    labelLimit: 100, slugLimit: 100, fallback: 'Destination',
  });
  return {
    ...pick(source, DESTINATION_COPY_FIELDS),
    tenantId: params.tenantId,
    name: identity.label,
    slug: identity.slug,
    featured: false,
    isPublished: false,
    tourCount: 0,
    ...(params.actor ? { createdBy: params.actor, updatedBy: params.actor } : {}),
  };
}

export function buildPageDuplicate(
  source: SourceRecord,
  params: { id: string; tenantId: string; attempt: number; actor?: AuditActor },
) {
  const identity = duplicateIdentity({
    label: source.title, slug: source.slug, attempt: params.attempt,
    labelLimit: 200, slugLimit: 100, fallback: 'Page',
  });
  return {
    ...pick(source, PAGE_COPY_FIELDS),
    _id: params.id,
    tenantId: params.tenantId,
    title: identity.label,
    slug: identity.slug,
    featured: false,
    isPublished: false,
    ...(params.actor ? { createdBy: params.actor, updatedBy: params.actor } : {}),
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: number }).code === 11000);
}

export class DuplicateIdentityExhaustedError extends Error {
  constructor() {
    super('Could not reserve a unique name for the duplicate. Please try again.');
    this.name = 'DuplicateIdentityExhaustedError';
  }
}

export async function createUniqueDuplicate<T>(params: {
  build: (attempt: number) => SourceRecord | Promise<SourceRecord>;
  create: (draft: SourceRecord) => Promise<T>;
  maxAttempts?: number;
}): Promise<T> {
  const maxAttempts = params.maxAttempts ?? 25;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await params.create(await params.build(attempt));
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  throw new DuplicateIdentityExhaustedError();
}
