import Discount from '@/lib/models/Discount';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery } from '@/lib/tenant';
import Availability from '@/lib/models/Availability';
import StopSale from '@/lib/models/StopSale';
import { createHash, createHmac } from 'crypto';

type CartItem = Record<string, any>;

export function checkoutFingerprint(cart: CartItem[], tenantId: string, currency: string): string {
  const canonical = cart.map((item) => ({
    tour: String(item._id || item.id),
    date: String(item.selectedDate || ''),
    time: String(item.selectedTime || '10:00'),
    adults: Number(item.quantity || 0),
    children: Number(item.childQuantity || 0),
    infants: Number(item.infantQuantity || 0),
    option: String(item.selectedBookingOption?.id || ''),
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
      buildStrictTenantQuery({ _id: id, isPublished: true }, tenantId),
    ).lean();
    if (!tour) throw new Error('Tour not found');

    const adults = count(submitted.quantity, 1);
    const children = count(submitted.childQuantity);
    const infants = count(submitted.infantQuantity);
    if (adults + children + infants < 1) throw new Error('At least one participant is required');

    let selectedOption: any;
    let basePrice = Number(tour.discountPrice ?? tour.price ?? 0);
    const optionId = submitted.selectedBookingOption?.id;
    if (optionId) {
      selectedOption = (tour.bookingOptions || []).find(
        (option: any, index: number) => String(option.id || `option-${index}`) === String(optionId),
      );
      if (!selectedOption) throw new Error('Invalid booking option');
      basePrice = Number(selectedOption.price);
    }
    if (!Number.isFinite(basePrice) || basePrice < 0) throw new Error('Invalid tour price');

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
      const price = Number(stored?.price ?? fallback.price);
      const perGuest = stored ? stored.category === 'Food' : fallback.perGuest;
      const title = stored?.name ?? fallback.title;
      if (!Number.isFinite(price) || price < 0) throw new Error('Invalid add-on price');
      const billedQuantity = perGuest ? adults + children : requestedQuantity;
      addOnsTotal += price * billedQuantity;
      selectedAddOns[addOnId] = requestedQuantity;
      selectedAddOnDetails[addOnId] = { title, price, perGuest };
    }

    const itemSubtotal = basePrice * adults + (basePrice / 2) * children + addOnsTotal;
    subtotal += itemSubtotal;
    cart.push({
      ...submitted,
      title: tour.title,
      price: basePrice,
      discountPrice: basePrice,
      quantity: adults,
      childQuantity: children,
      infantQuantity: infants,
      selectedBookingOption: selectedOption
        ? { ...submitted.selectedBookingOption, id: optionId, title: selectedOption.label, price: basePrice }
        : undefined,
      selectedAddOns,
      selectedAddOnDetails,
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
