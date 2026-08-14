type BookingOptionWithClientKey = {
  pricingKey?: unknown;
  clientKey?: unknown;
  id?: unknown;
  _id?: unknown;
};

type AddOnWithAssignments = Record<string, unknown> & { bookingOptionKeys?: unknown };

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

export function finalizeAddOnAssignments(
  addOns: unknown,
  bookingOptions: BookingOptionWithClientKey[],
): AddOnWithAssignments[] {
  if (!Array.isArray(addOns)) return [];
  const durableKeys = new Set(bookingOptions.map((option) => text(option.pricingKey) || text(option.id) || text(option._id)).filter(Boolean) as string[]);
  const aliases = new Map<string, string>();
  for (const option of bookingOptions) {
    const durable = text(option.pricingKey) || text(option.id) || text(option._id);
    if (!durable) continue;
    for (const alias of [option.pricingKey, option.clientKey, option.id, option._id]) {
      const normalized = text(alias);
      if (normalized) aliases.set(normalized, durable);
    }
  }
  return addOns
    .filter((addOn): addOn is AddOnWithAssignments => Boolean(addOn && typeof addOn === 'object'))
    .map((addOn) => {
      const requested = Array.isArray(addOn.bookingOptionKeys) ? addOn.bookingOptionKeys : [];
      const resolved = Array.from(new Set(requested
        .map((value) => aliases.get(text(value) || ''))
        .filter((value): value is string => Boolean(value && durableKeys.has(value)))));
      return { ...addOn, bookingOptionKeys: resolved };
    });
}

export function stripBookingOptionClientKeys<T extends BookingOptionWithClientKey>(options: T[]): Array<Omit<T, 'clientKey'>> {
  return options.map(({ clientKey: _clientKey, ...option }) => option);
}
