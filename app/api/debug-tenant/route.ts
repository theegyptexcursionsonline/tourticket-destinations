// Temporary debug endpoint to check tenant detection
import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

export async function GET() {
  try {
    const headersList = await headers();
    const cookieStore = await cookies();
    
    const tenantId = headersList.get('x-tenant-id');
    const tenantDomain = headersList.get('x-tenant-domain');
    const host = headersList.get('host');
    const cookieTenant = cookieStore.get('tenantId');
    
    // Try to connect to DB and count tours
    await dbConnect();
    
    const tourCount = await Tour.countDocuments({ tenantId: tenantId || 'default' });
    const allTours = await Tour.find({ tenantId: tenantId || 'default' })
      .select('slug title tenantId')
      .limit(5)
      .lean();
    
    return NextResponse.json({
      headers: {
        'x-tenant-id': tenantId,
        'x-tenant-domain': tenantDomain,
        'host': host,
      },
      cookie: {
        tenantId: cookieTenant?.value || null,
      },
      database: {
        tourCount,
        sampleTours: allTours.map(t => ({ slug: t.slug, title: t.title, tenantId: (t as any).tenantId })),
      },
      resolved: {
        tenantId: tenantId || cookieTenant?.value || 'default',
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
