import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import AttractionPage from '@/lib/models/AttractionPage';

const models = {
    Tours: Tour,
    Destinations: Destination,
    Attractions: AttractionPage
};

export async function POST(req: NextRequest) {
    const auth = await requireAdminAuth(req);
    if (auth instanceof NextResponse) return auth;

    await dbConnect();

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const docId = formData.get('docId') as string;
        const modelType = formData.get('modelType') as string;
        const imageField = formData.get('imageField') as string;

        if (!file || !docId || !modelType || !imageField) {
            return NextResponse.json({ 
                success: false, 
                error: 'Missing required fields' 
            }, { status: 400 });
        }

        // Validate file
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ 
                success: false, 
                error: 'File must be an image' 
            }, { status: 400 });
        }

        // Create unique filename
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const extension = file.name.split('.').pop();
        const filename = `${modelType.toLowerCase()}-${timestamp}-${random}.${extension}`;

        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', modelType.toLowerCase());
        await mkdir(uploadDir, { recursive: true });

        // Save file
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);

        // Generate public URL
        const imageUrl = `/uploads/${modelType.toLowerCase()}/${filename}`;

        // Update database
        const Model = models[modelType as keyof typeof models];
        if (!Model) {
            return NextResponse.json({ 
                success: false, 
                error: 'Invalid model type' 
            }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(docId)) {
            return NextResponse.json({ 
                success: false, 
                error: 'Invalid document ID' 
            }, { status: 400 });
        }

        const updateResult = await (Model as any).updateOne(
            { _id: docId },
            { $set: { [imageField]: imageUrl } }
        );

        if (updateResult.matchedCount === 0) {
            return NextResponse.json({ 
                success: false, 
                error: 'Document not found' 
            }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            imageUrl,
            message: 'Image uploaded and linked successfully' 
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Upload failed', 
            details: error.message 
        }, { status: 500 });
    }
}

// Configure for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};