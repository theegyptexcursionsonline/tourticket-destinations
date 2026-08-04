// Central URL-type helper for content (tours, destinations, categories, and
// attraction/landing pages).
//
// Admins can pick, per item, which URL shape it lives at via the `urlType`
// field. This module is the single source of truth mapping (content type +
// urlType) → public path, so routing, sitemap, canonical tags and internal
// links all agree.

import { defaultLocale } from "@/i18n/config";

export type ContentType = "tour" | "destination" | "category" | "page";

// The URL shapes an admin can choose from. `default` keeps the item on its
// historical path (tours at the root, destinations under /destinations, etc.)
// so existing URLs never move unless an admin opts in. `city` nests the item
// under its own destination's slug (/{city}/{slug}) — tours only, since only
// tours carry a required owning destination.
export type UrlType =
  "default" | "direct" | "tour" | "experience" | "destination" | "city";

export const URL_TYPES: UrlType[] = [
  "default",
  "direct",
  "tour",
  "experience",
  "destination",
  "city",
];

// Human labels for the admin dropdown.
export const URL_TYPE_LABELS: Record<UrlType, string> = {
  default: "Default (current)",
  direct: "Direct  /{slug}",
  tour: "/tour/{slug}",
  experience: "/experience/{slug}",
  destination: "/destination/{slug}",
  city: "City  /{destination}/{slug}",
};

// Sentinel segment for the city shape — the real first segment is the item's
// destination slug, so it can never equal a fixed route segment.
export const CITY_SEGMENT = "{city}";

// The path segment each explicit urlType maps to. '' means the root ("direct").
const SEGMENT_FOR_URL_TYPE: Record<Exclude<UrlType, "default">, string> = {
  direct: "",
  tour: "tour",
  experience: "experience",
  destination: "destination",
  city: CITY_SEGMENT,
};

// Backward-compatible segment per content type when urlType is `default` /
// unset — this is exactly how the site behaves today.
export const DEFAULT_SEGMENT: Record<ContentType, string> = {
  tour: "", // tours already live at the root: /{slug}
  destination: "destinations",
  category: "categories",
  page: "attraction", // attraction/landing pages live under /attraction
};

// AttractionPage documents carry two kinds sharing one model: attraction
// pages historically live under /attraction, catalogue pages under /category.
export type AttractionPageKind = "attraction" | "category";

export function pageDefaultSegment(pageKind?: string | null): string {
  return pageKind === "category" ? "category" : DEFAULT_SEGMENT.page;
}

// Public path for an AttractionPage of either kind. Same contract as
// contentPath, but the `default` urlType resolves per page kind so existing
// catalogue URLs never move unless an admin opts in.
export function attractionPagePath(
  slug: string,
  pageKind?: string | null,
  urlType?: string | null,
  citySlug?: string | null,
  parentSlug?: string | null,
): string {
  if (parentSlug) return `/${parentSlug}/${slug}`;
  const t = normalizeUrlType(urlType);
  if (t === "default") {
    const seg = pageDefaultSegment(pageKind);
    return seg ? `/${seg}/${slug}` : `/${slug}`;
  }
  return contentPath("page", slug, urlType, citySlug, parentSlug);
}

// What the URL Type dropdown offers. The platform decision (client sheet
// 02.08) is that new content lives at the root: only `direct` is selectable,
// plus the item's current value so an existing page is never silently moved
// off its shape by merely opening the editor.
export function selectableUrlTypes(current?: string | null): UrlType[] {
  const normalized = normalizeUrlType(current);
  return normalized === "direct" ? ["direct"] : ["direct", normalized];
}

// The set of segments that a request path can carry for a given content type.
// Used by the resolver to map an incoming URL segment back to a content type.
export function normalizeUrlType(urlType?: string | null): UrlType {
  return (
    urlType && (URL_TYPES as string[]).includes(urlType) ? urlType : "default"
  ) as UrlType;
}

// The effective segment for an item ('' = root).
export function segmentFor(type: ContentType, urlType?: string | null): string {
  const t = normalizeUrlType(urlType);
  if (t === "default") return DEFAULT_SEGMENT[type];
  return SEGMENT_FOR_URL_TYPE[t];
}

// Path relative to the locale root. Always a leading slash, never a locale.
// `citySlug` is the item's destination slug and only matters for the `city`
// urlType; without it the item safely falls back to its default shape.
export function contentPath(
  type: ContentType,
  slug: string,
  urlType?: string | null,
  citySlug?: string | null,
  parentSlug?: string | null,
): string {
  if (parentSlug) return `/${parentSlug}/${slug}`;
  const t = normalizeUrlType(urlType);
  if (t === "city") {
    if (citySlug) return `/${citySlug}/${slug}`;
    // No city known at this call site — link the default shape; the detail
    // route 301s to the city canonical.
    const seg = DEFAULT_SEGMENT[type];
    return seg ? `/${seg}/${slug}` : `/${slug}`;
  }
  const seg = segmentFor(type, urlType);
  return seg ? `/${seg}/${slug}` : `/${slug}`;
}

// Full public path including locale prefix. The default locale is un-prefixed
// (matches the sitemap + existing routing).
export function localizedContentPath(
  type: ContentType,
  slug: string,
  urlType: string | null | undefined,
  locale: string,
  citySlug?: string | null,
  parentSlug?: string | null,
): string {
  const path = contentPath(type, slug, urlType, citySlug, parentSlug);
  return locale && locale !== defaultLocale ? `/${locale}${path}` : path;
}
