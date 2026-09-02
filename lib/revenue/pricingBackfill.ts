import Availability from '@/lib/models/Availability';
import RevenuePriceOverride from '@/lib/models/RevenuePriceOverride';
import Tour from '@/lib/models/Tour';
import { ensureBookingOptionPricingKeys } from '@/lib/revenue/pricingKeys';
import { explicitCatalogueGuestPrices } from '@/lib/revenue/guestPrices';
import { catalogueGuestPrices } from '@/lib/revenue/pricingResolver';
import { refreshTourPricingSummary } from '@/lib/revenue/pricingSummary';
import { buildStrictTenantQuery, getTenantConfigCached } from '@/lib/tenant';

export type PricingBackfillResult = {
  dryRun: boolean;
  toursScanned: number;
  toursKeyed: number;
  guestPriceSetsMaterialized: number;
  legacyOverridesImported: number;
  summariesRebuilt: number;
};

export type PricingBackfillOptions = {
  tenantId: string;
  tourIds?: string[];
  materializeGuestPrices?: boolean;
};

export async function backfillRevenuePricing(dryRun: boolean, options: PricingBackfillOptions): Promise<PricingBackfillResult> {
  const tenantId = options.tenantId?.trim();
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(tenantId)) throw new Error('A valid tenantId is required for a RevenuePilot backfill.');
  const tenant = await getTenantConfigCached(tenantId);
  if (!tenant || tenant.isActive === false) throw new Error('RevenuePilot backfill tenant is unavailable.');
  const currency = String(tenant.payments?.currency || 'USD').toUpperCase();
  const query: Record<string, unknown> = buildStrictTenantQuery({}, tenantId);
  if (options.tourIds?.length) query._id = { $in: options.tourIds };
  const tours = await Tour.find(query);
  let keyed = 0;
  let guestPriceSets = 0;
  let legacy = 0;
  let summaries = 0;
  for (const tour of tours) {
    const tourObject = tour.toObject();
    let bookingOptions = ensureBookingOptionPricingKeys(String(tour._id), tourObject.bookingOptions) ?? [];
    const needsKeys = (tour.bookingOptions || []).some((option) => !option.pricingKey);
    let revenueGuestPrices = tourObject.revenueGuestPrices;
    let materializedForTour = 0;
    if (options.materializeGuestPrices) {
      const standardPrices = explicitCatalogueGuestPrices(Number(tour.discountPrice), revenueGuestPrices);
      if (!standardPrices.verified) {
        revenueGuestPrices = standardPrices.prices;
        materializedForTour += 1;
      }
      bookingOptions = bookingOptions.map((option) => {
        const optionPrices = explicitCatalogueGuestPrices(Number(option.price), option.guestPrices);
        if (optionPrices.verified) return option;
        materializedForTour += 1;
        return { ...option, guestPrices: optionPrices.prices };
      });
    }
    if (needsKeys || materializedForTour > 0) {
      // Avoid Tour post-save integrations (for example Algolia) during this data migration.
      if (!dryRun) {
        const update: Record<string, unknown> = { bookingOptions };
        if (materializedForTour > 0) update.revenueGuestPrices = revenueGuestPrices;
        await Tour.updateOne(buildStrictTenantQuery({ _id: tour._id }, tenantId), { $set: update }, { runValidators: true });
      }
      if (needsKeys) keyed += 1;
      guestPriceSets += materializedForTour;
    }
    const availabilities = await Availability.find({ tenantId, tour: tour._id, 'slots.price': { $ne: null } }).lean();
    for (const availability of availabilities) {
      for (const slot of availability.slots || []) {
        const price = Number(slot.price);
        if (!Number.isFinite(price) || price < 0) continue;
        const prices = catalogueGuestPrices(price);
        const target = { tenantId, tourId: tour._id, optionKey: 'standard', date: availability.date, time: slot.time };
        if (await RevenuePriceOverride.exists(target)) continue;
        if (!dryRun) await RevenuePriceOverride.updateOne(
          target,
          { $setOnInsert: { currency, prices, cataloguePrices: catalogueGuestPrices(Number(tour.discountPrice)), previousPrices: catalogueGuestPrices(Number(tour.discountPrice)), version: 1, source: 'legacy', recommendationId: 'legacy-import', executionId: `legacy:${tenantId}:${availability._id}:${slot.time}`, active: true } },
          { upsert: true },
        );
        legacy += 1;
      }
    }
    if (!dryRun) {
      await refreshTourPricingSummary(String(tour._id), tenantId, currency);
      summaries += 1;
    }
  }
  return {
    dryRun,
    toursScanned: tours.length,
    toursKeyed: keyed,
    guestPriceSetsMaterialized: guestPriceSets,
    legacyOverridesImported: legacy,
    summariesRebuilt: summaries,
  };
}
