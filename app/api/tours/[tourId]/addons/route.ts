import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';
import { isPerPersonAddOn, resolveAddOnPricingMethod } from '@/lib/checkout/addOnPricing';
import { normalizedBookingOptionKeys } from '@/lib/bookings/addOnAvailability';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const { tourId } = await params;

  if (!tourId) {
    return NextResponse.json({ message: 'Tour ID is required' }, { status: 400 });
  }

  try {
    const tenantId = await getTenantFromRequest();
    await dbConnect(tenantId);

    const tour = await Tour.findOne(
      buildStrictTenantQuery({ _id: tourId, isPublished: true, archivedAt: null }, tenantId),
    ).lean();

    if (!tour) {
      return NextResponse.json({ message: 'Tour not found' }, { status: 404 });
    }

    // This endpoint is a read projection, not a product generator. Empty means
    // the operator authored no add-ons; inventing products or discounts here
    // makes checkout advertise terms that do not exist in the Tour record.
    const addOns = Array.isArray(tour.addOns)
      ? tour.addOns
          .filter((addon: any) => (
            typeof addon?.name === 'string' &&
            addon.name.trim().length > 0 &&
            typeof addon.price === 'number' &&
            Number.isFinite(addon.price) &&
            addon.price >= 0
          ))
          .map((addon: any, index: number) => ({
            id: String(addon._id || `addon-${index}`),
            title: addon.name.trim(),
            ...(typeof addon.description === 'string' && addon.description.trim()
              ? { description: addon.description.trim() }
              : {}),
            price: addon.price,
            ...(typeof addon.category === 'string' && addon.category.trim()
              ? { category: addon.category.trim() }
              : {}),
            perGuest: isPerPersonAddOn(addon),
            pricingMethod: resolveAddOnPricingMethod(addon),
            groupKey: typeof addon.groupKey === 'string' ? addon.groupKey : '',
            groupTitle: typeof addon.groupTitle === 'string' ? addon.groupTitle : '',
            bookingOptionKeys: normalizedBookingOptionKeys(addon),
          }))
      : [];

    return NextResponse.json(addOns);

  } catch (error) {
    console.error('Failed to fetch tour add-ons:', error);
    return NextResponse.json({ message: 'An error occurred while fetching tour add-ons.' }, { status: 500 });
  }
}
