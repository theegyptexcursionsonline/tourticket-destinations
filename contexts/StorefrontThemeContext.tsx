'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isStorefrontTheme, resolveStorefrontTheme, STOREFRONT_THEME_STORAGE_KEY, type StorefrontTheme } from '@/lib/storefrontTheme';

interface StorefrontThemeContextValue {
  mounted: boolean;
  resolvedTheme: StorefrontTheme;
  setTheme: (theme: StorefrontTheme) => void;
  toggleTheme: () => void;
}

const FALLBACK_THEME_CONTEXT: StorefrontThemeContextValue = {
  mounted: false,
  resolvedTheme: 'light',
  setTheme: () => undefined,
  toggleTheme: () => undefined,
};

const StorefrontThemeContext = createContext<StorefrontThemeContextValue>(FALLBACK_THEME_CONTEXT);

function applyTheme(theme: StorefrontTheme): void {
  const root = document.documentElement;
  // An art-directed route (the planner offer pages) may pin its designed
  // palette via data-storefront-theme-pin; the pin wins over saved/system
  // preference until that route unmounts. resolvedTheme state still tracks
  // the visitor's real preference so the rest of the app is unaffected.
  const pinned = root.dataset.storefrontThemePin;
  const next = isStorefrontTheme(pinned) ? pinned : theme;
  root.dataset.storefrontTheme = next;
  root.style.colorScheme = next;
}

export function StorefrontThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<StorefrontTheme>('light');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const savedTheme = window.localStorage.getItem(STOREFRONT_THEME_STORAGE_KEY);
    const initialTheme = resolveStorefrontTheme(savedTheme, media.matches);
    applyTheme(initialTheme);
    const mountFrame = window.requestAnimationFrame(() => {
      setResolvedTheme(initialTheme);
      setMounted(true);
    });
    const onSystemThemeChange = (event: MediaQueryListEvent) => {
      const currentSavedTheme = window.localStorage.getItem(STOREFRONT_THEME_STORAGE_KEY);
      if (!isStorefrontTheme(currentSavedTheme)) {
        const nextTheme: StorefrontTheme = event.matches ? 'dark' : 'light';
        setResolvedTheme(nextTheme);
        applyTheme(nextTheme);
      }
    };
    media.addEventListener?.('change', onSystemThemeChange);
    return () => {
      window.cancelAnimationFrame(mountFrame);
      media.removeEventListener?.('change', onSystemThemeChange);
    };
  }, []);

  const setTheme = useCallback((theme: StorefrontTheme) => {
    window.localStorage.setItem(STOREFRONT_THEME_STORAGE_KEY, theme);
    setResolvedTheme(theme);
    applyTheme(theme);
  }, []);
  const toggleTheme = useCallback(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'), [resolvedTheme, setTheme]);
  const value = useMemo(() => ({ mounted, resolvedTheme, setTheme, toggleTheme }), [mounted, resolvedTheme, setTheme, toggleTheme]);
  return <StorefrontThemeContext.Provider value={value}>{children}</StorefrontThemeContext.Provider>;
}

export function useStorefrontTheme(): StorefrontThemeContextValue {
  return useContext(StorefrontThemeContext);
}
