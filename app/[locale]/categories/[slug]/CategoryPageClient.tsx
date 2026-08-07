'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Star, Clock, ShoppingCart, Search, MapPin, Users, TrendingUp, CheckCircle2, Tag, Compass, ChevronDown } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AISearchWidget from '@/components/AISearchWidget';
import RelatedInterests from '@/components/RelatedInterests';
import { Tour, Category } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import BookingSidebar from '@/components/BookingSidebar';
import { useLocale } from 'next-intl';
import { isRTL } from '@/i18n/config';
import { imageMetadataFor } from '@/lib/content/imageMetadata';
import { buildContentBreadcrumbs } from '@/lib/content/breadcrumbs';
import ContentBreadcrumbs from '@/components/navigation/ContentBreadcrumbs';
import { normalizePageTemplate, type PageTemplate } from '@/lib/content/pageTemplate';
import { tourFromPrice } from '@/lib/pricing/displayPrice';
import { contentPath } from '@/lib/content/contentUrl';

type CategoryPageCopy = {
  searchToursPlaceholder: string;
  allDurations: string;
  halfDay: string;
  fullDay: string;
  multiDay: string;
  allPrices: string;
  under50: string;
  price50to100: string;
  price100to200: string;
  price200Plus: string;
  recommended: string;
  priceLowToHigh: string;
  priceHighToLow: string;
  highestRated: string;
  duration: string;
  toursAvailable: string;
  averageRating: string;
  happyCustomers: string;
  expertGuides: string;
  aboutCategory: (name: string) => string;
  highlights: string;
  features: string;
  essentialInformation: string;
  discover: string;
  tourCount: (count: number) => string;
  addToCartAria: string;
  viewDetails: string;
  availableTours: string;
  noToursMatchFilters: string;
  adjustSearchFilters: string;
  clearAllFilters: string;
  noToursFound: string;
  noToursInCategory: (name: string) => string;
  exploreAllTours: string;
  exploreRelatedCategories: string;
  discoverMoreExperiences: string;
  quickFacts: string;
  whatToExpect: string;
  popularDestinations: string;
  perfectFor: string;
  categoryFaq: string;
  startingFrom: string;
  priceRange: string;
  tripLengths: string;
  destinationsCovered: string;
  browseDestination: string;
  learnMore: string;
  topPicks: string;
  handpickedTours: string;
};

const CATEGORY_PAGE_COPY: Record<'en' | 'ar', CategoryPageCopy> = {
  en: {
    searchToursPlaceholder: 'Search tours...',
    allDurations: 'All Durations',
    halfDay: 'Half Day',
    fullDay: 'Full Day',
    multiDay: 'Multi-Day',
    allPrices: 'All Prices',
    under50: 'Under $50',
    price50to100: '$50 - $100',
    price100to200: '$100 - $200',
    price200Plus: '$200+',
    recommended: 'Recommended',
    priceLowToHigh: 'Price: Low to High',
    priceHighToLow: 'Price: High to Low',
    highestRated: 'Highest Rated',
    duration: 'Duration',
    toursAvailable: 'Tours Available',
    averageRating: 'Average Rating',
    happyCustomers: 'Happy Customers',
    expertGuides: 'Expert Guides',
    aboutCategory: (name: string) => `About ${name}`,
    highlights: 'Highlights',
    features: 'Features',
    essentialInformation: 'Essential Information',
    discover: 'DISCOVER',
    tourCount: (count: number) => `${count}+ Tours`,
    addToCartAria: 'Add to cart',
    viewDetails: 'View Details',
    availableTours: 'Available Tours',
    noToursMatchFilters: 'No Tours Match Your Filters',
    adjustSearchFilters: 'Try adjusting your search or filter criteria.',
    clearAllFilters: 'Clear All Filters',
    noToursFound: 'No Tours Found',
    noToursInCategory: (name: string) =>
      `There are currently no tours available in the "${name}" category.`,
    exploreAllTours: 'Explore All Tours',
    exploreRelatedCategories: 'Explore Related Categories',
    discoverMoreExperiences: 'Discover more amazing experiences',
    quickFacts: 'Quick Facts',
    whatToExpect: 'What to Expect',
    popularDestinations: 'Popular Destinations',
    perfectFor: 'Perfect For',
    categoryFaq: 'Frequently Asked Questions',
    startingFrom: 'Starting From',
    priceRange: 'Price Range',
    tripLengths: 'Trip Lengths',
    destinationsCovered: 'Destinations Covered',
    browseDestination: 'Browse Destination',
    learnMore: 'Learn More',
    topPicks: 'Top Picks In This Category',
    handpickedTours: 'Handpicked tours worth shortlisting first',
  },
  ar: {
    searchToursPlaceholder: 'ابحث عن الجولات...',
    allDurations: 'كل المدد',
    halfDay: 'نصف يوم',
    fullDay: 'يوم كامل',
    multiDay: 'عدة أيام',
    allPrices: 'كل الأسعار',
    under50: 'أقل من 50$',
    price50to100: '50$ - 100$',
    price100to200: '100$ - 200$',
    price200Plus: '200$+',
    recommended: 'موصى به',
    priceLowToHigh: 'السعر: من الأقل إلى الأعلى',
    priceHighToLow: 'السعر: من الأعلى إلى الأقل',
    highestRated: 'الأعلى تقييماً',
    duration: 'المدة',
    toursAvailable: 'جولات متاحة',
    averageRating: 'متوسط التقييم',
    happyCustomers: 'عملاء سعداء',
    expertGuides: 'مرشدون خبراء',
    aboutCategory: (name: string) => `حول ${name}`,
    highlights: 'أبرز النقاط',
    features: 'المزايا',
    essentialInformation: 'معلومات أساسية',
    discover: 'اكتشف',
    tourCount: (count: number) => `${count}+ جولة`,
    addToCartAria: 'أضف إلى السلة',
    viewDetails: 'عرض التفاصيل',
    availableTours: 'الجولات المتاحة',
    noToursMatchFilters: 'لا توجد جولات تطابق الفلاتر',
    adjustSearchFilters: 'جرّب تعديل البحث أو الفلاتر.',
    clearAllFilters: 'مسح جميع الفلاتر',
    noToursFound: 'لم يتم العثور على جولات',
    noToursInCategory: (name: string) => `لا توجد جولات متاحة حاليًا ضمن فئة "${name}".`,
    exploreAllTours: 'استكشف جميع الجولات',
    exploreRelatedCategories: 'استكشف فئات مشابهة',
    discoverMoreExperiences: 'اكتشف المزيد من التجارب الرائعة',
    quickFacts: 'حقائق سريعة',
    whatToExpect: 'ماذا تتوقع',
    popularDestinations: 'الوجهات الأكثر شهرة',
    perfectFor: 'مناسبة لـ',
    categoryFaq: 'الأسئلة الشائعة',
    startingFrom: 'الأسعار تبدأ من',
    priceRange: 'نطاق الأسعار',
    tripLengths: 'مدد الرحلات',
    destinationsCovered: 'الوجهات المتاحة',
    browseDestination: 'استعرض الوجهة',
    learnMore: 'اعرف المزيد',
    topPicks: 'أفضل الاختيارات في هذه الفئة',
    handpickedTours: 'جولات مختارة تستحق أن تبدأ بها',
  },
};

type CategoryInsightDestination = {
  name: string;
  slug: string;
  image?: string;
  urlType?: string;
  parentPage?: { slug: string } | null;
  count: number;
};

const tourDetailPath = (tour: Tour) => contentPath(
  'tour',
  tour.slug,
  tour.urlType,
  typeof tour.destination === 'object' && tour.destination ? tour.destination.slug : undefined,
  tour.parentPage?.slug,
);

type CategoryFaqItem = {
  question: string;
  answer: string;
};

type CategoryInsights = {
  overviewParagraphs: string[];
  expectationItems: string[];
  travelerTypes: string[];
  popularDestinations: CategoryInsightDestination[];
  faqItems: CategoryFaqItem[];
  durationSummary: string;
  minPriceLabel: string | null;
  priceRangeLabel: string | null;
};

const extractNumericDuration = (duration?: string) => {
  if (!duration) return null;

  const match = duration.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!match) return null;

  const high = match[2] ? Number.parseInt(match[2], 10) : Number.parseInt(match[1], 10);
  if (!Number.isFinite(high)) return null;

  const lowerDuration = duration.toLowerCase();
  if (lowerDuration.includes('day')) {
    return high * 24;
  }

  return high;
};

const formatDurationSummary = (durations: string[], locale: string) => {
  if (durations.length === 0) {
    return locale.startsWith('ar') ? 'مدد متنوعة من الرحلات القصيرة إلى الجولات اليومية' : 'Varied trip lengths from short outings to full-day tours';
  }

  if (durations.length === 1) {
    return durations[0];
  }

  const sorted = [...durations].sort((a, b) => {
    const aValue = extractNumericDuration(a) ?? Number.MAX_SAFE_INTEGER;
    const bValue = extractNumericDuration(b) ?? Number.MAX_SAFE_INTEGER;
    return aValue - bValue;
  });

  return `${sorted[0]} - ${sorted[sorted.length - 1]}`;
};

const buildOverviewParagraphs = ({ category }: { category: Category }) => {
  // Only what an editor actually wrote. The previous version appended two
  // machine-written paragraphs to every category — including ones that already
  // had a description — so the page said things nobody had approved.
  const baseDescription = (category.longDescription || category.description || '').trim();
  return baseDescription ? [baseDescription] : [];
};

// --- SearchAndFilter Component ---
const SearchAndFilter = ({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  selectedDuration,
  setSelectedDuration,
  priceRange,
  setPriceRange,
  copy,
  rtl,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  selectedDuration: string;
  setSelectedDuration: (duration: string) => void;
  priceRange: string;
  setPriceRange: (range: string) => void;
  copy: CategoryPageCopy;
  rtl: boolean;
}) => (
  <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="search-icon-left absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder={copy.searchToursPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
            rtl ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'
          }`}
        />
      </div>

      {/* Duration Filter */}
      <select
        value={selectedDuration}
        onChange={(e) => setSelectedDuration(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
      >
        <option value="">{copy.allDurations}</option>
        <option value="half-day">{copy.halfDay}</option>
        <option value="full-day">{copy.fullDay}</option>
        <option value="multi-day">{copy.multiDay}</option>
      </select>

      {/* Price Range Filter */}
      <select
        value={priceRange}
        onChange={(e) => setPriceRange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
      >
        <option value="">{copy.allPrices}</option>
        <option value="0-50">{copy.under50}</option>
        <option value="50-100">{copy.price50to100}</option>
        <option value="100-200">{copy.price100to200}</option>
        <option value="200+">{copy.price200Plus}</option>
      </select>

      {/* Sort Dropdown */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
      >
        <option value="recommended">{copy.recommended}</option>
        <option value="price_low">{copy.priceLowToHigh}</option>
        <option value="price_high">{copy.priceHighToLow}</option>
        <option value="rating">{copy.highestRated}</option>
        <option value="duration">{copy.duration}</option>
      </select>
    </div>
  </div>
);

// --- StatsSection Component ---
const StatsSection = ({
  tours,
  copy,
}: {
  tours: Tour[];
  copy: CategoryPageCopy;
}) => {
  const totalTours = tours?.length || 0;

  // Only figures the catalog can actually back: a rating averaged from real
  // tour ratings and a customer count summed from real bookings. The old
  // '10K+ customers' / '50+ expert guides' fallbacks were invented claims and
  // published themselves on every category that lacked data.
  const toursWithRatings = (tours || []).filter(t => t.rating);
  const averageRating = toursWithRatings.length > 0
    ? (toursWithRatings.reduce((acc, t) => acc + (t.rating || 0), 0) / toursWithRatings.length).toFixed(1)
    : null;

  const totalBookings = (tours || []).reduce((total, tour) => total + (tour.bookings || 0), 0);
  const happyCustomers = totalBookings >= 1000
    ? `${Math.floor(totalBookings / 1000)}K+`
    : totalBookings > 0
      ? `${totalBookings}+`
      : null;

  const stats = [
    { icon: MapPin, label: copy.toursAvailable, value: totalTours > 0 ? totalTours.toString() : null, color: 'text-blue-600' },
    { icon: Star, label: copy.averageRating, value: averageRating, color: 'text-yellow-600' },
    { icon: Users, label: copy.happyCustomers, value: happyCustomers, color: 'text-green-600' },
  ].filter((stat): stat is typeof stat & { value: string } => Boolean(stat.value));

  if (stats.length === 0) return null;

  const gridColumns = ['', 'grid-cols-1 md:grid-cols-1', 'grid-cols-2 md:grid-cols-2', 'grid-cols-2 md:grid-cols-3'][stats.length]
    || 'grid-cols-2 md:grid-cols-4';

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className={`grid ${gridColumns} gap-6`}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center p-6 bg-gray-50 rounded-lg hover:shadow-md transition-shadow">
                <Icon className={`${stat.color} mx-auto mb-3`} size={40} />
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// --- AboutSection Component ---
const AboutSection = ({
  category,
  copy,
  insights,
}: {
  category: Category;
  copy: CategoryPageCopy;
  insights: CategoryInsights;
}) => {
  const highlights = (category.highlights || []).length > 0
    ? category.highlights || []
    : insights.expectationItems;
  const features = (category.features || []).length > 0
    ? category.features || []
    : insights.travelerTypes;
  const popularDestinations = insights.popularDestinations;

  if (insights.overviewParagraphs.length === 0 && highlights.length === 0 && features.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">{copy.aboutCategory(category.name)}</h2>

          <div className="space-y-4 mb-8">
            {insights.overviewParagraphs.map((paragraph) => (
              <p key={paragraph} className="text-gray-700 leading-relaxed text-lg">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-500 mb-2">{copy.startingFrom}</div>
              <div className="text-2xl font-bold text-slate-900">{insights.minPriceLabel || '—'}</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-500 mb-2">{copy.priceRange}</div>
              <div className="text-2xl font-bold text-slate-900">{insights.priceRangeLabel || '—'}</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-500 mb-2">{copy.tripLengths}</div>
              <div className="text-lg font-bold text-slate-900">{insights.durationSummary}</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-500 mb-2">{copy.destinationsCovered}</div>
              <div className="text-2xl font-bold text-slate-900">{popularDestinations.length}</div>
            </div>
          </div>

          {highlights.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{copy.whatToExpect}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {highlights.map((highlight: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={20} />
                    <span className="text-gray-700">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {features.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{copy.perfectFor}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <TrendingUp className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {popularDestinations.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{copy.popularDestinations}</h3>
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                {popularDestinations.map((destination) => (
                  <Link
                    key={destination.slug}
                    href={contentPath(
                      'destination',
                      destination.slug,
                      destination.urlType,
                      undefined,
                      destination.parentPage?.slug,
                    )}
                    className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="relative h-40">
                      <Image
                        src={destination.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80&fm=jpg'}
                        alt={destination.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4">
                      <div className="text-lg font-semibold text-slate-900 mb-1">{destination.name}</div>
                      <div className="text-sm text-slate-500 mb-3">
                        {destination.count} {destination.count === 1 ? copy.toursAvailable.replace('s', '') : copy.toursAvailable.toLowerCase()}
                      </div>
                      <span className="inline-flex items-center gap-2 text-red-600 font-medium text-sm">
                        {copy.browseDestination}
                        <Compass size={15} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const CategoryFaqSection = ({
  copy,
  faqItems,
}: {
  copy: CategoryPageCopy;
  faqItems: CategoryFaqItem[];
}) => {
  const [openIndex, setOpenIndex] = useState(0);

  if (faqItems.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">{copy.categoryFaq}</h2>
          <div className="space-y-4">
            {faqItems.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <div key={faq.question} className="border border-gray-200 rounded-2xl overflow-hidden bg-slate-50">
                  <button
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-slate-900 text-lg">{faq.question}</span>
                    <ChevronDown
                      size={20}
                      className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-slate-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

const TopPicksSection = ({
  tours,
  copy,
}: {
  tours: Tour[];
  copy: CategoryPageCopy;
}) => {
  if (tours.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-white border-y border-slate-100">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{copy.topPicks}</h2>
            <p className="text-slate-600">{copy.handpickedTours}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tours.map((tour) => (
              <div key={tour._id} className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="relative h-56">
                  <Image
                    src={tour.image}
                    alt={tour.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
                    {tour.destination && typeof tour.destination === 'object' && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={14} />
                        {tour.destination.name}
                      </span>
                    )}
                    {tour.rating && (
                      <span className="inline-flex items-center gap-1">
                        <Star size={14} className="fill-current text-yellow-500" />
                        {tour.rating}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2 line-clamp-2">{tour.title}</h3>
                  <p className="text-slate-600 text-sm line-clamp-3 mb-4">
                    {tour.description?.replace(/<[^>]+>/g, '')}
                  </p>
                  <Link
                    href={tourDetailPath(tour)}
                    className="inline-flex items-center gap-2 text-red-600 font-semibold"
                  >
                    {copy.learnMore}
                    <Compass size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const CategoryGallerySection = ({ category }: { category: Category }) => {
  if (!category.images || category.images.length === 0) return null;

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Experience gallery</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {category.images.map((image, index) => {
              const seo = imageMetadataFor(image, category.imageMetadata, `${category.name} experience ${index + 1}`);
              return (
                <div key={`${image}-${index}`} className={`relative overflow-hidden rounded-2xl ${index === 0 ? 'col-span-2 row-span-2 min-h-72' : 'min-h-36'}`}>
                  <Image src={image} alt={seo.alt} title={seo.title} fill className="object-cover transition-transform duration-500 hover:scale-105" sizes="(max-width: 1024px) 50vw, 25vw" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

const CategoryTravelTipsSection = ({ category }: { category: Category }) => {
  if (!category.travelTips || category.travelTips.length === 0) return null;

  return (
    <section className="py-12 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Travel tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {category.travelTips.map((tip, index) => (
              <article key={`${tip.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900">{tip.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{tip.content}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};


// --- Hero Section Component ---
const CategoryHeroSection = ({
  category,
  tourCount,
  copy,
  rtl,
  pageTemplate,
}: {
  category: Category;
  tourCount: number;
  copy: CategoryPageCopy;
  rtl: boolean;
  pageTemplate: PageTemplate;
}) => {
  const heroImage = category.heroImage || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80&fm=jpg';
  const heroSeo = imageMetadataFor(heroImage, category.imageMetadata, category.name);
  const breadcrumbs = buildContentBreadcrumbs({
    currentTitle: category.name,
    breadcrumbLabel: category.breadcrumbLabel,
    parentPage: category.parentPage,
    rootLabel: 'Categories',
    rootHref: '/categories',
  });

  return (
    <section className={`relative w-full ${pageTemplate === 'immersive' ? 'min-h-[760px] h-screen max-h-[980px]' : pageTemplate === 'editorial' ? 'min-h-[600px] h-[72vh] max-h-[760px]' : 'h-[70vh] sm:h-[75vh] md:h-[80vh] lg:h-screen max-h-[900px]'}`}>
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={heroImage}
          alt={heroSeo.alt}
          title={heroSeo.title}
          fill
          className={`object-cover ${pageTemplate === 'editorial' ? 'lg:object-[70%_center]' : ''}`}
          priority
          sizes="100vw"
        />
        <div className={`absolute inset-0 ${pageTemplate === 'immersive' ? 'bg-gradient-to-t from-black via-black/40 to-black/20' : 'bg-gradient-to-b from-black/60 via-black/50 to-black/70'}`} />
      </div>

      {/* Content */}
      <div className="relative z-20 h-full flex items-center justify-center text-white px-4 sm:px-6 lg:px-8" dir={rtl ? 'rtl' : 'ltr'}>
        <div className={`w-full max-w-7xl mx-auto text-center md:text-start pt-20 md:pt-0 ${pageTemplate === 'editorial' ? 'md:max-w-3xl md:mx-0 md:rounded-[2rem] md:border md:border-white/15 md:bg-slate-950/80 md:p-10 md:shadow-2xl md:backdrop-blur-md' : pageTemplate === 'immersive' ? 'self-end pb-10 md:pb-20' : ''}`}>
          <div className="mb-5 flex justify-center md:justify-start">
            <ContentBreadcrumbs items={breadcrumbs} tone="dark" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold uppercase leading-tight tracking-wide mb-3 sm:mb-4">
            {copy.discover}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-300">
              {category.name}
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 max-w-2xl mx-auto md:mx-0 px-4 sm:px-0">
            {category.description}
          </p>

          <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-white/90 text-xs sm:text-sm px-4 sm:px-0">
            <span className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <Tag size={14} className="sm:w-4 sm:h-4" />
              <span className="font-semibold">{copy.tourCount(tourCount)}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Tour Card Component ---
const TourCard = ({
  tour,
  onAddToCartClick,
  copy,
}: {
  tour: Tour;
  onAddToCartClick: (tour: Tour) => void;
  copy: CategoryPageCopy;
}) => {
  const { formatPrice } = useSettings();
  const displayedPrice = tourFromPrice(tour).price;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col group">
      <div className="relative">
        <Link href={tourDetailPath(tour)}>
          <Image
            src={tour.image}
            alt={tour.title}
            width={400}
            height={250}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
          />
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            onAddToCartClick(tour);
          }}
          className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-full hover:bg-white transition-colors hover:scale-110"
          aria-label={copy.addToCartAria}
        >
          <ShoppingCart size={16} className="text-red-600" />
        </button>
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2 flex-grow">
          <Link href={tourDetailPath(tour)} className="hover:text-red-600 transition-colors">
            {tour.title}
          </Link>
        </h3>
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
          <div className="flex items-center gap-1"><Clock size={14} /><span>{tour.duration}</span></div>
          <div className="flex items-center gap-1"><Star size={14} className="text-yellow-500 fill-current" /><span>{tour.rating}</span></div>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div>
            {tour.originalPrice && tour.originalPrice > displayedPrice && (
              <span className="text-slate-500 line-through text-sm mr-2">{formatPrice(tour.originalPrice)}</span>
            )}
            <span className="text-xl font-bold text-red-600">{formatPrice(displayedPrice)}</span>
          </div>
          <Link href={tourDetailPath(tour)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
            {copy.viewDetails}
          </Link>
        </div>
      </div>
    </div>
  );
};


export default function CategoryPageClient({
    category,
    categoryTours,
    relatedInterests = [],
}: {
    category: Category;
    categoryTours: Tour[];
    relatedInterests?: Array<{
      _id: string;
      type: 'category' | 'attraction';
      name: string;
      slug: string;
      products: number;
      featured?: boolean;
      image?: string;
    }>;
}) {
    const locale = useLocale();
    const rtl = isRTL(locale);
    const copy = locale.startsWith('ar') ? CATEGORY_PAGE_COPY.ar : CATEGORY_PAGE_COPY.en;
    const { formatPrice } = useSettings();
    const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
    const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recommended');
    const [selectedDuration, setSelectedDuration] = useState('');
    const [priceRange, setPriceRange] = useState('');

    const handleTourSelect = (tour: Tour) => {
        setSelectedTour(tour);
        setBookingSidebarOpen(true);
    };

    const closeSidebar = () => {
        setBookingSidebarOpen(false);
        setTimeout(() => setSelectedTour(null), 300);
    };

    const categoryInsights = useMemo(() => {
        const destinationMap = new Map<string, CategoryInsightDestination>();
        const highlightSet = new Set<string>();
        const durationSet = new Set<string>();
        const prices: number[] = [];

        for (const tour of categoryTours) {
            const rawDestination = typeof tour.destination === 'object' && tour.destination ? tour.destination : null;
            const destinationName = rawDestination?.name;
            const destinationSlug = rawDestination?.slug;

            if (destinationName && destinationSlug) {
                const existing = destinationMap.get(destinationSlug);
                destinationMap.set(destinationSlug, {
                    name: destinationName,
                    slug: destinationSlug,
                    image: rawDestination.image,
                    urlType: rawDestination.urlType,
                    parentPage: rawDestination.parentPage,
                    count: (existing?.count || 0) + 1,
                });
            }

            (tour.highlights || []).forEach((highlight) => {
                const trimmed = highlight?.trim();
                if (trimmed) {
                    highlightSet.add(trimmed);
                }
            });

            if (tour.duration) {
                durationSet.add(tour.duration);
            }

            const price = tourFromPrice(tour).price;
            if (price && Number.isFinite(price)) {
                prices.push(price);
            }
        }

        const autoPopularDestinations = Array.from(destinationMap.values())
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
            .slice(0, 4);
        const curatedPopularDestinations = (category.popularDestinationIds || [])
            .filter((destination): destination is Exclude<typeof destination, string> => typeof destination === 'object' && destination !== null)
            .map((destination) => ({
                name: destination.name,
                slug: destination.slug,
                image: destination.image,
                urlType: destination.urlType,
                parentPage: destination.parentPage,
                count: destinationMap.get(destination.slug)?.count || 0,
            }));
        const popularDestinations = curatedPopularDestinations.length > 0
            ? curatedPopularDestinations
            : autoPopularDestinations;

        const sortedPrices = [...prices].sort((a, b) => a - b);
        const minPrice = sortedPrices[0];
        const maxPrice = sortedPrices[sortedPrices.length - 1];
        const minPriceLabel = minPrice ? formatPrice(minPrice) : null;
        const priceRangeLabel = minPrice && maxPrice
            ? minPrice === maxPrice
                ? formatPrice(minPrice)
                : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
            : null;

        const expectationItems = Array.from(highlightSet).slice(0, 6);
        const travelerTypes = (category.features || []).map((f) => f?.trim()).filter(Boolean) as string[];
        const durationSummary = formatDurationSummary(Array.from(durationSet), locale);
        const overviewParagraphs = buildOverviewParagraphs({ category });
        const faqItems = (category.faqs || []).filter(
            (faq) => faq?.question?.trim() && faq?.answer?.trim(),
        );

        return {
            overviewParagraphs,
            expectationItems,
            travelerTypes,
            popularDestinations,
            faqItems,
            durationSummary,
            minPriceLabel,
            priceRangeLabel,
        } satisfies CategoryInsights;
    }, [category, categoryTours, formatPrice, locale]);

    // Top Picks only earns its own section when it can show something the grid
    // below does not; with three tours or fewer the two lists were identical.
    const topPicks = useMemo(() => {
        if (categoryTours.length <= 3) return [];
        return [...categoryTours]
            .sort((a, b) => {
                const ratingDelta = (b.rating || 0) - (a.rating || 0);
                if (ratingDelta !== 0) return ratingDelta;
                return (b.bookings || 0) - (a.bookings || 0);
            })
            .slice(0, 3);
    }, [categoryTours]);

    const topPickIds = useMemo(
        () => new Set(topPicks.map((tour) => String(tour._id))),
        [topPicks],
    );

    // Filter and sort tours
    const filteredAndSortedTours = useMemo(() => {
        let filtered = categoryTours.filter((tour) => !topPickIds.has(String(tour._id)));

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(tour =>
                tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tour.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Duration filter
        if (selectedDuration) {
            filtered = filtered.filter(tour => {
                const duration = tour.duration?.toLowerCase() || '';
                if (selectedDuration === 'half-day') return duration.includes('half') || duration.includes('4') || duration.includes('5');
                if (selectedDuration === 'full-day') return duration.includes('full') || duration.includes('8') || duration.includes('day') && !duration.includes('days');
                if (selectedDuration === 'multi-day') return duration.includes('days') || duration.includes('2 day') || duration.includes('3 day');
                return true;
            });
        }

        // Price range filter
        if (priceRange) {
            filtered = filtered.filter(tour => {
                const price = tourFromPrice(tour).price;
                if (priceRange === '0-50') return price < 50;
                if (priceRange === '50-100') return price >= 50 && price < 100;
                if (priceRange === '100-200') return price >= 100 && price < 200;
                if (priceRange === '200+') return price >= 200;
                return true;
            });
        }

        // Sort
        switch (sortBy) {
            case 'price_low':
                filtered.sort((a, b) => tourFromPrice(a).price - tourFromPrice(b).price);
                break;
            case 'price_high':
                // Sort by the same number the card shows. This branch used to read
                // `pricingSummary.fromPrice`, a field this network's Tour model does
                // not have, so it silently fell back to discountPrice/originalPrice
                // and ordered tours by a price the customer never sees — visibly
                // wrong for any tour whose cheapest booking option differs.
                filtered.sort((a, b) => tourFromPrice(b).price - tourFromPrice(a).price);
                break;
            case 'rating':
                filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'duration':
                filtered.sort((a, b) => {
                    const getDurationHours = (dur: string) => {
                        const match = dur?.match(/(\d+)/);
                        return match ? parseInt(match[1]) : 0;
                    };
                    return getDurationHours(a.duration || '') - getDurationHours(b.duration || '');
                });
                break;
            default:
                // Keep recommended order
                break;
        }

        return filtered;
    }, [categoryTours, topPickIds, searchQuery, sortBy, selectedDuration, priceRange]);

    const pageTemplate = normalizePageTemplate(category.pageTemplate);

    return (
        <>
            <Header />

            {/* Hero Section */}
            <CategoryHeroSection category={category} tourCount={categoryTours.length} copy={copy} rtl={rtl} pageTemplate={pageTemplate} />

            <main data-page-template={pageTemplate} className={`min-h-screen ${pageTemplate === 'editorial' ? 'bg-[#f7f4ee]' : pageTemplate === 'immersive' ? 'bg-slate-950' : 'bg-slate-50'}`} dir={rtl ? 'rtl' : 'ltr'}>
                {/* Stats Section */}
                <StatsSection tours={categoryTours} copy={copy} />

                {/* About Section */}
                <AboutSection category={category} copy={copy} insights={categoryInsights} />

                <CategoryGallerySection category={category} />

                <TopPicksSection tours={topPicks} copy={copy} />


                <CategoryTravelTipsSection category={category} />

                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Search and Filter */}
                        {categoryTours.length > 0 && (
                            <div className="mt-12">
                                <h2 className="text-3xl font-bold text-gray-900 mb-6">{copy.availableTours}</h2>
                                <SearchAndFilter
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    sortBy={sortBy}
                                    setSortBy={setSortBy}
                                    selectedDuration={selectedDuration}
                                    setSelectedDuration={setSelectedDuration}
                                    priceRange={priceRange}
                                    setPriceRange={setPriceRange}
                                    copy={copy}
                                    rtl={rtl}
                                />
                            </div>
                        )}

                        {/* Tours Grid */}
                        {filteredAndSortedTours.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                                {filteredAndSortedTours.map(tour => (
                                  <TourCard key={tour._id} tour={tour} onAddToCartClick={handleTourSelect} copy={copy} />
                                ))}
                            </div>
                        ) : categoryTours.length > 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-xl font-semibold text-slate-700 mb-2">{copy.noToursMatchFilters}</h3>
                                <p className="text-slate-500 mb-4">{copy.adjustSearchFilters}</p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedDuration('');
                                        setPriceRange('');
                                        setSortBy('recommended');
                                    }}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    {copy.clearAllFilters}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">😢</div>
                                <h3 className="text-xl font-semibold text-slate-700 mb-2">{copy.noToursFound}</h3>
                                <p className="text-slate-500 mb-4">{copy.noToursInCategory(category.name)}</p>
                                <div className="flex gap-4 justify-center">
                                    <Link href="/search" className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                                        {copy.exploreAllTours}
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <CategoryFaqSection copy={copy} faqItems={categoryInsights.faqItems} />

                {/* Related Categories Section */}
                <div className="py-12 bg-white">
                    <RelatedInterests
                        initialInterests={relatedInterests}
                        currentSlug={category.slug}
                        title={copy.exploreRelatedCategories}
                        subtitle={copy.discoverMoreExperiences}
                        limit={8}
                    />
                </div>
            </main>

            <Footer />

            {/* AI Search Widget */}
            <AISearchWidget />

            {selectedTour && <BookingSidebar
                isOpen={isBookingSidebarOpen}
                onClose={closeSidebar}
                tour={selectedTour as unknown as React.ComponentProps<typeof BookingSidebar>['tour']}
            />}
        </>
    );
}
