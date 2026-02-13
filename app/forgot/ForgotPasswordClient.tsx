'use client';

import React, { useState } from "react";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    setSuccessMessage('');
    
    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      // Send password reset email using Firebase
      await sendPasswordResetEmail(auth!, email, {
        url: window.location.origin + '/login',
        handleCodeInApp: false,
      });

      setIsSuccess(true);
      setSuccessMessage('If an account with this email exists, a password reset link has been sent. Please check your inbox.');
      setEmail('');

    } catch (error: any) {
      console.error('Password reset error:', error);

      // Provide user-friendly error messages
      let errorMessage = 'An unexpected error occurred.';

      if (error.code === 'auth/user-not-found') {
        // For security, we don't want to reveal if a user exists
        errorMessage = 'If an account with this email exists, a password reset link has been sent.';
        setIsSuccess(true);
        setSuccessMessage(errorMessage);
        setEmail('');
        return;
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const handleTryAgain = () => {
    setIsSuccess(false);
    setSuccessMessage('');
    setError('');
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-[#E9ECEE] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg bg-white p-8 sm:p-12 rounded-lg shadow-lg text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Check your email
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            {successMessage}
          </p>

          <div className="space-y-4">
            <Link 
              href="/login"
              className="block w-full h-12 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors text-center flex items-center justify-center"
            >
              Back to login
            </Link>
             <button
              onClick={handleTryAgain}
              className="w-full h-12 bg-slate-100 text-slate-700 rounded-md font-semibold hover:bg-slate-200 transition-colors"
            >
              Send another email
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#E9ECEE] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg bg-white p-8 sm:p-12 rounded-lg shadow-lg">
        <div className="mb-8">
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-6 text-sm font-medium"
          >
            <ArrowLeft size={16} />
            <span>Back to login</span>
          </Link>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-2">
            Forgot your password?
          </h1>
          <p className="text-center text-slate-500 text-sm">
            Enter your email and we'll send a reset link.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email address"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin mr-2" />
                Sending reset link...
              </>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

