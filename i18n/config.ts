export const locales = ['en', 'ar', 'es', 'fr', 'ru', 'de'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const rtlLocales: Locale[] = ['ar'];

export function isRTL(locale: string): boolean {
  return rtlLocales.includes(locale as Locale);
}
