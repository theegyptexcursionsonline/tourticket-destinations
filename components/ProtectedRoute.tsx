'use client';
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from '@/i18n/navigation';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // Wait for auth context to finish loading
    if (!isLoading) {
      setHasCheckedAuth(true);
      
      // Only redirect if we're sure the user is not authenticated
      if (!isAuthenticated && !user) {
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading while auth context is initializing or during redirect
  if (isLoading || !hasCheckedAuth) {
    return (
      fallback || (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Only render children if authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return <>{children}</>;
}