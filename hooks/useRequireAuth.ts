'use client';
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function useRequireAuth() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Wait for the auth context to finish loading
    if (!isLoading) {
      setHasInitialized(true);
      
      // Only redirect if we're certain the user is not authenticated
      // and the auth context has finished initializing
      if (!isAuthenticated && !user) {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  return { 
    user, 
    isLoading: isLoading || !hasInitialized, // Keep loading until auth is fully initialized
    isAuthenticated: isAuthenticated && !!user 
  };
}