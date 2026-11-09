/**
 * Browser storage that never throws.
 *
 * A browser that blocks storage (Safari "Block all cookies", some privacy modes, embedded
 * contexts) throws a SecurityError on the first touch of `localStorage`/`sessionStorage`,
 * even on `window.localStorage` itself. One unguarded read in the theme provider took the
 * whole storefront down to "Application error" (10 Nov 2026). Every read and write here
 * falls back to an in-memory copy for the rest of the visit: the cart, wishlist, theme and
 * settings keep working, they just are not remembered after the tab closes.
 */
type Area = 'local' | 'session';

const memory: Record<Area, Map<string, string>> = { local: new Map(), session: new Map() };

function area(kind: Area): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = kind === 'local' ? window.localStorage : window.sessionStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

function read(kind: Area, key: string): string | null {
  const storage = area(kind);
  if (storage) {
    try {
      return storage.getItem(key);
    } catch {
      /* fall through to memory */
    }
  }
  return memory[kind].has(key) ? (memory[kind].get(key) as string) : null;
}

function write(kind: Area, key: string, value: string): void {
  memory[kind].set(key, value);
  const storage = area(kind);
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    /* blocked or full: the in-memory copy serves this visit */
  }
}

function remove(kind: Area, key: string): void {
  memory[kind].delete(key);
  const storage = area(kind);
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* nothing more to do */
  }
}

export const safeLocalStorage = {
  getItem: (key: string) => read('local', key),
  setItem: (key: string, value: string) => write('local', key, value),
  removeItem: (key: string) => remove('local', key),
};

export const safeSessionStorage = {
  getItem: (key: string) => read('session', key),
  setItem: (key: string, value: string) => write('session', key, value),
  removeItem: (key: string) => remove('session', key),
};

/** Test hook. */
export function clearBrowserStorageMemory(): void {
  memory.local.clear();
  memory.session.clear();
}
