'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Search, ChevronUp, MapPin, Clock, AlertCircle, Compass, Tag, FileText, MessageCircle } from 'lucide-react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Index, useSearchBox, useHits, Configure } from 'react-instantsearch';
import 'instantsearch.css/themes/satellite.css';

// --- Algolia Config ---
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';
const INDEX_DESTINATIONS = 'destinations';
const INDEX_CATEGORIES = 'categories';
const INDEX_BLOGS = 'blogs';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// Custom SearchBox component
function CustomSearchBox({ searchQuery, onSearchChange: _onSearchChange }: { searchQuery: string; onSearchChange: (value: string) => void }) {
  const { refine } = useSearchBox();

  useEffect(() => {
    refine(searchQuery);
  }, [searchQuery, refine]);

  return null;
}

// Custom Hits components (same as main AISearchWidget)
function TourHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <MapPin className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">Tours</span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">{hits.length}</span>
        </div>
      </div>
      {limitedHits.map((hit: any, index) => (
        <motion.a
          key={hit.objectID}
          href={`/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-blue-500/5 hover:via-indigo-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-indigo-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:via-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-14 md:w-20 h-14 md:h-20 rounded-xl md:rounded-2xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              {(hit.image || hit.images?.[0] || hit.primaryImage) ? (
                <img src={hit.image || hit.images?.[0] || hit.primaryImage} alt={hit.title || 'Tour'} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200"><svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>'; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200"><MapPin className="w-8 h-8 text-blue-600" strokeWidth={2.5} /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 line-clamp-2 md:truncate group-hover:text-blue-600 transition-colors duration-300">{hit.title || 'Untitled Tour'}</div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {hit.location && (<span className="flex items-center gap-1 md:gap-1.5 bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg"><MapPin className="w-2.5 md:w-3 h-2.5 md:h-3 text-gray-400" strokeWidth={2.5} /><span className="font-medium">{hit.location}</span></span>)}
                {hit.duration && (<span className="flex items-center gap-1 md:gap-1.5 bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg"><Clock className="w-2.5 md:w-3 h-2.5 md:h-3 text-gray-400" strokeWidth={2.5} /><span className="font-medium">{hit.duration} days</span></span>)}
                {(hit.price || hit.discountPrice) && (<span className="flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-bold text-blue-600 text-[10px] md:text-xs">${hit.discountPrice || hit.price}</span>)}
              </div>
            </div>
          </div>
        </motion.a>
      ))}
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
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25"><Compass className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} /></div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">Destinations</span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">{hits.length}</span>
        </div>
      </div>
      {limitedHits.map((hit: any, index) => (
        <motion.a key={hit.objectID} href={`/destinations/${hit.slug || hit.objectID}`} onClick={onHitClick} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }} className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-emerald-500/5 hover:via-teal-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-teal-500/0 to-cyan-500/0 group-hover:from-emerald-500/5 group-hover:via-teal-500/5 group-hover:to-cyan-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5"><Compass className="w-6 md:w-7 h-6 md:h-7 text-emerald-600" strokeWidth={2.5} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-emerald-600 transition-colors duration-300">{hit.name || 'Untitled Destination'}</div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {hit.country && (<span className="bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium">{hit.country}</span>)}
                {hit.tourCount && (<span className="bg-emerald-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-emerald-700">{hit.tourCount} tours</span>)}
              </div>
            </div>
          </div>
        </motion.a>
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
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/25"><Tag className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} /></div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">Categories</span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">{hits.length}</span>
        </div>
      </div>
      {limitedHits.map((hit: any, index) => (
        <motion.a key={hit.objectID} href={`/categories/${hit.slug || hit.objectID}`} onClick={onHitClick} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }} className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-purple-500/5 hover:via-fuchsia-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-fuchsia-500/0 to-pink-500/0 group-hover:from-purple-500/5 group-hover:via-fuchsia-500/5 group-hover:to-pink-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-purple-50 to-fuchsia-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5"><Tag className="w-6 md:w-7 h-6 md:h-7 text-purple-600" strokeWidth={2.5} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-purple-600 transition-colors duration-300">{hit.name || 'Untitled Category'}</div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5">
                {hit.tourCount && (<span className="bg-purple-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-purple-700">{hit.tourCount} tours</span>)}
              </div>
            </div>
          </div>
        </motion.a>
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
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25"><FileText className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} /></div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">Blog Posts</span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">{hits.length}</span>
        </div>
      </div>
      {limitedHits.map((hit: any, index) => (
        <motion.a key={hit.objectID} href={`/blog/${hit.slug || hit.objectID}`} onClick={onHitClick} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }} className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-amber-500/5 hover:via-orange-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-orange-500/0 to-red-500/0 group-hover:from-amber-500/5 group-hover:via-orange-500/5 group-hover:to-red-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5"><FileText className="w-6 md:w-7 h-6 md:h-7 text-amber-600" strokeWidth={2.5} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-amber-600 transition-colors duration-300">{hit.title || 'Untitled Blog Post'}</div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {hit.category && (<span className="bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium">{hit.category}</span>)}
                {hit.readTime && (<span className="bg-amber-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-amber-700">{hit.readTime} min read</span>)}
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}

export default function AISearchIconWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [algoliaError, _setAlgoliaError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollThreshold = window.innerHeight * 0.8;
      setIsVisible(window.scrollY > scrollThreshold);
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
      const searchContainer = target.closest('.ai-search-container');
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

  const handleButtonClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('AI Search button clicked!'); // Debug log
    setIsExpanded(!isExpanded);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} onClick={() => setIsExpanded(false)} className="fixed inset-0 z-[99997] cursor-pointer" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0, 0, 0, 0.15)' }} />
        )}
      </AnimatePresence>

      {/* DESKTOP: Full search bar at bottom (like homepage) - leaves space for AI Agent on right */}
      <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="hidden md:flex fixed bottom-4 md:bottom-8 left-0 right-0 z-[99998] justify-center px-3 md:px-6 md:pr-32 pointer-events-auto">
        <div className="w-full max-w-2xl">
          <div className="ai-search-container relative">
            {/* Expanded Results Panel */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ opacity: 0, y: 30, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.94 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="absolute bottom-full mb-2 md:mb-4 left-0 right-0 rounded-2xl md:rounded-[28px] overflow-hidden shadow-2xl z-[99999]" style={{ maxHeight: '60vh', background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.92))', backdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255, 255, 255, 0.18)', boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.3) inset' }}>
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="px-4 md:px-7 py-3 md:py-5 border-b border-white/20 backdrop-blur-xl bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 md:gap-3">
                          <Sparkles className="w-3.5 md:w-4 h-3.5 md:h-4 text-blue-500" strokeWidth={2.5} />
                          <span className="text-xs md:text-sm font-semibold text-gray-800 tracking-tight">{searchQuery ? 'AI Search Results' : 'AI Search'}</span>
                        </div>
                        <button onClick={() => setIsExpanded(false)} className="text-gray-400 hover:text-gray-700 transition-all duration-200 p-2 md:p-2.5 rounded-2xl hover:bg-white/60"><X className="w-4 md:w-4.5 h-4 md:h-4.5" strokeWidth={2.5} /></button>
                      </div>
                    </div>
                    {/* Results */}
                    <div className="flex-1 overflow-y-auto apple-scrollbar">
                      {algoliaError ? (
                        <div className="p-16 text-center"><AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" /><p className="text-sm font-semibold text-red-600">{algoliaError}</p></div>
                      ) : searchQuery ? (
                        <InstantSearch searchClient={searchClient} indexName={INDEX_TOURS}>
                          <CustomSearchBox searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                          <Index indexName={INDEX_TOURS}><Configure hitsPerPage={5} /><TourHits onHitClick={handleCloseSearch} limit={5} /></Index>
                          <Index indexName={INDEX_DESTINATIONS}><Configure hitsPerPage={5} /><DestinationHits onHitClick={handleCloseSearch} limit={5} /></Index>
                          <Index indexName={INDEX_CATEGORIES}><Configure hitsPerPage={5} /><CategoryHits onHitClick={handleCloseSearch} limit={5} /></Index>
                          <Index indexName={INDEX_BLOGS}><Configure hitsPerPage={5} /><BlogHits onHitClick={handleCloseSearch} limit={5} /></Index>
                        </InstantSearch>
                      ) : (
                        <div className="p-8 text-center"><Sparkles className="w-12 h-12 text-blue-500 mx-auto mb-3" /><p className="text-sm font-medium text-gray-600">Start typing to search with AI...</p></div>
                      )}
                    </div>
                    {/* Ask AI Button */}
                    {searchQuery && (
                      <div className="border-t border-white/20 px-3 md:px-7 py-3 md:py-5 backdrop-blur-xl bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5">
                        <button onClick={handleAskAI} className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4" />Ask AI about "{searchQuery.slice(0, 30)}{searchQuery.length > 30 ? '...' : ''}"</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Bar */}
            <motion.div whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.98 }} className="relative group">
              <div className="relative rounded-full transition-all duration-500 shadow-xl hover:shadow-2xl" style={{ background: isExpanded ? 'linear-gradient(to bottom, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.95))' : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.92))', backdropFilter: 'blur(40px) saturate(180%)', border: isExpanded ? '2px solid rgba(59, 130, 246, 0.3)' : '1.5px solid rgba(255, 255, 255, 0.3)', boxShadow: isExpanded ? '0 20px 60px -15px rgba(59, 130, 246, 0.35)' : '0 10px 40px -10px rgba(0, 0, 0, 0.2)' }}>
                <div className="relative">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsExpanded(true)} placeholder="AI Search - Find tours, destinations & more..." className="w-full pl-12 md:pl-16 pr-14 md:pr-36 py-3.5 md:py-5 text-sm md:text-[15px] font-medium text-gray-900 placeholder-gray-400 bg-transparent outline-none rounded-full" />
                  <div className="absolute left-3 md:left-5 top-1/2 transform -translate-y-1/2 z-10">
                    <div className="w-8 md:w-10 h-8 md:h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg"><Search className="w-4 md:w-5 h-4 md:h-5 text-white" strokeWidth={2.5} /></div>
                  </div>
                  <div className="absolute right-3 md:right-5 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {isExpanded && <span className="hidden sm:inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">AI Powered</span>}
                    <Sparkles className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* MOBILE: Icon only (left-aligned) - AI Agent icon is on the right */}
      <div className="md:hidden ai-search-container fixed bottom-24 left-4 pointer-events-none" style={{ zIndex: 999999 }}>
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="absolute bottom-20 left-0 w-[90vw] max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl pointer-events-auto" style={{ background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.92))', backdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255, 255, 255, 0.18)', boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.3)', zIndex: 999999 }}>
              <div className="px-4 py-3 border-b border-white/20 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-500" /><span className="text-sm font-semibold text-gray-800">AI Search</span></div>
                  <button onClick={() => setIsExpanded(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-xl"><X className="w-4 h-4" /></button>
                </div>
                <div className="relative"><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tours, destinations..." autoFocus className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-gray-900 placeholder-gray-400 bg-white/90 outline-none rounded-xl border border-gray-200 focus:border-blue-400" /><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div>
              </div>
              <div className="max-h-[50vh] overflow-y-auto apple-scrollbar">
                {searchQuery ? (
                  <InstantSearch searchClient={searchClient} indexName={INDEX_TOURS}>
                    <CustomSearchBox searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                    <Index indexName={INDEX_TOURS}><Configure hitsPerPage={3} /><TourHits onHitClick={handleCloseSearch} limit={3} /></Index>
                    <Index indexName={INDEX_DESTINATIONS}><Configure hitsPerPage={3} /><DestinationHits onHitClick={handleCloseSearch} limit={3} /></Index>
                  </InstantSearch>
                ) : (
                  <div className="p-8 text-center"><Sparkles className="w-10 h-10 text-blue-500 mx-auto mb-2" /><p className="text-xs text-gray-500">Start typing to search...</p></div>
                )}
              </div>
              {searchQuery && (
                <div className="border-t border-white/20 p-3"><button onClick={handleAskAI} className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4" />Ask AI</button></div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Icon Button - LEFT ALIGNED */}
        <button
          type="button"
          onClick={handleButtonClick}
          onTouchStart={handleButtonClick}
          className="relative w-14 h-14 rounded-full shadow-2xl flex flex-col items-center justify-center cursor-pointer touch-manipulation active:scale-95 transition-transform select-none"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            boxShadow: '0 8px 24px -4px rgba(59, 130, 246, 0.5)',
            zIndex: 999999,
            pointerEvents: 'auto',
            WebkitTapHighlightColor: 'transparent',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            touchAction: 'manipulation',
            position: 'relative'
          }}
        >
          {isExpanded ? <ChevronUp className="w-6 h-6 text-white pointer-events-none" strokeWidth={2.5} /> : <Search className="w-6 h-6 text-white pointer-events-none" strokeWidth={2.5} />}
          <span className="text-[8px] text-white font-bold mt-0.5 pointer-events-none">AI Search</span>
        </button>
      </div>

      {/* Styles */}
      <style jsx global>{`
        .apple-scrollbar::-webkit-scrollbar { width: 6px; }
        .apple-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .apple-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, rgba(156, 163, 175, 0.4), rgba(107, 114, 128, 0.4)); border-radius: 10px; }
        .apple-scrollbar::-webkit-scrollbar-thumb:hover { background: linear-gradient(to bottom, rgba(107, 114, 128, 0.6), rgba(75, 85, 99, 0.6)); }
      `}</style>
    </>
  );
}
