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

      // Hero settings (filtered by tenant)
      HeroSettings.findOne(buildTenantQuery({ isActive: true }, tenantId))
        .select('backgroundImages currentActiveImage title searchSuggestions floatingTags trustIndicators overlaySettings animationSettings metaTitle metaDescription tenantId')
        .lean()
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

  return (
    <main data-tenant={tenantId}>
      <ReviewsStructuredData />
      <Header
        initialDestinations={headerDestinations}
        initialCategories={headerCategories}
      />
      <HeroSection initialSettings={heroSettings} />

      {/* Pass pre-fetched data as props */}
      <DestinationsServer destinations={destinations} />
      
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
