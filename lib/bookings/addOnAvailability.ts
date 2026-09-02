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

/**
 * Group add-ons the way the editor authored them: by `groupKey`, in first-seen
 * order, carrying the optional group title. Add-ons saved before grouping
 * existed (no key) collect under a single "ungrouped" group so legacy tours
 * still render every extra.
 */
export function groupAvailableAddOns<T extends AssignedAddOn & { groupKey?: string; groupTitle?: string }>(
  addOns: T[],
): Array<{ key: string; title: string; addOns: T[] }> {
  const groups = new Map<string, { key: string; title: string; addOns: T[] }>();

  addOns.forEach((addOn) => {
    const key = addOn.groupKey?.trim() || 'ungrouped';
    const group = groups.get(key) || {
      key,
      title: addOn.groupTitle?.trim() || '',
      addOns: [],
    };
    group.addOns.push(addOn);
    groups.set(key, group);
  });

  return Array.from(groups.values());
}
