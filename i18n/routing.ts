import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale, rtlLocales } from './config';

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'as-needed',
});

export type { Locale } from './config';

export const RTL_LOCALES = rtlLocales;

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.includes(locale as any);
}
