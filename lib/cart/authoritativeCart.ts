export type PriceSource = 'catalogue' | 'override';

export interface AuthoritativePriceQuote {
  tourId: string;
  tourTitle?: string;
  optionKey: string;
  date: string;
  time: string;
  currency: string;
  prices: {
    adult: number;
    child: number;
    infant: number;
  };
  version: number;
  sourceVersion?: string | null;
  executionId?: string | null;
  overrideId?: string | null;
  source?: PriceSource;
}

export interface StoredCartPricingFields {
  infantQuantity: number;
  selectedBookingOption?: {
    id?: string;
    pricingKey?: string;
    title?: string;
    type?: string;
    price?: number;
    originalPrice?: number;
    duration?: string;
    badge?: string;
  };
  guestPrices?: {
    adult: number;
    child: number;
    infant: number;
  };
  priceVersion?: number;
  priceSourceVersion?: string | null;
  priceExecutionId?: string | null;
  priceOverrideId?: string | null;
  priceSource?: PriceSource;
}

type CartQuoteTarget = {
  _id?: unknown;
  id?: unknown;
  selectedDate?: unknown;
  selectedTime?: unknown;
  selectedBookingOption?: {
    id?: unknown;
    pricingKey?: unknown;
    title?: unknown;
  };
};

function finiteNonNegative(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return optionalString(value);
}

export function normalizeStoredCartPricingFields(input: unknown): StoredCartPricingFields {
  const item = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const rawOption = item.selectedBookingOption && typeof item.selectedBookingOption === 'object'
    ? item.selectedBookingOption as Record<string, unknown>
    : null;
  const rawGuestPrices = item.guestPrices && typeof item.guestPrices === 'object'
    ? item.guestPrices as Record<string, unknown>
    : null;
  const infantQuantity = finiteNonNegative(item.infantQuantity);
  const version = finiteNonNegative(item.priceVersion);
  const optionPrice = finiteNonNegative(rawOption?.price);
  const optionOriginalPrice = finiteNonNegative(rawOption?.originalPrice);
  const adult = finiteNonNegative(rawGuestPrices?.adult);
  const child = finiteNonNegative(rawGuestPrices?.child);
  const infant = finiteNonNegative(rawGuestPrices?.infant);
  const source = item.priceSource === 'override' || item.priceSource === 'catalogue'
    ? item.priceSource
    : undefined;

  const selectedBookingOption = rawOption ? {
    id: optionalString(rawOption.id),
    pricingKey: optionalString(rawOption.pricingKey),
    title: optionalString(rawOption.title),
    type: optionalString(rawOption.type),
    price: optionPrice,
    originalPrice: optionOriginalPrice,
    duration: optionalString(rawOption.duration),
    badge: optionalString(rawOption.badge),
  } : undefined;

  return {
    infantQuantity: infantQuantity === undefined ? 0 : Math.min(50, Math.floor(infantQuantity)),
    selectedBookingOption: selectedBookingOption && Object.values(selectedBookingOption).some((value) => value !== undefined)
      ? selectedBookingOption
      : undefined,
    guestPrices: adult !== undefined && child !== undefined && infant !== undefined
      ? { adult, child, infant }
      : undefined,
    priceVersion: version === undefined ? undefined : Math.floor(version),
    priceSourceVersion: nullableString(item.priceSourceVersion),
    priceExecutionId: nullableString(item.priceExecutionId),
    priceOverrideId: nullableString(item.priceOverrideId),
    priceSource: source,
  };
}

export function isAuthoritativePriceQuote(value: unknown): value is AuthoritativePriceQuote {
  if (!value || typeof value !== 'object') return false;
  const quote = value as Record<string, unknown>;
  const prices = quote.prices && typeof quote.prices === 'object'
    ? quote.prices as Record<string, unknown>
    : null;
  const version = finiteNonNegative(quote.version);

  return Boolean(
    optionalString(quote.tourId)
    && optionalString(quote.optionKey)
    && /^\d{4}-\d{2}-\d{2}$/.test(String(quote.date || ''))
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(String(quote.time || ''))
    && /^[A-Z]{3}$/.test(String(quote.currency || ''))
    && finiteNonNegative(prices?.adult) !== undefined
    && finiteNonNegative(prices?.child) !== undefined
    && finiteNonNegative(prices?.infant) !== undefined
    && version !== undefined
    && Number.isInteger(version)
    && (quote.source === undefined || quote.source === 'catalogue' || quote.source === 'override')
  );
}

function optionKeyForCartItem(item: CartQuoteTarget): string {
  const pricingKey = optionalString(item.selectedBookingOption?.pricingKey);
  if (pricingKey) return pricingKey;
  return item.selectedBookingOption?.id === 'standard-default'
    || item.selectedBookingOption?.id === 'standard-tour'
    || !item.selectedBookingOption?.id
    ? 'standard'
    : '';
}

export function replaceCartPriceQuote<T extends CartQuoteTarget>(
  cart: T[],
  quote: AuthoritativePriceQuote,
): { cart: T[]; replacements: number } {
  let replacements = 0;
  const nextCart = cart.map((item) => {
    const tourId = String(item._id || item.id || '');
    const date = String(item.selectedDate || '').slice(0, 10);
    const time = String(item.selectedTime || '');
    if (
      tourId !== quote.tourId
      || date !== quote.date
      || time !== quote.time
      || optionKeyForCartItem(item) !== quote.optionKey
    ) {
      return item;
    }

    replacements += 1;
    const existingOption = item.selectedBookingOption || {};
    return {
      ...item,
      price: quote.prices.adult,
      discountPrice: quote.prices.adult,
      guestPrices: { ...quote.prices },
      priceVersion: quote.version,
      priceSourceVersion: quote.sourceVersion ?? null,
      priceExecutionId: quote.executionId ?? null,
      priceOverrideId: quote.overrideId ?? null,
      priceSource: quote.source === 'override' ? 'override' : 'catalogue',
      selectedBookingOption: {
        ...existingOption,
        id: existingOption.id || (quote.optionKey === 'standard' ? 'standard-default' : quote.optionKey),
        pricingKey: quote.optionKey,
        title: existingOption.title || quote.tourTitle || 'Selected experience',
        price: quote.prices.adult,
      },
    } as T;
  });

  return { cart: nextCart, replacements };
}
