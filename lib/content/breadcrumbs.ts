import type { ParentPageValue } from "@/lib/content/contentNavigation";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function buildContentBreadcrumbs({
  currentTitle,
  breadcrumbLabel,
  parentPage,
  rootLabel,
  rootHref,
  homeLabel = "Home",
}: {
  currentTitle: string;
  breadcrumbLabel?: string;
  parentPage?: ParentPageValue | null;
  rootLabel?: string;
  rootHref?: string;
  /** The first crumb in the visitor's language; English when a caller does not pass one. */
  homeLabel?: string;
}): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: homeLabel, href: "/" }];
  if (parentPage?.slug && parentPage.label) {
    items.push({
      label: parentPage.label,
      href: parentPage.href || `/${parentPage.slug}`,
    });
  } else if (parentPage === undefined && rootLabel && rootHref) {
    items.push({ label: rootLabel, href: rootHref });
  }
  items.push({ label: breadcrumbLabel?.trim() || currentTitle });
  return items;
}
