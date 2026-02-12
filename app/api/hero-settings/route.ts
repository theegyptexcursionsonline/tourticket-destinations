// app/api/hero-settings/route.ts (Public endpoint for frontend)
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import HeroSettings from '@/lib/models/HeroSettings';

export async function GET() {
  try {
    await dbConnect();
    
    // Find active settings and only return necessary fields for frontend
    const settings = await HeroSettings.findOne(
      { isActive: true },
      {
        backgroundImages: 1,
        currentActiveImage: 1,
        title: 1,
        searchSuggestions: 1,
        floatingTags: 1,
        trustIndicators: 1,
        overlaySettings: 1,
        animationSettings: 1,
        metaTitle: 1,
        metaDescription: 1
      }
    ).lean();

    if (!settings) {
      // Return default settings if none found
      return NextResponse.json({
        success: true,
        data: {
          backgroundImages: [
            { desktop: '/hero2.png', alt: 'Pyramids of Giza at sunrise', isActive: true },
            { desktop: '/hero1.jpg', alt: 'Felucca on the Nile at sunset', isActive: false },
            { desktop: '/hero3.png', alt: 'Luxor temple columns at golden hour', isActive: false }
          ],
          currentActiveImage: '/hero2.png',
          title: {
            main: 'Explore Egypt\'s Pyramids & Nile',
            highlight: 'Incredible',
          },
          searchSuggestions: [
            "Where are you going?", "Find your next adventure", "Discover hidden gems",
            "Book unique experiences", "Explore new destinations", "Create lasting memories",
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
            tagCount: { desktop: 9, mobile: 5 }
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
          }
        }
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching hero settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hero settings' },
      { status: 500 }
    );
  }
}