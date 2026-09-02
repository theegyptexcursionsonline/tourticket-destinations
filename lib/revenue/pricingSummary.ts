import { randomUUID } from 'node:crypto';
import type { Types } from 'mongoose';
import RevenuePriceOverride from '@/lib/models/RevenuePriceOverride';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery, getTenantConfigCached } from '@/lib/tenant';
import { effectiveOptionPrice, effectiveTourPrice } from '@/lib/pricing/effectivePrice';

type SummaryTour = {
  _id: Types.ObjectId;
  discountPrice?: number;
  discountPercent?: number;
  bookingOptions?: Array<{
    price?: number;
    applyTourDiscount?: boolean;
    timeSlots?: Array<{ price?: number }>;
  }>;
};

type ProjectionTour = SummaryTour & {
  isPublished?: boolean;
  pricingSummaries?: Array<{ tenantId: string; fromPrice?: number; version?: number; currency?: string; validThrough?: Date }>;
  pricingSearchProjections?: Array<{
    tenantId: string;
    status?: 'pending' | 'syncing' | 'verified' | 'failed';
    summaryVersion?: number;
    authoritativeVersion?: number;
    projectionToken?: string;
    attempts?: number;
    lastErrorCode?: string;
    nextAttemptAt?: Date;
    lastAttemptAt?: Date;
  }>;
};

const PROJECTION_RETRY_BASE_MS = 60_000;
const PROJECTION_RETRY_MAX_MS = 60 * 60_000;

export function pricingProjectionRetryDelayMs(attempts: number) {
  const normalizedAttempts = Math.max(1, Math.min(12, Math.floor(attempts) || 1));
  return Math.min(PROJECTION_RETRY_MAX_MS, PROJECTION_RETRY_BASE_MS * (2 ** (normalizedAttempts - 1)));
}

const finitePrices = (values: unknown[]) => values
  .map(Number)
  .filter((value) => Number.isFinite(value) && value >= 0);

export function tenantPricingSummary(tour: Pick<ProjectionTour, 'pricingSummaries'> | null | undefined, tenantId: string) {
  return tour?.pricingSummaries?.find((entry) => entry.tenantId === tenantId) ?? null;
}

export function tenantPricingProjection(tour: Pick<ProjectionTour, 'pricingSearchProjections'> | null | undefined, tenantId: string) {
  return tour?.pricingSearchProjections?.find((entry) => entry.tenantId === tenantId) ?? null;
}

function replaceTenantEntry(field: 'pricingSummaries' | 'pricingSearchProjections', tenantId: string, entry: Record<string, unknown> | null) {
  return {
    $concatArrays: [
      {
        $filter: {
          input: { $ifNull: [`$${field}`, []] },
          as: 'entry',
          cond: { $ne: ['$$entry.tenantId', tenantId] },
        },
      },
      entry ? [{ tenantId, ...entry }] : [],
    ],
  };
}

export function catalogueFromPrice(tour: Pick<SummaryTour, 'discountPrice' | 'discountPercent' | 'bookingOptions'>) {
  const options = Array.isArray(tour.bookingOptions)
    ? tour.bookingOptions.filter((option) => Number.isFinite(Number(option.price)) && Number(option.price) >= 0)
    : [];
  const candidates = options.length > 0
    ? finitePrices(options.flatMap((option) => {
      const slots = Array.isArray(option.timeSlots) && option.timeSlots.length > 0
        ? option.timeSlots
        : [undefined];
      return slots.map((slot) => effectiveOptionPrice(tour, option, slot).price);
    }))
    : (Number.isFinite(Number(tour.discountPrice)) && Number(tour.discountPrice) >= 0
      ? finitePrices([effectiveTourPrice(tour).price])
      : []);
  return candidates.length ? Math.min(...candidates) : null;
}

/**
 * Rebuild the one listing/search price summary from authoritative catalogue
 * prices plus active future exact overrides. Historical overrides must not
 * keep a stale low price on public cards.
 */
export async function refreshTourPricingSummary(tourId: string, tenantId: string, currency = 'USD', authoritativeVersion?: number) {
  const tour = await Tour.findOne(buildStrictTenantQuery({ _id: tourId }, tenantId))
    .select('_id discountPrice discountPercent bookingOptions.price bookingOptions.applyTourDiscount bookingOptions.timeSlots.price')
    .lean<SummaryTour | null>();
  if (!tour) return null;

  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const overrides = await RevenuePriceOverride.find({
    tenantId, tourId: tour._id, active: true, date: { $gte: today },
  }).select('prices.adult version date currency').lean<Array<{
    prices?: { adult?: number };
    version?: number;
    date?: Date;
    currency?: string;
  }>>();

  const cataloguePrice = catalogueFromPrice(tour);
  const candidates = finitePrices([
    cataloguePrice,
    ...overrides.map((override) => override.prices?.adult),
  ]);
  if (candidates.length === 0) {
    const projectionToken = randomUUID();
    await Tour.updateOne(
      buildStrictTenantQuery({ _id: tour._id }, tenantId),
      [{ $set: {
        pricingSummaries: replaceTenantEntry('pricingSummaries', tenantId, null),
        pricingSearchProjections: replaceTenantEntry('pricingSearchProjections', tenantId, {
          status: 'pending', summaryVersion: 0,
          authoritativeVersion: Math.max(0, Number(authoritativeVersion || 0)),
          projectionToken, attempts: 0, nextAttemptAt: new Date(),
        }),
      } }],
    );
    return null;
  }

  const versions = overrides.map((override) => Number(override.version || 0)).filter(Number.isFinite);
  const dates = overrides.map((override) => override.date && new Date(override.date)).filter((date): date is Date => Boolean(date));
  const summary = {
    fromPrice: Math.min(...candidates),
    currency: overrides.find((override) => override.currency)?.currency || currency,
    version: versions.length ? Math.max(...versions) : 0,
    validThrough: dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : undefined,
  };
  const projectionToken = randomUUID();
  await Tour.updateOne(
    buildStrictTenantQuery({ _id: tour._id }, tenantId),
    [{ $set: {
      pricingSummaries: replaceTenantEntry('pricingSummaries', tenantId, summary),
      pricingSearchProjections: replaceTenantEntry('pricingSearchProjections', tenantId, {
        status: 'pending', summaryVersion: summary.version,
        authoritativeVersion: Math.max(0, Number(authoritativeVersion ?? summary.version)),
        projectionToken, attempts: 0, nextAttemptAt: new Date(),
      }),
    } }],
  );
  return summary;
}

/** Rebuild the summary independently for every brand that can sell a tour. */
export async function refreshTourPricingSummaries(tourId: string, tenantIds: Iterable<string>) {
  const results = [];
  const allowedTenantIds = [...new Set([...tenantIds].map((value) => String(value).trim()).filter((value) => /^[a-z0-9][a-z0-9-]{0,62}$/.test(value)))];
  await Tour.updateOne(
    { _id: tourId },
    [{ $set: {
      pricingSummaries: {
        $filter: { input: { $ifNull: ['$pricingSummaries', []] }, as: 'entry', cond: { $in: ['$$entry.tenantId', allowedTenantIds] } },
      },
      pricingSearchProjections: {
        $filter: { input: { $ifNull: ['$pricingSearchProjections', []] }, as: 'entry', cond: { $in: ['$$entry.tenantId', allowedTenantIds] } },
      },
    } }],
  );
  for (const tenantId of allowedTenantIds) {
    const tenant = await getTenantConfigCached(tenantId);
    if (!tenant || tenant.isActive === false) continue;
    const currency = String(tenant.payments?.currency || 'USD').toUpperCase();
    results.push({ tenantId, summary: await refreshTourPricingSummary(tourId, tenantId, currency) });
  }
  return results;
}

/**
 * Refresh the direct-site search projection and persist an independently
 * retryable delivery state. A successful authoritative price write is not
 * reported as fully propagated while Algolia/listing projection is stale.
 */
export async function syncTourPricingSearchIndex(tourId: string, tenantId: string) {
  if (process.env.NODE_ENV !== 'production' && process.env.REVENUEPILOT_SKIP_SEARCH_SYNC === 'true') {
    // Local harnesses skip the external Algolia push but must still settle the
    // projection ledger, or read-back propagation would stay pending forever.
    await Tour.updateOne(
      buildStrictTenantQuery({ _id: tourId, pricingSearchProjections: { $elemMatch: { tenantId, projectionToken: { $exists: true } } } }, tenantId),
      { $set: { 'pricingSearchProjections.$[projection].status': 'verified', 'pricingSearchProjections.$[projection].syncedAt': new Date() } },
      { arrayFilters: [{ 'projection.tenantId': tenantId }] },
    );
    return true;
  }
  const now = new Date();
  const tour = await Tour.findOne(buildStrictTenantQuery({ _id: tourId }, tenantId))
    .populate('category', 'name')
    .populate('destination', 'name')
    .lean<ProjectionTour | null>();
  if (!tour) return false;
  const summary = tenantPricingSummary(tour, tenantId);
  const projection = tenantPricingProjection(tour, tenantId);
  const summaryVersion = Number(
    projection?.summaryVersion
    ?? summary?.version
    ?? 0,
  );
  const projectionToken = projection?.projectionToken;
  if (!projectionToken) return false;
  const attempts = Math.max(0, Number(projection?.attempts || 0)) + 1;
  const claimed = await Tour.updateOne(
    buildStrictTenantQuery({
      _id: tour._id,
      pricingSearchProjections: { $elemMatch: { tenantId, summaryVersion, projectionToken } },
    }, tenantId),
    {
      $set: {
        'pricingSearchProjections.$[projection].status': 'syncing',
        'pricingSearchProjections.$[projection].lastAttemptAt': now,
      },
      $inc: { 'pricingSearchProjections.$[projection].attempts': 1 },
      $unset: {
        'pricingSearchProjections.$[projection].nextAttemptAt': 1,
        'pricingSearchProjections.$[projection].lastErrorCode': 1,
      },
    },
    { arrayFilters: [{ 'projection.tenantId': tenantId, 'projection.projectionToken': projectionToken }] },
  );
  if (Number(claimed.matchedCount || 0) !== 1) return false;

  const markFailed = async (lastErrorCode: string) => {
    const nextAttemptAt = new Date(now.getTime() + pricingProjectionRetryDelayMs(attempts));
    await Tour.updateOne(
      buildStrictTenantQuery({
        _id: tour._id,
        pricingSearchProjections: { $elemMatch: { tenantId, summaryVersion, projectionToken } },
      }, tenantId),
      {
        $set: {
          'pricingSearchProjections.$[projection].status': 'failed',
          'pricingSearchProjections.$[projection].lastErrorCode': lastErrorCode,
          'pricingSearchProjections.$[projection].nextAttemptAt': nextAttemptAt,
        },
      },
      { arrayFilters: [{ 'projection.tenantId': tenantId, 'projection.projectionToken': projectionToken }] },
    );
    return false;
  };

  try {
    const hasWriteCredentials = Boolean(
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
      && (process.env.ALGOLIA_WRITE_API_KEY || process.env.ALGOLIA_ADMIN_API_KEY),
    );
    if (!hasWriteCredentials) return markFailed('ALGOLIA_WRITE_NOT_CONFIGURED');
    const { deleteTourFromAlgolia, syncTourToAlgoliaVerified } = await import('@/lib/algolia');
    if (tour.isPublished === false) await deleteTourFromAlgolia(String(tour._id));
    else await syncTourToAlgoliaVerified(tour);
    const verified = await Tour.updateOne(
      buildStrictTenantQuery({
        _id: tour._id,
        pricingSearchProjections: { $elemMatch: { tenantId, summaryVersion, projectionToken } },
      }, tenantId),
      {
        $set: {
          'pricingSearchProjections.$[projection].status': 'verified',
          'pricingSearchProjections.$[projection].syncedAt': new Date(),
        },
        $unset: {
          'pricingSearchProjections.$[projection].nextAttemptAt': 1,
          'pricingSearchProjections.$[projection].lastErrorCode': 1,
        },
      },
      { arrayFilters: [{ 'projection.tenantId': tenantId, 'projection.projectionToken': projectionToken }] },
    );
    return Number(verified.matchedCount || 0) === 1;
  } catch (error) {
    console.error('Pricing search projection refresh failed.', error);
    return markFailed('ALGOLIA_SYNC_FAILED');
  }
}

export function pricingProjectionStatus(
  tour: Pick<ProjectionTour, 'pricingSummaries' | 'pricingSearchProjections'> | null | undefined,
  tenantId: string,
  authoritativeVersion?: number,
) {
  const projection = tenantPricingProjection(tour, tenantId);
  const summary = tenantPricingSummary(tour, tenantId);
  const summaryVersion = Number(summary?.version ?? -1);
  const projectionVersion = Number(projection?.summaryVersion ?? -1);
  const authorityMatches = authoritativeVersion === undefined
    || Number(projection?.authoritativeVersion ?? -1) === authoritativeVersion;
  const versionMatches = summaryVersion >= 0
    && projectionVersion === summaryVersion
    && authorityMatches;
  const verified = projection?.status === 'verified' && versionMatches;
  return {
    state: verified ? 'verified' as const : projection?.status === 'failed' ? 'failed' as const : 'pending' as const,
    verified,
    versionMatches,
    summaryVersion: summaryVersion >= 0 ? summaryVersion : null,
    projectionVersion: projectionVersion >= 0 ? projectionVersion : null,
    authoritativeVersion: Number.isFinite(Number(projection?.authoritativeVersion))
      ? Number(projection?.authoritativeVersion)
      : null,
  };
}

/**
 * Idempotently repair both materialized listing state and the external search
 * projection after an authoritative apply/rollback. A summary failure is
 * persisted as retryable work; an Algolia failure is persisted by the search
 * sync itself. Replaying the original write therefore repairs the projection
 * without repeating the price mutation.
 */
export async function reconcileTourPricingProjection(
  tourId: string,
  tenantId: string,
  currency = 'USD',
  authoritativeVersion = 0,
) {
  try {
    const summary = await refreshTourPricingSummary(tourId, tenantId, currency, authoritativeVersion);
    const searchSynced = await syncTourPricingSearchIndex(tourId, tenantId);
    return { summaryRefreshed: true, searchSynced, summary };
  } catch (error) {
    const now = new Date();
    await Tour.updateOne(
      buildStrictTenantQuery({ _id: tourId }, tenantId),
      [{ $set: {
        pricingSearchProjections: replaceTenantEntry('pricingSearchProjections', tenantId, {
          status: 'failed',
          authoritativeVersion: Math.max(0, Number(authoritativeVersion || 0)),
          summaryVersion: 0,
          projectionToken: randomUUID(),
          lastAttemptAt: now,
          lastErrorCode: 'PRICING_SUMMARY_REFRESH_FAILED',
          nextAttemptAt: new Date(now.getTime() + PROJECTION_RETRY_BASE_MS),
          attempts: 1,
        }),
      } }],
    );
    console.error('Pricing summary projection refresh failed.', error);
    return { summaryRefreshed: false, searchSynced: false, summary: null };
  }
}

/** Refresh summaries whose last future override has elapsed. Invoke daily from
 * the authenticated pricing-summaries cron endpoint. The same cron also drains
 * failed/pending search projections so a transient Algolia outage cannot leave
 * listing prices stale indefinitely. */
export async function refreshExpiredPricingSummaries(limit = 200) {
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const boundedLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const now = new Date();
  const staleSyncCutoff = new Date(now.getTime() - 5 * 60_000);
  const tours = await Tour.find({
    $or: [
      { 'pricingSummaries.validThrough': { $lt: today } },
      { 'pricingSearchProjections.status': 'pending' },
      {
        pricingSearchProjections: { $elemMatch: { status: 'failed', nextAttemptAt: { $lte: now } } },
      },
      {
        pricingSearchProjections: { $elemMatch: { status: 'syncing', lastAttemptAt: { $lte: staleSyncCutoff } } },
      },
    ],
  }).select('_id pricingSummaries pricingSearchProjections')
    .limit(boundedLimit)
    .lean<Array<{
      _id: Types.ObjectId;
      pricingSummaries?: Array<{ tenantId: string; currency?: string; validThrough?: Date }>;
      pricingSearchProjections?: Array<{ tenantId: string; status?: string; nextAttemptAt?: Date; lastAttemptAt?: Date; authoritativeVersion?: number; lastErrorCode?: string }>;
    }>>();
  let refreshed = 0;
  const results: Array<{ tourId: string; tenantId: string; searchSynced: boolean }> = [];
  for (const tour of tours) {
    const tourId = String(tour._id);
    for (const summary of tour.pricingSummaries || []) {
      if (!summary.validThrough || new Date(summary.validThrough) >= today) continue;
      await refreshTourPricingSummary(tourId, summary.tenantId, summary.currency || 'USD');
      refreshed += 1;
    }
    for (const projection of tour.pricingSearchProjections || []) {
      const retryDue = projection.status === 'pending'
        || (projection.status === 'failed' && Boolean(projection.nextAttemptAt && new Date(projection.nextAttemptAt) <= now))
        || (projection.status === 'syncing' && Boolean(projection.lastAttemptAt && new Date(projection.lastAttemptAt) <= staleSyncCutoff));
      if (!retryDue || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(projection.tenantId)) continue;
      const summary = (tour.pricingSummaries || []).find((entry) => entry.tenantId === projection.tenantId);
      const searchSynced = projection.lastErrorCode === 'PRICING_SUMMARY_REFRESH_FAILED'
        ? (await reconcileTourPricingProjection(
          tourId,
          projection.tenantId,
          summary?.currency || 'USD',
          Number(projection.authoritativeVersion || 0),
        )).searchSynced
        : await syncTourPricingSearchIndex(tourId, projection.tenantId);
      results.push({ tourId, tenantId: projection.tenantId, searchSynced });
    }
  }
  return { refreshed, projectionAttempts: results.length, results };
}
