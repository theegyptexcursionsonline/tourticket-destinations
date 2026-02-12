// app/api/admin/hero-settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import HeroSettings from '@/lib/models/HeroSettings';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const filter: Record<string, unknown> = { isActive: true };
    if (tenantId && tenantId !== 'all') {
      filter.tenantId = tenantId;
    }

    let settings = await HeroSettings.findOne(filter);
    
    if (!settings) {
      // Create default settings if none exist
      const defaultTenantId = typeof filter.tenantId === 'string' ? filter.tenantId : 'default';
      settings = new HeroSettings({
        tenantId: defaultTenantId,
        backgroundImages: [
          {
            desktop: '/hero2.png',
            alt: 'Pyramids of Giza at sunrise',
            isActive: true,
          },
          {
            desktop: '/hero1.jpg',
            alt: 'Felucca on the Nile at sunset',
            isActive: false,
          },
          {
            desktop: '/hero3.png',
            alt: 'Luxor temple columns at golden hour',
            isActive: false,
          }
        ],
        currentActiveImage: '/hero2.png',
        title: {
          main: 'Explore Egypt\'s Pyramids & Nile',
        },
        searchSuggestions: [
          "Where are you going?",
          "Find your next adventure",
          "Discover hidden gems",
          "Book unique experiences",
          "Explore new destinations",
          "Create lasting memories"
        ],
        floatingTags: {
          isEnabled: true,
          tags: [
            "PYRAMID TOURS", "NILE CRUISES", "LUXOR TEMPLES", "SPHINX VISITS",
            "SUNSET FELUCCA", "ASWAN EXCURSIONS", "VALLEY OF THE KINGS", "CAMEL RIDES",
            "DESERT SAFARI", "RED SEA RESORTS", "HURGHADA DIVING", "ABU SIMBEL",
            "EGYPTIAN MUSEUM", "PHILAE TEMPLE", "LUXURY CRUISES", "CULTURAL TOURS",
            "MARKET BAZAARS", "NUBIAN VILLAGES", "ANCIENT TEMPLES", "HOT AIR BALLOON",
            "LOCAL CUISINE", "HISTORICAL SITES", "ADVENTURE SPORTS"
          ],
          animationSpeed: 5,
          tagCount: {
            desktop: 9,
            mobile: 5
          }
        },
        trustIndicators: {
          travelers: '2M+ travelers',
          rating: '4.9/5 rating',
          ratingText: '★★★★★',
          isVisible: true,
        },
        overlaySettings: {
          opacity: 0.6,
          gradientType: 'dark',
        },
        animationSettings: {
          slideshowSpeed: 6,
          fadeSpeed: 900,
          enableAutoplay: true
        },
        isActive: true,
      });
      
      await settings.save();
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching hero settings:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const body = await request.json();
    const tenantId = (body?.tenantId as string | undefined) ?? searchParams.get('tenantId');
    const updateFilter: Record<string, unknown> = { isActive: true };
    if (tenantId && tenantId !== 'all') {
      updateFilter.tenantId = tenantId;
    }

    const settings = await HeroSettings.findOneAndUpdate(
      updateFilter,
      body,
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error updating hero settings:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}