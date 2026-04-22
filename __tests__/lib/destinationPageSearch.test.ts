import {
  getDestinationCategories,
  getDestinationPageSearchResults,
  getDestinationTrendingSearches,
} from '@/lib/destinationPageSearch';

describe('destinationPageSearch', () => {
  const destination = {
    _id: 'dest-el-gouna',
    slug: 'abu-tig-marina',
    name: 'Abu Tig Marina',
    description: 'Waterfront dining, yachts, and local marina experiences.',
    country: 'Egypt',
    tourCount: 2,
  };

  const destinationTours = [
    {
      _id: 'tour-1',
      slug: 'el-gouna-kitesurfing',
      title: 'El Gouna Kitesurfing Adventure',
      description: 'Ride the lagoon winds with local instructors.',
      duration: '3 hours',
      image: '/kite.jpg',
      discountPrice: 55,
      destination: { _id: 'dest-el-gouna', name: 'Abu Tig Marina', slug: 'abu-tig-marina' },
      category: { _id: 'cat-kite', name: 'Kitesurfing & Watersports', slug: 'kitesurfing-watersports' },
    },
    {
      _id: 'tour-2',
      slug: 'el-gouna-yacht-cruise',
      title: 'El Gouna Sunset Yacht Cruise',
      description: 'Golden hour sailing around the marina.',
      duration: '2 hours',
      image: '/yacht.jpg',
      discountPrice: 70,
      destination: { _id: 'dest-el-gouna', name: 'Abu Tig Marina', slug: 'abu-tig-marina' },
      category: { _id: 'cat-yacht', name: 'Yacht & Boat Trips', slug: 'yacht-boat-trips' },
    },
  ];

  const allCategories = [
    {
      _id: 'cat-kite',
      slug: 'kitesurfing-watersports',
      name: 'Kitesurfing & Watersports',
      description: 'Wind and water-based activities.',
      tourCount: 1,
    },
    {
      _id: 'cat-yacht',
      slug: 'yacht-boat-trips',
      name: 'Yacht & Boat Trips',
      description: 'Private cruises and boat trips.',
      tourCount: 1,
    },
    {
      _id: 'cat-pyramids',
      slug: 'pyramids-tours',
      name: 'Pyramids Tours',
      description: 'Giza and Saqqara day trips.',
      tourCount: 8,
    },
  ];

  const relatedDestinations = [
    {
      _id: 'dest-downtown',
      slug: 'downtown-el-gouna',
      name: 'Downtown El Gouna',
      description: 'Central squares, cafes, and promenades.',
      country: 'Egypt',
      tourCount: 4,
    },
  ];

  it('returns only categories linked to the destination tours when possible', () => {
    const categories = getDestinationCategories(destinationTours as any, allCategories as any);

    expect(categories.map((category) => category.slug)).toEqual([
      'kitesurfing-watersports',
      'yacht-boat-trips',
    ]);
  });

  it('does not surface unrelated Egypt-wide matches for a local destination query', () => {
    const results = getDestinationPageSearchResults({
      query: 'Pyramids of Giza',
      destination: destination as any,
      destinationTours: destinationTours as any,
      relatedDestinations: relatedDestinations as any,
      allCategories: allCategories as any,
    });

    expect(results.tours).toEqual([]);
    expect(results.destinations).toEqual([]);
    expect(results.categories).toEqual([]);
  });

  it('returns local destination content when the query matches it', () => {
    const results = getDestinationPageSearchResults({
      query: 'kitesurfing',
      destination: destination as any,
      destinationTours: destinationTours as any,
      relatedDestinations: relatedDestinations as any,
      allCategories: allCategories as any,
    });

    expect(results.tours[0]?.slug).toBe('el-gouna-kitesurfing');
    expect(results.categories[0]?.slug).toBe('kitesurfing-watersports');
  });

  it('builds trending searches from destination-local content', () => {
    const trends = getDestinationTrendingSearches({
      destination: destination as any,
      destinationTours: destinationTours as any,
      allCategories: allCategories as any,
    });

    expect(trends).toContain('Abu Tig Marina');
    expect(trends).toContain('Kitesurfing & Watersports');
    expect(trends).not.toContain('Pyramids Tours');
  });
});
