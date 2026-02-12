'use client';

import React, { useState, useEffect, useRef, useMemo, FC, useCallback } from 'react';
import {
  ChevronDown,
  Search,
  Globe,
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
  Calendar,
  Sparkles,
  ChevronUp,
  Bot,
  Loader2,
  ArrowLeft,
  Send,
  MapPin,
  Compass,
  Tag,
  FileText,
  ChevronLeft,
  ChevronRight,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import CurrencyLanguageSwitcher from '@/components/shared/CurrencyLanguageSwitcher';
import AuthModal from '@/components/AuthModal';
import { Destination, Category, Tour } from '@/types';
import { useWishlist } from '@/contexts/WishlistContext';
import { useSettings } from '@/hooks/useSettings';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Index, useSearchBox, useHits, Configure } from 'react-instantsearch';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import 'instantsearch.css/themes/satellite.css';

// =================================================================
// --- ALGOLIA CONFIGURATION ---
// =================================================================
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';
const INDEX_DESTINATIONS = 'destinations';
const INDEX_CATEGORIES = 'categories';
const INDEX_BLOGS = 'blogs';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';

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
// --- ALGOLIA SEARCH COMPONENTS ---
// =================================================================
function CustomSearchBox({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (value: string) => void }) {
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
                <img
                  src={hit.image || hit.images?.[0] || hit.primaryImage}
                  alt={hit.title || 'Tour'}
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
                {hit.title || 'Untitled Tour'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {hit.location && (
                  <span className="flex items-center gap-1 md:gap-1.5 bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg">
                    <MapPin className="w-2.5 md:w-3 h-2.5 md:h-3 text-gray-400" strokeWidth={2.5} />
                    <span className="font-medium">{hit.location}</span>
                  </span>
                )}
                {hit.duration && (
                  <span className="flex items-center gap-1 md:gap-1.5 bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg">
                    <Clock className="w-2.5 md:w-3 h-2.5 md:h-3 text-gray-400" strokeWidth={2.5} />
                    <span className="font-medium">{hit.duration} days</span>
                  </span>
                )}
                {(hit.price || hit.discountPrice) && (
                  <span className="flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-bold text-blue-600 text-[10px] md:text-xs">
                    ${hit.discountPrice || hit.price}
                  </span>
                )}
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
      {limitedHits.map((hit: any, index) => (
        <Link
          key={hit.objectID}
          href={`/destinations/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          className="block"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
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
        </motion.div>
        </Link>
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
      {limitedHits.map((hit: any, index) => (
        <motion.a
          key={hit.objectID}
          href={`/categories/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
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
      {limitedHits.map((hit: any, index) => (
        <motion.a
          key={hit.objectID}
          href={`/blog/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
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
        </motion.a>
      ))}
    </div>
  );
}

// Tour Card Component for AI Chat
const TourCard = ({ tour }: { tour: any }) => (
  <motion.a
    href={`/${tour.slug}`}
    target="_blank"
    rel="noopener noreferrer"
    className="group block flex-shrink-0 w-[240px] bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300"
    whileHover={{ y: -4 }}
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
  </motion.a>
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

// Mobile Inline Search Component with AI
const MobileInlineSearch: FC<{ isOpen: boolean; onClose: () => void }> = React.memo(({ isOpen, onClose }) => {
  const { getSiteName } = useTenant();
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMode, setChatMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // AI SDK Chat Setup
  const {
    messages,
    sendMessage,
    status,
    stop,
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

  useOnClickOutside(containerRef, onClose);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        setChatMode(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Track if user has manually scrolled away from bottom
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const isScrollingRef = useRef(false);
  
  // Auto-scroll only when user hasn't manually scrolled up
  useEffect(() => {
    if (!chatContainerRef.current || userHasScrolledUp) return;
    
    const container = chatContainerRef.current;
    setTimeout(() => {
      if (!userHasScrolledUp && container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }, [messages, isGenerating, userHasScrolledUp]);
  
  // Track manual scrolling - let user scroll freely
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container || !chatMode) return;
    
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Don't interfere if this is a programmatic scroll
      if (isScrollingRef.current) return;
      
      clearTimeout(scrollTimeout);
      
      // Check if user is at the bottom
      const isAtBottom = Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 5;
      
      if (isAtBottom) {
        // User scrolled back to bottom - re-enable auto-scroll
        setUserHasScrolledUp(false);
      } else {
        // User scrolled away from bottom - disable auto-scroll
        setUserHasScrolledUp(true);
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [chatMode]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (!chatMode) {
      setSearchQuery(value);
    }
  };

  const handleChatSubmit = () => {
    const message = inputValue.trim();
    if (!message) return;
    sendMessage({ text: message });
    setInputValue('');
  };

  const handleAskAI = () => {
    setChatMode(true);
    if (searchQuery) {
      setTimeout(() => sendMessage({ text: searchQuery }), 300);
      setInputValue('');
      setSearchQuery('');
    }
  };

  const handleBackToSearch = () => {
    setChatMode(false);
    setInputValue(searchQuery);
  };

  // Render tool outputs (tours)
  const renderToolOutput = (obj: any) => {
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
  };

  // Render message content
  const renderContent = (parts: any[]) => {
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
        return (
          <div key={idx} className="prose prose-sm max-w-none text-gray-800 leading-relaxed text-sm sm:text-[15px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {p.text}
            </ReactMarkdown>
          </div>
        );
      }
      return null;
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="fixed top-16 left-0 right-0 z-50"
        ref={containerRef}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="relative">
            {/* Search Input */}
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <div className="relative bg-white/95 backdrop-blur-xl border-2 border-blue-300 rounded-full shadow-2xl hover:shadow-2xl hover:border-blue-400 transition-all duration-300">
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (chatMode && e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit();
                      }
                    }}
                    placeholder={chatMode ? "Ask AI about tours..." : "Search tours, destinations..."}
                    className="w-full pl-14 pr-32 py-4 text-base text-gray-900 placeholder:text-gray-400/70 placeholder:font-normal font-medium bg-transparent outline-none rounded-full"
                    autoFocus
                    disabled={chatMode && isGenerating}
                  />

                  {/* Left Icon */}
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                        <Search className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Right Side Buttons */}
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {chatMode ? (
                      <motion.button
                        onClick={() => {
                          if (isGenerating) {
                            stop();
                          } else {
                            handleChatSubmit();
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl font-semibold text-white flex items-center gap-1.5 text-xs ${isGenerating ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-purple-600'}`}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send</span>
                          </>
                        )}
                      </motion.button>
                    ) : (
                      <motion.button
                        onClick={handleAskAI}
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold text-xs flex items-center gap-1.5 hover:shadow-lg"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI</span>
                      </motion.button>
                    )}
                    <button
                      onClick={() => {
                        onClose();
                        setChatMode(false);
                        setInputValue('');
                        setSearchQuery('');
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      aria-label="Close search"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Results Dropdown */}
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="mt-3 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden"
                style={{ maxHeight: '65vh' }}
              >
                {/* Header */}
                <div className="px-5 py-3 border-b border-gray-100/50 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {chatMode && (
                        <button
                          onClick={handleBackToSearch}
                          className="mr-1 p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                      {chatMode ? (
                        <>
                          <Bot className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            AI Travel Assistant
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            {searchQuery ? 'Search Results' : 'Popular Searches'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Results Area */}
                <div ref={chatContainerRef} className="overflow-y-auto" style={{ maxHeight: 'calc(65vh - 60px)' }}>
                  {chatMode ? (
                    /* Chat Interface */
                    <div className="p-4 space-y-3">
                      {messages.length === 0 && (
                        <div className="bg-white p-4 rounded-xl border border-blue-100">
                          <div className="flex items-start gap-2.5 mb-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Bot className="text-white" size={16} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 text-sm mb-1">
                                {`Hi! I'm your AI Travel Assistant`}
                              </p>
                              <p className="text-gray-500 text-xs leading-relaxed">
                                Ask me anything — I'll help you find tours, trips, prices, destinations & more.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                              m.role === 'user'
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm'
                                : 'bg-white text-gray-800 border shadow-sm'
                            }`}
                          >
                            {renderContent(m.parts)}
                          </div>
                        </div>
                      ))}

                      {isGenerating && (
                        <div className="flex items-center gap-2 text-gray-500 bg-white px-4 py-2.5 rounded-lg border">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">AI is thinking...</span>
                        </div>
                      )}
                    </div>
                  ) : searchQuery ? (
                    <InstantSearch searchClient={searchClient} indexName={INDEX_TOURS}>
                      <CustomSearchBox searchQuery={searchQuery} onSearchChange={setSearchQuery} />

                      <Index indexName={INDEX_TOURS}>
                        <Configure hitsPerPage={5} />
                        <TourHits onHitClick={onClose} limit={5} />
                      </Index>

                      <Index indexName={INDEX_DESTINATIONS}>
                        <Configure hitsPerPage={3} />
                        <DestinationHits onHitClick={onClose} limit={3} />
                      </Index>

                      <Index indexName={INDEX_CATEGORIES}>
                        <Configure hitsPerPage={3} />
                        <CategoryHits onHitClick={onClose} limit={3} />
                      </Index>

                      <Index indexName={INDEX_BLOGS}>
                        <Configure hitsPerPage={3} />
                        <BlogHits onHitClick={onClose} limit={3} />
                      </Index>
                    </InstantSearch>
                  ) : (
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Trending Tours
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['Day Tours', 'Snorkeling', 'Desert Safari', 'Boat Trips', 'Sightseeing', 'Diving'].map((trend) => (
                          <button
                            key={trend}
                            onClick={() => {
                              setSearchQuery(trend);
                              setInputValue(trend);
                            }}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200"
                          >
                            {trend}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
MobileInlineSearch.displayName = 'MobileInlineSearch';

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
      <Icon className="h-5 w-5 text-slate-500 group-hover:text-[var(--primary-color)] transition-colors" />
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

const TourResultSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    <div className="w-full h-32 bg-slate-200" />
    <div className="p-4">
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-1/2" />
    </div>
  </div>
);

// SearchModal removed - now using MobileInlineSearch for mobile devices

// =================================================================
// Tenant-specific mega menu destinations
const tenantMegaMenuDestinations: Record<string, { name: string; slug: string; image: string; country: string }[]> = {
  'hurghada-speedboat': [
    { name: 'Giftun Island', slug: 'giftun-island', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', country: 'Red Sea' },
    { name: 'Orange Bay', slug: 'orange-bay', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80', country: 'Red Sea' },
    { name: 'Mahmya Island', slug: 'mahmya-island', image: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=400&q=80', country: 'Red Sea' },
    { name: 'Paradise Island', slug: 'paradise-island', image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&q=80', country: 'Red Sea' },
    { name: 'Dolphin House', slug: 'dolphin-house', image: 'https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=400&q=80', country: 'Red Sea' },
    { name: 'Hurghada Marina', slug: 'hurghada-marina', image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400&q=80', country: 'Red Sea' },
  ],
  'sharm-excursions-online': [
    { name: 'Ras Mohammed', slug: 'ras-mohammed', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', country: 'Red Sea' },
    { name: 'Tiran Island', slug: 'tiran-island', image: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=400&q=80', country: 'Red Sea' },
    { name: 'Blue Hole Dahab', slug: 'blue-hole', image: 'https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=400&q=80', country: 'Sinai' },
    { name: 'Naama Bay', slug: 'naama-bay', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80', country: 'Red Sea' },
    { name: 'White Island', slug: 'white-island', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80', country: 'Red Sea' },
    { name: 'Colored Canyon', slug: 'colored-canyon', image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&q=80', country: 'Sinai' },
  ],
};

// Tenant-specific mega menu categories/activities
const tenantMegaMenuCategories: Record<string, { name: string; slug: string; icon: string }[]> = {
  'hurghada-speedboat': [
    { name: 'Speedboat Tours', slug: 'speedboat-tours', icon: 'boat' },
    { name: 'Island Hopping', slug: 'island-hopping', icon: 'island' },
    { name: 'Snorkeling Trips', slug: 'snorkeling', icon: 'snorkel' },
    { name: 'Dolphin Watching', slug: 'dolphin-watching', icon: 'dolphin' },
    { name: 'Sunset Cruises', slug: 'sunset-cruises', icon: 'sunset' },
    { name: 'Glass Bottom Boat', slug: 'glass-bottom-boat', icon: 'boat' },
    { name: 'Fishing Trips', slug: 'fishing', icon: 'fish' },
    { name: 'Private Charters', slug: 'private-charters', icon: 'yacht' },
  ],
  'sharm-excursions-online': [
    { name: 'Diving Tours', slug: 'diving', icon: 'dive' },
    { name: 'Snorkeling', slug: 'snorkeling', icon: 'snorkel' },
    { name: 'Desert Safari', slug: 'desert-safari', icon: 'desert' },
    { name: 'Quad Biking', slug: 'quad-biking', icon: 'quad' },
    { name: 'Boat Trips', slug: 'boat-trips', icon: 'boat' },
    { name: 'Camel Riding', slug: 'camel-riding', icon: 'camel' },
    { name: 'Day Trips', slug: 'day-trips', icon: 'trip' },
    { name: 'Water Sports', slug: 'water-sports', icon: 'water' },
  ],
};

// --- MEGA MENU ---
// =================================================================
const MegaMenu: FC<{ isOpen: boolean; onClose: () => void; destinations: Destination[]; categories: Category[]; tenantId?: string }> = React.memo(({ isOpen, onClose, destinations, categories, tenantId }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useSettings();
  useOnClickOutside(menuRef, onClose);

  // Use tenant-specific defaults if available
  const tenantDestinations = tenantId ? tenantMegaMenuDestinations[tenantId] : null;
  const tenantCategories = tenantId ? tenantMegaMenuCategories[tenantId] : null;
  
  // Check if destinations are tenant-specific or from default
  const hasTenantSpecificDest = destinations.some((d: any) => d.tenantId === tenantId);
  const effectiveDestinations = (hasTenantSpecificDest || !tenantDestinations) 
    ? destinations 
    : tenantDestinations.map((d, i) => ({ ...d, _id: `tenant-dest-${i}` }));
  
  const hasTenantSpecificCat = categories.some((c: any) => c.tenantId === tenantId);
  const effectiveCategories = (hasTenantSpecificCat || !tenantCategories)
    ? categories
    : tenantCategories.map((c, i) => ({ ...c, _id: `tenant-cat-${i}` }));

  const activityIcons: { [key: string]: React.ElementType } = {
    attractions: Landmark,
    museums: Landmark,
    'canal-cruises': Ticket,
    'city-passes': Ticket,
    'hop-on-hop-off': Ticket,
    'bike-tours': Ticket,
    'day-trips': Star,
    'combi-tickets': Star,
    'food-tours': Star,
    'speedboat-tours': Zap,
    'island-hopping': Compass,
    'snorkeling': Compass,
    'dolphin-watching': Heart,
    'sunset-cruises': Star,
    'glass-bottom-boat': Ticket,
    'fishing': Ticket,
    'private-charters': Star,
    'diving': Compass,
    'desert-safari': Zap,
    'quad-biking': Zap,
    'boat-trips': Ticket,
    'camel-riding': Ticket,
    'water-sports': Zap,
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
          className="absolute top-full left-0 right-0 shadow-2xl z-20 border-t bg-white text-black"
          onMouseLeave={onClose}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-gray-500">
                  {t('header.destinations')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {effectiveDestinations.slice(0, 6).map((dest: any) => (
                    <Link key={dest._id} href={`/destinations/${dest.slug}`} className="group block">
                      <div className="aspect-square w-full rounded-lg overflow-hidden relative bg-slate-200">
                        <Image 
                          src={dest.image} 
                          alt={dest.name} 
                          fill 
                          sizes="(max-width: 768px) 50vw, 33vw" 
                          className="object-cover transition-transform duration-300 group-hover:scale-110" 
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                      </div>
                      <h4 className="mt-2 font-bold text-gray-900 group-hover:text-[var(--primary-color)]">
                        {dest.name.toUpperCase()}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {dest.country || ''}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-gray-500">
                  {t('header.activities')}
                </h3>
                <ul className="space-y-3">
                  {effectiveCategories.slice(0, 9).map((activity: any) => {
                    const Icon = activityIcons[activity.slug] || Ticket;
                    return (
                      <li key={activity._id}>
                        <Link 
                          href={`/categories/${activity.slug}`} 
                          className="flex items-center gap-3 group text-gray-700 hover:text-[var(--primary-color)]"
                        >
                          <Icon 
                            size={20} 
                            className="text-gray-400 group-hover:text-[var(--primary-color)]"
                          />
                          <span className="font-semibold">{activity.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-lg p-6 flex flex-col justify-center items-center text-center bg-gray-50">
                <Star size={32} className="text-yellow-500 mb-2" />
                <h3 className="font-bold text-lg text-gray-800">{t('header.specialOffers')}</h3>
                <p className="text-sm text-gray-600 my-2">{t('offers.save')}</p>
                <Link href="/search" className="mt-2 text-white font-bold py-2 px-4 rounded-full text-sm" style={{ background: 'var(--gradient-primary)' }}>{t('header.deals')}</Link>
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
  const { t } = useSettings();

  useOnClickOutside(menuRef, () => setIsOpen(false));

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 p-2 rounded-full hover:bg-slate-100 transition-colors">
        {user.picture || user.photoURL ? (
          <Image src={user.picture || user.photoURL || ''} alt={user.name} width={32} height={32} className="rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <span className="text-white text-sm font-bold uppercase">
              {(user.name || user.firstName || 'U')[0]}
            </span>
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
              <Link href="/user/profile" className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"><User size={16} /><span>{t('header.myProfile')}</span></Link>
              <Link href="/user/bookings" className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"><Calendar size={16} /><span>{t('header.myBookings')}</span></Link>
              <Link href="/user/favorites" className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"><Heart size={16} /><span>{t('header.favorites')}</span></Link>
            </div>

            <div className="border-t py-2">
              <button onClick={onLogout} className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                <LogOut size={16} />
                <span>{t('header.signOut')}</span>
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
  tenantId?: string;
}> = React.memo(({ isOpen, onClose, onOpenSearch, onOpenAuth, destinations, categories, tenantId }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { t } = useSettings();
  const { getLogo, getSiteName } = useTenant();

  // Use tenant-specific defaults if available
  const tenantDestinations = tenantId ? tenantMegaMenuDestinations[tenantId] : null;
  const tenantCategories = tenantId ? tenantMegaMenuCategories[tenantId] : null;
  
  const hasTenantSpecificDest = destinations.some((d: any) => d.tenantId === tenantId);
  const effectiveDestinations = (hasTenantSpecificDest || !tenantDestinations) 
    ? destinations 
    : tenantDestinations.map((d, i) => ({ ...d, _id: `tenant-dest-${i}` }));
  
  const hasTenantSpecificCat = categories.some((c: any) => c.tenantId === tenantId);
  const effectiveCategories = (hasTenantSpecificCat || !tenantCategories)
    ? categories
    : tenantCategories.map((c, i) => ({ ...c, _id: `tenant-cat-${i}` }));

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
    'food-tours': Star,
    'speedboat-tours': Zap,
    'island-hopping': Compass,
    'snorkeling': Compass,
    'dolphin-watching': Heart,
    'sunset-cruises': Star,
    'glass-bottom-boat': Ticket,
    'fishing': Ticket,
    'private-charters': Star,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[9999] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            ref={menuRef}
            className="absolute top-0 left-0 h-full w-full max-w-sm shadow-2xl bg-white"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b">
                <Image src={getLogo()} alt={getSiteName()} width={120} height={40} className="h-10 w-auto object-contain" />
                <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100">
                  <X size={24} />
                </button>
              </div>

              {user ? (
                <div className="p-6 border-b">
                  <div className="flex items-center gap-3 mb-4">
                    {user.picture || user.photoURL ? (
                      <Image src={user.picture || user.photoURL || ''} alt={user.name} width={40} height={40} className="rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: 'var(--gradient-primary)' }}>
                        <span className="text-lg font-bold uppercase">
                          {(user.name || user.firstName || 'U')[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Link href="/user/profile" className="block py-2 text-slate-700 hover:text-[var(--primary-color)]" onClick={onClose}>{t('header.myProfile')}</Link>
                    <Link href="/user/bookings" className="block py-2 text-slate-700 hover:text-[var(--primary-color)]" onClick={onClose}>{t('header.myBookings')}</Link>
                    <button onClick={() => { logout(); onClose(); }} className="block py-2 w-full text-left text-red-600 hover:text-red-700">{t('header.signOut')}</button>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-b">
                  <div className="space-y-3">
                    <Link href="/login" className="block w-full text-white text-center py-3 rounded-lg transition-colors hover:opacity-90" style={{ backgroundColor: 'var(--primary-color)' }}>{t('header.login')}</Link>
                    <Link href="/signup" className="block w-full border text-center py-3 rounded-lg transition-colors border-[var(--primary-color)] text-[var(--primary-color)] hover:bg-slate-50">{t('header.signup')}</Link>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <button onClick={() => { onOpenSearch(); onClose(); }} className="w-full flex items-center gap-3 p-4 rounded-lg text-left bg-slate-100">
                  <Search size={20} className="text-slate-500" />
                  <span className="text-slate-700">Search tours & tickets</span>
                </button>

                <div>
                  <h3 className="font-bold text-lg mb-4 text-slate-800">
                    {t('header.destinations')}
                  </h3>
                  <div className="space-y-2">
                    {effectiveDestinations.map((dest: any) => (
                      <a key={dest._id} href={`/destinations/${dest.slug}`} className="block py-2 text-slate-700 hover:text-[var(--primary-color)]" onClick={onClose}>
                        {dest.name}
                      </a>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-4 text-slate-800">
                    {t('header.activities')}
                  </h3>
                  <div className="space-y-2">
                    {effectiveCategories.map((activity: any) => {
                      const Icon = activityIcons[activity.slug] || Ticket;
                      return (
                        <a key={activity._id} href={`/categories/${activity.slug}`} className="flex items-center gap-3 py-2 text-slate-700 hover:text-[var(--primary-color)]" onClick={onClose}>
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
  const { t } = useSettings();
  const currentSuggestion = useSlidingText(SEARCH_SUGGESTIONS, 2500);
  const borderColor = isTransparent ? 'border-transparent' : 'border-slate-200';
  return (
    <div className="hidden lg:block flex-1 max-w-2xl mx-8 transition-colors duration-500">
      <div className="relative">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none transition-colors duration-500 ${isTransparent ? 'text-white' : 'text-slate-400'}`} />
        <button onClick={onFocus} className={`w-full text-left pl-12 pr-6 py-3 text-sm bg-white border-2 rounded-full shadow-sm hover:border-[var(--primary-color)] transition-colors ${borderColor}`}>
          <span className="text-slate-500">{t('search.placeholder')}</span>
        </button>
      </div>
    </div>
  );
});
HeaderSearchBar.displayName = 'HeaderSearchBar';

// =================================================================
// --- MAIN HEADER COMPONENT (EXPORTED) ---
// =================================================================
interface HeaderProps {
  startSolid?: boolean;
  initialDestinations?: Destination[];
  initialCategories?: Category[];
}

export default function Header({
  startSolid = false,
  initialDestinations,
  initialCategories
}: HeaderProps) {
  const [isMegaMenuOpen, setMegaMenuOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authModalState, setAuthModalState] = useState<'login' | 'signup'>('login');

  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations || []);
  const [categories, setCategories] = useState<Category[]>(initialCategories || []);
  const { t } = useSettings();
  const { tenant, getLogo, getSiteName } = useTenant();

  useEffect(() => {
    // Only fetch if data wasn't provided via props
    if (initialDestinations && initialCategories) return;

    const fetchNavData = async () => {
      try {
        // API routes now automatically detect tenant from request headers/cookies
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
  }, [initialDestinations, initialCategories, tenant?.tenantId]); // Re-fetch when tenant changes

  const { openCart, totalItems } = useCart();
  const { user, logout } = useAuth();
  const { openWishlistSidebar, wishlist } = useWishlist();

  const { scrollY, isVisible } = useScrollDirection();
  const { addSearchTerm } = useRecentSearches();

  const isScrolled = scrollY > 100;
  const isTransparent = !(isScrolled || isMegaMenuOpen || startSolid);
  // handlers
  const handleMegaMenuToggle = useCallback(() => setMegaMenuOpen(prev => !prev), []);
  const handleMobileSearchOpen = useCallback(() => setMobileSearchOpen(true), []);
  const handleMobileSearchClose = useCallback(() => setMobileSearchOpen(false), []);
  const handleMobileMenuOpen = useCallback(() => setMobileMenuOpen(true), []);
  const handleMobileMenuClose = useCallback(() => setMobileMenuOpen(false), []);
  const handleAuthModalOpen = useCallback((state: 'login' | 'signup') => { setAuthModalState(state); setAuthModalOpen(true); }, []);
  const handleAuthModalClose = useCallback(() => setAuthModalOpen(false), []);
  const handleSearch = useCallback((term: string) => addSearchTerm(term), [addSearchTerm]);

  // Tenant-aware styling
  const headerBg = isTransparent 
    ? 'bg-transparent' 
    : 'bg-white shadow-lg';
  const headerText = isTransparent 
    ? 'text-white' 
    : 'text-gray-800';
  const linkHoverColor = isTransparent 
    ? 'hover:text-gray-200' 
    : 'hover:text-[var(--primary-color)]';

  return (
    <>
     <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'} ${headerBg} ${headerText}`}>
  {/* Fully transparent backdrop on all screen sizes */}
  {isTransparent && (
    <div className="absolute inset-0 bg-transparent" />
  )}
  
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
    <div className="flex items-center justify-between h-16 md:h-20">
      <div className="flex items-center gap-4 lg:gap-8">
        <Link href="/" className="flex items-center h-full">
          <Image src={getLogo()} alt={getSiteName()} width={160} height={64} priority className="h-12 md:h-14 lg:h-16 w-auto object-contain transition-colors duration-300" />
        </Link>

        <nav className="hidden md:flex items-center relative">
          <button
            onClick={handleMegaMenuToggle}
            onMouseEnter={() => setMegaMenuOpen(true)}
            className={`${headerText} ${linkHoverColor} flex items-center gap-1 font-semibold group text-sm lg:text-base`}
          >
            <span>{t('header.explore')}</span>
            <motion.div animate={{ rotate: isMegaMenuOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown size={20} />
            </motion.div>
          </button>
        </nav>
      </div>

      {isScrolled && <HeaderSearchBar onFocus={handleMobileSearchOpen} isTransparent={isTransparent} />}

      <div className="flex items-center gap-3 md:gap-5">
        <CurrencyLanguageSwitcher variant="header" headerLinkClasses={`${headerText} ${linkHoverColor}`} isTransparent={isTransparent} />

        <button
          onClick={openWishlistSidebar}
          className="relative group p-2 md:p-2 active:scale-95 transition-transform"
          aria-label="View your wishlist"
        >
          <Heart size={24} className={`${headerText} ${linkHoverColor} transition-colors`} />
          {wishlist?.length > 0 && (
            <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-white shadow-lg" style={{ backgroundColor: 'var(--primary-color)' }}>
              {wishlist.length}
            </span>
          )}
        </button>

        <button
          onClick={openCart}
          className="relative group p-2 md:p-2 active:scale-95 transition-transform"
          aria-label="Open cart"
        >
          <ShoppingCart size={24} className={`${headerText} ${linkHoverColor} transition-colors`} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-white shadow-lg" style={{ backgroundColor: 'var(--primary-color)' }}>
              {totalItems}
            </span>
          )}
        </button>

        <button onClick={handleMobileSearchOpen} className={`${headerText} ${linkHoverColor} lg:hidden group p-2`} aria-label="Open search">
          <Search size={22} className="group-hover:text-[var(--primary-color)]" />
        </button>

        {user ? (
          <UserMenu user={user} onLogout={logout} />
        ) : (
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className={`${headerText} ${linkHoverColor} font-semibold text-sm`}>{t('header.login')}</Link>
            <Link href="/signup" className="text-white px-4 py-2 rounded-full font-semibold text-sm transition-colors hover:opacity-90" style={{ backgroundColor: 'var(--primary-color)' }}>{t('header.signup')}</Link>
          </div>
        )}

        <button onClick={handleMobileMenuOpen} className="md:hidden p-2" aria-label="Open menu">
          <Menu size={24} className={`${headerText} ${linkHoverColor}`} />
        </button>
      </div>
    </div>
  </div>

  <MegaMenu
    isOpen={isMegaMenuOpen}
    onClose={() => setMegaMenuOpen(false)}
    destinations={destinations}
    categories={categories}
    tenantId={tenant?.tenantId}
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
        tenantId={tenant?.tenantId}
      />

      {/* Mobile Inline Search */}
      <MobileInlineSearch
        isOpen={isMobileSearchOpen}
        onClose={handleMobileSearchClose}
      />

      {/* Auth modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={handleAuthModalClose} initialState={authModalState} />

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

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}
