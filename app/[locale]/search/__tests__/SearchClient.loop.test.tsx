import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import SearchClient from '../SearchClient';

// The search page rewrites its own URL as filters change. Before this test,
// the fetch effect also depended on the URL it had just written, and the URL
// sync effect rebuilt the filter arrays with fresh identities every pass. The
// two fed each other: the effect re-entered without end, and because each pass
// aborted the previous request through its cleanup, no response ever landed.
// On the network storefronts' /search this showed as a page that loaded
// forever and reported "No tours found" with no filters applied.

// A faithful stand-in for next/navigation: replacing the URL really does change
// what useSearchParams returns, and really does re-render the subscribers.
// Without that, the defect this test exists for cannot reproduce.
const mockNav = {
  params: new URLSearchParams('sortBy=relevance'),
  listeners: new Set<() => void>(),
  replaceCalls: [] as string[],
  subscribe(listener: () => void) {
    mockNav.listeners.add(listener);
    return () => { mockNav.listeners.delete(listener); };
  },
  read: () => mockNav.params,
  navigate(url: string) {
    mockNav.replaceCalls.push(url);
    const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
    mockNav.params = new URLSearchParams(query);
    mockNav.listeners.forEach((listener) => listener());
  },
};

const routerInstance = {
  replace: (url: string) => mockNav.navigate(url),
  push: jest.fn(),
  prefetch: jest.fn(),
};

jest.mock('@/i18n/navigation', () => ({
  useRouter: () => routerInstance,
  usePathname: () => '/search',
}));
jest.mock('next/navigation', () => ({
  useSearchParams: () => React.useSyncExternalStore(
    mockNav.subscribe,
    mockNav.read,
    mockNav.read,
  ),
}));

jest.mock('@/components/Headersearch', () => ({ __esModule: true, default: () => <header /> }));
jest.mock('@/components/Footer', () => ({ __esModule: true, default: () => <footer /> }));
jest.mock('@/components/user/TourCard', () => ({
  __esModule: true,
  default: ({ tour }: { tour: { title: string } }) => <article>{tour.title}</article>,
}));

const TOURS = [
  { _id: '1', title: 'Giza Pyramids Tour', slug: 'giza', price: 40, duration: '4 hours' },
  { _id: '2', title: 'Luxor Day Trip', slug: 'luxor', price: 90, duration: '12 hours' },
];

let fetchCalls = 0;
let abortedCalls = 0;

beforeEach(() => {
  fetchCalls = 0;
  abortedCalls = 0;
  mockNav.params = new URLSearchParams('sortBy=relevance');
  mockNav.replaceCalls = [];

  // Resolve on a later tick, as a network call does — an effect that re-enters
  // will abort this before it settles, exactly as it did in production.
  global.fetch = jest.fn((_url: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve({
        ok: true,
        json: async () => TOURS,
      } as Response), 10);
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        abortedCalls += 1;
        reject(Object.assign(new DOMException('Aborted', 'AbortError')));
      });
    });
  }) as unknown as typeof fetch;
});

async function settle(ms = 60) {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
}

describe('SearchClient does not re-enter its own fetch effect', () => {
  it('lands results when the page is opened on a URL that already carries params', async () => {
    render(<SearchClient initialTours={[]} categories={[]} destinations={[]} />);
    await settle();

    expect(await screen.findByText('Giza Pyramids Tour')).toBeInTheDocument();
    expect(screen.getByText('Luxor Day Trip')).toBeInTheDocument();
  });

  it('issues one request, not an unbounded stream of aborted ones', async () => {
    render(<SearchClient initialTours={[]} categories={[]} destinations={[]} />);
    await settle(150);

    expect(fetchCalls).toBeLessThanOrEqual(2);
    expect(abortedCalls).toBe(0);
  });

  it('does not rewrite the URL when the query it would write is the one already there', async () => {
    render(<SearchClient initialTours={[]} categories={[]} destinations={[]} />);
    await settle(150);

    // The page opened on `sortBy=relevance` and no filter changed, so there is
    // nothing to write. A replace here is the first turn of the loop.
    expect(mockNav.replaceCalls).toEqual([]);
  });

  it('keeps results on screen instead of emptying them while it settles', async () => {
    render(<SearchClient initialTours={TOURS as never} categories={[]} destinations={[]} />);
    await settle(150);

    await waitFor(() => expect(screen.getByText('Giza Pyramids Tour')).toBeInTheDocument());
    expect(screen.queryByText('No tours found')).not.toBeInTheDocument();
  });
});
