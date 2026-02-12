'use client';

import { liteClient as algoliasearch } from 'algoliasearch/lite';
import {
  InstantSearch,
  SearchBox,
  Hits,
  RefinementList,
  Stats,
  Pagination,
  Configure
} from 'react-instantsearch';
import { Sparkles, MapPin, Clock, Star } from 'lucide-react';
import 'instantsearch.css/themes/satellite.css';
import Link from 'next/link';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '1F31U1NOMS';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || '90dc77f33842e5ca1ad27ba3e42bbc50';
const INDEX_NAME = 'tours';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

interface FallbackSearchProps {
  initialQuery?: string;
}

// Custom Hit Component for displaying tour results
function TourHit({ hit }: { hit: any }) {
  return (
    <Link href={`/${hit.slug}`} className="block">
      <div className="bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 transition-all hover:shadow-lg p-4 group">
        {/* Tour Image */}
        {hit.image && (
          <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
            <img
              src={hit.image}
              alt={hit.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {hit.isFeatured && (
              <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                Featured
              </div>
            )}
          </div>
        )}

        {/* Tour Details */}
        <div className="space-y-2">
          <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
            {hit.title}
          </h3>

          <p className="text-sm text-slate-600 line-clamp-2">
            {hit.description}
          </p>

          {/* Tour Meta Information */}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {hit.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{hit.location}</span>
              </div>
            )}
            {hit.duration && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{hit.duration} {hit.duration === 1 ? 'day' : 'days'}</span>
              </div>
            )}
            {hit.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span>{hit.rating.toFixed(1)} ({hit.reviewCount || 0})</span>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              {hit.discountPrice && hit.discountPrice < hit.price ? (
                <>
                  <span className="text-lg font-bold text-blue-600">
                    ${hit.discountPrice}
                  </span>
                  <span className="text-sm text-slate-400 line-through">
                    ${hit.price}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-blue-600">
                  ${hit.price}
                </span>
              )}
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all">
              View Tour
            </button>
          </div>

          {/* Category & Destination Tags */}
          <div className="flex flex-wrap gap-2 pt-2">
            {hit.category?.name && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {hit.category.name}
              </span>
            )}
            {hit.destination?.name && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                {hit.destination.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function FallbackSearch({ initialQuery }: FallbackSearchProps) {
  return (
    <div className="w-full">
      <InstantSearch
        searchClient={searchClient}
        indexName={INDEX_NAME}
        initialUiState={{
          [INDEX_NAME]: {
            query: initialQuery || '',
          },
        }}
      >
        <Configure
          hitsPerPage={12}
          attributesToSnippet={['description:50']}
          snippetEllipsisText="..."
        />

        <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 rounded-2xl shadow-2xl border border-blue-100 overflow-hidden backdrop-blur-sm">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md border border-white/30">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Search Tours</h2>
                <p className="text-blue-100 text-sm">Standard search powered by Algolia</p>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-6 bg-white border-b border-slate-200">
            <SearchBox
              placeholder="Search for tours, destinations, activities..."
              classNames={{
                root: 'w-full',
                form: 'relative',
                input: 'w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:outline-none text-base',
                submit: 'absolute right-3 top-1/2 -translate-y-1/2 p-2',
                reset: 'absolute right-12 top-1/2 -translate-y-1/2 p-2',
              }}
            />
            <div className="mt-3">
              <Stats
                classNames={{
                  root: 'text-sm text-slate-600',
                }}
              />
            </div>
          </div>

          {/* Filters and Results */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
            {/* Sidebar Filters */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900 mb-3">Categories</h3>
                <RefinementList
                  attribute="category.name"
                  limit={10}
                  showMore={true}
                  classNames={{
                    root: 'space-y-2',
                    list: 'space-y-2',
                    item: 'flex items-center gap-2 text-sm',
                    checkbox: 'w-4 h-4 text-blue-600 rounded',
                    label: 'flex items-center gap-2 cursor-pointer',
                    count: 'ml-auto text-xs bg-slate-100 px-2 py-0.5 rounded-full',
                  }}
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900 mb-3">Destinations</h3>
                <RefinementList
                  attribute="destination.name"
                  limit={10}
                  showMore={true}
                  classNames={{
                    root: 'space-y-2',
                    list: 'space-y-2',
                    item: 'flex items-center gap-2 text-sm',
                    checkbox: 'w-4 h-4 text-blue-600 rounded',
                    label: 'flex items-center gap-2 cursor-pointer',
                    count: 'ml-auto text-xs bg-slate-100 px-2 py-0.5 rounded-full',
                  }}
                />
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              <Hits
                hitComponent={TourHit}
                classNames={{
                  root: 'w-full',
                  list: 'grid grid-cols-1 md:grid-cols-2 gap-4',
                  item: 'w-full',
                }}
              />

              <div className="mt-8 flex justify-center">
                <Pagination
                  classNames={{
                    root: 'flex gap-2',
                    list: 'flex gap-2',
                    item: 'inline-block',
                    link: 'px-4 py-2 border border-slate-300 rounded-lg hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all',
                    selectedItem: 'bg-blue-500 text-white border-blue-500',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </InstantSearch>
    </div>
  );
}
