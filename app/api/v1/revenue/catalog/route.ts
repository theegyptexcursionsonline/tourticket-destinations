import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour, { type IBookingOption } from '@/lib/models/Tour';
import { buildStrictTenantQuery, getTenantConfigCached } from '@/lib/tenant';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';
import { STANDARD_OPTION_KEY } from '@/lib/revenue/pricingContract';
import { effectiveCatalogueGuestPrices } from '@/lib/revenue/guestPrices';
import { effectiveOptionPrice, effectiveTourPrice } from '@/lib/pricing/effectivePrice';
import { pricingCatalogueVersion } from '@/lib/revenue/pricingVersion';
import { pricingProjectionStatus, tenantPricingProjection, tenantPricingSummary } from '@/lib/revenue/pricingSummary';
import { decodeRevenueCursor, encodeRevenueCursor, parseRevenuePageLimit } from '@/lib/revenue/pagination';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateRevenueRequest(request);
  if (auth.response) return auth.response;
  const tenantId = auth.tenantId!;
  const limitResult = parseRevenuePageLimit(request.nextUrl.searchParams.get('limit'), 100, 200);
  if ('error' in limitResult) return revenueError(422, 'INVALID_LIMIT', limitResult.error);
  const cursorResult = decodeRevenueCursor(request.nextUrl.searchParams.get('cursor'), { resource: 'catalog', tenantId });
  if ('error' in cursorResult) return revenueError(422, 'INVALID_CURSOR', cursorResult.error);
  await dbConnect();
  // Selecting the same pricing fields the resolver selects keeps
  // pricingCatalogueVersion() identical between this export and the
  // price-write guard — a mismatch would block every write as stale.
  const [rows, tenant] = await Promise.all([
    Tour.find(buildStrictTenantQuery({
      isPublished: true,
      archivedAt: null,
      ...(cursorResult.cursor ? { _id: { $gt: cursorResult.cursor.afterId } } : {}),
    }, tenantId))
      .select('_id title slug discountPrice discountPercent originalPrice revenueGuestPrices bookingOptions availability pricingSummaries pricingSearchProjections updatedAt')
      .sort({ _id: 1 })
      .limit(limitResult.limit + 1)
      .lean(),
    getTenantConfigCached(tenantId),
  ]);
  if (!tenant || tenant.isActive === false) return NextResponse.json({ error: { code: 'TENANT_NOT_FOUND', message: 'Tenant is unavailable.' } }, { status: 404 });
  const hasMore = rows.length > limitResult.limit;
  const tours = rows.slice(0, limitResult.limit);
  const last = tours.at(-1);
  return NextResponse.json({
    tenantId,
    currency: String(tenant.payments?.currency || 'USD').toUpperCase(),
    tours: tours.map((tour) => ({
      id: String(tour._id), title: tour.title, slug: tour.slug, updatedAt: tour.updatedAt, sourceVersion: pricingCatalogueVersion(tour),
      pricingSummary: tenantPricingSummary(tour, tenantId),
      pricingSearchProjection: tenantPricingProjection(tour, tenantId),
      channelPropagation: {
        eeo_direct: pricingProjectionStatus(tour, tenantId).state,
        getyourguide: 'not_connected',
        viator: 'not_connected',
      },
      options: [
        ...((tour.bookingOptions || []).length === 0 ? [(() => {
          const guest = effectiveCatalogueGuestPrices({
            catalogueAdult: Number(tour.discountPrice),
            effectiveAdult: effectiveTourPrice(tour).price,
            explicit: tour.revenueGuestPrices,
            discountPercent: tour.discountPercent,
            applyDiscount: true,
          });
          return { key: STANDARD_OPTION_KEY, label: 'Standard Experience', guestPrices: guest.prices, guestPricesVerified: guest.verified };
        })()] : []),
        ...(tour.bookingOptions || []).map((option: IBookingOption) => ({
          key: option.pricingKey, label: option.label, type: option.type,
          // RevenuePilot must see the price checkout actually charges, so the
          // catalogue adult goes through the shared discount helper.
          ...(() => {
            const guest = effectiveCatalogueGuestPrices({
              catalogueAdult: Number(option.price),
              effectiveAdult: effectiveOptionPrice(tour, option).price,
              explicit: option.guestPrices,
              discountPercent: tour.discountPercent,
              applyDiscount: Boolean(option.applyTourDiscount),
            });
            return { guestPrices: guest.prices, guestPricesVerified: guest.verified };
          })(),
        })),
      ],
    })),
    nextCursor: hasMore && last
      ? encodeRevenueCursor({ resource: 'catalog', tenantId, afterId: String(last._id) })
      : null,
    channels: { eeo_direct: 'connected', getyourguide: 'not_connected', viator: 'not_connected' },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
