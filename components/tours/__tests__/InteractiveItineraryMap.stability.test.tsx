import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InteractiveItineraryMap, { type InteractiveItineraryItem } from '../InteractiveItineraryMap';

const MAP_LOAD_TIMEOUT_MS = 15000;

// Building a MapLibre map means a WebGL context, a style download and a fresh
// tile set. The tour page re-renders on every scroll tick (eight useInView
// observers drive the sticky tab bar) and handed this component freshly
// allocated — but identical — itinerary arrays, plus a fresh next-intl
// translator. That identity churn tore the map down and rebuilt it. The same
// defect was measured on the main storefront before it was fixed there:
// 130-175 full map reconstructions over six scroll passes, with
// "Loading route map…" visible for roughly 43% of the scroll.
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const messages: Record<string, string> = {
      mapApproximateStage: 'Approximate stage',
      mapData: 'Map data',
      mapExactPlace: 'Exact place',
      mapInteractiveLabel: 'Interactive tour route with {count} numbered stages',
      mapLoading: 'Loading route map…',
      mapOpenRoute: 'Open route',
      mapRetry: 'Try again',
      mapRoadMap: 'Road map',
      mapRouteStages: '{count} route stages',
      mapSelectStage: 'Select an itinerary stage',
      mapShowStage: 'Show stage {number}: {title}',
      mapStageNote: 'Numbered stages follow the itinerary order.',
      mapTilesBy: 'Tiles by',
      mapUnavailable: 'The route map is temporarily unavailable.',
    };
    return (messages[key] || key).replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? ''));
  },
}));

const mapStats = {
  constructed: 0,
  removed: 0,
  markersCreated: 0,
  setDataCalls: 0,
  fitBoundsCalls: 0,
  stallNextBuilds: 0,
};

jest.mock('maplibre-gl', () => {
  class FakeSource {
    data: unknown;
    constructor(data: unknown) { this.data = data; }
    setData(data: unknown) { this.data = data; mapStats.setDataCalls += 1; }
  }

  class FakeMap {
    private handlers = new Map<string, () => void>();
    private sources = new Map<string, FakeSource>();
    private layers = new Set<string>();

    constructor(_options: unknown) {
      mapStats.constructed += 1;
      // When the tile host stalls, `style.load` simply never arrives.
      if (mapStats.stallNextBuilds > 0) {
        mapStats.stallNextBuilds -= 1;
        return;
      }
      // Style readiness resolves on a later tick, as it does in a browser.
      setTimeout(() => this.handlers.get('style.load')?.(), 0);
    }

    once(event: string, handler: () => void) { this.handlers.set(event, handler); return this; }
    addControl() { return this; }
    getSource(id: string) { return this.sources.get(id); }
    addSource(id: string, spec: { data: unknown }) { this.sources.set(id, new FakeSource(spec.data)); }
    addLayer(spec: { id: string }) { this.layers.add(spec.id); }
    getLayer(id: string) { return this.layers.has(id) ? { id } : undefined; }
    removeLayer(id: string) { this.layers.delete(id); }
    removeSource(id: string) { this.sources.delete(id); }
    jumpTo() { /* no-op */ }
    easeTo() { /* no-op */ }
    fitBounds() { mapStats.fitBoundsCalls += 1; }
    remove() { mapStats.removed += 1; }
  }

  class FakeMarker {
    private element: HTMLElement;
    constructor(options: { element: HTMLElement }) {
      mapStats.markersCreated += 1;
      this.element = options.element;
    }
    setLngLat() { return this; }
    // Real markers are inserted into the map container, which is what makes
    // their accessible names reachable — mirror that so the DOM can be queried.
    addTo() { document.body.appendChild(this.element); return this; }
    getElement() { return this.element; }
    remove() { this.element.remove(); }
  }

  return {
    __esModule: true,
    Map: FakeMap,
    Marker: FakeMarker,
    NavigationControl: class { },
    LngLatBounds: class { extend() { /* no-op */ } },
  };
});

// The shared jest.setup stub never reports an intersection, so the map would
// stay lazy forever. Report one immediately, as a real viewport does when the
// itinerary scrolls into view.
class ImmediateIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  disconnect() { /* no-op */ }
  unobserve() { /* no-op */ }
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

const realIntersectionObserver = global.IntersectionObserver;
beforeAll(() => {
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    ImmediateIntersectionObserver;
});
afterAll(() => {
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    realIntersectionObserver;
});

const STOPS: Array<{ title: string; lat?: number; lng?: number }> = [
  { title: 'Hotel Pickup' },
  { title: 'Orange Bay', lat: 27.223, lng: 33.856 },
  { title: 'Lunch' },
  { title: 'Hurghada Marina', lat: 27.242, lng: 33.843 },
  { title: 'Hotel Drop-off' },
];

// Rebuilt on every call, exactly like extractEnhancementData() on the tour page.
function freshItinerary(shift = 0, titleSuffix = ''): InteractiveItineraryItem[] {
  return STOPS.map((stop) => ({
    title: `${stop.title}${titleSuffix}`,
    description: `${stop.title} description.`,
    location: stop.title,
    coordinates: typeof stop.lat === 'number'
      ? { lat: stop.lat + shift, lng: stop.lng! }
      : null,
  }));
}

/**
 * Mirrors the real tour page: unrelated state changes re-render the parent,
 * and every render hands the map brand-new prop objects holding the same data.
 */
function ScrollingParent({ shift = 0, titleSuffix = '' }: { shift?: number; titleSuffix?: string }) {
  const [tick, setTick] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <div>
      <button type="button" onClick={() => setTick((value) => value + 1)}>
        simulate scroll tick {tick}
      </button>
      <InteractiveItineraryMap
        itinerary={freshItinerary(shift, titleSuffix)}
        openMapsUrl="https://maps.example.test/route"
        activeIndex={activeIndex}
        onSelect={(index) => setActiveIndex(index)}
      />
    </div>
  );
}

function markerLabels(): string[] {
  return [...document.querySelectorAll('.eeo-itinerary-marker')]
    .map((element) => element.getAttribute('aria-label') || '');
}

async function flushStyleLoad() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('InteractiveItineraryMap recovery from a stalled tile host', () => {
  beforeEach(() => {
    mapStats.constructed = 0;
    mapStats.removed = 0;
    mapStats.markersCreated = 0;
    mapStats.setDataCalls = 0;
    mapStats.fitBoundsCalls = 0;
    mapStats.stallNextBuilds = 0;
  });

  it('offers a working retry instead of stranding the customer with a dead map', async () => {
    jest.useFakeTimers();
    try {
      // The first build never receives style.load — the tile host has stalled.
      mapStats.stallNextBuilds = 1;
      render(<ScrollingParent />);
      await act(async () => { await Promise.resolve(); });
      await act(async () => { jest.advanceTimersByTime(MAP_LOAD_TIMEOUT_MS + 100); });

      expect(screen.getByText('The route map is temporarily unavailable.')).toBeInTheDocument();
      expect(mapStats.constructed).toBe(1);
      expect(mapStats.removed).toBe(1);

      // Without a retry the map would stay dead for the rest of the visit.
      const retry = screen.getByRole('button', { name: 'Try again' });
      await act(async () => { retry.click(); });
      await act(async () => { jest.advanceTimersByTime(1); });
      await act(async () => { await Promise.resolve(); });
      await act(async () => { jest.advanceTimersByTime(1); });

      expect(mapStats.constructed).toBe(2);
      expect(mapStats.markersCreated).toBe(STOPS.length);
      expect(screen.queryByText('The route map is temporarily unavailable.')).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('InteractiveItineraryMap stability under parent re-renders', () => {
  beforeEach(() => {
    mapStats.constructed = 0;
    mapStats.removed = 0;
    mapStats.markersCreated = 0;
    mapStats.setDataCalls = 0;
    mapStats.fitBoundsCalls = 0;
    mapStats.stallNextBuilds = 0;
  });

  it('builds the map once and never rebuilds it when the parent re-renders with equal data', async () => {
    render(<ScrollingParent />);
    await flushStyleLoad();
    // Markers are drawn by the route-sync effect, which runs after the style
    // has loaded — waiting on them proves the map is fully built.
    await waitFor(() => expect(mapStats.markersCreated).toBe(STOPS.length));
    const markersAfterFirstDraw = mapStats.markersCreated;
    expect(mapStats.constructed).toBe(1);

    const scrollTick = screen.getByRole('button', { name: /simulate scroll tick/i });
    for (let i = 0; i < 12; i += 1) {
      fireEvent.click(scrollTick);
      await flushStyleLoad();
    }

    expect(mapStats.constructed).toBe(1);
    expect(mapStats.removed).toBe(0);
    expect(mapStats.markersCreated).toBe(markersAfterFirstDraw);
    expect(mapStats.fitBoundsCalls).toBe(1);
  });

  it('keeps the map alive when a stage is hovered or selected', async () => {
    render(<ScrollingParent />);
    await flushStyleLoad();
    await waitFor(() => expect(mapStats.markersCreated).toBe(STOPS.length));
    expect(mapStats.constructed).toBe(1);

    const stageChips = screen.getAllByRole('button', { name: /^Show stage/ });
    for (const chip of stageChips) {
      fireEvent.mouseEnter(chip);
      await flushStyleLoad();
    }

    expect(mapStats.constructed).toBe(1);
    expect(mapStats.removed).toBe(0);
  });

  it('refreshes marker accessible names when stage titles change but the pins do not', async () => {
    const { rerender } = render(<ScrollingParent titleSuffix="" />);
    await flushStyleLoad();
    await waitFor(() => expect(mapStats.markersCreated).toBe(STOPS.length));
    expect(markerLabels()[1]).toBe('Show stage 2: Orange Bay');

    // A retitled stage — or the same route read in another language — moves no
    // pin, so the route signature is unchanged.
    rerender(<ScrollingParent titleSuffix=" (renamed)" />);
    await flushStyleLoad();

    await waitFor(() => expect(markerLabels()[1]).toBe('Show stage 2: Orange Bay (renamed)'));
    expect(markerLabels()[0]).toBe('Show stage 1: Hotel Pickup (renamed)');
    // ...and the labels were rewritten in place, not by rebuilding anything.
    expect(mapStats.constructed).toBe(1);
    expect(mapStats.markersCreated).toBe(STOPS.length);
    expect(mapStats.removed).toBe(0);
  });

  it('redraws the route in place — without a rebuild — when the coordinates actually change', async () => {
    const { rerender } = render(<ScrollingParent shift={0} />);
    await flushStyleLoad();
    await waitFor(() => expect(mapStats.markersCreated).toBe(STOPS.length));
    expect(mapStats.constructed).toBe(1);
    expect(mapStats.setDataCalls).toBe(0);

    rerender(<ScrollingParent shift={0.5} />);
    await flushStyleLoad();

    await waitFor(() => expect(mapStats.setDataCalls).toBe(1));
    expect(mapStats.constructed).toBe(1);
    expect(mapStats.removed).toBe(0);
    expect(mapStats.fitBoundsCalls).toBe(2);
  });
});
