import Discount from '@/lib/models/Discount';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery } from '@/lib/tenant';
import Availability from '@/lib/models/Availability';
import StopSale from '@/lib/models/StopSale';
import { createHash, createHmac } from 'crypto';
import { isPerPersonAddOn } from '@/lib/checkout/addOnPricing';
import { authoritativeBasePrice } from '@/lib/pricing/authoritativePrice';
import { guestPricedSubtotal, resolveCatalogueGuestPrices } from '@/lib/revenue/guestPrices';
import {
  capacityAvailability,
  effectiveUnitSize,
  isUnitPricedType,
  type UnitCapacityOption,
} from '@/lib/bookings/unitPricing';
import { isAddOnAvailableForOption } from '@/lib/bookings/addOnAvailability';
import { clampAddOnQuantity, perPersonAddOnLimit } from '@/lib/bookings/bookingSelection';
import { STANDARD_OPTION_KEY, type EffectivePriceQuote } from '@/lib/revenue/pricingContract';

type CartItem = Record<string, any>;

export class CheckoutPriceChangedError extends Error {
  readonly code = 'PRICE_CHANGED';

  constructor(public readonly quote: EffectivePriceQuote) {
    super('The selected price changed. Review the new quote before continuing.');
    this.name = 'CheckoutPriceChangedError';
  }
}

export function checkoutFingerprint(cart: CartItem[], tenantId: string, currency: string): string {
  const canonical = cart.map((item) => ({
    tour: String(item._id || item.id),
    date: String(item.selectedDate || ''),
    time: String(item.selectedTime || '10:00'),
    adults: Number(item.quantity || 0),
    children: Number(item.childQuantity || 0),
    infants: Number(item.infantQuantity || 0),
    option: String(item.selectedBookingOption?.id || ''),
    optionKey: String(item.selectedBookingOption?.pricingKey || ''),
    priceVersion: item.priceVersion === undefined ? null : Number(item.priceVersion),
    priceSourceVersion: item.priceSourceVersion === undefined ? null : String(item.priceSourceVersion),
    addOns: Object.entries(item.selectedAddOns || {}).sort(([a], [b]) => a.localeCompare(b)),
  }));
  return createHash('sha256').update(JSON.stringify({ tenantId, currency: currency.toLowerCase(), cart: canonical })).digest('hex');
}

export function checkoutCustomerRef(email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Server authentication secret is not configured');
  return createHmac('sha256', secret).update(email.trim().toLowerCase()).digest('hex');
}

async function assertBookable(item: CartItem, tenantId: string) {
  const dateText = String(item.selectedDate || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) throw new Error('A valid booking date is required');
  const start = new Date(`${dateText}T00:00:00.000Z`);
  const end = new Date(`${dateText}T23:59:59.999Z`);
  if (end.getTime() < Date.now()) throw new Error('Booking date is in the past');
  const tourId = item._id || item.id;
  const optionId = String(item.selectedBookingOption?.id || '');
  const stopSale = await StopSale.exists({
    tenantId,
    tourId,
    startDate: { $lte: end },
    endDate: { $gte: start },
    $or: [{ optionIds: { $size: 0 } }, ...(optionId ? [{ optionIds: optionId }] : [])],
  });
  if (stopSale) throw new Error('Selected tour is unavailable for this date');

  const availability: any = await Availability.findOne({ tenantId, tour: tourId, date: { $gte: start, $lte: end } }).lean();
  if (!availability) return; // Absence means no capacity override has been configured.
  if (availability.stopSale) throw new Error('Selected tour is unavailable for this date');
  const requested = Number(item.quantity || 0) + Number(item.childQuantity || 0) + Number(item.infantQuantity || 0);
  const matchingSlots = item.selectedTime
    ? availability.slots.filter((slot: any) => slot.time === item.selectedTime)
    : availability.slots;
  if (item.selectedTime && matchingSlots.length === 0) throw new Error('Selected time is unavailable');
  const remaining = matchingSlots.reduce((sum: number, slot: any) => slot.blocked
    ? sum
    : sum + Math.max(0, Number(slot.capacity || 0) + Number(slot.extraCapacity || 0) - Number(slot.booked || 0)), 0);
  if (remaining < requested) throw new Error('Not enough availability for the selected participants');
}

const FALLBACK_ADD_ONS: Record<string, { title: string; price: number; perGuest: boolean }> = {
  'photo-package-fallback': { title: 'Professional Photography Package', price: 35, perGuest: false },
  'transport-premium-fallback': { title: 'Premium Hotel Transfer Service', price: 15, perGuest: false },
  'refreshment-upgrade-fallback': { title: 'Gourmet Refreshment Package', price: 12, perGuest: true },
  'guide-upgrade-fallback': { title: 'Private Guide Enhancement', price: 45, perGuest: false },
};

const count = (value: unknown, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 50) throw new Error('Invalid participant quantity');
  return number || fallback;
};

export async function calculateCheckoutPricing(
  submittedCart: unknown,
  tenantId: string,
  discountCode?: string | null,
) {
  if (!Array.isArray(submittedCart) || submittedCart.length === 0 || submittedCart.length > 10) {
    throw new Error('Invalid cart');
  }

  let subtotal = 0;
  const cart: CartItem[] = [];

  for (const submitted of submittedCart as CartItem[]) {
    const id = submitted?._id || submitted?.id;
    if (typeof id !== 'string') throw new Error('Invalid tour');
    const tour: any = await Tour.findOne(
      buildStrictTenantQuery({ _id: id, isPublished: true, archivedAt: null }, tenantId),
    ).lean();
    if (!tour) throw new Error('Tour not found');

    const adults = count(submitted.quantity, 1);
    const children = count(submitted.childQuantity);
    const infants = count(submitted.infantQuantity);
    if (adults + children + infants < 1) throw new Error('At least one participant is required');

    let selectedOption: any;
    let selectedOptionIndex = -1;
    const optionId = submitted.selectedBookingOption?.id ? String(submitted.selectedBookingOption.id) : '';
    const requestedPricingKey = submitted.selectedBookingOption?.pricingKey
      ? String(submitted.selectedBookingOption.pricingKey)
      : '';
    const optionIdIsStandard = !optionId || optionId === 'standard-default' || optionId === 'standard-tour';
    const pricingKeyIsStandard = !requestedPricingKey || requestedPricingKey === STANDARD_OPTION_KEY;
    if (optionId && requestedPricingKey && optionIdIsStandard !== pricingKeyIsStandard) {
      throw new Error('Invalid booking option');
    }
    if (!optionIdIsStandard || !pricingKeyIsStandard) {
      const options = Array.isArray(tour.bookingOptions) ? tour.bookingOptions : [];
      const idIndex = optionId
        ? options.findIndex((option: any, index: number) => String(option.id || option._id || `option-${index}`) === optionId)
        : -1;
      const keyIndex = requestedPricingKey
        ? options.findIndex((option: any) => String(option.pricingKey || '') === requestedPricingKey)
        : -1;
      if (idIndex >= 0 && keyIndex >= 0 && idIndex !== keyIndex) throw new Error('Invalid booking option');
      selectedOptionIndex = keyIndex >= 0 ? keyIndex : idIndex;
      selectedOption = selectedOptionIndex >= 0 ? options[selectedOptionIndex] : undefined;
      if (!selectedOption) throw new Error('Invalid booking option');
      if (typeof selectedOption.price !== 'number' || !Number.isFinite(selectedOption.price)) {
        throw new Error('Invalid tour price');
      }
    }
    // Priced by the same helper as the post-payment booking writer, so the
    // Stripe amount, the sidebar quote and the recorded booking can never
    // disagree: tour discount percentage and per-slot overrides included.
    // Only the option id is forwarded — never client-submitted prices.
    let basePrice = authoritativeBasePrice(tour, {
      selectedBookingOption: selectedOption ? {
        id: String(selectedOption.id || selectedOption._id || `option-${selectedOptionIndex}`),
        pricingKey: selectedOption.pricingKey,
      } : null,
      selectedTime: submitted.selectedTime ?? null,
    });
    if (!Number.isFinite(basePrice) || basePrice < 0) throw new Error('Invalid tour price');
    // Child and infant follow the selected departure: slot override, then the
    // option's / tour's guest-price set, then the network default (child half,
    // infant free). Resolved from the stored tour — a client-supplied
    // `guestPrices` on the cart item is ignored below.
    let guestPrices = resolveCatalogueGuestPrices(tour, {
      selectedBookingOption: selectedOption ? {
        id: String(selectedOption.id || selectedOption._id || `option-${selectedOptionIndex}`),
        pricingKey: selectedOption.pricingKey,
      } : null,
      selectedTime: submitted.selectedTime ?? null,
    });
    let priceQuote: EffectivePriceQuote | null = null;
    const shouldResolveMachinePrice = Boolean(
      submitted.selectedDate
      && submitted.selectedTime
      && (
        process.env.REVENUEPILOT_PRICING_API_ENABLED === 'true'
        || submitted.priceVersion !== undefined
        || submitted.priceSourceVersion !== undefined
      )
    );
    if (shouldResolveMachinePrice) {
      const { resolveEffectivePrice } = await import('@/lib/revenue/pricingResolver');
      const optionKey = selectedOption ? String(selectedOption.pricingKey || '') : STANDARD_OPTION_KEY;
      if (!optionKey) throw new Error('Booking option pricing key is not configured');
      priceQuote = await resolveEffectivePrice({
        tenantId,
        tourId: String(tour._id),
        optionKey,
        date: String(submitted.selectedDate).slice(0, 10),
        time: String(submitted.selectedTime),
      });
      if (
        (process.env.REVENUEPILOT_PRICING_API_ENABLED === 'true' && submitted.priceVersion === undefined)
        || (submitted.priceVersion !== undefined && Number(submitted.priceVersion) !== priceQuote.version)
        || (submitted.priceSourceVersion !== undefined && String(submitted.priceSourceVersion) !== priceQuote.sourceVersion)
      ) {
        throw new CheckoutPriceChangedError(priceQuote);
      }
      basePrice = priceQuote.prices.adult;
      guestPrices = priceQuote.prices;
    }
    for (const guest of ['child', 'infant'] as const) {
      if (!Number.isFinite(guestPrices[guest]) || guestPrices[guest] < 0) throw new Error('Invalid tour price');
    }

    const selectedAddOns: Record<string, number> = {};
    const selectedAddOnDetails: Record<string, any> = {};
    let addOnsTotal = 0;
    for (const [addOnId, rawQuantity] of Object.entries(submitted.selectedAddOns || {})) {
      const requestedQuantity = count(rawQuantity);
      if (requestedQuantity === 0) continue;
      const index = (tour.addOns || []).findIndex((addOn: any) => String(addOn._id) === addOnId);
      const stored = index >= 0 ? tour.addOns[index] : null;
      const fallback = FALLBACK_ADD_ONS[addOnId];
      if (!stored && !fallback) throw new Error('Invalid add-on');
      const selectedOptionKey = selectedOption?.pricingKey || selectedOption?.id || null;
      if (stored && !isAddOnAvailableForOption(stored, selectedOptionKey)) throw new Error('Invalid add-on');
      const price = Number(stored?.price ?? fallback.price);
      const perGuest = stored ? isPerPersonAddOn(stored) : fallback.perGuest;
      const title = stored?.name ?? fallback.title;
      if (!Number.isFinite(price) || price < 0) throw new Error('Invalid add-on price');
      // A per-person add-on is billed for the units the guest chose, capped at
      // one per paying participant (adults + children) — never multiplied by
      // the party size on the guest's behalf, never above the party size, and
      // never for infants (client sheet EEO 24 Aug / MT 31 Aug).
      const billedQuantity = perGuest ? clampAddOnQuantity(requestedQuantity, perPersonAddOnLimit(adults, children)) : requestedQuantity;
      addOnsTotal += price * billedQuantity;
      selectedAddOns[addOnId] = billedQuantity;
      selectedAddOnDetails[addOnId] = { title, price, perGuest, quantity: billedQuantity };
    }

    // Capacity is authorization, not presentation: a party that the option
    // cannot take is refused here even if the browser offered the card.
    if (selectedOption) {
      const gate = capacityAvailability(selectedOption as UnitCapacityOption, adults + children + infants);
      if (!gate.available) {
        throw new Error(
          gate.reason === 'below_minimum'
            ? `This option needs at least ${gate.limit} participants`
            : `This option takes at most ${gate.limit} participants`,
        );
      }
    }

    // A unit-priced option (Per Couple / Per Family / Per Group) is charged
    // in whole units, never per guest — the client's reported overcharge.
    // Per Person options charge each guest type its stored price.
    const itemSubtotal = guestPricedSubtotal(selectedOption ?? null, guestPrices, adults, children, infants) + addOnsTotal;
    subtotal += itemSubtotal;
    cart.push({
      ...submitted,
      title: tour.title,
      price: basePrice,
      discountPrice: basePrice,
      quantity: adults,
      childQuantity: children,
      infantQuantity: infants,
      guestPrices,
      selectedBookingOption: selectedOption
        ? {
            id: String(selectedOption.id || selectedOption._id || `option-${selectedOptionIndex}`),
            pricingKey: String(selectedOption.pricingKey || ''),
            title: selectedOption.label,
            type: selectedOption.type,
            price: basePrice,
            originalPrice: selectedOption.originalPrice,
            duration: selectedOption.duration,
            badge: selectedOption.badge,
          }
        : {
            id: 'standard-default',
            pricingKey: STANDARD_OPTION_KEY,
            title: `${tour.title} - Standard Experience`,
            type: 'Per Person',
            price: basePrice,
            originalPrice: tour.originalPrice,
          },
      selectedAddOns,
      selectedAddOnDetails,
      unitPricing: selectedOption && isUnitPricedType(selectedOption.type)
        ? { unitSize: effectiveUnitSize(selectedOption) ?? 0, unitPrice: guestPrices.adult }
        : null,
      priceVersion: priceQuote?.version ?? 0,
      priceSourceVersion: priceQuote?.sourceVersion ?? null,
      priceExecutionId: priceQuote?.executionId ?? null,
      priceOverrideId: priceQuote?.overrideId ?? null,
      priceSource: priceQuote?.source === 'override' ? 'override' : 'catalogue',
    });
    await assertBookable({ ...submitted, quantity: adults, childQuantity: children, infantQuantity: infants }, tenantId);
  }

  subtotal = Number(subtotal.toFixed(2));
  let discount = 0;
  if (discountCode) {
    const record: any = await Discount.findOne({
      tenantId,
      code: String(discountCode).toUpperCase(),
      isActive: true,
    }).lean();
    if (!record || (record.expiresAt && new Date(record.expiresAt) < new Date()) ||
        (record.usageLimit && record.timesUsed >= record.usageLimit)) {
      throw new Error('Invalid discount code');
    }
    discount = record.discountType === 'percentage'
      ? subtotal * Math.min(Number(record.value), 100) / 100
      : Math.min(Number(record.value), subtotal);
  }
  discount = Number(discount.toFixed(2));
  const serviceFee = Number((subtotal * 0.03).toFixed(2));
  const tax = Number((subtotal * 0.05).toFixed(2));
  const total = Number((subtotal + serviceFee + tax - discount).toFixed(2));
  if (!Number.isFinite(total) || total <= 0) throw new Error('Invalid payment amount');

  return { cart, pricing: { subtotal, serviceFee, tax, discount, total } };
}
