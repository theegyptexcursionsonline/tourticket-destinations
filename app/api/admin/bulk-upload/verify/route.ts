// app/api/admin/bulk-upload/verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';

export async function GET(req: NextRequest) {
    const auth = await requireAdminAuth(req);
    if (auth instanceof NextResponse) return auth;

    await dbConnect();

    try {
        // Get counts
        const counts = {
            destinations: await Destination.countDocuments(),
            categories: await Category.countDocuments(),
            attractions: await AttractionPage.countDocuments(),
            tours: await Tour.countDocuments()
        };

        // Get sample data (first 5 of each)
        const samples = {
            destinations: await Destination.find()
                .select('name slug image')
                .limit(5)
                .lean(),
            
            categories: await Category.find()
                .select('name slug')
                .limit(5)
                .lean(),
            
            attractions: await AttractionPage.find()
                .select('title slug pageType categoryId heroImage')
                .populate('categoryId', 'name')
                .limit(5)
                .lean(),
            
            tours: await Tour.find()
                .select('title slug destination category image price')
                .populate('destination', 'name')
                .populate('category', 'name')
                .limit(5)
                .lean()
        };

        // Check for items missing images
        const missingImages = {
            destinations: await Destination.find({ image: { $exists: false } })
                .select('name slug')
                .lean(),
            
            attractions: await AttractionPage.find({ heroImage: { $exists: false } })
                .select('title slug')
                .lean(),
            
            tours: await Tour.find({ image: { $exists: false } })
                .select('title slug')
                .lean()
        };

        // Check reference integrity
        const brokenReferences = {
            attractions: await AttractionPage.find({
                pageType: 'category',
                categoryId: { $exists: false }
            }).select('title slug').lean(),
            
            tours: await Tour.find({
                $or: [
                    { destination: { $exists: false } },
                    { category: { $exists: false } }
                ]
            }).select('title slug').lean()
        };

        return NextResponse.json({
            success: true,
            summary: {
                total: counts.destinations + counts.categories + counts.attractions + counts.tours,
                ...counts
            },
            samples,
            missingImages: {
                destinationsCount: missingImages.destinations.length,
                attractionsCount: missingImages.attractions.length,
                toursCount: missingImages.tours.length,
                items: missingImages
            },
            brokenReferences: {
                attractionsCount: brokenReferences.attractions.length,
                toursCount: brokenReferences.tours.length,
                items: brokenReferences
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        return NextResponse.json({ 
            success: false, 
            error: 'Failed to verify data', 
            details: error.message 
        }, { status: 500 });
    }
}