export type AssignedAddOn = { bookingOptionKeys?: unknown };

export function normalizedBookingOptionKeys(addOn: AssignedAddOn): string[] {
  if (!Array.isArray(addOn.bookingOptionKeys)) return [];
  return Array.from(new Set(addOn.bookingOptionKeys
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)));
}

export function isAddOnAvailableForOption(addOn: AssignedAddOn, optionKey?: string | null): boolean {
  const keys = normalizedBookingOptionKeys(addOn);
  if (keys.length === 0) return true;
  return Boolean(optionKey && keys.includes(optionKey));
}
