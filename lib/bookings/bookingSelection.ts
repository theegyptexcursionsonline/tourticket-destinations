export interface OptionBoundTimeSlot {
  id: string;
  optionId?: string;
}

export interface BookingOptionWithSlots<TSlot extends OptionBoundTimeSlot = OptionBoundTimeSlot> {
  id: string;
  timeSlots?: TSlot[];
}

export function bindTimeSlotsToOption<TSlot extends OptionBoundTimeSlot>(
  optionId: string,
  timeSlots: TSlot[],
): Array<TSlot & { optionId: string }> {
  return timeSlots.map((slot) => ({ ...slot, optionId }));
}

export function isSelectedTimeSlot(
  selected: OptionBoundTimeSlot | null | undefined,
  optionId: string,
  slotId: string,
): boolean {
  if (!selected) return false;
  return selected.optionId === optionId && selected.id === slotId;
}

export function findSelectedBookingOption<
  TSlot extends OptionBoundTimeSlot,
  TOption extends BookingOptionWithSlots<TSlot>,
>(options: TOption[] | null | undefined, selected: TSlot | null | undefined): TOption | undefined {
  if (!selected || !options) return undefined;
  if (selected.optionId) return options.find((option) => option.id === selected.optionId);
  return options.find((option) => option.timeSlots?.some((slot) => slot.id === selected.id));
}

export function nextAddOnSelectionQuantity(currentQuantity: number): number {
  return currentQuantity > 0 ? 0 : 1;
}

/**
 * Highest number of units a guest may add of a per-person add-on: one per
 * paying participant (adults + children). Per-unit add-ons are governed by
 * their own maxQuantity. Client sheet (EEO 24 Aug / MT 31 Aug): a per-person
 * add-on must be chosen 1..N by the guest, never auto-multiplied.
 */
export function perPersonAddOnLimit(adults: number, children: number): number {
  const paying = Math.max(0, Math.floor(Number(adults) || 0)) + Math.max(0, Math.floor(Number(children) || 0));
  return paying;
}

/** Clamp a requested add-on quantity into [1, limit], or zero when nobody can consume it. */
export function clampAddOnQuantity(requested: number, limit: number): number {
  const normalizedLimit = Math.max(0, Math.floor(Number(limit) || 0));
  if (normalizedLimit === 0) return 0;
  const q = Math.floor(Number(requested));
  if (!Number.isFinite(q) || q < 1) return 1;
  return Math.min(q, normalizedLimit);
}

/** Authoritative selectable units for either add-on pricing method. */
export function addOnQuantityLimit(
  addOn: { perGuest?: boolean; maxQuantity?: number },
  adults: number,
  children: number,
): number {
  const authored = Number.isInteger(addOn.maxQuantity) && Number(addOn.maxQuantity) > 0
    ? Math.min(50, Number(addOn.maxQuantity))
    : undefined;
  if (!addOn.perGuest) return authored ?? 1;
  const paying = perPersonAddOnLimit(adults, children);
  return Math.min(paying, authored ?? paying);
}

/** Keep every selected quantity inside its authored and participant ceiling. */
export function clampSelectedAddOnQuantities(
  selected: Record<string, number>,
  addOns: Array<{ id: string; perGuest?: boolean; maxQuantity?: number }>,
  adults: number,
  children: number,
): Record<string, number> {
  const catalogue = new Map(addOns.map((addOn) => [addOn.id, addOn]));
  return Object.fromEntries(Object.entries(selected).map(([id, quantity]) => {
    const addOn = catalogue.get(id);
    if (!addOn || Number(quantity) <= 0) return [id, quantity];
    return [id, clampAddOnQuantity(quantity, addOnQuantityLimit(addOn, adults, children))];
  }).filter(([, quantity]) => Number(quantity) > 0));
}

/**
 * Reconcile per-person add-on quantities after the paying party changes.
 * Per-unit add-ons retain their catalogue-governed quantities.
 */
export function clampSelectedPerPersonAddOns(
  selected: Record<string, number>,
  addOns: Array<{ id: string; perGuest?: boolean }>,
  adults: number,
  children: number,
): Record<string, number> {
  return clampSelectedAddOnQuantities(selected, addOns, adults, children);
}
