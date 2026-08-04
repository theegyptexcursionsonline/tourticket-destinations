export const PARENT_CONTENT_KINDS = [
  "destination",
  "attraction",
  "category",
  "category-2",
] as const;

export type ParentContentKind = (typeof PARENT_CONTENT_KINDS)[number];

export interface ParentPageValue {
  id?: string;
  slug: string;
  label: string;
  kind: ParentContentKind;
  href?: string;
}

export interface ContentNavigationValue {
  breadcrumbLabel?: string;
  parentPage?: ParentPageValue | null;
}

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function sanitizeContentNavigation(
  input: unknown,
): ContentNavigationValue {
  if (!input || typeof input !== "object") return {};
  const value = input as Record<string, unknown>;
  const hasBreadcrumbLabel = Object.prototype.hasOwnProperty.call(
    value,
    "breadcrumbLabel",
  );
  const hasParentPage = Object.prototype.hasOwnProperty.call(
    value,
    "parentPage",
  );
  const breadcrumbLabel =
    typeof value.breadcrumbLabel === "string"
      ? value.breadcrumbLabel.trim().slice(0, 120)
      : undefined;
  const rawParent = value.parentPage;

  if (!hasParentPage) {
    return hasBreadcrumbLabel ? { breadcrumbLabel: breadcrumbLabel || "" } : {};
  }

  if (!rawParent || typeof rawParent !== "object") {
    return {
      ...(hasBreadcrumbLabel ? { breadcrumbLabel: breadcrumbLabel || "" } : {}),
      parentPage: null,
    };
  }

  const parent = rawParent as Record<string, unknown>;
  const slug =
    typeof parent.slug === "string" ? parent.slug.trim().toLowerCase() : "";
  const label =
    typeof parent.label === "string" ? parent.label.trim().slice(0, 120) : "";
  const kind = typeof parent.kind === "string" ? parent.kind : "";
  const id = typeof parent.id === "string" ? parent.id.trim() : "";

  if (
    !SAFE_SLUG.test(slug) ||
    !label ||
    !(PARENT_CONTENT_KINDS as readonly string[]).includes(kind)
  ) {
    return {
      ...(hasBreadcrumbLabel ? { breadcrumbLabel: breadcrumbLabel || "" } : {}),
      parentPage: null,
    };
  }

  return {
    ...(hasBreadcrumbLabel ? { breadcrumbLabel: breadcrumbLabel || "" } : {}),
    parentPage: {
      ...(id ? { id } : {}),
      slug,
      label,
      kind: kind as ParentContentKind,
    },
  };
}

export function nestedContentPath(
  slug: string,
  parentPage?: ParentPageValue | null,
): string | null {
  const parentSlug = parentPage?.slug?.trim();
  return parentSlug ? `/${parentSlug}/${slug}` : null;
}
