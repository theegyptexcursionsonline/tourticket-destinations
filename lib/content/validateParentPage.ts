import type { FilterQuery } from "mongoose";
import type {
  ParentContentKind,
  ParentPageValue,
} from "@/lib/content/contentNavigation";
import { attractionPagePath, contentPath } from "@/lib/content/contentUrl";

export class ParentPageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParentPageValidationError";
  }
}

interface ParentRecord {
  _id: unknown;
  slug?: string;
  title?: string;
  name?: string;
  pageType?: string;
  urlType?: string;
  archivedAt?: Date | null;
  parentPage?: ParentPageValue | null;
}

async function findParent(
  kind: ParentContentKind,
  id: string,
  tenantFilter: FilterQuery<unknown>,
): Promise<ParentRecord | null> {
  if (kind === "destination") {
    const { default: Destination } = await import("@/lib/models/Destination");
    return Destination.findOne({ $and: [tenantFilter, { _id: id }] })
      .select("name slug urlType archivedAt parentPage")
      .lean() as Promise<ParentRecord | null>;
  }
  if (kind === "category") {
    const { default: Category } = await import("@/lib/models/Category");
    return Category.findOne({ $and: [tenantFilter, { _id: id }] })
      .select("name slug urlType archivedAt parentPage")
      .lean() as Promise<ParentRecord | null>;
  }
  const { default: AttractionPage } =
    await import("@/lib/models/AttractionPage");
  return AttractionPage.findOne({
    $and: [
      tenantFilter,
      { _id: id },
      { pageType: kind === "category-2" ? "category" : "attraction" },
    ],
  })
    .select("title slug urlType pageType archivedAt parentPage")
    .lean() as Promise<ParentRecord | null>;
}

function parentHref(kind: ParentContentKind, document: ParentRecord): string {
  if (kind === "destination") {
    return contentPath(
      "destination",
      document.slug || "",
      document.urlType,
      null,
      document.parentPage?.slug,
    );
  }
  if (kind === "category") {
    return contentPath(
      "category",
      document.slug || "",
      document.urlType,
      null,
      document.parentPage?.slug,
    );
  }
  return attractionPagePath(
    document.slug || "",
    document.pageType,
    document.urlType,
    null,
    document.parentPage?.slug,
  );
}

export async function validateParentPageSelection({
  parentPage,
  currentId,
  currentSlug,
  tenantFilter,
}: {
  parentPage: ParentPageValue | null | undefined;
  currentId?: string;
  currentSlug?: string;
  tenantFilter: FilterQuery<unknown>;
}): Promise<ParentPageValue | null | undefined> {
  if (parentPage === undefined) return undefined;
  if (parentPage === null) return null;
  if (!parentPage.id)
    throw new ParentPageValidationError(
      "Select the parent page again so its identity can be verified.",
    );
  if (currentId && parentPage.id === currentId)
    throw new ParentPageValidationError("A page cannot be its own parent.");

  const document = await findParent(
    parentPage.kind,
    parentPage.id,
    tenantFilter,
  );
  if (!document || document.archivedAt)
    throw new ParentPageValidationError(
      "The selected parent page is unavailable. Choose another parent.",
    );
  if (!document.slug)
    throw new ParentPageValidationError(
      "The selected parent page has no valid URL.",
    );
  if (currentSlug && document.slug === currentSlug)
    throw new ParentPageValidationError(
      "Parent and child pages cannot use the same URL slug.",
    );

  const seen = new Set<string>(currentId ? [currentId] : []);
  let cursor: ParentRecord | null = document;
  for (let depth = 0; cursor && depth < 8; depth += 1) {
    const cursorId = String(cursor._id);
    if (seen.has(cursorId))
      throw new ParentPageValidationError(
        "This parent selection would create a navigation cycle.",
      );
    seen.add(cursorId);
    const next = cursor.parentPage;
    if (!next?.id) break;
    cursor = await findParent(next.kind, next.id, tenantFilter);
  }
  if (cursor?.parentPage?.id)
    throw new ParentPageValidationError(
      "Parent nesting is too deep. Choose a higher-level parent page.",
    );

  return {
    id: String(document._id),
    slug: document.slug,
    label: document.title || document.name || parentPage.label,
    kind: parentPage.kind,
    href: parentHref(parentPage.kind, document),
  };
}
