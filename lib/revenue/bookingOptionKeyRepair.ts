import { isDeepStrictEqual } from 'node:util';
import { pricingKeyFor } from './pricingKeys';

type Option = Record<string, unknown> & { id?: string; _id?: unknown; pricingKey?: string; label?: string; type?: string };
export type OptionKeyRepair = {
  tourId: string;
  tenantId: string;
  before: Option[];
  after: Option[];
};
const validKey = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{2,79}$/.test(value);

/** A frozen repair changes identity fields only; catalogue prices and schedules are untouched. */
export function planBookingOptionKeyRepair(tourId: string, tenantId: string, options: Option[]): OptionKeyRepair | null {
  if (!/^[a-f0-9]{24}$/i.test(tourId) || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(tenantId)) throw new Error('Invalid repair target');
  const seenKeys = new Set<string>();
  const seenIds = new Set<string>();
  const after = options.map((option, index) => {
    if (!option || typeof option !== 'object') throw new Error('Invalid booking option');
    if (option.pricingKey && !validKey(option.pricingKey)) throw new Error('Invalid existing pricing key');
    const id = typeof option.id === 'string' && option.id.trim() ? option.id : String(option._id || `option-${index}`);
    if (seenIds.has(id)) throw new Error('Duplicate option identity');
    seenIds.add(id);
    const pricingKey = option.pricingKey || pricingKeyFor(tourId, { ...option, id });
    if (seenKeys.has(pricingKey)) throw new Error('Duplicate pricing key');
    seenKeys.add(pricingKey);
    return { ...option, id, pricingKey };
  });
  return isDeepStrictEqual(options, after) ? null : { tourId, tenantId, before: options, after };
}

/** Validate frozen files before executing any write, including rollback. */
export function validateBookingOptionKeyRepair(plan: OptionKeyRepair) {
  if (!/^[a-f0-9]{24}$/i.test(plan.tourId) || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(plan.tenantId)) throw new Error('Invalid repair target');
  if (!Array.isArray(plan.before) || !Array.isArray(plan.after) || plan.before.length !== plan.after.length) throw new Error('Option shape changed');
  const ids = new Set<string>();
  const keys = new Set<string>();
  plan.before.forEach((before, index) => {
    const after = plan.after[index];
    const { id: beforeId, pricingKey: beforeKey, ...beforeRest } = before;
    const { id: afterId, pricingKey: afterKey, ...afterRest } = after;
    if (!isDeepStrictEqual(beforeRest, afterRest)) throw new Error('Repair changes catalogue fields');
    if (!afterId || !validKey(afterKey) || (beforeId && beforeId !== afterId) || (beforeKey && beforeKey !== afterKey)) throw new Error('Repair changes existing identity');
    if (!beforeKey && afterKey !== pricingKeyFor(plan.tourId, { ...after, id: afterId })) throw new Error('Noncanonical repair key');
    if (!beforeId && afterId !== String(before._id || `option-${index}`)) throw new Error('Legacy option alias changed');
    if (ids.has(afterId) || keys.has(afterKey)) throw new Error('Duplicate repair identity');
    ids.add(afterId); keys.add(afterKey);
  });
}

export function bookingOptionKeyRepairUpdate(plan: OptionKeyRepair, rollback = false) {
  validateBookingOptionKeyRepair(plan);
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ''> = {};
  plan.before.forEach((before, index) => {
    for (const field of ['id', 'pricingKey'] as const) {
      if (isDeepStrictEqual(before[field], plan.after[index][field])) continue;
      const path = `bookingOptions.${index}.${field}`;
      if (!rollback) $set[path] = plan.after[index][field];
      else if (Object.prototype.hasOwnProperty.call(before, field)) $set[path] = before[field];
      else $unset[path] = '';
    }
  });
  return { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) };
}

export function bookingOptionKeyRepairState(plan: OptionKeyRepair, current: unknown, rollback = false) {
  validateBookingOptionKeyRepair(plan);
  if (isDeepStrictEqual(current, rollback ? plan.before : plan.after)) return 'already-applied' as const;
  if (isDeepStrictEqual(current, rollback ? plan.after : plan.before)) return 'ready' as const;
  throw new Error('Booking options changed since the frozen repair; refusing concurrent drift');
}
