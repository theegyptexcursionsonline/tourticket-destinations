// components/HeroSection.tsx
'use client';

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTenant } from '@/contexts/TenantContext';
import { Search, MapPin, Clock, Compass, Tag, X, Sparkles, ChevronUp, Bot, Loader2, ArrowLeft, ChevronLeft, ChevronRight, DollarSign, Star } from "lucide-react";
import Image from "next/image";
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Index, useSearchBox, useHits, Configure } from 'react-instantsearch';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import 'instantsearch.css/themes/satellite.css';

// --- Types and Constants ---
interface HeroSettings {
  backgroundImages: {
    desktop: string;
    mobile?: string;
    alt: string;
    isActive: boolean;
  }[];
  currentActiveImage: string;
  title: {
    main: string;
    highlight: string;
  };
  subtitle?: string;
  searchSuggestions: string[];
  trustIndicators: {
    travelers: string;
    rating: string;
    ratingText: string;
    isVisible: boolean;
  };
  overlaySettings: {
    opacity: number;
    gradientType: 'dark' | 'light' | 'custom';
    customGradient?: string;
  };
  animationSettings: {
    slideshowSpeed: number;
    fadeSpeed: number;
    enableAutoplay: boolean;
  };
  metaTitle?: string;
  metaDescription?: string;
}

// Algolia Configuration
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';
const INDEX_DESTINATIONS = 'destinations';
const INDEX_CATEGORIES = 'categories';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// Default fallback settings
const DEFAULT_SETTINGS: HeroSettings = {
  backgroundImages: [
    { desktop: '/hero2.jpg', alt: 'Pyramids of Giza at sunrise', isActive: true },
    { desktop: '/hero1.jpg', alt: 'Felucca on the Nile at sunset', isActive: false },
    { desktop: '/hero3.jpg', alt: 'Luxor temple columns at golden hour', isActive: false }
  ],
  currentActiveImage: '/hero2.jpg',
  title: {
    main: 'Explore Amazing ',
    highlight: 'Tours & Experiences',
  },
  searchSuggestions: [
    "Where are you going?", "Find your next adventure", "Discover hidden gems",
    "Book unique experiences", "Explore new destinations", "Create lasting memories",
  ],
  trustIndicators: {
    travelers: '2M+ travelers',
    rating: '4.9/5 rating',
    ratingText: '★★★★★',
    isVisible: true,
  },
  overlaySettings: {
    opacity: 0.6,
    gradientType: 'dark',
  },
  animationSettings: {
    slideshowSpeed: 6,
    fadeSpeed: 900,
    enableAutoplay: true
  }
};

// --- Algolia Search Components ---
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
  const sliderRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 280;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  const checkScrollPosition = useCallback(() => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    const slider = sliderRef.current;
    if (slider && limitedHits.length > 0) {
      slider.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
      return () => slider.removeEventListener('scroll', checkScrollPosition);
    }
  }, [limitedHits.length, checkScrollPosition]);

  if (limitedHits.length === 0) return null;

  // Transform hits to tour objects
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-white/15 backdrop-blur-lg border-b border-white/20">
        <div className="flex items-center gap-2.5 md:gap-3">
          <div className="w-6 md:w-7 h-6 md:h-7 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/30">
            <MapPin className="w-3.5 md:w-4 h-3.5 md:h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-xs md:text-sm font-bold text-gray-900 tracking-tight block drop-shadow-sm">
              Tours & Experiences
            </span>
            <span className="text-[10px] text-gray-600 font-medium drop-shadow-sm">
              Hand-picked for you
            </span>
          </div>
          <span className="ml-auto text-[10px] md:text-xs font-bold text-blue-700 bg-white/50 backdrop-blur-md px-3 md:px-3.5 py-1 md:py-1.5 rounded-full border border-white/40 shadow-sm">
            {hits.length} found
          </span>
        </div>
      </div>

      <div className="px-4 md:px-6 py-5">
        <div className="relative w-full">
          {tours.length > 1 && (
            <>
              <AnimatePresence>
                {showLeftArrow && (
                  <motion.button
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-xl flex items-center justify-center hover:bg-white transition-all hover:scale-110 active:scale-95 border border-gray-100"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
                  </motion.button>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {showRightArrow && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-xl flex items-center justify-center hover:bg-white transition-all hover:scale-110 active:scale-95 border border-gray-100"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
                  </motion.button>
                )}
              </AnimatePresence>
            </>
          )}
          <div
            ref={sliderRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-1"
          >
            {tours.map((tour, idx) => (
              <motion.a
                key={limitedHits[idx].objectID}
                href={`/${tour.slug}`}
                onClick={onHitClick}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group block flex-shrink-0 w-[270px] bg-white text-gray-900 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-lg hover:shadow-2xl hover:border-blue-200 transition-all duration-300"
              >
                {tour.image && (
                  <div className="relative h-40 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
                    <img
                      src={tour.image}
                      alt={tour.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {tour.isFeatured && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-lg"
                      >
                        <Star className="w-3 h-3 fill-current" strokeWidth={2} />
                        Featured
                      </motion.div>
                    )}
                    {tour.originalPrice && tour.discountPrice && tour.discountPrice < tour.originalPrice && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg"
                      >
                        -{Math.round(((tour.originalPrice - tour.discountPrice) / tour.originalPrice) * 100)}% OFF
                      </motion.div>
                    )}
                    {tour.duration && (
                      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white px-2.5 py-1.5 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 shadow-lg">
                        <Clock className="w-3 h-3" strokeWidth={2.5} />
                        {tour.duration}
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-sm mb-2.5 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug min-h-[40px]">
                    {tour.title}
                  </h3>
                  {tour.location && (
                    <div className="flex items-center gap-1.5 text-gray-500 text-[11px] mb-3">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" strokeWidth={2} />
                      <span className="line-clamp-1 font-medium">{tour.location}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t-2 border-gray-50">
                    <div className="flex items-center gap-1.5">
                      {tour.rating && (
                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" strokeWidth={2} />
                          <span className="text-[11px] font-bold text-gray-900">{tour.rating}</span>
                          {tour.reviews && <span className="text-[10px] text-gray-400">({tour.reviews})</span>}
                        </div>
                      )}
                    </div>
                    {tour.price && (
                      <div className="flex flex-col items-end">
                        {tour.originalPrice && tour.discountPrice && tour.discountPrice < tour.originalPrice ? (
                          <>
                            <span className="text-gray-400 text-[10px] line-through font-medium">${tour.originalPrice}</span>
                            <span className="text-blue-600 font-black text-lg leading-none">${tour.discountPrice}</span>
                          </>
                        ) : (
                          <span className="text-blue-600 font-black text-lg">${tour.price}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DestinationHits({ onHitClick, limit = 3 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-white/15 backdrop-blur-lg border-b border-white/20">
        <div className="flex items-center gap-2.5 md:gap-3">
          <div className="w-6 md:w-7 h-6 md:h-7 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-1 ring-white/30">
            <Compass className="w-3.5 md:w-4 h-3.5 md:h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-xs md:text-sm font-bold text-gray-900 tracking-tight block drop-shadow-sm">
              Destinations
            </span>
            <span className="text-[10px] text-gray-600 font-medium drop-shadow-sm">
              Explore new places
            </span>
          </div>
          <span className="ml-auto text-[10px] md:text-xs font-bold text-emerald-700 bg-white/50 backdrop-blur-md px-3 md:px-3.5 py-1 md:py-1.5 rounded-full border border-white/40 shadow-sm">
            {hits.length} found
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any, index) => (
        <motion.a
          key={hit.objectID}
          href={`/destinations/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ x: 4, backgroundColor: 'rgba(16, 185, 129, 0.03)' }}
          className="block px-4 md:px-6 py-4 md:py-4.5 hover:bg-gradient-to-r hover:from-emerald-500/5 hover:via-teal-500/5 hover:to-transparent transition-all duration-300 border-b border-gray-50 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-teal-500/0 to-cyan-500/0 group-hover:from-emerald-500/8 group-hover:via-teal-500/8 group-hover:to-cyan-500/8 transition-all duration-500" />
          <div className="flex items-center gap-3 md:gap-4 relative z-10">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-14 md:w-16 h-14 md:h-16 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-xl transition-all duration-300 border-2 border-emerald-100/50"
            >
              <Compass className="w-7 md:w-8 h-7 md:h-8 text-emerald-600" strokeWidth={2.5} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 text-sm md:text-base leading-snug mb-1.5 truncate group-hover:text-emerald-600 transition-colors duration-300">
                {hit.name || 'Untitled Destination'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                {hit.country && (
                  <span className="bg-gray-100 backdrop-blur-sm px-2.5 py-1 rounded-lg font-semibold text-gray-700">
                    {hit.country}
                  </span>
                )}
                {hit.tourCount && (
                  <span className="bg-emerald-100 backdrop-blur-sm px-2.5 py-1 rounded-lg font-semibold text-emerald-700">
                    {hit.tourCount} tours
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-300" strokeWidth={2.5} />
          </div>
        </motion.a>
      ))}
    </motion.div>
  );
}

function CategoryHits({ onHitClick, limit = 3 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="px-5 md:px-6 py-3.5 md:py-4 bg-white/15 backdrop-blur-lg border-b border-white/20">
        <div className="flex items-center gap-2.5 md:gap-3">
          <div className="w-6 md:w-7 h-6 md:h-7 rounded-xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30 ring-1 ring-white/30">
            <Tag className="w-3.5 md:w-4 h-3.5 md:h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-xs md:text-sm font-bold text-gray-900 tracking-tight block drop-shadow-sm">
              Categories
            </span>
            <span className="text-[10px] text-gray-600 font-medium drop-shadow-sm">
              Browse by interest
            </span>
          </div>
          <span className="ml-auto text-[10px] md:text-xs font-bold text-purple-700 bg-white/50 backdrop-blur-md px-3 md:px-3.5 py-1 md:py-1.5 rounded-full border border-white/40 shadow-sm">
            {hits.length} found
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any, index) => (
        <motion.a
          key={hit.objectID}
          href={`/categories/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ x: 4, backgroundColor: 'rgba(168, 85, 247, 0.03)' }}
          className="block px-4 md:px-6 py-4 md:py-4.5 hover:bg-gradient-to-r hover:from-purple-500/5 hover:via-fuchsia-500/5 hover:to-transparent transition-all duration-300 border-b border-gray-50 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-fuchsia-500/0 to-pink-500/0 group-hover:from-purple-500/8 group-hover:via-fuchsia-500/8 group-hover:to-pink-500/8 transition-all duration-500" />
          <div className="flex items-center gap-3 md:gap-4 relative z-10">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: -5 }}
              className="w-14 md:w-16 h-14 md:h-16 rounded-2xl bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50 flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-xl transition-all duration-300 border-2 border-purple-100/50"
            >
              <Tag className="w-7 md:w-8 h-7 md:h-8 text-purple-600" strokeWidth={2.5} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 text-sm md:text-base leading-snug mb-1.5 truncate group-hover:text-purple-600 transition-colors duration-300">
                {hit.name || 'Untitled Category'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                {hit.tourCount && (
                  <span className="bg-purple-100 backdrop-blur-sm px-2.5 py-1 rounded-lg font-semibold text-purple-700">
                    {hit.tourCount} tours
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all duration-300" strokeWidth={2.5} />
          </div>
        </motion.a>
      ))}
    </motion.div>
  );
}

// --- Helper Hooks ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < breakpoint);
    if (typeof window !== "undefined") {
      checkIsMobile();
      window.addEventListener("resize", checkIsMobile);
      return () => window.removeEventListener("resize", checkIsMobile);
    }
  }, [breakpoint]);
  
  return isMobile;
};

const useHeroSettings = (initialSettings?: HeroSettings | null) => {
  const [settings, setSettings] = useState<HeroSettings>(initialSettings || DEFAULT_SETTINGS);
  // NOTE: we keep isLoading for internal use, but default it to false so UI doesn't block
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only fetch if data wasn't provided via props
    if (initialSettings) return;

    const fetchSettings = async () => {
      // If you want a visual indicator while loading, you can set isLoading(true) here
      try {
        const response = await fetch('/api/hero-settings');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setSettings(result.data);
          }
        }
      } catch (error) {
        console.error('Failed to load hero settings:', error);
        // Use default settings on error
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch in background; UI is shown immediately without spinner
    fetchSettings();
  }, [initialSettings]);

  return { settings, isLoading };
};

const useSlidingText = (texts: string[], interval = 3000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (texts.length === 0) return;
    const timer = setInterval(() => 
      setCurrentIndex((prev) => (prev + 1) % texts.length), 
      interval
    );
    return () => clearInterval(timer);
  }, [texts.length, interval]);
  
  return texts[currentIndex] || texts[0] || "Search...";
};

// --- Enhanced AI Chat Components ---
const TourCard = ({ tour }: { tour: any }) => (
  <motion.a
    href={`/${tour.slug}`}
    target="_blank"
    rel="noopener noreferrer"
    className="group block flex-shrink-0 w-[260px] bg-white rounded-2xl overflow-hidden border-2 border-gray-100 shadow-md hover:shadow-2xl hover:border-blue-200 transition-all duration-300"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ y: -6, scale: 1.02 }}
  >
    {tour.image && (
      <div className="relative h-36 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
        <img
          src={tour.image}
          alt={tour.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {tour.duration && (
          <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-[10px] font-bold shadow-lg flex items-center gap-1">
            <Clock className="w-3 h-3" strokeWidth={2.5} />
            {tour.duration}
          </div>
        )}
        {tour.isFeatured && (
          <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full text-[9px] font-bold shadow-md">
            ⭐ Featured
          </div>
        )}
      </div>
    )}
    <div className="p-3.5">
      <h3 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug min-h-[38px]">
        {tour.title}
      </h3>
      {tour.location && (
        <div className="flex items-center gap-1.5 text-[11px] mb-2.5">
          <MapPin className="w-3.5 h-3.5 text-blue-500" strokeWidth={2} />
          <span className="line-clamp-1 font-medium text-gray-600">{tour.location}</span>
        </div>
      )}
      <div className="flex items-center justify-between pt-2.5 border-t-2 border-gray-50">
        {tour.rating && (
          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" strokeWidth={2} />
            <span className="text-[11px] font-bold text-gray-900">{tour.rating}</span>
            {tour.reviews && <span className="text-[10px] text-gray-400">({tour.reviews})</span>}
          </div>
        )}
        {tour.price && (
          <div className="flex items-center gap-0.5 text-blue-600 font-black text-base">
            <DollarSign className="w-4 h-4" strokeWidth={3} />
            <span>{tour.price}</span>
          </div>
        )}
      </div>
    </div>
  </motion.a>
);

const TourSlider = ({ tours }: { tours: any[] }) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 280;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  const checkScrollPosition = useCallback(() => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    const slider = sliderRef.current;
    if (slider && tours.length > 0) {
      slider.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
      return () => slider.removeEventListener('scroll', checkScrollPosition);
    }
  }, [tours.length, checkScrollPosition]);

  return (
    <div className="relative w-full my-3">
      {tours.length > 1 && (
        <>
          <AnimatePresence>
            {showLeftArrow && (
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onClick={() => scroll('left')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-xl flex items-center justify-center hover:bg-white transition-all border border-gray-100"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showRightArrow && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => scroll('right')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-xl flex items-center justify-center hover:bg-white transition-all border border-gray-100"
              >
                <ChevronRight className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </>
      )}
      <div
        ref={sliderRef}
        className="flex gap-3.5 overflow-x-auto scrollbar-hide scroll-smooth py-2 px-1"
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
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 280;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  const checkScrollPosition = useCallback(() => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    const slider = sliderRef.current;
    if (slider) {
      slider.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
      return () => slider.removeEventListener('scroll', checkScrollPosition);
    }
  }, [destinations.length, checkScrollPosition]);

  return (
    <div className="relative w-full my-3">
      {destinations.length > 1 && (
        <>
          <AnimatePresence>
            {showLeftArrow && (
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onClick={() => scroll('left')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-xl flex items-center justify-center hover:bg-white transition-all border border-gray-100"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showRightArrow && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => scroll('right')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-xl flex items-center justify-center hover:bg-white transition-all border border-gray-100"
              >
                <ChevronRight className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </>
      )}
      <div
        ref={sliderRef}
        className="flex gap-3.5 overflow-x-auto scrollbar-hide scroll-smooth py-2 px-1"
      >
        {destinations.map((destination, idx) => (
          <a
            key={idx}
            href={`/destinations/${destination.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group block flex-shrink-0 w-[280px] bg-white rounded-2xl overflow-hidden border-2 border-gray-100 shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
          >
            {destination.image && (
              <div className="relative h-40 bg-gradient-to-br from-emerald-100 to-teal-100 overflow-hidden">
                <img
                  src={destination.image}
                  alt={destination.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                {destination.isFeatured && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                    <Star className="w-3 h-3 fill-current" />
                    Featured
                  </div>
                )}
              </div>
            )}
            <div className="p-4">
              <h3 className="font-bold text-base mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors leading-tight">
                {destination.name}
              </h3>
              {destination.description && (
                <p className="text-gray-500 text-xs mb-3 line-clamp-2 leading-relaxed">
                  {destination.description}
                </p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
                  <span className="font-medium">{destination.tourCount || 0} tours</span>
                </div>
                <span className="text-emerald-600 text-xs font-semibold group-hover:translate-x-1 transition-transform">
                  Explore →
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

// --- Reusable Components ---
const HeroSearchBar = ({ suggestion }: { suggestion: string }) => {
  const { getSiteName } = useTenant();
  const [query, setQuery] = useState(''); // Unified input for both search and chat
  const [isExpanded, setIsExpanded] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // AI SDK Chat Setup
  const {
    messages,
    sendMessage,
    status,
    stop: _stop,
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

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  useEffect(() => {
    if (isExpanded && containerRef.current) {
      const timeout = setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [isExpanded]);

  const handleCloseDropdown = () => {
    setIsExpanded(false);
    setChatMode(false);
  };

  const handleOpenAIChat = () => {
    setIsExpanded(true);
    setChatMode(true);
    if (query) {
      setTimeout(() => sendMessage({ text: query }), 300);
      setQuery('');
    }
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  };

  const handleBackToSearch = () => {
    setChatMode(false);
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (chatMode) {
      sendMessage({ text: query });
      setQuery('');
    } else {
      setIsExpanded(true);
    }
  };

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
    
    let scrollTimeout: NodeJS.Timeout | undefined;
    
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

  // State for detected content - stored per message ID
  const [detectedToursByMessage, setDetectedToursByMessage] = useState<Record<string, any[]>>({});
  const [detectedDestinationsByMessage, setDetectedDestinationsByMessage] = useState<Record<string, any[]>>({});

  // Clear chat function
  const handleClearChat = () => {
    setDetectedToursByMessage({});
    setDetectedDestinationsByMessage({});
    sendMessage({ text: '' }); // Reset chat messages
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = 0;
      }
    }, 100);
  };

  // Parse tour information from text and fetch from Algolia
  const detectAndFetchTours = useCallback(async (text: string) => {
    try {
      const tourPatterns = [
        /(?:^|\n)\s*(?:\d+\.\s*)?(?:Cairo:|Luxor:|Aswan:|Alexandria:|Hurghada:|Sharm El Sheikh:)?\s*([^($\n—]+?)\s+(?:\(\$|—\s*\$)(\d+)\)?/gm,
        /(?:^|\n)\s*(?:\d+\.\s*)?([A-Z][^($\n—]+?Tour[^($\n—]*?)\s+(?:\(\$|—\s*\$)(\d+)\)?/gm,
        /\*\*([^*]+?)\*\*\s+(?:\(\$|—\s*\$)(\d+)\)?/g,
        /(?:^|\n)\s*(?:\d+\.\s*)?([^—\n]{15,}?)\s+—\s*\$(\d+)/gm,
      ];

      const potentialTours = new Map<string, number>();

      for (const pattern of tourPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            const title = match[1].trim().replace(/^(Cairo:|Luxor:|Aswan:|Alexandria:|Hurghada:|Sharm El Sheikh:)\s*/i, '');
            const price = match[2] ? parseInt(match[2]) : 0;
            if (title.length > 10) {
              potentialTours.set(title, price);
            }
          }
        }
      }

      if (potentialTours.size > 0) {
        const toursArray = Array.from(potentialTours.entries()).slice(0, 4);
        const searchPromises = toursArray.map(async ([tourTitle]) => {
          try {
            let response = await searchClient.search([{
              indexName: INDEX_TOURS,
              params: {
                query: tourTitle,
                hitsPerPage: 1,
              }
            }]);
            let firstResult = response.results[0] as any;

            if (!firstResult?.hits?.length) {
              const keywords = tourTitle.split(/\s+/).filter(w => w.length > 3).slice(0, 4).join(' ');
              response = await searchClient.search([{
                indexName: INDEX_TOURS,
                params: {
                  query: keywords,
                  hitsPerPage: 1,
                }
              }]);
              firstResult = response.results[0] as any;
            }

            return firstResult?.hits?.[0];
          } catch (error) {
            console.error('Error searching for tour:', tourTitle, error);
            return null;
          }
        });

        const tours = (await Promise.all(searchPromises)).filter(Boolean);
        if (tours.length > 0) {
          const uniqueTours = tours.reduce((acc: any[], tour: any) => {
            const tourId = tour.slug || tour.objectID;
            if (!acc.find(t => (t.slug || t.objectID) === tourId)) {
              acc.push(tour);
            }
            return acc;
          }, []);

          return uniqueTours.map((tour: any) => ({
            slug: tour.slug || tour.objectID,
            title: tour.title || 'Untitled Tour',
            image: tour.image || tour.images?.[0] || tour.primaryImage,
            location: tour.location,
            duration: tour.duration,
            rating: tour.rating,
            reviews: tour.reviews,
            price: tour.discountPrice || tour.price,
            discountPrice: tour.discountPrice,
            originalPrice: tour.price,
            isFeatured: tour.isFeatured,
          }));
        }
      }
    } catch (error) {
      console.error('Error detecting tours:', error);
    }
    return [];
  }, []);

  // Parse destination information from text and fetch from Algolia
  const detectAndFetchDestinations = useCallback(async (text: string) => {
    try {
      const destinationNames = new Map<string, boolean>();

      // Common Egypt destinations to look for
      const egyptDestinations = ['Cairo', 'Luxor', 'Aswan', 'Alexandria', 'Hurghada', 'Sharm El Sheikh', 'Dahab', 'Makadi Bay', 'Marsa Alam', 'El Gouna'];

      for (const dest of egyptDestinations) {
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
            const firstResult = response.results[0] as any;
            return firstResult?.hits?.[0];
          } catch (error) {
            console.error('Error searching for destination:', destName, error);
            return null;
          }
        });

        const destinations = (await Promise.all(searchPromises)).filter(Boolean);
        if (destinations.length > 0) {
          const uniqueDestinations = destinations.reduce((acc: any[], dest: any) => {
            const destId = dest.slug || dest.objectID;
            if (!acc.find(d => (d.slug || d.objectID) === destId)) {
              acc.push(dest);
            }
            return acc;
          }, []);

          return uniqueDestinations.map((dest: any) => ({
            slug: dest.slug || dest.objectID,
            name: dest.name || 'Untitled Destination',
            image: dest.image || dest.images?.[0] || dest.primaryImage,
            description: dest.description,
            tourCount: dest.tourCount || 0,
            isFeatured: dest.isFeatured,
          }));
        }
      }
    } catch (error) {
      console.error('Error detecting destinations:', error);
    }
    return [];
  }, []);

  // Render tool outputs (tours) - enhanced version
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

  // Detect tours and destinations in messages
  useEffect(() => {
    if (isGenerating) return;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role === 'user') {
      return;
    }

    if (lastMessage.role === 'assistant') {
      const messageId = lastMessage.id;
      if (detectedToursByMessage[messageId] || detectedDestinationsByMessage[messageId]) {
        return;
      }

      const textParts = lastMessage.parts?.filter((p: any) => p.type === 'text') || [];
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
        detectAndFetchDestinations(fullText).then(destinations => {
          if (destinations.length > 0) {
            setDetectedDestinationsByMessage(prev => ({
              ...prev,
              [messageId]: destinations
            }));
          }
        });
      } else if (hasTourPattern) {
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

  // Render message content - enhanced version with hide details option
  const renderContent = useCallback((parts: any[], messageId?: string, hideDetails: boolean = false, isUser: boolean = false) => {
    const hasDetectedTours = messageId && detectedToursByMessage[messageId];
    const _hasDetectedDestinations = messageId && detectedDestinationsByMessage[messageId];

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
            <div key={idx} className="leading-relaxed font-medium">
              {p.text}
            </div>
          );
        }

        // If we have detected tours/destinations, show a simplified version of the text
        if (hideDetails) {
          const lines = p.text.split('\n');
          const introLines = [];
          let foundTourContent = false;

          for (const line of lines) {
            const trimmed = line.trim();

            // Stop when we hit tour-related content
            if (
              /^(?:Luxor|Cairo|Aswan|Alexandria|Hurghada|Sharm El Sheikh|Makadi Bay|From):/i.test(trimmed) ||
              /^(\d+[\.\)]\s*|^\d+\s*$)/.test(trimmed) ||
              /^(?:Duration|Highlights?|Why you'?ll love it|Price|From|Perfect for):/i.test(trimmed) ||
              /\(\$\d+\)/.test(trimmed) ||
              /^\*\*[A-Z]/.test(trimmed) ||
              /^[A-Z][a-zA-Z\s]{10,}(?:Tour|Day|Trip|Experience|Adventure)/.test(trimmed) ||
              /^[•\-\*]\s*(?:Price|Duration|Highlights|Perfect)/i.test(trimmed)
            ) {
              foundTourContent = true;
              break;
            }

            introLines.push(line);
          }

          const introText = introLines.join('\n').trim();

          if (foundTourContent && (!introText || introText.length < 20)) {
            return (
              <div key={idx} className="text-gray-800 text-sm sm:text-base leading-relaxed">
                {hasDetectedTours ? 'Here are some tours I found for you:' : 'Here are some destinations I found for you:'}
              </div>
            );
          }

          if (introText && introText.length >= 20) {
            return (
              <div key={idx} className="prose prose-sm max-w-none text-gray-800 leading-relaxed text-sm sm:text-[15px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {introText}
                </ReactMarkdown>
              </div>
            );
          }

          return (
            <div key={idx} className="text-gray-800 text-sm sm:text-base leading-relaxed">
              {hasDetectedTours ? 'Here are some tours I found for you:' : 'Here are some destinations I found for you:'}
            </div>
          );
        }

        return (
          <div key={idx} className="prose prose-sm max-w-none text-gray-800 leading-relaxed text-sm sm:text-[15px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {p.text}
            </ReactMarkdown>
          </div>
        );
      }
      return null;
    }).filter(Boolean);
  }, [renderToolOutput, detectedToursByMessage, detectedDestinationsByMessage]);

  return (
    <div className="mt-8 lg:mt-10 w-full flex justify-center md:justify-start pointer-events-auto" ref={containerRef} style={{ position: 'relative', zIndex: 1000 }}>
      <div className="relative w-full max-w-sm md:max-w-xl pointer-events-auto" style={{ zIndex: 1000 }}>
        <motion.div
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="relative group"
        >
          {/* Main Search/Chat Input Box - Enhanced */}
          <form onSubmit={handleSubmit}>
            <div
              className={`relative bg-white/98 backdrop-blur-2xl rounded-full transition-all duration-500 ease-out ${
                isExpanded || isFocused
                  ? 'shadow-[0_20px_60px_-15px_rgba(59,130,246,0.5)] border-2 border-blue-400 ring-4 ring-blue-100/50'
                  : 'shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border-2 border-white/40 hover:border-blue-300 hover:shadow-[0_20px_50px_-15px_rgba(59,130,246,0.4)]'
              }`}
            >
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => {
                    setIsExpanded(true);
                    setIsFocused(true);
                  }}
                  onBlur={() => setIsFocused(false)}
                  placeholder={chatMode ? `Ask AI anything about tours...` : suggestion}
                  className="w-full pl-16 md:pl-[70px] pr-14 md:pr-20 py-4 md:py-5 text-sm md:text-base text-gray-900 placeholder:text-gray-400/70 placeholder:font-normal font-medium bg-transparent outline-none rounded-full relative z-10 transition-all duration-300"
                  style={{ cursor: 'text' }}
                  disabled={chatMode && isGenerating}
                  autoComplete="off"
                />

              {/* Left Icon with Enhanced Animation */}
              <div className="absolute left-4 md:left-5 top-1/2 transform -translate-y-1/2 z-10">
                <motion.div
                  className="relative"
                  animate={!isExpanded ? { 
                    scale: [1, 1.08, 1],
                    rotate: [0, 5, -5, 0]
                  } : {}}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    isExpanded || isFocused
                      ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 shadow-xl shadow-blue-500/40 scale-110'
                      : 'bg-gradient-to-br from-blue-500 via-blue-400 to-purple-500 shadow-lg shadow-blue-400/30'
                  }`}>
                    <Search className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 text-white ${isExpanded ? 'scale-110' : ''}`} strokeWidth={2.5} />
                  </div>
                  <motion.div
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-md"
                    animate={{
                      scale: [1, 1.25, 1],
                      opacity: [1, 0.8, 1]
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
              </div>

              {/* Right Side Elements with Enhanced Animation */}
              <div className="absolute right-4 md:right-5 top-1/2 transform -translate-y-1/2 flex items-center gap-2 md:gap-2.5 z-10">
                {query ? (
                  <motion.button
                    type="button"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => {
                      setQuery('');
                      setIsExpanded(false);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 group"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" strokeWidth={2.5} />
                  </motion.button>
                ) : isExpanded ? (
                  <motion.div
                    initial={{ rotate: 180, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                  >
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/40">
                      <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-white" strokeWidth={2.5} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    type="button"
                    onClick={() => {
                      setIsExpanded(true);
                      handleOpenAIChat();
                    }}
                    animate={{
                      rotate: [0, 12, -12, 0],
                      scale: [1, 1.12, 1]
                    }}
                    transition={{
                      duration: 4.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    whileHover={{ scale: 1.2, rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-400/40 cursor-pointer hover:shadow-2xl hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 transition-all duration-300"
                    aria-label="Open AI Assistant"
                  >
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" strokeWidth={2.5} />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </form>
        </motion.div>

        {/* Enhanced Glassmorphism Dropdown with Background */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ 
                duration: 0.35, 
                ease: [0.34, 1.56, 0.64, 1],
                opacity: { duration: 0.25 }
              }}
              className="absolute top-full mt-4 left-0 right-0 backdrop-blur-[40px] rounded-[28px] shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/30 overflow-hidden glass-dropdown"
              style={{ 
                maxHeight: '70vh',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.3)',
                zIndex: 99999,
                position: 'absolute'
              }}
            >
              {/* Vibrant Background Layer for Glassmorphism */}
              <div className="absolute inset-0 z-0 opacity-90">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 via-purple-400/30 to-pink-400/30" />
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-300/20 via-transparent to-orange-300/20" />
                {/* Animated mesh gradient */}
                <motion.div
                  className="absolute inset-0 opacity-60"
                  animate={{
                    background: [
                      'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
                      'radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)',
                      'radial-gradient(circle at 50% 80%, rgba(236, 72, 153, 0.3) 0%, transparent 50%)',
                      'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
                    ],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full blur-3xl" />
              </div>
              
              {/* Content with glass effect */}
              <div className="relative z-10 bg-white/10 backdrop-blur-md"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
                }}
              >
              {/* Enhanced Header with Glass Effect */}
              <div className="px-6 py-4 border-b border-white/20 bg-white/20 backdrop-blur-lg relative overflow-hidden">
                {/* Animated shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                    repeatDelay: 1
                  }}
                />
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    {chatMode && (
                      <motion.button
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        onClick={handleBackToSearch}
                        className="mr-1 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 group"
                      >
                        <ArrowLeft className="w-4 h-4 text-gray-600 group-hover:text-gray-900 transition-colors" strokeWidth={2.5} />
                      </motion.button>
                    )}
                    {chatMode ? (
                      <motion.div 
                        className="flex items-center gap-2.5"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/30">
                          <Bot className="w-4 h-4 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-900 tracking-tight block drop-shadow-sm">
                            AI Travel Assistant
                          </span>
                          <span className="text-[10px] text-gray-600 font-medium drop-shadow-sm">
                            Powered by AI
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        className="flex items-center gap-3"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                      >
                        <motion.div 
                          className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-md shadow-blue-500/50"
                          animate={{
                            scale: [1, 1.4, 1],
                            opacity: [1, 0.7, 1]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        <div>
                          <span className="text-sm font-bold text-gray-900 tracking-tight block drop-shadow-sm">
                            {query ? 'Search Results' : getSiteName()}
                          </span>
                          <span className="text-[10px] text-gray-600 font-medium drop-shadow-sm">
                            {query ? 'Best matches for you' : 'Trending searches'}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {chatMode && messages.length > 0 && (
                      <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={handleClearChat}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 bg-white/80 border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm hover:shadow-md"
                      >
                        <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                        <span>New Chat</span>
                      </motion.button>
                    )}
                    <motion.button
                      onClick={() => {
                        setIsExpanded(false);
                        setChatMode(false);
                        setQuery('');
                      }}
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      className="text-gray-400 hover:text-gray-700 transition-all duration-200 p-2.5 rounded-xl hover:bg-gray-100 hover:shadow-lg group"
                    >
                      <X className="w-4 h-4 transition-transform duration-300" strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Results Area */}
              <div ref={chatContainerRef} className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(65vh - 120px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {chatMode ? (
                  /* Enhanced Chat Interface */
                  <motion.div 
                    className="p-5 space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {messages.length === 0 && (
                      <motion.div 
                        className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 p-5 rounded-2xl border-2 border-blue-100 shadow-sm"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <motion.div 
                            className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30"
                            animate={{ 
                              rotate: [0, 5, -5, 0],
                              scale: [1, 1.05, 1]
                            }}
                            transition={{ 
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <Bot className="text-white" size={20} strokeWidth={2.5} />
                          </motion.div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm mb-1.5">
                              {`Hi! I'm your AI Travel Assistant 👋`}
                            </p>
                            <p className="text-gray-600 text-xs leading-relaxed">
                              Ask me anything — I'll help you find tours, trips, prices, destinations & more.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {["Find me the best tour under $300", "Plan a 7-day itinerary", "What are the top tours?"].map((s, idx) => (
                            <motion.button
                              key={s}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => sendMessage({ text: s })}
                              className="px-3.5 py-2 bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 border-2 border-blue-100 hover:border-blue-300 rounded-xl text-xs font-semibold text-gray-700 hover:text-blue-700 transition-all shadow-sm hover:shadow-md"
                            >
                              {s}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {messages.map((m, idx) => {
                      const messageTours = detectedToursByMessage[m.id] || [];
                      const messageDestinations = detectedDestinationsByMessage[m.id] || [];
                      const hasDetectedTours = messageTours.length > 0;
                      const hasDetectedDestinations = messageDestinations.length > 0;
                      const hasDetectedContent = hasDetectedTours || hasDetectedDestinations;
                      const isUser = m.role === 'user';
                      const isLastAssistantMessage = m.role === 'assistant' && idx === messages.length - 1;
                      const isStreaming = isLastAssistantMessage && isGenerating;

                      return (
                        <div key={m.id}>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm sm:text-[15px] ${
                                isUser
                                  ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                                  : 'bg-white text-gray-800 border-2 border-gray-100 shadow-md'
                              }`}
                            >
                              <div className="space-y-2">
                                {renderContent(m.parts, m.id, hasDetectedContent, isUser)}
                              </div>
                            </div>
                          </motion.div>
                          
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
                        className="flex items-center gap-3 text-gray-600 bg-white px-4 py-3 rounded-2xl border-2 border-gray-100 shadow-md"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
                        </motion.div>
                        <div>
                          <span className="text-sm font-semibold text-gray-900">AI is thinking...</span>
                          <p className="text-[10px] text-gray-500">Finding the best options for you</p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ) : query ? (
                  <InstantSearch searchClient={searchClient} indexName={INDEX_TOURS}>
                    <CustomSearchBox searchQuery={query} onSearchChange={setQuery} />

                    {/* Tours Index */}
                    <Index indexName={INDEX_TOURS}>
                      <Configure hitsPerPage={5} />
                      <TourHits onHitClick={handleCloseDropdown} limit={5} />
                    </Index>

                    {/* Destinations Index */}
                    <Index indexName={INDEX_DESTINATIONS}>
                      <Configure hitsPerPage={3} />
                      <DestinationHits onHitClick={handleCloseDropdown} limit={3} />
                    </Index>

                    {/* Categories Index */}
                    <Index indexName={INDEX_CATEGORIES}>
                      <Configure hitsPerPage={3} />
                      <CategoryHits onHitClick={handleCloseDropdown} limit={3} />
                    </Index>
                  </InstantSearch>
                ) : (
                  // Enhanced Trending Searches
                  <motion.div 
                    className="p-6 md:p-7"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center gap-2.5 mb-5">
                      <motion.div
                        animate={{ 
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Sparkles className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
                      </motion.div>
                      <div>
                        <span className="text-sm font-bold text-gray-900 tracking-tight block">
                          Trending Tours
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          Most searched this week
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {['Day Tours', 'Snorkeling', 'Desert Safari', 'Boat Trips', 'Sightseeing', 'Diving'].map((trend, idx) => (
                        <motion.button
                          key={trend}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setQuery(trend);
                            setIsExpanded(true);
                            setChatMode(false);
                          }}
                          className="px-4 py-2.5 bg-gradient-to-br from-white to-gray-50 backdrop-blur-sm border-2 border-gray-100 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 hover:border-blue-300 hover:text-blue-700 hover:shadow-lg transition-all duration-300 group"
                        >
                          <span className="flex items-center gap-1.5">
                            <Search className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" strokeWidth={2.5} />
                            {trend}
                          </span>
                        </motion.button>
                      ))}
                    </div>

                    {/* Enhanced AI Assistant CTA */}
                    <motion.div 
                      className="mt-7 pt-6 border-t-2 border-gray-100"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <motion.button
                        onClick={handleOpenAIChat}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 px-5 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group"
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                          animate={{
                            x: ['-100%', '200%'],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        />
                        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform relative z-10" strokeWidth={2.5} />
                        <span className="text-sm font-bold relative z-10">Ask AI Travel Assistant</span>
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="relative z-10"
                        >
                          <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                        </motion.div>
                      </motion.button>
                      <p className="text-center text-[11px] text-gray-500 mt-3 font-medium">
                        Get personalized tour recommendations instantly
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const BackgroundSlideshow = ({
  slides = [],
  delay = 6000,
  fadeMs = 900,
  autoplay = true
}: {
  slides?: Array<{src: string, alt: string, caption?: string}>,
  delay?: number,
  fadeMs?: number,
  autoplay?: boolean
}) => {
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;

    const next = () => setIndex((i) => (i + 1) % slides.length);
    timeoutRef.current = window.setTimeout(next, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [index, slides.length, delay, autoplay]);

  if (slides.length === 0) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-800">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {slides.map((s, i) => {
        const visible = i === index;
        const isPriority = i === 0; // First image gets priority loading
        return (
          <div
            key={`${s.src}-${i}`}
            aria-hidden={!visible}
            className="absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out"
            style={{
              opacity: visible ? 1 : 0,
              transitionDuration: `${fadeMs}ms`,
              transform: visible ? 'scale(1)' : 'scale(1.02)',
            }}
          >
            {/* Using Next.js Image for automatic optimization, WebP/AVIF conversion, and blur placeholder */}
            <Image
              src={s.src}
              alt={s.alt}
              fill
              priority={isPriority}
              quality={85}
              sizes="100vw"
              loading={isPriority ? 'eager' : 'lazy'}
              className="object-cover"
              style={{
                objectFit: 'cover',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
};

// --- Main HeroSection Component ---
interface HeroSectionProps {
  initialSettings?: HeroSettings | null;
}

export default function HeroSection({ initialSettings }: HeroSectionProps = {}) {
  const { settings } = useHeroSettings(initialSettings);

  // Create slides from settings
  const slides = settings.backgroundImages.map(img => ({
    src: img.desktop,
    alt: img.alt,
    caption: img.alt
  }));

  // Use settings for sliding text
  const currentSuggestion = useSlidingText(settings.searchSuggestions, 3000);

  // NOTE: no early return with spinner — UI renders immediately
  return (
    <>
      <section className="relative h-screen min-h-[600px] max-h-[900px] w-full flex items-center justify-center text-white font-sans" style={{ overflow: 'visible' }}>
        <BackgroundSlideshow
          slides={slides}
          delay={settings.animationSettings.slideshowSpeed * 1000}
          fadeMs={settings.animationSettings.fadeSpeed}
          autoplay={settings.animationSettings.enableAutoplay}
        />

        {/* Overlay with settings */}
        <div
          className="absolute inset-0 z-1 pointer-events-none"
          style={{
            background: settings.overlaySettings.gradientType === 'custom'
              ? settings.overlaySettings.customGradient
              : settings.overlaySettings.gradientType === 'dark'
                ? `linear-gradient(to br, rgba(0,0,0,${settings.overlaySettings.opacity}), rgba(0,0,0,${settings.overlaySettings.opacity * 0.7}))`
                : `linear-gradient(to br, rgba(255,255,255,${settings.overlaySettings.opacity}), rgba(255,255,255,${settings.overlaySettings.opacity * 0.7}))`
          }}
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center h-full text-center md:items-start md:text-left" style={{ overflow: 'visible' }}>
          <div className="max-w-xl" style={{ overflow: 'visible', position: 'relative' }}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold uppercase leading-tight tracking-wide text-shadow-lg">
              {settings.title.main}
              {settings.title.highlight && (
                <>
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                    {settings.title.highlight}
                  </span>
                </>
              )}
            </h1>
            <p className="mt-4 text-base sm:text-lg md:text-xl text-shadow font-light max-w-md mx-auto md:mx-0">
              {settings.subtitle || 'Unforgettable excursions — discover amazing tours and experiences.'}
            </p>

            <HeroSearchBar
              suggestion={currentSuggestion}
            />

            {/* Trust Indicators */}
            {settings.trustIndicators.isVisible && (
              <div className="mt-6 flex items-center justify-center md:justify-start gap-6 text-white/80 text-sm">
                <span>{settings.trustIndicators.travelers}</span>
                <span>{settings.trustIndicators.ratingText}</span>
                <span>{settings.trustIndicators.rating}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <style jsx global>{`
        @keyframes fade-in { 
          from { opacity: 0; } 
          to { opacity: 1; } 
        }
        
        @keyframes slide-from-top { 
          from { opacity: 0; transform: translateY(-30px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        
        @keyframes text-slide-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        /* Smooth pulse animation */
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.2; }
        }

        /* Gradient shift animation */
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        /* Enhanced Custom scrollbar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #94a3b8, #64748b);
          background-clip: content-box;
        }

        /* Hide scrollbar but keep functionality */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .animate-fade-in { 
          animation: fade-in 0.3s ease-out forwards; 
        }
        
        .animate-slide-from-top { 
          animation: slide-from-top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; 
        }
        
        .animate-text-slide-in { 
          animation: text-slide-in 0.5s ease-out forwards; 
        }

        /* Enhanced text shadows */
        .text-shadow { 
          text-shadow: 1px 1px 6px rgb(0 0 0 / 0.5), 0 0 20px rgb(0 0 0 / 0.3); 
        }
        
        .text-shadow-lg { 
          text-shadow: 2px 2px 10px rgb(0 0 0 / 0.6), 0 0 30px rgb(0 0 0 / 0.4); 
        }
        
        .font-sans { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Image optimization */
        img { 
          backface-visibility: hidden; 
          -webkit-backface-visibility: hidden;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }

        /* Smooth transitions */
        * {
          scroll-behavior: smooth;
        }

        /* Hide default Algolia styling */
        .ais-InstantSearch {
          font-family: inherit;
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

        /* Glassmorphism dropdown effect */
        .glass-dropdown {
          -webkit-backdrop-filter: saturate(180%) blur(40px);
          backdrop-filter: saturate(180%) blur(40px);
          position: relative;
        }

        .glass-dropdown::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 28px;
          padding: 1px;
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.4) 0%, 
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0.4) 100%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 1;
        }

        /* Subtle noise texture for realism */
        .glass-dropdown::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 28px;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
          opacity: 0.5;
          mix-blend-mode: overlay;
          pointer-events: none;
          z-index: 2;
        }

        /* Enhanced markdown prose styles */
        .prose {
          max-width: none;
        }

        .prose p {
          margin-bottom: 0.75em;
          line-height: 1.7;
        }

        .prose ul, .prose ol {
          margin-top: 0.5em;
          margin-bottom: 0.75em;
          padding-left: 1.5em;
        }

        .prose li {
          margin-bottom: 0.25em;
        }

        .prose strong {
          color: #1f2937;
          font-weight: 600;
        }

        .prose code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.375rem;
          font-size: 0.875em;
          font-weight: 500;
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          
          .animate-text-slide-in,
          .animate-pulse-slow,
          .animate-shimmer,
          .animate-float {
            animation: none;
          }
        }

        /* Focus visible for keyboard navigation */
        *:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        /* Ensure hero section allows dropdown overflow */
        section {
          overflow: visible !important;
        }

        /* Ensure dropdown stays in hero section */
        .glass-dropdown {
          position: absolute !important;
        }
      `}</style>
    </>
  );
}