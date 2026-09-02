const MAX_GUEST_PRICE = 999_999;

const isBlank = (value: unknown) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

function amountError(value: unknown, field: string): string | null {
  if (typeof value !== 'number' && typeof value !== 'string') return `${field} must be a valid price.`;
  if (typeof value === 'string' && value.trim() === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_GUEST_PRICE) {
    return `${field} must be between 0 and ${MAX_GUEST_PRICE}.`;
  }
  return null;
}

function completeSetError(value: unknown, field: string): string | null {
  if (isBlank(value)) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return `${field} must be a price object.`;
  const prices = value as Record<string, unknown>;
  const childBlank = isBlank(prices.child);
  const infantBlank = isBlank(prices.infant);
  if (childBlank && infantBlank) return null; // explicit clear
  if (childBlank !== infantBlank) return `${field} requires both child and infant prices, or both blank to clear.`;
  return amountError(prices.child, `${field} child price`)
    ?? amountError(prices.infant, `${field} infant price`);
}

function slotSetError(value: unknown, field: string): string | null {
  if (isBlank(value)) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return `${field} must be a price object.`;
  const prices = value as Record<string, unknown>;
  for (const guest of ['child', 'infant'] as const) {
    if (isBlank(prices[guest])) continue; // slot fields independently inherit
    const error = amountError(prices[guest], `${field} ${guest} price`);
    if (error) return error;
  }
  return null;
}

/** Return the first malformed guest-price field in an admin tour payload. */
export function guestPricePayloadError(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const payload = body as Record<string, unknown>;

  if ('revenueGuestPrices' in payload) {
    const error = completeSetError(payload.revenueGuestPrices, 'Tour guest prices');
    if (error) return error;
  }

  const availability = payload.availability;
  if (availability && typeof availability === 'object' && !Array.isArray(availability)) {
    const slots = (availability as { slots?: unknown }).slots;
    if (Array.isArray(slots)) {
      for (const [index, slot] of slots.entries()) {
        if (!slot || typeof slot !== 'object') continue;
        if (!('guestPrices' in slot)) continue;
        const error = slotSetError((slot as Record<string, unknown>).guestPrices, `Tour departure ${index + 1}`);
        if (error) return error;
      }
    }
  }

  if (Array.isArray(payload.bookingOptions)) {
    for (const [optionIndex, option] of payload.bookingOptions.entries()) {
      if (!option || typeof option !== 'object') continue;
      const optionRecord = option as Record<string, unknown>;
      if ('guestPrices' in optionRecord) {
        const error = completeSetError(optionRecord.guestPrices, `Booking option ${optionIndex + 1} guest prices`);
        if (error) return error;
      }
      if (!Array.isArray(optionRecord.timeSlots)) continue;
      for (const [slotIndex, slot] of optionRecord.timeSlots.entries()) {
        if (!slot || typeof slot !== 'object' || !('guestPrices' in slot)) continue;
        const error = slotSetError(
          (slot as Record<string, unknown>).guestPrices,
          `Booking option ${optionIndex + 1} departure ${slotIndex + 1}`,
        );
        if (error) return error;
      }
    }
  }

  return null;
}
