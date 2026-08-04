// Itinerary map rules (client sheet 02.08, N4):
// - The map renders ONLY from locations an editor typed into itinerary steps.
//   With none, there is no map — never a guess from the tour title's keywords.
// - The first location is the start (main stop) and gets the prominent marker;
//   later locations get smaller secondary markers.
// - A round trip (last location equals the first) reuses the start marker
//   instead of stacking a second one, and repeated stops render once.

export interface ItineraryStepLike {
  location?: string | null;
}

const GENERIC_LOCATION_LABELS = new Set([
  "your hotel",
  "hotel pickup",
  "hotel pick up",
  "hotel drop-off",
  "hotel drop off",
  "pickup point",
  "pick up point",
  "drop-off point",
  "drop off point",
  "meeting point",
  "start point",
  "end point",
  "en route",
  "on the way",
  "various locations",
  "ihr hotel",
  "hotelabholung",
  "abholung vom hotel",
  "rückfahrt zum hotel",
  "unterwegs",
]);

function isMappableLocation(location: string): boolean {
  const normalized = location
    .toLocaleLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[.,:;!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 2 && !GENERIC_LOCATION_LABELS.has(normalized);
}

export function itineraryMapStops(itinerary: ItineraryStepLike[]): string[] {
  const locations = (itinerary || [])
    .map((step) => String(step?.location || "").trim())
    .filter(isMappableLocation);

  if (
    locations.length > 1 &&
    locations[locations.length - 1].toLowerCase() === locations[0].toLowerCase()
  ) {
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

function egyptScopedStop(stop: string): string {
  return /(?:egypt|ägypten|مصر)/iu.test(stop) ? stop : `${stop}, Egypt`;
}

export function itineraryEmbedMapUrl(
  stop: string,
  apiKey?: string | null,
): string {
  const scopedStop = egyptScopedStop(stop);
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(scopedStop)}&zoom=12`;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(scopedStop)}&z=11&output=embed`;
}

// Static Maps URL with one prominent start marker and smaller markers for the
// remaining stops. Only used for 2+ stops (a single stop keeps the richer
// interactive place embed); returns null without a key so the caller can hide
// the map instead of rendering a broken image.
export function itineraryStaticMapUrl(
  stops: string[],
  apiKey?: string | null,
): string | null {
  if (!apiKey || stops.length < 2) return null;

  // These storefronts sell Egypt experiences. Supplying the country context
  // prevents ambiguous editor labels (for example, "Luxor Restaurant") from
  // resolving to an unrelated place abroad and zooming the route to the world.
  const mapStops = stops.map(egyptScopedStop);
  const [start, ...rest] = mapStops;
  const parts = [
    "size=640x640",
    "scale=2",
    "maptype=roadmap",
    `markers=${encodeURIComponent(`size:mid|color:red|label:1|${start}`)}`,
    `markers=${encodeURIComponent(`size:small|color:blue|${rest.join("|")}`)}`,
    `key=${encodeURIComponent(apiKey)}`,
  ];
  return `https://maps.googleapis.com/maps/api/staticmap?${parts.join("&")}`;
}
