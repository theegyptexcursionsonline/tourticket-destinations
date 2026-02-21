// components/auth/LoginModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup?: () => void;
  onSuccess?: () => void;
}

export default function LoginModal({ isOpen, onClose, onSwitchToSignup, onSuccess }: LoginModalProps) {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const t = useTranslations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password);
      toast.success('Login successful!');

      // Reset form
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
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle();
      toast.success('Login successful!');

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

  const handleSwitchToSignup = () => {
    if (onSwitchToSignup) {
      onSwitchToSignup();
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
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 end-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t('auth.welcomeBack')}
              </h2>
              <p className="text-gray-600 text-sm">
                {t('auth.loginDescription')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    id="modal-email"
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
                <label htmlFor="modal-password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="modal-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full ps-10 pe-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your password"
                    disabled={isSubmitting || isGoogleLoading}
                    required
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
                  t('auth.login')
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
                {t('auth.dontHaveAccount')}{' '}
                {onSwitchToSignup ? (
                  <button
                    type="button"
                    onClick={handleSwitchToSignup}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {t('auth.signup')}
                  </button>
                ) : (
                  <a href="/signup" className="text-blue-600 hover:underline font-medium">
                    {t('auth.signup')}
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
