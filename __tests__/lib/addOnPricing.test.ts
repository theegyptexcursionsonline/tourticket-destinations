import { isPerPersonAddOn, resolveAddOnPricingMethod } from '@/lib/checkout/addOnPricing';

describe('add-on pricing method resolution', () => {
  it('keeps the legacy Food-category behavior for old records', () => {
    expect(isPerPersonAddOn({ category: 'Food' })).toBe(true);
    expect(resolveAddOnPricingMethod({ category: 'Food' })).toBe('per_person');
  });

  it('allows an explicit per-unit Food add-on', () => {
    expect(isPerPersonAddOn({ category: 'Food', pricingMethod: 'per_unit' })).toBe(false);
  });

  it('allows an explicit per-person add-on in any category', () => {
    expect(isPerPersonAddOn({ category: 'Experience', pricingMethod: 'per_person' })).toBe(true);
  });
});
