// app/api/admin/data-viewer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;
  try {
    await dbConnect();

    // Fetch all data with populated references
    const [tours, destinations, categories, attractions] = await Promise.all([
      Tour.find({})
        .populate('destination', 'name slug')
        .populate('category', 'name slug')
        .lean(),
      Destination.find({}).lean(),
      Category.find({}).lean(),
      AttractionPage.find({}).lean(), // Don't populate category for attractions
    ]);

    // Structure the data nicely
    const structuredData = {
      summary: {
        totalTours: tours.length,
        totalDestinations: destinations.length,
        totalCategories: categories.length,
        totalAttractions: attractions.length,
        publishedTours: tours.filter((t: any) => t.isPublished).length,
        featuredTours: tours.filter((t: any) => t.isFeatured).length,
      },
      tours: tours.map((tour: any) => ({
        _id: tour._id,
        title: tour.title,
        slug: tour.slug,
        destination: tour.destination,
        category: tour.category,
        price: tour.discountPrice,
        originalPrice: tour.originalPrice,
        duration: tour.duration,
        difficulty: tour.difficulty,
        maxGroupSize: tour.maxGroupSize,
        isPublished: tour.isPublished,
        isFeatured: tour.isFeatured,

        // Basic Info
        description: tour.description,
        longDescription: tour.longDescription,
        location: tour.location,
        meetingPoint: tour.meetingPoint,
        languages: tour.languages,
        ageRestriction: tour.ageRestriction,
        cancellationPolicy: tour.cancellationPolicy,
        operatedBy: tour.operatedBy,

        // Media
        image: tour.image,
        images: tour.images,

        // Lists
        highlights: tour.highlights,
        includes: tour.includes,
        whatsIncluded: tour.whatsIncluded,
        whatsNotIncluded: tour.whatsNotIncluded,
        tags: tour.tags,

        // Practical Information
        whatToBring: tour.whatToBring,
        whatToWear: tour.whatToWear,
        physicalRequirements: tour.physicalRequirements,
        accessibilityInfo: tour.accessibilityInfo,
        groupSize: tour.groupSize,
        transportationDetails: tour.transportationDetails,
        mealInfo: tour.mealInfo,
        weatherPolicy: tour.weatherPolicy,
        photoPolicy: tour.photoPolicy,
        tipPolicy: tour.tipPolicy,
        healthSafety: tour.healthSafety,
        culturalInfo: tour.culturalInfo,
        seasonalVariations: tour.seasonalVariations,
        localCustoms: tour.localCustoms,

        // SEO
        metaTitle: tour.metaTitle,
        metaDescription: tour.metaDescription,
        keywords: tour.keywords,

        // Complex Objects
        itinerary: tour.itinerary,
        faq: tour.faq,
        bookingOptions: tour.bookingOptions,
        addOns: tour.addOns,
        availability: tour.availability,

        // Timestamps
        createdAt: tour.createdAt,
        updatedAt: tour.updatedAt,
      })),
      destinations: destinations.map((dest: any) => ({
        _id: dest._id,
        name: dest.name,
        slug: dest.slug,
        country: dest.country,
        image: dest.image,
        images: dest.images,
        description: dest.description,
        longDescription: dest.longDescription,
        coordinates: dest.coordinates,
        currency: dest.currency,
        timezone: dest.timezone,
        bestTimeToVisit: dest.bestTimeToVisit,
        highlights: dest.highlights,
        thingsToDo: dest.thingsToDo,
        localCustoms: dest.localCustoms,
        visaRequirements: dest.visaRequirements,
        languagesSpoken: dest.languagesSpoken,
        emergencyNumber: dest.emergencyNumber,
        averageTemperature: dest.averageTemperature,
        climate: dest.climate,
        weatherWarnings: dest.weatherWarnings,
        featured: dest.featured,
        isPublished: dest.isPublished,
        tourCount: dest.tourCount,
        metaTitle: dest.metaTitle,
        metaDescription: dest.metaDescription,
        keywords: dest.keywords,
        tags: dest.tags,
        createdAt: dest.createdAt,
        updatedAt: dest.updatedAt,
      })),
      categories: categories.map((cat: any) => ({
        _id: cat._id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        image: cat.image,
        featured: cat.featured,
        order: cat.order,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      })),
      attractions: attractions.map((attr: any) => ({
        _id: attr._id,
        title: attr.title,
        slug: attr.slug,
        pageType: attr.pageType,
        category: attr.category,
        heroImage: attr.heroImage,
        description: attr.description,
        gridTitle: attr.gridTitle,
        gridSubtitle: attr.gridSubtitle,
        itemsPerRow: attr.itemsPerRow,
        showStats: attr.showStats,
        highlights: attr.highlights,
        features: attr.features,
        images: attr.images,
        isPublished: attr.isPublished,
        featured: attr.featured,
        metaTitle: attr.metaTitle,
        metaDescription: attr.metaDescription,
        keywords: attr.keywords,
        order: attr.order,
        createdAt: attr.createdAt,
        updatedAt: attr.updatedAt,
      })),
    };

    return NextResponse.json(structuredData, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error.message },
      { status: 500 }
    );
  }
}
