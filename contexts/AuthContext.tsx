'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from '@/i18n/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { firebaseReady, getFirebaseAuth, getGoogleProvider } from '@/lib/firebase/config';

// --- Interfaces ---
interface User {
  id: string;
  _id?: string; // MongoDB ID compatibility
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  picture?: string;
  photoURL?: string;
  role?: string;
  permissions?: string[];
  authProvider?: 'firebase' | 'jwt' | 'google';
  emailVerified?: boolean;
}

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// --- Context Creation ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Custom Hook ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- Auth Provider Component ---
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // --- Sync Firebase user with MongoDB and get user data ---
  const syncUserWithBackend = async (fbUser: FirebaseUser) => {
    try {
      const idToken = await fbUser.getIdToken();

      // Sync with backend to create/update MongoDB user
      const response = await fetch('/api/auth/firebase/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          emailVerified: fbUser.emailVerified,
          providerData: fbUser.providerData,
        }),
      });

      if (response.ok) {
        const { user: mongoUser } = await response.json();
        return { ...mongoUser, photoURL: fbUser.photoURL };
      } else {
        // Get detailed error from response
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to sync user with backend:', {
          status: response.status,
          error: errorData.error || 'Unknown error',
        });
        // Non-critical error - user can still authenticate with Firebase data
        return null;
      }
    } catch (error) {
      console.error('Error syncing user with backend:', error);
      // Non-critical error - user can still authenticate with Firebase data
      return null;
    }
  };

  // --- Firebase auth state listener ---
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    async function setupAuthListener() {
      // Wait for Firebase to initialize
      await firebaseReady;
      const auth = await getFirebaseAuth();
      
      // If Firebase is not configured, skip auth state listener
      if (!auth) {
        console.warn('Firebase auth not configured - authentication disabled');
        setIsLoading(false);
        return;
      }
      
      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          setFirebaseUser(fbUser);

          // Get Firebase ID token
          const idToken = await fbUser.getIdToken();
          setToken(idToken);

          // Sync with backend and get MongoDB user data
          const mongoUser = await syncUserWithBackend(fbUser);

          if (mongoUser) {
            // Normalize user data
            const normalizedUser: User = {
              id: mongoUser.id || mongoUser._id || fbUser.uid,
              _id: mongoUser._id || mongoUser.id || fbUser.uid,
              email: fbUser.email || '',
              name: mongoUser.name || fbUser.displayName || `${mongoUser.firstName} ${mongoUser.lastName}`.trim(),
              firstName: mongoUser.firstName || fbUser.displayName?.split(' ')[0] || '',
              lastName: mongoUser.lastName || fbUser.displayName?.split(' ').slice(1).join(' ') || '',
              picture: fbUser.photoURL || mongoUser.photoURL,
              photoURL: fbUser.photoURL || mongoUser.photoURL,
              role: mongoUser.role || 'customer',
              permissions: mongoUser.permissions || [],
              authProvider: mongoUser.authProvider || 'firebase',
              emailVerified: fbUser.emailVerified,
            };

            setUser(normalizedUser);
          } else {
            // If backend sync fails, create minimal user from Firebase data
            const normalizedUser: User = {
              id: fbUser.uid,
              _id: fbUser.uid,
              email: fbUser.email || '',
              name: fbUser.displayName || '',
              firstName: fbUser.displayName?.split(' ')[0] || '',
              lastName: fbUser.displayName?.split(' ').slice(1).join(' ') || '',
              picture: fbUser.photoURL || undefined,
              photoURL: fbUser.photoURL || undefined,
              emailVerified: fbUser.emailVerified,
            };
            setUser(normalizedUser);
          }
        } else {
          setFirebaseUser(null);
          setUser(null);
          setToken(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        setIsLoading(false);
      }
    });
    }
    
    setupAuthListener();

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // --- Refresh user data ---
  const refreshUser = async () => {
    if (!firebaseUser) return;

    try {
      // Force token refresh
      const idToken = await firebaseUser.getIdToken(true);
      setToken(idToken);

      // Sync with backend
      const mongoUser = await syncUserWithBackend(firebaseUser);
      if (mongoUser) {
        const normalizedUser: User = {
          id: mongoUser.id || mongoUser._id || firebaseUser.uid,
          _id: mongoUser._id || mongoUser.id || firebaseUser.uid,
          email: firebaseUser.email || '',
          name: mongoUser.name || firebaseUser.displayName || `${mongoUser.firstName} ${mongoUser.lastName}`.trim(),
          firstName: mongoUser.firstName || '',
          lastName: mongoUser.lastName || '',
          picture: firebaseUser.photoURL || mongoUser.photoURL,
          photoURL: firebaseUser.photoURL || mongoUser.photoURL,
          role: mongoUser.role || 'customer',
          permissions: mongoUser.permissions || [],
          authProvider: mongoUser.authProvider || 'firebase',
          emailVerified: firebaseUser.emailVerified,
        };
        setUser(normalizedUser);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  // --- Login with Email/Password ---
  const login = async (email: string, password: string): Promise<void> => {
    await firebaseReady;
    const auth = await getFirebaseAuth();
    
    if (!auth) {
      throw new Error('Authentication is not configured. Please contact support.');
    }
    
    setIsLoading(true);
    try {
      const _userCredential = await signInWithEmailAndPassword(auth, email, password);
      // User state will be updated by onAuthStateChanged listener
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Failed to log in. Please check your credentials.';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid credentials. Please check your email and password.';
      }

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Signup with Email/Password ---
  const signup = async (data: SignupData): Promise<void> => {
    await firebaseReady;
    const auth = await getFirebaseAuth();
    
    if (!auth) {
      throw new Error('Authentication is not configured. Please contact support.');
    }
    
    setIsLoading(true);
    try {
      // Create Firebase user - Firebase handles duplicate email detection
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Update Firebase profile with display name
      const displayName = `${data.firstName} ${data.lastName}`.trim();
      await updateProfile(userCredential.user, { displayName });

      // User will be synced with backend by onAuthStateChanged listener
    } catch (error: any) {
      console.error('Signup error:', error);
      let errorMessage = 'Failed to create account. Please try again.';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please log in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password accounts are not enabled.';
      }

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Login with Google ---
  const loginWithGoogle = async (): Promise<void> => {
    await firebaseReady;
    const auth = await getFirebaseAuth();
    const googleProvider = await getGoogleProvider();
    
    if (!auth || !googleProvider) {
      throw new Error('Google authentication is not configured. Please contact support.');
    }
    
    setIsLoading(true);
    try {
      const _userCredential = await signInWithPopup(auth, googleProvider);
      // User state will be updated by onAuthStateChanged listener
    } catch (error: any) {
      console.error('Google login error:', error);
      let errorMessage = 'Failed to sign in with Google.';

      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in popup was closed.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Sign-in was cancelled.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Sign-in popup was blocked. Please allow popups and try again.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with this email using a different sign-in method.';
      }

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Logout Function ---
  const logout = async () => {
    try {
      const auth = await getFirebaseAuth();
      if (auth) {
        await signOut(auth);
      }
      setUser(null);
      setFirebaseUser(null);
      setToken(null);

      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to log out. Please try again.');
    }
  };

  // --- Context Value ---
  const value: AuthContextType = {
    user,
    firebaseUser,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    signup,
    loginWithGoogle,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
