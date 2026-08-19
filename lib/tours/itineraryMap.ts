// Itinerary map rules (client sheet 02.08, N4):
// - The customer map renders only from coordinate pairs saved by an editor.
//   With none, it fails closed — never guess from a title or call a geocoder.
// - Every lifecycle stage remains selectable in itinerary order. Authored
//   coordinates stay exact; intervening travel stages are disclosed as
//   approximate positions along the route.
// - Round-trip endpoints can share the saved starting area while overlapping
//   approximate markers are separated enough to remain independently usable.

export interface ItineraryStepLike {
  location?: string | null;
  coordinates?: {
    lat?: number | null;
    lng?: number | null;
  } | null;
}

// Editor-facing itinerary copy often uses travel-stage labels in the location
// field. Those labels are useful in the timeline, but they are not real map
// places and can make Google zoom out to a world view. Keep them in the cards
// while excluding them from map geocoding.
const GENERIC_LOCATION_LABELS = new Set([
  'your hotel',
  'hotel',
  'hotels',
  'hotel pickup',
  'hotel pick up',
  'hotel drop-off',
  'hotel drop off',
  'pickup point',
  'pick up point',
  'drop-off point',
  'drop off point',
  'meeting point',
  'start point',
  'end point',
  'en route',
  'on the way',
  'on the boat',
  'on board',
  'aboard the boat',
  'onboard',
  'at sea',
  'red sea',
  'the red sea',
  'various locations',
  'local restaurant',
  'restaurant',
  'lunch stop',
  'lunch break',
  'lunch',
  'ihr hotel',
  'hotelabholung',
  'abholung vom hotel',
  'rückfahrt zum hotel',
  'unterwegs',
  'auf dem boot',
  'an bord',
  'rotes meer',
  'على متن القارب',
  'البحر الأحمر',
]);

// Editors also prefix generic meal stops with a city (for example,
// "Luxor Restaurant" or "Cairo Restaurant"). Google can resolve those labels
// to an unrelated business and stretch an otherwise local route across Egypt,
// so treat them as timeline copy rather than itinerary landmarks.
const GENERIC_LOCATION_PATTERNS = [
  /(?:^|\s)(?:local\s+)?restaurant$/iu,
  /(?:^|\s)restaurante$/iu,
  /(?:^|\s)مطعم$/u,
  /(?:^|\s)(?:lunch|mittagessen|almuerzo)(?:\s+(?:stop|break))?$/iu,
  /(?:^|\s)(?:غداء|الغداء)$/u,
  // "Sharm Hotels" / "Hurghada Hotels" style pickup labels name every hotel in
  // a resort at once. Geocoding one produces an arbitrary business — with the
  // route-city suffix appended it can even land in another governorate — so
  // treat the plural form as a lifecycle stage. A singular named hotel (for
  // example "Steigenberger Hotel") stays a real, geocodable meeting point.
  /(?:^|\s)hotels$/iu,
  /^فنادق(?:\s|$)/u,
];

// A tour's catalogue destination is often its pickup resort, not the city
// visited by the itinerary (Makadi Bay → Luxor is a common example). Prefer an
// explicit route city when the editor included one, otherwise retain the
// published destination as the ambiguity guard for short landmark labels.
const EGYPT_ROUTE_CITIES = new Set([
  'abu simbel', 'alexandria', 'aswan', 'assuan', 'cairo', 'kairo', 'dahab',
  'el gouna', 'fayoum', 'giza', 'hurghada', 'luxor', 'makadi bay',
  'marsa alam', 'port said', 'safaga', 'sharm el-sheikh', 'sharm el sheikh',
  'siwa', 'suez', 'taba', 'tanta', 'أبو سمبل', 'الإسكندرية', 'أسوان',
  'القاهرة', 'دهب', 'الجيزة', 'الغردقة', 'الأقصر', 'مرسى علم', 'شرم الشيخ',
]);

export function isItineraryMappableLocation(location: string): boolean {
  const normalized = location
    .toLocaleLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[.,:;!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > 2
    && !GENERIC_LOCATION_LABELS.has(normalized)
    && !GENERIC_LOCATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function itineraryMapStops(itinerary: ItineraryStepLike[]): string[] {
  const locations = (itinerary || [])
    .map((step) => String(step?.location || '').trim())
    .filter(isItineraryMappableLocation);

  if (locations.length > 1 && locations[locations.length - 1].toLowerCase() === locations[0].toLowerCase()) {
    locations.pop();
  }

  const seen = new Set<string>();
  const stops: string[] = [];
  for (const location of locations) {
    const key = location.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    stops.push(location);
  }
  return stops;
}

function hasEgyptCountryContext(value: string): boolean {
  return /(?:\bEgypt\b|\bÄgypten\b|مصر)/iu.test(value);
}

function egyptScopedStop(stop: string): string {
  return hasEgyptCountryContext(stop) ? stop : `${stop}, Egypt`;
}

function normalizedPlace(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/(?:,?\s*(?:egypt|ägypten|مصر))$/iu, '')
    .replace(/[.,:;!?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsPlace(value: string, place: string): boolean {
  const normalizedValue = normalizedPlace(value);
  const normalizedNeedle = normalizedPlace(place);
  return normalizedValue === normalizedNeedle
    || normalizedValue.startsWith(`${normalizedNeedle} `)
    || normalizedValue.endsWith(` ${normalizedNeedle}`)
    || normalizedValue.includes(` ${normalizedNeedle} `);
}

function egyptRouteCity(value: string): string | null {
  const city = [...EGYPT_ROUTE_CITIES]
    .sort((a, b) => b.length - a.length)
    .find((city) => containsPlace(value, city)) || null;
  if (!city) return null;
  return city.replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

function routeLocation(stops: string[], tourLocation?: string | null): string | null {
  // A stop that IS a city ("Cairo") names the visited city explicitly and
  // outranks a city merely embedded in a landmark label ("Giza Plateau") —
  // otherwise a Sharm→Cairo itinerary suffixes its other stops with the
  // landmark's district instead of the city the editor actually listed.
  const reversedStops = [...stops].reverse();
  for (const stop of reversedStops) {
    const city = egyptRouteCity(stop);
    if (city && normalizedPlace(stop) === normalizedPlace(city)) return city;
  }
  for (const stop of reversedStops) {
    const city = egyptRouteCity(stop);
    if (city) return city;
  }

  const publishedLocation = String(tourLocation || '').trim();
  return egyptRouteCity(publishedLocation) || publishedLocation || null;
}

// Itinerary locations are short, editor-facing landmark names. Include the
// selected route context so names such as "Citadel" and "Hanging Church"
// resolve to the visited city rather than a similarly named place elsewhere.
function mapStopQuery(stop: string, tourLocation?: string | null): string {
  const normalizedTourLocation = String(tourLocation || '').trim();
  if (!normalizedTourLocation
    || hasEgyptCountryContext(stop)
    || egyptRouteCity(stop)
    || containsPlace(stop, normalizedTourLocation)) {
    return egyptScopedStop(stop);
  }
  if (containsPlace(normalizedTourLocation, stop)) {
    return egyptScopedStop(normalizedTourLocation);
  }
  return `${stop}, ${egyptScopedStop(normalizedTourLocation)}`;
}

export function itineraryMapQuery(stop: string, tourLocation?: string | null): string {
  return mapStopQuery(stop, tourLocation);
}

export function itineraryRouteContextQuery(stops: string[], tourLocation?: string | null): string | null {
  const context = routeLocation(stops, tourLocation);
  return context ? egyptScopedStop(context) : null;
}

// Generic pickup and drop-off stages happen where the customer stays: the
// tour's published location (its pickup resort), not the visited route city.
// A Sharm→Cairo bus tour must anchor its pickup marker in Sharm even though
// every exact landmark sits in Cairo. Only a recognised city qualifies — an
// unknown or country-level published location returns null so the caller can
// fall back to the visited-city route context.
export function itineraryPickupBaseQuery(tourLocation?: string | null): string | null {
  const city = egyptRouteCity(String(tourLocation || '').trim());
  return city ? egyptScopedStop(city) : null;
}

export interface ItineraryRouteCoordinate {
  lat: number;
  lng: number;
}

export interface ItineraryRouteAnchor {
  index: number;
  position: ItineraryRouteCoordinate;
}

export interface ItineraryRoutePosition extends ItineraryRouteCoordinate {
  approximate: boolean;
}

export function itineraryCoordinateAnchors(itinerary: ItineraryStepLike[]): ItineraryRouteAnchor[] {
  return (itinerary || []).flatMap((step, index) => {
    const lat = step?.coordinates?.lat;
    const lng = step?.coordinates?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number'
      || !Number.isFinite(lat) || !Number.isFinite(lng)
      || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return [];
    }
    return [{ index, position: { lat, lng } }];
  });
}

function coordinateLabel(position: ItineraryRouteCoordinate): string {
  return `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`;
}

/**
 * Builds a keyless Google Maps hand-off from the coordinates already stored by
 * an editor. The customer page never geocodes place names. If the itinerary
 * begins at an exact coordinate and ends at a generic lifecycle label such as
 * "Your Hotel", the hand-off closes the route at the starting area.
 */
export function itineraryStoredDirectionsUrl(itinerary: ItineraryStepLike[]): string | null {
  const anchors = itineraryCoordinateAnchors(itinerary);
  if (anchors.length === 0) return null;

  const origin = anchors[0]!;
  const finalIndex = Math.max(0, itinerary.length - 1);
  const exactFinal = anchors.find((anchor) => anchor.index === finalIndex);
  const finalLocation = String(itinerary[finalIndex]?.location || '').trim();
  const returnsToStartArea = origin.index === 0
    && finalLocation.length > 0
    && !isItineraryMappableLocation(finalLocation);
  const destination = exactFinal || (returnsToStartArea ? origin : anchors[anchors.length - 1]!);

  if (anchors.length === 1 && destination === origin && !returnsToStartArea) {
    const searchUrl = new URL('https://www.google.com/maps/search/');
    searchUrl.searchParams.set('api', '1');
    searchUrl.searchParams.set('query', coordinateLabel(origin.position));
    return searchUrl.toString();
  }

  const waypointAnchors = anchors.filter((anchor) =>
    anchor !== origin && anchor !== destination);
  const directionsUrl = new URL('https://www.google.com/maps/dir/');
  directionsUrl.searchParams.set('api', '1');
  directionsUrl.searchParams.set('origin', coordinateLabel(origin.position));
  directionsUrl.searchParams.set('destination', coordinateLabel(destination.position));
  if (waypointAnchors.length > 0) {
    directionsUrl.searchParams.set(
      'waypoints',
      waypointAnchors.map((anchor) => coordinateLabel(anchor.position)).join('|'),
    );
  }
  return directionsUrl.toString();
}

const coordinatesMatch = (first: ItineraryRouteCoordinate, second: ItineraryRouteCoordinate) =>
  Math.abs(first.lat - second.lat) < 0.00015 && Math.abs(first.lng - second.lng) < 0.00015;

// Editors often describe lifecycle stages rather than exact addresses (for
// example, "Red Sea" or "On the boat"). Those stages still need a visible,
// selectable marker, but must not be presented as exact geocoded places. This
// helper keeps exact editor landmarks fixed and interpolates all other stages
// along the route. The caller labels every interpolated marker as approximate.
export function completeItineraryRoute(
  stageCount: number,
  exactAnchors: ItineraryRouteAnchor[],
  routeBase?: ItineraryRouteCoordinate | null,
): ItineraryRoutePosition[] {
  if (stageCount <= 0) return [];

  const anchors = new Map<number, ItineraryRouteCoordinate>();
  for (const anchor of exactAnchors) {
    if (anchor.index >= 0 && anchor.index < stageCount
      && Number.isFinite(anchor.position.lat) && Number.isFinite(anchor.position.lng)) {
      anchors.set(anchor.index, anchor.position);
    }
  }

  if (routeBase && Number.isFinite(routeBase.lat) && Number.isFinite(routeBase.lng)) {
    if (!anchors.has(0)) anchors.set(0, routeBase);
    if (!anchors.has(stageCount - 1)) anchors.set(stageCount - 1, routeBase);
  }

  const orderedAnchors = [...anchors.entries()].sort(([first], [second]) => first - second);
  if (orderedAnchors.length === 0) return [];

  const exactIndexes = new Set(exactAnchors.map((anchor) => anchor.index));
  const positions: ItineraryRoutePosition[] = [];

  for (let index = 0; index < stageCount; index += 1) {
    const exact = anchors.get(index);
    if (exact) {
      positions.push({ ...exact, approximate: !exactIndexes.has(index) });
      continue;
    }

    const previous = [...orderedAnchors].reverse().find(([anchorIndex]) => anchorIndex < index);
    const next = orderedAnchors.find(([anchorIndex]) => anchorIndex > index);

    if (previous && next) {
      const fraction = (index - previous[0]) / (next[0] - previous[0]);
      positions.push({
        lat: previous[1].lat + ((next[1].lat - previous[1].lat) * fraction),
        lng: previous[1].lng + ((next[1].lng - previous[1].lng) * fraction),
        approximate: true,
      });
      continue;
    }

    const nearest = previous?.[1] || next?.[1];
    if (!nearest) return [];
    const angle = (index + 1) * 2.399963;
    const radius = 0.0025 * (index + 1);
    positions.push({
      lat: nearest.lat + (Math.sin(angle) * radius),
      lng: nearest.lng + (Math.cos(angle) * radius),
      approximate: true,
    });
  }

  // A round trip legitimately returns to its start. Separate overlapping
  // approximate pins just enough for both numbered lifecycle stages to remain
  // tappable; exact editor landmarks are never moved.
  positions.forEach((position, index) => {
    const collisionIndex = positions.findIndex((candidate, candidateIndex) =>
      candidateIndex < index && coordinatesMatch(candidate, position));
    if (collisionIndex < 0) return;

    const angle = (index + 1) * 2.399963;
    const offset = 0.0014 + ((index % 3) * 0.00035);
    if (position.approximate) {
      position.lat += Math.sin(angle) * offset;
      position.lng += Math.cos(angle) * offset;
    } else if (positions[collisionIndex]?.approximate) {
      positions[collisionIndex]!.lat -= Math.sin(angle) * offset;
      positions[collisionIndex]!.lng -= Math.cos(angle) * offset;
    }
  });

  return positions;
}

export function itineraryDirectionsUrl(stops: string[], tourLocation?: string | null): string {
  if (stops.length === 0) return 'https://www.google.com/maps';

  const routeContext = routeLocation(stops, tourLocation);
  const mapStops = stops.map((stop) => mapStopQuery(stop, routeContext));

  if (mapStops.length === 1) {
    const searchUrl = new URL('https://www.google.com/maps/search/');
    searchUrl.searchParams.set('api', '1');
    searchUrl.searchParams.set('query', mapStops[0]);
    return searchUrl.toString();
  }

  const directionsUrl = new URL('https://www.google.com/maps/dir/');
  directionsUrl.searchParams.set('api', '1');
  directionsUrl.searchParams.set('origin', mapStops[0]);
  directionsUrl.searchParams.set('destination', mapStops[mapStops.length - 1]);
  if (mapStops.length > 2) {
    directionsUrl.searchParams.set('waypoints', mapStops.slice(1, -1).join('|'));
  }
  return directionsUrl.toString();
}
