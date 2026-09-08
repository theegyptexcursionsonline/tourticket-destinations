import { planBookingOptionKeyRepair, validateBookingOptionKeyRepair, bookingOptionKeyRepairState, bookingOptionKeyRepairUpdate } from '../bookingOptionKeyRepair';
import { preserveBookingOptionPricingKeys } from '../pricingKeys';
const id = '69861281f1598842cc1e5193';
const tenant = 'sharm-excursions-online';
const legacy = [{ label: 'Combo', price: 30, timeSlots: [{ time: '10:00', capacity: 10, price: 35 }] }, { id: 'existing', label: 'Single', price: 20 }];

describe('frozen booking option identity repair', () => {
  it('preserves legacy option aliases, all prices/capacity and creates immutable canonical keys', () => {
    const plan = planBookingOptionKeyRepair(id, tenant, legacy)!;
    expect(plan.after[0]).toMatchObject({ ...legacy[0], id: 'option-0' });
    expect(plan.after[0].pricingKey).toMatch(/^combo-[a-f0-9]{12}$/);
    expect(plan.after[1].id).toBe('existing');
    expect(planBookingOptionKeyRepair(id, tenant, plan.after)).toBeNull();
    const edited = preserveBookingOptionPricingKeys(id, plan.after, [...plan.after].reverse().map(o => ({ ...o, label: 'Renamed' })))!;
    expect(edited.map(o => o.pricingKey)).toEqual([...plan.after].reverse().map(o => o.pricingKey));
  });
  it('writes only missing identity fields and restores exactly absent versus empty', () => {
    const plan = planBookingOptionKeyRepair(id, tenant, [{ id: '', pricingKey: '', label: 'Combo', price: 30 }, legacy[0]])!;
    expect(bookingOptionKeyRepairUpdate(plan)).toEqual({ $set: { 'bookingOptions.0.id': 'option-0', 'bookingOptions.0.pricingKey': plan.after[0].pricingKey, 'bookingOptions.1.id': 'option-1', 'bookingOptions.1.pricingKey': plan.after[1].pricingKey } });
    expect(bookingOptionKeyRepairUpdate(plan, true)).toEqual({ $set: { 'bookingOptions.0.id': '', 'bookingOptions.0.pricingKey': '' }, $unset: { 'bookingOptions.1.id': '', 'bookingOptions.1.pricingKey': '' } });
  });
  it('supports idempotent apply and rollback; refuses edits, reorder and deletions', () => {
    const plan = planBookingOptionKeyRepair(id, tenant, legacy)!;
    expect(bookingOptionKeyRepairState(plan, plan.before)).toBe('ready');
    expect(bookingOptionKeyRepairState(plan, plan.after)).toBe('already-applied');
    expect(bookingOptionKeyRepairState(plan, plan.after, true)).toBe('ready');
    expect(bookingOptionKeyRepairState(plan, plan.before, true)).toBe('already-applied');
    for (const altered of [[...plan.after].reverse(), [], [{ ...plan.after[0], price: 99 }, plan.after[1]]]) {
      expect(() => bookingOptionKeyRepairState(plan, altered, true)).toThrow('concurrent drift');
    }
  });
  it('refuses changed prices and noncanonical keys in a loaded plan', () => {
    const plan = planBookingOptionKeyRepair(id, tenant, legacy)!;
    expect(() => validateBookingOptionKeyRepair({ ...plan, after: [{ ...plan.after[0], price: 99 }, plan.after[1]] })).toThrow('catalogue');
    expect(() => validateBookingOptionKeyRepair({ ...plan, after: [{ ...plan.after[0], pricingKey: 'made-up-key' }, plan.after[1]] })).toThrow('Noncanonical');
  });
  it('does not rekey invalid or duplicate existing identities', () => {
    expect(() => planBookingOptionKeyRepair(id, tenant, [{ id: 'same' }, { id: 'same' }])).toThrow('Duplicate');
    expect(() => planBookingOptionKeyRepair(id, tenant, [{ pricingKey: 'BAD' }])).toThrow('Invalid');
    expect(() => planBookingOptionKeyRepair(id, tenant, [{ id: 'a', pricingKey: 'same-key' }, { id: 'b', pricingKey: 'same-key' }])).toThrow('Duplicate');
  });
  it('requires an exact tour and tenant and preserves a legacy Mongo identity', () => {
    expect(() => planBookingOptionKeyRepair('bad', tenant, legacy)).toThrow('target');
    expect(() => planBookingOptionKeyRepair(id, '', legacy)).toThrow('target');
    const plan = planBookingOptionKeyRepair(id, tenant, [{ _id: 'legacy-mongo-id', label: 'Legacy' }])!;
    expect(plan.after[0].id).toBe('legacy-mongo-id');
  });
});
