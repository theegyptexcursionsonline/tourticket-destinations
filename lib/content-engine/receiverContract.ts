import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { localizedContentPath, type ContentType } from '@/lib/content/contentUrl';
import { verifyContentEngine } from '@/lib/auth/verifyContentEngine';

export const CONTENT_ENGINE_TYPES = ['blog', 'destination', 'category', 'tour'] as const;
export type ContentEngineType = (typeof CONTENT_ENGINE_TYPES)[number];

const ENGLISH_TENANTS = {
  'hurghada-excursions-online': 'hurghadaexcursionsonline.com',
  'cairo-excursions-online': 'cairoexcursionsonline.com',
  'makadi-bay': 'makadibayexcursions.com',
  'el-gouna': 'elgounaexcursions.com',
  'luxor-excursions': 'luxorexcursions.com',
  'sharm-excursions-online': 'sharmexcursionsonline.com',
  'aswan-excursions': 'aswanexcursions.com',
  'marsa-alam-excursions': 'marsaalamexcursions.online',
  'dahab-excursions': 'dahabexcursions.com',
} as const;

export type ContentEngineTenantId = keyof typeof ENGLISH_TENANTS;
export const CONTENT_ENGINE_TENANT_IDS = Object.freeze(
  Object.keys(ENGLISH_TENANTS) as ContentEngineTenantId[],
);
export const CONTENT_ENGINE_DEFAULT_LOCALE = 'en';
export const CONTENT_ENGINE_SUPPORTED_LOCALES = ['en', 'ar', 'es', 'fr', 'ru', 'de'] as const;

export const CONTENT_ENGINE_CAPABILITIES = Object.freeze({
  contractVersion: 1,
  supportedTypes: CONTENT_ENGINE_TYPES,
  tenants: CONTENT_ENGINE_TENANT_IDS.map((id) => ({
    id,
    domain: ENGLISH_TENANTS[id],
    defaultLocale: CONTENT_ENGINE_DEFAULT_LOCALE,
    supportedLocales: CONTENT_ENGINE_SUPPORTED_LOCALES,
  })),
  idempotency: {
    required: true,
    header: 'Idempotency-Key',
    claimLeaseSeconds: 60,
    receiptRetentionDays: 30,
  },
  manualReviewTypes: ['tour'] as const,
});

export function resolveContentEngineTenant(input: unknown):
  | { ok: true; tenantId: ContentEngineTenantId }
  | { ok: false; error: string } {
  if (typeof input !== 'string' || !input) {
    return { ok: false, error: 'tenantId is required' };
  }
  if (input !== input.trim() || !/^[a-z0-9-]+$/.test(input)) {
    return { ok: false, error: 'tenantId is malformed' };
  }
  if (!Object.prototype.hasOwnProperty.call(ENGLISH_TENANTS, input)) {
    return { ok: false, error: `tenantId "${input}" is not configured for this receiver` };
  }
  return { ok: true, tenantId: input as ContentEngineTenantId };
}

export function resolveContentEngineLocale(input: unknown):
  | { ok: true; locale: 'en' }
  | { ok: false; error: string } {
  if (input === undefined || input === null || input === '') {
    return { ok: true, locale: CONTENT_ENGINE_DEFAULT_LOCALE };
  }
  if (input !== CONTENT_ENGINE_DEFAULT_LOCALE) {
    return {
      ok: false,
      error: `defaultLocale must be "${CONTENT_ENGINE_DEFAULT_LOCALE}" for this receiver`,
    };
  }
  return { ok: true, locale: CONTENT_ENGINE_DEFAULT_LOCALE };
}

type RouteHandler<Args extends unknown[]> = (
  request: NextRequest,
  ...args: Args
) => Response | Promise<Response>;

/**
 * Authenticates, parses a cloned body, and validates the exact tenant contract
 * before entering withAdminAudit. This ordering is deliberate: an unknown or
 * malformed tenant must produce a zero-write 422, including zero audit writes.
 */
export function withContentEngineTenantGate<Args extends unknown[]>(
  handler: RouteHandler<Args>,
): RouteHandler<Args> {
  return async (request, ...args) => {
    const authError = verifyContentEngine(request, { registerAuditActor: false });
    if (authError) return authError;

    let body: unknown;
    try {
      body = await request.clone().json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const tenant = resolveContentEngineTenant(
      body && typeof body === 'object' ? (body as { tenantId?: unknown }).tenantId : undefined,
    );
    if (!tenant.ok) {
      return NextResponse.json(
        { error: tenant.error, code: 'CONTENT_ENGINE_TENANT_REJECTED' },
        { status: 422 },
      );
    }
    return handler(request, ...args);
  };
}

export function requireContentEngineTenantFromQuery(request: NextRequest):
  | { ok: true; tenantId: ContentEngineTenantId }
  | { ok: false; response: NextResponse } {
  const tenant = resolveContentEngineTenant(request.nextUrl.searchParams.get('tenantId'));
  if (tenant.ok) return tenant;
  return {
    ok: false,
    response: NextResponse.json(
      { error: tenant.error, code: 'CONTENT_ENGINE_TENANT_REJECTED' },
      { status: 422 },
    ),
  };
}

const TRANSLATION_FIELDS: Record<ContentEngineType, ReadonlySet<string>> = {
  blog: new Set(['title', 'excerpt', 'content', 'metaTitle', 'metaDescription', 'faqs']),
  destination: new Set([
    'name',
    'description',
    'longDescription',
    'highlights',
    'bestTimeToVisit',
    'gettingThere',
    'gettingAround',
    'practicalInfo',
    'travelTips',
    'metaTitle',
    'metaDescription',
  ]),
  category: new Set([
    'name',
    'description',
    'longDescription',
    'highlights',
    'features',
    'metaTitle',
    'metaDescription',
  ]),
  tour: new Set([
    'title',
    'description',
    'longDescription',
    'location',
    'duration',
    'highlights',
    'whatsIncluded',
    'whatsNotIncluded',
    'itinerary',
    'faq',
    'faqs',
    'metaTitle',
    'metaDescription',
  ]),
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function sanitizeContentEngineTranslations(
  type: ContentEngineType,
  input: unknown,
  options: {
    supportedLocales?: readonly string[];
    defaultLocale?: string;
  } = {},
): {
  translations: Record<string, Record<string, unknown>>;
  droppedLocales: string[];
  droppedFields: Record<string, string[]>;
} {
  const supportedLocales = options.supportedLocales ?? CONTENT_ENGINE_SUPPORTED_LOCALES;
  const defaultLocale = options.defaultLocale ?? CONTENT_ENGINE_DEFAULT_LOCALE;
  const supported = new Set(supportedLocales);
  const allowedFields = TRANSLATION_FIELDS[type];
  const translations: Record<string, Record<string, unknown>> = {};
  const droppedLocales: string[] = [];
  const droppedFields: Record<string, string[]> = {};

  if (input === undefined || input === null) return { translations, droppedLocales, droppedFields };
  if (!isPlainRecord(input)) {
    return { translations, droppedLocales: ['<malformed>'], droppedFields };
  }

  for (const [locale, rawBucket] of Object.entries(input)) {
    if (locale === defaultLocale || !supported.has(locale) || !isPlainRecord(rawBucket)) {
      droppedLocales.push(locale);
      continue;
    }
    const bucket: Record<string, unknown> = {};
    const dropped: string[] = [];
    for (const [field, value] of Object.entries(rawBucket)) {
      if (!allowedFields.has(field)) {
        dropped.push(field);
        continue;
      }
      bucket[field] = value;
    }
    if (Object.keys(bucket).length > 0) translations[locale] = bucket;
    if (dropped.length > 0) droppedFields[locale] = dropped.sort();
  }

  return {
    translations,
    droppedLocales: droppedLocales.sort(),
    droppedFields,
  };
}

export function localizedReceiverPath(
  type: ContentEngineType,
  slug: string,
  locale: string,
): string {
  if (type === 'blog') {
    const path = `/blog/${slug}`;
    return locale === CONTENT_ENGINE_DEFAULT_LOCALE ? path : `/${locale}${path}`;
  }
  return localizedContentPath(type as ContentType, slug, 'direct', locale);
}

export function contentEngineLiveUrl(
  tenantId: ContentEngineTenantId,
  type: ContentEngineType,
  slug: string,
  locale: string = CONTENT_ENGINE_DEFAULT_LOCALE,
): string {
  return `https://${ENGLISH_TENANTS[tenantId]}${localizedReceiverPath(type, slug, locale)}`;
}

export function strictTenantSlugQuery(
  tenantId: ContentEngineTenantId,
  slug: string,
): { tenantId: ContentEngineTenantId; slug: string } {
  return { tenantId, slug };
}
