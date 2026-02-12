'use client';
// Add these lines to your existing imports
import { useWishlist } from '@/contexts/WishlistContext';
import toast from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  ArrowLeft, Clock, Star, Users, ShoppingCart, Calendar, MapPin,
  Info, CheckCircle, Heart, Share2, MessageCircle, Camera, ChevronDown,
  ChevronUp, Shield, Umbrella, Bus, Utensils, Mountain,
  Languages, CreditCard, Phone, Mail,
  Navigation, Backpack, Sun, Snowflake, Eye,
  Accessibility, Smartphone, Headphones,
  ChevronLeft, ChevronRight, X, ZoomIn
} from 'lucide-react';

// Components
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BookingSidebar from '@/components/BookingSidebar';
import StickyBookButton from '@/components/StickyBookButton';
import TourPageAIWidget from '@/components/TourPageAIWidget';
import ReviewList from '@/components/reviews/ReviewList';
import ReviewForm from '@/components/reviews/ReviewForm';
// Add these new imports for reviews
import ReviewsStructuredData from '@/components/ReviewsStructuredData';
import ElfsightWidget from '@/components/ElfsightWidget';

// Hooks and Types
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import { useTenant } from '@/contexts/TenantContext';
import { Tour, CartItem, Review as ReviewType } from '@/types';
import { toDateOnlyString } from '@/utils/date';

// Enhanced interfaces for additional tour data
interface ItineraryItem {
  time: string;
  title: string;
  description: string;
  duration?: string;
  location?: string;
  includes?: string[];
  icon?: string; // Add icon field
}

interface TourEnhancement {
  itinerary?: ItineraryItem[];
  whatToBring?: string[];
  whatToWear?: string[];
  physicalRequirements?: string;
  accessibilityInfo?: string[];
  groupSize?: { min: number; max: number };
  transportationDetails?: string;
  mealInfo?: string;
  weatherPolicy?: string;
  photoPolicy?: string;
  tipPolicy?: string;
  healthSafety?: string[];
  culturalInfo?: string[];
  seasonalVariations?: string;
  localCustoms?: string[];
}

// The Client Component receives the fetched data as props.
interface TourPageClientProps {
  tour: Tour;
  relatedTours: Tour[];
  initialReviews: ReviewType[];
}

// Extract enhancement data from the actual tour object with SMART fallbacks
const extractEnhancementData = (tour: Tour): TourEnhancement => {
  return {
    // Use database itinerary with proper icon handling, only fallback if completely empty
    itinerary: tour.itinerary && tour.itinerary.length > 0 ? tour.itinerary.map(item => ({
      ...item,
      icon: item.icon || 'location' // Ensure icon is properly set
    })) : [],
    
    // Use database data first, only fallback if not available
    whatToBring: tour.whatToBring && tour.whatToBring.length > 0 ? tour.whatToBring : [
      "Camera for photos",
      "Comfortable walking shoes", 
      "Valid ID or passport",
      "Weather-appropriate clothing",
      "Water bottle"
    ],
    
    whatToWear: tour.whatToWear && tour.whatToWear.length > 0 ? tour.whatToWear : [
      "Comfortable walking shoes",
      "Weather-appropriate clothing", 
      "Modest attire for religious sites",
      "Layers for varying temperatures"
    ],
    
    physicalRequirements: tour.physicalRequirements || "Moderate walking required. Tour involves stairs and uneven surfaces. Please inform us of any mobility concerns.",
    
    accessibilityInfo: tour.accessibilityInfo && tour.accessibilityInfo.length > 0 ? tour.accessibilityInfo : [
      "Limited wheelchair accessibility - please contact us in advance",
      "Audio guides available for hearing impaired visitors", 
      "Service animals are welcome",
      "Please inform us of any special requirements when booking"
    ],
    
    groupSize: tour.groupSize || { min: 1, max: tour.maxGroupSize || 20 },
    transportationDetails: tour.transportationDetails || "Meeting point instructions will be provided upon booking confirmation.",
    mealInfo: tour.mealInfo || "No meals included unless specified. Local restaurant recommendations available from your guide.",
    weatherPolicy: tour.weatherPolicy || "Tours operate rain or shine. In case of severe weather, tours may be rescheduled or refunded.",
    photoPolicy: tour.photoPolicy || "Photography is encouraged. Please respect photography restrictions at certain venues and other guests' privacy.",
    tipPolicy: tour.tipPolicy || "Gratuities are not included but are appreciated for exceptional service.",
    
    healthSafety: tour.healthSafety && tour.healthSafety.length > 0 ? tour.healthSafety : [
      "Enhanced safety protocols in place",
      "Hand sanitizer available", 
      "First aid trained guides",
      "Emergency procedures established",
      "Local health guidelines followed"
    ],
    
    culturalInfo: tour.culturalInfo && tour.culturalInfo.length > 0 ? tour.culturalInfo : [
      "Learn about local history and culture",
      "Discover architectural highlights", 
      "Understand local traditions and customs",
      "Experience authentic local atmosphere",
      "Professional guide commentary"
    ],
    
    seasonalVariations: tour.seasonalVariations || "Tour experience may vary by season. Check specific seasonal considerations when booking.",
    
    localCustoms: tour.localCustoms && tour.localCustoms.length > 0 ? tour.localCustoms : [
      "Arrive at meeting point 15 minutes early",
      "Respect local customs and dress codes",
      "Follow guide instructions at all times", 
      "Be respectful of other tour participants",
      "Ask questions - guides love sharing knowledge!"
    ]
  };
};

// Enhanced Lightbox Component
const Lightbox = ({ images, selectedIndex, onClose }: { images: string[], selectedIndex: number, onClose: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors z-50"
        aria-label="Close lightbox"
      >
        <X size={32} />
      </button>

      <div className="relative w-full h-full max-w-5xl max-h-screen flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Tour image ${currentIndex + 1}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </AnimatePresence>
      </div>

      <button
        onClick={prevImage}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors"
        aria-label="Previous image"
      >
        <ChevronLeft size={28} />
      </button>

      <button
        onClick={nextImage}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors"
        aria-label="Next image"
      >
        <ChevronRight size={28} />
      </button>
       
       <div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full"
        onClick={(e) => e.stopPropagation()}
       >
        {currentIndex + 1} / {images.length}
      </div>
    </motion.div>
  );
};

// useScrollDirection hook
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

const TabNavigation = ({ activeTab, tabs, scrollToSection, isHeaderVisible }: any) => {
  const stickyTop = isHeaderVisible ? 'top-16 md:top-20' : 'top-0';
  const navRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const container = navRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 8);
    setCanScrollRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 8);
  };

  const scrollBy = (delta: number) => {
    const container = navRef.current;
    if (!container) return;
    container.scrollBy({ left: delta, behavior: 'smooth' });
  };

  useEffect(() => {
    const container = navRef.current;
    if (!container || !activeTab) return;

    const selector = `a[data-tab-id="${activeTab}"]`;
    let activeEl = container.querySelector(selector) as HTMLElement | null;

    if (!activeEl) {
      const fallback = container.querySelector(`a[href="#${activeTab}"]`) as HTMLElement | null;
      if (!fallback) return;
      activeEl = fallback;
    }

    const elRect = activeEl.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();

    const elLeft = elRect.left - contRect.left + container.scrollLeft;
    const elRight = elLeft + elRect.width;
    const visibleLeft = container.scrollLeft;
    const visibleRight = container.scrollLeft + container.clientWidth;

    if (elLeft < visibleLeft + 12) {
      container.scrollTo({ left: Math.max(0, elLeft - 12), behavior: 'smooth' });
    }
    else if (elRight > visibleRight - 12) {
      const delta = elRight - visibleRight + 12;
      container.scrollTo({ left: container.scrollLeft + delta, behavior: 'smooth' });
    }

    setTimeout(updateScrollButtons, 250);
    updateScrollButtons();
  }, [activeTab]);

  useEffect(() => {
    const container = navRef.current;
    if (!container) return;
    updateScrollButtons();
    const onScroll = () => updateScrollButtons();
    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, []);

  return (
    <div
      className={`sticky ${stickyTop} z-20 -mx-4 sm:mx-0 transition-all duration-300
        bg-white/30 backdrop-blur-md border-b border-white/20 shadow-lg rounded-xl`}
    >
      <div className="container mx-auto px-2 sm:px-4">
        <div className="relative">
          <button
            aria-hidden={!canScrollLeft}
            aria-label="Scroll tabs left"
            onClick={() => scrollBy(-160)}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-white shadow-sm transition-opacity ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            type="button"
          >
            <ChevronLeft size={18} />
          </button>

          <div
            ref={navRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide px-8 py-2 scroll-smooth"
            role="tablist"
            aria-label="Tour sections"
          >
            {tabs.map((tab: any) => (
              <a
                key={tab.id}
                href={`#${tab.id}`}
                data-tab-id={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(tab.id);
                }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-red-600'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </a>
            ))}
          </div>

          <button
            aria-hidden={!canScrollRight}
            aria-label="Scroll tabs right"
            onClick={() => scrollBy(160)}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-white shadow-sm transition-opacity ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            type="button"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// FIXED ItineraryIcon Component - Now properly handles all icon types
const ItineraryIcon = ({ iconType, className = "w-5 h-5" }: { iconType?: string, className?: string }) => {
  const icons: { [key: string]: JSX.Element } = {
    location: <MapPin className={className} />,
    transport: <Bus className={className} />,
    monument: <Mountain className={className} />,
    camera: <Camera className={className} />,
    food: <Utensils className={className} />,
    time: <Clock className={className} />,
    info: <Info className={className} />,
    activity: <Users className={className} />,
    shopping: <ShoppingCart className={className} />,
  };
  
  // Return the specific icon or default to location
  return icons[iconType || 'location'] || icons.location;
};

// FIXED ItinerarySection - Now properly displays the correct icons with map support
const ItinerarySection = ({ itinerary, tour, sectionRef }: { itinerary: ItineraryItem[], tour: Tour, sectionRef: React.RefObject<HTMLDivElement> }) => {
  const [showMap, setShowMap] = useState(false);

  // Get all locations from itinerary for the map
  const itineraryLocations = itinerary
    .filter(item => item.location)
    .map(item => item.location)
    .join(' | ');

  const mapQuery = itineraryLocations || tour.title || 'Tour Route';

  return (
    <div ref={sectionRef} id="itinerary" className="space-y-6 scroll-mt-24">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Clock size={24} className="text-red-600" />
          Detailed Itinerary
        </h3>
        {itineraryLocations && (
          <button
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <MapPin size={16} />
            {showMap ? 'Hide Map' : 'View Map'}
          </button>
        )}
      </div>

      {/* Map View */}
      {showMap && itineraryLocations && (
        <div className="relative w-full h-[400px] rounded-xl overflow-hidden shadow-lg mb-6 border border-slate-200">
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(mapQuery)}&zoom=12`}
          ></iframe>

          {/* Map Controls Overlay */}
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-slate-800">Tour Route</span>
              </div>
              <button
                onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(mapQuery)}`, '_blank')}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
              >
                <Navigation size={12} />
                Open in Maps
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>
        {itinerary.map((item, index) => (
          <div key={index} className="relative flex items-start gap-4 pb-8">
            <div className="flex-shrink-0 w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm relative z-10">
              <ItineraryIcon iconType={item.icon} className="w-6 h-6" />
            </div>
            <div className="flex-1 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                    {item.time}
                  </span>
                  {item.duration && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {item.duration}
                    </span>
                  )}
                </div>
                {item.location && (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin size={14} />
                    {item.location}
                  </div>
                )}
              </div>
              <h4 className="font-bold text-slate-800 mb-2">{item.title}</h4>
              <p className="text-slate-600 text-sm leading-relaxed mb-3">{item.description}</p>
              {item.includes && item.includes.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Includes:</p>
                  <div className="flex flex-wrap gap-2">
                    {item.includes.map((include, i) => (
                      <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                        {include}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PracticalInfoSection = ({ enhancement, sectionRef }: { enhancement: TourEnhancement, sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="practical" className="space-y-8 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Backpack size={24} className="text-blue-600" />
      Practical Information
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-slate-50 p-6 rounded-xl">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Backpack size={20} className="text-blue-600" />
          What to Bring
        </h4>
        <ul className="space-y-2">
          {enhancement.whatToBring?.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-slate-50 p-6 rounded-xl">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Sun size={20} className="text-yellow-600" />
          What to Wear
        </h4>
        <ul className="space-y-2">
          {enhancement.whatToWear?.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>

    {enhancement.physicalRequirements && (
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
        <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
          <Mountain size={20} />
          Physical Requirements
        </h4>
        <p className="text-blue-800 text-sm leading-relaxed">{enhancement.physicalRequirements}</p>
      </div>
    )}

    {enhancement.groupSize && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-white border border-slate-200 rounded-lg">
          <Users size={24} className="text-slate-600 mx-auto mb-2" />
          <div className="font-bold text-lg text-slate-800">
            {enhancement.groupSize.min}-{enhancement.groupSize.max}
          </div>
          <div className="text-sm text-slate-500">Participants</div>
        </div>
        <div className="text-center p-4 bg-white border border-slate-200 rounded-lg">
          <Languages size={24} className="text-slate-600 mx-auto mb-2" />
          <div className="font-bold text-lg text-slate-800">Multi</div>
          <div className="text-sm text-slate-500">Languages</div>
        </div>
        <div className="text-center p-4 bg-white border border-slate-200 rounded-lg">
          <Shield size={24} className="text-slate-600 mx-auto mb-2" />
          <div className="font-bold text-lg text-slate-800">Safe</div>
          <div className="text-sm text-slate-500">& Secure</div>
        </div>
      </div>
    )}
  </div>
);

const AccessibilitySection = ({ enhancement, sectionRef }: { enhancement: TourEnhancement, sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="accessibility" className="space-y-6 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Accessibility size={24} className="text-purple-600" />
      Accessibility & Special Requirements
    </h3>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-purple-50 p-6 rounded-xl">
        <h4 className="font-bold text-purple-900 mb-4">Accessibility Information</h4>
        <ul className="space-y-3">
          {enhancement.accessibilityInfo?.map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-purple-800">
              <Info size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-green-50 p-6 rounded-xl">
        <h4 className="font-bold text-green-900 mb-4">Health & Safety Measures</h4>
        <ul className="space-y-3">
          {enhancement.healthSafety?.map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-green-800">
              <Shield size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>

    {enhancement.transportationDetails && (
      <div className="bg-slate-50 p-6 rounded-xl">
        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Bus size={20} className="text-blue-600" />
          Transportation Details
        </h4>
        <p className="text-slate-700 text-sm leading-relaxed">{enhancement.transportationDetails}</p>
      </div>
    )}
  </div>
);

const PoliciesSection = ({ enhancement, sectionRef }: { enhancement: TourEnhancement, sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="policies" className="space-y-6 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Shield size={24} className="text-red-600" />
      Policies
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-sky-50 p-6 rounded-xl">
        <h4 className="font-bold text-sky-900 mb-3 flex items-center gap-2">
          <Umbrella size={20} className="text-sky-600" />
          Weather Policy
        </h4>
        <p className="text-sky-800 text-sm leading-relaxed">{enhancement.weatherPolicy}</p>
      </div>

      <div className="bg-pink-50 p-6 rounded-xl">
        <h4 className="font-bold text-pink-900 mb-3 flex items-center gap-2">
          <Camera size={20} className="text-pink-600" />
          Photography Policy
        </h4>
        <p className="text-pink-800 text-sm leading-relaxed">{enhancement.photoPolicy}</p>
      </div>

      <div className="bg-yellow-50 p-6 rounded-xl">
        <h4 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
          <CreditCard size={20} className="text-yellow-600" />
          Gratuity Policy
        </h4>
        <p className="text-yellow-800 text-sm leading-relaxed">{enhancement.tipPolicy}</p>
      </div>

      <div className="bg-orange-50 p-6 rounded-xl">
        <h4 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
          <Utensils size={20} className="text-orange-600" />
          Meal Information
        </h4>
        <p className="text-orange-800 text-sm leading-relaxed">{enhancement.mealInfo}</p>
      </div>
    </div>
  </div>
);

const CulturalSection = ({ enhancement, sectionRef }: { enhancement: TourEnhancement, sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="cultural" className="space-y-6 scroll-mt-24">
    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Heart size={24} className="text-teal-600" />
      Cultural Information
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-indigo-50 p-6 rounded-xl">
        <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <Eye size={20} className="text-indigo-600" />
          Cultural Highlights
        </h4>
        <ul className="space-y-2">
          {enhancement.culturalInfo?.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-indigo-800">
              <Star size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-teal-50 p-6 rounded-xl">
        <h4 className="font-bold text-teal-900 mb-4 flex items-center gap-2">
          <Heart size={20} className="text-teal-600" />
          Local Customs & Etiquette
        </h4>
        <ul className="space-y-2">
          {enhancement.localCustoms?.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-teal-800">
              <Info size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>

    {enhancement.seasonalVariations && (
      <div className="bg-slate-50 p-6 rounded-xl">
        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Snowflake size={20} className="text-slate-600" />
          Seasonal Variations
        </h4>
        <p className="text-slate-700 text-sm leading-relaxed">{enhancement.seasonalVariations}</p>
      </div>
    )}
  </div>
);

// Enhanced FAQ Component - Updated to accept faqs as props
const EnhancedFAQ = ({ faqs, sectionRef }: { faqs: any[], sectionRef: React.RefObject<HTMLDivElement> }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Use provided faqs if available, otherwise use fallback
  const faqsToShow = faqs && faqs.length > 0 ? faqs : [
    {
      question: "What happens if I'm late for the departure?",
      answer: "Please arrive 15 minutes before departure. Late arrivals cannot be accommodated due to strict departure schedules. No refunds are provided for missed departures due to tardiness."
    },
    {
      question: "Can dietary restrictions be accommodated?",
      answer: "Yes! We offer vegetarian options and can accommodate most dietary restrictions with advance notice. Please inform us at least 24 hours before your tour."
    },
    {
      question: "Is this tour suitable for children?",
      answer: "Absolutely! Children 4-13 receive discounted pricing, and children 0-3 travel free. The tour is family-friendly with safety measures in place."
    },
    {
      question: "What if the weather is bad?",
      answer: "Tours operate in most weather conditions. Only severe weather will result in cancellation with full refund."
    },
    {
      question: "Can I bring my own food or drinks?",
      answer: "Outside food and beverages policies vary by tour. Special dietary needs can be accommodated with advance notice."
    },
    {
      question: "Is the tour wheelchair accessible?",
      answer: "Accessibility varies by tour. Please contact us in advance to discuss specific needs and ensure we can accommodate your requirements."
    },
    {
      question: "Can I reschedule my booking?",
      answer: "Yes, bookings can be rescheduled up to 24 hours before departure subject to availability. Changes within 24 hours may incur additional fees."
    },
    {
      question: "Are professional photos available?",
      answer: "Professional photography services can be arranged for an additional fee. Please inquire when booking. Personal photography is encouraged throughout the tour."
    }
  ];

  return (
    <div ref={sectionRef} id="faq" className="space-y-4 scroll-mt-24">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <MessageCircle size={24} className="text-orange-600" />
        Frequently Asked Questions
      </h3>
      {faqsToShow.map((faq, index) => (
        <div key={index} className="border border-slate-200 rounded-lg">
          <button
            onClick={() => setOpenFaq(openFaq === index ? null : index)}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <span className="font-semibold text-slate-800 pr-4">{faq.question}</span>
            {openFaq === index ? (
              <ChevronUp size={20} className="text-slate-500 flex-shrink-0" />
            ) : (
              <ChevronDown size={20} className="text-slate-500 flex-shrink-0" />
            )}
          </button>
          {openFaq === index && (
            <div className="px-4 pb-4 border-t border-slate-100">
              <p className="text-slate-600 text-sm leading-relaxed mt-3">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Enhanced Reviews Section Component with integrated review management
const ReviewsSection = ({ tour, reviews, onReviewSubmitted, sectionRef }: { 
  tour: Tour, 
  reviews: ReviewType[], 
  onReviewSubmitted: (review: ReviewType) => void,
  sectionRef: React.RefObject<HTMLDivElement> 
}) => {
  const [currentReviews, setCurrentReviews] = useState<ReviewType[]>(reviews);

  const handleReviewUpdated = (updatedReview: ReviewType) => {
    setCurrentReviews(prevReviews => 
      prevReviews.map(review => 
        review._id === updatedReview._id ? updatedReview : review
      )
    );
  };

  const handleReviewDeleted = (reviewId: string) => {
    setCurrentReviews(prevReviews => 
      prevReviews.filter(review => review._id !== reviewId)
    );
  };

  const handleNewReview = (newReview: ReviewType) => {
    setCurrentReviews(prevReviews => [newReview, ...prevReviews]);
    onReviewSubmitted(newReview);
  };

  const averageRating = currentReviews.length > 0
    ? (currentReviews.reduce((acc, review) => acc + review.rating, 0) / currentReviews.length).toFixed(1)
    : tour.rating?.toFixed(1) || 'N/A';

  return (
    <div ref={sectionRef} id="reviews" className="space-y-6 scroll-mt-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Reviews</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star size={18} className="text-yellow-500 fill-current" />
            <span className="font-bold text-lg">{averageRating}</span>
          </div>
          <span className="text-slate-500">({currentReviews.length} reviews)</span>
        </div>
      </div>

      {/* Server-side JSON-LD for reviews (important for Google) */}
      <ReviewsStructuredData />

      {/* Our own reviews UI (client) */}

     
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <ReviewList 
          reviews={currentReviews} 
          onReviewUpdated={handleReviewUpdated}
          onReviewDeleted={handleReviewDeleted}
        />
        
        <div className="border-t border-slate-200 p-6">
          <ReviewForm tourId={tour._id!} onReviewSubmitted={handleNewReview} />
        </div>
         {/* Elfsight third-party reviews widget (client component) */}
      <div className="container mx-auto px-4 my-8">
        <ElfsightWidget />
      </div>
      </div>
    </div>
  );
};

// Overview Section Component
const OverviewSection = ({ tour, sectionRef }: { tour: Tour, sectionRef: React.RefObject<HTMLDivElement> }) => (
  <div ref={sectionRef} id="overview" className="space-y-8 scroll-mt-24">
    <div className="bg-gradient-to-br from-white via-white to-slate-50/30 p-8 md:p-10 rounded-3xl shadow-xl border border-slate-200/80 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-200">About this experience</h2>
      <div
        className="prose prose-slate max-w-none mb-8 text-slate-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: tour.longDescription || tour.description }}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {tour.includes && tour.includes.length > 0 && (
          <div className="bg-white/60 p-6 rounded-2xl border border-slate-100 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              What's included
            </h3>
            <ul className="space-y-3">
              {tour.includes.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-slate-600 hover:text-slate-900 transition-colors">
                  <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {tour.highlights && tour.highlights.length > 0 && (
          <div className="bg-white/60 p-6 rounded-2xl border border-slate-100 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Star size={20} className="text-yellow-500" />
              Highlights
            </h3>
            <ul className="space-y-3">
              {tour.highlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-3 text-slate-600 hover:text-slate-900 transition-colors">
                  <Star size={16} className="text-yellow-500 mt-0.5 flex-shrink-0 fill-current" />
                  <span className="text-sm leading-relaxed">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl text-center border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <Calendar className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-900 mb-2">Free Cancellation</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{tour.cancellationPolicy || 'Up to 24 hours in advance'}</p>
      </div>
      <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl text-center border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <Users className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-900 mb-2">Group Friendly</h3>
        <p className="text-sm text-slate-600 leading-relaxed">Perfect for all group sizes</p>
      </div>
      <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl text-center border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <Smartphone className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-900 mb-2">Mobile Ticket</h3>
        <p className="text-sm text-slate-600 leading-relaxed">Show on your smartphone</p>
      </div>
    </div>
  </div>
);

// Main TourPageClient component - Enhanced with review management and fixed pricing
export default function TourPageClient({ tour, relatedTours, initialReviews }: TourPageClientProps) {
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();
  const { tenant } = useTenant();
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();
  
  const [reviews, setReviews] = useState<ReviewType[]>(initialReviews);

  // Tenant-specific contact info
  const contactPhone = tenant?.contact?.phone || '';
  const contactEmail = tenant?.contact?.email || 'support@excursions.online';

  const tourIsWishlisted = isWishlisted(tour._id!);

  const handleReviewSubmitted = (newReview: ReviewType) => {
    setReviews(prevReviews => [newReview, ...prevReviews]);
    toast.success('Review submitted successfully!');
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tourIsWishlisted) {
      removeFromWishlist(tour._id!);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist(tour);
      toast.success('Added to wishlist!');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: tour.title,
      text: `Check out this amazing tour: ${tour.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Tour link copied to clipboard!');
      } catch {
        toast.error('Could not copy link.');
      }
    }
  };

  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const { isVisible: isHeaderVisible } = useScrollDirection();

  const overviewRef = useRef<HTMLDivElement>(null);
  const itineraryRef = useRef<HTMLDivElement>(null);
  const practicalRef = useRef<HTMLDivElement>(null);
  const accessibilityRef = useRef<HTMLDivElement>(null);
  const policiesRef = useRef<HTMLDivElement>(null);
  const culturalRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);

  const inViewOptions = { threshold: 0.1 };
  const isOverviewInView = useInView(overviewRef, inViewOptions);
  const isItineraryInView = useInView(itineraryRef, inViewOptions);
  const isPracticalInView = useInView(practicalRef, inViewOptions);
  const isAccessibilityInView = useInView(accessibilityRef, inViewOptions);
  const isPoliciesInView = useInView(policiesRef, inViewOptions);
  const isCulturalInView = useInView(culturalRef, inViewOptions);
  const isReviewsInView = useInView(reviewsRef, inViewOptions);
  const isFaqInView = useInView(faqRef, inViewOptions);

  useEffect(() => {
    if (isFaqInView) setActiveTab('faq');
    else if (isReviewsInView) setActiveTab('reviews');
    else if (isCulturalInView) setActiveTab('cultural');
    else if (isPoliciesInView) setActiveTab('policies');
    else if (isAccessibilityInView) setActiveTab('accessibility');
    else if (isPracticalInView) setActiveTab('practical');
    else if (isItineraryInView) setActiveTab('itinerary');
    else if (isOverviewInView) setActiveTab('overview');
  }, [
    isOverviewInView, isItineraryInView, isPracticalInView, isAccessibilityInView,
    isPoliciesInView, isCulturalInView, isReviewsInView, isFaqInView
  ]);

  const scrollToSection = (id: string) => {
    let ref;
    switch (id) {
      case 'overview': ref = overviewRef; break;
      case 'itinerary': ref = itineraryRef; break;
      case 'practical': ref = practicalRef; break;
      case 'accessibility': ref = accessibilityRef; break;
      case 'policies': ref = policiesRef; break;
      case 'cultural': ref = culturalRef; break;
      case 'reviews': ref = reviewsRef; break;
      case 'faq': ref = faqRef; break;
    }

    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // FIXED: Use real database data instead of mock data
  const enhancement = extractEnhancementData(tour);

  const tourImages = [tour.image, ...(tour.images || [])].filter(Boolean);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'itinerary', label: 'Itinerary', icon: Clock },
    { id: 'practical', label: 'What to Know', icon: Backpack },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { id: 'policies', label: 'Policies', icon: Shield },
    { id: 'cultural', label: 'Cultural Info', icon: Heart },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'faq', label: 'FAQ', icon: MessageCircle }
  ];

  const handleQuickAdd = async () => {
    if (isAdding) return;
    setIsAdding(true);
    setLiveMessage('Adding tour to cart');

    try {
      const quickAddCartItem = {
        ...tour,
        uniqueId: `${tour._id}-quick-add-${Date.now()}`,
        quantity: 1,
        childQuantity: 0,
        selectedDate: toDateOnlyString(new Date()),
        selectedTime: 'Anytime',
        selectedAddOns: {},
        totalPrice: tour.discountPrice,
      } as CartItem;
      addToCart(quickAddCartItem);
      setAdded(true);
      setLiveMessage('Added to cart');

      setTimeout(() => {
        setAdded(false);
      }, 2500);
    } catch (err) {
      console.error('Add to cart failed:', err);
      setLiveMessage('Failed to add to cart. Please try again.');
      setTimeout(() => {
        setLiveMessage('');
      }, 2500);
    } finally {
      setIsAdding(false);
    }
  };

  const openBookingSidebar = () => {
    setBookingSidebarOpen(true);
  };

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setIsLightboxOpen(true);
  };

  return (
    <>
      <Header startSolid={true} />

      <AnimatePresence>
        {isLightboxOpen && (
          <Lightbox
            images={tourImages}
            selectedIndex={selectedImageIndex}
            onClose={() => setIsLightboxOpen(false)}
          />
        )}
      </AnimatePresence>

      <main className="bg-white pt-20">
        <div className="bg-slate-50/50 py-3 border-b border-slate-200/50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between gap-4">
              <nav className="flex items-center gap-1.5 text-xs">
                <Link href="/" className="text-slate-500 hover:text-red-600 transition-colors">
                  Home
                </Link>
                <span className="text-slate-400">/</span>
                <Link href="/tours" className="text-slate-500 hover:text-red-600 transition-colors">
                  Tours
                </Link>
                <span className="text-slate-400">/</span>
                <span className="text-slate-800 font-medium truncate max-w-[200px] md:max-w-none">{tour.title}</span>
              </nav>
              <Link
                href="/tours"
                className="inline-flex items-center gap-1.5 text-red-600 font-semibold text-sm hover:underline transition-colors whitespace-nowrap"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Back to all tours</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="relative">
                {/* Tags section removed */}

                <div 
                  className="relative rounded-xl overflow-hidden shadow-lg mb-6 group cursor-pointer"
                  onClick={() => openLightbox(selectedImageIndex)}
                >
                  <Image
                    src={tourImages[selectedImageIndex]}
                    alt={tour.title}
                    width={1200}
                    height={700}
                    className="w-full h-[420px] md:h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="text-white w-16 h-16" />
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={handleWishlistToggle}
                      className={`p-3 rounded-full backdrop-blur-sm transition-colors shadow-sm ${
                        tourIsWishlisted
                          ? 'bg-red-600 text-white'
                          : 'bg-white/80 text-slate-600 hover:bg-white hover:text-red-600'
                      }`}
                      aria-pressed={tourIsWishlisted}
                      aria-label={tourIsWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart size={20} fill={tourIsWishlisted ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={handleShare}
                      className="p-3 bg-white/80 backdrop-blur-sm rounded-full text-slate-600 hover:bg-white hover:text-slate-800 transition-colors shadow-sm"
                      aria-label="Share"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>

                {tourImages.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {tourImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 transition-all transform ${
                            selectedImageIndex === index
                                ? 'border-red-600 scale-105 shadow'
                                : 'border-slate-200 hover:border-slate-300'
                        }`}
                        aria-label={`View image ${index + 1}`}
                      >
                        <Image
                          src={image}
                          alt={`${tour.title} image ${index + 1}`}
                          width={80}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <div className="mb-6">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-4">
                    {tour.title}
                  </h1>

                  {/* Tour Info Card - New Design */}
                  <div className="bg-[#FEF7F5] border-l-4 border-red-500 rounded-lg p-5 mb-4">
                    {/* Max Participants Row */}
                    <div className="flex items-center gap-2 mb-4">
                      <Users size={20} className="text-slate-700" />
                      <span className="font-semibold text-slate-800">Max {enhancement.groupSize?.max || 18}</span>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock size={18} className="text-slate-600" />
                        <div>
                          <p className="text-slate-500 text-xs">Duration</p>
                          <p className="font-medium text-slate-800">{tour.duration}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Languages size={18} className="text-slate-600" />
                        <div>
                          <p className="text-slate-500 text-xs">Languages</p>
                          <p className="font-medium text-slate-800">English, Arabic</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mountain size={18} className="text-slate-600" />
                        <div>
                          <p className="text-slate-500 text-xs">Difficulty</p>
                          <p className="font-medium text-slate-800">Easy</p>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div
                        className="text-sm text-slate-700 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: (tour.longDescription || tour.description || '').replace(/<p>/g, '').replace(/<\/p>/g, '<br/>')
                        }}
                      />
                    </div>
                  </div>

                  {/* Pricing Card */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">1 Adult</p>
                        <p className="text-sm text-slate-500">
                          Per person: {formatPrice(tour.discountPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-slate-900">
                          {formatPrice(tour.discountPrice)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rating and Location */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star size={16} className="text-yellow-500 fill-current" />
                        <span className="font-semibold text-slate-800">{tour.rating}</span>
                      </div>
                      <span className="text-slate-500">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      <span>{typeof tour.destination === 'string' ? tour.destination : tour.destination?.name || 'Destination'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <TabNavigation
                activeTab={activeTab}
                tabs={tabs}
                scrollToSection={scrollToSection}
                isHeaderVisible={isHeaderVisible}
              />

              <OverviewSection tour={tour} sectionRef={overviewRef} />
              
              {/* Only show itinerary if we have real data */}
              {enhancement.itinerary && enhancement.itinerary.length > 0 && (
                <ItinerarySection itinerary={enhancement.itinerary} tour={tour} sectionRef={itineraryRef} />
              )}
              
              <PracticalInfoSection enhancement={enhancement} sectionRef={practicalRef} />
              <AccessibilitySection enhancement={enhancement} sectionRef={accessibilityRef} />
              <PoliciesSection enhancement={enhancement} sectionRef={policiesRef} />
              <CulturalSection enhancement={enhancement} sectionRef={culturalRef} />
              
              <ReviewsSection 
                tour={tour} 
                reviews={reviews} 
                onReviewSubmitted={handleReviewSubmitted} 
                sectionRef={reviewsRef} 
              />
              
              <EnhancedFAQ faqs={tour.faq || []} sectionRef={faqRef} />

              {tour.meetingPoint && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">Meeting point</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <MapPin className="text-red-600 mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-semibold text-slate-800">{tour.meetingPoint}</p>
                        <p className="text-sm text-slate-600 mt-1">Check-in 15 minutes before departure time</p>
                        <button
                          onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(tour.meetingPoint)}`, '_blank')}
                          className="text-red-600 hover:underline text-sm font-medium mt-2 inline-flex items-center gap-1"
                        >
                          <Navigation size={14} />
                          Open in Google Maps
                        </button>
                      </div>
                    </div>

                    {/* Embedded Map */}
                    <div className="relative w-full h-[300px] rounded-lg overflow-hidden shadow-md border border-slate-200">
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(tour.meetingPoint)}&zoom=15`}
                      ></iframe>
                    </div>
                  </div>
                </div>
              )}

              {relatedTours.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">You might also like</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {relatedTours.map((relatedTour) => (
                      <Link key={relatedTour._id} href={`/tour/${relatedTour.slug}`} className="group">
                        <div className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="relative">
                            <Image
                              src={relatedTour.image}
                              alt={relatedTour.title}
                              width={300}
                              height={200}
                              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {relatedTour.tags?.map((tag, index) => (
                              <span
                                key={index}
                                className={`absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded ${tag.includes('%') ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                                  }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="p-3">
                            <h3 className="font-bold text-sm text-slate-800 mb-1 line-clamp-2">{relatedTour.title}</h3>
                            <div className="flex items-center gap-1 mb-1 text-xs text-slate-500">
                              <Clock size={12} />
                              <span>{relatedTour.duration}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Star size={12} className="text-yellow-500 fill-current" />
                                <span className="text-xs font-bold">{relatedTour.rating}</span>
                              </div>
                              <span className="font-bold text-red-600">{formatPrice(relatedTour.discountPrice)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Sidebar - FIXED pricing display */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-2 mb-2">
                      {tour.originalPrice && (
                        <span className="text-slate-500 line-through text-lg">{formatPrice(tour.originalPrice)}</span>
                      )}
                      <span className="text-4xl font-extrabold text-red-600">{formatPrice(tour.discountPrice)}</span>
                    </div>
                    <p className="text-sm text-slate-500">per person</p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Clock size={20} className="text-red-500" />
                      <span>Duration: {tour.duration}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Star size={20} className="text-yellow-500" />
                      <span>Rating: {tour.rating} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Users size={20} className="text-blue-500" />
                      <span>Available daily</span>
                    </div>
                    {enhancement.groupSize && (
                      <div className="flex items-center gap-3 text-slate-600">
                        <Users size={20} className="text-green-500" />
                        <span>Group size: {enhancement.groupSize.min}-{enhancement.groupSize.max} people</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={openBookingSidebar}
                      className="shimmer-effect w-full bg-red-600 text-white font-bold py-4 px-6 rounded-full hover:bg-red-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                    >
                      <span className="shimmer-line"></span>
                      <Calendar size={20} />
                      <span>Select Date & Time</span>
                    </button>

                    <button
                      onClick={handleQuickAdd}
                      disabled={isAdding}
                      className={`shimmer-effect w-full relative overflow-hidden py-3 px-6 rounded-full border-2 font-bold flex items-center justify-center gap-2 transition-all duration-300 focus:outline-none ${added
                          ? 'bg-green-600 text-white border-green-600 shadow-lg scale-105'
                          : 'bg-white text-red-600 border-red-600 hover:bg-red-50'
                        }`}
                      aria-live="polite"
                      aria-disabled={isAdding}
                    >
                      <span className="shimmer-line"></span>
                      {isAdding && (
                        <svg
                          className="animate-spin -ml-1 mr-2 h-5 w-5 text-current"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          ></path>
                        </svg>
                      )}

                      {added ? (
                        <>
                          <CheckCircle size={18} />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={18} />
                          <span>Quick Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-600" />
                        <span>Free cancellation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Smartphone size={16} className="text-blue-600" />
                        <span>Mobile ticket</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield size={16} className="text-purple-600" />
                        <span>Safe & secure</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Languages size={16} className="text-orange-600" />
                        <span>Multi-language</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Headphones size={20} className="text-blue-600" />
                    Need help?
                  </h3>
                  <div className="space-y-3">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        try {
                          if (typeof (window as any).openIntercom === 'function') {
                            (window as any).openIntercom();
                            return;
                          }
                          if (typeof (window as any).Intercom === 'function') {
                            (window as any).Intercom('show');
                            return;
                          }
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('open-chatbot'));
                          }
                        } catch (err) {
                          console.error('Failed to open Intercom:', err);
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('open-chatbot'));
                          }
                        }
                      }}
                      className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors w-full text-left"
                    >
                      <MessageCircle size={18} />
                      <span>Chat with us</span>
                    </button>
                    <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors">
                      <Phone size={18} />
                      <span>{contactPhone}</span>
                    </a>
                    <a href={`mailto:${contactEmail}`} className="flex items-center gap-3 text-slate-600 hover:text-red-600 transition-colors">
                      <Mail size={18} />
                      <span>Email support</span>
                    </a>
                  </div>
                  <div className="mt-4 text-xs text-slate-500">
                    <p>Available 24/7 • Average response time: 5 minutes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <BookingSidebar isOpen={isBookingSidebarOpen} onClose={() => setBookingSidebarOpen(false)} tour={tour} />

      <StickyBookButton
        price={tour.discountPrice}
        currency={'$'}
        onClick={openBookingSidebar}
      />

      {/* AI Magic Widget for Tour Pages */}
      <TourPageAIWidget />

      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .shimmer-effect {
          position: relative;
          overflow: hidden;
        }
        .shimmer-effect .shimmer-line {
          position: absolute;
          top: 0;
          left: -150%;
          width: 75%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-25deg);
          animation: shimmer 2.5s infinite;
        }
        @keyframes shimmer {
          100% {
            left: 150%;
          }
        }
      `}</style>
    </>
  );
}