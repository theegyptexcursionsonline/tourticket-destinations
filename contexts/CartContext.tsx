// contexts/CartContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { CartItem } from '@/types';
import { useAuth } from './AuthContext';

interface CartContextType {
    cart: CartItem[];
    addToCart: (item: CartItem, openCartSidebar?: boolean) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
    totalItems: number;
    isLoading: boolean;
}

// Create and EXPORT the context
export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSyncedFromServer, setHasSyncedFromServer] = useState(false);

    const { token, isAuthenticated } = useAuth();

    // Load cart from localStorage (for guests or initial load)
    useEffect(() => {
        if (!isAuthenticated) {
            try {
                const storedCart = localStorage.getItem('cart');
                if (storedCart) {
                    setCart(JSON.parse(storedCart));
                }
            } catch (error) {
                console.error("Failed to parse cart from localStorage", error);
                localStorage.removeItem('cart');
            }
            setHasSyncedFromServer(false);
        }
    }, [isAuthenticated]);

    // Sync cart from server when user logs in
    useEffect(() => {
        const syncFromServer = async () => {
            if (!isAuthenticated || !token || hasSyncedFromServer) return;

            setIsLoading(true);
            try {
                const response = await fetch('/api/user/cart', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.cart) {
                        // Get local cart
                        const localCart = JSON.parse(localStorage.getItem('cart') || '[]');

                        // Transform server cart to CartItem format
                        const serverCart = data.cart.map((item: any) => ({
                            ...item,
                            id: item.tourId?.toString() || item.tourId,
                            _id: item.tourId?.toString() || item.tourId,
                            slug: item.tourSlug,
                            title: item.tourTitle,
                            image: item.tourImage,
                            images: item.tourImage ? [{ url: item.tourImage }] : [],
                            pricing: { adult: item.adultPrice, child: item.childPrice },
                        }));

                        const serverIds = new Set(serverCart.map((c: CartItem) => c.uniqueId));

                        // Merge: server + local items not on server
                        const mergedCart = [...serverCart];
                        for (const item of localCart) {
                            if (!serverIds.has(item.uniqueId)) {
                                mergedCart.push(item);
                            }
                        }

                        setCart(mergedCart);

                        // If there were local items not on server, sync them
                        if (localCart.some((item: CartItem) => !serverIds.has(item.uniqueId))) {
                            await syncToServer(mergedCart);
                        }

                        // Clear local storage since we're now using server
                        localStorage.removeItem('cart');
                    }
                }
            } catch (error) {
                console.error('Failed to sync cart from server:', error);
            } finally {
                setIsLoading(false);
                setHasSyncedFromServer(true);
            }
        };

        syncFromServer();
    }, [isAuthenticated, token, hasSyncedFromServer]);

    // Sync to server helper
    const syncToServer = useCallback(async (items: CartItem[]) => {
        if (!isAuthenticated || !token) return;

        try {
            // Transform CartItem to server format
            const serverCart = items.map(item => ({
                id: item._id || item.id,
                tourId: item._id || item.id,
                tourSlug: item.slug,
                tourTitle: item.title,
                tourImage: (item.images?.[0] as any)?.url,
                selectedDate: item.selectedDate,
                selectedTime: item.selectedTime,
                quantity: item.quantity,
                childQuantity: item.childQuantity,
                adultPrice: (item as any).pricing?.adult || 0,
                childPrice: (item as any).pricing?.child || 0,
                selectedAddOns: item.selectedAddOnDetails ?
                    Object.values(item.selectedAddOnDetails).map(addon => ({
                        id: addon.id,
                        name: addon.title,
                        price: addon.price,
                        quantity: item.selectedAddOns?.[addon.id] || 1,
                    })) : [],
                uniqueId: item.uniqueId,
            }));

            await fetch('/api/user/cart', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ cart: serverCart }),
            });
        } catch (error) {
            console.error('Failed to sync cart to server:', error);
        }
    }, [isAuthenticated, token]);

    // Save to localStorage (for guests) whenever cart changes
    useEffect(() => {
        if (!isAuthenticated) {
            try {
                localStorage.setItem('cart', JSON.stringify(cart));
            } catch (error) {
                console.error("Failed to save cart to localStorage", error);
            }
        }
    }, [cart, isAuthenticated]);

    const addToCart = useCallback(async (item: CartItem, openCartSidebar = true) => {
        const uniqueId = item.uniqueId || `${item.id}-${item.selectedDate}-${item.selectedTime}-${JSON.stringify(item.selectedAddOns)}`;

        setCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.uniqueId === uniqueId);

            if (existingItem) {
                return prevCart.map(cartItem =>
                    cartItem.uniqueId === uniqueId
                        ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
                        : cartItem
                );
            }
            return [...prevCart, { ...item, uniqueId }];
        });

        if (openCartSidebar) {
            openCart();
        }

        // Sync to server if authenticated
        if (isAuthenticated && token) {
            try {
                await fetch('/api/user/cart', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        id: item._id || item.id,
                        tourId: item._id || item.id,
                        tourSlug: item.slug,
                        tourTitle: item.title,
                        tourImage: (item.images?.[0] as any)?.url,
                        selectedDate: item.selectedDate,
                        selectedTime: item.selectedTime,
                        quantity: item.quantity,
                        childQuantity: item.childQuantity,
                        adultPrice: (item as any).pricing?.adult || 0,
                        childPrice: (item as any).pricing?.child || 0,
                        selectedAddOns: item.selectedAddOnDetails ?
                            Object.values(item.selectedAddOnDetails).map(addon => ({
                                id: addon.id,
                                name: addon.title,
                                price: addon.price,
                                quantity: item.selectedAddOns?.[addon.id] || 1,
                            })) : [],
                        uniqueId,
                    }),
                });
            } catch (error) {
                console.error('Failed to add to cart on server:', error);
            }
        }
    }, [isAuthenticated, token]);

    const removeFromCart = useCallback(async (uniqueId: string) => {
        setCart(prevCart => prevCart.filter(item => item.uniqueId !== uniqueId));

        // Sync to server if authenticated
        if (isAuthenticated && token) {
            try {
                await fetch(`/api/user/cart?uniqueId=${encodeURIComponent(uniqueId)}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
            } catch (error) {
                console.error('Failed to remove from cart on server:', error);
            }
        }
    }, [isAuthenticated, token]);

    const clearCart = useCallback(async () => {
        setCart([]);
        localStorage.removeItem('cart');

        // Sync to server if authenticated
        if (isAuthenticated && token) {
            try {
                await fetch('/api/user/cart?clearAll=true', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
            } catch (error) {
                console.error('Failed to clear cart on server:', error);
            }
        }
    }, [isAuthenticated, token]);

    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);

    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0) + (item.childQuantity || 0), 0);

    return (
        <CartContext.Provider value={{
            cart,
            totalItems,
            addToCart,
            removeFromCart,
            clearCart,
            isCartOpen,
            openCart,
            closeCart,
            isLoading,
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
