import Availability from '@/lib/models/Availability';
import RevenuePriceOverride from '@/lib/models/RevenuePriceOverride';
import Tour from '@/lib/models/Tour';
import { ensureBookingOptionPricingKeys } from '@/lib/revenue/pricingKeys';
import { effectiveSlotGuestPrices, explicitCatalogueGuestPrices } from '@/lib/revenue/guestPrices';
import { refreshTourPricingSummary } from '@/lib/revenue/pricingSummary';
import { buildStrictTenantQuery, getTenantConfigCached } from '@/lib/tenant';
import { finalizeAddOnAssignments } from '@/lib/admin/addOnAssignments';
import { effectiveTourPrice } from '@/lib/pricing/effectivePrice';

export type PricingBackfillResult = {
  dryRun: boolean;
  toursScanned: number;
  toursKeyed: number;
  addOnAssignmentsRewritten: number;
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
  let addOnAssignments = 0;
  let guestPriceSets = 0;
  let legacy = 0;
  let summaries = 0;
  for (const tour of tours) {
    const tourObject = tour.toObject();
    let bookingOptions = ensureBookingOptionPricingKeys(String(tour._id), tourObject.bookingOptions) ?? [];
    const needsKeys = (tour.bookingOptions || []).some((option) => !option.pricingKey);
    const remappedAddOns = finalizeAddOnAssignments(tourObject.addOns, bookingOptions);
    const assignmentSignature = (items: unknown) => JSON.stringify((Array.isArray(items) ? items : []).map((item) => {
      const keys = item && typeof item === 'object' && 'bookingOptionKeys' in item
        ? (item as { bookingOptionKeys?: unknown }).bookingOptionKeys
        : undefined;
      return Array.isArray(keys) ? keys : [];
    }));
    const assignmentsChanged = assignmentSignature(remappedAddOns) !== assignmentSignature(tourObject.addOns);
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
    if (needsKeys || assignmentsChanged || materializedForTour > 0) {
      // Avoid Tour post-save integrations (for example Algolia) during this data migration.
      if (!dryRun) {
        const update: Record<string, unknown> = { bookingOptions };
        if (assignmentsChanged) update.addOns = remappedAddOns;
        if (materializedForTour > 0) update.revenueGuestPrices = revenueGuestPrices;
        await Tour.updateOne(buildStrictTenantQuery({ _id: tour._id }, tenantId), { $set: update }, { runValidators: true });
      }
      if (needsKeys) keyed += 1;
      if (assignmentsChanged) addOnAssignments += 1;
      guestPriceSets += materializedForTour;
    }
    // A configured-option tour has no synthetic Standard product. Universal
    // slots may still drive schedules, but importing a Standard override would
    // create an unreachable price target that the catalogue never exports.
    const availabilities = bookingOptions.length === 0
      ? await Availability.find({ tenantId, tour: tour._id, 'slots.price': { $ne: null } }).lean()
      : [];
    for (const availability of availabilities) {
      for (const slot of availability.slots || []) {
        const price = Number(slot.price);
        if (!Number.isFinite(price) || price < 0) continue;
        const adult = effectiveTourPrice(tourObject, slot).price;
        const prices = effectiveSlotGuestPrices({
          adult,
          base: revenueGuestPrices,
          slot: slot as { guestPrices?: { child?: number; infant?: number } },
          discountPercent: tourObject.discountPercent,
          applyDiscount: true,
        });
        const target = { tenantId, tourId: tour._id, optionKey: 'standard', date: availability.date, time: slot.time };
        if (await RevenuePriceOverride.exists(target)) continue;
        if (!dryRun) await RevenuePriceOverride.updateOne(
          target,
          { $setOnInsert: { currency, prices, cataloguePrices: prices, previousPrices: prices, version: 1, source: 'legacy', recommendationId: 'legacy-import', executionId: `legacy:${tenantId}:${availability._id}:${slot.time}`, active: true } },
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
    addOnAssignmentsRewritten: addOnAssignments,
    guestPriceSetsMaterialized: guestPriceSets,
    legacyOverridesImported: legacy,
    summariesRebuilt: summaries,
  };
}
