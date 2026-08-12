import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import TourModel from '@/lib/models/Tour';
import { buildStrictTenantQuery, getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';
import { priceAfterDiscount, verifyOffer } from '@/lib/offerToken';
import OfferPageClient, { type OfferTour, type OfferView } from './OfferPageClient';

// The offer is personal and time-boxed: never cached, never indexed.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your private offer',
  robots: { index: false, follow: false },
};

// Catalog entries priced below this are data-entry errors, not offers.
const MIN_CREDIBLE_PRICE = 5;
const BUNDLE_COUNT = 6;
const PICK_COUNT = 8;

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

function toOfferTour(tour: any, discount: ActiveDiscount): OfferTour | null {
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
  const reviewCount = Number(tour.reviewCount ?? tour.reviews?.length ?? 0);
  const rating = reviewCount > 0 && Number.isFinite(Number(tour.rating)) ? Number(tour.rating) : null;
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
    rating,
    reviewCount,
  };
}

export default async function PlannerOfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = await getLocale();
  const verified = verifyOffer(decodeURIComponent(token));

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
  const tenantId = await getTenantFromRequest();
  await dbConnect();

  const [discount, tenant] = await Promise.all([
    activeDiscountFor(offer.discountCode, tenantId),
    getTenantPublicConfig(tenantId),
  ]);

  // The tenant's discount record is the authority. If it will not apply at
  // checkout, say so honestly instead of quoting a price we cannot honour.
  if (!discount) {
    return (
      <ClosedOffer
        reason="code_inactive"
        title={`${offer.firstName}, this code is no longer active`}
        body="Your planner's discount can't be applied right now. Message them for a new one — the tours are still available at standard prices."
      />
    );
  }

  const tours = await TourModel.find(buildStrictTenantQuery({ isPublished: true }, tenantId))
    .select('title slug description shortDescription price discountPrice duration image isFeatured rating reviewCount')
    .limit(200)
    .lean();

  const sellable = tours
    .map((tour) => toOfferTour(tour, discount))
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
  // Planner picks lead with the operator's featured tours, then top up with the
  // premium experiences so the row is always a full grid, never a stub.
  const featured = sellable.filter((tour) => (tours.find((t: any) => String(t._id) === tour.id) as any)?.isFeatured);
  const featuredIds = new Set(featured.map((tour) => tour.id));
  const picks = [...featured, ...[...byValue].reverse().filter((tour) => !featuredIds.has(tour.id))].slice(0, PICK_COUNT);
  const pickIds = new Set(picks.map((tour) => tour.id));
  const bundles = byValue.filter((tour) => !pickIds.has(tour.id)).slice(0, BUNDLE_COUNT);

  const view: OfferView = {
    firstName: offer.firstName,
    code: discount.code,
    label: discount.discountType === 'percentage' ? `${discount.value}%` : `$${discount.value}`,
    expiresAt: offer.expiresAt,
    currencySymbol: '$',
    siteName: tenant?.name || 'our tours',
    bundles,
    picks,
    totalCount: sellable.length,
  };

  return <OfferPageClient view={view} locale={locale} />;
}
