import { curateDestinationTours } from '@/lib/content/destinationTourCuration';

const tours = [
  { _id: 'a', isFeatured: true },
  { _id: 'b', isFeatured: true },
  { _id: 'c', isFeatured: false },
  { _id: 'd', isFeatured: false },
];

describe('destination tour curation', () => {
  it('honors curated groups without allowing overlap', () => {
    expect(curateDestinationTours(tours, ['c'], ['c', 'd'])).toEqual({
      bestDeals: [tours[2]],
      topTours: [tours[3]],
    });
  });

  it('falls back to featured deals and excludes them from Top tours', () => {
    expect(curateDestinationTours(tours)).toEqual({
      bestDeals: [tours[0], tours[1]],
      topTours: [tours[2], tours[3]],
    });
  });

  it('ignores stale curated IDs', () => {
    expect(curateDestinationTours(tours, ['missing'], ['missing']).bestDeals).toEqual([tours[0], tours[1]]);
  });
});
