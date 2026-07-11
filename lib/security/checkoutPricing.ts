import Discount from '@/lib/models/Discount';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery } from '@/lib/tenant';

type CartItem = Record<string, any>;

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
