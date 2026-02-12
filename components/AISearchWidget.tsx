'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Search, ChevronUp, MapPin, Clock, AlertCircle, Compass, Tag, FileText, MessageCircle, ArrowLeft, Bot, Loader2, ChevronLeft, ChevronRight, DollarSign, Star, Send } from 'lucide-react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import type { SearchResponse } from 'algoliasearch';
import { InstantSearch, Index, useSearchBox, useHits, Configure } from 'react-instantsearch';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useTenant } from '@/contexts/TenantContext';
import 'instantsearch.css/themes/satellite.css';

// --- Algolia Config ---
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';
const INDEX_DESTINATIONS = 'destinations';
const INDEX_CATEGORIES = 'categories';
const INDEX_BLOGS = 'blogs';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';

// Create search client outside component to avoid recreating on every render
const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// Tour card creation helper (unused - kept for potential future use)
const _createTourCardHTML = (tour: any): string => {
  const discountPercent = tour.discountPrice && tour.discountPrice < tour.price
    ? Math.round(((tour.price - tour.discountPrice) / tour.price) * 100)
    : 0;

  return `
    <a href="/${tour.slug || tour.objectID}" target="_blank" rel="noopener noreferrer"
       class="tour-card-link group bg-white border border-blue-100 rounded-lg overflow-hidden hover:shadow-md hover:border-blue-300 transition-all duration-300 block cursor-pointer flex-shrink-0 w-[240px]">
      ${(tour.image || tour.images?.[0] || tour.primaryImage) ? `
        <div class="relative w-full h-32 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
          <img src="${tour.image || tour.images?.[0] || tour.primaryImage}"
               alt="${tour.title || 'Tour'}"
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ${tour.isFeatured ? `
            <div class="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 shadow-md">
              <svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Featured
            </div>
          ` : ''}
          ${discountPercent > 0 ? `
            <div class="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
              -${discountPercent}%
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="p-2.5">
        <h3 class="font-semibold text-xs text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
          ${tour.title || 'Untitled Tour'}
        </h3>

        <div class="flex flex-wrap items-center gap-1.5 mb-2 text-[10px]">
          ${tour.location ? `
            <span class="flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded-full">
              <svg class="w-2.5 h-2.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
              <span class="font-medium text-blue-700">${tour.location}</span>
            </span>
          ` : ''}
          ${tour.duration ? `
            <span class="flex items-center gap-0.5 bg-green-50 px-1.5 py-0.5 rounded-full">
              <svg class="w-2.5 h-2.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span class="font-medium text-green-700">${tour.duration}</span>
            </span>
          ` : ''}
          ${tour.rating ? `
            <span class="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-full">
              <svg class="w-2.5 h-2.5 text-yellow-500 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span class="font-medium text-yellow-700">${tour.rating}</span>
            </span>
          ` : ''}
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100">
          <div class="flex items-center gap-1">
            ${tour.discountPrice && tour.discountPrice < tour.price ? `
              <span class="text-slate-400 text-[10px] line-through">$${tour.price}</span>
              <span class="text-blue-600 font-bold text-base">$${tour.discountPrice}</span>
            ` : tour.price ? `
              <span class="text-blue-600 font-bold text-base">$${tour.price}</span>
            ` : ''}
          </div>
          <span class="text-blue-600 text-[10px] font-semibold group-hover:translate-x-0.5 transition-transform">
            View →
          </span>
        </div>
      </div>
    </a>
  `;
};

// Custom SearchBox component
function CustomSearchBox({ searchQuery, onSearchChange: _onSearchChange }: { searchQuery: string; onSearchChange: (value: string) => void }) {
  const { refine } = useSearchBox();

  useEffect(() => {
    refine(searchQuery);
  }, [searchQuery, refine]);

  return null;
}

// Custom Hits components for each index type
function TourHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);
  const sliderRef = useRef<HTMLDivElement>(null);

  if (limitedHits.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 260;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Transform hits to tour objects for TourCard
  const tours = limitedHits.map((hit: any) => ({
    slug: hit.slug || hit.objectID,
    title: hit.title || 'Untitled Tour',
    image: hit.image || hit.images?.[0] || hit.primaryImage,
    location: hit.location,
    duration: hit.duration,
    rating: hit.rating,
    reviews: hit.reviews,
    price: hit.discountPrice || hit.price,
    isFeatured: hit.isFeatured,
    discountPrice: hit.discountPrice,
    originalPrice: hit.price,
  }));

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <MapPin className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            Tours
          </span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {hits.length}
          </span>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        <div className="relative w-full">
          {tours.length > 1 && (
            <>
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all hover:scale-110"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all hover:scale-110"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          <div
            ref={sliderRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-1"
          >
            {tours.map((tour, idx) => (
              <a
                key={limitedHits[idx].objectID}
                href={`/${tour.slug}`}
                onClick={onHitClick}
                target="_blank"
                rel="noopener noreferrer"
                className="group block flex-shrink-0 w-[260px] bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                {tour.image && (
                  <div className="relative h-36 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
                    <img
                      src={tour.image}
                      alt={tour.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {tour.isFeatured && (
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 shadow-md">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        Featured
                      </div>
                    )}
                    {tour.originalPrice && tour.discountPrice && tour.discountPrice < tour.originalPrice && (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
                        -{Math.round(((tour.originalPrice - tour.discountPrice) / tour.originalPrice) * 100)}%
                      </div>
                    )}
                    {tour.duration && (
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {tour.duration}
                      </div>
                    )}
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                    {tour.title}
                  </h3>
                  {tour.location && (
                    <div className="flex items-center gap-1 text-gray-500 text-[11px] mb-2">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      <span className="line-clamp-1">{tour.location}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      {tour.rating && (
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-[11px] font-medium">{tour.rating}</span>
                          {tour.reviews && <span className="text-[10px] text-gray-400">({tour.reviews})</span>}
                        </div>
                      )}
                    </div>
                    {tour.price && (
                      <div className="flex items-center gap-1">
                        {tour.originalPrice && tour.discountPrice && tour.discountPrice < tour.originalPrice ? (
                          <>
                            <span className="text-gray-400 text-[10px] line-through">${tour.originalPrice}</span>
                            <span className="text-blue-600 font-bold text-base">${tour.discountPrice}</span>
                          </>
                        ) : (
                          <span className="text-blue-600 font-bold text-base">${tour.price}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DestinationHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Compass className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            Destinations
          </span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {hits.length}
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any, _index) => (
        <a
          key={hit.objectID}
          href={`/destinations/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-emerald-500/5 hover:via-teal-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-teal-500/0 to-cyan-500/0 group-hover:from-emerald-500/5 group-hover:via-teal-500/5 group-hover:to-cyan-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              <Compass className="w-6 md:w-7 h-6 md:h-7 text-emerald-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-emerald-600 transition-colors duration-300">
                {hit.name || 'Untitled Destination'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {hit.country && (
                  <span className="bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium">{hit.country}</span>
                )}
                {hit.tourCount && (
                  <span className="bg-emerald-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-emerald-700">
                    {hit.tourCount} tours
                  </span>
                )}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function CategoryHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-purple-500/5 via-fuchsia-500/5 to-pink-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Tag className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            Categories
          </span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {hits.length}
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any, _index) => (
        <a
          key={hit.objectID}
          href={`/categories/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-purple-500/5 hover:via-fuchsia-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-fuchsia-500/0 to-pink-500/0 group-hover:from-purple-500/5 group-hover:via-fuchsia-500/5 group-hover:to-pink-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-purple-50 to-fuchsia-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              <Tag className="w-6 md:w-7 h-6 md:h-7 text-purple-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-purple-600 transition-colors duration-300">
                {hit.name || 'Untitled Category'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5">
                {hit.tourCount && (
                  <span className="bg-purple-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-purple-700">
                    {hit.tourCount} tours
                  </span>
                )}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function BlogHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <FileText className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            Blog Posts
          </span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {hits.length}
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any, _index) => (
        <a
          key={hit.objectID}
          href={`/blog/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-amber-500/5 hover:via-orange-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-orange-500/0 to-red-500/0 group-hover:from-amber-500/5 group-hover:via-orange-500/5 group-hover:to-red-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              <FileText className="w-6 md:w-7 h-6 md:h-7 text-amber-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-amber-600 transition-colors duration-300">
                {hit.title || 'Untitled Blog Post'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {hit.category && (
                  <span className="bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium">{hit.category}</span>
                )}
                {hit.readTime && (
                  <span className="bg-amber-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-amber-700">
                    {hit.readTime} min read
                  </span>
                )}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// Tour Card Component for AI Chat
const TourCard = ({ tour }: { tour: any }) => (
  <a
    href={`/${tour.slug}`}
    target="_blank"
    rel="noopener noreferrer"
    className="group block flex-shrink-0 w-[240px] bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
  >
    {tour.image && (
      <div className="relative h-32 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
        <img
          src={tour.image}
          alt={tour.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {tour.duration && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-medium">
            {tour.duration}
          </div>
        )}
      </div>
    )}
    <div className="p-2.5">
      <h3 className="font-semibold text-xs text-gray-900 mb-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors">
        {tour.title}
      </h3>
      {tour.location && (
        <div className="flex items-center gap-1 text-[10px] mb-1.5">
          <MapPin className="w-2.5 h-2.5 text-gray-400" />
          <span className="line-clamp-1 text-gray-600">{tour.location}</span>
        </div>
      )}
      {tour.rating && (
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
          <span className="text-[10px] font-medium text-gray-900">{tour.rating}</span>
          {tour.reviews && <span className="text-[10px] text-gray-400">({tour.reviews})</span>}
        </div>
      )}
      {tour.price && (
        <div className="flex items-center gap-1 text-blue-600 font-bold text-sm">
          <DollarSign className="w-3 h-3" />
          <span>{tour.price}</span>
        </div>
      )}
    </div>
  </a>
);

// Tour Slider Component for AI Chat
const TourSlider = ({ tours }: { tours: any[] }) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 260;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative w-full">
      {tours.length > 1 && (
        <>
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </>
      )}
      <div
        ref={sliderRef}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-1"
      >
        {tours.map((tour, idx) => (
          <TourCard key={idx} tour={tour} />
        ))}
      </div>
    </div>
  );
};

// Destination Slider Component for AI Chat
const DestinationSlider = ({ destinations }: { destinations: any[] }) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 260;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative w-full">
      {destinations.length > 1 && (
        <>
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </>
      )}
      <div
        ref={sliderRef}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-1"
      >
        {destinations.map((destination, idx) => (
          <a
            key={idx}
            href={`/destinations/${destination.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group block flex-shrink-0 w-[260px] bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            {destination.image && (
              <div className="relative h-36 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
                <img
                  src={destination.image}
                  alt={destination.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                {destination.isFeatured && (
                  <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 shadow-md">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    Featured
                  </div>
                )}
              </div>
            )}
            <div className="p-3">
              <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                {destination.name}
              </h3>
              {destination.description && (
                <p className="text-gray-500 text-[11px] mb-2 line-clamp-2">
                  {destination.description}
                </p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1 text-gray-500 text-[11px]">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  <span>{destination.tourCount || 0} tours</span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default function AISearchWidget() {
  const { getSiteName } = useTenant();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [featuredTours, setFeaturedTours] = useState<any[]>([]);
  const [algoliaError, _setAlgoliaError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic placeholder texts for AI
  const siteName = getSiteName();
  const placeholderTexts = [
    `Try "Best Tours in ${siteName}"`,
    'Ask "Tours under $200 Budget"',
    'Search "Luxury Nile Cruise"',
    `Find "Day trips from ${siteName}"`,
    'Explore "Desert Safari Adventures"',
    'Discover "Family-friendly tours"',
  ];

  // AI SDK Chat Setup
  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `https://${ALGOLIA_APP_ID}.algolia.net/agent-studio/1/agents/${AGENT_ID}/completions?stream=true&compatibilityMode=ai-sdk-5`,
      headers: {
        'x-algolia-application-id': ALGOLIA_APP_ID,
        'x-algolia-api-key': ALGOLIA_SEARCH_KEY,
      },
    }),
  });
  const isGenerating = status === 'submitted' || status === 'streaming';

  // Rotate placeholder text every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderTexts.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [placeholderTexts.length]);

  // Scroll detection - show widget after scrolling past hero section (throttled)
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollThreshold = window.innerHeight * 0.8;
          setIsVisible(window.scrollY > scrollThreshold);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsExpanded(true);
      }
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const searchContainer = target.closest('.ai-search-container');
      const isInputClick = target.closest('.ai-search-input');
      const isResultsClick = target.closest('.motion-div-results');

      if (isExpanded && !searchContainer && !isInputClick && !isResultsClick) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      const timeout = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeout);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isExpanded]);

  // Fetch featured tours from Algolia
  useEffect(() => {
    const fetchFeaturedTours = async () => {
      try {
        const response = await searchClient.search([{
          indexName: INDEX_TOURS,
          params: {
            query: '',
            hitsPerPage: 3,
            filters: 'isFeatured:true',
          }
        }]);
        const firstResult = response.results[0] as SearchResponse<any>;
        if (firstResult?.hits && firstResult.hits.length > 0) {
          setFeaturedTours(firstResult.hits);
        } else {
          // Fallback: fetch any tours if no featured tours
          const fallbackResponse = await searchClient.search([{
            indexName: INDEX_TOURS,
            params: {
              query: '',
              hitsPerPage: 3,
            }
          }]);
          const fallbackResult = fallbackResponse.results[0] as SearchResponse<any>;
          setFeaturedTours(fallbackResult?.hits || []);
        }
      } catch (error) {
        console.error('Error fetching featured tours:', error);
      }
    };
    fetchFeaturedTours();
  }, []);

  // Smart auto-scroll: only scroll if user is already near bottom
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  
  useEffect(() => {
    if (!chatContainerRef.current || !chatMode) return;
    
    const container = chatContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    // Only auto-scroll if user hasn't manually scrolled up or if they're near the bottom
    if (!isUserScrolling || isNearBottom) {
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  }, [messages.length, chatMode, isUserScrolling]);
  
  // Track manual scrolling
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container || !chatMode) return;
    
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      setIsUserScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10;
        if (isAtBottom) {
          setIsUserScrolling(false);
        }
      }, 150);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [chatMode]);

  // Listen for floating button click (openAIAgent event)
  useEffect(() => {
    const openHandler = (e: any) => {
      const query = e.detail?.query || '';
      setIsExpanded(true);
      setChatMode(true);
      if (query) {
        setTimeout(() => sendMessage({ text: query }), 300);
      }
    };

    window.addEventListener('openAIAgent', openHandler);
    return () => window.removeEventListener('openAIAgent', openHandler);
  }, [sendMessage]);

  const handleCloseSearch = () => {
    setIsExpanded(false);
    setSearchQuery('');
    setInputValue('');
  };

  const handleAskAI = () => {
    setChatMode(true);
    if (searchQuery) {
      setTimeout(() => sendMessage({ text: searchQuery }), 300);
      setInputValue('');
    } else {
      setInputValue('');
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (!chatMode) {
      setSearchQuery(value);
    }
  };

  const handleBackToSearch = () => {
    setChatMode(false);
    setInputValue(searchQuery);
  };

  const handleChatSubmit = () => {
    const message = inputValue.trim();
    if (!message) return;
    sendMessage({ text: message });
    setInputValue('');
  };

  // State for detected content - stored per message ID
  const [detectedToursByMessage, setDetectedToursByMessage] = useState<Record<string, any[]>>({});
  const [detectedDestinationsByMessage, setDetectedDestinationsByMessage] = useState<Record<string, any[]>>({});

  // Clear chat function
  const handleClearChat = () => {
    setDetectedToursByMessage({});
    setDetectedDestinationsByMessage({});
    setMessages([]);
    // Optionally scroll to top
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }
  };

  // Parse tour information from text and fetch from Algolia (memoized)
  const detectAndFetchTours = useCallback(async (text: string) => {
    try {
      // Enhanced patterns to match various tour formats
      const tourPatterns = [
        // Matches "Title ($price)" or "Title — $price"
        /(?:^|\n)\s*(?:\d+\.\s*)?(?:Cairo:|Luxor:|Aswan:|Alexandria:|Hurghada:|Sharm El Sheikh:)?\s*([^($\n—]+?)\s+(?:\(\$|—\s*\$)(\d+)\)?/gm,
        // Matches "Tour Name ($price)" or "Tour Name — $price"
        /(?:^|\n)\s*(?:\d+\.\s*)?([A-Z][^($\n—]+?Tour[^($\n—]*?)\s+(?:\(\$|—\s*\$)(\d+)\)?/gm,
        // Matches "**Tour Name** ($price)" or "**Tour Name** — $price"
        /\*\*([^*]+?)\*\*\s+(?:\(\$|—\s*\$)(\d+)\)?/g,
        // Matches any tour-like line with em-dash price like "from Hurghada by Bus — $55"
        /(?:^|\n)\s*(?:\d+\.\s*)?([^—\n]{15,}?)\s+—\s*\$(\d+)/gm,
      ];

      const potentialTours = new Map<string, number>(); // Map of tour title -> price

      for (const pattern of tourPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            const title = match[1].trim().replace(/^(Cairo:|Luxor:|Aswan:|Alexandria:|Hurghada:|Sharm El Sheikh:)\s*/i, '');
            const price = match[2] ? parseInt(match[2]) : 0;
            if (title.length > 10) { // Only consider titles longer than 10 chars
              potentialTours.set(title, price);
            }
          }
        }
      }

      if (potentialTours.size > 0) {
        // Search Algolia for these tours - limit to first 4 mentioned tours
        const toursArray = Array.from(potentialTours.entries()).slice(0, 4);
        const searchPromises = toursArray.map(async ([tourTitle, _price]) => {
          try {
            // First try exact title match
            let response = await searchClient.search([{
              indexName: INDEX_TOURS,
              params: {
                query: tourTitle,
                hitsPerPage: 1, // Only get 1 result per tour
              }
            }]);
            let firstResult = response.results[0] as SearchResponse<any>;

            // If no results, try with just keywords
            if (!firstResult?.hits?.length) {
              const keywords = tourTitle.split(/\s+/).filter(w => w.length > 3).slice(0, 4).join(' ');
              response = await searchClient.search([{
                indexName: INDEX_TOURS,
                params: {
                  query: keywords,
                  hitsPerPage: 1, // Only get 1 result per tour
                }
              }]);
              firstResult = response.results[0] as SearchResponse<any>;
            }

            return firstResult?.hits?.[0];
          } catch (error) {
            console.error('Error searching for tour:', tourTitle, error);
            return null;
          }
        });

        const tours = (await Promise.all(searchPromises)).filter(Boolean);
        if (tours.length > 0) {
          // Remove duplicates based on slug/objectID
          const uniqueTours = tours.reduce((acc: any[], tour: any) => {
            const tourId = tour.slug || tour.objectID;
            if (!acc.find(t => (t.slug || t.objectID) === tourId)) {
              acc.push(tour);
            }
            return acc;
          }, []);

          // Transform tours to ensure they have the right structure
          const transformedTours = uniqueTours.map((tour: any) => ({
            slug: tour.slug || tour.objectID,
            title: tour.title || 'Untitled Tour',
            image: tour.image || tour.images?.[0] || tour.primaryImage,
            location: tour.location,
            duration: tour.duration,
            rating: tour.rating,
            reviews: tour.reviews,
            price: tour.discountPrice || tour.price,
          }));
          return transformedTours;
        }
      }
    } catch (error) {
      console.error('Error detecting tours:', error);
    }
    return [];
  }, []); // No dependencies - function is stable

  // Parse destination information from text and fetch from Algolia (memoized)
  const detectAndFetchDestinations = useCallback(async (text: string) => {
    try {
      // Pattern to match destinations mentioned in the response
      const destinationNames = new Map<string, boolean>();

      // Common Egypt destinations to look for
      const egyptDestinations = ['Cairo', 'Luxor', 'Aswan', 'Alexandria', 'Hurghada', 'Sharm El Sheikh', 'Dahab', 'Makadi Bay', 'Marsa Alam', 'El Gouna'];

      for (const dest of egyptDestinations) {
        // Check multiple patterns:
        // 1. "Cairo:" (with colon)
        // 2. Just "Cairo" as a heading or in numbered list
        // 3. "**Cairo**" (bold)
        const patterns = [
          new RegExp(`(?:^|\\n)\\s*(?:\\d+\\.\\s*)?${dest}:`, 'im'),
          new RegExp(`(?:^|\\n)\\s*(?:\\d+\\.\\s*\\n)?\\s*${dest}\\s*(?:\\n|$)`, 'im'),
          new RegExp(`\\*\\*${dest}\\*\\*`, 'im')
        ];

        if (patterns.some(pattern => pattern.test(text))) {
          destinationNames.set(dest, true);
        }
      }

      if (destinationNames.size > 0) {
        // Search Algolia for these destinations
        const destsArray = Array.from(destinationNames.keys()).slice(0, 4);
        const searchPromises = destsArray.map(async (destName) => {
          try {
            const response = await searchClient.search([{
              indexName: INDEX_DESTINATIONS,
              params: {
                query: destName,
                hitsPerPage: 1,
              }
            }]);
            const firstResult = response.results[0] as SearchResponse<any>;
            return firstResult?.hits?.[0];
          } catch (error) {
            console.error('Error searching for destination:', destName, error);
            return null;
          }
        });

        const destinations = (await Promise.all(searchPromises)).filter(Boolean);
        if (destinations.length > 0) {
          // Remove duplicates based on slug/objectID
          const uniqueDestinations = destinations.reduce((acc: any[], dest: any) => {
            const destId = dest.slug || dest.objectID;
            if (!acc.find(d => (d.slug || d.objectID) === destId)) {
              acc.push(dest);
            }
            return acc;
          }, []);

          // Transform destinations to ensure they have the right structure
          const transformedDestinations = uniqueDestinations.map((dest: any) => ({
            slug: dest.slug || dest.objectID,
            name: dest.name || 'Untitled Destination',
            image: dest.image || dest.images?.[0] || dest.primaryImage,
            description: dest.description,
            tourCount: dest.tourCount || 0,
            isFeatured: dest.isFeatured,
          }));
          return transformedDestinations;
        }
      }
    } catch (error) {
      console.error('Error detecting destinations:', error);
    }
    return [];
  }, []); // No dependencies - function is stable

  // Render tool outputs (tours)
  const renderToolOutput = useCallback((obj: any) => {
    if (Array.isArray(obj)) {
      const tours = obj.filter(item => item.title && item.slug);
      if (tours.length > 0) return <TourSlider tours={tours} />;
    }
    if (obj.title && obj.slug) return <TourSlider tours={[obj]} />;
    if (obj.hits && Array.isArray(obj.hits)) {
      const tours = obj.hits.filter((item: any) => item.title && item.slug);
      if (tours.length > 0) return <TourSlider tours={tours} />;
    }
    return (
      <pre className="bg-gray-900 text-gray-100 p-2 rounded-lg text-[10px] overflow-x-auto">
        {JSON.stringify(obj, null, 2)}
      </pre>
    );
  }, []);

  // Detect tours and destinations in messages (optimized to avoid lag)
  useEffect(() => {
    // Skip if currently generating to avoid processing incomplete messages
    if (isGenerating) return;
    const lastMessage = messages[messages.length - 1];

    // Skip if it's a user message
    if (!lastMessage || lastMessage.role === 'user') {
      return;
    }

    if (lastMessage.role === 'assistant') {
      // Skip if we've already processed this message
      const messageId = lastMessage.id;
      if (detectedToursByMessage[messageId] || detectedDestinationsByMessage[messageId]) {
        return;
      }

      const textParts = lastMessage.parts.filter((p: any) => p.type === 'text');
      const fullText = textParts.map((p: any) => p.text).join(' ');

      // Detect if it's a destination-focused response (no prices, mentions destinations)
      const hasDestinationPattern = /destination/i.test(fullText) &&
                                    !(/\$\d+/i.test(fullText)) &&
                                    (/(?:^|\n)\s*(?:\d+\.\s*)?\s*(?:Cairo|Luxor|Aswan|Alexandria|Hurghada|Sharm|Dahab)/im.test(fullText) ||
                                     /\*\*(?:Cairo|Luxor|Aswan|Alexandria|Hurghada|Sharm|Dahab)\*\*/i.test(fullText));

      // Detect if it's a tour-focused response (has prices)
      const hasTourPattern = /\$\d+/i.test(fullText) ||
                            (/tour/i.test(fullText) && /\(\$\d+\)/i.test(fullText));

      if (hasDestinationPattern) {
        // Fetch destinations and store them for this specific message
        detectAndFetchDestinations(fullText).then(destinations => {
          if (destinations.length > 0) {
            setDetectedDestinationsByMessage(prev => ({
              ...prev,
              [messageId]: destinations
            }));
          }
        });
      } else if (hasTourPattern) {
        // Fetch tours and store them for this specific message
        detectAndFetchTours(fullText).then(tours => {
          if (tours.length > 0) {
            setDetectedToursByMessage(prev => ({
              ...prev,
              [messageId]: tours
            }));
          }
        });
      }
    }
  }, [messages, isGenerating, detectAndFetchTours, detectAndFetchDestinations, detectedToursByMessage, detectedDestinationsByMessage]);

  // Memoize ReactMarkdown components to avoid recreation on every render
  const markdownComponents = useMemo(() => ({
    p: ({ node: _node, ...props }: any) => <p className="text-gray-700 text-sm sm:text-base mb-2 leading-relaxed last:mb-0" {...props} />,
    strong: ({ node: _node, ...props }: any) => <strong className="font-semibold text-gray-900" {...props} />,
    h1: ({ node: _node, ...props }: any) => <h1 className="text-xl font-bold text-gray-900 mb-3" {...props} />,
    h2: ({ node: _node, ...props }: any) => <h2 className="text-lg font-bold text-gray-900 mb-2" {...props} />,
    h3: ({ node: _node, ...props }: any) => <h3 className="text-base font-semibold text-gray-900 mb-2" {...props} />,
    ul: ({ node: _node, ...props }: any) => <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm" {...props} />,
    ol: ({ node: _node, ...props }: any) => <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm" {...props} />,
  }), []);

  // Render message content (memoized)
  const renderContent = useCallback((parts: any[], hideDetails: boolean = false, isUser: boolean = false, showSkeleton: boolean = false) => {
    // If we should show skeleton, show tour card skeletons
    if (showSkeleton) {
      return (
        <div key="skeleton" className="space-y-3">
          <div className="text-gray-700 text-sm sm:text-base leading-relaxed">
            Looking for tours...
          </div>
          <div className="flex gap-3 overflow-x-hidden py-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-[260px] bg-white rounded-xl overflow-hidden border shadow-sm animate-pulse">
                <div className="h-36 bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-3 bg-gray-200 rounded w-12" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return parts.map((p: any, idx: number) => {
      if (p.type === 'tool-result') {
        try {
          const obj = JSON.parse(p.text);
          return <div key={idx} className="my-2">{renderToolOutput(obj)}</div>;
        } catch {
          return <pre key={idx} className="text-[10px]">{p.text}</pre>;
        }
      }
      if (p.type === 'text') {
        // User message styling
        if (isUser) {
          return (
            <div key={idx} className="text-white text-sm sm:text-base leading-relaxed">
              {p.text}
            </div>
          );
        }

        // If we have detected tours, show a simplified version of the text
        if (hideDetails) {
          // Extract just the intro text before the tour listings
          const lines = p.text.split('\n');
          const introLines = [];
          let foundTourContent = false;

          for (const line of lines) {
            const trimmed = line.trim();

            // Stop when we hit tour-related content
            if (
              // Lines starting with city names and colon
              /^(?:Luxor|Cairo|Aswan|Alexandria|Hurghada|Sharm El Sheikh|Makadi Bay|From):/i.test(trimmed) ||
              // Lines starting with numbers (like "1.", "2.", "3.", or just "1", "2")
              /^(\d+[\.\)]\s*|^\d+\s*$)/.test(trimmed) ||
              // Lines containing "Duration:", "Highlights:", "Why you'll love it:", "Price:", "Perfect for:"
              /^(?:Duration|Highlights?|Why you'?ll love it|Price|From|Perfect for):/i.test(trimmed) ||
              // Lines that look like tour names with prices
              /\(\$\d+\)/.test(trimmed) ||
              // Lines starting with bold tour names or headings
              /^\*\*[A-Z]/.test(trimmed) ||
              // Lines that are likely tour titles (capitalized, longer than 10 chars)
              /^[A-Z][a-zA-Z\s]{10,}(?:Tour|Day|Trip|Experience|Adventure)/.test(trimmed) ||
              // Bullet points with tour info
              /^[•\-\*]\s*(?:Price|Duration|Highlights|Perfect)/i.test(trimmed)
            ) {
              foundTourContent = true;
              break;
            }

            introLines.push(line);
          }

          const introText = introLines.join('\n').trim();

          // If we found tour content but no good intro, or intro is too short, show a generic message
          if (foundTourContent && (!introText || introText.length < 20)) {
            return (
              <div key={idx} className="text-gray-700 text-sm sm:text-base mb-2 leading-relaxed">
                Here are some tours I found for you:
              </div>
            );
          }

          // If we have a good intro, show it
          if (introText && introText.length >= 20) {
            return (
              <div key={idx} className="prose prose-sm max-w-none leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={markdownComponents}
                >
                  {introText}
                </ReactMarkdown>
              </div>
            );
          }

          // Otherwise show generic message
          return (
            <div key={idx} className="text-gray-700 text-sm sm:text-base mb-2 leading-relaxed">
              Here are some tours I found for you:
            </div>
          );
        }

        return (
          <div key={idx} className="prose prose-sm max-w-none leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={markdownComponents}
            >
              {p.text}
            </ReactMarkdown>
          </div>
        );
      }
      return null;
    });
  }, [markdownComponents]);

  // Don't render anything if not visible
  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop Blur Overlay */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="fixed inset-0 z-[10] cursor-pointer"
            style={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(0, 0, 0, 0.15)',
              pointerEvents: 'auto'
            }}
          />
        )}
      </AnimatePresence>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex fixed bottom-4 md:bottom-6 left-0 right-0 z-[15] justify-center px-3 md:px-6 pointer-events-none"
      >
        <div className="w-full max-w-2xl pointer-events-auto">
          <div className="ai-search-container relative">

            {/* Search Results Panel Above Search Bar */}
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.94 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="absolute bottom-full mb-3 left-0 right-0 rounded-2xl md:rounded-3xl overflow-hidden motion-div-results"
                  style={{
                    padding: '2px',
                    background: 'linear-gradient(135deg, #3b82f6, #06b6d4, #10b981, #f59e0b, #ef4444, #ec4899, #8b5cf6)',
                    backgroundSize: '400% 400%',
                    animation: 'gradientBorder 8s ease infinite',
                  }}
                >
                  <div
                    className="rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl"
                    style={{
                      height: chatMode ? '70vh' : '60vh',
                      maxHeight: chatMode ? '70vh' : '60vh',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.96))',
                      backdropFilter: 'blur(40px) saturate(200%)',
                      WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                      boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 0 rgba(0, 0, 0, 0.05)'
                    }}
                  >
                  {/* Search Results Content */}
                  <div className="flex flex-col" style={{ height: '100%' }}>
                    {/* Header */}
                    <div className="px-3 md:px-4 py-2.5 md:py-3 border-b backdrop-blur-xl relative overflow-hidden"
                      style={{
                        borderColor: 'rgba(229, 231, 235, 0.5)',
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6), rgba(249, 250, 251, 0.5))',
                        boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 1px 2px rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      {/* Animated gradient underline - CSS only */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-[1px] animated-underline"
                        style={{
                          background: 'linear-gradient(90deg, transparent, #3b82f6, #ef4444, #8b5cf6, transparent)',
                          backgroundSize: '200% 100%',
                          opacity: 0.3,
                          willChange: 'background-position'
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          {chatMode && (
                            <button
                              onClick={handleBackToSearch}
                              className="mr-1 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <ArrowLeft className="w-3 md:w-3.5 h-3 md:h-3.5 text-gray-600" strokeWidth={2.5} />
                            </button>
                          )}
                          {chatMode ? (
                            <>
                              <Bot className="w-3 md:w-3.5 h-3 md:h-3.5 text-blue-500" strokeWidth={2.5} />
                              <span className="text-[11px] md:text-xs font-semibold text-gray-700">
                                AI Travel Assistant
                              </span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 md:w-3.5 h-3 md:h-3.5 text-blue-500" strokeWidth={2.5} />
                              <span className="text-[11px] md:text-xs font-semibold text-gray-700">
                                {searchQuery ? 'Search Results' : 'Featured Tours'}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 md:gap-1.5">
                          {chatMode && messages.length > 0 && (
                            <motion.button
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              onClick={handleClearChat}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-200 relative overflow-hidden"
                              style={{
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(249, 250, 251, 0.6))',
                                border: '1px solid rgba(229, 231, 235, 0.6)',
                                boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
                                color: '#3b82f6'
                              }}
                            >
                              <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                              <span className="hidden sm:inline">New Chat</span>
                            </motion.button>
                          )}
                          {searchQuery && !chatMode && (
                            <motion.button
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              onClick={handleAskAI}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-white transition-all duration-200"
                              style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                boxShadow: '0 4px 12px -2px rgba(59, 130, 246, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                              }}
                            >
                              <MessageCircle className="w-3 h-3" strokeWidth={2.5} />
                              <span>Ask AI</span>
                            </motion.button>
                          )}
                          <button
                            onClick={() => setIsExpanded(false)}
                            className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-1.5 rounded-lg hover:bg-white/50"
                          >
                            <X className="w-3.5 md:w-4 h-3.5 md:h-4" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Results Area */}
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto apple-scrollbar" style={{ minHeight: 0 }}>
                      {chatMode ? (
                        /* Chat Interface */
                        <div className="p-3 space-y-2.5 min-h-0">
                          {messages.length === 0 && (
                            <div className="space-y-3">
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className="relative rounded-2xl overflow-hidden"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(249, 250, 251, 0.9))',
                                  border: '1px solid rgba(229, 231, 235, 0.6)',
                                  boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)'
                                }}
                              >
                                <div className="p-4">
                                  <div className="flex items-start gap-2.5 mb-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                      <Bot className="text-white" size={16} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-bold text-gray-900 text-sm sm:text-base mb-1">
                                        Hi! I'm your AI Egypt Travel Assistant
                                      </p>
                                      <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                                        Ask me anything — I'll help you find tours, trips, prices, destinations & more.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                {/* Decorative gradient line */}
                                <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                              </motion.div>

                              {/* Ready-to-use Prompt Cards */}
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                              >
                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                                  ✨ Try these prompts
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {[
                                    { icon: '🏛️', text: 'Best tours in Cairo under $100', category: 'Budget' },
                                    { icon: '🚢', text: 'Luxury Nile cruise packages', category: 'Luxury' },
                                    { icon: '🏜️', text: 'Desert safari adventures', category: 'Adventure' },
                                    { icon: '👨‍👩‍👧', text: 'Family-friendly Egypt tours', category: 'Family' },
                                    { icon: '⏱️', text: 'Day trips from Cairo', category: 'Quick' },
                                    { icon: '🌟', text: 'Most popular tours this month', category: 'Popular' }
                                  ].map((prompt, idx) => (
                                    <motion.button
                                      key={idx}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.2, delay: 0.15 + (idx * 0.05) }}
                                      onClick={() => sendMessage({ text: prompt.text })}
                                      whileHover={{ scale: 1.02, y: -2 }}
                                      whileTap={{ scale: 0.98 }}
                                      className="group relative p-3 rounded-xl text-left transition-all duration-200"
                                      style={{
                                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.8))',
                                        border: '1px solid rgba(229, 231, 235, 0.6)',
                                        boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)'
                                      }}
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className="text-lg leading-none">{prompt.icon}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold text-gray-800 mb-0.5 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                            {prompt.text}
                                          </p>
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-blue-50 text-blue-600">
                                            {prompt.category}
                                          </span>
                                        </div>
                                      </div>
                                      {/* Hover arrow */}
                                      <motion.div
                                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                                        initial={{ x: -5 }}
                                        whileHover={{ x: 0 }}
                                      >
                                        <ChevronRight className="w-3.5 h-3.5 text-blue-500" strokeWidth={2.5} />
                                      </motion.div>
                                    </motion.button>
                                  ))}
                                </div>
                              </motion.div>
                            </div>
                          )}

                          {messages.map((m, mIdx) => {
                            const isLastAssistantMessage = m.role === 'assistant' && mIdx === messages.length - 1;
                            const messageTours = detectedToursByMessage[m.id] || [];
                            const messageDestinations = detectedDestinationsByMessage[m.id] || [];
                            const hasDetectedTours = messageTours.length > 0;
                            const hasDetectedDestinations = messageDestinations.length > 0;
                            const hasDetectedContent = hasDetectedTours || hasDetectedDestinations;
                            const isUser = m.role === 'user';

                            // Check if this message is currently streaming and has content patterns
                            const isStreaming = isLastAssistantMessage && isGenerating;
                            const textParts = m.parts.filter((p: any) => p.type === 'text');
                            const fullText = textParts.map((p: any) => p.text).join(' ');
                            const hasContentPattern = /\$\d+/i.test(fullText) ||
                                                     /tour/i.test(fullText) ||
                                                     /destination/i.test(fullText) ||
                                                     /cairo|luxor|aswan|alexandria|pyramid|sphinx|nile/i.test(fullText);
                            const shouldShowSkeleton = isStreaming && hasContentPattern;

                            return (
                              <div key={m.id}>
                                <div
                                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`max-w-[85%] px-4 py-3 rounded-2xl relative ${
                                      isUser
                                        ? 'text-white shadow-xl'
                                        : 'bg-white text-gray-800 shadow-md'
                                    }`}
                                    style={
                                      isUser
                                        ? {
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                            boxShadow: '0 8px 24px -4px rgba(59, 130, 246, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                                          }
                                        : {
                                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(249, 250, 251, 0.9))',
                                            border: '1px solid rgba(229, 231, 235, 0.6)',
                                            boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)'
                                          }
                                    }
                                  >
                                    {renderContent(m.parts, hasDetectedContent, isUser, shouldShowSkeleton)}
                                  </div>
                                </div>
                                {/* Show detected tours or destinations for this message (only when not streaming) */}
                                {!isStreaming && (
                                  <>
                                    {hasDetectedTours && (
                                      <div className="mt-3 mb-2">
                                        <TourSlider tours={messageTours} />
                                      </div>
                                    )}
                                    {hasDetectedDestinations && (
                                      <div className="mt-3 mb-2">
                                        <DestinationSlider destinations={messageDestinations} />
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}

                          {isGenerating && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
                              style={{
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(249, 250, 251, 0.9))',
                                border: '1px solid rgba(229, 231, 235, 0.6)',
                                boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)'
                              }}
                            >
                              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" strokeWidth={2.5} />
                              <span className="text-xs font-semibold text-gray-700">AI is thinking…</span>
                            </motion.div>
                          )}
                        </div>
                      ) : algoliaError ? (
                        <div className="p-16 text-center">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="inline-flex items-center justify-center w-20 h-20 rounded-[22px] bg-gradient-to-br from-red-50 to-red-100 mb-5 shadow-lg shadow-red-500/10"
                          >
                            <AlertCircle className="w-10 h-10 text-red-500" strokeWidth={2.5} />
                          </motion.div>
                          <p className="text-sm font-semibold text-red-600 mb-2">Search Error</p>
                          <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">{algoliaError}</p>
                        </div>
                      ) : searchQuery ? (
                        <InstantSearch searchClient={searchClient} indexName={INDEX_TOURS}>
                          <CustomSearchBox
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                          />

                          <Index indexName={INDEX_TOURS}>
                            <Configure hitsPerPage={5} />
                            <TourHits onHitClick={handleCloseSearch} limit={5} />
                          </Index>

                          <Index indexName={INDEX_DESTINATIONS}>
                            <Configure hitsPerPage={5} />
                            <DestinationHits onHitClick={handleCloseSearch} limit={5} />
                          </Index>

                          <Index indexName={INDEX_CATEGORIES}>
                            <Configure hitsPerPage={5} />
                            <CategoryHits onHitClick={handleCloseSearch} limit={5} />
                          </Index>

                          <Index indexName={INDEX_BLOGS}>
                            <Configure hitsPerPage={5} />
                            <BlogHits onHitClick={handleCloseSearch} limit={5} />
                          </Index>
                        </InstantSearch>
                      ) : (
                        <div>
                          {featuredTours.length > 0 ? (
                            featuredTours.map((tour, _index) => (
                              <a
                                key={tour.objectID}
                                href={`/${tour.slug || tour.objectID}`}
                                onClick={handleCloseSearch}
                                className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-blue-500/5 hover:via-indigo-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-indigo-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:via-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-500" />
                                <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
                                  <div className="w-14 md:w-20 h-14 md:h-20 rounded-xl md:rounded-2xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
                                    {(tour.image || tour.images?.[0] || tour.primaryImage) ? (
                                      <img
                                        src={tour.image || tour.images?.[0] || tour.primaryImage}
                                        alt={tour.title || 'Tour'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200"><svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
                                        <MapPin className="w-8 h-8 text-blue-600" strokeWidth={2.5} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 line-clamp-2 md:truncate group-hover:text-blue-600 transition-colors duration-300">
                                      {tour.title || 'Untitled Tour'}
                                    </div>
                                    <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                                      {tour.location && (
                                        <span className="flex items-center gap-1 md:gap-1.5 bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg">
                                          <MapPin className="w-2.5 md:w-3 h-2.5 md:h-3 text-gray-400" strokeWidth={2.5} />
                                          <span className="font-medium">{tour.location}</span>
                                        </span>
                                      )}
                                      {tour.duration && (
                                        <span className="flex items-center gap-1 md:gap-1.5 bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg">
                                          <Clock className="w-2.5 md:w-3 h-2.5 md:h-3 text-gray-400" strokeWidth={2.5} />
                                          <span className="font-medium">{tour.duration} days</span>
                                        </span>
                                      )}
                                      {(tour.price || tour.discountPrice) && (
                                        <span className="flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-bold text-blue-600 text-[10px] md:text-xs">
                                          ${tour.discountPrice || tour.price}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </a>
                            ))
                          ) : (
                            <div className="p-16 text-center">
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="inline-flex items-center justify-center w-20 h-20 rounded-[22px] bg-gradient-to-br from-blue-50 to-indigo-100 mb-5 shadow-lg shadow-blue-500/10"
                              >
                                <Sparkles className="w-10 h-10 text-blue-500" strokeWidth={2.5} />
                              </motion.div>
                              <p className="text-sm font-medium text-gray-600">No featured tours</p>
                              <p className="text-xs text-gray-400 mt-1">Check back later for updates</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Chat Input OR Ask AI Button */}
                    {!chatMode && searchQuery ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="border-t px-3 md:px-4 py-2.5 md:py-3 backdrop-blur-xl relative overflow-hidden"
                        style={{
                          borderColor: 'rgba(229, 231, 235, 0.5)',
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6), rgba(249, 250, 251, 0.5))',
                          boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8)'
                        }}
                      >
                        <button
                          onClick={handleAskAI}
                          className="w-full group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            boxShadow: '0 8px 24px -4px rgba(59, 130, 246, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          <div className="relative px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-center gap-2">
                            <MessageCircle className="w-4 md:w-4.5 h-4 md:h-4.5 text-white" strokeWidth={2.5} />
                            <div className="text-white font-bold text-xs md:text-sm truncate">
                              Ask AI about "{searchQuery.slice(0, 25)}{searchQuery.length > 25 ? '...' : ''}"
                            </div>
                            <Sparkles className="w-3.5 md:w-4 h-3.5 md:h-4 text-white/90 hidden sm:block" strokeWidth={2.5} />
                          </div>
                        </button>
                      </motion.div>
                    ) : null}

                    {/* Trending Section */}
                    {!searchQuery && !chatMode && (
                      <div className="border-t px-3 md:px-4 py-2.5 md:py-3 backdrop-blur-xl relative overflow-hidden"
                        style={{
                          borderColor: 'rgba(229, 231, 235, 0.5)',
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6), rgba(249, 250, 251, 0.5))',
                          boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8)'
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                            <Sparkles className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                          </div>
                          <span className="text-[11px] font-bold text-gray-800">
                            Trending Searches
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['Pyramids', 'Nile Cruise', 'Desert Safari', 'Luxor', 'Tours under $100'].map((trend, index) => (
                            <motion.button
                              key={trend}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.04, duration: 0.15 }}
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setSearchQuery(trend);
                                setInputValue(trend);
                              }}
                              className="px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-200"
                              style={{
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.8))',
                                border: '1px solid rgba(229, 231, 235, 0.6)',
                                boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
                                color: '#4b5563'
                              }}
                            >
                              {trend}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Bar - Always Visible */}
            <motion.div
              whileHover={{ y: -4, scale: 1.012 }}
              whileTap={{ scale: 0.988 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative group"
            >
              <div className="absolute -inset-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div
                  className="absolute inset-0 rounded-full blur-xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%)',
                  }}
                />
              </div>

              <div className="relative rounded-full" style={{ padding: isExpanded ? '2px' : '0' }}>
                {isExpanded && (
                  <>
                    {/* Animated Gradient Border - Apple/Google Style - Optimized */}
                    <div
                      className="absolute inset-0 rounded-full animated-gradient-border"
                      style={{
                        background: 'linear-gradient(90deg, #3b82f6, #06b6d4, #10b981, #f59e0b, #ef4444, #ec4899, #8b5cf6, #3b82f6)',
                        backgroundSize: '400% 100%',
                        willChange: 'background-position',
                      }}
                    />
                    {/* Outer Glow Effect - Simplified */}
                    <div
                      className="absolute -inset-1 rounded-full blur-lg animated-glow"
                      style={{
                        background: 'linear-gradient(90deg, rgba(59,130,246,0.4), rgba(239,68,68,0.4), rgba(139,92,246,0.4))',
                        backgroundSize: '300% 100%',
                        opacity: 0.5,
                        willChange: 'background-position',
                      }}
                    />
                  </>
                )}

                <div
                  className={`relative rounded-full transition-all duration-700 ${
                    isExpanded
                      ? 'shadow-2xl'
                      : 'shadow-lg hover:shadow-xl'
                  }`}
                  style={{
                    background: isExpanded
                      ? 'linear-gradient(135deg, rgba(249, 250, 251, 0.99), rgba(243, 244, 246, 0.97))'
                      : 'linear-gradient(135deg, rgba(249, 250, 251, 0.96), rgba(243, 244, 246, 0.94))',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: isExpanded ? 'none' : '1.5px solid rgba(209, 213, 219, 0.5)',
                    boxShadow: isExpanded
                      ? '0 20px 50px -12px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.6) inset'
                      : '0 8px 24px -4px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.4) inset'
                  }}
                >
                  <div className="relative">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onFocus={() => setIsExpanded(true)}
                      onKeyDown={(e) => {
                        if (chatMode && e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleChatSubmit();
                        }
                      }}
                      placeholder={chatMode ? 'Ask anything about Egypt, tours, prices…' : placeholderTexts[placeholderIndex]}
                      className="ai-search-input w-full pl-14 md:pl-16 pr-24 md:pr-28 py-3.5 md:py-4 text-sm md:text-[15px] font-semibold text-gray-900 placeholder-gray-400 bg-transparent outline-none cursor-text relative z-10 rounded-full tracking-tight"
                    />

                    <div className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 z-10">
                      <div
                        className="relative w-8 md:w-9 h-8 md:h-9 rounded-xl flex items-center justify-center transition-all duration-500 shadow-xl"
                        style={{
                          background: isExpanded
                            ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                            : 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                          boxShadow: isExpanded
                            ? '0 8px 20px -4px rgba(59, 130, 246, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                            : '0 4px 12px -2px rgba(96, 165, 250, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
                          willChange: isExpanded ? 'transform' : 'auto'
                        }}
                      >
                        <Search className="w-4.5 md:w-5 h-4.5 md:h-5 text-white" strokeWidth={2.5} />
                      </div>
                    </div>

                    <div className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-1.5 md:gap-2 z-10">
                      {chatMode ? (
                        <>
                          <motion.button
                            onClick={() => {
                              if (isGenerating) {
                                stop();
                              } else {
                                handleChatSubmit();
                              }
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`px-3 md:px-3.5 py-1.5 md:py-2 rounded-xl font-bold text-white flex items-center gap-1.5 transition-all ${isGenerating ? 'bg-gradient-to-r from-red-500 to-red-600' : ''}`}
                            style={!isGenerating ? {
                              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                              boxShadow: '0 4px 12px -2px rgba(59, 130, 246, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                            } : {
                              boxShadow: '0 4px 12px -2px rgba(239, 68, 68, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                            }}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                <span className="text-[11px] md:text-xs">Stop</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 md:w-4 h-3.5 md:h-4" />
                                <span className="text-[11px] md:text-xs">Send</span>
                              </>
                            )}
                          </motion.button>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.2 }}
                              className="w-8 md:w-9 h-8 md:h-9 rounded-xl flex items-center justify-center shadow-xl"
                              style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                boxShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                              }}
                            >
                              <ChevronUp className="w-4.5 md:w-5 h-4.5 md:h-5 text-white" strokeWidth={2.5} />
                            </motion.div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="relative" style={{ padding: '1.5px' }}>
                            {/* Animated gradient border - CSS only */}
                            <div
                              className="absolute inset-0 rounded-xl animated-ai-border"
                              style={{
                                background: 'linear-gradient(135deg, #3b82f6, #ef4444, #8b5cf6, #3b82f6)',
                                backgroundSize: '300% 300%',
                                willChange: 'background-position'
                              }}
                            />
                            <motion.button
                              onClick={() => {
                                setIsExpanded(true);
                                setChatMode(true);
                              }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="relative flex items-center gap-1 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl cursor-pointer transition-all"
                              style={{
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(249, 250, 251, 0.9))',
                                boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8)'
                              }}
                            >
                              <Sparkles className="w-3.5 md:w-4 h-3.5 md:h-4" style={{ 
                                background: 'linear-gradient(135deg, #3b82f6, #ef4444, #8b5cf6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                              }} strokeWidth={2.5} />
                              <span className="text-[11px] md:text-xs font-black tracking-tight bg-gradient-to-r from-blue-600 via-red-500 to-purple-600 bg-clip-text text-transparent">
                                AI
                              </span>
                            </motion.button>
                          </div>

                          {isExpanded && (
                            <motion.div
                              initial={{ rotate: 180, opacity: 0, scale: 0.5 }}
                              animate={{ rotate: 0, opacity: 1, scale: 1 }}
                              exit={{ rotate: -180, opacity: 0, scale: 0.5 }}
                              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                              className="relative w-8 md:w-9 h-8 md:h-9 rounded-xl flex items-center justify-center shadow-xl overflow-hidden"
                              style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                boxShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)'
                              }}
                            >
                              <motion.div
                                className="absolute inset-0"
                                style={{
                                  background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                                  backgroundSize: '200% 200%',
                                }}
                                animate={{
                                  backgroundPosition: ['0% 0%', '200% 200%'],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'linear',
                                }}
                              />
                              <ChevronUp className="w-4.5 md:w-5 h-4.5 md:h-5 text-white relative z-10" strokeWidth={2.5} />
                            </motion.div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Global Styles */}
      <style jsx global>{`
        .ais-InstantSearch {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif;
        }

        .ais-SearchBox {
          display: none;
        }

        .ais-Hits-list {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .ais-Hits-item {
          margin: 0;
          padding: 0;
          border: none;
        }

        .apple-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .apple-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          margin: 8px 0;
        }

        .apple-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(156, 163, 175, 0.4), rgba(107, 114, 128, 0.4));
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .apple-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgba(107, 114, 128, 0.6), rgba(75, 85, 99, 0.6));
          background-clip: padding-box;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .ai-search-input {
          cursor: text !important;
        }

        .ai-search-input:focus {
          outline: none;
        }

        /* Animated Gradient Border - Apple/Google Style - Optimized with GPU */
        @keyframes gradientBorder {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animated-gradient-border {
          animation: gradientBorder 6s linear infinite;
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
        }

        .animated-glow {
          animation: gradientGlow 4s ease-in-out infinite;
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
        }

        .animated-ai-border {
          animation: gradientBorder 4s linear infinite;
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
        }

        .animated-underline {
          animation: gradientSlide 3s linear infinite;
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        @keyframes gradientGlow {
          0%, 100% {
            background-position: 0% 50%;
            opacity: 0.4;
          }
          50% {
            background-position: 100% 50%;
            opacity: 0.6;
          }
        }

        @keyframes gradientSlide {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }

        /* Professional smooth animations */
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        /* Enhanced focus states */
        .ai-search-input:focus-visible {
          outline: none;
        }

        /* Performance optimizations */
        .motion-div-results {
          will-change: transform, opacity;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
      `}</style>
    </>
  );
}
