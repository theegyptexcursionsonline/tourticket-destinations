import {
  completeItineraryRoute,
  itineraryCoordinateAnchors,
  itineraryDirectionsUrl,
  itineraryMapStops,
  itineraryPickupBaseQuery,
  itineraryRouteContextQuery,
  itineraryStoredDirectionsUrl,
} from '@/lib/tours/itineraryMap';

describe('itineraryCoordinateAnchors', () => {
  it('uses only finite stored coordinates in geographic range', () => {
    expect(itineraryCoordinateAnchors([
      { location: 'Cairo Airport', coordinates: { lat: 30.1219, lng: 31.4056 } },
      { location: 'Missing coordinates' },
      { location: 'Null coordinates', coordinates: { lat: null, lng: null } },
      { location: 'Invalid latitude', coordinates: { lat: 120, lng: 31 } },
      { location: 'Giza', coordinates: { lat: 29.9792, lng: 31.1342 } },
    ])).toEqual([
      { index: 0, position: { lat: 30.1219, lng: 31.4056 } },
      { index: 4, position: { lat: 29.9792, lng: 31.1342 } },
    ]);
  });
});

describe('completeItineraryRoute', () => {
  it('keeps exact landmarks fixed and fills every generic lifecycle stage', () => {
    const route = completeItineraryRoute(
      8,
      [
        { index: 3, position: { lat: 27.223, lng: 33.856 } },
        { index: 6, position: { lat: 27.242, lng: 33.843 } },
      ],
      { lat: 27.257, lng: 33.812 },
    );

    expect(route).toHaveLength(8);
    expect(route[3]).toEqual({ lat: 27.223, lng: 33.856, approximate: false });
    expect(route[6]).toEqual({ lat: 27.242, lng: 33.843, approximate: false });
    expect(route[1]?.approximate).toBe(true);
    expect(route[4]?.approximate).toBe(true);
    expect(route[7]?.approximate).toBe(true);
  });

  it('separates overlapping approximate round-trip markers so each remains selectable', () => {
    const route = completeItineraryRoute(3, [], { lat: 27.25, lng: 33.81 });
    expect(route).toHaveLength(3);
    expect(route[0]).not.toEqual(route[2]);
  });

  it('does not invent route coordinates without an editor place or route base', () => {
    expect(completeItineraryRoute(4, [], null)).toEqual([]);
  });
});

describe('itineraryStoredDirectionsUrl', () => {
  it('uses stored coordinates and closes a generic return stage at the starting area', () => {
    const url = new URL(itineraryStoredDirectionsUrl([
      { location: 'Sharm Airport', coordinates: { lat: 27.9794911, lng: 34.3946305 } },
      { location: 'Giza', coordinates: { lat: 29.9707813, lng: 31.1242335 } },
      { location: 'Your Hotel' },
    ])!);

    expect(url.hostname).toBe('www.google.com');
    expect(url.searchParams.get('origin')).toBe('27.979491,34.394630');
    expect(url.searchParams.get('destination')).toBe('27.979491,34.394630');
    expect(url.searchParams.get('waypoints')).toBe('29.970781,31.124233');
  });

  it('returns null rather than geocoding when no coordinate was authored', () => {
    expect(itineraryStoredDirectionsUrl([{ location: 'Giza' }])).toBeNull();
  });
});

describe('itineraryMapStops', () => {
  it('returns nothing when no step has an explicit location', () => {
    expect(itineraryMapStops([{ location: '' }, {}, { location: '   ' }])).toEqual([]);
  });

  it('keeps editor order and drops blank steps', () => {
    expect(itineraryMapStops([
      { location: 'El Gouna' },
      { location: '' },
      { location: 'Valley of the Kings' },
      { location: 'Luxor Temple' },
    ])).toEqual(['El Gouna', 'Valley of the Kings', 'Luxor Temple']);
  });

  it('keeps timeline-only travel labels out of map geocoding', () => {
    expect(itineraryMapStops([
      { location: 'Your Hotel' },
      { location: 'En Route' },
      { location: 'Local Restaurant' },
      { location: 'Luxor Restaurant' },
      { location: 'Cairo Lunch Stop' },
      { location: 'Red Sea' },
      { location: 'On the boat' },
      { location: 'On board' },
      { location: 'Rotes Meer' },
      { location: 'Auf dem Boot' },
      { location: 'البحر الأحمر' },
      { location: 'Luxor' },
      { location: 'Valley of the Kings' },
      { location: 'Unterwegs' },
    ])).toEqual(['Luxor', 'Valley of the Kings']);
  });

  it('treats resort-wide "<city> Hotels" pickup labels as lifecycle stages, not places', () => {
    expect(itineraryMapStops([
      { location: 'Sharm Hotels' },
      { location: 'Hurghada hotels' },
      { location: 'فنادق الغردقة' },
      { location: 'Steigenberger Hotel' },
      { location: 'Cairo' },
    ])).toEqual(['Steigenberger Hotel', 'Cairo']);
  });

  it('folds a round trip back into the start marker', () => {
    expect(itineraryMapStops([
      { location: 'El Gouna' },
      { location: 'Luxor' },
      { location: 'el gouna' },
    ])).toEqual(['El Gouna', 'Luxor']);
  });

  it('renders a stop visited twice only once', () => {
    expect(itineraryMapStops([
      { location: 'Cairo' },
      { location: 'Giza' },
      { location: 'Cairo' },
      { location: 'Saqqara' },
    ])).toEqual(['Cairo', 'Giza', 'Saqqara']);
  });
});

describe('itineraryRouteContextQuery', () => {
  it('prefers a stop that is a city over a city embedded in a later landmark label', () => {
    expect(itineraryRouteContextQuery(
      ['Cairo', 'Giza Plateau', 'Egyptian Museum', 'Khan el-Khalili'],
      'Sharm el-Sheikh',
    )).toBe('Cairo, Egypt');
  });

  it('keeps the embedded-city fallback when no stop is exactly a city', () => {
    expect(itineraryRouteContextQuery(
      ['Orange Bay, Giftun Island', 'Hurghada Marina'],
      'Orange Bay, Giftun Island, Hurghada',
    )).toBe('Hurghada, Egypt');
  });
});

describe('itineraryPickupBaseQuery', () => {
  it('anchors generic pickup/drop-off stages at the published pickup resort', () => {
    expect(itineraryPickupBaseQuery('Sharm el-Sheikh')).toBe('Sharm El-Sheikh, Egypt');
    expect(itineraryPickupBaseQuery('Makadi Bay')).toBe('Makadi Bay, Egypt');
  });

  it('returns nothing without a recognisable city so callers fall back to the route context', () => {
    expect(itineraryPickupBaseQuery('Egypt')).toBeNull();
    expect(itineraryPickupBaseQuery('Some Unknown Village')).toBeNull();
    expect(itineraryPickupBaseQuery('')).toBeNull();
    expect(itineraryPickupBaseQuery(null)).toBeNull();
  });
});

describe('itineraryDirectionsUrl', () => {
  it('uses the visited itinerary city for the external route', () => {
    const url = new URL(itineraryDirectionsUrl(
      ['Luxor', 'Valley of the Kings', 'Karnak'],
      'Makadi Bay',
    ));
    expect(url.searchParams.get('origin')).toBe('Luxor, Egypt');
    expect(url.searchParams.get('destination')).toBe('Karnak, Luxor, Egypt');
    expect(url.searchParams.get('waypoints')).toBe('Valley of the Kings, Luxor, Egypt');
    expect(url.toString()).not.toContain('Makadi');
  });

  it('uses the published city for an ambiguous single stop', () => {
    const url = new URL(itineraryDirectionsUrl(['Citadel'], 'Cairo'));
    expect(url.pathname).toBe('/maps/search/');
    expect(url.searchParams.get('query')).toBe('Citadel, Cairo, Egypt');
  });
});
