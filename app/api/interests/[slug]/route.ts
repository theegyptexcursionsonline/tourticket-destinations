// app/api/interests/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Review from '@/lib/models/Review';
import User from '@/lib/models/user';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();

    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    
    // Convert slug back to name (adventure-tour -> Adventure Tour)
    const interestName = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    console.log('Looking for interest:', interestName, 'with slug:', slug);

    // Find the category by name or slug
    const category = await Category.findOne({
      $or: [
        { slug: slug },
        { name: { $regex: new RegExp(`^${interestName}$`, 'i') } }
      ]
    }).lean();

    console.log('Found category:', category);

    let tours: any[] = [];
    let totalTours = 0;

    if (category) {
      // Find tours in this category
      tours = await Tour.find({
        category: { $in: [(category as any)._id] },
        isPublished: true
      })
      .populate({
        path: 'destination',
        model: Destination,
        select: 'name slug country image description'
      })
      .populate({
        path: 'category',
        model: Category,
        select: 'name slug'
      })
      .sort({ isFeatured: -1, rating: -1, bookings: -1 })
      .lean();

      totalTours = await Tour.countDocuments({
        category: { $in: [(category as any)._id] },
        isPublished: true
      });
    } else {
      // If no exact category match, search by keywords in tours
      const searchTerms = interestName.split(' ').filter(term => term.length > 2);
      
      if (searchTerms.length > 0) {
        const searchQueries = [];
        
        // Search in title
        searchTerms.forEach(term => {
          searchQueries.push({ 
            title: { $regex: term, $options: 'i' } 
          });
        });
        
        // Search in tags
        searchQueries.push({ 
          tags: { 
            $in: searchTerms.map(term => new RegExp(term, 'i')) 
          } 
        });

        tours = await Tour.find({
          isPublished: true,
          $or: searchQueries
        })
        .populate({
          path: 'destination',
          model: Destination,
          select: 'name slug country image description'
        })
        .populate({
          path: 'category',
          model: Category,
          select: 'name slug'
        })
        .sort({ isFeatured: -1, rating: -1, bookings: -1 })
        .limit(50)
        .lean();

        totalTours = tours.length;
      }
    }

    console.log('Found tours:', tours.length);

    // Fetch reviews for these tours (optimized with limit)
    const tourIds = tours.slice(0, 20).map(tour => tour._id); // Limit to first 20 tours for reviews
    let reviews: any[] = [];
    let reviewStats: any[] = [];

    if (tourIds.length > 0) {
      // Run review queries in parallel
      [reviews, reviewStats] = await Promise.all([
        Review.find({
          tour: { $in: tourIds }
        })
        .populate({
          path: 'user',
          model: User,
          select: 'firstName lastName picture'
        })
        .sort({ createdAt: -1 })
        .limit(20) // Reduced limit
        .lean(),

        Review.aggregate([
          { $match: { tour: { $in: tourIds } } },
          {
            $group: {
              _id: '$tour',
              count: { $sum: 1 },
              avgRating: { $avg: '$rating' }
            }
          }
        ])
      ]);
    }

    const reviewStatsMap = reviewStats.reduce((acc, item) => {
      acc[item._id.toString()] = {
        count: item.count,
        avgRating: Math.round(item.avgRating * 10) / 10
      };
      return acc;
    }, {});

    // Update tours with review data
    tours = (tours as any[]).map(tour => ({
      ...tour,
      reviewCount: reviewStatsMap[tour._id.toString()]?.count || 0,
      rating: reviewStatsMap[tour._id.toString()]?.avgRating || tour.rating || 4.5
    }));

    // Get related categories (fetch in parallel if possible, but skip during build)
    let relatedCategories: any[] = [];
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
      relatedCategories = await Category.find({
        _id: { $ne: (category as any)?._id }
      }).limit(6).lean();
    }

    // Transform reviews
    const transformedReviews = (reviews as any[]).map(review => ({
      ...review,
      userName: review.user
        ? `${review.user.firstName} ${review.user.lastName}`.trim()
        : review.userName || 'Anonymous',
      userAvatar: review.user?.picture || null
    }));

    const interestData = {
      name: interestName,
      slug: slug,
      description: (category as any)?.description || `Discover amazing ${interestName.toLowerCase()} experiences in Egypt`,
      longDescription: `Explore our curated collection of ${interestName.toLowerCase()} tours and experiences. From budget-friendly options to luxury adventures, find the perfect way to experience Egypt's incredible ${interestName.toLowerCase()}.`,
      category: category,
      tours: tours,
      totalTours: totalTours,
      reviews: transformedReviews.slice(0, 20),
      relatedCategories: relatedCategories as any[],
      heroImage: tours.length > 0 ? tours[0].image : '/images/default-hero.jpg',
      highlights: [
        `Expert-guided ${interestName.toLowerCase()} experiences`,
        'Small group sizes for personalized attention',
        'Flexible cancellation policies',
        '24/7 customer support',
        'Best price guarantee'
      ],
      features: [
        `Professional ${interestName.toLowerCase()} guides with local expertise`,
        'Premium equipment and safety measures included',
        'Customizable itineraries to match your preferences',
        'Comprehensive insurance coverage for peace of mind'
      ],
      stats: {
        totalTours: totalTours,
        totalReviews: transformedReviews.length,
        averageRating: tours.length > 0 
          ? (tours.reduce((acc, tour) => acc + (tour.rating || 0), 0) / tours.length).toFixed(1)
          : '4.8',
        happyCustomers: Math.floor(Math.random() * 5000) + 1000
      }
    };

    return NextResponse.json({
      success: true,
      data: interestData
    });
  } catch (error) {
    console.error('Error fetching interest data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch interest data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}