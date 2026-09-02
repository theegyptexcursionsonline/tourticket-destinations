import { createHash } from 'node:crypto';

type GuestPrices = { adult?: number; child?: number; infant?: number };
type PricingTimeSlot = { time?: string; price?: number; guestPrices?: { child?: number; infant?: number } };
type PricingOption = { pricingKey?: string; price?: number; originalPrice?: number; type?: string; guestPrices?: GuestPrices; applyTourDiscount?: boolean; timeSlots?: PricingTimeSlot[] };
type PricingCatalogue = { discountPrice?: number; originalPrice?: number; discountPercent?: number; revenueGuestPrices?: GuestPrices; bookingOptions?: PricingOption[]; availability?: { slots?: PricingTimeSlot[] } };

// Only slots that carry their own price participate: an unpriced slot inherits
// the base price, so schedule or capacity edits must not invalidate
// RevenuePilot's view of the catalogue.
const slotPricing = (slots?: PricingTimeSlot[]) => (slots || [])
  .filter((slot) => typeof slot.price === 'number' || slot.guestPrices?.child !== undefined || slot.guestPrices?.infant !== undefined)
  .map((slot) => ({
    time: slot.time || '',
    price: typeof slot.price === 'number' ? slot.price : null,
    guestPrices: slot.guestPrices ?? null,
  }))
  .sort((left, right) => left.time.localeCompare(right.time));

export function pricingCatalogueVersion(tour: PricingCatalogue) {
  const pricing = {
    standard: { price: Number(tour.discountPrice), originalPrice: Number(tour.originalPrice ?? tour.discountPrice), guestPrices: tour.revenueGuestPrices ?? null },
    // The percentage discount and slot overrides change what checkout charges,
    // so they are part of the catalogue version a price write is bound to.
    discountPercent: Number(tour.discountPercent ?? 0),
    universalSlots: slotPricing(tour.availability?.slots),
    options: (tour.bookingOptions || []).map((option) => ({
      key: option.pricingKey || '',
      price: Number(option.price),
      originalPrice: Number(option.originalPrice ?? option.price),
      type: option.type || '',
      guestPrices: option.guestPrices ?? null,
      applyTourDiscount: Boolean(option.applyTourDiscount),
      timeSlots: slotPricing(option.timeSlots),
    })).sort((left, right) => left.key.localeCompare(right.key)),
  };
  return `pv1_${createHash('sha256').update(JSON.stringify(pricing)).digest('hex')}`;
}

