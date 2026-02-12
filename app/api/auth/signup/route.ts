// app/api/auth/signup/route.ts (Updated)
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';
import { EmailService } from '@/lib/email/emailService'; // 🆕 Add this import
import { getDefaultPermissions } from '@/lib/constants/adminPermissions';
import Tenant from '@/lib/models/Tenant';
import { getTenantFromRequest, getTenantEmailBranding } from '@/lib/tenant';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const { firstName, lastName, email, password } = await request.json();

    // Validation (keep existing)
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // Check if user exists (keep existing)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password and create user (keep existing)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    // Prepare user data (keep existing)
    const effectiveRole = (newUser as any).role || 'customer';
    const assignedPermissions =
      (newUser as any).permissions && (newUser as any).permissions.length > 0
        ? (newUser as any).permissions
        : getDefaultPermissions(effectiveRole);

    const userPayload = {
      id: (newUser._id as any).toString(),
      _id: (newUser._id as any).toString(),
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      name: `${newUser.firstName} ${newUser.lastName}`,
      role: effectiveRole,
      permissions: assignedPermissions,
    };

    // Generate JWT (keep existing)
    const token = await signToken({
      sub: (newUser._id as any).toString(),
      email: newUser.email,
      given_name: newUser.firstName,
      family_name: newUser.lastName,
      iat: Math.floor(Date.now() / 1000),
      role: effectiveRole,
      permissions: assignedPermissions,
    });

    // 🆕 Send Welcome Email with real recommended tours
    try {
      // Fetch recommended tours from database
      const Tour = (await import('@/lib/models/Tour')).default;
      const recommendedTours = await Tour.find({})
        .select('title slug images pricing')
        .limit(3)
        .lean();

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      const tourRecommendations = recommendedTours.map((tour: any) => ({
        title: tour.title,
        image: tour.images?.[0]?.url || `${baseUrl}/pyramid.png`,
        price: tour.pricing?.adult ? `From $${tour.pricing.adult}` : 'From $99',
        link: `${baseUrl}/tour/${tour.slug}`
      }));

      // Fallback if no tours found
      if (tourRecommendations.length === 0) {
        tourRecommendations.push({
          title: "Browse All Tours",
          image: `${baseUrl}/pyramid.png`,
          price: "Explore",
          link: `${baseUrl}/tours`
        });
      }

      // Load tenant branding for email
      let tenantBranding;
      try {
        const tenantId = await getTenantFromRequest();
        if (tenantId) {
          const tenantConfig = await Tenant.findOne({ tenantId }).lean();
          tenantBranding = getTenantEmailBranding(tenantConfig as any, baseUrl);
        }
      } catch { /* ignore tenant detection errors */ }

      await EmailService.sendWelcomeEmail({
        customerName: `${firstName} ${lastName}`,
        customerEmail: email,
        dashboardLink: `${baseUrl}/user/dashboard`,
        recommendedTours: tourRecommendations,
        baseUrl,
        tenantBranding,
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail signup if email fails
    }

    // Success response (keep existing)
    return NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: userPayload,
    });

  } catch (error: any) {
    console.error('Signup Error:', error);
    return NextResponse.json(
      { error: 'Could not create account at this time.' },
      { status: 500 }
    );
  }
}