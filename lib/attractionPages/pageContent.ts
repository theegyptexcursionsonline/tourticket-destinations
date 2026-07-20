import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import { buildStrictTenantQuery } from '@/lib/tenant';
import { pagePath } from '@/lib/attractionPages/pageUrl';

export const ATTRACTION_PAGE_LOCALIZED_FIELDS = [
  'title',
  'description',
  'longDescription',
  'gridTitle',
  'gridSubtitle',
  'highlights',
  'features',
  'metaTitle',
  'metaDescription',
];

type LeanRecord = Record<string, unknown>;

const TOUR_CARD_POPULATE = [
  { path: 'destination', model: Destination, select: 'name slug country image description' },
  { path: 'category', model: Category, select: 'name slug' },
];

const TOUR_SORT = { isFeatured: -1 as const, rating: -1 as const, bookings: -1 as const };

interface PageLike {
  _id: unknown;
  tenantId?: string;
  pageType?: 'attraction' | 'category';
  categoryId?: unknown;
  title?: string;
  keywords?: string[];
  linkedTourIds?: unknown[];
}

export async function resolveAttractionPageTours(page: PageLike, tenantId: string) {
  await dbConnect(tenantId);
  const curatedIds = (page.linkedTourIds || []).filter((id) => Types.ObjectId.isValid(String(id)));

  if (curatedIds.length > 0) {
    const tours = await Tour.find(buildStrictTenantQuery({
      _id: { $in: curatedIds },
      isPublished: true,
    }, tenantId))
      .populate(TOUR_CARD_POPULATE)
      .lean();
    const order = new Map(curatedIds.map((id, index) => [String(id), index]));
    tours.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
    return { tours: tours as LeanRecord[], totalTours: tours.length };
  }

  if (page.pageType === 'category' && page.categoryId) {
    const categoryId = typeof page.categoryId === 'object' && page.categoryId !== null && '_id' in (page.categoryId as LeanRecord)
      ? (page.categoryId as LeanRecord)._id
      : page.categoryId;
    const filter = {
      $and: [
        buildStrictTenantQuery({ isPublished: true }, tenantId),
        { $or: [{ interests: page._id }, { category: categoryId }] },
      ],
    };
    const [tours, totalTours] = await Promise.all([
      Tour.find(filter).populate(TOUR_CARD_POPULATE).sort(TOUR_SORT).limit(60).lean(),
      Tour.countDocuments(filter),
    ]);
    return { tours: tours as LeanRecord[], totalTours };
  }

  const directFilter = buildStrictTenantQuery({
    attractions: page._id,
    isPublished: true,
  }, tenantId);
  const direct = await Tour.find(directFilter)
    .populate(TOUR_CARD_POPULATE)
    .sort(TOUR_SORT)
    .limit(60)
    .lean();
  if (direct.length > 0) {
    return {
      tours: direct as LeanRecord[],
      totalTours: await Tour.countDocuments(directFilter),
    };
  }

  const searchQueries: LeanRecord[] = [];
  if (page.title) {
    const pattern = new RegExp(escapeRegex(page.title), 'i');
    searchQueries.push({ title: pattern }, { description: pattern });
  }
  for (const keyword of page.keywords || []) {
    const pattern = new RegExp(escapeRegex(keyword), 'i');
    searchQueries.push({ title: pattern }, { description: pattern }, { tags: keyword });
  }
  if (searchQueries.length > 0) {
    const matched = await Tour.find({
      $and: [
        buildStrictTenantQuery({ isPublished: true }, tenantId),
        { $or: searchQueries },
      ],
    })
      .populate(TOUR_CARD_POPULATE)
      .sort(TOUR_SORT)
      .limit(50)
      .lean();
    if (matched.length > 0) return { tours: matched as LeanRecord[], totalTours: matched.length };
  }

  const featured = await Tour.find(buildStrictTenantQuery({
    isPublished: true,
    isFeatured: true,
  }, tenantId))
    .populate(TOUR_CARD_POPULATE)
    .sort({ rating: -1, bookings: -1 })
    .limit(20)
    .lean();
  return { tours: featured as LeanRecord[], totalTours: featured.length };
}

export interface LinkedPageCard {
  id: string;
  title: string;
  description?: string;
  image?: string;
  href: string;
  kind: 'page' | 'category';
}

export async function resolveLinkedPageCards(
  page: { linkedPageIds?: unknown[]; linkedCategoryIds?: unknown[] },
  tenantId: string,
  locale: string,
): Promise<LinkedPageCard[]> {
  await dbConnect(tenantId);
  const pageIds = (page.linkedPageIds || []).filter((id) => Types.ObjectId.isValid(String(id)));
  const categoryIds = (page.linkedCategoryIds || []).filter((id) => Types.ObjectId.isValid(String(id)));
  if (pageIds.length === 0 && categoryIds.length === 0) return [];

  const [pages, categories] = await Promise.all([
    pageIds.length
      ? AttractionPage.find({ _id: { $in: pageIds }, tenantId, isPublished: true })
          .select('title slug description heroImage pageType urlType translations')
          .lean()
      : [],
    categoryIds.length
      ? Category.find({ _id: { $in: categoryIds }, tenantId, isPublished: { $ne: false } })
          .select('name slug description heroImage translations')
          .lean()
      : [],
  ]);

  const cards: LinkedPageCard[] = [];
  for (const doc of pages as LeanRecord[]) {
    const localized = localizeEntityFields(doc, locale, ['title', 'description']);
    cards.push({
      id: String(doc._id),
      title: String(localized.title || ''),
      description: localized.description ? String(localized.description) : undefined,
      image: doc.heroImage ? String(doc.heroImage) : undefined,
      href: pagePath(
        String(doc.slug || ''),
        doc.pageType === 'category' ? 'category' : 'attraction',
        doc.urlType as string | undefined,
      ),
      kind: 'page',
    });
  }
  for (const doc of categories as LeanRecord[]) {
    const localized = localizeEntityFields(doc, locale, ['name', 'description']);
    cards.push({
      id: String(doc._id),
      title: String(localized.name || ''),
      description: localized.description ? String(localized.description) : undefined,
      image: doc.heroImage ? String(doc.heroImage) : undefined,
      href: `/categories/${String(doc.slug || '')}`,
      kind: 'category',
    });
  }

  const order = new Map<string, number>();
  [...pageIds, ...categoryIds].forEach((id, index) => order.set(String(id), index));
  cards.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return cards;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
