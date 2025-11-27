import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { syncFirebaseUserToMongo } from '@/lib/firebase/authHelpers';

/**
 * POST /api/auth/firebase/sync
 * Sync Firebase user with MongoDB
 * Creates or updates MongoDB user record based on Firebase authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Extract Firebase ID token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7);

    // Verify Firebase token
    let verifyResult;
    try {
      verifyResult = await verifyFirebaseToken(idToken);
    } catch (verifyError: any) {
      console.error('Firebase token verification error:', verifyError);
      return NextResponse.json(
        { success: false, error: `Token verification failed: ${verifyError.message || 'Unknown error'}` },
        { status: 401 }
      );
    }

    if (!verifyResult.success || !verifyResult.uid) {
      return NextResponse.json(
        { success: false, error: verifyResult.error || 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get Firebase user data from request body
    const body = await request.json();
    const { uid, email, displayName, photoURL, emailVerified, providerData } = body;

    // Validate Firebase UID matches token
    if (uid !== verifyResult.uid) {
      return NextResponse.json(
        { success: false, error: 'UID mismatch' },
        { status: 400 }
      );
    }

    // Sync user with MongoDB
    let result;
    try {
      result = await syncFirebaseUserToMongo({
        uid,
        email,
        displayName,
        photoURL,
        emailVerified,
        providerData,
      });
    } catch (syncError: any) {
      console.error('MongoDB sync error:', syncError);
      return NextResponse.json(
        { success: false, error: `Database sync failed: ${syncError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to sync user with database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      isNewUser: result.isNewUser,
    });
  } catch (error: any) {
    console.error('Firebase sync error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
