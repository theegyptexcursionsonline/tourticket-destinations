/**
 * @jest-environment jsdom
 *
 * 10 Nov 2026: with storage blocked (Safari "Block all cookies" and similar), the first touch
 * of window.localStorage throws SecurityError and the storefront showed only "Application
 * error". Storage now never throws and falls back to memory for the visit.
 */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { clearBrowserStorageMemory, safeLocalStorage, safeSessionStorage } from '@/lib/browserStorage';

const originals = {
  local: Object.getOwnPropertyDescriptor(window, 'localStorage'),
  session: Object.getOwnPropertyDescriptor(window, 'sessionStorage'),
};
function blockStorage() {
  const deny = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
  Object.defineProperty(window, 'localStorage', { configurable: true, get: deny });
  Object.defineProperty(window, 'sessionStorage', { configurable: true, get: deny });
}
function restoreStorage() {
  if (originals.local) Object.defineProperty(window, 'localStorage', originals.local);
  if (originals.session) Object.defineProperty(window, 'sessionStorage', originals.session);
}
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => { restoreStorage(); clearBrowserStorageMemory(); });

describe('safe storage', () => {
  it('uses the browser when it allows storage', () => {
    safeLocalStorage.setItem('cart', '[1]');
    expect(window.localStorage.getItem('cart')).toBe('[1]');
    expect(safeLocalStorage.getItem('cart')).toBe('[1]');
    safeLocalStorage.removeItem('cart');
    expect(window.localStorage.getItem('cart')).toBeNull();
  });

  it('never throws when storage is blocked, and keeps values for the visit', () => {
    blockStorage();
    expect(() => window.localStorage).toThrow();
    expect(safeLocalStorage.getItem('wishlist')).toBeNull();
    expect(() => safeLocalStorage.setItem('wishlist', '["a"]')).not.toThrow();
    expect(safeLocalStorage.getItem('wishlist')).toBe('["a"]');
    expect(() => safeLocalStorage.removeItem('wishlist')).not.toThrow();
    expect(safeLocalStorage.getItem('wishlist')).toBeNull();
    safeSessionStorage.setItem('offer-exit-shown:X', '1');
    expect(safeSessionStorage.getItem('offer-exit-shown:X')).toBe('1');
  });
});

describe('checkout attempt key', () => {
  it('still gives one stable key per visit when storage is blocked', async () => {
    blockStorage();
    const { getOrCreateCheckoutAttemptId, clearCheckoutAttemptId } = await import('@/lib/checkout/checkoutAttempt');
    const first = getOrCreateCheckoutAttemptId();
    expect(getOrCreateCheckoutAttemptId()).toBe(first);
    clearCheckoutAttemptId();
    expect(getOrCreateCheckoutAttemptId()).not.toBe(first);
  });
});

describe('storefront theme provider', () => {
  it('starts and switches theme with storage blocked', async () => {
    window.matchMedia = window.matchMedia || ((() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia);
    blockStorage();
    const { StorefrontThemeProvider, useStorefrontTheme } = await import('@/contexts/StorefrontThemeContext');
    let api: ReturnType<typeof useStorefrontTheme> | null = null;
    const Probe = () => { api = useStorefrontTheme(); return null; };
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => { root.render(createElement(StorefrontThemeProvider, null, createElement(Probe))); });
    expect(api).not.toBeNull();
    await act(async () => { api!.setTheme('dark'); });
    expect(document.documentElement.dataset.storefrontTheme).toBe('dark');
    act(() => root.unmount()); host.remove();
  });
});

describe('every customer-facing storage use goes through the safe helper', () => {
  const fs = require('fs') as typeof import('fs');
  const files = ['app/[locale]/offer/[token]/luxe.tsx', 'app/[locale]/offer/theme.tsx', 'components/Header.tsx', 'components/Header2.tsx', 'contexts/CartContext.tsx', 'contexts/SettingsContext.tsx', 'contexts/StorefrontThemeContext.tsx', 'contexts/WishlistContext.tsx', 'hooks/useSearch.ts', 'lib/checkout/checkoutAttempt.ts'];
  it.each(files)('%s', (file) => {
    const code = fs.readFileSync(file, 'utf8').split('\n').filter((line) => !/^\s*\/\//.test(line)).join('\n').replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '""');
    expect(code).not.toMatch(/(?<![\w.])(?:window\.)?(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem|clear|key)\(/);
  });
});
