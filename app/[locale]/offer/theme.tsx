'use client';

import { useEffect } from 'react';
import { STOREFRONT_THEME_STORAGE_KEY } from '@/lib/storefrontTheme';

/**
 * Offer pages are art-directed with fixed per-city palettes (light paper,
 * dark ink heroes) set as inline styles, so the storefront's dark-utility
 * remap turns them into a light/dark patchwork (client report, 14/08).
 * The route pins its designed look; leaving it restores the visitor's theme.
 */
export default function OfferThemePin() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.storefrontTheme = 'light';
    root.style.colorScheme = 'light';
    return () => {
      try {
        const saved = localStorage.getItem(STOREFRONT_THEME_STORAGE_KEY);
        const dark =
          saved === 'dark' ||
          (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        root.dataset.storefrontTheme = dark ? 'dark' : 'light';
        root.style.colorScheme = dark ? 'dark' : 'light';
      } catch {
        root.dataset.storefrontTheme = 'light';
        root.style.colorScheme = 'light';
      }
    };
  }, []);
  return null;
}
