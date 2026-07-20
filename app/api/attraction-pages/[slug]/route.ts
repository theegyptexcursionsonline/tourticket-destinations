import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import Review from '@/lib/models/Review';
import User from '@/lib/models/user';
import { getTenantFromRequest } from '@/lib/tenant';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import {
  ATTRACTION_PAGE_LOCALIZED_FIELDS,
  resolveAttractionPageTours,
  resolveLinkedPageCards,
} from '@/lib/attractionPages/pageContent';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const [{ slug }, tenantId] = await Promise.all([params, getTenantFromRequest()]);
    const locale = request.nextUrl.searchParams.get('locale') || 'en';
    await dbConnect(tenantId);

    const page = await AttractionPage.findOne({
      slug,
      tenantId,
      isPublished: true,
    })
      .populate({
        path: 'categoryId',
        model: Category,
        match: { tenantId },
        select: 'name slug translations',
      })
      .lean();

    if (!page) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }

    const [{ tours, totalTours }, linkedPages] = await Promise.all([
      resolveAttractionPageTours(page, tenantId),
      resolveLinkedPageCards(page, tenantId, locale),
    ]);
    const tourIds = tours.map((tour) => tour._id);
    const [reviews, reviewStats] = tourIds.length > 0
      ? await Promise.all([
          Review.find({ tour: { $in: tourIds } })
            .populate({ path: 'user', model: User, select: 'firstName lastName picture' })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean(),
          Review.aggregate([
            { $match: { tour: { $in: tourIds } } },
            { $group: { _id: '$tour', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
          ]),
        ])
      : [[], []];

    const stats = new Map(
      (reviewStats as Array<{ _id: unknown; count: number; avgRating: number }>).map((item) => [
        String(item._id),
        { count: item.count, avgRating: Math.round(item.avgRating * 10) / 10 },
      ]),
    );
    const toursWithReviews = tours.map((tour) => ({
      ...tour,
      reviewCount: stats.get(String(tour._id))?.count || 0,
      rating: stats.get(String(tour._id))?.avgRating || tour.rating || 4.5,
    }));
    const localized = localizeEntityFields(
      JSON.parse(JSON.stringify(page)) as Record<string, unknown>,
      locale,
      ATTRACTION_PAGE_LOCALIZED_FIELDS,
    );

    return NextResponse.json({
      success: true,
      data: {
        ...localized,
        tours: JSON.parse(JSON.stringify(toursWithReviews)),
        totalTours,
        linkedPages,
        reviews: JSON.parse(JSON.stringify(reviews)).map((review: Record<string, any>) => ({
          ...review,
          userName: review.user
            ? `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim()
            : review.userName || 'Anonymous',
          userAvatar: review.user?.picture || null,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching attraction page:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch page data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
