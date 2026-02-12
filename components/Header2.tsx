'use client';

import React, { useState, useEffect, useRef, useMemo, FC, useCallback } from 'react';
import {
  ChevronDown,
  Search,
  ShoppingCart,
  X,
  Landmark,
  Ticket,
  Star,
  Heart,
  Clock,
  Zap,
  Menu,
  User,
  LogOut,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import CurrencyLanguageSwitcher from '@/components/shared/CurrencyLanguageSwitcher';
import AuthModal from '@/components/AuthModal';
import { Destination, Category, Tour } from '@/types';
import { useWishlist } from '@/contexts/WishlistContext';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Index, useSearchBox, useHits, Configure } from 'react-instantsearch';
import 'instantsearch.css/themes/satellite.css';

// =================================================================
// --- ALGOLIA CONFIGURATION ---
// =================================================================
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// =================================================================
// --- HELPER HOOKS & DATA ---
// =================================================================
const useRecentSearches = (storageKey = 'recentTravelSearches') => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  useEffect(() => {
    try {
      const storedItems = window.localStorage.getItem(storageKey);
      if (storedItems) setRecentSearches(JSON.parse(storedItems));
    } catch (error) {
      console.error('Failed to load recent searches', error);
    }
  }, [storageKey]);

  const addSearchTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const newSearches = [trimmed, ...prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(newSearches));
      } catch (error) {
        console.error('Failed to save recent searches', error);
      }
      return newSearches;
    });
  };

  const removeSearchTerm = (term: string) => {
    setRecentSearches(prev => {
      const newSearches = prev.filter(s => s.toLowerCase() !== term.toLowerCase());
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(newSearches));
      } catch (error) {
        console.error('Failed to save recent searches', error);
      }
      return newSearches;
    });
  };

  return { recentSearches, addSearchTerm, removeSearchTerm };
};

const usePopularSearches = () => useMemo(() => ['LIGHT FESTIVAL', 'MUSEUM', 'CANAL CRUISE'], []);

/** Sliding suggestions for placeholder */
const SEARCH_SUGGESTIONS = [
  'Where are you going?',
  'Find museums near you',
  'Discover food tours',
  'Book canal cruises',
  'Explore art galleries',
  'City passes & tickets',
  'Weekend getaways',
  'Cultural experiences'
];

function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

/** Hide header when scrolling down */
function useScrollDirection() {
  const [isVisible, setIsVisible] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    let lastScrollY = typeof window !== 'undefined' ? window.pageYOffset : 0;
    const updateScroll = () => {
      const currentScrollY = window.pageYOffset;
      setIsVisible(lastScrollY > currentScrollY || currentScrollY < 100);
      setScrollY(currentScrollY);
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);
  return { scrollY, isVisible };
}

const useSlidingText = (texts: string[], interval = 3000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCurrentIndex(prev => (prev + 1) % texts.length), interval);
    return () => clearInterval(timer);
  }, [texts.length, interval]);
  return texts[currentIndex];
};

// =================================================================
// --- SUB-COMPONENTS ---
// =================================================================
const SearchSuggestion: FC<{
  term: string;
  icon: React.ElementType;
  onSelect: (term: string) => void;
  onRemove?: (term: string) => void;
}> = React.memo(({ term, icon: Icon, onSelect, onRemove }) => (
  <div className="group relative">
    <button
      onClick={() => onSelect(term)}
      className="flex items-center gap-3 pl-4 pr-5 py-2 bg-slate-100 text-slate-700 rounded-full transition-all hover:bg-slate-200 hover:shadow-md group-hover:pr-10"
    >
      <Icon className="h-5 w-5 text-slate-500 group-hover:text-red-500 transition-colors" />
      <span className="font-medium">{term}</span>
    </button>
    {onRemove && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(term);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-slate-300"
        aria-label={`Remove ${term}`}
      >
        <X size={14} />
      </button>
    )}
  </div>
));

// =================================================================
// --- ALGOLIA SEARCH COMPONENTS ---
// =================================================================
function CustomSearchBox({ searchQuery, onSearchChange: _onSearchChange }: { searchQuery: string; onSearchChange: (value: string) => void }) {
  const { refine } = useSearchBox();

  useEffect(() => {
    refine(searchQuery);
  }, [searchQuery, refine]);

  return null;
}

function TourHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <Landmark className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
            Tours ({hits.length})
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any) => (
        <a
          key={hit.objectID}
          href={`/tours/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block px-5 py-3.5 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent transition-all duration-200 border-b border-gray-100/50 last:border-0 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex-shrink-0 overflow-hidden border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
              {(hit.image || hit.images?.[0] || hit.primaryImage) ? (
                <img
                  src={hit.image || hit.images?.[0] || hit.primaryImage}
                  alt={hit.title || 'Tour'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Landmark className="w-7 h-7 text-blue-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                {hit.title || 'Untitled Tour'}
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                {hit.location && (
                  <span className="flex items-center gap-1">
                    <Landmark className="w-3 h-3" />
                    {hit.location}
                  </span>
                )}
                {hit.duration && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {hit.duration} days
                    </span>
                  </>
                )}
                {(hit.price || hit.discountPrice) && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="font-bold text-blue-600">
                      ${hit.discountPrice || hit.price}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// Mobile Inline Search Component
const MobileInlineSearch: FC<{ isOpen: boolean; onClose: () => void }> = React.memo(({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(containerRef, onClose);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="fixed top-16 left-0 right-0 z-50 bg-white shadow-2xl border-b border-gray-200"
        ref={containerRef}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="relative">
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <div className="relative bg-white border-2 border-blue-300 rounded-full shadow-xl hover:shadow-2xl hover:border-blue-400 transition-all duration-300">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tours in Egypt..."
                    className="w-full pl-14 pr-16 py-4 text-base text-gray-900 placeholder-gray-400 font-medium bg-transparent outline-none rounded-full"
                    autoFocus
                  />

                  {/* Left Icon */}
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
                      <Search className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Right Close Button */}
                  <button
                    onClick={onClose}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Close search"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Results Dropdown */}
            <AnimatePresence>
              {searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-3 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[70vh] overflow-y-auto"
                >
                  <InstantSearch searchClient={searchClient} indexName={INDEX_TOURS}>
                    <CustomSearchBox searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                    <Index indexName={INDEX_TOURS}>
                      <Configure hitsPerPage={10} />
                      <TourHits onHitClick={onClose} limit={10} />
                    </Index>
                  </InstantSearch>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trending when empty */}
            {!searchQuery && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Trending Tours
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Pyramids', 'Nile Cruise', 'Luxor', 'Desert Safari', 'Cairo Tours'].map((trend) => (
                    <button
                      key={trend}
                      onClick={() => setSearchQuery(trend)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200"
                    >
                      {trend}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
MobileInlineSearch.displayName = 'MobileInlineSearch';

// Old SearchModal component removed - now using MobileInlineSearch
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SearchModal_REMOVED: FC<{ onClose: () => void; onSearch: (term: string) => void }> = ({ onClose, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(false);
  const popularSearches = usePopularSearches();
  const { recentSearches, removeSearchTerm } = useRecentSearches();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSearch = async () => {
      if (searchTerm.trim().length > 2) {
        setLoading(true);
        try {
          const res = await fetch(`/api/search/live?q=${encodeURIComponent(searchTerm)}`);
          const data = await res.json();
          if (data.success) setSearchResults(data.data);
        } catch (error) {
          console.error('Search live fetch failed', error);
        } finally {
          setLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    };

    const debounce = setTimeout(() => {
      fetchSearch();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleSearchSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (searchTerm.trim()) {
        window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
        onSearch(searchTerm);
        setSearchTerm('');
        onClose();
      }
    },
    [searchTerm, onSearch, onClose]
  );

  const handlePopularSearch = useCallback(
    (term: string) => {
      window.location.href = `/search?q=${encodeURIComponent(term)}`;
      onSearch(term);
      onClose();
    },
    [onSearch, onClose]
  );

  const handleRecentSearch = useCallback(
    (term: string) => {
      window.location.href = `/search?q=${encodeURIComponent(term)}`;
      onSearch(term);
      onClose();
    },
    [onSearch, onClose]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  useOnClickOutside(modalRef, onClose);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-lg flex items-start justify-center p-4 sm:p-6 lg:p-8"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        ref={modalRef}
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -30, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="relative w-full max-w-5xl bg-white shadow-2xl rounded-lg p-6 sm:p-8 mt-16"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:bg-slate-100" aria-label="Close search">
          <X size={28} />
        </button>

        <form onSubmit={handleSearchSubmit} className="mb-8">
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="What are you looking for?"
              autoFocus
              className="w-full text-xl sm:text-2xl pl-10 pr-6 py-4 bg-transparent border-b-2 border-slate-200 focus:outline-none focus:border-red-500"
            />
          </div>
        </form>

        {loading && (
          <div className="mb-8">
            <h3 className="text-slate-500 font-bold text-base tracking-wider uppercase mb-4">Searching...</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <TourResultSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {!loading && searchResults.length > 0 && (
          <div className="mb-8">
            <h3 className="text-slate-500 font-bold text-base tracking-wider uppercase mb-4">Tours</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((tour) => (
                <a key={(tour as any)._id} href={`/tour/${(tour as any).slug}`} className="group block bg-white rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-xl">
                  <div className="aspect-w-16 aspect-h-9 w-full overflow-hidden relative">
                    <Image src={(tour as any).image} alt={(tour as any).title} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-gray-900 group-hover:text-red-500 truncate">{(tour as any).title}</h4>
                    <p className="text-sm text-gray-500">{(tour as any).destination?.name}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {!loading && searchTerm.length > 2 && searchResults.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <p>No tours found for "{searchTerm}". Try a different search.</p>
          </div>
        )}

        <div className="space-y-8">
          <div>
            <h3 className="text-slate-500 font-bold text-base tracking-wider uppercase mb-4">Most popular</h3>
            <div className="flex flex-wrap gap-3">
              {popularSearches.map((item) => (
                <SearchSuggestion key={item} term={item} icon={Zap} onSelect={handlePopularSearch} />
              ))}
            </div>
          </div>

          {recentSearches.length > 0 && (
            <div>
              <h3 className="text-slate-500 font-bold text-base tracking-wider uppercase mb-4">Your recent searches</h3>
              <div className="flex flex-wrap gap-3">
                {recentSearches.map((item) => (
                  <SearchSuggestion key={item} term={item} icon={Clock} onSelect={handleRecentSearch} onRemove={removeSearchTerm} />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// =================================================================
// --- MEGA MENU ---
// =================================================================
const MegaMenu: FC<{ isOpen: boolean; onClose: () => void; destinations: Destination[]; categories: Category[] }> = React.memo(({ isOpen, onClose, destinations, categories }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(menuRef, onClose);

  const activityIcons: { [key: string]: React.ElementType } = {
    attractions: Landmark,
    museums: Landmark,
    'canal-cruises': Ticket,
    'city-passes': Ticket,
    'hop-on-hop-off': Ticket,
    'bike-tours': Ticket,
    'day-trips': Star,
    'combi-tickets': Star,
    'food-tours': Star
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="absolute top-full left-0 right-0 bg-white shadow-2xl z-20 text-black border-t"
          onMouseLeave={onClose} // close when mouse leaves entire mega menu area
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Top Destinations</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {destinations.slice(0, 6).map((dest) => (
                    <a key={dest._id} href={`/destinations/${dest.slug}`} className="group block">
                      <div className="aspect-square w-full rounded-lg overflow-hidden relative bg-slate-200">
                        <Image src={dest.image} alt={dest.name} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                      </div>
                      <h4 className="mt-2 font-bold text-gray-900 group-hover:text-red-500">{dest.name.toUpperCase()}</h4>
                      <p className="text-xs text-gray-500">{(dest as any).country || ''}</p>
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Activity Types</h3>
                <ul className="space-y-3">
                  {categories.slice(0, 9).map((activity) => {
                    const Icon = activityIcons[activity.slug] || Ticket;
                    return (
                      <li key={activity._id}>
                        <a href={`/categories/${activity.slug}`} className="flex items-center gap-3 text-gray-700 hover:text-red-500 group">
                          <Icon size={20} className="text-gray-400 group-hover:text-red-500" />
                          <span className="font-semibold">{activity.name}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 flex flex-col justify-center items-center text-center">
                <Star size={32} className="text-yellow-500 mb-2" />
                <h3 className="font-bold text-lg text-gray-800">Special Offers</h3>
                <p className="text-sm text-gray-600 my-2">Save up to 20% on combi deals and city passes!</p>
                <a href="/search" className="mt-2 bg-red-500 text-white font-bold py-2 px-4 rounded-full hover:bg-red-600 text-sm">View Deals</a>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
MegaMenu.displayName = 'MegaMenu';

// =================================================================
// --- USER MENU ---
// =================================================================
const UserMenu: FC<{ user: any; onLogout: () => void }> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(menuRef, () => setIsOpen(false));

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 p-2 rounded-full hover:bg-slate-100 transition-colors">
        {user.picture ? (
          <Image src={user.picture} alt={user.name} width={32} height={32} className="rounded-full" />
        ) : (
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <User size={16} className="text-slate-600" />
          </div>
        )}
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border py-2 z-50">
            <div className="px-4 py-3 border-b">
              <p className="font-medium text-slate-900">{user.name}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>

            <div className="py-2">
              <a href="/user/profile" className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"><User size={16} /><span>My Profile</span></a>
              <a href="/user/bookings" className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"><Calendar size={16} /><span>My Bookings</span></a>
              <a href="/user/favorites" className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"><Heart size={16} /><span>Favorites</span></a>
            </div>

            <div className="border-t py-2">
              <button onClick={onLogout} className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =================================================================
// --- MOBILE MENU ---
// =================================================================
const MobileMenu: FC<{
  isOpen: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  onOpenAuth: (state: 'login' | 'signup') => void;
  destinations: Destination[];
  categories: Category[];
}> = React.memo(({ isOpen, onClose, onOpenSearch, onOpenAuth: _onOpenAuth, destinations, categories }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  useOnClickOutside(menuRef, onClose);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const activityIcons: { [key: string]: React.ElementType } = {
    attractions: Landmark,
    museums: Landmark,
    'canal-cruises': Ticket,
    'city-passes': Ticket,
    'hop-on-hop-off': Ticket,
    'bike-tours': Ticket,
    'day-trips': Star,
    'combi-tickets': Star,
    'food-tours': Star
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[9999] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            ref={menuRef}
            className="absolute top-0 left-0 h-full w-full max-w-sm bg-white shadow-2xl"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b">
                <img src="/EEO-logo.png" alt="Egypt Excursions Online" className="h-10 object-contain" />
                <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100">
                  <X size={24} />
                </button>
              </div>

              {user ? (
                <div className="p-6 border-b">
                  <div className="flex items-center gap-3 mb-4">
                    {user.picture ? (
                      <Image src={user.picture} alt={user.name} width={40} height={40} className="rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                        <User size={20} className="text-slate-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <a href="/user/profile" className="block py-2 text-slate-700 hover:text-red-500" onClick={onClose}>My Profile</a>
                    <a href="/user/bookings" className="block py-2 text-slate-700 hover:text-red-500" onClick={onClose}>My Bookings</a>
                    <button onClick={() => { logout(); onClose(); }} className="block py-2 text-red-600 hover:text-red-700 w-full text-left">Sign Out</button>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-b">
                  <div className="space-y-3">
                    <a href="/login" className="block w-full bg-red-600 text-white text-center py-3 rounded-lg hover:bg-red-700 transition-colors">Log In</a>
                    <a href="/signup" className="block w-full border border-red-600 text-red-600 text-center py-3 rounded-lg hover:bg-red-50 transition-colors">Sign Up</a>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <button onClick={() => { onOpenSearch(); onClose(); }} className="w-full flex items-center gap-3 p-4 bg-slate-100 rounded-lg text-left">
                  <Search size={20} className="text-slate-500" />
                  <span className="text-slate-700">Search tours & tickets</span>
                </button>

                <div>
                  <h3 className="font-bold text-lg text-slate-800 mb-4">Destinations</h3>
                  <div className="space-y-2">
                    {destinations.map((dest) => (
                      <a key={dest._id} href={`/destinations/${dest.slug}`} className="block py-2 text-slate-700 hover:text-red-500" onClick={onClose}>
                        {dest.name}
                      </a>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-slate-800 mb-4">Activities</h3>
                  <div className="space-y-2">
                    {categories.map((activity) => {
                      const Icon = activityIcons[activity.slug] || Ticket;
                      return (
                        <a key={activity._id} href={`/categories/${activity.slug}`} className="flex items-center gap-3 py-2 text-slate-700 hover:text-red-500" onClick={onClose}>
                          <Icon size={16} />
                          <span>{activity.name}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t">
                <CurrencyLanguageSwitcher variant="footer" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
MobileMenu.displayName = 'MobileMenu';

// =================================================================
// --- HEADER SEARCH BAR (desktop) ---
// =================================================================
const HeaderSearchBar: FC<{ onFocus: () => void; isTransparent: boolean }> = React.memo(({ onFocus, isTransparent }) => {
  const currentSuggestion = useSlidingText(SEARCH_SUGGESTIONS, 2500);
  const borderColor = isTransparent ? 'border-transparent' : 'border-slate-200';
  return (
    <div className="hidden lg:block flex-1 max-w-2xl mx-8 transition-colors duration-500">
      <div className="relative">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none transition-colors duration-500 ${isTransparent ? 'text-white' : 'text-slate-400'}`} />
        <button onClick={onFocus} className={`w-full text-left pl-12 pr-6 py-3 text-sm bg-white border-2 rounded-full shadow-sm hover:border-red-300 transition-colors ${borderColor}`}>
          <span className="text-slate-500">{currentSuggestion}</span>
        </button>
      </div>
    </div>
  );
});
HeaderSearchBar.displayName = 'HeaderSearchBar';

// =================================================================
// --- MAIN HEADER COMPONENT (EXPORTED) ---
// =================================================================
export default function Header2({ startSolid = false }: { startSolid?: boolean }) {
  const [isMegaMenuOpen, setMegaMenuOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authModalState, setAuthModalState] = useState<'login' | 'signup'>('login');

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchNavData = async () => {
      try {
        // NOTE: using ?featured=true - adjust server-side or remove param if not supported
        const [destRes, catRes] = await Promise.all([
          fetch('/api/admin/tours/destinations?featured=true'),
          fetch('/api/categories?featured=true')
        ]);
        const destData = await destRes.json();
        const catData = await catRes.json();
        if (destData?.success) setDestinations(destData.data || []);
        if (catData?.success) setCategories(catData.data || []);
      } catch (error) {
        console.error('Failed to fetch nav data', error);
      }
    };
    fetchNavData();
  }, []);

  const { openCart, totalItems } = useCart();
  const { user, logout } = useAuth();
  const { openWishlistSidebar, wishlist } = useWishlist();

  const { scrollY, isVisible } = useScrollDirection();
  const { addSearchTerm: _addSearchTerm } = useRecentSearches();

  const isScrolled = scrollY > 100;
  const isTransparent = !startSolid && scrollY < 100;
  // handlers
  const handleMegaMenuToggle = useCallback(() => setMegaMenuOpen(prev => !prev), []);
  const handleMobileSearchOpen = useCallback(() => setMobileSearchOpen(true), []);
  const handleMobileSearchClose = useCallback(() => setMobileSearchOpen(false), []);
  const handleMobileMenuOpen = useCallback(() => setMobileMenuOpen(true), []);
  const handleMobileMenuClose = useCallback(() => setMobileMenuOpen(false), []);
  const handleAuthModalOpen = useCallback((state: 'login' | 'signup') => { setAuthModalState(state); setAuthModalOpen(true); }, []);
  const handleAuthModalClose = useCallback(() => setAuthModalOpen(false), []);

  const headerBg = 'bg-white shadow-lg';
  const headerText = 'text-gray-800';
  const linkHoverColor = 'hover:text-red-500';

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'} ${headerBg} ${headerText}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-4 lg:gap-8">
              <a href="/" className="flex items-center h-full">
                <img src="/EEO-logo.png" alt="Egypt Excursions Online" className="h-12 md:h-14 lg:h-16 object-contain transition-colors duration-300" />
              </a>

              <nav className="hidden md:flex items-center relative">
                <button
                  onClick={handleMegaMenuToggle}
                  onMouseEnter={() => setMegaMenuOpen(true)} // open on hover
                  className={`${headerText} ${linkHoverColor} flex items-center gap-1 font-semibold group text-sm lg:text-base`}
                >
                  <span>EXPLORE</span>
                  <motion.div animate={{ rotate: isMegaMenuOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown size={20} />
                  </motion.div>
                </button>
              </nav>
            </div>

            {/* Show search only when scrolled (keeps header clean on hero) */}
            {isScrolled && <HeaderSearchBar onFocus={handleMobileSearchOpen} isTransparent={isTransparent} />}

            <div className="flex items-center gap-3 md:gap-5">
              <CurrencyLanguageSwitcher variant="header" headerLinkClasses={`${headerText} ${linkHoverColor}`} isTransparent={isTransparent} />

              <button onClick={openWishlistSidebar} className="relative group p-2" aria-label="View your wishlist">
                <Heart size={24} className={`${headerText} ${linkHoverColor}`} />
                {wishlist?.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-white">
                    {wishlist.length}
                  </span>
                )}
              </button>

              <button onClick={openCart} className="relative group p-2" aria-label="Open cart">
                <ShoppingCart size={24} className={`${headerText} ${linkHoverColor}`} />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-white">
                    {totalItems}
                  </span>
                )}
              </button>

              <button onClick={handleMobileSearchOpen} className={`${headerText} ${linkHoverColor} lg:hidden group p-2`} aria-label="Open search">
                <Search size={22} className="group-hover:text-red-500" />
              </button>

              {user ? (
                <UserMenu user={user} onLogout={logout} />
              ) : (
                <div className="hidden md:flex items-center gap-3">
                  <a href="/login" className={`${headerText} ${linkHoverColor} font-semibold text-sm`}>Log In</a>
                  <a href="/signup" className="bg-red-600 text-white px-4 py-2 rounded-full font-semibold text-sm hover:bg-red-700 transition-colors">Sign Up</a>
                </div>
              )}

              <button onClick={handleMobileMenuOpen} className="md:hidden p-2" aria-label="Open menu">
                <Menu size={24} className={`${headerText} ${linkHoverColor}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Mega menu is rendered here so it sits below header content */}
        <MegaMenu
          isOpen={isMegaMenuOpen}
          onClose={() => setMegaMenuOpen(false)}
          destinations={destinations}
          categories={categories}
        />
      </header>

      {/* Mobile menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={handleMobileMenuClose}
        onOpenSearch={handleMobileSearchOpen}
        onOpenAuth={handleAuthModalOpen}
        destinations={destinations}
        categories={categories}
      />

      {/* Mobile Inline Search */}
      <MobileInlineSearch
        isOpen={isMobileSearchOpen}
        onClose={handleMobileSearchClose}
      />

      {/* Auth modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={handleAuthModalClose} initialState={authModalState} />
    </>
  );
}
