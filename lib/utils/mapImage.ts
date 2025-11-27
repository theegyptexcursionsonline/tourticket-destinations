type LatLng = {
  lat: number;
  lng: number;
};

const buildStaticMapBaseUrl = 'https://maps.googleapis.com/maps/api/staticmap';

/**
 * Generate a static map URL that can be embedded inside transactional emails.
 * Falls back gracefully when coordinates or an API key are missing.
 */
export const buildStaticMapImageUrl = (
  location?: LatLng | null,
  options?: {
    zoom?: number;
    width?: number;
    height?: number;
  }
): string | null => {
  if (!location) return null;

  const apiKey =
    process.env.GOOGLE_MAPS_STATIC_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) return null;

  const { lat, lng } = location;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  const width = options?.width ?? 640;
  const height = options?.height ?? 360;
  const zoom = options?.zoom ?? 15;

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: `${zoom}`,
    size: `${width}x${height}`,
    scale: '2',
    maptype: 'roadmap',
    key: apiKey,
  });

  params.append('markers', `color:0xDC2626|${lat},${lng}`);
  params.append('style', 'feature:poi|visibility:off');
  params.append('style', 'feature:road|element:labels.icon|visibility:off');

  return `${buildStaticMapBaseUrl}?${params.toString()}`;
};

export const buildGoogleMapsLink = (location?: LatLng | null): string | null => {
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
};

