export type AddOnPricingMethod = 'per_unit' | 'per_person';

type AddOnLike = {
  pricingMethod?: string | null;
  perGuest?: boolean | null;
  category?: string | null;
};

/** Resolve pricing while keeping legacy add-ons backwards compatible. */
export function isPerPersonAddOn(addOn: AddOnLike): boolean {
  if (addOn.pricingMethod === 'per_person') return true;
  if (addOn.pricingMethod === 'per_unit') return false;
  if (typeof addOn.perGuest === 'boolean') return addOn.perGuest;
  return addOn.category === 'Food';
}

export function resolveAddOnPricingMethod(addOn: AddOnLike): AddOnPricingMethod {
  return isPerPersonAddOn(addOn) ? 'per_person' : 'per_unit';
}
