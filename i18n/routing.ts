import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ar', 'ru', 'de'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];

export const RTL_LOCALES: Locale[] = ['ar'];

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.includes(locale as Locale);
}
