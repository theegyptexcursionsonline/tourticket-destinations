'use client';

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslations } from 'next-intl';

export default function LoginClient() {
  const { user, login, loginWithGoogle, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const t = useTranslations();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Redirect if user is already authenticated
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      router.push('/user/dashboard');
    }
  }, [isAuthenticated, user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password);
      toast.success('Login successful! Redirecting...');

      // Add a small delay to ensure auth state is updated before redirect
      setTimeout(() => {
        router.push('/user/dashboard');
      }, 100);
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
      toast.success('Login successful! Redirecting...');

      // Add a small delay to ensure auth state is updated before redirect
      setTimeout(() => {
        router.push('/user/dashboard');
      }, 100);
    } catch (error: any) {
      // Only show error if it's not a user-cancelled action
      if (!error.message?.includes('closed') && !error.message?.includes('cancelled')) {
        toast.error(error.message || 'Google sign-in failed.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Shows a loader while the auth state is being determined or during redirection
  if (authLoading || (isAuthenticated && user)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <Toaster position="top-center" />
      <main className="flex-grow flex items-center justify-center py-12 px-4 bg-[#E9ECEE]">
        <div className="w-full max-w-lg bg-white p-8 sm:p-12 rounded-lg shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-2">
            {t('auth.signInToAccount')}
          </h1>
          <p className="text-center text-slate-500 mb-8">
            {t('auth.dontHaveAccount')}
            <Link href="/signup" className="text-blue-600 hover:underline ms-1">
              {t('auth.signup')}
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full ps-10 pe-4 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                  disabled={isSubmitting || isGoogleLoading}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full ps-10 pe-12 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                  disabled={isSubmitting || isGoogleLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  disabled={isSubmitting || isGoogleLoading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  disabled={isSubmitting || isGoogleLoading}
                />
                <span className="ms-2 text-sm text-slate-600">{t('auth.rememberMe')}</span>
              </label>
              <Link href="/forgot" className="text-sm text-blue-600 hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full h-12 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">{t('auth.orContinueWith')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting || isGoogleLoading}
              className="mt-4 w-full h-12 bg-white text-slate-700 border border-slate-300 rounded-md font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isGoogleLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-700 me-2"></div>
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
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">
              {t('auth.agreeToTerms')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

