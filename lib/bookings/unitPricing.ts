/**
 * Unit-priced booking options (Per Couple / Per Family / Per Group).
 *
 * The option's price covers a WHOLE unit, never one participant. The unit
 * size comes from the option's configured `minCapacity` (client decision,
 * sheet 2026-08-20): Per Couple defaults to 2, Per Family to 4, Per Group
 * has no default and must be authored. "Total participants" means adults +
 * children + infants — the client's rules gate availability and step-up on
 * the total number of entered participants.
 *
 * Step-up: participants are charged in whole units, rounded UP — with a
 * couple option (unit 2) three participants are charged as two couples.
 *
 * Legacy data: a unit-typed option saved before capacities existed has no
 * `minCapacity`. Couple/Family inherit their type default; a legacy Per
 * Group option prices as ONE group for the whole booking (bounded only by
 * an authored `maxCapacity`) — that matches what its operator sold, and is
 * the fix for the live defect where a group price was multiplied per guest.
 */

export type UnitCapacityOption = {
  type?: string | null;
  minCapacity?: number | null;
  maxCapacity?: number | null;
};

export type UnitPricing = { unitSize: number; unitPrice: number };

const TYPE_DEFAULT_MIN: Record<string, number | null> = {
  'per person': 1,
  'per couple': 2,
  'per family': 4,
  'per group': null,
};

const UNIT_NOUNS: Record<string, [string, string]> = {
  'per couple': ['couple', 'couples'],
  'per family': ['family', 'families'],
  'per group': ['group', 'groups'],
};

const normalizedType = (type?: string | null) => String(type || '').trim().toLowerCase();

const positiveInteger = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
};

/** Unit-typed options price per couple/family/group; everything else is per guest. */
export function isUnitPricedType(type?: string | null): boolean {
  return normalizedType(type) in UNIT_NOUNS;
}

/** The capacity the Tour Editor pre-fills when the operator picks a type. */
export function defaultMinCapacity(type?: string | null): number | null {
  const key = normalizedType(type);
  // ?? would collapse Per Group's deliberate null ("no default — must be
  // authored") into 1, so the key lookup must stay explicit.
  if (key in TYPE_DEFAULT_MIN) return TYPE_DEFAULT_MIN[key];
  return 1;
}

/** Whether the editor and API must refuse to save without a minimum capacity. */
export function minCapacityRequired(type?: string | null): boolean {
  return isUnitPricedType(type);
}

/**
 * The minimum participants required to book the option, or null when the
 * option has no minimum (per-person, or a legacy group with no capacity).
 */
export function effectiveMinCapacity(option: UnitCapacityOption): number | null {
  const authored = positiveInteger(option.minCapacity);
  if (authored !== null) return authored;
  if (!isUnitPricedType(option.type)) return null;
  return TYPE_DEFAULT_MIN[normalizedType(option.type)];
}

/** The authored per-booking participant cap, or null when uncapped. */
export function effectiveMaxCapacity(option: UnitCapacityOption): number | null {
  return positiveInteger(option.maxCapacity);
}

/**
 * How many participants one priced unit covers, or null when the option is
 * charged per guest. A legacy Per Group option (no capacity) returns null
 * from here but IS unit-priced — callers use unitCount, which charges it
 * as a single group.
 */
export function effectiveUnitSize(option: UnitCapacityOption): number | null {
  if (!isUnitPricedType(option.type)) return null;
  return effectiveMinCapacity(option);
}

/** Whole units to charge for a participant count, rounded up, never below 1. */
export function unitCount(totalParticipants: number, unitSize: number | null): number {
  const participants = Number.isFinite(totalParticipants) ? Math.max(1, Math.floor(totalParticipants)) : 1;
  if (!unitSize || unitSize < 1) return 1;
  return Math.max(1, Math.ceil(participants / unitSize));
}

export type CapacityAvailability =
  | { available: true }
  | { available: false; reason: 'below_minimum' | 'above_maximum'; limit: number };

/**
 * The client's checkout gates: an option stays disabled until participants
 * reach its minimum, and disables again past its maximum.
 */
export function capacityAvailability(
  option: UnitCapacityOption,
  totalParticipants: number,
): CapacityAvailability {
  const participants = Number.isFinite(totalParticipants) ? Math.floor(totalParticipants) : 0;
  const min = effectiveMinCapacity(option);
  if (min !== null && min > 1 && participants < min) {
    return { available: false, reason: 'below_minimum', limit: min };
  }
  const max = effectiveMaxCapacity(option);
  if (max !== null && participants > max) {
    return { available: false, reason: 'above_maximum', limit: max };
  }
  return { available: true };
}

/** Customer-facing copy for a capacity-blocked option. */
export function capacityBlockedMessage(availability: CapacityAvailability): string | null {
  if (availability.available) return null;
  if (availability.reason === 'below_minimum') {
    return `Requires at least ${availability.limit} participant${availability.limit === 1 ? '' : 's'}`;
  }
  return `Available for up to ${availability.limit} participant${availability.limit === 1 ? '' : 's'}`;
}

/** "2 couples", "1 family", "3 groups" — for price breakdowns. */
export function unitCountLabel(type: string | null | undefined, units: number): string {
  const nouns = UNIT_NOUNS[normalizedType(type)];
  if (!nouns) return `${units} unit${units === 1 ? '' : 's'}`;
  return `${units} ${units === 1 ? nouns[0] : nouns[1]}`;
}

/**
 * The pricing record checkout carries for a unit-priced option: how many
 * participants one unit covers (null unit size means "one unit covers the
 * whole booking" — the legacy group contract) and the price of one unit.
 */
export function unitPricingForOption(
  option: UnitCapacityOption,
  unitPrice: number,
): (UnitPricing & { wholeBooking?: boolean }) | null {
  if (!isUnitPricedType(option.type)) return null;
  const unitSize = effectiveUnitSize(option);
  if (unitSize === null) {
    return { unitSize: 0, unitPrice, wholeBooking: true };
  }
  return { unitSize, unitPrice };
}
