import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';
import AttractionPage from '@/lib/models/AttractionPage'; // Add this import
import { requireAdminAuth } from '@/lib/auth/adminAuth';

const PLACEHOLDER_PATTERNS = [
  'your-cdn.com',
  'placeholder',
  'example.com'
];

const isPlaceholderUrl = (url: string) => {
  return PLACEHOLDER_PATTERNS.some(pattern => 
    url.toLowerCase().includes(pattern.toLowerCase())
  );
};

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    
    const results = {
      tours: { count: 0, cleaned: [] },
      categories: { count: 0, cleaned: [] },
      destinations: { count: 0, cleaned: [] },
      attractionPages: { count: 0, cleaned: [] } // Add this
    };

    // Clean Tours
    const toursWithPlaceholders = await Tour.find({
      $or: [
        { image: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } },
        { 'images.0': { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } }
      ]
    }).select('_id title image images').lean();

    if (toursWithPlaceholders.length > 0) {
      // Clean main image
      const tourImageResult = await Tour.updateMany(
        { image: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } },
        { $unset: { image: 1 } }
      );

      // Clean images array
      await Tour.updateMany(
        { 'images.0': { $exists: true } },
        [{ 
          $set: { 
            images: { 
              $filter: { 
                input: '$images', 
                cond: { 
                  $not: { 
                    $regexMatch: { 
                      input: '$$this', 
                      regex: PLACEHOLDER_PATTERNS.join('|'), 
                      options: 'i' 
                    } 
                  } 
                } 
              } 
            } 
          } 
        }]
      );

      results.tours.count = tourImageResult.modifiedCount;
      results.tours.cleaned = toursWithPlaceholders.map(tour => ({
        id: tour._id,
        title: tour.title,
        oldImage: tour.image
      }));
    }

    // Clean Categories
    const categoriesWithPlaceholders = await Category.find({
      $or: [
        { heroImage: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } },
        { image: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } }
      ]
    }).select('_id name title heroImage image').lean();

    if (categoriesWithPlaceholders.length > 0) {
      const categoryResult = await Category.updateMany(
        {
          $or: [
            { heroImage: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } },
            { image: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } }
          ]
        },
        { 
          $unset: { 
            heroImage: 1,
            image: 1
          } 
        }
      );

      results.categories.count = categoryResult.modifiedCount;
      results.categories.cleaned = categoriesWithPlaceholders.map(cat => ({
        id: cat._id,
        title: cat.name || cat.title,
        oldHeroImage: cat.heroImage,
        oldImage: cat.image
      }));
    }

    // Clean Destinations
    const destinationsWithPlaceholders = await Destination.find({
      $or: [
        { heroImage: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } },
        { image: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } }
      ]
    }).select('_id name heroImage image').lean();

    if (destinationsWithPlaceholders.length > 0) {
      const destinationResult = await Destination.updateMany(
        {
          $or: [
            { heroImage: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } },
            { image: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } }
          ]
        },
        { 
          $unset: { 
            heroImage: 1,
            image: 1
          } 
        }
      );

      results.destinations.count = destinationResult.modifiedCount;
      results.destinations.cleaned = destinationsWithPlaceholders.map(dest => ({
        id: dest._id,
        title: dest.name,
        oldHeroImage: dest.heroImage,
        oldImage: dest.image
      }));
    }

    // Clean AttractionPages (NEW)
    const attractionPagesWithPlaceholders = await AttractionPage.find({
      $or: [
        { heroImage: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } },
        { 'images.0': { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } }
      ]
    }).select('_id title heroImage images').lean();

    if (attractionPagesWithPlaceholders.length > 0) {
      // Clean hero image (but don't unset it since it's required - set to a default)
      const attractionHeroResult = await AttractionPage.updateMany(
        { heroImage: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } },
        { $set: { heroImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200' } } // Default landscape image
      );

      // Clean images array
      await AttractionPage.updateMany(
        { 'images.0': { $exists: true } },
        [{ 
          $set: { 
            images: { 
              $filter: { 
                input: '$images', 
                cond: { 
                  $not: { 
                    $regexMatch: { 
                      input: '$$this', 
                      regex: PLACEHOLDER_PATTERNS.join('|'), 
                      options: 'i' 
                    } 
                  } 
                } 
              } 
            } 
          } 
        }]
      );

      results.attractionPages.count = attractionHeroResult.modifiedCount;
      results.attractionPages.cleaned = attractionPagesWithPlaceholders.map(page => ({
        id: page._id,
        title: page.title,
        oldHeroImage: page.heroImage
      }));
    }

    const totalCleaned = results.tours.count + results.categories.count + results.destinations.count + results.attractionPages.count;

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned ${totalCleaned} items with placeholder images`,
      totalCleaned,
      results
    });
    
  } catch (error) {
    console.error('Error cleaning images:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to clean images'
    }, { status: 500 });
  }
}

// GET endpoint to check how many items have placeholder images
export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    
    const results = {
      tours: { count: 0, items: [] },
      categories: { count: 0, items: [] },
      destinations: { count: 0, items: [] },
      attractionPages: { count: 0, items: [] } // Add this
    };

    // Check Tours
    const toursWithPlaceholders = await Tour.find({
      $or: [
        { image: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } },
        { 'images.0': { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } }
      ]
    }).select('_id title image images').lean();

    results.tours.count = toursWithPlaceholders.length;
    results.tours.items = toursWithPlaceholders.map(tour => ({
      id: tour._id,
      title: tour.title,
      type: 'tour',
      image: tour.image,
      images: tour.images
    }));

    // Check Categories
    const categoriesWithPlaceholders = await Category.find({
      $or: [
        { heroImage: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } },
        { image: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } }
      ]
    }).select('_id name title heroImage image').lean();

    results.categories.count = categoriesWithPlaceholders.length;
    results.categories.items = categoriesWithPlaceholders.map(cat => ({
      id: cat._id,
      title: cat.name || cat.title,
      type: 'category',
      heroImage: cat.heroImage,
      image: cat.image
    }));

    // Check Destinations
    const destinationsWithPlaceholders = await Destination.find({
      $or: [
        { heroImage: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } },
        { image: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } }
      ]
    }).select('_id name heroImage image').lean();

    results.destinations.count = destinationsWithPlaceholders.length;
    results.destinations.items = destinationsWithPlaceholders.map(dest => ({
      id: dest._id,
      title: dest.name,
      type: 'destination',
      heroImage: dest.heroImage,
      image: dest.image
    }));

    // Check AttractionPages (NEW)
    const attractionPagesWithPlaceholders = await AttractionPage.find({
      $or: [
        { heroImage: { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } },
        { 'images.0': { $regex: PLACEHOLDER_PATTERNS.join('|'), $options: 'i' } }
      ]
    }).select('_id title heroImage images').lean();

    results.attractionPages.count = attractionPagesWithPlaceholders.length;
    results.attractionPages.items = attractionPagesWithPlaceholders.map(page => ({
      id: page._id,
      title: page.title,
      type: 'attraction-page',
      heroImage: page.heroImage,
      images: page.images
    }));

    const totalCount = results.tours.count + results.categories.count + results.destinations.count + results.attractionPages.count;
    const allItems = [
      ...results.tours.items,
      ...results.categories.items,
      ...results.destinations.items,
      ...results.attractionPages.items
    ];

    return NextResponse.json({
      success: true,
      totalCount,
      results,
      allItems
    });
    
  } catch (error) {
    console.error('Error checking placeholder images:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check images'
    }, { status: 500 });
  }
}