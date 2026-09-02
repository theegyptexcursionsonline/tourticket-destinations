import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { buildStrictTenantQuery, getTenantFromRequest } from '@/lib/tenant';
import { effectiveOptionPrice, effectiveTourPrice, percentageOff } from '@/lib/pricing/effectivePrice';
import { authoritativeBasePrice } from '@/lib/pricing/authoritativePrice';
import { effectiveSlotGuestPrices } from '@/lib/revenue/guestPrices';

const isValidObjectId = (id: string): boolean => /^[0-9a-fA-F]{24}$/.test(id);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tourId: string }> },
) {
  const { tourId } = await params;
  if (!tourId) {
    return NextResponse.json({ message: 'Tour ID is required' }, { status: 400 });
  }

  try {
    await dbConnect();
    const tenantId = await getTenantFromRequest();
    const identity = isValidObjectId(tourId) ? { _id: tourId } : { slug: tourId };
    const tour: any = await Tour.findOne(
      buildStrictTenantQuery({ ...identity, isPublished: true, archivedAt: null }, tenantId),
    ).lean();

    if (!tour) {
      return NextResponse.json({ message: 'Tour not found' }, { status: 404 });
    }

    const sourceAvailabilitySlots = Array.isArray(tour.availability?.slots)
      ? tour.availability.slots
      : [];
    const availabilitySlots = sourceAvailabilitySlots.map((slot: any, index: number) => ({
      id: `slot-${index + 1}`,
      time: slot.time,
      available: slot.capacity,
    }));

    const tourOptions = Array.isArray(tour.bookingOptions) && tour.bookingOptions.length > 0
      ? tour.bookingOptions.map((option: any, index: number) => {
          const pricing = effectiveOptionPrice(tour, option);
          const universalCapacityByTime = new Map(
            sourceAvailabilitySlots.map((slot: any) => [slot.time, slot.capacity]),
          );
          const optionSlots = Array.isArray(option.timeSlots) && option.timeSlots.length > 0
            ? option.timeSlots.map((slot: any, slotIndex: number) => {
                const slotPricing = effectiveOptionPrice(tour, option, slot);
                return {
                  id: `slot-${slotIndex + 1}`,
                  time: slot.time,
                  available: slot.capacity ?? universalCapacityByTime.get(slot.time) ?? 0,
                  price: slotPricing.price,
                  originalPrice: slotPricing.discountApplied ? slotPricing.originalPrice : undefined,
                  guestPrices: effectiveSlotGuestPrices({
                    adult: slotPricing.price,
                    base: option.guestPrices,
                    slot,
                    discountPercent: tour.discountPercent,
                    applyDiscount: Boolean(option.applyTourDiscount),
                  }),
                  isPopular: false,
                };
              })
            : availabilitySlots.map((slot: any, slotIndex: number) => ({
                ...slot,
                price: pricing.price,
                originalPrice: pricing.discountApplied ? pricing.originalPrice : undefined,
                guestPrices: effectiveSlotGuestPrices({
                  adult: pricing.price,
                  base: option.guestPrices,
                  slot: sourceAvailabilitySlots[slotIndex],
                  discountPercent: tour.discountPercent,
                  applyDiscount: Boolean(option.applyTourDiscount),
                }),
                isPopular: false,
              }));

          return {
            id: option.id || option._id?.toString() || `option-${index}`,
            pricingKey: option.pricingKey || null,
            title: option.label || `${tour.title} - ${option.type}`,
            type: option.type || 'Per Person',
            minCapacity: option.minCapacity ?? undefined,
            maxCapacity: option.maxCapacity ?? undefined,
            price: pricing.price,
            applyTourDiscount: Boolean(option.applyTourDiscount),
            guestPrices: effectiveSlotGuestPrices({
              adult: pricing.price,
              base: option.guestPrices,
              discountPercent: tour.discountPercent,
              applyDiscount: Boolean(option.applyTourDiscount),
            }),
            originalPrice: pricing.discountApplied ? pricing.originalPrice : option.originalPrice,
            duration: option.duration || tour.duration || '3 hours',
            languages: option.languages || tour.languages || ['English'],
            description: option.description || tour.description || 'Complete tour experience',
            timeSlots: optionSlots,
            highlights: option.highlights || tour.highlights?.slice(0, 3) || [],
            groupSize: option.groupSize || `Max ${tour.maxGroupSize || 15} people`,
            difficulty: option.difficulty || tour.difficulty || 'Easy',
            badge: option.badge || (option.isRecommended ? 'Recommended' : undefined),
            discount: pricing.discountApplied
              ? percentageOff(pricing.originalPrice, pricing.price)
              : option.discount,
            isRecommended: option.isRecommended || false,
          };
        })
      : (() => {
          const pricing = effectiveTourPrice(tour);
          return [{
            id: 'standard-default',
            pricingKey: 'standard',
            title: `${tour.title} - Standard Experience`,
            type: 'Per Person',
            price: pricing.price,
            applyTourDiscount: true,
            guestPrices: effectiveSlotGuestPrices({
              adult: pricing.price,
              base: tour.revenueGuestPrices,
              discountPercent: tour.discountPercent,
              applyDiscount: true,
            }),
            originalPrice: pricing.discountApplied ? pricing.originalPrice : undefined,
            duration: tour.duration || '3 hours',
            languages: tour.languages || ['English'],
            description: tour.description || 'Complete tour experience',
            timeSlots: availabilitySlots.map((slot: any, index: number) => {
              const slotPricing = effectiveTourPrice(tour, sourceAvailabilitySlots[index]);
              return {
                ...slot,
                price: authoritativeBasePrice(tour, { selectedBookingOption: null, selectedTime: slot.time }),
                originalPrice: slotPricing.discountApplied ? slotPricing.originalPrice : undefined,
                guestPrices: effectiveSlotGuestPrices({
                  adult: slotPricing.price,
                  base: tour.revenueGuestPrices,
                  slot: sourceAvailabilitySlots[index],
                  discountPercent: tour.discountPercent,
                  applyDiscount: true,
                }),
                isPopular: false,
              };
            }),
            highlights: tour.highlights?.slice(0, 3) || [],
            groupSize: `Max ${tour.maxGroupSize || 15} people`,
            difficulty: tour.difficulty || 'Easy',
            badge: 'Most Popular',
            discount: percentageOff(pricing.originalPrice, pricing.price) || undefined,
            isRecommended: true,
          }];
        })();

    return NextResponse.json(tourOptions);
  } catch (error) {
    console.error('Failed to fetch tour options:', error);
    return NextResponse.json({ message: 'An error occurred while fetching tour options.' }, { status: 500 });
  }
}
