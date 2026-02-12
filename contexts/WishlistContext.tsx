'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Tour } from '@/types';
import { useAuth } from './AuthContext';

// Define the shape of the context
interface WishlistContextType {
  wishlist: Tour[];
  addToWishlist: (tour: Tour) => void;
  removeFromWishlist: (tourId: string) => void;
  isWishlisted: (tourId: string) => boolean;
  isWishlistSidebarOpen: boolean;
  openWishlistSidebar: () => void;
  closeWishlistSidebar: () => void;
  isLoading: boolean;
}

// Create the context with a default value
const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

// Create the provider component
export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [wishlist, setWishlist] = useState<Tour[]>([]);
  const [isWishlistSidebarOpen, setIsWishlistSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSyncedFromServer, setHasSyncedFromServer] = useState(false);

  const { user: _user, token, isAuthenticated } = useAuth();

  // Load wishlist from localStorage (for guests or initial load)
  useEffect(() => {
    if (!isAuthenticated) {
      try {
        const storedWishlist = localStorage.getItem('wishlist');
        if (storedWishlist) {
          setWishlist(JSON.parse(storedWishlist));
        }
      } catch (error) {
        console.error("Failed to parse wishlist from localStorage", error);
      }
      setHasSyncedFromServer(false);
    }
  }, [isAuthenticated]);

  // Sync wishlist from server when user logs in
  useEffect(() => {
    const syncFromServer = async () => {
      if (!isAuthenticated || !token || hasSyncedFromServer) return;

      setIsLoading(true);
      try {
        const response = await fetch('/api/user/wishlist', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.wishlist) {
            // Merge server wishlist with local wishlist
            const localWishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
            const serverIds = new Set(data.wishlist.map((t: Tour) => t._id));
            const _localIds = new Set(localWishlist.map((t: Tour) => t._id));

            // Combine both, preferring server data for duplicates
            const mergedWishlist = [...data.wishlist];
            for (const item of localWishlist) {
              if (!serverIds.has(item._id)) {
                mergedWishlist.push(item);
              }
            }

            setWishlist(mergedWishlist);

            // If there were local items not on server, sync them
            if (localWishlist.some((item: Tour) => !serverIds.has(item._id))) {
              await syncToServer(mergedWishlist);
            }

            // Clear local storage since we're now using server
            localStorage.removeItem('wishlist');
          }
        }
      } catch (error) {
        console.error('Failed to sync wishlist from server:', error);
      } finally {
        setIsLoading(false);
        setHasSyncedFromServer(true);
      }
    };

    syncFromServer();
  }, [isAuthenticated, token, hasSyncedFromServer]);

  // Sync to server helper
  const syncToServer = useCallback(async (items: Tour[]) => {
    if (!isAuthenticated || !token) return;

    try {
      await fetch('/api/user/wishlist', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ wishlist: items }),
      });
    } catch (error) {
      console.error('Failed to sync wishlist to server:', error);
    }
  }, [isAuthenticated, token]);

  // Save to localStorage (for guests) whenever wishlist changes
  useEffect(() => {
    if (!isAuthenticated && wishlist.length >= 0) {
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, isAuthenticated]);

  const addToWishlist = useCallback(async (tour: Tour) => {
    // Avoid adding duplicates
    if (wishlist.some(item => item._id === tour._id)) {
      return;
    }

    const newWishlist = [...wishlist, tour];
    setWishlist(newWishlist);

    if (isAuthenticated && token) {
      // Sync to server
      try {
        await fetch('/api/user/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ tourId: tour._id }),
        });
      } catch (error) {
        console.error('Failed to add to wishlist on server:', error);
      }
    }
  }, [wishlist, isAuthenticated, token]);

  const removeFromWishlist = useCallback(async (tourId: string) => {
    setWishlist(prev => prev.filter((item) => item._id !== tourId));

    if (isAuthenticated && token) {
      // Sync to server
      try {
        await fetch(`/api/user/wishlist?tourId=${tourId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Failed to remove from wishlist on server:', error);
      }
    }
  }, [isAuthenticated, token]);

  const isWishlisted = useCallback((tourId: string) => {
    return wishlist.some((item) => item._id === tourId);
  }, [wishlist]);

  const openWishlistSidebar = () => setIsWishlistSidebarOpen(true);
  const closeWishlistSidebar = () => setIsWishlistSidebarOpen(false);

  return (
    <WishlistContext.Provider value={{
        wishlist,
        addToWishlist,
        removeFromWishlist,
        isWishlisted,
        isWishlistSidebarOpen,
        openWishlistSidebar,
        closeWishlistSidebar,
        isLoading,
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
