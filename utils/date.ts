// utils/date.ts
// Shared date helpers to keep booking dates consistent across client and server

export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value: number): string => value.toString().padStart(2, '0');

/**
 * Turn a Date object into a YYYY-MM-DD string without any timezone shift.
 */
export const toDateOnlyString = (date: Date): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  return `${year}-${month}-${day}`;
};

/**
 * Ensure any supported date input is converted into a YYYY-MM-DD string.
 */
export const ensureDateOnlyString = (value?: string | Date | null): string => {
  if (!value) return '';

  if (typeof value === 'string' && DATE_ONLY_REGEX.test(value)) {
    return value;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (isNaN(parsed.getTime())) return '';

  return toDateOnlyString(parsed);
};

/**
 * Parse a stored date string as a local date to avoid timezone drift.
 */
export const parseLocalDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (DATE_ONLY_REGEX.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Convenience formatter that respects locale + options while using parseLocalDate.
 */
export const formatDisplayDate = (
  value?: string | Date | null,
  options?: Intl.DateTimeFormatOptions,
  locale = 'en-US'
): string => {
  const date = parseLocalDate(value);
  if (!date) return '';

  return date.toLocaleDateString(
    locale,
    options ?? {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
  );
};


