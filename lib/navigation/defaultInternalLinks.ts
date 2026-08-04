import type { FilterQuery } from "mongoose";
import AttractionPage from "@/lib/models/AttractionPage";
import Category from "@/lib/models/Category";
import Destination from "@/lib/models/Destination";
import Tour from "@/lib/models/Tour";
import { attractionPagePath, contentPath } from "@/lib/content/contentUrl";
import {
  buildDefaultInternalLinkBlock,
  type InternalLinkBlockValue,
  type InternalLinkSourceItem,
} from "@/lib/navigation/internalLinks";

interface ContentRow {
  _id: unknown;
  title?: string;
  name?: string;
  slug?: string;
  urlType?: string;
  pageType?: string;
  parentPage?: { slug?: string } | null;
}

function item(
  row: ContentRow,
  kind: "tour" | "destination" | "category" | "page",
): InternalLinkSourceItem | null {
  const label = (row.title || row.name || "").trim();
  const slug = (row.slug || "").trim();
  if (!label || !slug) return null;
  const href =
    kind === "page"
      ? attractionPagePath(
          slug,
          row.pageType,
          row.urlType,
          null,
          row.parentPage?.slug,
        )
      : contentPath(kind, slug, row.urlType, null, row.parentPage?.slug);
  return { id: `${kind}-${String(row._id)}`, label, href };
}

function items(
  rows: ContentRow[],
  kind: "tour" | "destination" | "category" | "page",
): InternalLinkSourceItem[] {
  return rows
    .map((row) => item(row, kind))
    .filter((entry): entry is InternalLinkSourceItem => Boolean(entry));
}

export async function buildDefaultInternalLinks(
  tenantFilter: FilterQuery<unknown>,
): Promise<InternalLinkBlockValue> {
  const [destinations, categories, attractionPages, categoryPages, tours] =
    await Promise.all([
      Destination.find({ $and: [tenantFilter, { isPublished: true }] })
        .select("_id name slug urlType parentPage featured")
        .sort({ featured: -1, name: 1 })
        .limit(8)
        .lean<ContentRow[]>(),
      Category.find({
        $and: [tenantFilter, { isPublished: true, archivedAt: null }],
      })
        .select("_id name slug urlType parentPage featured")
        .sort({ featured: -1, name: 1 })
        .limit(8)
        .lean<ContentRow[]>(),
      AttractionPage.find({
        $and: [
          tenantFilter,
          { isPublished: true, archivedAt: null, pageType: "attraction" },
        ],
      })
        .select("_id title slug urlType pageType parentPage featured")
        .sort({ featured: -1, title: 1 })
        .limit(16)
        .lean<ContentRow[]>(),
      AttractionPage.find({
        $and: [
          tenantFilter,
          { isPublished: true, archivedAt: null, pageType: "category" },
        ],
      })
        .select("_id title slug urlType pageType parentPage featured")
        .sort({ featured: -1, title: 1 })
        .limit(8)
        .lean<ContentRow[]>(),
      Tour.find({
        $and: [tenantFilter, { isPublished: true, archivedAt: null }],
      })
        .select("_id title slug urlType parentPage isFeatured")
        .sort({ isFeatured: -1, title: 1 })
        .limit(8)
        .lean<ContentRow[]>(),
    ]);

  const attractionItems = items(attractionPages, "page");
  return buildDefaultInternalLinkBlock([
    {
      id: "destinations",
      title: "Destinations",
      items: items(destinations, "destination"),
    },
    {
      id: "attraction-categories",
      title: "Top attraction categories",
      items: items(categories, "category"),
    },
    {
      id: "popular-attractions",
      title: "Popular attractions",
      items: attractionItems.slice(0, 8),
    },
    {
      id: "top-attractions",
      title: "Top Attractions in Egypt",
      items: attractionItems.slice(8, 16),
    },
    {
      id: "tours-in-egypt",
      title: "Tours in Egypt",
      items: items(tours, "tour"),
    },
    {
      id: "things-to-do",
      title: "Things to do in Egypt",
      items: items(categoryPages, "page"),
    },
  ]);
}
