'use client';

import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, SearchBox, Hits, Configure, useInstantSearch } from 'react-instantsearch';
import { AlertCircle, MapPin, Clock, DollarSign, Search as SearchIcon, Star, Sparkles } from 'lucide-react';
import 'instantsearch.css/themes/satellite.css';
import { useState, useEffect } from 'react';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

// Create search client with error handling
const createSearchClient = () => {
  try {
    return algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
  } catch (error) {
    console.error('Failed to create Algolia search client:', error);
    throw error;
  }
};

const searchClient = createSearchClient();

// Empty state component
const EmptyQueryBoundary = ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) => {
  const { indexUiState } = useInstantSearch();

  if (!indexUiState.query) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// No results component
const NoResultsBoundary = ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) => {
  const { results } = useInstantSearch();

  if (!results.__isArtificial && results.nbHits === 0) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default function AlgoliaSearch() {
  const [error, setError] = useState<string | null>(null);

  // Log configuration for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Algolia Search Configuration:', {
        appId: ALGOLIA_APP_ID,
        indexName: INDEX_NAME,
        hasSearchKey: !!ALGOLIA_SEARCH_KEY
      });

      // Verify credentials
      if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY) {
        setError('Algolia credentials are missing. Please check your environment variables.');
        return;
      }
    }
  }, []);

  // Custom Hit component to render tour results
  const Hit = ({ hit }: any) => {
    return (
      <a
        href={`/${hit.slug}`}
        className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all duration-300 hover:-translate-y-1"
      >
        {/* Image */}
        {hit.image && (
          <div className="relative w-full h-48 overflow-hidden bg-slate-100">
            <img
              src={hit.image}
              alt={hit.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            {hit.isFeatured && (
              <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Featured
              </div>
            )}
            {hit.discountPrice && hit.discountPrice < hit.price && (
              <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                Save {Math.round(((hit.price - hit.discountPrice) / hit.price) * 100)}%
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
            {hit.title}
          </h3>

          {hit.description && (
            <p className="text-sm text-slate-600 mb-3 line-clamp-2">{hit.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-slate-500">
            {hit.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                {hit.location}
              </span>
            )}
            {hit.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                {hit.duration}
              </span>
            )}
            {hit.rating && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                {hit.rating} ({hit.reviewCount || 0})
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              {hit.discountPrice && hit.discountPrice < hit.price ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm line-through">${hit.price}</span>
                  <span className="text-blue-600 font-bold text-lg flex items-center gap-0.5">
                    <DollarSign className="w-4 h-4" />
                    {hit.discountPrice}
                  </span>
                </div>
              ) : hit.price ? (
                <span className="text-blue-600 font-bold text-lg flex items-center gap-0.5">
                  <DollarSign className="w-4 h-4" />
                  {hit.price}
                </span>
              ) : null}
            </div>
            <span className="text-blue-600 text-sm font-semibold group-hover:translate-x-1 transition-transform">
              View Details →
            </span>
          </div>
        </div>
      </a>
    );
  };

  // Handle errors
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700 font-medium">Configuration Error</p>
          <p className="text-xs text-red-600 mt-1">Check console for details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50/30">
      <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
        <Configure hitsPerPage={20} />

        {/* Enhanced Search Box */}
        <div className="p-4 sm:p-6 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto">
            <SearchBox
              placeholder="Search for tours in Egypt... (e.g., Pyramids, Nile cruise, Cairo)"
              classNames={{
                root: 'w-full',
                form: 'relative w-full flex items-center gap-2',
                input: 'w-full px-5 py-4 pr-24 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none text-base text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-200',
                submit: 'absolute right-14 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors',
                reset: 'absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors',
                submitIcon: 'w-5 h-5',
                resetIcon: 'w-4 h-4',
              }}
              autoFocus
            />
            <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              AI-powered search • Find perfect tours instantly
            </p>
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <EmptyQueryBoundary
              fallback={
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg mb-4">
                    <SearchIcon className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Start Your Journey</h3>
                  <p className="text-slate-600 mb-6 max-w-md">
                    Search for amazing tours and experiences in Egypt. Try searching for "Pyramids", "Nile", or "Cairo"
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Pyramids of Giza', 'Nile Cruise', 'Luxor Temple', 'Cairo Tours'].map((tag) => (
                      <button
                        key={tag}
                        className="px-4 py-2 bg-white border-2 border-blue-200 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-all"
                        onClick={() => {
                          const input = document.querySelector('.ais-SearchBox-input') as HTMLInputElement;
                          if (input) {
                            input.value = tag;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                          }
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              }
            >
              <NoResultsBoundary
                fallback={
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="bg-slate-100 p-4 rounded-2xl mb-4">
                      <AlertCircle className="w-12 h-12 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Tours Found</h3>
                    <p className="text-slate-600 mb-4 max-w-md">
                      We couldn't find any tours matching your search. Try different keywords or browse our popular destinations.
                    </p>
                  </div>
                }
              >
                <Hits
                  hitComponent={Hit}
                  classNames={{
                    root: 'w-full',
                    list: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6',
                    item: 'list-none',
                  }}
                />
              </NoResultsBoundary>
            </EmptyQueryBoundary>
          </div>
        </div>

        {/* Enhanced CSS styling with stronger specificity */}
        <style jsx global>{`
          /* CRITICAL: Force search box visibility with highest specificity */
          div.ais-SearchBox,
          .ais-InstantSearch .ais-SearchBox {
            width: 100% !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
          }

          div.ais-SearchBox-form,
          .ais-InstantSearch .ais-SearchBox-form {
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            visibility: visible !important;
            opacity: 1 !important;
          }

          input.ais-SearchBox-input,
          .ais-InstantSearch input.ais-SearchBox-input,
          .ais-SearchBox input[type="search"] {
            display: block !important;
            width: 100% !important;
            background: white !important;
            visibility: visible !important;
            opacity: 1 !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            min-height: 48px !important;
          }

          button.ais-SearchBox-submit,
          button.ais-SearchBox-reset,
          .ais-InstantSearch button.ais-SearchBox-submit,
          .ais-InstantSearch button.ais-SearchBox-reset {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            visibility: visible !important;
            opacity: 1 !important;
            background: transparent !important;
            border: none !important;
          }

          svg.ais-SearchBox-submitIcon,
          svg.ais-SearchBox-resetIcon,
          .ais-InstantSearch svg.ais-SearchBox-submitIcon,
          .ais-InstantSearch svg.ais-SearchBox-resetIcon {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }

          /* Hits styling */
          .ais-Hits {
            width: 100%;
          }

          .ais-Hits-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .ais-Hits-item {
            list-style: none;
          }

          /* Remove default Algolia styling that might hide elements */
          .ais-SearchBox *[hidden] {
            display: block !important;
          }

          /* Smooth scrollbar */
          .overflow-y-auto::-webkit-scrollbar {
            width: 8px;
          }

          .overflow-y-auto::-webkit-scrollbar-track {
            background: #f1f5f9;
          }

          .overflow-y-auto::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }

          .overflow-y-auto::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
      </InstantSearch>
    </div>
  );
}
