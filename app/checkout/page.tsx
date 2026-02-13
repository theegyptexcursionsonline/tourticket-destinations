'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Shield,
  CheckCircle,
  User,
  Trash2,
  Smartphone,
  Headphones,
  Loader2,
  Download,
  Printer,
  UserPlus,
  LogIn,
  Mail,
  Phone,
  UserCheck,
  MapPin,
  Ticket,
  Tag,
  ChevronRight,
} from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import StripePaymentForm from '@/components/StripePaymentForm';
import HotelPickupMap from '@/components/HotelPickupMap';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { CartItem } from '@/types';
import toast from 'react-hot-toast';
import { parseLocalDate } from '@/utils/date';

const FormInput = ({ label, name, type = 'text', placeholder, required = true, value, onChange, disabled = false }: any) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-2">
      {label}
      {required && <span className="text-rose-500 ml-1">*</span>}
    </label>
    <input
      type={type}
      id={name}
      name={name}
      placeholder={placeholder}
      required={required}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full bg-white border border-slate-300 px-4 py-3 shadow-sm placeholder:text-slate-400 focus:outline-none focus:border-slate-500 focus-visible:ring-2 focus-visible:ring-red-500 transition duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
    />
  </div>
);

// Customer Type Selection Component
const CustomerTypeSelector = ({ 
  customerType, 
  setCustomerType, 
  onLoginClick, 
  onSignupClick 
}: {
  customerType: 'guest' | 'login' | 'signup';
  setCustomerType: (type: 'guest' | 'login' | 'signup') => void;
  onLoginClick: () => void;
  onSignupClick: () => void;
}) => {
  return (
    <div className="bg-white p-4 sm:p-6 shadow-xl space-y-3 sm:space-y-4 border-t border-b border-r border-slate-200">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4">How would you like to checkout?</h2>
      
      <div className="space-y-3">
        {/* Continue as Guest */}
        <motion.button
          type="button"
          onClick={() => setCustomerType('guest')}
          className={`w-full p-3 sm:p-4 border-2 rounded-xl text-left transition-all ${
            customerType === 'guest'
              ? 'border-red-500 bg-red-50'
              : 'border-slate-200 hover:border-red-300 hover:bg-red-50'
          }`}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className={`w-4 h-4 rounded-full border-2 ${
                customerType === 'guest' 
                  ? 'border-red-500 bg-red-500' 
                  : 'border-slate-300'
              }`}>
                {customerType === 'guest' && (
                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base text-slate-800">Continue as Guest</div>
                <div className="text-xs sm:text-sm text-slate-600">Quick checkout without creating an account</div>
              </div>
            </div>
            <User size={20} className={`${customerType === 'guest' ? 'text-red-500' : 'text-slate-400'} flex-shrink-0 hidden sm:block`} />
          </div>
        </motion.button>

        {/* Sign In */}
        <motion.button
          type="button"
          onClick={onLoginClick}
          className="w-full p-3 sm:p-4 border-2 border-slate-200 rounded-xl text-left transition-all hover:border-blue-300 hover:bg-blue-50"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <LogIn size={20} className="text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-sm sm:text-base text-slate-800">Sign In</div>
                <div className="text-xs sm:text-sm text-slate-600 truncate sm:whitespace-normal">Access your account for faster checkout</div>
              </div>
            </div>
            <div className="text-blue-500 text-xs sm:text-sm font-medium flex-shrink-0 hidden xs:block">Sign In →</div>
          </div>
        </motion.button>

        {/* Create Account */}
        <motion.button
          type="button"
          onClick={onSignupClick}
          className="w-full p-3 sm:p-4 border-2 border-slate-200 rounded-xl text-left transition-all hover:border-green-300 hover:bg-green-50"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <UserPlus size={20} className="text-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-sm sm:text-base text-slate-800">Create Account</div>
                <div className="text-xs sm:text-sm text-slate-600 truncate sm:whitespace-normal">Save your details for future bookings</div>
              </div>
            </div>
            <div className="text-green-500 text-xs sm:text-sm font-medium flex-shrink-0 hidden xs:block">Sign Up →</div>
          </div>
        </motion.button>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
        <Shield size={14} className="text-green-500" />
        <span>Your personal information is always secure and protected</span>
      </div>
    </div>
  );
};

const SummaryItem: React.FC<{ item: CartItem }> = ({ item }) => {
  const { formatPrice } = useSettings();
  const { removeFromCart } = useCart();

  // Use the same calculation logic as in BookingSidebar and CartSidebar
  const getItemTotal = (item: CartItem) => {
    const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
    const adultPrice = basePrice * (item.quantity || 1);
    const childPrice = (basePrice / 2) * (item.childQuantity || 0);
    let tourTotal = adultPrice + childPrice;

    let addOnsTotal = 0;
    if (item.selectedAddOns && item.selectedAddOnDetails) {
      Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
        const addOnDetail = item.selectedAddOnDetails?.[addOnId];
        if (addOnDetail && quantity > 0) {
          const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
          const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
          addOnsTotal += addOnDetail.price * addOnQuantity;
        }
      });
    }

    return tourTotal + addOnsTotal;
  };

  const itemTotal = getItemTotal(item);

  return (
    <div className="flex gap-3 sm:gap-4 py-3 sm:py-4">
      <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 overflow-hidden rounded">
        {item.image ? (
          <Image src={item.image} alt={item.title} width={64} height={64} className="w-16 h-16 object-cover" />
        ) : (
          <div className="w-16 h-16 bg-slate-100" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm sm:text-base text-slate-800 leading-tight">{item.title}</h4>
        
       {/* This line should show the selected booking option */}
  {item.selectedBookingOption && (
    <p className="text-sm text-blue-600 font-medium mb-1">{item.selectedBookingOption.title}</p>
  )}
        
        {/* Show booking details */}
        {item.selectedDate && (
          <p className="text-xs text-slate-500">
            {formatBookingDate(item.selectedDate)} at {item.selectedTime}
          </p>
        )}
        
        {/* Show participant counts */}
        <div className="text-sm text-slate-500">
          {item.quantity > 0 && `${item.quantity} Adult${item.quantity > 1 ? 's' : ''}`}
          {item.childQuantity > 0 && item.quantity > 0 && ', '}
          {item.childQuantity > 0 && `${item.childQuantity} Child${item.childQuantity > 1 ? 'ren' : ''}`}
          {item.infantQuantity > 0 && (item.quantity > 0 || item.childQuantity > 0) && ', '}
          {item.infantQuantity > 0 && `${item.infantQuantity} Infant${item.infantQuantity > 1 ? 's' : ''}`}
        </div>
        
        {/* Show selected add-ons */}
        {item.selectedAddOns && item.selectedAddOnDetails && Object.keys(item.selectedAddOns).length > 0 && (
          <div className="text-xs text-slate-500 mt-1 pl-4 border-l-2 border-slate-200">
            <strong>Add-ons:</strong>
            <div className="mt-1 space-y-1">
              {Object.entries(item.selectedAddOns).map(([addOnId, quantity]) => {
                const addOnDetail = item.selectedAddOnDetails?.[addOnId];
                if (!addOnDetail || quantity === 0) return null;

                const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
                const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
                const addOnTotal = addOnDetail.price * addOnQuantity;

                return (
                  <div key={addOnId} className="flex justify-between">
                    <span>• {addOnDetail.title}{addOnDetail.perGuest && ` (${totalGuests}x)`}</span>
                    <span>{formatPrice(addOnTotal)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="text-right flex flex-col justify-between items-end flex-shrink-0">
        <p className="font-bold text-base sm:text-lg text-slate-800">{formatPrice(itemTotal)}</p>
        <button
          onClick={() => removeFromCart(item.uniqueId!)}
          className="text-slate-400 hover:text-red-500 transition-colors mt-2"
          aria-label="Remove item"
        >
          <Trash2 size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
};

const BookingSummary = ({ pricing, promoCode, setPromoCode, applyPromoCode, isProcessing, isApplyingCoupon, couponMessage }: any) => {
  const { formatPrice } = useSettings();
  const { cart } = useCart();

  if (!cart || cart.length === 0) return null;

  return (
    <aside className="bg-white border-t border-b border-l border-slate-200 p-4 sm:p-6 shadow-xl lg:sticky lg:top-28">
      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">Your Booking Summary</h3>
      <div className="divide-y divide-slate-200">
        {cart.map((item, index) => (
          <SummaryItem key={`${item._id ?? item.uniqueId}-${index}`} item={item} />
        ))}
      </div>

      <div className="mt-4 p-3 sm:p-4 bg-slate-50 border-t border-b border-slate-200">
        <div className="flex justify-between text-xs sm:text-sm text-slate-600"><span>Subtotal</span><span>{formatPrice(pricing.subtotal)}</span></div>
        <div className="flex justify-between text-xs sm:text-sm text-slate-600 mt-1.5 sm:mt-2"><span>Service fee</span><span>{formatPrice(pricing.serviceFee)}</span></div>
        <div className="flex justify-between text-xs sm:text-sm text-slate-600 mt-1.5 sm:mt-2"><span>Taxes & fees</span><span>{formatPrice(pricing.tax)}</span></div>
        {pricing.discount > 0 && (
          <div className="flex justify-between text-xs sm:text-sm text-emerald-700 font-medium mt-1.5 sm:mt-2">
            <span>Discount Applied</span>
            <span>-{formatPrice(pricing.discount)}</span>
          </div>
        )}
        <div className="border-t pt-2 sm:pt-3 mt-2 sm:mt-3 flex justify-between items-center">
          <p className="text-xs sm:text-sm text-slate-600">Total</p>
          <p className="text-base sm:text-lg font-bold text-rose-600">{formatPrice(pricing.total)}</p>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700 mb-2 sm:hidden">Promo Code</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Promotional code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            disabled={isApplyingCoupon || pricing.discount > 0}
            className="flex-1 px-4 py-3 sm:py-2 border border-slate-300 rounded-lg sm:rounded placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-200 transition disabled:bg-slate-100 text-base"
          />
          <button
            onClick={applyPromoCode}
            type="button"
            disabled={isApplyingCoupon || pricing.discount > 0}
            className="px-4 py-3 sm:py-2 bg-slate-900 text-white font-semibold rounded-lg sm:rounded hover:bg-slate-800 transition disabled:bg-slate-400 flex items-center justify-center w-full sm:w-24"
          >
            {isApplyingCoupon ? <Loader2 className="animate-spin" size={20} /> : 'Apply'}
          </button>
        </div>
        {couponMessage && (
          <p className={`mt-2 text-xs sm:text-sm ${pricing.discount > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {couponMessage}
          </p>
        )}
      </div>

      <div className="mt-6 hidden lg:block">
        <button
          type="submit"
          form="checkout-form"
          disabled={isProcessing}
          className="w-full py-4 bg-red-600 text-white font-extrabold text-lg hover:bg-red-700 active:translate-y-[1px] transform-gpu shadow-md transition disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <span className="inline-flex items-center justify-center gap-2"><Lock size={18} /> Complete Booking & Pay</span>}
        </button>
        <p className="text-xs text-slate-500 text-center mt-3">
          By completing this booking you agree to our <a className="underline" href="/terms">Terms of Service</a>.
        </p>
      </div>
    </aside>
  );
};

type HotelPickupLocation = {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
} | null;

type FormDataShape = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyContact: string;
  hotelPickupDetails: string;
  hotelPickupLocation: HotelPickupLocation;
  specialRequests: string;
  cardholderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
};

const CheckoutFormStep = ({
  onPaymentProcess,
  onPaymentProcessWithIntent,
  isProcessing,
  formData,
  setFormData,
  customerType,
  setCustomerType,
  onAuthModalOpen,
  user,
  pricing,
  cart,
  promoCode,
  paymentIntentId,
  setPaymentIntentId,
  paymentMethod,
  setPaymentMethod,
  supportedPaymentMethods,
}: {
  onPaymentProcess: () => void;
  onPaymentProcessWithIntent: (intentId: string) => void;
  isProcessing: boolean;
  formData: FormDataShape;
  setFormData: React.Dispatch<React.SetStateAction<FormDataShape>>;
  customerType: 'guest' | 'login' | 'signup';
  setCustomerType: (type: 'guest' | 'login' | 'signup') => void;
  onAuthModalOpen: (mode: 'login' | 'signup') => void;
  user: any;
  pricing: any;
  cart: any[];
  promoCode: string;
  paymentIntentId: string;
  setPaymentIntentId: (id: string) => void;
  paymentMethod: 'card' | 'paypal';
  setPaymentMethod: (method: 'card' | 'paypal') => void;
  supportedPaymentMethods: string[];
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that we have a payment intent ID from Stripe
    if (!paymentIntentId) {
      toast.error('Please complete the payment before submitting');
      return;
    }

    onPaymentProcess();
  };

  const isPaymentMethodSupported = (method: string) => supportedPaymentMethods.includes(method);

  // Auto-fill form if user is logged in
  useEffect(() => {
    if (user && customerType !== 'guest') {
      setFormData((prev: FormDataShape) => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        email: user.email || prev.email,
        cardholderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || prev.cardholderName,
      }));
    }
  }, [user, customerType, setFormData]);

  return (
    <form onSubmit={handleSubmit} id="checkout-form" className="bg-white p-4 sm:p-6 md:p-8 shadow-xl space-y-6 sm:space-y-8 border-t border-b border-r border-slate-200">
      {/* Customer Type Selection (only show if not authenticated) */}
      {!user && (
        <section>
          <CustomerTypeSelector
            customerType={customerType}
            setCustomerType={setCustomerType}
            onLoginClick={() => onAuthModalOpen('login')}
            onSignupClick={() => onAuthModalOpen('signup')}
          />
        </section>
      )}

      {/* Welcome message for authenticated users */}
      {user && (
        <section className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <UserCheck size={24} className="text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">Welcome back, {user.firstName}!</h3>
              <p className="text-sm text-green-600">Your account details have been pre-filled for faster checkout.</p>
            </div>
          </div>
        </section>
      )}

      {/* Contact Information (show for guest or authenticated users) */}
      {(customerType === 'guest' || user) && (
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Contact Information</h2>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
              <Shield size={14} className="text-emerald-500" /> 
              <span>Secure &amp; encrypted</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput 
              label="First Name" 
              name="firstName" 
              placeholder="Enter your first name" 
              value={formData.firstName} 
              onChange={handleInputChange} 
              disabled={isProcessing} 
            />
            <FormInput 
              label="Last Name" 
              name="lastName" 
              placeholder="Enter your last name" 
              value={formData.lastName} 
              onChange={handleInputChange} 
              disabled={isProcessing} 
            />
            <FormInput 
              label="Email Address" 
              name="email" 
              type="email" 
              placeholder="Enter your email address" 
              value={formData.email} 
              onChange={handleInputChange} 
              disabled={isProcessing || !!user} 
            />
            <FormInput 
              label="Phone Number" 
              name="phone" 
              type="tel" 
              placeholder="Enter your phone number" 
              value={formData.phone} 
              onChange={handleInputChange} 
              disabled={isProcessing} 
            />
            <div className="md:col-span-2">
              <FormInput 
                label="Emergency Contact (optional)" 
                name="emergencyContact" 
                placeholder="Name and phone number" 
                required={false} 
                value={formData.emergencyContact} 
                onChange={handleInputChange} 
                disabled={isProcessing} 
              />
            </div>
          </div>
        </section>
      )}

      {/* Hotel Pickup Location (show for guest or authenticated users) */}
      {(customerType === 'guest' || user) && (
        <section>
          <HotelPickupMap
            onLocationSelect={(location) => {
              // Use the hotel name if available, otherwise fall back to address
              // This ensures the customer confirmation shows the hotel name properly
              const displayName = location?.name || location?.address || '';
              setFormData({
                ...formData,
                hotelPickupLocation: location,
                hotelPickupDetails: displayName
              });
            }}
            initialLocation={formData.hotelPickupLocation || undefined}
            tourLocation={cart && cart.length > 0 ? cart[0].title : ''}
          />
        </section>
      )}

      {/* Special Requests (show for guest or authenticated users) */}
      {(customerType === 'guest' || user) && (
        <section>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Special Requests</label>
              <textarea 
                name="specialRequests" 
                value={formData.specialRequests} 
                onChange={handleInputChange} 
                placeholder="Any special requirements, dietary restrictions, etc..." 
                rows={4} 
                className="w-full px-4 py-3 border border-slate-300 focus-visible:ring-2 focus-visible:ring-red-500" 
                disabled={isProcessing} 
              />
            </div>
          </div>
        </section>
      )}

      {/* Payment Information (show for guest or authenticated users) */}
      {(customerType === 'guest' || user) && (
        <section>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-4">Payment Information</h2>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
            {isPaymentMethodSupported('card') && (
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                aria-pressed={paymentMethod === 'card'}
                className={`flex flex-col items-center justify-center gap-1 sm:gap-2 p-3 sm:p-4 border border-slate-200 rounded-lg transition-shadow ${paymentMethod === 'card' ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white hover:shadow-sm'}`}
              >
                <div className="h-7 sm:h-10 flex items-center">
                  <Image src="/payment/visam.png" alt="Card logos" width={60} height={24} className="object-contain w-[50px] h-[20px] sm:w-[72px] sm:h-[28px]" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-700">Card</span>
              </button>
            )}

            {isPaymentMethodSupported('paypal') && (
              <button
                type="button"
                onClick={() => setPaymentMethod('paypal')}
                aria-pressed={paymentMethod === 'paypal'}
                className={`flex flex-col items-center justify-center gap-1 sm:gap-2 p-3 sm:p-4 border border-slate-200 rounded-lg transition-shadow relative ${paymentMethod === 'paypal' ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white hover:shadow-sm'}`}
              >
                <span className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-blue-500 text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                  SOON
                </span>
                <div className="h-7 sm:h-10 flex items-center">
                  <Image src="/payment/paypal2.png" alt="PayPal" width={48} height={30} className="object-contain w-[38px] h-[24px] sm:w-[48px] sm:h-[30px]" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-700">PayPal</span>
              </button>
            )}

          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={paymentMethod}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {paymentMethod === 'card' && (
                <div className="mt-4">
                  <StripePaymentForm
                    amount={pricing.total}
                    currency={pricing.currency}
                    customer={{
                      email: formData.email,
                      firstName: formData.firstName,
                      lastName: formData.lastName,
                    }}
                    cart={cart}
                    pricing={pricing}
                    discountCode={promoCode}
                    onSuccess={(paymentIntent) => {
                      // Set the payment intent ID immediately
                      setPaymentIntentId(paymentIntent);
                      toast.success('Payment completed successfully! Finalizing your booking...');
                      
                      // Process the booking immediately after payment succeeds
                      // We need to call this directly to avoid state update race conditions
                      onPaymentProcessWithIntent(paymentIntent);
                    }}
                    onError={(error) => {
                      toast.error(error);
                    }}
                  />
                </div>
              )}
              {paymentMethod === 'paypal' && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-700">
                  <p className="font-medium">PayPal integration is coming soon!</p>
                  <p className="text-sm text-slate-500 mt-2">Please use card payment for now.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      )}
    </form>
  );
};

// Format date consistently for display
const formatBookingDate = (dateString: string | Date | undefined): string => {
  const date = parseLocalDate(dateString);
  if (!date || isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

type TimeUntilTour = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
};

// Helper to calculate remaining time until tour
const getTimeUntilTour = (
  dateString: string | Date | undefined,
  timeString?: string
): TimeUntilTour | null => {
  const tourDate = parseLocalDate(dateString);
  if (!tourDate || isNaN(tourDate.getTime())) return null;

  // If we have a time, set it on the date
  if (timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    if (!isNaN(hours)) tourDate.setHours(hours, minutes || 0, 0, 0);
  }

  const now = new Date();
  const diff = tourDate.getTime() - now.getTime();

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isPast: false };
};

const ThankYouPage = ({
  orderedItems,
  pricing,
  customer,
  lastOrderId,
}: {
  orderedItems: CartItem[];
  pricing: any;
  customer: FormDataShape | null;
  lastOrderId?: string;
  discount?: number;
}) => {
  const { formatPrice } = useSettings();
  const { tenant } = useTenant();
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  // Get first item's booking details
  const firstItem = orderedItems[0];
  const bookingTime = firstItem?.selectedTime || '';
  const [timeUntil, setTimeUntil] = useState<TimeUntilTour | null>(() =>
    getTimeUntilTour(firstItem?.selectedDate, firstItem?.selectedTime)
  );

  // Parse date for ticket display
  const dateObj = parseLocalDate(firstItem?.selectedDate) || new Date();
  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dayNum = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

  const formatTimerUnit = (value: number) => String(value).padStart(2, '0');

  // Hide confetti after animation
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      setTimeUntil(getTimeUntilTour(firstItem?.selectedDate, firstItem?.selectedTime));
    };

    updateTime();

    if (!firstItem?.selectedDate) return;

    const intervalId = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(intervalId);
  }, [firstItem?.selectedDate, firstItem?.selectedTime]);

const handleDownloadReceipt = async () => {
  if (isDownloading) return;
  setIsDownloading(true);

  try {
    const orderId = lastOrderId ?? `ORD-${Date.now()}`;

    const pricingForPdf = {
      subtotal: pricing.subtotal,
      serviceFee: pricing.serviceFee,
      tax: pricing.tax,
      discount: pricing.discount,
      total: pricing.total,
      currency: pricing.currency,
      symbol: pricing.symbol,
    };

    const orderedItemsForPdf = orderedItems.map((item) => {
      const getItemTotal = (item: CartItem) => {
        const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
        const adultPrice = basePrice * (item.quantity || 1);
        const childPrice = (basePrice / 2) * (item.childQuantity || 0);
        let tourTotal = adultPrice + childPrice;

        let addOnsTotal = 0;
        if (item.selectedAddOns && item.selectedAddOnDetails) {
          Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
            const addOnDetail = item.selectedAddOnDetails?.[addOnId];
            if (addOnDetail && quantity > 0) {
              const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
              const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
              addOnsTotal += addOnDetail.price * addOnQuantity;
            }
          });
        }

        return tourTotal + addOnsTotal;
      };

      return {
        ...item,
        totalPrice: getItemTotal(item),
        finalPrice: getItemTotal(item),
      };
    });

    const customerForPdf = {
      name: customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Guest',
      email: customer?.email,
      phone: customer?.phone,
    };

    const firstItem = orderedItems[0];
    const bookingForPdf = {
      date: formatBookingDate(firstItem?.selectedDate),
      time: firstItem?.selectedTime,
      guests: orderedItems.reduce((sum, item) =>
        sum + (item.quantity || 0) + (item.childQuantity || 0) + (item.infantQuantity || 0), 0
      ),
      specialRequests: customer?.specialRequests ?? '',
    };

    const qrData = `https://your-site.example.com/booking/${orderId}`;

    const payload = {
      orderId,
      customer: customerForPdf,
      orderedItems: orderedItemsForPdf,
      pricing: pricingForPdf,
      booking: bookingForPdf,
      qrData,
      notes: customer?.specialRequests || 'Receipt requested from Thank You page',
    };

    const res = await fetch('/api/checkout/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      console.error('Failed to get receipt:', res.status, text);
      alert('Failed to generate receipt. Please try again later.');
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${orderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download receipt error:', err);
    alert('An error occurred while downloading the receipt.');
  } finally {
    setIsDownloading(false);
  }
};

  // Confetti particles
  const confettiColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="relative">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                y: -20,
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                rotate: 0,
                opacity: 1
              }}
              animate={{
                y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1000,
                rotate: Math.random() * 720 - 360,
                opacity: 0
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: "linear"
              }}
              className="absolute w-3 h-3"
              style={{
                backgroundColor: confettiColors[i % confettiColors.length],
                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-2xl mx-auto"
      >
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full shadow-lg shadow-emerald-200 mb-4"
          >
            <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Booking Confirmed!</h1>
          <p className="text-slate-500">Your adventure awaits. Check your email for details.</p>
        </motion.div>

        {/* Premium Ticket Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative"
        >
          {/* Ticket Container with Notches */}
          <div className="relative bg-white rounded-3xl shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">

            {/* Top Gradient Bar */}
            <div className="h-2 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />

            {/* Ticket Header */}
            <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-slate-50 to-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Confirmed
                    </span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-medium uppercase tracking-wider rounded-full">
                      E-Ticket
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight mb-1">
                    {orderedItems.length === 1 ? firstItem?.title : `${orderedItems.length} Tour${orderedItems.length > 1 ? 's' : ''} Booked`}
                  </h2>
                  {firstItem?.selectedBookingOption && (
                    <p className="text-sm text-slate-500">{firstItem.selectedBookingOption.title}</p>
                  )}
                </div>

                {/* Date Badge */}
                <div className="flex-shrink-0 text-center bg-white rounded-2xl shadow-md border border-slate-100 p-3 min-w-[70px]">
                  <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">{dayOfWeek}</div>
                  <div className="text-2xl font-black text-slate-900 leading-none my-0.5">{dayNum}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">{month}</div>
                </div>
              </div>
            </div>

            {/* Perforated Divider */}
            <div className="relative flex items-center px-0">
              <div className="w-6 h-12 bg-slate-100 rounded-r-full -ml-3" />
              <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-2" />
              <div className="w-6 h-12 bg-slate-100 rounded-l-full -mr-3" />
            </div>

            {/* Ticket Body */}
            <div className="px-6 py-5">
              {/* Booking Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Booking ID</p>
                  <p className="font-mono font-bold text-sm text-slate-900">{lastOrderId || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Time</p>
                  <p className="font-bold text-sm text-slate-900">{bookingTime || 'Flexible'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Guests</p>
                  <p className="font-bold text-sm text-slate-900">
                    {orderedItems.reduce((sum, item) => sum + (item.quantity || 0) + (item.childQuantity || 0) + (item.infantQuantity || 0), 0)} Total
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  <p className="font-bold text-sm text-emerald-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Confirmed
                  </p>
                </div>
              </div>

              {/* Countdown Timer */}
              {timeUntil && !timeUntil.isPast && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">Your Adventure Begins In</p>
                  <div className="flex justify-center items-center gap-3 flex-wrap sm:flex-nowrap">
                    <div className="text-center min-w-[70px]">
                      <div className="text-3xl sm:text-4xl font-black text-white leading-none">{timeUntil.days}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Days</div>
                    </div>
                    <div className="text-2xl font-light text-slate-600 hidden xs:block">:</div>
                    <div className="text-center min-w-[70px]">
                      <div className="text-3xl sm:text-4xl font-black text-white leading-none">{formatTimerUnit(timeUntil.hours)}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Hours</div>
                    </div>
                    <div className="text-2xl font-light text-slate-600 hidden xs:block">:</div>
                    <div className="text-center min-w-[70px]">
                      <div className="text-3xl sm:text-4xl font-black text-white leading-none">{formatTimerUnit(timeUntil.minutes)}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Mins</div>
                    </div>
                    <div className="text-2xl font-light text-slate-600 hidden xs:block">:</div>
                    <div className="text-center min-w-[70px]">
                      <div className="text-3xl sm:text-4xl font-black text-white leading-none">{formatTimerUnit(timeUntil.seconds)}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Secs</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Guest Details */}
              {customer && (
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Guest Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white rounded-lg shadow-sm flex items-center justify-center">
                        <User size={16} className="text-slate-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Name</p>
                        <p className="font-semibold text-sm text-slate-900">{customer.firstName} {customer.lastName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white rounded-lg shadow-sm flex items-center justify-center">
                        <Mail size={16} className="text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400">Email</p>
                        <p className="font-semibold text-sm text-slate-900 truncate">{customer.email}</p>
                      </div>
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-lg shadow-sm flex items-center justify-center">
                          <Phone size={16} className="text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Phone</p>
                          <p className="font-semibold text-sm text-slate-900">{customer.phone}</p>
                        </div>
                      </div>
                    )}
                    {customer.hotelPickupDetails && (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-lg shadow-sm flex items-center justify-center">
                          <MapPin size={16} className="text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-400">Pickup</p>
                          <p className="font-semibold text-sm text-slate-900 truncate">{customer.hotelPickupDetails}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items Summary */}
              <div className="space-y-3 mb-4">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Order Summary</p>
                {orderedItems.map((item, index) => {
                  const getItemTotal = (item: CartItem) => {
                    const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
                    const adultPrice = basePrice * (item.quantity || 1);
                    const childPrice = (basePrice / 2) * (item.childQuantity || 0);
                    let tourTotal = adultPrice + childPrice;
                    let addOnsTotal = 0;
                    if (item.selectedAddOns && item.selectedAddOnDetails) {
                      Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
                        const addOnDetail = item.selectedAddOnDetails?.[addOnId];
                        if (addOnDetail && quantity > 0) {
                          const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
                          const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
                          addOnsTotal += addOnDetail.price * addOnQuantity;
                        }
                      });
                    }
                    return tourTotal + addOnsTotal;
                  };
                  const itemTotal = getItemTotal(item);

                  return (
                    <div key={`${item._id ?? index}-${index}`} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
                      <div className="w-14 h-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {item.image ? (
                          <Image src={item.image} alt={item.title} width={56} height={56} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                            <Ticket size={20} className="text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-slate-500">
                          {item.quantity} Adult{item.quantity > 1 ? 's' : ''}
                          {item.childQuantity > 0 && `, ${item.childQuantity} Child${item.childQuantity > 1 ? 'ren' : ''}`}
                        </p>
                      </div>
                      <p className="font-bold text-slate-900">{formatPrice(itemTotal)}</p>
                    </div>
                  );
                })}
              </div>

              {/* Pricing Breakdown */}
              <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(pricing.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Service fee</span>
                  <span>{formatPrice(pricing.serviceFee)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Taxes & fees</span>
                  <span>{formatPrice(pricing.tax)}</span>
                </div>
                {pricing.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span className="flex items-center gap-1">
                      <Tag size={14} />
                      Discount
                    </span>
                    <span>-{formatPrice(pricing.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                  <span className="text-base font-bold text-slate-900">Total Paid</span>
                  <span className="text-2xl font-black text-slate-900">{formatPrice(pricing.total)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Gradient Bar */}
            <div className="h-1.5 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 mt-6"
        >
          <button
            onClick={handleDownloadReceipt}
            disabled={isDownloading}
            className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
          >
            {isDownloading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Downloading...
              </>
            ) : (
              <>
                <Download size={18} />
                Download Receipt
              </>
            )}
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 py-4 bg-white text-slate-700 font-bold rounded-xl border-2 border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Printer size={18} />
            Print Ticket
          </button>
        </motion.div>

        {/* Continue Exploring */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-center"
        >
          <button
            onClick={() => router.push('/')}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm inline-flex items-center gap-1 transition-colors"
          >
            Continue exploring tours
            <ChevronRight size={16} />
          </button>
        </motion.div>

        {/* Help Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-xs text-slate-400 mt-8"
        >
          {tenant?.contact?.email && <>Questions about your booking? Contact us at {tenant.contact.email}</>}
        </motion.p>
      </motion.div>
    </div>
  );
};

const TrustIndicators = () => (
  <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 md:gap-12 py-6 sm:py-8 mt-8 sm:mt-12 border-t border-slate-200">
    <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600"><Shield size={18} className="sm:w-5 sm:h-5 text-emerald-600" /><span>Easy and secure booking</span></div>
    <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600"><Smartphone size={18} className="sm:w-5 sm:h-5 text-red-600" /><span>Ticket available on smartphone</span></div>
    <div className="flex items-center gap-2 text-sm sm:text-base text-slate-600"><Headphones size={18} className="sm:w-5 sm:h-5 text-slate-900" /><span>Excellent customer service</span></div>
  </div>
);

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { formatPrice, selectedCurrency } = useSettings();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const router = useRouter();

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderedItems, setOrderedItems] = useState<CartItem[]>([]);
  const [finalPricing, setFinalPricing] = useState<any>(null);
  const [finalCustomer, setFinalCustomer] = useState<FormDataShape | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [lastOrderId, setLastOrderId] = useState<string | undefined>(undefined);

  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');

  // Customer type and auth modal states
  const [customerType, setCustomerType] = useState<'guest' | 'login' | 'signup'>('guest');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const supportedPaymentMethods =
    tenant?.payments?.supportedPaymentMethods && tenant.payments.supportedPaymentMethods.length > 0
      ? tenant.payments.supportedPaymentMethods.filter(method => method !== 'pay_later')
      : ['card', 'paypal'];

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>(
    (supportedPaymentMethods[0] as 'card' | 'paypal') || 'card'
  );

  // Stripe payment intent ID
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');

  const [formData, setFormData] = useState<FormDataShape>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    emergencyContact: '',
    hotelPickupDetails: '',
    hotelPickupLocation: null,
    specialRequests: '',
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });

 const pricing = useMemo(() => {
  // Use the same calculation logic as in other components
  const getItemTotal = (item: CartItem) => {
    const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
    const adultPrice = basePrice * (item.quantity || 1);
    const childPrice = (basePrice / 2) * (item.childQuantity || 0);
    let tourTotal = adultPrice + childPrice;

    let addOnsTotal = 0;
    if (item.selectedAddOns && item.selectedAddOnDetails) {
      Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
        const addOnDetail = item.selectedAddOnDetails?.[addOnId];
        if (addOnDetail && quantity > 0) {
          const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
          const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
          addOnsTotal += addOnDetail.price * addOnQuantity;
        }
      });
    }

    return tourTotal + addOnsTotal;
  };

  const subtotal = Number(((cart || []).reduce((acc, item) => acc + getItemTotal(item), 0)).toFixed(2));
  const serviceFee = Number((subtotal * 0.03).toFixed(2));
  const tax = Number((subtotal * 0.05).toFixed(2));
  const total = Number((subtotal + serviceFee + tax - Number(discount || 0)).toFixed(2));
  
  return {
    subtotal,
    serviceFee,
    tax,
    total,
    discount,
    currency: selectedCurrency?.code ?? 'USD',
    symbol: selectedCurrency?.symbol ?? '$',
  };
}, [cart, discount, selectedCurrency]);

  // Set customer type based on authentication status
  useEffect(() => {
    if (user) {
      setCustomerType('login'); // Will show authenticated flow
    }
  }, [user]);

  useEffect(() => {
    if (!supportedPaymentMethods.includes(paymentMethod)) {
      const fallback = supportedPaymentMethods[0] as 'card' | 'paypal' | undefined;
      setPaymentMethod(fallback || 'card');
    }
  }, [supportedPaymentMethods, paymentMethod]);

  const handleApplyCoupon = async () => {
    if (!promoCode) {
      setCouponMessage('Please enter a coupon code.');
      return;
    }
    setIsApplyingCoupon(true);
    setCouponMessage('');

    try {
      const response = await fetch(`/api/discounts/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode }),
      });

      const data = await response.json();

      if (data.success) {
        const discountData = data.data;
        let calculatedDiscount = 0;
        if (discountData.discountType === 'percentage') {
          calculatedDiscount = (pricing.subtotal * discountData.value) / 100;
        } else {
          calculatedDiscount = discountData.value;
        }
        setDiscount(calculatedDiscount);
        setCouponMessage(`Success! A discount of ${formatPrice(calculatedDiscount)} has been applied.`);
      } else {
        setDiscount(0);
        setCouponMessage(data.error || 'Invalid or expired coupon code.');
      }
    } catch (error) {
      console.error('Failed to apply coupon:', error);
      setDiscount(0);
      setCouponMessage('An error occurred. Please try again.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleAuthModalOpen = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthModalClose = () => {
    setIsAuthModalOpen(false);
  };

  const handleAuthSuccess = () => {
    setCustomerType('login'); // User is now authenticated
    toast.success('Great! You can now complete your booking.');
  };

  // Handler that accepts payment intent ID directly to avoid race conditions
  const handlePaymentProcessWithIntent = async (intentId: string) => {
    setIsProcessing(true);

    try {
      // Validate required fields
      if (customerType === 'guest' || user) {
        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.phone.trim()) {
          toast.error('Please fill in all required contact information');
          setIsProcessing(false);
          return;
        }
      } else {
        toast.error('Please select a checkout option');
        setIsProcessing(false);
        return;
      }

      const actualPaymentMethod = paymentMethod;

      // Prepare booking data
      const bookingPayload = {
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          emergencyContact: formData.emergencyContact,
          hotelPickupDetails: formData.hotelPickupDetails,
          hotelPickupLocation: formData.hotelPickupLocation,
          specialRequests: formData.specialRequests,
        },
        cart: cart || [],
        pricing,
        paymentMethod: actualPaymentMethod,
        paymentDetails: {
          paymentIntentId: intentId, // Use the directly passed payment intent ID
          cardholderName: formData.cardholderName,
        },
        userId: user?._id || user?.id,
        isGuest: !user,
        discountCode: discount > 0 ? promoCode : null,
      };

      // Call the checkout API
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Success - show thank you page
        setOrderedItems([...(cart || [])]);
        setFinalPricing(pricing);
        setFinalCustomer(formData);
        setLastOrderId(result.bookingId || `ORD-${Date.now()}`);

        clearCart();
        setIsConfirmed(true);

        toast.success('Booking confirmed! Check your email for details.', { duration: 5000 });
      } else {
        toast.error(result.message || 'Booking failed. Please try again.');
      }
    } catch (error) {
      console.error('Payment process error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentProcess = async () => {
    // This is called when form is manually submitted
    if (!paymentIntentId) {
      toast.error('Please complete the payment before submitting');
      return;
    }

    await handlePaymentProcessWithIntent(paymentIntentId);
  };

  useEffect(() => {
    if (cart && cart.length === 0 && !isConfirmed) {
      router.push('/');
    }
  }, [cart, isConfirmed, router]);

  // Scroll to top when thank you page is shown
  useEffect(() => {
    if (isConfirmed) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isConfirmed]);

  const showMobileStickyCTA = !isConfirmed && cart && cart.length > 0 && (customerType === 'guest' || user);

  if (!cart) {
    return (
      <main className="min-h-screen bg-slate-50 pt-24 pb-16 flex items-center justify-center">
        <div className="text-center p-4">
          <h1 className="text-3xl font-bold mb-4">Loading your booking...</h1>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className={`min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pt-20 sm:pt-24 ${showMobileStickyCTA ? 'pb-56' : 'pb-40'} lg:pb-16`}>
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <AnimatePresence mode="wait">
            <motion.div 
              key={isConfirmed ? 'thankyou' : 'checkout'} 
              initial={{ opacity: 0, y: 12 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -12 }} 
              transition={{ duration: 0.45 }}
            >
              {isConfirmed ? (
                <ThankYouPage 
                  orderedItems={orderedItems} 
                  pricing={finalPricing} 
                  customer={finalCustomer} 
                  lastOrderId={lastOrderId} 
                  discount={discount} 
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 items-start">
                  <div className="lg:col-span-2 order-2 lg:order-1">
                    <CheckoutFormStep
                      onPaymentProcess={handlePaymentProcess}
                      onPaymentProcessWithIntent={handlePaymentProcessWithIntent}
                      isProcessing={isProcessing}
                      formData={formData}
                      setFormData={setFormData}
                      customerType={customerType}
                      setCustomerType={setCustomerType}
                      onAuthModalOpen={handleAuthModalOpen}
                      user={user}
                      pricing={pricing}
                      cart={cart}
                      promoCode={promoCode}
                      paymentIntentId={paymentIntentId}
                      setPaymentIntentId={setPaymentIntentId}
                      paymentMethod={paymentMethod}
                      setPaymentMethod={setPaymentMethod}
                      supportedPaymentMethods={supportedPaymentMethods}
                    />
                  </div>
                  <div className="lg:col-span-1 order-1 lg:order-2">
                    <BookingSummary
                      pricing={pricing}
                      promoCode={promoCode}
                      setPromoCode={setPromoCode}
                      applyPromoCode={handleApplyCoupon}
                      isProcessing={isProcessing}
                      isApplyingCoupon={isApplyingCoupon}
                      couponMessage={couponMessage}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {!isConfirmed && <TrustIndicators />}
        </div>
      </main>

      {showMobileStickyCTA && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 shadow-[0_-6px_20px_rgba(15,23,42,0.15)]">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-600">Total price:</span>
            <span className="font-bold text-xl text-rose-600">{formatPrice(pricing.total)}</span>
          </div>
          <button 
            type="submit" 
            form="checkout-form" 
            disabled={isProcessing} 
            className="w-full py-3.5 bg-red-600 text-white font-bold text-base hover:bg-red-700 active:translate-y-[1px] transform-gpu shadow-lg transition disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center rounded-full"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <span className="inline-flex items-center justify-center gap-2"><Lock size={16} /> Complete Booking & Pay</span>}
          </button>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleAuthModalClose}
        initialMode={authModalMode}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}