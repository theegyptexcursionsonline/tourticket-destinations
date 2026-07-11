import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';
import { getDefaultPermissions } from '@/lib/constants/adminPermissions';
import { failedAdminLoginUpdate, loginRetryAfterSeconds } from '@/lib/security/adminLoginProtection';

const invalidCredentials = () => NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const { email, password } = await request.json();

    // --- Basic Validation ---
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // --- Find User in Local DB ---
    // Explicitly select the password field as it's excluded by default in the schema
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail })
      .select('+password +failedLoginAttempts +loginLockedUntil');

    if (!user || !user.password) {
      await bcrypt.compare(password, '$2b$10$C6UzMDM.H6dfI/f/IKcEe.3u5W4WcXHfsvhQ4FZ9DqI7I7M.JxH1K');
      return invalidCredentials();
    }

    const now = new Date();
    if (user.loginLockedUntil && user.loginLockedUntil > now) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(loginRetryAfterSeconds(user.loginLockedUntil)) } },
      );
    }
    if (!user.isActive) {
      return NextResponse.json({ error: 'This account has been deactivated.' }, { status: 403 });
    }

    // --- Compare Passwords ---
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const updated = await User.findOneAndUpdate(
        { _id: user._id },
        { $inc: { failedLoginAttempts: 1 } },
        { new: true, select: '+failedLoginAttempts' },
      );
      const attempts = updated?.failedLoginAttempts ?? (user.failedLoginAttempts || 0) + 1;
      const protection = failedAdminLoginUpdate(attempts - 1);
      if (protection.loginLockedUntil) {
        await User.updateOne({ _id: user._id }, { $set: { loginLockedUntil: protection.loginLockedUntil } });
      }
      return invalidCredentials();
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: 0, lastLoginAt: now }, $unset: { loginLockedUntil: 1 } },
    );
    
    // --- Prepare User Data for Token and Response ---
    const effectiveRole = (user as any).role || 'customer';
    const assignedPermissions =
      (user as any).permissions && (user as any).permissions.length > 0
        ? (user as any).permissions
        : getDefaultPermissions(effectiveRole);

    const userPayload = {
      id: (user._id as any).toString(),
      _id: (user._id as any).toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: effectiveRole,
      permissions: assignedPermissions,
    };

    // --- Generate JWT ---
    const token = await signToken({
      sub: (user._id as any).toString(), // Convert ObjectId to string
      email: user.email,
      given_name: user.firstName,
      family_name: user.lastName,
      iat: Math.floor(Date.now() / 1000),
      role: effectiveRole,
      permissions: assignedPermissions,
    });

    // --- Success Response ---
    return NextResponse.json({
      success: true,
      message: 'Login successful!',
      token,
      user: userPayload,
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login.' },
      { status: 500 }
    );
  }
}
