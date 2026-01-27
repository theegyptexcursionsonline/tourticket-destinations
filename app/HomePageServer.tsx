// app/HomePageServer.tsx
// Multi-tenant homepage with tenant-specific content filtering
import React from 'react';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';
import HeroSettings from '@/lib/models/HeroSettings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import IcebarPromo from '@/components/IcebarPromo';
import AboutUs from '@/components/AboutUs';
import Reviews from '@/components/Reviews';
import FAQ from '@/components/FAQ';
import AISearchWidget from '@/components/AISearchWidget';
import ReviewsStructuredData from '@/components/ReviewsStructuredData';

// Import client-side versions that accept props
import DestinationsServer from '@/components/DestinationsServer';
import FeaturedToursServer from '@/components/FeaturedToursServer';
import InterestGridServer from '@/components/InterestGridServer';
import PopularInterestServer from '@/components/PopularInterestServer';
import DayTripsServer from '@/components/DayTripsServer';

// Import tenant utilities
import { getTenantFromRequest, getTenantConfig, buildTenantQuery } from '@/lib/tenant';

// ISR - Static generation with 60-second revalidation
export const dynamic = 'force-dynamic';

/**
 * Get homepage data
 * Uses ISR via page-level revalidate export
 */
async function getHomePageData(tenantId: string) {
  try {
    await dbConnect();

    // Build base query with tenant filter
    const tenantFilter = { tenantId };
    const tenantFilterOrAll = tenantId ? { tenantId } : {};

    // Fetch all data in parallel for speed
    const [
      destinations,
      tours,
      categories,
      allCategories,
      attractionPages,
      categoryPages,
      headerDestinations,
      headerCategories,
      heroSettings,
      dayTrips
    ] = await Promise.all([
      // Destinations with tour count (filtered by tenant)
      Destination.find(buildTenantQuery({ isPublished: true }, tenantId))
        .select('name slug image description country tenantId')
        .limit(8)
        .lean()
        .catch(() => 
          // Fallback: try without tenant filter for backward compatibility
          Destination.find({ isPublished: true })
            .select('name slug image description country')
            .limit(8)
            .lean()
        ),

      // Featured tours (filtered by tenant)
      Tour.find(buildTenantQuery({ isPublished: true, isFeatured: true }, tenantId))
        .populate('destination', 'name')
        .select('title slug image discountPrice originalPrice duration rating reviewCount bookings tenantId')
        .limit(8)
        .lean()
        .catch(() =>
          Tour.find({ isPublished: true, isFeatured: true })
            .populate('destination', 'name')
            .select('title slug image discountPrice originalPrice duration rating reviewCount bookings')
            .limit(8)
            .lean()
        ),

      // Categories for InterestGrid (filtered by tenant)
      Category.find(buildTenantQuery({ isPublished: true }, tenantId))
        .select('name slug icon description tenantId')
        .limit(12)
        .lean()
        .catch(() =>
          Category.find({ isPublished: true })
            .select('name slug icon description')
            .limit(12)
            .lean()
        ),

      // All categories for PopularInterest (filtered by tenant)
      Category.find(tenantFilterOrAll).lean()
        .catch(() => Category.find({}).lean()),

      // Attraction pages for PopularInterest (filtered by tenant)
      AttractionPage.find(buildTenantQuery({ isPublished: true, pageType: 'attraction' }, tenantId)).lean()
        .catch(() => AttractionPage.find({ isPublished: true, pageType: 'attraction' }).lean()),

      // Category pages for PopularInterest (filtered by tenant)
      AttractionPage.find(buildTenantQuery({ isPublished: true, pageType: 'category' }, tenantId))
        .populate('categoryId', 'name slug')
        .sort({ featured: -1, createdAt: -1 })
        .lean()
        .catch(() =>
          AttractionPage.find({ isPublished: true, pageType: 'category' })
            .populate('categoryId', 'name slug')
            .sort({ featured: -1, createdAt: -1 })
            .lean()
        ),

      // Header destinations (featured, filtered by tenant)
      Destination.find(buildTenantQuery({ isPublished: true, featured: true }, tenantId))
        .select('name slug image description country tenantId')
        .lean()
        .catch(() =>
          Destination.find({ isPublished: true, featured: true })
            .select('name slug image description country')
            .lean()
        ),

      // Header categories (featured, filtered by tenant)
      Category.find(buildTenantQuery({ isPublished: true, featured: true }, tenantId))
        .select('name slug icon description tenantId')
        .lean()
        .catch(() =>
          Category.find({ isPublished: true, featured: true })
            .select('name slug icon description')
            .lean()
        ),

      // Hero settings - STRICT tenant match first, then fallback to default
      HeroSettings.findOne({ isActive: true, tenantId })
        .select('backgroundImages currentActiveImage title searchSuggestions floatingTags trustIndicators overlaySettings animationSettings metaTitle metaDescription tenantId')
        .lean()
        .then(result => {
          // If tenant-specific hero found, return it
          if (result) return result;
          // Otherwise try default tenant
          return HeroSettings.findOne({ isActive: true, tenantId: 'default' })
            .select('backgroundImages currentActiveImage title searchSuggestions floatingTags trustIndicators overlaySettings animationSettings metaTitle metaDescription tenantId')
            .lean();
        })
        .catch(() =>
          HeroSettings.findOne({ isActive: true })
            .select('backgroundImages currentActiveImage title searchSuggestions floatingTags trustIndicators overlaySettings animationSettings metaTitle metaDescription')
            .lean()
        ),

      // Day trips (all published tours, filtered by tenant, limited to 12)
      Tour.find(buildTenantQuery({ isPublished: true }, tenantId))
        .select('title slug image discountPrice originalPrice duration rating reviewCount bookings tags tenantId')
        .limit(12)
        .lean()
        .catch(() =>
          Tour.find({ isPublished: true })
            .select('title slug image discountPrice originalPrice duration rating reviewCount bookings tags')
            .limit(12)
            .lean()
        )
    ]);

    // Calculate tour counts for destinations
    const destinationsWithCounts = await Promise.all(
      destinations.map(async (dest) => {
        const countQuery = buildTenantQuery({
          destination: dest._id,
          isPublished: true
        }, tenantId);
        
        const count = await Tour.countDocuments(countQuery).catch(() => 
          Tour.countDocuments({ destination: dest._id, isPublished: true })
        );
        
        return {
          ...JSON.parse(JSON.stringify(dest)),
          tourCount: count
        };
      })
    );

    // Calculate tour counts for InterestGrid categories
    const interestGridCategories = await Promise.all(
      categories.map(async (category: any) => {
        const countQuery = buildTenantQuery({
          category: { $in: [category._id] },
          isPublished: true
        }, tenantId);
        
        const tourCount = await Tour.countDocuments(countQuery).catch(() =>
          Tour.countDocuments({ category: { $in: [category._id] }, isPublished: true })
        );
        
        return {
          ...JSON.parse(JSON.stringify(category)),
          tourCount
        };
      })
    );

    // Build interests (categories + attractions with tour counts) for PopularInterest
    const categoriesWithCounts = await Promise.all(
      allCategories.map(async (category: any) => {
        const countQuery = buildTenantQuery({
          category: { $in: [category._id] },
          isPublished: true
        }, tenantId);
        
        const tourCount = await Tour.countDocuments(countQuery).catch(() =>
          Tour.countDocuments({ category: { $in: [category._id] }, isPublished: true })
        );
        
        return {
          type: 'category' as const,
          name: category.name,
          slug: category.slug,
          products: tourCount,
          _id: JSON.parse(JSON.stringify(category._id)),
          image: category.heroImage,
          featured: category.featured
        };
      })
    );

    const attractionsWithCounts = await Promise.all(
      attractionPages.map(async (page: any) => {
        let tourCount = 0;
        const searchQueries = [];

        if (page.title) {
          searchQueries.push({ title: { $regex: page.title, $options: 'i' } });
        }

        if (page.keywords && Array.isArray(page.keywords)) {
          const validKeywords = page.keywords.filter((k: string) => k && k.trim().length > 0);
          if (validKeywords.length > 0) {
            searchQueries.push({ tags: { $in: validKeywords.map((k: string) => new RegExp(k, 'i')) } });
            validKeywords.forEach((keyword: string) => {
              searchQueries.push({ title: { $regex: keyword, $options: 'i' } });
            });
          }
        }

        if (searchQueries.length > 0) {
          const countQuery = buildTenantQuery({
            isPublished: true,
            $or: searchQueries
          }, tenantId);
          
          tourCount = await Tour.countDocuments(countQuery).catch(() =>
            Tour.countDocuments({ isPublished: true, $or: searchQueries })
          );
        }

        return {
          type: 'attraction' as const,
          name: page.title,
          slug: page.slug,
          products: tourCount,
          _id: JSON.parse(JSON.stringify(page._id)),
          featured: page.featured,
          image: page.heroImage
        };
      })
    );

    // Combine and filter for featured interests
    const allInterests = [...categoriesWithCounts, ...attractionsWithCounts];
    const featuredInterests = allInterests.filter(item => item.featured === true);

    return {
      destinations: destinationsWithCounts,
      tours: JSON.parse(JSON.stringify(tours)),
      categories: interestGridCategories,
      featuredInterests,
      categoryPages: JSON.parse(JSON.stringify(categoryPages)),
      headerDestinations: JSON.parse(JSON.stringify(headerDestinations)),
      headerCategories: JSON.parse(JSON.stringify(headerCategories)),
      heroSettings: heroSettings ? JSON.parse(JSON.stringify(heroSettings)) : null,
      dayTrips: JSON.parse(JSON.stringify(dayTrips)),
      tenantId
    };
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return {
      destinations: [],
      tours: [],
      categories: [],
      featuredInterests: [],
      categoryPages: [],
      headerDestinations: [],
      headerCategories: [],
      heroSettings: null,
      dayTrips: [],
      tenantId
    };
  }
}

// Tenant-specific destination defaults (for tenants without specific destinations in DB)
const tenantDestinationDefaults: Record<string, { name: string; slug: string; image: string; description: string; tourCount: number }[]> = {
  'hurghada-speedboat': [
    {
      name: 'Giftun Island',
      slug: 'giftun-island',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
      description: 'Crystal clear waters and pristine beaches',
      tourCount: 8,
    },
    {
      name: 'Orange Bay',
      slug: 'orange-bay',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      description: 'Paradise beach with stunning coral reefs',
      tourCount: 6,
    },
    {
      name: 'Mahmya Island',
      slug: 'mahmya-island',
      image: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=800&q=80',
      description: 'Exclusive island experience',
      tourCount: 4,
    },
    {
      name: 'Paradise Island',
      slug: 'paradise-island',
      image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&q=80',
      description: 'Snorkeling and beach relaxation',
      tourCount: 5,
    },
    {
      name: 'Dolphin House',
      slug: 'dolphin-house',
      image: 'https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=800&q=80',
      description: 'Swim with wild dolphins',
      tourCount: 3,
    },
    {
      name: 'Hurghada Marina',
      slug: 'hurghada-marina',
      image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
      description: 'Departure point for sea adventures',
      tourCount: 10,
    },
  ],
  'hurghada-excursions-online': [
    {
      name: 'Hurghada',
      slug: 'hurghada',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
      description: 'Red Sea resort paradise',
      tourCount: 25,
    },
    {
      name: 'Luxor',
      slug: 'luxor',
      image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800&q=80',
      description: 'Ancient temples and Valley of Kings',
      tourCount: 12,
    },
    {
      name: 'Cairo',
      slug: 'cairo',
      image: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80',
      description: 'Pyramids of Giza and Egyptian Museum',
      tourCount: 8,
    },
    {
      name: 'Giftun Island',
      slug: 'giftun-island',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      description: 'Snorkeling paradise',
      tourCount: 6,
    },
  ],
  'sharm-excursions-online': [
    {
      name: 'Sharm El Sheikh',
      slug: 'sharm-el-sheikh',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
      description: 'World-class diving destination',
      tourCount: 20,
    },
    {
      name: 'Ras Mohammed',
      slug: 'ras-mohammed',
      image: 'https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=800&q=80',
      description: 'National park with stunning coral reefs',
      tourCount: 8,
    },
    {
      name: 'Tiran Island',
      slug: 'tiran-island',
      image: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=800&q=80',
      description: 'Famous diving and snorkeling spot',
      tourCount: 6,
    },
    {
      name: 'Dahab',
      slug: 'dahab',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      description: 'Blue Hole and laid-back vibes',
      tourCount: 5,
    },
  ],
  'luxor-excursions': [
    {
      name: 'Valley of the Kings',
      slug: 'valley-of-kings',
      image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800&q=80',
      description: 'Royal tombs of ancient pharaohs',
      tourCount: 10,
    },
    {
      name: 'Karnak Temple',
      slug: 'karnak-temple',
      image: 'https://images.unsplash.com/photo-1595981234058-a9302fb97229?w=800&q=80',
      description: 'Largest ancient religious site',
      tourCount: 8,
    },
    {
      name: 'Luxor Temple',
      slug: 'luxor-temple',
      image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800&q=80',
      description: 'Ancient temple complex',
      tourCount: 6,
    },
    {
      name: 'West Bank',
      slug: 'west-bank',
      image: 'https://images.unsplash.com/photo-1595981234058-a9302fb97229?w=800&q=80',
      description: 'Temples, tombs, and monuments',
      tourCount: 12,
    },
  ],
  'cairo-excursions-online': [
    {
      name: 'Giza Pyramids',
      slug: 'giza-pyramids',
      image: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80',
      description: 'The last wonder of the ancient world',
      tourCount: 15,
    },
    {
      name: 'Egyptian Museum',
      slug: 'egyptian-museum',
      image: 'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=800&q=80',
      description: 'Treasures of ancient Egypt',
      tourCount: 8,
    },
    {
      name: 'Khan El Khalili',
      slug: 'khan-el-khalili',
      image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&q=80',
      description: 'Historic bazaar and market',
      tourCount: 5,
    },
    {
      name: 'Islamic Cairo',
      slug: 'islamic-cairo',
      image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&q=80',
      description: 'Mosques, madrasas, and monuments',
      tourCount: 6,
    },
  ],
};

export default async function HomePageServer() {
  // Get current tenant from request
  const tenantId = await getTenantFromRequest();
  const tenantConfig = await getTenantConfig(tenantId);
  
  const {
    destinations,
    tours,
    categories,
    featuredInterests,
    categoryPages,
    headerDestinations,
    headerCategories,
    heroSettings,
    dayTrips
  } = await getHomePageData(tenantId);
  
  // Check if destinations are tenant-specific or from 'default' fallback
  const hasTenantSpecificDestinations = destinations.some(
    (dest: any) => dest.tenantId === tenantId
  );
  
  // Use tenant-specific default destinations if no tenant-specific ones in DB
  const tenantDestDefaults = tenantDestinationDefaults[tenantId];
  const effectiveDestinations = (hasTenantSpecificDestinations || !tenantDestDefaults)
    ? destinations
    : tenantDestDefaults.map((dest, index) => ({
        ...dest,
        _id: `tenant-dest-${index}`,
        country: 'Egypt',
      }));

  // Check if heroSettings is for THIS tenant or a fallback from another tenant
  // If it's from another tenant (e.g., 'default'), we should use tenant-specific defaults instead
  const heroSettingsMatchesTenant = heroSettings?.tenantId === tenantId;
  
  // Tenant-specific hero defaults (for tenants without HeroSettings database records)
  const tenantHeroDefaults: Record<string, { title: { main: string; highlight: string }; subtitle?: string; images: string[]; suggestions: string[] }> = {
    'hurghada-speedboat': {
      title: { main: 'Red Sea', highlight: 'Speedboat Adventures' },
      subtitle: 'Experience thrilling speedboat tours to Giftun Island, Orange Bay & more',
      images: [
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80',
        'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1920&q=80',
      ],
      suggestions: ['Giftun Island', 'Orange Bay', 'Dolphin Watching', 'Snorkeling Trip', 'Sunset Cruise'],
    },
    'hurghada-excursions-online': {
      title: { main: 'Discover the Magic of', highlight: 'Hurghada' },
      subtitle: 'Red Sea adventures, desert safaris & unforgettable experiences',
      images: [
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80',
        'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1920&q=80',
      ],
      suggestions: ['Snorkeling Trip', 'Giftun Island', 'Desert Safari', 'Dolphin Watching'],
    },
    'cairo-excursions-online': {
      title: { main: 'Journey Through', highlight: 'Ancient Egypt' },
      subtitle: 'Walk in the footsteps of pharaohs and discover timeless wonders',
      images: [
        'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1920&q=80',
        'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=1920&q=80',
      ],
      suggestions: ['Pyramids Tour', 'Egyptian Museum', 'Khan Khalili', 'Nile Dinner Cruise'],
    },
    'luxor-excursions': {
      title: { main: 'Walk Among the', highlight: 'Gods of Luxor' },
      subtitle: 'Temples, tombs & the mysteries of ancient Thebes',
      images: [
        'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=1920&q=80',
        'https://images.unsplash.com/photo-1595981234058-a9302fb97229?w=1920&q=80',
      ],
      suggestions: ['Valley of Kings', 'Karnak Temple', 'Hot Air Balloon', 'Nile Felucca'],
    },
    'sharm-excursions-online': {
      title: { main: 'Dive Into', highlight: 'Sharm El Sheikh' },
      subtitle: 'World-class diving, snorkeling & desert adventures',
      images: [
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80',
        'https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=1920&q=80',
      ],
      suggestions: ['Ras Mohammed', 'Tiran Island', 'Blue Hole Dahab', 'Quad Safari'],
    },
    'makadi-bay': {
      title: { main: 'Paradise Awaits at', highlight: 'Makadi Bay' },
      subtitle: 'Crystal clear waters, pristine beaches & Red Sea adventures',
      images: [
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80',
        'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1920&q=80',
      ],
      suggestions: ['Snorkeling', 'Luxor Day Trip', 'Quad Safari', 'Glass Boat'],
    },
    'el-gouna': {
      title: { main: 'Experience Luxury at', highlight: 'El Gouna' },
      subtitle: 'The Venice of the Red Sea - diving, kitesurfing & relaxation',
      images: [
        'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1920&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80',
      ],
      suggestions: ['Kitesurfing', 'Yacht Charter', 'Diving Course', 'Desert Adventure'],
    },
  };

  // Build hero settings from tenant config if no database heroSettings exist
  // Priority: 1) DB HeroSettings for THIS tenant, 2) Tenant config heroTitle, 3) Tenant-specific defaults, 4) Fallback HeroSettings from default
  const tenantDefaults = tenantHeroDefaults[tenantId];
  
  // Use tenant-specific defaults if we have them and DB heroSettings is from another tenant
  const shouldUseTenantDefaults = tenantDefaults && (!heroSettings || !heroSettingsMatchesTenant);
  
  // Helper function to convert image URLs to HeroSettings backgroundImages format
  const convertImagesToHeroFormat = (images: string[]): { desktop: string; alt: string; isActive: boolean }[] => {
    if (!images || images.length === 0) {
      return [
        { desktop: '/hero1.jpg', alt: 'Default hero image', isActive: true },
      ];
    }
    return images.map((url, index) => ({
      desktop: url,
      alt: `Hero image ${index + 1}`,
      isActive: index === 0, // First image is active by default
    }));
  };
  
  // Determine which images to use
  const imageUrls = tenantConfig?.homepage?.heroImages || tenantDefaults?.images || ['/hero1.jpg', '/hero2.jpg', '/hero3.jpg'];
  const backgroundImages = convertImagesToHeroFormat(Array.isArray(imageUrls) ? imageUrls : [imageUrls]);
  const currentActiveImage = backgroundImages.find(img => img.isActive)?.desktop || backgroundImages[0]?.desktop || '/hero1.jpg';
  
  // Determine effective hero settings with proper priority
  // 1. Use DB HeroSettings if it matches this tenant
  // 2. Otherwise, use tenant-specific defaults or tenant config
  let effectiveHeroSettings;
  
  if (heroSettingsMatchesTenant) {
    // Use database HeroSettings for this tenant
    effectiveHeroSettings = heroSettings;
  } else if (shouldUseTenantDefaults || tenantConfig?.homepage) {
    // Use tenant-specific defaults or tenant config
    effectiveHeroSettings = {
    title: tenantDefaults?.title || { 
      main: tenantConfig?.homepage?.heroTitle || tenantConfig?.seo?.defaultTitle || 'Explore Amazing', 
      highlight: 'Destinations' 
    },
    subtitle: tenantConfig?.homepage?.heroSubtitle || tenantDefaults?.subtitle,
    backgroundImages,
    currentActiveImage,
    searchSuggestions: tenantDefaults?.suggestions || [
      'Pyramids Tour',
      'Red Sea Diving',
      'Desert Safari',
      'Nile Cruise',
      'Luxor Temple',
    ],
    floatingTags: {
      isEnabled: true,
      tags: [
        tenantConfig?.name || 'Tours',
        'Best Prices',
        '24/7 Support',
      ],
      animationSpeed: 5,
      tagCount: {
        desktop: 9,
        mobile: 5,
      },
    },
    trustIndicators: {
      travelers: '2M+',
      rating: '4.9/5',
      ratingText: '★★★★★',
      isVisible: true,
    },
    overlaySettings: {
      opacity: 0.6,
      gradientType: 'dark' as const,
    },
    animationSettings: {
      slideshowSpeed: 6,
      fadeSpeed: 900,
      enableAutoplay: true,
    },
  };
  } else {
    // Fallback: use the heroSettings from another tenant (e.g., 'default') if nothing else is available
    effectiveHeroSettings = heroSettings;
  }

  return (
    <main data-tenant={tenantId}>
      <ReviewsStructuredData />
      <Header
        initialDestinations={headerDestinations}
        initialCategories={headerCategories}
      />
      <HeroSection initialSettings={effectiveHeroSettings} />

      {/* Pass pre-fetched data as props */}
      <DestinationsServer destinations={effectiveDestinations} />
      
      {/* Show IcebarPromo only if enabled for this tenant or if no tenant config */}
      {(!tenantConfig || tenantConfig.homepage?.showPromoSection) && (
        <IcebarPromo />
      )}
      
      <FeaturedToursServer tours={tours} />
      <PopularInterestServer interests={featuredInterests} categoryPages={categoryPages} />
      <InterestGridServer categories={categories} />
      <DayTripsServer tours={dayTrips} />

      {/* Show AboutUs only if enabled for this tenant */}
      {(!tenantConfig || tenantConfig.homepage?.showAboutUs !== false) && (
        <AboutUs />
      )}
      
      {/* Show Reviews only if enabled for this tenant */}
      {(!tenantConfig || tenantConfig.homepage?.showReviews !== false) && (
        <Reviews />
      )}
      
      {/* Show FAQ only if enabled for this tenant */}
      {(!tenantConfig || tenantConfig.homepage?.showFAQ !== false) && (
        <FAQ />
      )}
      
      <Footer />
      
      {/* Show AISearchWidget only if enabled for this tenant */}
      {(!tenantConfig || tenantConfig.features?.enableAISearch !== false) && (
        <AISearchWidget />
      )}
    </main>
  );
}
