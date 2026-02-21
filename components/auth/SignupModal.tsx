// components/auth/SignupModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
  onSuccess?: () => void;
}

export default function SignupModal({ isOpen, onClose, onSwitchToLogin, onSuccess }: SignupModalProps) {
  const { signup, loginWithGoogle } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const t = useTranslations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !lastName || !email || !password) {
      toast.error('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      await signup({ email, password, firstName, lastName });
      toast.success('Account created successfully!');

      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setShowPassword(false);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle();
      toast.success('Signed in successfully!');

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onClose();
    } catch (error: any) {
      // Only show error if it's not a user-cancelled action
      if (!error.message?.includes('closed') && !error.message?.includes('cancelled')) {
        toast.error(error.message || 'Google sign-in failed.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSwitchToLogin = () => {
    if (onSwitchToLogin) {
      onSwitchToLogin();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 end-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t('auth.createAccount')}
              </h2>
              <p className="text-gray-600 text-sm">
                {t('auth.signUpDescription')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth.firstName')}
                  </label>
                  <div className="relative">
                    <User className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      id="modal-firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full ps-10 pe-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="John"
                      disabled={isSubmitting || isGoogleLoading}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="modal-lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth.lastName')}
                  </label>
                  <input
                    type="text"
                    id="modal-lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Doe"
                    disabled={isSubmitting || isGoogleLoading}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="modal-signup-email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    id="modal-signup-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full ps-10 pe-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your email"
                    disabled={isSubmitting || isGoogleLoading}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="modal-signup-password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="modal-signup-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full ps-10 pe-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="At least 6 characters"
                    disabled={isSubmitting || isGoogleLoading}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isSubmitting || isGoogleLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isGoogleLoading}
                className="w-full py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white me-2"></div>
                    {t('common.loading')}
                  </>
                ) : (
                  t('auth.createAccount')
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">{t('auth.orContinueWith')}</span>
                </div>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting || isGoogleLoading}
              className="w-full py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isGoogleLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 me-2"></div>
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 me-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {t('auth.continueWithGoogle')}
                </>
              )}
            </button>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {t('auth.alreadyHaveAccount')}{' '}
                {onSwitchToLogin ? (
                  <button
                    type="button"
                    onClick={handleSwitchToLogin}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {t('auth.login')}
                  </button>
                ) : (
                  <a href="/login" className="text-blue-600 hover:underline font-medium">
                    {t('auth.login')}
                  </a>
                )}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
