import mongoose from 'mongoose';
import Tour from '@/lib/models/Tour';
import RevenuePriceOverride, { type GuestPrices } from '@/lib/models/RevenuePriceOverride';
import { buildStrictTenantQuery, getTenantConfigCached } from '@/lib/tenant';
import type { IBookingOption } from '@/lib/models/Tour';
import type { Types } from 'mongoose';
import { pricingCatalogueVersion } from '@/lib/revenue/pricingVersion';
import { effectiveSlotGuestPrices, explicitCatalogueGuestPrices } from '@/lib/revenue/guestPrices';
import { authoritativeBasePrice } from '@/lib/pricing/authoritativePrice';
import { STANDARD_OPTION_KEY, type EffectivePriceQuote } from '@/lib/revenue/pricingContract';

export { explicitCatalogueGuestPrices } from '@/lib/revenue/guestPrices';
export { STANDARD_OPTION_KEY } from '@/lib/revenue/pricingContract';

type CatalogueTour = {
  _id: Types.ObjectId;
  title: string;
  discountPrice: number;
  discountPercent?: number;
  originalPrice?: number;
  bookingOptions?: IBookingOption[];
  revenueGuestPrices?: GuestPrices;
  availability?: { slots?: Array<{ time?: string; capacity?: number; price?: number; guestPrices?: { child?: number; infant?: number } }> };
  updatedAt: Date;
};

type PriceOverride = {
  _id: Types.ObjectId;
  currency: string;
  prices: GuestPrices;
  version: number;
  executionId?: string;
};

export function normalizePriceDate(value: string | Date) {
  const raw = value instanceof Date ? value.toISOString().slice(0, 10) : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error('Invalid price date');
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) throw new Error('Invalid price date');
  return parsed;
}

export function catalogueGuestPrices(adult: number, explicit?: Partial<GuestPrices> | null): GuestPrices {
  return explicitCatalogueGuestPrices(adult, explicit).prices;
}

export async function resolveEffectivePrice(input: { tourId: string; optionKey?: string; date: string; time: string; tenantId: string }): Promise<EffectivePriceQuote> {
  if (!mongoose.Types.ObjectId.isValid(input.tourId)) throw new Error('Invalid tour');
  const tenantId = input.tenantId?.trim();
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(tenantId)) throw new Error('Tenant unavailable');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('Invalid price time');
  const optionKey = input.optionKey || STANDARD_OPTION_KEY;
  const [tour, tenant] = await Promise.all([
    Tour.findOne(buildStrictTenantQuery({ _id: input.tourId, isPublished: true, archivedAt: null }, tenantId))
    .select('_id title discountPrice discountPercent originalPrice revenueGuestPrices bookingOptions availability updatedAt')
    .lean<CatalogueTour | null>(),
    getTenantConfigCached(tenantId),
  ]);
  if (!tour) throw new Error('Tour unavailable');
  if (!tenant || tenant.isActive === false) throw new Error('Tenant unavailable');
  if (optionKey === STANDARD_OPTION_KEY && (tour.bookingOptions || []).length > 0) {
    throw new Error('Pricing option unavailable');
  }
  const option = optionKey === STANDARD_OPTION_KEY
    ? null
    : tour.bookingOptions?.find((candidate) => candidate.pricingKey === optionKey);
  if (optionKey !== STANDARD_OPTION_KEY && !option) throw new Error('Pricing option unavailable');
  const rawAdult = Number(option?.price ?? tour.discountPrice);
  if (!Number.isFinite(rawAdult) || rawAdult < 0) throw new Error('Invalid catalogue price');
  // The catalogue baseline goes through the shared discount helper: the tour's
  // percentage applies to opted-in options and a slot may override the base,
  // so this quote, the sidebar and the booking writer can never disagree.
  const adult = authoritativeBasePrice(tour, {
    selectedBookingOption: option ? { pricingKey: optionKey } : null,
    selectedTime: input.time,
  });
  const selectedSlot = option
    ? option.timeSlots?.find((slot) => slot.time === input.time)
    : tour.availability?.slots?.find((slot) => slot.time === input.time);
  const cataloguePrices = effectiveSlotGuestPrices({
    adult,
    base: option?.guestPrices ?? tour.revenueGuestPrices,
    slot: selectedSlot,
    discountPercent: tour.discountPercent,
    applyDiscount: option ? Boolean(option.applyTourDiscount) : true,
  });
  const date = normalizePriceDate(input.date);
  const override = await RevenuePriceOverride.findOne({ tenantId, tourId: tour._id, optionKey, date, time: input.time, active: true }).lean<PriceOverride | null>();
  const prices = override?.prices ?? cataloguePrices;
  return {
    tourId: String(tour._id),
    tourTitle: tour.title,
    optionKey,
    date: date.toISOString().slice(0, 10),
    time: input.time,
    currency: override?.currency ?? String(tenant.payments?.currency || 'USD').toUpperCase(),
    prices,
    cataloguePrices,
    version: override?.version ?? 0,
    overrideId: override?._id ? String(override._id) : null,
    executionId: override?.executionId ?? null,
    source: override ? ('override' as const) : ('catalogue' as const),
    sourceVersion: pricingCatalogueVersion(tour),
  };
}
