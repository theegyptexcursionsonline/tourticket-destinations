// Firebase Admin SDK for server-side operations
import * as admin from 'firebase-admin';

let initializationPromise: Promise<void> | null = null;

/**
 * Generate signed Cloudinary URL for authenticated resources
 * @param publicId - Cloudinary public ID (e.g., "config/firebase-service-account")
 * @param cloudName - Cloudinary cloud name
 * @param apiSecret - Cloudinary API secret
 * @returns Signed URL that expires in 1 hour
 */
function generateSignedCloudinaryUrl(publicId: string, cloudName: string, apiSecret: string): string {
  const crypto = require('crypto');

  // Expiration timestamp (1 hour from now)
  const timestamp = Math.floor(Date.now() / 1000) + 3600;

  // String to sign: public_id + timestamp
  const stringToSign = `${publicId}&timestamp=${timestamp}${apiSecret}`;

  // Generate SHA-1 signature
  const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

  // Construct authenticated URL
  return `https://res.cloudinary.com/${cloudName}/raw/authenticated/s--${signature}--/v1/${publicId}.json?timestamp=${timestamp}`;
}

/**
 * Initialize Firebase Admin SDK with multiple strategies
 * This function is called lazily on first use to avoid build-time issues
 */
async function ensureInitialized() {
  // If already initialized, return immediately
  if (admin.apps.length > 0) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    let initialized = false;

    // Strategy 0: Try JSON string from environment variable (FIREBASE_SERVICE_ACCOUNT_KEY)
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey && !initialized) {
      try {
        const serviceAccountJSON = JSON.parse(serviceAccountKey);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountJSON),
        });
        console.log('✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_KEY');
        initialized = true;
      } catch (error) {
        console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT_KEY JSON:', error);
      }
    }

    // Strategy 1: Try base64-encoded JSON from environment variable (RECOMMENDED)
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (serviceAccountBase64 && !initialized) {
      try {
        const serviceAccountJSON = JSON.parse(
          Buffer.from(serviceAccountBase64, 'base64').toString('utf8')
        );
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountJSON),
        });
        console.log('✅ Firebase Admin initialized from base64 env variable');
        initialized = true;
      } catch (error) {
        console.error('❌ Error decoding base64 service account:', error);
      }
    }

    // Strategy 2: Fetch from Cloudinary (private authenticated resource)
    if (!initialized) {
      const cloudinaryPublicId = process.env.FIREBASE_CLOUDINARY_PUBLIC_ID;
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (cloudinaryPublicId && cloudName && apiSecret) {
        try {
          console.log('🔄 Fetching Firebase service account from Cloudinary (private)...');

          // Generate signed URL (expires in 1 hour)
          const signedUrl = generateSignedCloudinaryUrl(cloudinaryPublicId, cloudName, apiSecret);

          const response = await fetch(signedUrl);

          if (!response.ok) {
            throw new Error(`Failed to fetch service account: ${response.status} ${response.statusText}`);
          }

          const serviceAccountJSON = await response.json();

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccountJSON),
          });
          console.log('✅ Firebase Admin initialized from Cloudinary (private resource)');
          initialized = true;
        } catch (error) {
          console.error('❌ Error fetching Cloudinary service account:', error);
        }
      }
    }

    // Strategy 3: Fetch from public remote URL (DEPRECATED - less secure)
    if (!initialized) {
      const remoteJsonUrl = process.env.FIREBASE_SERVICE_ACCOUNT_URL;

      if (remoteJsonUrl) {
        try {
          console.log('⚠️  Using public URL (deprecated - consider using private Cloudinary resource)');
          console.log('🔄 Fetching Firebase service account from remote URL...');

          const response = await fetch(remoteJsonUrl, {
            headers: {
              'Cache-Control': 'max-age=3600', // Cache for 1 hour
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch service account: ${response.status} ${response.statusText}`);
          }

          const serviceAccountJSON = await response.json();

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccountJSON),
          });
          console.log('✅ Firebase Admin initialized from remote URL');
          initialized = true;
        } catch (error) {
          console.error('❌ Error fetching remote service account:', error);
        }
      }
    }

    // Strategy 4: Try individual environment variables (fallback)
    if (!initialized) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && privateKey) {
        try {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
          });
          console.log('✅ Firebase Admin initialized with individual credentials');
          initialized = true;
        } catch (error) {
          console.error('❌ Error initializing Firebase Admin with individual credentials:', error);
        }
      }
    }

    // Strategy 5: Try loading from file (for local development)
    if (!initialized) {
      try {
        const path = await import('path');
        const fs = await import('fs');
        const serviceAccountPath = path.join(process.cwd(), '.firebase', 'service-account.json');

        if (fs.existsSync(serviceAccountPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          console.log('✅ Firebase Admin initialized from service account file');
          initialized = true;
        }
      } catch (error) {
        console.error('❌ Error loading Firebase service account from file:', error);
      }
    }

    if (!initialized) {
      throw new Error(
        'Firebase Admin SDK credentials not found. ' +
        'Set one of the following:\n' +
        '1. FIREBASE_SERVICE_ACCOUNT_KEY (JSON string - recommended)\n' +
        '2. FIREBASE_SERVICE_ACCOUNT_BASE64 (base64-encoded JSON)\n' +
        '3. FIREBASE_CLOUDINARY_PUBLIC_ID + CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_SECRET (private Cloudinary)\n' +
        '4. FIREBASE_SERVICE_ACCOUNT_URL (public URL - deprecated)\n' +
        '5. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (individual credentials)\n' +
        '6. .firebase/service-account.json (local file for development)'
      );
    }
  })();

  return initializationPromise;
}

// Helper to get adminAuth with lazy initialization
async function getAdminAuth() {
  await ensureInitialized();
  return admin.auth();
}

// Helper to get adminDb with lazy initialization
async function _getAdminDb() {
  await ensureInitialized();
  return admin.firestore();
}

/**
 * Verify Firebase ID token from client
 * @param idToken - Firebase ID token from client
 * @returns Decoded token with user info
 */
export async function verifyFirebaseToken(idToken: string) {
  try {
    const auth = await getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      decodedToken,
    };
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}

/**
 * Get Firebase user by UID
 * @param uid - Firebase user ID
 */
export async function getFirebaseUser(uid: string) {
  try {
    const auth = await getAdminAuth();
    const user = await auth.getUser(uid);
    return { success: true, user };
  } catch (error) {
    console.error('Error getting Firebase user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'User not found',
    };
  }
}

/**
 * Create or update Firebase user
 * @param uid - Firebase user ID
 * @param data - User data to update
 */
export async function updateFirebaseUser(uid: string, data: {
  email?: string;
  displayName?: string;
  photoURL?: string;
  disabled?: boolean;
}) {
  try {
    const auth = await getAdminAuth();
    const user = await auth.updateUser(uid, data);
    return { success: true, user };
  } catch (error) {
    console.error('Error updating Firebase user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed',
    };
  }
}

/**
 * Delete Firebase user
 * @param uid - Firebase user ID
 */
export async function deleteFirebaseUser(uid: string) {
  try {
    const auth = await getAdminAuth();
    await auth.deleteUser(uid);
    return { success: true };
  } catch (error) {
    console.error('Error deleting Firebase user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

// Export admin instance (apps will be empty until first function call)
export default admin;

// Note: adminAuth and adminDb are not exported to avoid top-level await
// Use verifyFirebaseToken(), getFirebaseUser(), etc. functions instead
