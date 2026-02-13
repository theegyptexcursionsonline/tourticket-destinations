// Firebase Authentication helper utilities
import { verifyFirebaseToken } from './admin';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { NextRequest } from 'next/server';

/**
 * Extract Firebase ID token from request headers
 * Supports both Authorization: Bearer and custom X-Firebase-Token header
 */
export function extractFirebaseToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  const firebaseHeader = request.headers.get('x-firebase-token');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  if (firebaseHeader) {
    return firebaseHeader;
  }

  return null;
}

/**
 * Verify Firebase token and get MongoDB user
 * This is the main authentication middleware for user routes
 */
export async function authenticateFirebaseUser(request: NextRequest) {
  const token = extractFirebaseToken(request);

  if (!token) {
    return {
      success: false,
      error: 'No authentication token provided',
      statusCode: 401,
    };
  }

  // Verify Firebase token
  const verifyResult = await verifyFirebaseToken(token);

  if (!verifyResult.success || !verifyResult.uid) {
    return {
      success: false,
      error: 'Invalid or expired token',
      statusCode: 401,
    };
  }

  // Connect to database
  await dbConnect();

  // Find user by Firebase UID
  const user = await User.findOne({
    firebaseUid: verifyResult.uid,
    isActive: true,
  });

  if (!user) {
    return {
      success: false,
      error: 'User not found or inactive',
      statusCode: 404,
    };
  }

  return {
    success: true,
    user,
    firebaseUid: verifyResult.uid,
    email: verifyResult.email,
    emailVerified: verifyResult.emailVerified,
  };
}

/**
 * Sync Firebase user with MongoDB
 * Creates or updates MongoDB user record based on Firebase auth data
 */
export async function syncFirebaseUserToMongo(firebaseUser: {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified: boolean;
  providerData?: any[];
}) {
  await dbConnect();

  // Determine auth provider from Firebase
  let authProvider: 'firebase' | 'google' = 'firebase';
  if (firebaseUser.providerData && firebaseUser.providerData.length > 0) {
    const provider = firebaseUser.providerData[0]?.providerId;
    if (provider === 'google.com') {
      authProvider = 'google';
    }
  }

  // Split display name into first and last name
  let firstName = 'User';
  let lastName = '';
  if (firebaseUser.displayName) {
    const nameParts = firebaseUser.displayName.split(' ');
    firstName = nameParts[0] || 'User';
    lastName = nameParts.slice(1).join(' ') || '';
  }

  // Check if user already exists by Firebase UID
  let user = await User.findOne({ firebaseUid: firebaseUser.uid });
  let isNewUser = false;

  if (user) {
    // Update existing user (same Firebase account)
    user.email = firebaseUser.email || user.email;
    user.emailVerified = firebaseUser.emailVerified;
    user.photoURL = firebaseUser.photoURL || user.photoURL;
    user.authProvider = authProvider;
    user.lastLoginAt = new Date();
    await user.save();
  } else {
    // Check if user exists by email (migration case or different auth method)
    user = await User.findOne({ email: firebaseUser.email });

    if (user) {
      // Link existing user to Firebase (user had account via different method)
      user.firebaseUid = firebaseUser.uid;
      user.authProvider = authProvider;
      user.emailVerified = firebaseUser.emailVerified;
      user.photoURL = firebaseUser.photoURL || user.photoURL;
      user.lastLoginAt = new Date();
      await user.save();
      // Not marking as new user since they already had an account
    } else {
      // Create new user
      user = await User.create({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        firstName,
        lastName,
        authProvider,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        role: 'customer', // Default role for new users
        permissions: [],
        isActive: true,
        lastLoginAt: new Date(),
      });
      isNewUser = true;
    }
  }

  return {
    success: true,
    isNewUser,
    user: {
      id: (user._id as any).toString(),
      _id: (user._id as any).toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
      permissions: user.permissions,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      authProvider: user.authProvider,
    },
  };
}

/**
 * Check if a user exists by email
 */
export async function checkUserExists(email: string) {
  await dbConnect();
  const user = await User.findOne({ email });
  return !!user;
}

/**
 * Get user by Firebase UID
 */
export async function getUserByFirebaseUid(uid: string) {
  await dbConnect();
  const user = await User.findOne({ firebaseUid: uid, isActive: true });
  return user;
}

/**
 * Format user object for client response
 * Removes sensitive fields and formats for consistency
 */
export function formatUserForClient(user: any) {
  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`.trim(),
    role: user.role,
    permissions: user.permissions || [],
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    authProvider: user.authProvider,
    createdAt: user.createdAt,
  };
}
