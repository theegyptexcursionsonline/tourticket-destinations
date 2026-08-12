export type StorefrontTheme = 'light' | 'dark';

export const STOREFRONT_THEME_STORAGE_KEY = 'eeo-storefront-theme';

export function isStorefrontTheme(value: unknown): value is StorefrontTheme {
  return value === 'light' || value === 'dark';
}

export function resolveStorefrontTheme(savedTheme: unknown, systemPrefersDark: boolean): StorefrontTheme {
  return isStorefrontTheme(savedTheme) ? savedTheme : systemPrefersDark ? 'dark' : 'light';
}

export const STOREFRONT_THEME_BOOTSTRAP = `(function(){try{var k='${STOREFRONT_THEME_STORAGE_KEY}';var s=localStorage.getItem(k);var d=s==='dark'||(s!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.storefrontTheme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.dataset.storefrontTheme='light';document.documentElement.style.colorScheme='light';}})();`;
