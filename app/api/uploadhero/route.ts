// app/api/uploadhero/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { extensionForImageType, validateImageUpload } from '@/lib/security/imageUpload';

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file received' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let detectedType;
    try {
      detectedType = validateImageUpload(file, buffer);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Invalid image.' },
        { status: 400 },
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = extensionForImageType(detectedType);
    const filename = `hero-${timestamp}-${randomStr}${extension}`;

    // Save to public directory
    const filepath = path.join(process.cwd(), 'public', 'uploads', 'hero', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    await require('fs').promises.mkdir(dir, { recursive: true });
    
    await writeFile(filepath, buffer);

    // Return relative URL
    const url = `/uploads/hero/${filename}`;

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}
