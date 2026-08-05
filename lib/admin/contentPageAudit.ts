import type { AdminAuditDetail } from '@/lib/admin/adminAudit';
import type { AdminAuditChange } from '@/lib/models/AdminMutationAudit';

type ContentPageKind = 'attraction page' | 'category page';
type ContentPageOperation = 'create' | 'update' | 'delete';
type PageRecord = Record<string, unknown>;

const TRACKED_FIELDS = [
  'title',
  'name',
  'slug',
  'pageType',
  'urlType',
  'description',
  'longDescription',
  'heroImage',
  'images',
  'imageMetadata',
  'highlights',
  'features',
  'keywords',
  'faqs',
  'travelTips',
  'gridTitle',
  'gridSubtitle',
  'isPublished',
  'featured',
  'order',
  'categoryId',
  'cityDestination',
  'parentPage',
  'linkedTourIds',
  'linkedPageIds',
  'linkedCategoryIds',
  'translations',
  'archivedAt',
] as const;

const SAFE_VALUE_FIELDS = new Set([
  'title',
  'name',
  'slug',
  'pageType',
  'urlType',
  'isPublished',
  'featured',
  'order',
  'archivedAt',
]);

const FIELD_LABELS: Record<string, string> = {
  title: 'title',
  name: 'name',
  slug: 'URL slug',
  pageType: 'page type',
  urlType: 'URL type',
  description: 'description',
  longDescription: 'long description',
  heroImage: 'hero image',
  images: 'gallery',
  imageMetadata: 'image SEO details',
  highlights: 'highlights',
  features: 'features',
  keywords: 'keywords',
  faqs: 'FAQs',
  travelTips: 'travel tips',
  gridTitle: 'listing heading',
  gridSubtitle: 'listing subheading',
  isPublished: 'published state',
  featured: 'featured state',
  order: 'display order',
  categoryId: 'category',
  cityDestination: 'owning city',
  parentPage: 'parent page',
  linkedTourIds: 'linked tours',
  linkedPageIds: 'linked pages',
  linkedCategoryIds: 'linked categories',
  translations: 'translations',
  archivedAt: 'archive state',
};

function asRecord(value: unknown): PageRecord {
  if (!value || typeof value !== 'object') return {};
  const candidate = value as PageRecord & { toObject?: (options?: Record<string, unknown>) => PageRecord };
  if (typeof candidate.toObject === 'function') {
    return candidate.toObject({ depopulate: true, getters: false, virtuals: false });
  }
  return candidate;
}

function normalized(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === 'object') {
    const objectValue = value as { toHexString?: () => string } & PageRecord;
    if (typeof objectValue.toHexString === 'function') return objectValue.toHexString();
    return Object.fromEntries(
      Object.entries(objectValue)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalized(child)]),
    );
  }
  return value ?? null;
}

function valuesMatch(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalized(left)) === JSON.stringify(normalized(right));
}

function idFrom(record: PageRecord): string | undefined {
  const value = record._id ?? record.id;
  if (typeof value === 'string') return value.slice(0, 160);
  if (value && typeof value === 'object' && 'toString' in value) {
    const rendered = String(value);
    return rendered === '[object Object]' ? undefined : rendered.slice(0, 160);
  }
  return undefined;
}

function labelFrom(record: PageRecord): string {
  for (const field of ['title', 'name', 'slug']) {
    const value = record[field];
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 160);
  }
  return 'Untitled page';
}

function tenantIdsFrom(record: PageRecord): string[] | undefined {
  const raw = record.tenantIds ?? record.tenantId;
  const values = Array.isArray(raw) ? raw : [raw];
  const tenantIds = values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value && value !== 'all');
  return tenantIds.length ? Array.from(new Set(tenantIds)).slice(0, 100) : undefined;
}

function safeValue(value: unknown): AdminAuditChange['after'] {
  if (value == null || value === '') return 'Not set';
  if (typeof value === 'string') return value.trim().slice(0, 300);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

function changedFieldSummary(fields: string[]): string {
  if (!fields.length) return 'no effective content change';
  const labels = fields.slice(0, 5).map((field) => FIELD_LABELS[field] || field);
  return `${labels.join(', ')}${fields.length > labels.length ? ` +${fields.length - labels.length} more` : ''}`;
}

export function contentPageAuditAttemptDetail(params: {
  kind: ContentPageKind;
  operation: ContentPageOperation;
  record: unknown;
  resourceId?: string;
}): AdminAuditDetail {
  const record = asRecord(params.record);
  const resourceLabel = labelFrom(record);
  return {
    action: params.operation,
    resourceType: 'pages',
    resourceId: params.resourceId || idFrom(record),
    resourceLabel,
    summary: `Attempted to ${params.operation} ${params.kind} “${resourceLabel}”`,
    tenantIds: tenantIdsFrom(record),
  };
}

export function contentPageAuditDetail(params: {
  kind: ContentPageKind;
  operation: ContentPageOperation;
  before?: unknown;
  after?: unknown;
}): AdminAuditDetail {
  const before = asRecord(params.before);
  const after = asRecord(params.after);
  const record = Object.keys(after).length ? after : before;
  const resourceLabel = labelFrom(record);
  const resourceId = idFrom(record);
  const tenantIds = tenantIdsFrom(record);

  if (params.operation === 'create') {
    const changedFields = TRACKED_FIELDS.filter((field) => after[field] !== undefined && after[field] !== null);
    const changes = changedFields.flatMap((field): AdminAuditChange[] => {
      if (!SAFE_VALUE_FIELDS.has(field)) return [];
      const value = safeValue(after[field]);
      return value === undefined ? [] : [{ field, after: value }];
    });
    return {
      action: 'create',
      resourceType: 'pages',
      resourceId,
      resourceLabel,
      summary: `Created ${params.kind} “${resourceLabel}”`,
      changedFields: [...changedFields],
      changes,
      tenantIds,
      replaceCapturedInput: true,
    };
  }

  if (params.operation === 'delete') {
    return {
      action: 'delete',
      resourceType: 'pages',
      resourceId,
      resourceLabel,
      summary: `Deleted ${params.kind} “${resourceLabel}”`,
      changedFields: ['record'],
      changes: [{ field: 'record', before: 'Present', after: 'Deleted' }],
      tenantIds,
      replaceCapturedInput: true,
    };
  }

  const changedFields = TRACKED_FIELDS.filter((field) => !valuesMatch(before[field], after[field]));
  const changes = changedFields.flatMap((field): AdminAuditChange[] => {
    if (!SAFE_VALUE_FIELDS.has(field)) return [];
    const beforeValue = safeValue(before[field]);
    const afterValue = safeValue(after[field]);
    if (beforeValue === undefined && afterValue === undefined) return [];
    return [{ field, before: beforeValue, after: afterValue }];
  });
  const onlyArchiveChanged = changedFields.length === 1 && changedFields[0] === 'archivedAt';
  const archiveWasSet = normalized(after.archivedAt) !== null && after.archivedAt !== '';
  const action = onlyArchiveChanged ? 'execute' : 'update';
  const summary = onlyArchiveChanged
    ? `${archiveWasSet ? 'Archived' : 'Restored'} ${params.kind} “${resourceLabel}”`
    : `Updated ${params.kind} “${resourceLabel}”: ${changedFieldSummary([...changedFields])}`;

  return {
    action,
    resourceType: 'pages',
    resourceId,
    resourceLabel,
    summary,
    changedFields: [...changedFields],
    changes,
    tenantIds,
    replaceCapturedInput: true,
  };
}
