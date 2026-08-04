import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';
import {
  type ContentType,
  type UrlType,
  type AttractionPageKind,
  normalizeUrlType,
  segmentFor,
  pageDefaultSegment,
  attractionPagePath,
  localizedContentPath,
  CITY_SEGMENT,
} from '@/lib/content/contentUrl';
import { defaultLocale } from '@/i18n/config';

export interface ContentMatch {
  type: ContentType;
  slug: string;
  urlType: UrlType;
  segment: string;
  isPublished: boolean;
  citySlug?: string;
  pageKind?: AttractionPageKind;
  parentSlug?: string;
  breadcrumbLabel?: string;
}

const TYPE_PRIORITY: ContentType[] = ['tour', 'destination', 'category', 'page'];

interface ContentDocument {
  slug: string;
  urlType?: string;
  isPublished?: boolean;
  pageType?: string;
  destination?: { slug?: string } | null;
  cityDestination?: { slug?: string } | null;
  parentPage?: { slug?: string; label?: string } | null;
  breadcrumbLabel?: string;
}

function citySlugOf(type: ContentType, doc: ContentDocument): string | undefined {
  const owner = type === 'tour' ? doc.destination : doc.cityDestination;
  return owner && typeof owner === 'object' ? owner.slug : undefined;
}

export async function resolveContentMatches(slug: string): Promise<ContentMatch[]> {
  const tenantId = await getTenantFromRequest();
  await dbConnect(tenantId);
  const scoped = (query: Record<string, unknown>) => buildStrictTenantQuery(query, tenantId);

  const [tour, destination, category, attractionPage] = await Promise.all([
    Tour.findOne(scoped({ slug })).select('slug urlType isPublished destination parentPage breadcrumbLabel').populate('destination', 'slug').lean(),
    Destination.findOne(scoped({ slug })).select('slug urlType isPublished parentPage breadcrumbLabel').lean(),
    Category.findOne(scoped({ slug })).select('slug urlType isPublished cityDestination parentPage breadcrumbLabel').populate('cityDestination', 'slug').lean(),
    AttractionPage.findOne(scoped({ slug })).select('slug urlType isPublished pageType cityDestination parentPage breadcrumbLabel').populate('cityDestination', 'slug').lean(),
  ]);

  const matches: ContentMatch[] = [];
  const push = (type: ContentType, doc: ContentDocument | null) => {
    if (!doc) return;
    const urlType = normalizeUrlType(doc.urlType);
    const citySlug = citySlugOf(type, doc);
    const parentSlug = doc.parentPage?.slug;
    const pageKind: AttractionPageKind | undefined =
      type === 'page' ? (doc.pageType === 'category' ? 'category' : 'attraction') : undefined;
    const segment = parentSlug
      ? CITY_SEGMENT
      : type === 'page' && urlType === 'default'
        ? pageDefaultSegment(pageKind)
        : segmentFor(type, urlType);
    matches.push({
      type,
      slug: String(doc.slug),
      urlType,
      segment,
      isPublished: doc.isPublished !== false,
      ...(citySlug ? { citySlug } : {}),
      ...(parentSlug ? { parentSlug } : {}),
      ...(doc.breadcrumbLabel ? { breadcrumbLabel: doc.breadcrumbLabel } : {}),
      ...(pageKind ? { pageKind } : {}),
    });
  };

  push('tour', tour as ContentDocument | null);
  push('destination', destination as ContentDocument | null);
  push('category', category as ContentDocument | null);
  push('page', attractionPage as ContentDocument | null);
  return matches.sort((a, b) => TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type));
}

export type ResolveDecision =
  | { action: 'render'; match: ContentMatch }
  | { action: 'redirect'; to: string }
  | { action: 'notFound' };

function canonicalPathFor(match: ContentMatch, locale: string): string {
  if (match.type === 'page') {
    const path = attractionPagePath(match.slug, match.pageKind, match.urlType, match.citySlug, match.parentSlug);
    return locale && locale !== defaultLocale ? `/${locale}${path}` : path;
  }
  return localizedContentPath(match.type, match.slug, match.urlType, locale, match.citySlug, match.parentSlug);
}

export async function decideForSegment(slug: string, expectedSegment: string, locale: string): Promise<ResolveDecision> {
  const matches = await resolveContentMatches(slug);
  if (matches.length === 0) return { action: 'notFound' };
  const exact = matches.find((match) => match.segment === expectedSegment && match.isPublished)
    || matches.find((match) => match.segment === expectedSegment);
  if (exact) return { action: 'render', match: exact };
  const canonical = matches.find((match) => match.isPublished) || matches[0];
  return { action: 'redirect', to: canonicalPathFor(canonical, locale) };
}

export async function decideForCityPath(citySlug: string, slug: string, locale: string): Promise<ResolveDecision> {
  const matches = await resolveContentMatches(slug);
  if (matches.length === 0) return { action: 'notFound' };
  const exact = matches.find(
    (match) => (match.parentSlug === citySlug || (match.urlType === 'city' && match.citySlug === citySlug)) && match.isPublished,
  ) || matches.find((match) => match.parentSlug === citySlug || (match.urlType === 'city' && match.citySlug === citySlug));
  if (exact) return { action: 'render', match: exact };
  const canonical = matches.find((match) => match.isPublished) || matches[0];
  return { action: 'redirect', to: canonicalPathFor(canonical, locale) };
}
