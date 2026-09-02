import { finalizeAddOnAssignments, stripBookingOptionClientKeys } from '@/lib/admin/addOnAssignments';

describe('finalizeAddOnAssignments', () => {
  const options = [
    { clientKey: 'draft-one', id: 'option-one', label: 'Standard' },
    { clientKey: 'draft-two', id: 'option-two', label: 'Private' },
  ];

  it('converts draft aliases to durable option ids and drops stale targets', () => {
    expect(finalizeAddOnAssignments([{ name: 'Lunch', bookingOptionKeys: ['draft-two', 'deleted-option'] }], options)).toEqual([
      { name: 'Lunch', bookingOptionKeys: ['option-two'] },
    ]);
  });

  it('preserves the empty-list all-options contract', () => {
    expect(finalizeAddOnAssignments([{ name: 'Photos' }], options)[0].bookingOptionKeys).toEqual([]);
  });

  it('persists and resolves the stable pricing key used by the storefront', () => {
    const optionsWithPricingKeys = [{ clientKey: 'draft-private', id: 'option-private', pricingKey: 'private-v2' }];
    expect(finalizeAddOnAssignments(
      [{ name: 'Private transfer', bookingOptionKeys: ['draft-private'] }],
      optionsWithPricingKeys,
    )).toEqual([{ name: 'Private transfer', bookingOptionKeys: ['private-v2'] }]);
  });

  it('never persists editor-only client identities', () => {
    expect(stripBookingOptionClientKeys(options)).toEqual([
      { id: 'option-one', label: 'Standard' },
      { id: 'option-two', label: 'Private' },
    ]);
  });
});
