'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Tour as TourType, Category, Destination } from '@/types';
import TourCard from '@/components/user/TourCard';
import { Star, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Header from '@/components/Headersearch';
import Footer from '@/components/Footer';
import AISearchWidget from '@/components/AISearchWidget';

interface SearchClientProps {
  initialTours: TourType[];
  categories: Category[];
  destinations: Destination[];
}

const durationOptions = [
  { label: 'Up to 2 hours', value: '0-2' },
  { label: '2 to 4 hours', value: '2-4' },
  { label: '4 to 6 hours', value: '4-6' },
  { label: '6+ hours', value: '6-24' },
];

const ratingOptions = [
  { value: 5, label: '5 Stars' },
  { value: 4, label: '4 Stars & up' },
  { value: 3, label: '3 Stars & up' },
];

const normalizeArrayParam = (val: string | null | undefined) => {
  if (!val) return [];
  return val
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

const parseNumberArray = (val: string | null | undefined) => {
  if (!val) return [];
  return val
    .split(',')
    .map((s) => Number(s))
    .filter((n) => !Number.isNaN(n));
};

// Skeleton Loader Component
const TourCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    <div className="w-full h-48 bg-slate-200"></div>
    <div className="p-4">
      <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="h-8 bg-slate-200 rounded-full w-1/4"></div>
      </div>
    </div>
  </div>
);

const SearchClient: React.FC<SearchClientProps> = ({ initialTours = [], categories = [], destinations = [] }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filters & UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [selectedDurations, setSelectedDurations] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState('relevance');

  // component logic state
  const [tours, setTours] = useState<TourType[]>(initialTours || []);
  const [isLoading, setIsLoading] = useState(true); // Always start with loading true
  const [isMobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const isFirstMount = useRef(true);
  
  // parse initial filters from URL on mount
  useEffect(() => {
    const q = searchParams?.get('q') ?? '';
    const cats = normalizeArrayParam(searchParams?.get('categories'));
    const dests = normalizeArrayParam(searchParams?.get('destinations'));
    const minPrice = searchParams?.get('minPrice');
    const maxPrice = searchParams?.get('maxPrice');
    const durations = normalizeArrayParam(searchParams?.get('durations'));
    const ratings = parseNumberArray(searchParams?.get('ratings'));
    const sort = searchParams?.get('sortBy') ?? 'relevance';

    setSearchQuery(q);
    setSelectedCategories(cats);
    setSelectedDestinations(dests);
    if (minPrice && maxPrice) {
      const min = Number(minPrice);
      const max = Number(maxPrice);
      if (!Number.isNaN(min) && !Number.isNaN(max)) {
        setPriceRange([min, max]);
      }
    }
    setSelectedDurations(durations);
    setSelectedRatings(ratings);
    setSortBy(sort);
  }, [searchParams]);

  // Debounce input for text search
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
  };
  
  const debouncedQuery = useDebounce(searchQuery, 300);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any[]>>, value: any) => {
    setter((prev: any[]) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));
  };

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedDestinations([]);
    setPriceRange([0, 500]);
    setSelectedDurations([]);
    setSelectedRatings([]);
    setSortBy('relevance');
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  // Fetch tours whenever filters change
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchTours = async () => {
      // On first mount with no params, fetch ALL published tours
      if (isFirstMount.current && searchParams.toString() === '') {
          setIsLoading(true);
          isFirstMount.current = false;
          try {
            const res = await fetch('/api/search/tours', { signal: controller.signal });
            if (!res.ok) throw new Error('Failed to fetch tours');
            const data = await res.json();
            setTours(Array.isArray(data) ? data : []);
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              console.error('Initial tours fetch error:', err);
              setTours([]);
            }
          } finally {
            setIsLoading(false);
          }
          return;
      }
      
      setIsLoading(true);

      const params = new URLSearchParams();

      if (debouncedQuery) params.set('q', debouncedQuery);
      if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','));
      if (selectedDestinations.length > 0) params.set('destinations', selectedDestinations.join(','));
      if (priceRange[0] > 0 || priceRange[1] < 500) {
        params.set('minPrice', String(priceRange[0]));
        params.set('maxPrice', String(priceRange[1]));
      }
      if (selectedDurations.length > 0) params.set('durations', selectedDurations.join(','));
      if (selectedRatings.length > 0) params.set('ratings', selectedRatings.join(','));
      params.set('sortBy', sortBy);

      const newQuery = params.toString();
      router.replace(`${pathname}?${newQuery}`, { scroll: false });

      try {
        // Use MongoDB search directly for better performance and complete results
        // This shows ALL published tours (not limited by Algolia's caps)
        const res = await fetch(`/api/search/tours?${newQuery}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch tours');
        const data = await res.json();
        setTours(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Search fetch error:', err);
          setTours([]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTours();

    return () => {
      controller.abort();
    };
  }, [
    debouncedQuery,
    selectedCategories,
    selectedDestinations,
    priceRange,
    selectedDurations,
    selectedRatings,
    sortBy,
    pathname,
    router,
    searchParams
  ]);

  // --- Render ---
  return (
    <>
      <Header startSolid />

      {/* Hero / Search Section */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">
            Find Your Next Adventure
          </h1>

          {/* Search Input */}
          <div className="relative max-w-2xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tour name, e.g., 'Giza Pyramids'"
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-full focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm"
            />
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <div className="lg:hidden mb-4">
              <button onClick={() => setMobileFiltersOpen(!isMobileFiltersOpen)} className="flex items-center justify-center w-full px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm">
                <SlidersHorizontal className="w-5 h-5 mr-2 text-slate-600" />
                <span>{isMobileFiltersOpen ? 'Hide' : 'Show'} Filters</span>
              </button>
              {isMobileFiltersOpen && <div className="mt-3"><FilterSidebar /></div>}
            </div>
            <div className="hidden lg:block"><FilterSidebar /></div>
          </div>

          <div className="lg:col-span-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 pb-4 border-b border-slate-200">
              <p className="text-sm text-slate-600 mb-2 sm:mb-0">
                {isLoading ? 'Searching...' : `Showing ${tours.length} result(s)`}
              </p>
              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="text-sm font-medium text-slate-700">Sort by:</label>
                <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border-slate-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 text-sm">
                  <option value="relevance">Relevance</option>
                  <option value="rating">Rating</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>
            <TourGrid />
          </div>
        </div>
      </main>

      <Footer />

      {/* AI Search Widget */}
      <AISearchWidget />
    </>
  );
  
  function FilterSidebar() {
      return (
        <aside className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 sticky top-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Filters</h2>
            <button onClick={clearAllFilters} className="text-sm text-red-600 hover:underline">Clear all</button>
          </div>
          <div className="space-y-6">
            {/* Categories */}
            <div>
              <h3 className="font-semibold mb-2">Categories</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {categories.map((category) => (
                  <label key={category._id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(String(category._id))}
                      onChange={() => handleFilterChange(setSelectedCategories, String(category._id))}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-slate-600">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Destinations */}
            <div>
              <h3 className="font-semibold mb-2">Destinations</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {destinations.map((dest) => (
                  <label key={dest._id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDestinations.includes(String(dest._id))}
                      onChange={() => handleFilterChange(setSelectedDestinations, String(dest._id))}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-slate-600">{dest.name}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Price Range */}
            <div>
              <h3 className="font-semibold mb-2">Price Range</h3>
              <input
                type="range"
                min={0}
                max={500}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([0, Number(e.target.value)])}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-slate-500 mt-1">
                <span>$0</span>
                <span>${priceRange[1]}{priceRange[1] === 500 && '+'}</span>
              </div>
            </div>
            {/* Duration */}
            <div>
              <h3 className="font-semibold mb-2">Duration</h3>
              <div className="space-y-2">
                {durationOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDurations.includes(opt.value)}
                      onChange={() => handleFilterChange(setSelectedDurations, opt.value)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-slate-600">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Rating */}
            <div>
              <h3 className="font-semibold mb-2">Rating</h3>
              <div className="space-y-2">
                {ratingOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRatings.includes(opt.value)}
                      onChange={() => handleFilterChange(setSelectedRatings, opt.value)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < opt.value ? 'text-yellow-400' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>
      );
  }
  
  function TourGrid() {
    if (isLoading) {
      // Show skeleton loaders while loading (12 skeletons for better UX)
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <TourCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (!tours || tours.length === 0) {
      return (
        <div className="py-24 text-center">
          <SearchIcon className="h-16 w-16 text-slate-300 mb-4 mx-auto" />
          <h3 className="text-2xl font-bold text-slate-800">No tours found</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">We couldn't find any tours matching your criteria. Try adjusting or clearing your filters.</p>
          <button onClick={clearAllFilters} className="mt-6 px-5 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 shadow-sm">
            Clear Filters
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tours.map((tour) => (
          <TourCard key={String(tour._id ?? tour.id ?? tour.slug ?? Math.random())} tour={tour} />
        ))}
      </div>
    );
  }
};

export default SearchClient;