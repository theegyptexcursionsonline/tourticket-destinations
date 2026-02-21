// components/InterestGridServer.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTenant } from '@/contexts/TenantContext';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  Compass,
  Mountain,
  Waves,
  Palmtree,
  Landmark,
  Camera,
  UtensilsCrossed,
  Ticket,
  Users,
  Heart,
  Star,
  Globe,
  Binoculars,
  Plane,
  Ship,
  Map,
  Calendar,
  TreePine,
  Castle,
  Church,
  Building2,
  Tent,
  Footprints,
  Sunset,
  Sparkles,
  Bot,
  Loader2,
  ArrowLeft,
  Send,
  X,
  MapPin,
  Clock,
} from "lucide-react";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Grid } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { Category } from '@/types';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Index, useSearchBox, useHits, Configure } from 'react-instantsearch';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import 'instantsearch.css/themes/satellite.css';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/grid';

// Algolia Configuration
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';
const INDEX_DESTINATIONS = 'destinations';
const INDEX_CATEGORIES = 'categories';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

interface InterestGridServerProps {
  categories: Category[];
}

interface Interest {
  _id?: string;
  type?: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
}

// Icon Mapping System
const getIconForInterest = (name: string, _slug: string) => {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('pyramid') || lowerName.includes('giza')) return { Icon: Landmark, gradient: 'from-amber-500 to-yellow-600' };
  if (lowerName.includes('museum') || lowerName.includes('antiquities')) return { Icon: Building2, gradient: 'from-purple-500 to-indigo-600' };
  if (lowerName.includes('temple') || lowerName.includes('luxor') || lowerName.includes('karnak')) return { Icon: Church, gradient: 'from-orange-500 to-red-600' };
  if (lowerName.includes('castle') || lowerName.includes('fortress') || lowerName.includes('citadel')) return { Icon: Castle, gradient: 'from-slate-600 to-slate-800' };
  if (lowerName.includes('historic') || lowerName.includes('ancient') || lowerName.includes('pharaoh')) return { Icon: Landmark, gradient: 'from-amber-600 to-orange-700' };

  if (lowerName.includes('desert') || lowerName.includes('safari') || lowerName.includes('sand')) return { Icon: Sunset, gradient: 'from-orange-400 to-red-500' };
  if (lowerName.includes('mountain') || lowerName.includes('hiking') || lowerName.includes('trek')) return { Icon: Mountain, gradient: 'from-emerald-500 to-teal-600' };
  if (lowerName.includes('beach') || lowerName.includes('sea') || lowerName.includes('diving') || lowerName.includes('snorkel')) return { Icon: Waves, gradient: 'from-cyan-500 to-blue-600' };
  if (lowerName.includes('oasis') || lowerName.includes('palm')) return { Icon: Palmtree, gradient: 'from-green-500 to-emerald-600' };
  if (lowerName.includes('camping') || lowerName.includes('outdoor')) return { Icon: Tent, gradient: 'from-lime-500 to-green-600' };
  if (lowerName.includes('wildlife') || lowerName.includes('nature')) return { Icon: TreePine, gradient: 'from-green-600 to-emerald-700' };

  if (lowerName.includes('cruise') || lowerName.includes('nile') || lowerName.includes('boat')) return { Icon: Ship, gradient: 'from-blue-500 to-indigo-600' };
  if (lowerName.includes('tour') || lowerName.includes('sightseeing') || lowerName.includes('guided')) return { Icon: Binoculars, gradient: 'from-violet-500 to-purple-600' };
  if (lowerName.includes('photo') || lowerName.includes('photography')) return { Icon: Camera, gradient: 'from-pink-500 to-rose-600' };
  if (lowerName.includes('food') || lowerName.includes('culinary') || lowerName.includes('dining')) return { Icon: UtensilsCrossed, gradient: 'from-red-500 to-orange-600' };
  if (lowerName.includes('walking') || lowerName.includes('walk')) return { Icon: Footprints, gradient: 'from-teal-500 to-cyan-600' };
  if (lowerName.includes('day trip') || lowerName.includes('excursion')) return { Icon: Calendar, gradient: 'from-indigo-500 to-blue-600' };

  if (lowerName.includes('city') || lowerName.includes('cairo') || lowerName.includes('alexandria')) return { Icon: Building2, gradient: 'from-slate-500 to-gray-600' };
  if (lowerName.includes('market') || lowerName.includes('bazaar') || lowerName.includes('shopping')) return { Icon: Package, gradient: 'from-fuchsia-500 to-pink-600' };

  if (lowerName.includes('family') || lowerName.includes('kids') || lowerName.includes('children')) return { Icon: Users, gradient: 'from-yellow-500 to-amber-600' };
  if (lowerName.includes('romantic') || lowerName.includes('couple') || lowerName.includes('honeymoon')) return { Icon: Heart, gradient: 'from-rose-500 to-red-600' };
  if (lowerName.includes('luxury') || lowerName.includes('premium') || lowerName.includes('vip')) return { Icon: Star, gradient: 'from-amber-500 to-yellow-600' };
  if (lowerName.includes('adventure') || lowerName.includes('extreme')) return { Icon: Compass, gradient: 'from-red-500 to-orange-600' };

  if (lowerName.includes('flight') || lowerName.includes('air')) return { Icon: Plane, gradient: 'from-sky-500 to-blue-600' };
  if (lowerName.includes('transfer') || lowerName.includes('transport')) return { Icon: Map, gradient: 'from-gray-500 to-slate-600' };

  if (lowerName.includes('attraction') || lowerName.includes('landmark')) return { Icon: Compass, gradient: 'from-red-600 to-rose-700' };
  if (lowerName.includes('ticket') || lowerName.includes('pass')) return { Icon: Ticket, gradient: 'from-purple-500 to-violet-600' };

  return { Icon: Globe, gradient: 'from-blue-500 to-cyan-600' };
};

// Interest Card Component
const InterestCard = ({ interest }: { interest: Interest }) => {
  const t = useTranslations();
  const { Icon, gradient } = getIconForInterest(interest.name, interest.slug);
  const linkUrl = `/categories/${interest.slug}`;

  return (
    <Link
      href={linkUrl}
      className="group relative block text-start bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-200 hover:border-red-300 h-full"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-orange-50/30 to-amber-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative z-10 p-5 sm:p-6 flex flex-col h-full">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
            <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2} />
          </div>

          {interest.featured && (
            <span className="px-2.5 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              {t('tourCard.featured')}
            </span>
          )}
        </div>

        <div className="flex-grow mb-4">
          <h4 className="font-bold text-slate-900 text-base sm:text-lg leading-snug group-hover:text-red-600 transition-colors duration-300 line-clamp-2">
            {interest.name}
          </h4>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center w-9 h-9 bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 rounded-lg transition-all`}>
              <Package className="w-4 h-4 text-slate-700" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 font-medium leading-tight">Available</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {interest.products} {interest.products === 1 ? 'tour' : 'tours'}
              </span>
            </div>
          </div>

          <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:scale-110`}>
            <ArrowRight className="w-5 h-5 text-white transform group-hover:translate-x-0.5 transition-transform duration-300" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      <div className={`absolute bottom-0 start-0 end-0 h-1 bg-gradient-to-r ${gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
    </Link>
  );
};

// Custom SearchBox component
function CustomSearchBox({ searchQuery, onSearchChange: _onSearchChange }: { searchQuery: string; onSearchChange: (value: string) => void }) {
  const { refine } = useSearchBox();

  useEffect(() => {
    refine(searchQuery);
  }, [searchQuery, refine]);

  return null;
}

// Tour Hits Component with card layout
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
          <span className="ms-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
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
                className="absolute start-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all hover:scale-110"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="absolute end-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all hover:scale-110"
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
                      <div className="absolute top-2 start-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 shadow-md">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        Featured
                      </div>
                    )}
                    {tour.originalPrice && tour.discountPrice && tour.discountPrice < tour.originalPrice && (
                      <div className="absolute top-2 end-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
                        -{Math.round(((tour.originalPrice - tour.discountPrice) / tour.originalPrice) * 100)}%
                      </div>
                    )}
                    {tour.duration && (
                      <div className="absolute bottom-2 start-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1">
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

function DestinationHits({ onHitClick, limit = 3 }: { onHitClick?: () => void; limit?: number }) {
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
          <span className="ms-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
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

function CategoryHits({ onHitClick, limit = 3 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-purple-500/5 via-fuchsia-500/5 to-pink-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Ticket className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            Categories
          </span>
          <span className="ms-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
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
              <Ticket className="w-6 md:w-7 h-6 md:h-7 text-purple-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-purple-600 transition-colors duration-300">
                {hit.name || 'Untitled Category'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
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

export default function InterestGridServer({ categories }: InterestGridServerProps) {
  const { getSiteName } = useTenant();
  const t = useTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [swiperRef, setSwiperRef] = useState<SwiperType | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [chatMode, setChatMode] = useState(false);
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
    if (searchTerm) {
      setTimeout(() => sendMessage({ text: searchTerm }), 300);
      setSearchTerm('');
    }
  };

  const handleBackToSearch = () => {
    setChatMode(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    if (chatMode) {
      sendMessage({ text: searchTerm });
      setSearchTerm('');
    } else {
      setIsExpanded(true);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (!chatContainerRef.current) return;
    setTimeout(() => {
      chatContainerRef.current!.scrollTop = chatContainerRef.current!.scrollHeight;
    }, 100);
  }, [messages, isGenerating]);

  // State for detected content
  const [detectedToursByMessage, setDetectedToursByMessage] = useState<Record<string, any[]>>({});

  // Parse tour information from text and fetch from Algolia
  const detectAndFetchTours = useCallback(async (text: string) => {
    try {
      const tourPatterns = [
        /(?:^|\n)\s*(?:\d+\.\s*)?(?:Cairo:|Luxor:|Aswan:|Alexandria:|Hurghada:|Sharm El Sheikh:)?\s*([^($\n—]+?)\s+(?:\(\$|—\s*\$)(\d+)\)?/gm,
        /(?:^|\n)\s*(?:\d+\.\s*)?([A-Z][^($\n—]+?Tour[^($\n—]*?)\s+(?:\(\$|—\s*\$)(\d+)\)?/gm,
        /\*\*([^*]+?)\*\*\s+(?:\(\$|—\s*\$)(\d+)\)?/g,
        /(?:^|\n)\s*(?:\d+\.\s*)?([^—\n]{15,}?)\s+—\s*\$(\d+)/gm,
      ];

      const potentialTours: Map<string, number> = new (Map as any)();

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
        const searchPromises = toursArray.map(async ([tourTitle]: any) => {
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
              const keywords = tourTitle.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 4).join(' ');
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

  // Detect tours in messages
  useEffect(() => {
    if (isGenerating) return;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role === 'user') {
      return;
    }

    if (lastMessage.role === 'assistant') {
      const messageId = lastMessage.id;
      if (detectedToursByMessage[messageId]) {
        return;
      }

      const textParts = lastMessage.parts?.filter((p: any) => p.type === 'text') || [];
      const fullText = textParts.map((p: any) => p.text).join(' ');

      const hasTourPattern = /\$\d+/i.test(fullText) ||
                            (/tour/i.test(fullText) && /\(\$\d+\)/i.test(fullText));

      if (hasTourPattern) {
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
  }, [messages, isGenerating, detectAndFetchTours, detectedToursByMessage]);

  // Render tool outputs
  const renderToolOutput = useCallback((obj: any) => {
    if (Array.isArray(obj)) {
      const tours = obj.filter(item => item.title && item.slug);
      if (tours.length > 0) {
        return (
          <div className="my-3">
            <TourHits onHitClick={handleCloseDropdown} limit={tours.length} />
          </div>
        );
      }
    }
    if (obj.title && obj.slug) {
      return (
        <div className="my-3">
          <TourHits onHitClick={handleCloseDropdown} limit={1} />
        </div>
      );
    }
    if (obj.hits && Array.isArray(obj.hits)) {
      const tours = obj.hits.filter((item: any) => item.title && item.slug);
      if (tours.length > 0) {
        return (
          <div className="my-3">
            <TourHits onHitClick={handleCloseDropdown} limit={tours.length} />
          </div>
        );
      }
    }
    return (
      <pre className="bg-gray-900 text-gray-100 p-2 rounded-lg text-[10px] overflow-x-auto">
        {JSON.stringify(obj, null, 2)}
      </pre>
    );
  }, []);

  // Render message content
  const renderContent = useCallback((parts: any[], messageId?: string) => {
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
    }).concat(
      messageId && detectedToursByMessage[messageId] ? (
        <div key={`tours-${messageId}`} className="my-3">
          <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 backdrop-blur-xl border-b border-white/10">
            <div className="flex items-center gap-2 md:gap-2.5">
              <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <MapPin className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
                Recommended Tours
              </span>
            </div>
          </div>
          <div className="px-4 md:px-6 py-4">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-1">
              {detectedToursByMessage[messageId].map((tour: any, idx: number) => (
                <a
                  key={idx}
                  href={`/${tour.slug}`}
                  onClick={handleCloseDropdown}
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
                        <div className="absolute top-2 start-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 shadow-md">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Featured
                        </div>
                      )}
                      {tour.originalPrice && tour.discountPrice && tour.discountPrice < tour.originalPrice && (
                        <div className="absolute top-2 end-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
                          -{Math.round(((tour.originalPrice - tour.discountPrice) / tour.originalPrice) * 100)}%
                        </div>
                      )}
                      {tour.duration && (
                        <div className="absolute bottom-2 start-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1">
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
      ) : null
    ).filter(Boolean);
  }, [renderToolOutput, detectedToursByMessage]);

  // Convert categories to interests format
  const interests: Interest[] = categories.map(cat => ({
    _id: cat._id,
    type: 'category' as const,
    name: cat.name,
    slug: cat.slug,
    products: (cat as any).tourCount || 0,
    featured: (cat as any).featured || false
  }));

  // Filter interests based on search (only when not in AI mode)
  const filteredInterests = !isExpanded || chatMode ? interests : interests.filter(interest =>
    interest.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (categories.length === 0) {
    return null;
  }

  if (filteredInterests.length === 0) {
    return (
      <section className="relative bg-gradient-to-b from-white via-slate-50 to-white py-8 sm:py-12 md:py-16 lg:py-20">
        <div className="container mx-auto px-3 sm:px-4 max-w-[1400px] relative z-10">
          <div className="text-center py-12 sm:py-16">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-slate-300 to-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Search className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{t('search.noToursFound')}</h3>
            <p className="text-slate-600 text-sm">{t('search.tryDifferentSearch')}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative bg-gradient-to-b from-white via-slate-50 to-white py-8 sm:py-12 md:py-16 lg:py-20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 start-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 end-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-3 sm:px-4 max-w-[1400px] relative z-10">
        <div className="text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-red-100 to-orange-100 rounded-full mb-3 sm:mb-4 border border-red-200">
            <Sparkles className="w-3 sm:w-4 h-3 sm:h-4 text-red-600" />
            <span className="text-xs sm:text-sm font-bold text-red-700">{getSiteName()}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 mb-2 sm:mb-3 md:mb-4 leading-tight px-2 sm:px-4">
            {t('homepage.topActivities')}
          </h2>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed px-4">
            {t('homepage.discoverExperiences')}
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-6 sm:mb-8 md:mb-10 lg:mb-12 px-2 sm:px-0" ref={containerRef}>
          <form onSubmit={handleSubmit}>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur-md opacity-0 group-hover:opacity-20 group-focus-within:opacity-20 transition-opacity" />
              <div className="relative flex items-center">
                <Search className="absolute start-3 sm:start-4 md:start-5 w-4 sm:w-5 h-4 sm:h-5 text-slate-400 group-hover:text-red-500 group-focus-within:text-red-500 transition-colors z-10" />
                <input
                  type="text"
                  placeholder={chatMode ? "Ask AI anything about Egypt tours..." : "Search experiences by name..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsExpanded(true)}
                  className="w-full ps-10 sm:ps-12 md:ps-14 pe-12 sm:pe-14 md:pe-16 py-2.5 sm:py-3 md:py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm sm:text-base text-slate-900 placeholder:text-slate-400 shadow-sm hover:shadow-md font-medium"
                  disabled={chatMode && isGenerating}
                />
                <div className="absolute end-3 sm:end-4 md:end-5 flex items-center gap-2 z-10">
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setIsExpanded(false);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                  {!chatMode && (
                    <motion.button
                      type="button"
                      onClick={handleOpenAIChat}
                      animate={{
                        rotate: [0, 15, -15, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-md cursor-pointer hover:shadow-lg hover:from-blue-500 hover:to-purple-600 transition-all"
                      aria-label="Open AI Assistant"
                    >
                      <Sparkles className="w-4 h-4 text-white" />
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </form>

          {/* Dropdown Results */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="absolute top-full mt-3 start-0 end-0 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden z-[9999]"
                style={{ maxHeight: '65vh' }}
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100/50 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {chatMode && (
                        <button
                          onClick={handleBackToSearch}
                          className="me-1 p-1.5 hover:bg-white/80 rounded-lg transition-colors"
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
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            {searchTerm ? 'Search Results' : 'Popular Searches'}
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={handleCloseDropdown}
                      className="text-gray-400 hover:text-gray-700 transition-all duration-200 p-2 rounded-full hover:bg-white/80 hover:shadow-md group"
                    >
                      <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>
                </div>

                {/* Results Area */}
                <div ref={chatContainerRef} className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(65vh - 120px)' }}>
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
                                Hi! I'm your AI Egypt Travel Assistant
                              </p>
                              <p className="text-gray-500 text-xs leading-relaxed">
                                Ask me anything about tours, destinations, or experiences in Egypt. I can help you find the perfect adventure!
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
                            className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm sm:text-[15px] ${
                              m.role === 'user'
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm'
                                : 'bg-white text-gray-800 border shadow-sm'
                            }`}
                          >
                            {renderContent(m.parts, m.id)}
                          </div>
                        </div>
                      ))}

                      {isGenerating && (
                        <div className="flex items-center gap-2 text-gray-500 bg-white px-4 py-2.5 rounded-lg border">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">AI is thinking...</span>
                        </div>
                      )}

                      {/* Input */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (searchTerm.trim()) {
                            sendMessage({ text: searchTerm });
                            setSearchTerm('');
                          }
                        }}
                        className="sticky bottom-0 bg-white border-t border-gray-100 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Ask about tours, destinations..."
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={isGenerating}
                          />
                          <button
                            type="submit"
                            disabled={!searchTerm.trim() || isGenerating}
                            className="p-2 bg-gradient-to-r from-blue-600 to-purple-500 text-white rounded-lg hover:from-blue-700 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : searchTerm ? (
                    <InstantSearch searchClient={searchClient} indexName={INDEX_TOURS}>
                      <CustomSearchBox searchQuery={searchTerm} onSearchChange={setSearchTerm} />

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
                    // Trending Searches
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Popular Searches
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['Pyramids of Giza', 'Nile Cruise', 'Luxor Temple', 'Desert Safari', 'Red Sea Diving'].map((term) => (
                          <button
                            key={term}
                            onClick={() => {
                              setSearchTerm(term);
                              setIsExpanded(true);
                            }}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative px-2 sm:px-4 lg:px-8">
          <button
            onClick={() => swiperRef?.slidePrev()}
            className="absolute start-0 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-12 sm:h-12 bg-white hover:bg-gradient-to-br hover:from-red-500 hover:to-orange-500 text-slate-700 hover:text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group -translate-x-3 sm:-translate-x-4 lg:-translate-x-6 hidden lg:flex border border-slate-200 hover:border-transparent"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </button>

          <button
            onClick={() => swiperRef?.slideNext()}
            className="absolute end-0 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-12 sm:h-12 bg-white hover:bg-gradient-to-br hover:from-red-500 hover:to-orange-500 text-slate-700 hover:text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group translate-x-3 sm:translate-x-4 lg:translate-x-6 hidden lg:flex border border-slate-200 hover:border-transparent"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </button>

          <Swiper
            modules={[Navigation, Pagination, Grid]}
            onSwiper={setSwiperRef}
            spaceBetween={16}
            slidesPerView={1}
            grid={{
              rows: 2,
              fill: 'row'
            }}
            pagination={{
              clickable: true,
              dynamicBullets: true,
            }}
            breakpoints={{
              640: {
                slidesPerView: 2,
                spaceBetween: 20,
                grid: {
                  rows: 2,
                  fill: 'row'
                }
              },
              768: {
                slidesPerView: 3,
                spaceBetween: 20,
                grid: {
                  rows: 2,
                  fill: 'row'
                }
              },
              1024: {
                slidesPerView: 4,
                spaceBetween: 24,
                grid: {
                  rows: 2,
                  fill: 'row'
                }
              },
              1280: {
                slidesPerView: 5,
                spaceBetween: 24,
                grid: {
                  rows: 2,
                  fill: 'row'
                }
              }
            }}
            className="!pb-12 sm:!pb-14 md:!pb-16"
          >
            {filteredInterests.map((interest) => (
              <SwiperSlide key={interest.slug || interest.name} className="h-auto">
                <InterestCard interest={interest} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      <style jsx global>{`
        .swiper-pagination-bullet {
          width: 8px;
          height: 8px;
          background: #cbd5e1;
          opacity: 1;
          transition: all 0.3s ease;
        }

        .swiper-pagination-bullet-active {
          background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
          width: 24px;
          border-radius: 4px;
        }

        @media (min-width: 640px) {
          .swiper-pagination-bullet {
            width: 10px;
            height: 10px;
          }

          .swiper-pagination-bullet-active {
            width: 28px;
          }
        }
      `}</style>
    </section>
  );
}
