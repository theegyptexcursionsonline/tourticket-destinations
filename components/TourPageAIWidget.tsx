'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Search, MapPin, Clock, Compass, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Index, useSearchBox, useHits, Configure } from 'react-instantsearch';
import 'instantsearch.css/themes/satellite.css';

// Algolia Config
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';
const INDEX_DESTINATIONS = 'destinations';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// Custom SearchBox component
function CustomSearchBox({ searchQuery, onSearchChange: _onSearchChange }: { searchQuery: string; onSearchChange: (value: string) => void }) {
  const { refine } = useSearchBox();

  useEffect(() => {
    refine(searchQuery);
  }, [searchQuery, refine]);

  return null;
}

// Tour Hits Component with Horizontal Scroll
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

  return (
    <div>
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <MapPin className="w-3 h-3 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xs font-semibold text-gray-700 tracking-wide">Tours</span>
          <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 py-0.5 rounded-full">{hits.length}</span>
        </div>
      </div>

      <div className="relative px-4 py-4">
        <div
          ref={sliderRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {limitedHits.map((hit: any, _index) => (
            <a
              key={hit.objectID}
              href={`/${hit.slug || hit.objectID}`}
              onClick={onHitClick}
              className="flex-shrink-0 w-[240px] bg-white border border-blue-100 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-300"
            >
              {(hit.image || hit.images?.[0] || hit.primaryImage) && (
                <div className="relative w-full h-32 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
                  <img
                    src={hit.image || hit.images?.[0] || hit.primaryImage}
                    alt={hit.title || 'Tour'}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-3">
                <h3 className="font-semibold text-sm text-slate-900 mb-2 line-clamp-2 leading-tight hover:text-blue-600 transition-colors">
                  {hit.title || 'Untitled Tour'}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 mb-2 text-xs">
                  {hit.location && (
                    <span className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      <span className="font-medium text-blue-700">{hit.location}</span>
                    </span>
                  )}
                  {hit.duration && (
                    <span className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3 text-green-500" />
                      <span className="font-medium text-green-700">{hit.duration}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-blue-600 font-bold text-base">
                    ${hit.discountPrice || hit.price}
                  </span>
                  <span className="text-blue-600 text-xs font-semibold">View →</span>
                </div>
              </div>
            </a>
          ))}
        </div>

        {limitedHits.length > 1 && (
          <>
            <button
              onClick={() => scroll('left')}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-colors z-10"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-colors z-10"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Other hit components (simplified for brevity)
function DestinationHits({ onHitClick, limit = 3 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);
  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-semibold text-gray-700">Destinations</span>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {limitedHits.map((hit: any) => (
          <a
            key={hit.objectID}
            href={`/destinations/${hit.slug || hit.objectID}`}
            onClick={onHitClick}
            className="block px-4 py-3 hover:bg-emerald-50/50 transition-colors"
          >
            <div className="font-semibold text-sm text-gray-900 hover:text-emerald-600">
              {hit.name || 'Untitled Destination'}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function TourPageAIWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Scroll detection - show after scrolling 400px
  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
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
      const searchContainer = target.closest('.tour-ai-search-container');
      if (isExpanded && !searchContainer) {
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

  const handleCloseSearch = () => {
    setIsExpanded(false);
    setSearchQuery('');
  };

  const handleAskAI = () => {
    const event = new CustomEvent('openAIAgent', { detail: { query: searchQuery } });
    window.dispatchEvent(event);
    setIsExpanded(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 z-[99998] bg-black/20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Mobile: AI Magic Button - Positioned above Book Now bar */}
      <div className="md:hidden tour-ai-search-container fixed bottom-20 right-4 z-[99999]">
        {/* Expanded Search Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-20 right-0 w-[90vw] max-w-md max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.95))',
                backdropFilter: 'blur(40px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.3)'
              }}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/20 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-800">AI Magic Search</span>
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-400 hover:text-gray-700 p-2 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tours, destinations..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-gray-900 placeholder-gray-400 bg-white/90 outline-none rounded-xl border border-gray-200 focus:border-blue-400 transition-colors"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[50vh] overflow-y-auto apple-scrollbar">
                {searchQuery ? (
                  <InstantSearch searchClient={searchClient} indexName={INDEX_TOURS}>
                    <CustomSearchBox searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                    <Index indexName={INDEX_TOURS}>
                      <Configure hitsPerPage={5} />
                      <TourHits onHitClick={handleCloseSearch} limit={5} />
                    </Index>
                    <Index indexName={INDEX_DESTINATIONS}>
                      <Configure hitsPerPage={3} />
                      <DestinationHits onHitClick={handleCloseSearch} limit={3} />
                    </Index>
                  </InstantSearch>
                ) : (
                  <div className="p-12 text-center">
                    <Sparkles className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Start typing to discover amazing tours...</p>
                  </div>
                )}
              </div>

              {/* Ask AI Button */}
              {searchQuery && (
                <div className="border-t border-white/20 p-3 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5">
                  <button
                    onClick={handleAskAI}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Ask AI about "{searchQuery.slice(0, 20)}{searchQuery.length > 20 ? '...' : ''}"
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Magic Floating Button */}
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-2xl overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
            boxShadow: '0 8px 32px -8px rgba(59, 130, 246, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
          }}
        >
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

          {isExpanded ? (
            <X className="w-6 h-6 text-white relative z-10" strokeWidth={2.5} />
          ) : (
            <>
              <Sparkles className="w-6 h-6 text-white relative z-10" strokeWidth={2.5} />
              <span className="text-[9px] text-white font-bold mt-0.5 relative z-10 tracking-tight">
                AI Magic
              </span>
            </>
          )}

          {/* Pulse effect when not expanded */}
          {!isExpanded && (
            <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20" />
          )}
        </motion.button>
      </div>

      {/* Desktop: Hidden (use existing widget) */}
      <div className="hidden md:block">
        {/* Desktop can use the existing AISearchWidget or AISearchIconWidget */}
      </div>

      {/* Styles */}
      <style jsx global>{`
        .apple-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .apple-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .apple-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(156, 163, 175, 0.4), rgba(107, 114, 128, 0.4));
          border-radius: 10px;
        }
        .apple-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgba(107, 114, 128, 0.6), rgba(75, 85, 99, 0.6));
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
