import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';

// Helper function for flexible live search
function createLiveSearchConditions(searchQuery: string) {
    if (!searchQuery) return null;
    
    const keywords = searchQuery
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1); // More lenient for live search
    
    if (keywords.length === 0) return null;
    
    // For live search, we want broader matches
    const conditions = keywords.map(keyword => ({
        $or: [
            { title: { $regex: keyword, $options: 'i' } },
            { location: { $regex: keyword, $options: 'i' } },
            { tags: { $regex: keyword, $options: 'i' } }
        ]
    }));
    
    return { $or: conditions };
}

export async function GET(req: NextRequest) {
    const tenantId = req.nextUrl.searchParams.get('tenantId') || req.headers.get('x-tenant-id') || await getTenantFromRequest();
    await dbConnect(tenantId);

    try {
        const { searchParams } = new URL(req.url);
        const searchQuery = searchParams.get('q');
        const tenantFilter = buildStrictTenantQuery({}, tenantId);

        if (!searchQuery) {
            // Return tours based on filters when no search query
            const query: any = { ...tenantFilter };

            const categories = searchParams.get('categories');
            if (categories) {
                try {
                    query.category = { $in: categories.split(',').map(id => new mongoose.Types.ObjectId(id)) };
                } catch (error) {
                    console.warn("Invalid category ID format", error);
                }
            }

            const destinations = searchParams.get('destinations');
            if (destinations) {
                try {
                    query.destination = { $in: destinations.split(',').map(id => new mongoose.Types.ObjectId(id)) };
                } catch (error) {
                    console.warn("Invalid destination ID format", error);
                }
            }

            const minPrice = searchParams.get('minPrice');
            const maxPrice = searchParams.get('maxPrice');
            if (minPrice || maxPrice) {
                query.discountPrice = {};
                if (minPrice) query.discountPrice.$gte = Number(minPrice);
                if (maxPrice) query.discountPrice.$lte = Number(maxPrice);
            }

            const ratings = searchParams.get('ratings');
            if (ratings) {
                const ratingValues = ratings.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
                if (ratingValues.length > 0) {
                    query.rating = { $gte: Math.min(...ratingValues) };
                }
            }
            
            let sortOption: any = { bookings: -1, rating: -1 };
            const sortBy = searchParams.get('sortBy');
            if (sortBy === 'price-asc') {
                sortOption = { discountPrice: 1 };
            } else if (sortBy === 'price-desc') {
                sortOption = { discountPrice: -1 };
            } else if (sortBy === 'rating') {
                sortOption = { rating: -1 };
            }

            const tours = await Tour.find(query)
                .populate('category', 'name')
                .populate('destination', 'name')
                .sort(sortOption)
                .limit(50)
                .lean();

            return NextResponse.json({ success: true, data: tours });
        }

        // Enhanced live search with flexible matching
        const searchConditions = createLiveSearchConditions(searchQuery);
        
        if (!searchConditions) {
            return NextResponse.json({ success: true, data: [] });
        }

        const tours = await Tour.find({
            $and: [
              tenantFilter,
              searchConditions,
            ]
        })
            .select('title slug image rating reviews destination location tags')
            .populate('destination', 'name')
            .sort({ rating: -1, bookings: -1 }) // Prioritize high-rated popular tours
            .limit(10)
            .lean();

        return NextResponse.json({ success: true, data: tours });

    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ success: false, message: 'Server Error', error: errorMessage }, { status: 500 });
    }
}
