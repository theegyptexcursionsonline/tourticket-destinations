import { itineraryMapStops, itineraryStaticMapUrl } from '@/lib/tours/itineraryMap';

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
});
