// app/api/search/algolia/route.ts
import { NextResponse } from 'next/server';
import { algoliaClient, ALGOLIA_INDEX_NAME } from '@/lib/algolia';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const client = algoliaClient();

    // Fallback to empty results if Algolia is not configured
    if (!client) {
      console.warn('Algolia not configured, returning empty results');
      return NextResponse.json({
        hits: [],
        nbHits: 0,
        page: 0,
        nbPages: 0,
        hitsPerPage: 20
      });
    }

    // Get search parameters
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '0');
    const hitsPerPage = parseInt(searchParams.get('hitsPerPage') || '100'); // Increased to 100 to show more results

    // Build filters
    const filters: string[] = ['isPublished:true'];

    // Categories filter
    const categories = searchParams.get('categories');
    if (categories) {
      const categoryIds = categories.split(',').map(id => id.trim()).filter(Boolean);
      if (categoryIds.length > 0) {
        const categoryFilter = categoryIds.map(id => `category._id:${id}`).join(' OR ');
        filters.push(`(${categoryFilter})`);
      }
    }

    // Destinations filter
    const destinations = searchParams.get('destinations');
    if (destinations) {
      const destIds = destinations.split(',').map(id => id.trim()).filter(Boolean);
      if (destIds.length > 0) {
        const destFilter = destIds.map(id => `destination._id:${id}`).join(' OR ');
        filters.push(`(${destFilter})`);
      }
    }

    // Price range filter
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    if (minPrice || maxPrice) {
      const min = minPrice ? parseFloat(minPrice) : 0;
      const max = maxPrice ? parseFloat(maxPrice) : 999999;
      filters.push(`discountPrice:${min} TO ${max}`);
    }

    // Duration filter
    const durations = searchParams.get('durations');
    if (durations) {
      const durationRanges = durations.split(',').map(range => {
        const [min, max] = range.split('-').map(Number);
        if (!isNaN(min) && !isNaN(max)) {
          return `duration:${min} TO ${max}`;
        }
        return null;
      }).filter(Boolean);

      if (durationRanges.length > 0) {
        filters.push(`(${durationRanges.join(' OR ')})`);
      }
    }

    // Rating filter
    const ratings = searchParams.get('ratings');
    if (ratings) {
      const ratingValues = ratings.split(',').map(Number).filter(n => !isNaN(n));
      if (ratingValues.length > 0) {
        const minRating = Math.min(...ratingValues);
        filters.push(`rating >= ${minRating}`);
      }
    }

    // Combine all filters
    const filterString = filters.join(' AND ');

    // Build search parameters
    const searchOptions: any = {
      filters: filterString,
      page,
      hitsPerPage,
      attributesToRetrieve: [
        'objectID',
        'title',
        'slug',
        'description',
        'location',
        'price',
        'discountPrice',
        'rating',
        'reviewCount',
        'duration',
        'image',
        'images',
        'tags',
        'category',
        'destination',
        'highlights',
        'included',
        'excluded'
      ]
    };

    // Apply sorting
    const sortBy = searchParams.get('sortBy');
    if (sortBy && sortBy !== 'relevance') {
      if (sortBy === 'price-asc') {
        searchOptions.sortBy = 'discountPrice:asc';
      } else if (sortBy === 'price-desc') {
        searchOptions.sortBy = 'discountPrice:desc';
      } else if (sortBy === 'rating') {
        searchOptions.sortBy = 'rating:desc';
      }
    }

    // Perform search using Algolia v5 API
    const results = await client.search({
      requests: [{
        indexName: ALGOLIA_INDEX_NAME,
        query,
        ...searchOptions
      }]
    });

    const searchResults = results.results[0] as any;

    // Transform hits to match expected format
    const transformedHits = searchResults.hits.map((hit: any) => ({
      _id: hit.objectID,
      id: hit.objectID,
      ...hit
    }));

    return NextResponse.json({
      hits: transformedHits,
      nbHits: searchResults.nbHits,
      page: searchResults.page,
      nbPages: searchResults.nbPages,
      hitsPerPage: searchResults.hitsPerPage,
      query: searchResults.query
    });

  } catch (error) {
    console.error('Algolia search error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Search failed',
      hits: [],
      nbHits: 0
    }, { status: 500 });
  }
}
