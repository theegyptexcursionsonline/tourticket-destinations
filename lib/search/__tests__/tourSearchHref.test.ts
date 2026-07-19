import { tourSearchHref } from '../tourSearchHref';

describe('tourSearchHref', () => {
  it('uses the canonical root tour route', () => expect(tourSearchHref('sample-tour')).toBe('/sample-tour'));
  it('keeps non-English locale prefixes', () => expect(tourSearchHref('/sample-tour/', 'de')).toBe('/de/sample-tour'));
});
