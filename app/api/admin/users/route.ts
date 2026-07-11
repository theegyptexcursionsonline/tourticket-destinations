import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import Booking from '@/lib/models/Booking';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageUsers'] });
  if (auth instanceof NextResponse) {
    return auth;
  }

  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const tenantId =
      searchParams.get('tenantId') ||
      searchParams.get('brandId') ||
      searchParams.get('brand_id');
    if (tenantId && tenantId !== 'all' && !canAccessTenant(auth, tenantId)) {
      return tenantForbiddenResponse();
    }
    if ((!tenantId || tenantId === 'all') && auth.role !== 'super_admin') {
      return tenantForbiddenResponse();
    }

    // Build booking tenant filter
    const bookingTenantFilter: Record<string, unknown> = {};
    if (tenantId && tenantId !== 'all') {
      bookingTenantFilter.tenantId = tenantId;
    } else {
      // "All brands" — exclude default (eeo) bookings
      bookingTenantFilter.tenantId = { $nin: ['default', null, undefined] };
    }

    // Find user IDs that have at least one booking matching the tenant filter
    const userIdsWithBookings = await Booking.distinct('user', bookingTenantFilter);

    // Fetch only users who have bookings in the filtered tenants
    const users = await User.find({ _id: { $in: userIdsWithBookings } })
      .select('name firstName lastName email createdAt firebaseUid')
      .sort({ createdAt: -1 })
      .lean();

    const usersWithBookingCounts = await Promise.all(
      users.map(async (user) => {
        const bookingCount = await Booking.countDocuments({
          $or: [
            { user: user._id },
            { user: user._id.toString() },
          ],
          ...bookingTenantFilter,
        });
        return {
          ...user,
          bookingCount,
        };
      }),
    );

    return NextResponse.json(usersWithBookingCounts);
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch users', error: (error as Error).message },
      { status: 500 },
    );
  }
}
