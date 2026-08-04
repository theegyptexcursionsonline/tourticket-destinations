import { itineraryEmbedMapUrl, itineraryMapStops, itineraryStaticMapUrl } from '@/lib/tours/itineraryMap';

describe('itineraryMapStops', () => {
  it('uses only real editor-entered places and removes duplicates', () => {
    expect(itineraryMapStops([
      { location: 'Your Hotel' },
      { location: 'En Route' },
      { location: 'Luxor' },
      { location: 'Valley of the Kings' },
      { location: 'luxor' },
    ])).toEqual(['Luxor', 'Valley of the Kings']);
  });

  it('filters German travel-stage labels from the map', () => {
    expect(itineraryMapStops([
      { location: 'Ihr Hotel' },
      { location: 'Unterwegs' },
      { location: 'Karnak Temple' },
    ])).toEqual(['Karnak Temple']);
  });
});

describe('itineraryStaticMapUrl', () => {
  it('requires a key and at least two real stops', () => {
    expect(itineraryStaticMapUrl(['Luxor'], 'key')).toBeNull();
    expect(itineraryStaticMapUrl(['Luxor', 'Karnak'], undefined)).toBeNull();
  });

  it('adds Egypt context so ambiguous stops stay on the correct country map', () => {
    const url = itineraryStaticMapUrl(['Luxor', 'Luxor Restaurant'], 'key');
    expect(new URL(url!).searchParams.getAll('markers')).toEqual([
      'size:mid|color:red|label:1|Luxor, Egypt',
      'size:small|color:blue|Luxor Restaurant, Egypt',
    ]);
  });
});

describe('itineraryEmbedMapUrl', () => {
  it('country-scopes the no-key fallback to Egypt', () => {
    expect(itineraryEmbedMapUrl('Luxor Restaurant')).toContain('Luxor%20Restaurant%2C%20Egypt');
  });
});
