// components/CartSidebar.tsx
'use client';

import React, { FC } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Trash2, Calendar, Clock, Users, Plus } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useSettings } from '@/hooks/useSettings';
import Image from 'next/image';
import { parseLocalDate } from '@/utils/date';

const CartSidebar: FC = () => {
    const router = useRouter();
    const { isCartOpen, closeCart, cart, totalItems, removeFromCart } = useCart();
    const { formatPrice } = useSettings();

  // Calculate individual item total including add-ons
    const getItemTotal = (item: any) => {
        // Use selected booking option price if available, otherwise fall back to item price
        const basePrice = item.selectedBookingOption?.price || item.discountPrice || 0;
        
        const adultPrice = basePrice * (item.quantity || 1);
        const childPrice = (basePrice / 2) * (item.childQuantity || 0);
        let tourTotal = adultPrice + childPrice;

        let addOnsTotal = 0;
        if (item.selectedAddOns && item.selectedAddOnDetails) {
            Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]: [string, any]) => {
                const addOnDetail = item.selectedAddOnDetails?.[addOnId];
                if (addOnDetail && quantity > 0) {
                    const totalGuests = item.quantity + item.childQuantity;
                    const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
                    addOnsTotal += addOnDetail.price * addOnQuantity;
                }
            });
        }

        return tourTotal + addOnsTotal;
    };

    // Calculate total price including add-ons and booking options
    const cartTotal = cart.reduce((acc, item) => {
        return acc + getItemTotal(item);
    }, 0);

    const handleCheckout = () => {
        closeCart();
        // Create a descriptive tour name from cart items
        const tourCount = cart.length;
        const tourName = tourCount === 1 
            ? cart[0].title 
            : `${tourCount} Amazing Experiences`;
        const encodedTourName = encodeURIComponent(tourName);
        router.push(`/redirecting?to=/checkout&tour=${encodedTourName}`);
    };

    const handleStartExploring = () => {
        closeCart();
        router.push('/');
    };

    const formatDate = (dateString: string) => {
        const date = parseLocalDate(dateString);
        if (!date) return 'Date not set';
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };
    
    return (
        <AnimatePresence>
            {isCartOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex justify-end"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        className="absolute inset-0 bg-black/60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeCart}
                    />
                    <motion.div
                        className="relative bg-slate-50 h-full w-full max-w-md shadow-2xl flex flex-col"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b bg-white">
                            <h2 className="text-xl font-bold text-slate-800">
                                Your Cart ({totalItems})
                            </h2>
                            <button
                                onClick={closeCart}
                                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                                aria-label="Close cart"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cart Items or Empty State */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center h-full text-slate-400">
                                    <ShoppingCart size={64} className="stroke-1 mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-600">Your cart is empty</h3>
                                    <p className="mt-1 text-sm">Find a tour to start your next adventure!</p>
                                    <button
                                        onClick={handleStartExploring}
                                        className="mt-6 bg-red-600 text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105"
                                    >
                                        Start Exploring
                                    </button>
                                </div>
                            ) : (
                                <ul className="space-y-4">
                                    <AnimatePresence>
                                        {cart.map((item) => (
                                            <motion.li
                                                key={item.uniqueId}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                                                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                                            >
                                                {/* Main Item Info */}
                                                <div className="flex items-start gap-3 p-4">
                                                    <Image
                                                        src={item.image || '/bg.png'}
                                                        alt={item.title}
                                                        width={80}
                                                        height={80}
                                                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-slate-800 leading-tight line-clamp-2 mb-2">
                                                            {item.title}
                                                        </h3>
                                                        
                                                        {/* Booking Details */}
                                                        <div className="space-y-1 mb-3">
                                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                <Calendar size={12} />
                                                                <span>{formatDate(item.selectedDate)}</span>
                                                                <Clock size={12} className="ml-2" />
                                                                <span>{item.selectedTime}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                <Users size={12} />
                                                                <span>
                                                                    {item.quantity} Adult{item.quantity > 1 ? 's' : ''}
                                                                    {item.childQuantity > 0 && 
                                                                        `, ${item.childQuantity} Child${item.childQuantity > 1 ? 'ren' : ''}`
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Price */}
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-lg text-red-600">
                                                                {formatPrice(getItemTotal(item))}
                                                            </span>
                                                            <button
                                                                onClick={() => removeFromCart(item.uniqueId!)}
                                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                                aria-label={`Remove ${item.title} from cart`}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Add-ons Section */}
                                                {item.selectedAddOns && 
                                                 item.selectedAddOnDetails && 
                                                 Object.keys(item.selectedAddOns).length > 0 && (
                                                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                                                        <h4 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                                                            <Plus size={12} />
                                                            Add-ons
                                                        </h4>
                                                        <div className="space-y-1">
                                                            {Object.entries(item.selectedAddOns).map(([addOnId, quantity]) => {
                                                                const addOnDetail = item.selectedAddOnDetails?.[addOnId];
                                                                if (!addOnDetail || quantity === 0) return null;

                                                                const totalGuests = item.quantity + item.childQuantity;
                                                                const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
                                                                const addOnTotal = addOnDetail.price * addOnQuantity;

                                                                return (
                                                                    <div key={addOnId} className="flex items-center justify-between text-xs">
                                                                        <span className="text-slate-600 truncate pr-2">
                                                                            {addOnDetail.title}
                                                                            {addOnDetail.perGuest && ` (${totalGuests}x)`}
                                                                        </span>
                                                                        <span className="text-slate-700 font-medium">
                                                                            {formatPrice(addOnTotal)}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.li>
                                        ))}
                                    </AnimatePresence>
                                </ul>
                            )}
                        </div>
                        
                        {/* Footer */}
                        {cart.length > 0 && (
                            <div className="border-t bg-white shadow-inner">
                                {/* Summary */}
                                <div className="p-4 space-y-2">
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>Items ({totalItems})</span>
                                        <span>{formatPrice(cartTotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-slate-800">
                                        <span className="text-lg font-semibold">Total</span>
                                        <span className="text-2xl font-bold text-red-600">{formatPrice(cartTotal)}</span>
                                    </div>
                                </div>

                                {/* Checkout Button */}
                                <div className="p-4 pt-0">
                                    <button
                                        onClick={handleCheckout}
                                        className="w-full bg-red-600 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105 hover:bg-red-700"
                                    >
                                        Proceed to Checkout
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CartSidebar;