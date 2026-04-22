import {
  findTenantDestinationsByNames,
  findTenantToursByTitles,
  getTenantFeaturedTours,
  getTenantSiteSearchResults,
} from '@/lib/tenantSiteSearch';

describe('tenantSiteSearch', () => {
  const tours = [
    {
      _id: '1',
      slug: 'el-gouna-kitesurfing',
      title: 'El Gouna Kitesurfing Adventure',
      description: 'Ride the lagoon winds with local instructors.',
      location: 'El Gouna',
      isFeatured: true,
      reviewCount: 12,
      discountPrice: 55,
    },
    {
      _id: '2',
      slug: 'el-gouna-yacht-cruise',
      title: 'El Gouna Sunset Yacht Cruise',
      description: 'Golden hour sailing around the marina.',
      location: 'El Gouna Marina',
      reviewCount: 9,
      discountPrice: 70,
    },
  ];

  const destinations = [
    {
      _id: 'd1',
      slug: 'abu-tig-district',
      name: 'Abu Tig District',
      description: 'Dining and nightlife district in El Gouna.',
      country: 'Egypt',
      tourCount: 2,
    },
    {
      _id: 'd2',
      slug: 'downtown-el-gouna',
      name: 'Downtown El Gouna',
      description: 'Town center and local markets.',
      country: 'Egypt',
      tourCount: 1,
    },
  ];

  const categories = [
    {
      _id: 'c1',
      slug: 'kitesurfing-watersports',
      name: 'Kitesurfing & Watersports',
      description: 'Wind and water-based activities.',
      tourCount: 1,
    },
    {
      _id: 'c2',
      slug: 'yacht-boat-trips',
      name: 'Yacht & Boat Trips',
      description: 'Boat trips and private charters.',
      tourCount: 1,
    },
  ];

  it('keeps unrelated cross-Egypt queries out of tenant widget results', () => {
    const results = getTenantSiteSearchResults({
      query: 'Pyramids of Giza',
      tours,
      destinations,
      categories,
    });

    expect(results.tours).toEqual([]);
    expect(results.destinations).toEqual([]);
    expect(results.categories).toEqual([]);
  });

  it('returns matching tenant-local items', () => {
    const results = getTenantSiteSearchResults({
      query: 'kitesurfing',
      tours,
      destinations,
      categories,
    });

    expect(results.tours[0]?.slug).toBe('el-gouna-kitesurfing');
    expect(results.categories[0]?.slug).toBe('kitesurfing-watersports');
  });

  it('prefers featured tours for the default widget suggestions', () => {
    expect(getTenantFeaturedTours(tours as any, 1)[0]?.slug).toBe('el-gouna-kitesurfing');
  });

  it('matches AI follow-up cards against tenant-local tours only', () => {
    const matches = findTenantToursByTitles(
      ['El Gouna Sunset Yacht Cruise', 'Pyramids Tour'],
      tours as any
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.slug).toBe('el-gouna-yacht-cruise');
  });

  it('matches AI destination cards against tenant-local destinations only', () => {
    const matches = findTenantDestinationsByNames(
      ['Downtown El Gouna', 'Giza'],
      destinations as any
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.slug).toBe('downtown-el-gouna');
  });
});
