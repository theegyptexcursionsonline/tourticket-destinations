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
}: {
  currentTitle: string;
  breadcrumbLabel?: string;
  parentPage?: ParentPageValue | null;
  rootLabel?: string;
  rootHref?: string;
}): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: "Home", href: "/" }];
  if (parentPage?.slug && parentPage.label) {
    items.push({
      label: parentPage.label,
      href: parentPage.href || `/${parentPage.slug}`,
    });
  } else if (rootLabel && rootHref) {
    items.push({ label: rootLabel, href: rootHref });
  }
  items.push({ label: breadcrumbLabel?.trim() || currentTitle });
  return items;
}
