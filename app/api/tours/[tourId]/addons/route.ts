import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';
import { isPerPersonAddOn, resolveAddOnPricingMethod } from '@/lib/checkout/addOnPricing';

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
    const tenantId = await getTenantFromRequest();

    const tour = await Tour.findOne(
      buildStrictTenantQuery({ _id: tourId, isPublished: true }, tenantId),
    ).lean();

    if (!tour) {
      return NextResponse.json({ message: 'Tour not found' }, { status: 404 });
    }

    // Generate fallback add-ons if none exist in database
    const addOns = tour.addOns && tour.addOns.length > 0 
      ? tour.addOns.map((addon: any, index: number) => ({
          id: addon._id || `addon-${index}`,
          title: addon.name || 'Tour Enhancement',
          description: addon.description || 'Enhance your tour experience',
          price: addon.price || 15,
          originalPrice: addon.price ? Math.round(addon.price * 1.3) : 20,
          category: addon.category || 'Experience',
          popular: index === 0,
          savings: addon.price ? Math.round(addon.price * 0.3) : 5,
          perGuest: isPerPersonAddOn(addon),
          pricingMethod: resolveAddOnPricingMethod(addon),
          maxQuantity: 1,
          required: false,
        }))
      : [
          {
            id: 'photo-package-fallback',
            title: 'Professional Photography Package',
            description: 'Capture your adventure with 50+ edited high-resolution photos delivered within 24 hours',
            price: 35.00,
            originalPrice: 50.00,
            category: 'Photography',
            popular: true,
            savings: 15,
            perGuest: false,
            pricingMethod: 'per_unit',
            maxQuantity: 1,
            required: false,
          },
          {
            id: 'transport-premium-fallback',
            title: 'Premium Hotel Transfer Service',
            description: 'Luxury vehicle pickup and drop-off with refreshments and WiFi',
            price: 15.00,
            originalPrice: 25.00,
            category: 'Transport',
            popular: false,
            savings: 10,
            perGuest: false,
            pricingMethod: 'per_unit',
            maxQuantity: 1,
            required: false,
          },
          {
            id: 'refreshment-upgrade-fallback',
            title: 'Gourmet Refreshment Package',
            description: 'Premium snacks, fresh juices, and traditional treats',
            price: 12.00,
            originalPrice: 18.00,
            category: 'Food',
            popular: false,
            savings: 6,
            perGuest: true,
            pricingMethod: 'per_person',
            maxQuantity: 1,
            required: false,
          },
          {
            id: 'guide-upgrade-fallback',
            title: 'Private Guide Enhancement',
            description: 'Upgrade to a dedicated private guide for personalized attention and insider knowledge',
            price: 45.00,
            originalPrice: 60.00,
            category: 'Experience',
            popular: false,
            savings: 15,
            perGuest: false,
            pricingMethod: 'per_unit',
            maxQuantity: 1,
            required: false,
          }
        ];

    return NextResponse.json(addOns);

  } catch (error) {
    console.error('Failed to fetch tour add-ons:', error);
    return NextResponse.json({ message: 'An error occurred while fetching tour add-ons.' }, { status: 500 });
  }
}
