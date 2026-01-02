// app/api/tours/[tourId]/options/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

// Helper function to check if string is a valid MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const { tourId } = await params;

  if (!tourId) {
    return NextResponse.json({ message: 'Tour ID is required' }, { status: 400 });
  }

  try {
    await dbConnect();

    let tour: any = null;

    // Check if tourId is an ObjectId or a slug
    if (isValidObjectId(tourId)) {
      tour = await Tour.findById(tourId);
    } else {
      tour = await Tour.findOne({ slug: tourId });
    }

    if (!tour) {
      return NextResponse.json({ message: 'Tour not found' }, { status: 404 });
    }

    // Return actual booking options from database, or generate fallback if none exist
    let tourOptions;

    if (tour.bookingOptions && tour.bookingOptions.length > 0) {
      // Ensure stable ids exist (bookingOptions[].id)
      let changed = false;
      tour.bookingOptions = tour.bookingOptions.map((opt: any) => {
        if (!opt) return opt;
        if (!opt.id) {
          changed = true;
          return { ...opt, id: globalThis.crypto?.randomUUID?.() || `opt-${Date.now()}-${Math.random().toString(16).slice(2)}` };
        }
        return opt;
      });
      if (changed) {
        await tour.save();
      }

      // Use real booking options from database
      tourOptions = tour.bookingOptions.map((option: any, index: number) => ({
        id: option.id || `option-${index}`,
        title: option.label || `${tour.title} - ${option.type}`,
        type: option.type || 'Per Person',
        price: option.price || tour.discountPrice,
        originalPrice: option.originalPrice || tour.originalPrice,
        duration: option.duration || tour.duration || '3 hours',
        languages: option.languages || tour.languages || ['English'],
        description: option.description || tour.description || 'Complete tour experience',
        timeSlots: option.timeSlots || [
          { id: 'slot-1', time: '09:00', available: 12, price: option.price || tour.discountPrice, originalPrice: option.originalPrice, isPopular: false },
          { id: 'slot-2', time: '11:00', available: 8, price: option.price || tour.discountPrice, originalPrice: option.originalPrice, isPopular: true },
          { id: 'slot-3', time: '14:00', available: 15, price: option.price || tour.discountPrice, originalPrice: option.originalPrice, isPopular: false },
          { id: 'slot-4', time: '16:00', available: 3, price: option.price || tour.discountPrice, originalPrice: option.originalPrice, isPopular: false },
        ],
        highlights: option.highlights || tour.highlights?.slice(0, 3) || ['Expert guide included'],
        groupSize: option.groupSize || `Max ${tour.maxGroupSize || 15} people`,
        difficulty: option.difficulty || tour.difficulty || 'Easy',
        badge: option.badge || (option.isRecommended ? 'Recommended' : undefined),
        discount: option.discount,
        isRecommended: option.isRecommended || false,
      }));
    } else {
      // Fallback: Generate default option if no booking options exist
      tourOptions = [
        {
          id: 'standard-default',
          title: `${tour.title} - Standard Experience`,
          price: tour.discountPrice,
          originalPrice: tour.originalPrice,
          duration: tour.duration || '3 hours',
          languages: tour.languages || ['English'],
          description: tour.description || 'Complete tour experience with all essential features and expert guidance.',
          timeSlots: [
            { id: 'slot-1', time: '09:00', available: 12, price: tour.discountPrice, originalPrice: tour.originalPrice, isPopular: false },
            { id: 'slot-2', time: '11:00', available: 8, price: tour.discountPrice, originalPrice: tour.originalPrice, isPopular: true },
            { id: 'slot-3', time: '14:00', available: 15, price: tour.discountPrice, originalPrice: tour.originalPrice, isPopular: false },
            { id: 'slot-4', time: '16:00', available: 3, price: tour.discountPrice, originalPrice: tour.originalPrice, isPopular: false },
          ],
          highlights: tour.highlights?.slice(0, 3) || ['Expert guide included', 'Small group experience', 'Photo opportunities'],
          groupSize: `Max ${tour.maxGroupSize || 15} people`,
          difficulty: 'Easy',
          badge: 'Most Popular',
          isRecommended: true,
        }
      ];
    }

    return NextResponse.json(tourOptions);

  } catch (error) {
    console.error('Failed to fetch tour options:', error);
    return NextResponse.json({ message: 'An error occurred while fetching tour options.' }, { status: 500 });
  }
}