'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from '@/i18n/navigation';
import { useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps): React.ReactNode => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If authentication status is no longer loading and the user is not authenticated,
    // redirect them to the login page.
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // While the authentication status is being checked, display a loading spinner.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
      </div>
    );
  }

  // If the user is authenticated, render the page's content.
  // This check prevents a brief flash of content before the redirect logic runs.
  if (isAuthenticated) {
    return children;
  }

  // If not authenticated and not loading, render nothing while the redirect happens.
  return null;
};

export default ProtectedRoute;
