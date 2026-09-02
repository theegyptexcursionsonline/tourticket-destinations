import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import TourModel from '@/lib/models/Tour';
import ReviewModel from '@/lib/models/Review';
import {
  buildStrictTenantQuery,
  getTenantByDomain,
  getTenantDomainFromRequest,
  getTenantConfigCached,
  getTenantFromRequest,
  getTenantPublicConfig,
} from '@/lib/tenant';
import PlannerOfferModel from '@/lib/models/PlannerOffer';
import { clampOfferEnd, looksLikeCampaignCode, looksLikeOfferSlug, priceAfterDiscount, sanitizeOfferName, verifyOffer, type VerifiedOffer } from '@/lib/offerToken';
import OfferPageClient, { type OfferTour, type OfferView } from './OfferPageClient';
import { OFFER_FONT_CLASS } from './fonts';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';

// The offer is personal and time-boxed: never cached, never indexed.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your private offer',
  robots: { index: false, follow: false },
};

// Catalog entries priced below this are data-entry errors, not offers.
const MIN_CREDIBLE_PRICE = 5;
// Client decision 14/08: exactly three bundle listings on every offer page.
const BUNDLE_COUNT = 3;
const PICK_COUNT = 8;
const QUOTE_COUNT = 3;

type ActiveDiscount = { code: string; discountType: 'percentage' | 'fixed'; value: number };

function ClosedOffer({ title, body, reason }: { title: string; body: string; reason: string }) {
  return (
    <main
      data-offer-state={reason}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-900 px-6"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.12),transparent_70%)]" />
      <div className="relative max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-sm">
        <h1 className="text-2xl font-extrabold text-white">{title}</h1>
        <p className="mt-3 leading-relaxed text-white/70">{body}</p>
        <a href="/" className="mt-8 inline-block rounded-full bg-white px-7 py-3 text-sm font-bold text-gray-900 transition hover:bg-gray-100">
          Browse all tours
        </a>
      </div>
    </main>
  );
}

/**
 * Resolve the tenant for THIS request, falling back to the host that was actually
 * requested.
 *
 * The proxy's tenant header does not always survive into a server component, and
 * the cookie fallback only exists for visitors who have been here before. A
 * planner link is opened cold by a first-time visitor, so relying on either alone
 * silently resolves to the default tenant — which would hide the customer's
 * discount and show another brand's tours. Same failure the sitemap already
 * guards against.
 */
async function resolveTenantId(): Promise<string> {
  const fromRequest = await getTenantFromRequest();
  const host = (await getTenantDomainFromRequest()).split(':')[0];
  if (!host || host === 'localhost') return fromRequest;
  const byDomain = await getTenantByDomain(host);
  return byDomain?.tenantId || fromRequest;
}

/**
 * Resolve the planner's code against THIS tenant's discounts, applying exactly the
 * checks `/api/discounts/verify` and `checkoutPricing` apply. A code that checkout
 * would reject must never be advertised on the page.
 */
async function activeDiscountFor(code: string, tenantId: string): Promise<ActiveDiscount | null> {
  const record = await Discount.findOne({ tenantId, code: code.toUpperCase() }).lean() as
    | { code: string; discountType: 'percentage' | 'fixed'; value: number; isActive: boolean; expiresAt?: Date; usageLimit?: number; timesUsed: number }
    | null;
  if (!record || !record.isActive) return null;
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) return null;
  if (record.usageLimit && record.timesUsed >= record.usageLimit) return null;
  return { code: record.code, discountType: record.discountType, value: Number(record.value) };
}

function toOfferTour(
  tour: any,
  discount: ActiveDiscount,
  reviewStats: Map<string, { avg: number; count: number }>,
): OfferTour | null {
  const listPrice = Number(tour.discountPrice ?? tour.price ?? 0);
  if (!Number.isFinite(listPrice) || listPrice < MIN_CREDIBLE_PRICE) return null;
  if (!tour.slug || !tour.title) return null;
  const offerPrice = priceAfterDiscount(listPrice, discount);
  const summary = String(tour.description || tour.shortDescription || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  // Ratings are earned from real review documents, never from an admin-set
  // Tour.rating with nothing behind it.
  const stats = reviewStats.get(String(tour._id));
  // Benefit bullets must be real product facts: only actual Tour.highlights,
  // cleaned of markup, capped so the card stays scannable.
  const highlights = Array.isArray(tour.highlights)
    ? tour.highlights
        .map((line: unknown) =>
          String(line ?? '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim(),
        )
        .filter((line: string) => line.length >= 3 && line.length <= 90)
        .slice(0, 4)
    : [];
  return {
    id: String(tour._id),
    title: String(tour.title),
    slug: String(tour.slug),
    summary,
    image: tour.image ? String(tour.image) : null,
    duration: tour.duration ? String(tour.duration) : null,
    listPrice,
    offerPrice,
    saving: Number((listPrice - offerPrice).toFixed(2)),
    rating: stats && stats.count > 0 ? Number(stats.avg.toFixed(1)) : null,
    reviewCount: stats?.count ?? 0,
    highlights,
  };
}

/**
 * Resolve a short shareable slug (`amira-7k2m`) into the same shape a signed
 * token produces, so both link styles run one code path. Opens are counted for
 * the planner; a revoked link dies immediately.
 */
async function offerFromSlug(slug: string, tenantId: string): Promise<VerifiedOffer> {
  const record = await PlannerOfferModel.findOneAndUpdate(
    { tenantId, slug: slug.toLowerCase(), revokedAt: null },
    { $inc: { opens: 1 }, $set: { lastOpenedAt: new Date() } },
    { new: true },
  ).lean() as { firstName: string; discountCode: string; expiresAt: Date } | null;
  if (!record) return { state: 'invalid', reason: 'bad_payload' };
  const offer = {
    firstName: record.firstName,
    discountCode: record.discountCode,
    expiresAt: new Date(record.expiresAt).toISOString(),
  };
  if (new Date(record.expiresAt).getTime() <= Date.now()) return { state: 'expired', offer };
  return { state: 'valid', offer };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function PlannerOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ name?: string; ends?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const locale = await getLocale();
  const raw = decodeURIComponent(token);

  // Tenant first: a short slug is only meaningful inside its own workspace.
  await dbConnect();
  const tenantId = await resolveTenantId();
  let verified: VerifiedOffer;
  let campaign = false;
  void campaign;
  if (raw.includes('.')) {
    verified = verifyOffer(raw);
  } else {
    verified = looksLikeOfferSlug(raw)
      ? await offerFromSlug(raw, tenantId)
      : { state: 'invalid', reason: 'bad_payload' };
    // Campaign fallback: the link IS the code (`/offer/planner15`) — one link
    // per campaign, no per-customer minting. A minted personal slug wins.
    if (verified.state === 'invalid' && looksLikeCampaignCode(raw)) {
      const record = await Discount.findOne({ tenantId, code: raw.toUpperCase() })
        .select('code expiresAt')
        .lean() as { code: string; expiresAt?: Date } | null;
      if (record) {
        campaign = true;
        const end = clampOfferEnd(query.ends, record.expiresAt ? new Date(record.expiresAt) : null);
        verified = {
          state: 'valid',
          offer: {
            firstName: sanitizeOfferName(query.name) || '',
            discountCode: record.code,
            expiresAt: end ? end.toISOString() : '',
          },
        };
      }
    }
  }

  if (verified.state === 'invalid') {
    return (
      <ClosedOffer
        reason={verified.reason}
        title="This link isn't valid"
        body="Please use the exact link your tour planner sent you, or ask them for a fresh one."
      />
    );
  }
  if (verified.state === 'expired') {
    return (
      <ClosedOffer
        reason="expired"
        title={`Sorry ${verified.offer.firstName}, this offer has ended`}
        body="Your planner's discount window has closed — message them for a new offer, or browse at standard prices."
      />
    );
  }

  const offer = verified.offer;

  const [discount, tenant, tenantRecord] = await Promise.all([
    activeDiscountFor(offer.discountCode, tenantId),
    getTenantPublicConfig(tenantId),
    // The public config deliberately omits `homepage`, and that is where the
    // operator's own hero photography lives.
    getTenantConfigCached(tenantId),
  ]);

  // The tenant's discount record is the authority. If it will not apply at
  // checkout, say so honestly instead of quoting a price we cannot honour.
  if (!discount) {
    return (
      <ClosedOffer
        reason="code_inactive"
        title={offer.firstName ? `${offer.firstName}, this code is no longer active` : 'This code is no longer active'}
        body="Your planner's discount can't be applied right now. Message them for a new one — the tours are still available at standard prices."
      />
    );
  }

  const tours = await TourModel.find(buildStrictTenantQuery({ ...PUBLIC_CONTENT_FILTER }, tenantId))
    .select('title slug description shortDescription price discountPrice duration image isFeatured highlights')
    .limit(200)
    .lean();

  // Real social proof only: every rating and quote below is backed by a review
  // document for this tenant's tours — nothing is hardcoded or invented.
  const tourIds = tours.map((tour: any) => tour._id);
  const [reviewAgg, quoteDocs] = await Promise.all([
    ReviewModel.aggregate([
      { $match: { tenantId, tour: { $in: tourIds } } },
      { $group: { _id: '$tour', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
    ReviewModel.find({ tenantId, tour: { $in: tourIds }, rating: 5, comment: { $exists: true, $ne: '' } })
      .sort({ createdAt: -1 })
      .limit(QUOTE_COUNT * 8)
      .select('userName rating comment tour')
      .lean(),
  ]);
  const reviewStats = new Map<string, { avg: number; count: number }>(
    reviewAgg.map((row: any) => [String(row._id), { avg: Number(row.avg), count: Number(row.count) }]),
  );
  const titleById = new Map<string, string>(tours.map((tour: any) => [String(tour._id), String(tour.title)]));
  // One voice per tour reads far more credibly than three quotes off one trip.
  const seenTours = new Set<string>();
  const quotes = (quoteDocs as any[])
    .filter((review) => {
      const key = String(review.tour);
      if (seenTours.has(key)) return false;
      seenTours.add(key);
      return true;
    })
    .map((review) => ({
      name: String(review.userName || 'Verified traveller'),
      rating: Number(review.rating),
      text: String(review.comment || '').replace(/\s+/g, ' ').trim().slice(0, 220),
      tourTitle: titleById.get(String(review.tour)) || null,
    }))
    .filter((quote) => quote.text.length > 30)
    .slice(0, QUOTE_COUNT);

  const sellable = tours
    .map((tour) => toOfferTour(tour, discount, reviewStats))
    .filter((tour): tour is OfferTour => tour !== null);

  if (sellable.length === 0) {
    return (
      <ClosedOffer
        reason="no_tours"
        title="We couldn't load tours just now"
        body="Your code is still valid — refresh in a moment, or message your planner."
      />
    );
  }

  const byValue = [...sellable].sort((a, b) => a.offerPrice - b.offerPrice);
  // Both sections are part of the brief, so a tenant with a small catalogue must
  // still fill both: reserve the value row first, capped at half the catalogue,
  // then hand the rest to the planner picks.
  const bundleTarget = Math.min(BUNDLE_COUNT, Math.max(1, Math.floor(sellable.length / 2)));
  const bundles = byValue.slice(0, bundleTarget);
  const bundleIds = new Set(bundles.map((tour) => tour.id));
  const remaining = sellable.filter((tour) => !bundleIds.has(tour.id));
  // Picks lead with the operator's featured tours, then the premium end of what is left.
  const featuredIds = new Set(
    tours.filter((t: any) => t.isFeatured).map((t: any) => String(t._id)),
  );
  const featured = remaining.filter((tour) => featuredIds.has(tour.id));
  const picks = [
    ...featured,
    ...remaining.filter((tour) => !featuredIds.has(tour.id)).sort((a, b) => b.offerPrice - a.offerPrice),
  ].slice(0, PICK_COUNT);

  // Real tenant branding: the customer should recognise the operator instantly.
  const currencySymbol = tenant?.payments?.currencySymbol || '$';
  const heroImage = tenantRecord?.homepage?.heroImages?.[0] || tenant?.seo?.ogImage || null;

  // Aggregate truth for the hero strip — every number derives from live records.
  const reviewTotal = reviewAgg.reduce((sum: number, row: any) => sum + Number(row.count), 0);
  const ratingSum = reviewAgg.reduce((sum: number, row: any) => sum + Number(row.avg) * Number(row.count), 0);
  const avgRating = reviewTotal > 0 ? Number((ratingSum / reviewTotal).toFixed(1)) : null;
  const fromPrice = Math.min(...sellable.map((tour) => tour.offerPrice));
  const maxSaving = Math.max(...sellable.map((tour) => tour.saving));

  const expiresAt = offer.expiresAt || null;
  const ends = expiresAt ? new Date(expiresAt) : null;
  const expiresNice = ends ? `${ends.getUTCDate()} ${MONTHS[ends.getUTCMonth()]} ${ends.getUTCFullYear()}` : null;

  const digits = (value: string | null | undefined) => (value || '').replace(/[^\d]/g, '');
  const whatsappDigits = digits(tenant?.contact?.whatsapp) || null;

  const view: OfferView = {
    tenantId,
    firstName: offer.firstName || null,
    code: discount.code,
    label: discount.discountType === 'percentage' ? `${discount.value}%` : `${currencySymbol}${discount.value}`,
    expiresAt,
    expiresNice,
    currencySymbol,
    siteName: tenant?.name || 'our tours',
    logo: tenant?.branding?.logo || null,
    brandColor: tenant?.branding?.primaryColor || '#111827',
    heroImage,
    heroAlt: `${tenant?.name || 'Our'} experiences`,
    bundles,
    picks,
    totalCount: sellable.length,
    stats: { fromPrice, maxSaving, avgRating, reviewTotal },
    quotes,
    contact: {
      whatsapp: whatsappDigits,
      phone: tenant?.contact?.phone || null,
      email: tenant?.contact?.email || null,
    },
  };

  return <OfferPageClient view={view} locale={locale} fontClass={OFFER_FONT_CLASS} />;
}
