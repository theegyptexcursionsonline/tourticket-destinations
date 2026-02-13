import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import mongoose from 'mongoose';
import Fuse from 'fuse.js';

// Fuse.js configuration for fuzzy search fallback
const fuseOptions = {
    keys: [
        { name: 'title', weight: 0.4 },
        { name: 'location', weight: 0.3 },
        { name: 'tags', weight: 0.2 },
        { name: 'description', weight: 0.1 }
    ],
    threshold: 0.4, // Lower = more strict, Higher = more fuzzy
    includeScore: true,
    minMatchCharLength: 2,
    ignoreLocation: true
};

async function performTextSearch(searchQuery: string, additionalFilters: any = {}) {
    try {
        // Try MongoDB text search first
        const textSearchResults = await Tour.find({
            $text: { $search: searchQuery },
            ...additionalFilters
        })
        .select({ score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" }, rating: -1 })
        .populate('category', 'name')
        .populate('destination', 'name')
        .limit(50)
        .lean();

        if (textSearchResults.length > 0) {
            console.log(`Text search found ${textSearchResults.length} results for: ${searchQuery}`);
            return textSearchResults;
        }

        // Fallback to regex search if text search returns no results
        console.log(`Text search found no results, trying regex search for: ${searchQuery}`);
        
        const keywords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 1);
        const regexConditions = keywords.map(keyword => ({
            $or: [
                { title: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } },
                { location: { $regex: keyword, $options: 'i' } },
                { tags: { $regex: keyword, $options: 'i' } }
            ]
        }));

        const regexResults = await Tour.find({
            $and: [
                { $or: regexConditions },
                additionalFilters
            ]
        })
        .populate('category', 'name')
        .populate('destination', 'name')
        .sort({ rating: -1, bookings: -1 })
        .limit(50)
        .lean();

        if (regexResults.length > 0) {
            console.log(`Regex search found ${regexResults.length} results for: ${searchQuery}`);
            return regexResults;
        }

        // Last resort: fuzzy search with Fuse.js
        console.log(`Regex search found no results, trying fuzzy search for: ${searchQuery}`);
        
        const allTours = await Tour.find(additionalFilters)
            .populate('category', 'name')
            .populate('destination', 'name')
            .lean();

        if (allTours.length === 0) {
            return [];
        }

        const fuse = new Fuse(allTours, fuseOptions);
        const fuzzyResults = fuse.search(searchQuery);
        
        console.log(`Fuzzy search found ${fuzzyResults.length} results for: ${searchQuery}`);
        
        return fuzzyResults.map(result => result.item).slice(0, 20);

    } catch (error) {
        console.error('Search error:', error);
        throw error;
    }
}

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);

        // Build additional filters - ALWAYS filter for published tours only
        const additionalFilters: any = {
            isPublished: true  // Only show published tours
        };

        // Multi-tenant: Filter by tenantId if provided (from header or query param)
        const tenantId = searchParams.get('tenantId') || request.headers.get('x-tenant-id');
        if (tenantId && tenantId !== 'all' && tenantId !== 'default') {
            additionalFilters.tenantId = tenantId;
        }

        // Categories Filter
        const categories = searchParams.get('categories');
        if (categories) {
            try {
                additionalFilters.category = { 
                    $in: categories.split(',').map(id => new mongoose.Types.ObjectId(id)) 
                };
            } catch (error) {
                console.warn("Invalid category ID format", error);
            }
        }

        // Destinations Filter
        const destinations = searchParams.get('destinations');
        if (destinations) {
            try {
                additionalFilters.destination = { 
                    $in: destinations.split(',').map(id => new mongoose.Types.ObjectId(id)) 
                };
            } catch (error) {
                console.warn("Invalid destination ID format", error);
            }
        }

        // Price Filter
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        if (minPrice || maxPrice) {
            const priceQuery: any = {};
            if (minPrice) priceQuery.$gte = Number(minPrice);
            if (maxPrice) priceQuery.$lte = Number(maxPrice);
            additionalFilters.$or = [
                { discountPrice: priceQuery },
                { price: priceQuery }
            ];
        }

        // Duration Filter
        const durations = searchParams.get('durations');
        if (durations) {
            const durationConditions = durations.split(',').map(range => {
                const [min, max] = range.split('-').map(Number);
                if (!isNaN(min) && !isNaN(max)) {
                    return { duration: { $gte: min, $lte: max } };
                }
                return null;
            }).filter(Boolean);

            if (durationConditions.length > 0) {
                additionalFilters.duration = { 
                    $or: durationConditions.map(c => c!.duration) 
                };
            }
        }

        // Ratings Filter
        const ratings = searchParams.get('ratings');
        if (ratings) {
            const ratingValues = ratings.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
            if (ratingValues.length > 0) {
                additionalFilters.rating = { $gte: Math.min(...ratingValues) };
            }
        }

        // Get search query
        const searchQuery = searchParams.get('q');
        let tours = [];

        if (searchQuery && searchQuery.trim()) {
            // Perform text search
            tours = await performTextSearch(searchQuery.trim(), additionalFilters);
        } else {
            // No search query, just apply filters and show all published tours
            let sortOption: any = { featured: -1, bookings: -1, rating: -1 }; // Featured first, then popular
            const sortBy = searchParams.get('sortBy');
            
            if (sortBy === 'price-asc') {
                sortOption = { discountPrice: 1, price: 1 };
            } else if (sortBy === 'price-desc') {
                sortOption = { discountPrice: -1, price: -1 };
            } else if (sortBy === 'rating') {
                sortOption = { rating: -1, bookings: -1 };
            }

            tours = await Tour.find(additionalFilters)
                .populate('category', 'name')
                .populate('destination', 'name')
                .sort(sortOption)
                .limit(100) // Show up to 100 tours (increased from 50)
                .lean();
        }

        // Apply sorting if specified and we have search results
        const sortBy = searchParams.get('sortBy');
        if (tours.length > 0 && sortBy && searchQuery) {
            if (sortBy === 'price-asc') {
                tours.sort((a, b) => (a.discountPrice || a.price || 0) - (b.discountPrice || b.price || 0));
            } else if (sortBy === 'price-desc') {
                tours.sort((a, b) => (b.discountPrice || b.price || 0) - (a.discountPrice || a.price || 0));
            } else if (sortBy === 'rating') {
                tours.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
            }
        }

        console.log(`Final result count: ${tours.length}`);
        return NextResponse.json(tours);

    } catch (error) {
        console.error('Error fetching tours:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
            message: 'Internal Server Error', 
            error: errorMessage,
            tours: [] // Return empty array as fallback
        }, { status: 500 });
    }
}