// Firebase client-side configuration
// This module handles Firebase initialization gracefully

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Check if Firebase API key looks valid (should start with 'AIza' for Firebase)
const isValidApiKey = (key: string | undefined): boolean => {
  if (!key) return false;
  // Firebase API keys typically start with 'AIza' and are ~39 characters
  return key.startsWith('AIza') && key.length >= 30;
};

// Check if Firebase is properly configured (all required fields present AND valid)
export const isFirebaseConfigured = !!(
  isValidApiKey(firebaseConfig.apiKey) &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

// Initialize Firebase (client-side only)
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let analytics: Analytics | null = null;
let googleProvider: GoogleAuthProvider | undefined;

// Only initialize if we're in browser and config is valid
if (typeof window !== 'undefined') {
  if (isFirebaseConfigured) {
    // Wrap in setTimeout to prevent blocking page render
    setTimeout(() => {
      try {
        // Initialize or get existing app
        if (!getApps().length) {
          app = initializeApp(firebaseConfig);
        } else {
          app = getApps()[0];
        }

        // Initialize auth - this can throw if API key is invalid
        try {
          auth = getAuth(app);
          
          // Configure Google Auth Provider
          googleProvider = new GoogleAuthProvider();
          googleProvider.setCustomParameters({
            prompt: 'select_account'
          });

          console.info('✅ Firebase Auth initialized successfully');
        } catch (authError: unknown) {
          const errorMessage = authError instanceof Error ? authError.message : 'Unknown error';
          console.warn('⚠️ Firebase Auth failed:', errorMessage);
          console.info('Authentication features will be disabled.');
          auth = undefined;
          googleProvider = undefined;
        }

        // Initialize analytics only in production
        if (process.env.NODE_ENV === 'production' && app) {
          try {
            analytics = getAnalytics(app);
          } catch (e) {
            // Analytics is optional, don't log errors
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('⚠️ Firebase initialization failed:', errorMessage);
        app = undefined;
        auth = undefined;
        googleProvider = undefined;
      }
    }, 0);
  } else {
    // Log why Firebase isn't configured
    if (!firebaseConfig.apiKey) {
      console.info('Firebase: No API key provided - authentication disabled');
    } else if (!isValidApiKey(firebaseConfig.apiKey)) {
      console.warn('Firebase: Invalid API key format - authentication disabled');
    } else {
      console.info('Firebase: Missing required configuration - authentication disabled');
    }
  }
}

// Async getters for code that needs to ensure Firebase is ready
export async function getFirebaseAuth(): Promise<Auth | undefined> {
  return auth;
}

export async function getGoogleProvider(): Promise<GoogleAuthProvider | undefined> {
  return googleProvider;
}

export async function getFirebaseApp(): Promise<FirebaseApp | undefined> {
  return app;
}

// Export a promise that resolves immediately (Firebase is sync now, but keeping for API compatibility)
export const firebaseReady = Promise.resolve();

export { auth, googleProvider, analytics };
export default app;
