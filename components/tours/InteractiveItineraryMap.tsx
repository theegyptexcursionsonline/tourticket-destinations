'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  completeItineraryRoute,
  isItineraryMappableLocation,
  itineraryAutomaticRouteBase,
  itineraryCoordinateAnchors,
  type ItineraryRoutePosition,
} from '@/lib/tours/itineraryMap';

const OPENFREE_STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';
const MAP_LOAD_TIMEOUT_MS = 15000;
const ROUTE_SOURCE_ID = 'eeo-itinerary-route';
const ROUTE_CASING_LAYER_ID = 'eeo-itinerary-route-casing';
const ROUTE_LINE_LAYER_ID = 'eeo-itinerary-route-line';

export interface InteractiveItineraryItem {
  time?: string;
  title: string;
  description: string;
  duration?: string;
  location?: string;
  coordinates?: { lat?: number | null; lng?: number | null } | null;
}

interface InteractiveItineraryMapProps {
  itinerary: InteractiveItineraryItem[];
  tourLocation?: string | null;
  tourTitle?: string | null;
  openMapsUrl: string;
  activeIndex: number;
  onSelect: (index: number) => void;
}

type MapLibreModule = typeof import('maplibre-gl');
type MapLibreMap = import('maplibre-gl').Map;
type MapLibreMarker = import('maplibre-gl').Marker;
type MapLibreGeoJSONSource = import('maplibre-gl').GeoJSONSource;

function markerClass(active: boolean): string {
  return [
    'eeo-itinerary-marker',
    'inline-flex items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2',
    active ? 'h-11 w-11 bg-red-800' : 'h-9 w-9 bg-red-600',
  ].join(' ');
}

interface RouteLineFeature {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
}

function routeFeature(positions: ItineraryRoutePosition[]): RouteLineFeature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: positions.map((position): [number, number] => [position.lng, position.lat]),
    },
  };
}

function InteractiveItineraryMap({
  itinerary,
  tourLocation,
  tourTitle,
  openMapsUrl,
  activeIndex,
  onSelect,
}: InteractiveItineraryMapProps) {
  const t = useTranslations('tour');
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const maplibreRef = useRef<MapLibreModule | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const markerListenersRef = useRef<Array<{ element: HTMLElement; event: string; listener: EventListener }>>([]);
  const activeIndexRef = useRef(activeIndex);
  const focusedStageRef = useRef<number | null>(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  // OpenFreeMap is a free community tile host with no availability guarantee,
  // and these links are opened from WhatsApp on hotel and mobile wifi. A style
  // download that stalls past the timeout must not strand the customer with a
  // dead panel for the rest of the visit, so the build is retryable.
  const [retryToken, setRetryToken] = useState(0);

  const anchors = useMemo(() => itineraryCoordinateAnchors(itinerary), [itinerary]);
  const automaticRouteBase = useMemo(
    () => anchors.length === 0 ? itineraryAutomaticRouteBase(itinerary, tourLocation, tourTitle) : null,
    [anchors.length, itinerary, tourLocation, tourTitle],
  );
  const roundTripBase = anchors.find((anchor) => anchor.index === 0)?.position || automaticRouteBase;
  const positions = useMemo(
    () => completeItineraryRoute(itinerary.length, anchors, roundTripBase),
    [anchors, itinerary.length, roundTripBase],
  );
  // The map is expensive to build (a WebGL context, a style download and a
  // fresh tile set), so nothing about it may key off object identity. The
  // parent page re-renders on every scroll, and a re-render used to hand this
  // component new `itinerary`/`positions` arrays holding identical data — and a
  // new `t` — which tore the whole map down and rebuilt it. Everything below
  // keys off these primitives instead, so the map is rebuilt only when the
  // route truly moves.
  const routeSignature = useMemo(
    () => positions
      .map((position) => `${position.lat.toFixed(6)},${position.lng.toFixed(6)},${position.approximate ? 'a' : 'e'}`)
      .join('|'),
    [positions],
  );
  const canRenderMap = itinerary.length > 0 && positions.length === itinerary.length;
  // Marker accessible names come from stage titles and the active translation,
  // neither of which moves a pin. Tracked separately so a title edit or a
  // language change refreshes the labels in place instead of rebuilding.
  const labelSignature = useMemo(
    () => itinerary.map((item) => item.title).join('\u0001'),
    [itinerary],
  );

  // Live values for callbacks that must not force the map to be rebuilt.
  const onSelectRef = useRef(onSelect);
  const itineraryRef = useRef(itinerary);
  const positionsRef = useRef(positions);
  const translateRef = useRef(t);
  // Declared ahead of the map effects so they always observe current data:
  // effects run in declaration order within a commit.
  useEffect(() => {
    onSelectRef.current = onSelect;
    itineraryRef.current = itinerary;
    positionsRef.current = positions;
    translateRef.current = t;
  }, [itinerary, onSelect, positions, t]);

  const effectiveMapState = canRenderMap ? mapState : 'unavailable';
  const selected = itinerary[activeIndex] || itinerary[0];

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const clearMarkers = useCallback(() => {
    markerListenersRef.current.forEach(({ element, event, listener }) => {
      element.removeEventListener(event, listener);
    });
    markerListenersRef.current = [];
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  }, []);

  useEffect(() => {
    const element = mapElementRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      const timer = window.setTimeout(() => setShouldLoadMap(true), 0);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setShouldLoadMap(true);
      observer.disconnect();
    }, { rootMargin: '400px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Create the map once. Every dependency is a boolean or a retry counter, so
  // a parent re-render cannot restart this — only a real retry can.
  useEffect(() => {
    if (!shouldLoadMap || !canRenderMap || !mapElementRef.current) return;

    let cancelled = false;
    let loadTimer: ReturnType<typeof setTimeout> | null = null;

    const initialize = async () => {
      setMapState('loading');
      setStyleLoaded(false);
      try {
        const maplibre = await import('maplibre-gl');
        const first = positionsRef.current[0];
        if (cancelled || !mapElementRef.current || !first) return;

        const map = new maplibre.Map({
          container: mapElementRef.current,
          style: OPENFREE_STYLE_URL,
          center: [first.lng, first.lat],
          zoom: 10,
          attributionControl: false,
          cooperativeGestures: true,
        });
        mapInstanceRef.current = map;
        maplibreRef.current = maplibre;
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');

        loadTimer = setTimeout(() => {
          if (cancelled) return;
          map.remove();
          mapInstanceRef.current = null;
          maplibreRef.current = null;
          setMapState('unavailable');
        }, MAP_LOAD_TIMEOUT_MS);

        // `style.load` is the reliable readiness boundary for adding our own
        // route source and markers. Waiting for the broader `load` event also
        // waits on every initial base-map tile and can stall a fast customer
        // connection behind a single slow optional tile.
        map.once('style.load', () => {
          if (cancelled) return;
          if (loadTimer) clearTimeout(loadTimer);
          setStyleLoaded(true);
        });
      } catch {
        if (!cancelled) setMapState('unavailable');
      }
    };

    void initialize();
    return () => {
      cancelled = true;
      if (loadTimer) clearTimeout(loadTimer);
      clearMarkers();
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      maplibreRef.current = null;
      focusedStageRef.current = null;
      setStyleLoaded(false);
    };
  }, [canRenderMap, clearMarkers, retryToken, shouldLoadMap]);

  // Draw the route and the numbered stage markers onto the existing map. When
  // the route data is unchanged this never runs, so scrolling the page leaves
  // the rendered map completely untouched.
  useEffect(() => {
    const map = mapInstanceRef.current;
    const maplibre = maplibreRef.current;
    if (!styleLoaded || !map || !maplibre) return;

    const routePositions = positionsRef.current;
    const stages = itineraryRef.current;
    const translate = translateRef.current;
    if (routePositions.length === 0) return;

    const existingSource = map.getSource(ROUTE_SOURCE_ID) as MapLibreGeoJSONSource | undefined;
    if (routePositions.length > 1) {
      if (existingSource) {
        existingSource.setData(routeFeature(routePositions));
      } else {
        map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: routeFeature(routePositions) });
        map.addLayer({
          id: ROUTE_CASING_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-opacity': 0.95, 'line-width': 8 },
        });
        map.addLayer({
          id: ROUTE_LINE_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#dc2626', 'line-opacity': 0.9, 'line-width': 5 },
        });
      }
    } else if (existingSource) {
      if (map.getLayer(ROUTE_LINE_LAYER_ID)) map.removeLayer(ROUTE_LINE_LAYER_ID);
      if (map.getLayer(ROUTE_CASING_LAYER_ID)) map.removeLayer(ROUTE_CASING_LAYER_ID);
      map.removeSource(ROUTE_SOURCE_ID);
    }

    clearMarkers();
    markersRef.current = routePositions.map((position, index) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = markerClass(index === activeIndexRef.current);
      element.textContent = String(index + 1);
      element.setAttribute('aria-label', translate('mapShowStage', {
        number: index + 1,
        title: stages[index]?.title || '',
      }));
      const selectStage = () => onSelectRef.current(index);
      for (const event of ['click', 'mouseenter', 'focus']) {
        element.addEventListener(event, selectStage);
        markerListenersRef.current.push({ element, event, listener: selectStage });
      }
      return new maplibre.Marker({ element, anchor: 'bottom' })
        .setLngLat([position.lng, position.lat])
        .addTo(map);
    });

    if (routePositions.length === 1) {
      map.jumpTo({ center: [routePositions[0]!.lng, routePositions[0]!.lat], zoom: 12 });
    } else {
      const bounds = new maplibre.LngLatBounds();
      routePositions.forEach((position) => bounds.extend([position.lng, position.lat]));
      map.fitBounds(bounds, { padding: 58, maxZoom: 12, duration: 0 });
    }

    focusedStageRef.current = null;
    setMapState('ready');
  }, [clearMarkers, routeSignature, styleLoaded]);

  useEffect(() => {
    if (mapState !== 'ready') return;
    const map = mapInstanceRef.current;
    const position = positionsRef.current[activeIndex];
    const item = itineraryRef.current[activeIndex];
    if (!map || !position || !item) return;

    markersRef.current.forEach((marker, index) => {
      marker.getElement().className = markerClass(index === activeIndex);
    });
    if (focusedStageRef.current !== null && focusedStageRef.current !== activeIndex) {
      map.easeTo({ center: [position.lng, position.lat], duration: 300 });
    }
    focusedStageRef.current = activeIndex;
  }, [activeIndex, mapState, routeSignature]);

  // Refresh the marker accessible names when stage titles or the active
  // language change but the pins do not. Rewriting the attribute on the
  // existing elements keeps the map and its markers intact.
  useEffect(() => {
    if (mapState !== 'ready') return;
    const stages = itineraryRef.current;
    const translate = translateRef.current;
    markersRef.current.forEach((marker, index) => {
      marker.getElement().setAttribute('aria-label', translate('mapShowStage', {
        number: index + 1,
        title: stages[index]?.title || '',
      }));
    });
  }, [labelSignature, mapState, t]);

  const selectedPosition: ItineraryRoutePosition | undefined = positions[activeIndex];
  const selectedIsExact = selectedPosition
    ? !selectedPosition.approximate
    : Boolean(selected?.location && isItineraryMappableLocation(selected.location));

  return (
    <div data-testid="interactive-itinerary-map" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="relative aspect-[4/3] min-h-[290px] w-full bg-slate-100 sm:aspect-square">
        <div
          className={`absolute inset-0 transition-opacity ${effectiveMapState === 'unavailable' ? 'opacity-0' : 'opacity-100'}`}
          role="region"
          aria-label={t('mapInteractiveLabel', { count: itinerary.length })}
        >
          <div
            ref={mapElementRef}
            data-testid="interactive-itinerary-map-canvas"
            className="h-full w-full"
          />
        </div>

        {effectiveMapState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm font-semibold text-slate-700">
            {t('mapLoading')}
          </div>
        )}
        {effectiveMapState === 'unavailable' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
            <MapPin className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700">{t('mapUnavailable')}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMapState('loading');
                  setRetryToken((token) => token + 1);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
              >
                <RefreshCw size={13} />
                {t('mapRetry')}
              </button>
              <a
                href={openMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                <Navigation size={13} />
                {t('mapOpenRoute')}
              </a>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-md backdrop-blur-sm">
          {t('mapRoadMap')} · {t('mapRouteStages', { count: itinerary.length })}
        </div>
      </div>

      <div className="border-t border-slate-100 px-3 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label={t('mapSelectStage')}>
          {itinerary.map((item, index) => (
            <button
              key={`${item.title}-${index}`}
              type="button"
              onMouseEnter={() => onSelect(index)}
              onFocus={() => onSelect(index)}
              onClick={() => onSelect(index)}
              aria-label={t('mapShowStage', { number: index + 1, title: item.title })}
              aria-pressed={activeIndex === index}
              className={`inline-flex h-9 min-w-9 flex-shrink-0 scroll-mx-3 items-center justify-center rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${activeIndex === index ? 'bg-red-700 text-white ring-4 ring-red-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
            >
              {index + 1}
            </button>
          ))}
          <a
            href={openMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex h-9 flex-shrink-0 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
          >
            <Navigation size={13} />
            {t('mapOpenRoute')}
          </a>
        </div>
      </div>

      {selected && (
        <div data-testid="itinerary-map-stage-card" aria-live="polite" className="border-t border-slate-200 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white ring-4 ring-red-100">
              {activeIndex + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-slate-900">{selected.title}</h4>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selectedIsExact ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                  {selectedIsExact ? t('mapExactPlace') : t('mapApproximateStage')}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {selected.time && <span className="inline-flex items-center gap-1"><Clock size={12} />{selected.time}</span>}
                {selected.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={12} /><span className="truncate">{selected.location}</span></span>}
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{selected.description}</p>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 px-3 pb-4 pt-3">
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          {t('mapStageNote')}
        </p>
        <p className="mt-1 text-[10px] text-slate-500">
          © <a className="underline hover:text-slate-700" href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> · {t('mapData')} © <a className="underline hover:text-slate-700" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>
        </p>
      </div>
    </div>
  );
}

// The tour page re-renders on every scroll tick. Without this the whole map
// subtree re-rendered each time even when nothing about the route changed.
export default React.memo(InteractiveItineraryMap);
