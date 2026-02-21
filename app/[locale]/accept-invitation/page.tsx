'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface InvitationData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  expiresAt: string;
}

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError('No invitation token provided.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin/accept-invitation?token=${token}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Invalid or expired invitation.');
          setLoading(false);
          return;
        }

        setInvitationData(data.user);
        setLoading(false);
      } catch (err) {
        console.error('Error verifying token:', err);
        setError('Failed to verify invitation. Please try again.');
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to accept invitation.');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      toast.success('Account activated successfully!');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Failed to accept invitation. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Invitation</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to the Team!</h1>
            <p className="text-slate-600 mb-2">Your account has been activated successfully.</p>
            <p className="text-sm text-slate-500 mb-6">Redirecting to login...</p>
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Accept Invitation</h1>
          <p className="text-slate-600">Set your password to activate your account</p>
        </div>

        {/* Invitation Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-slate-200">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Welcome,</p>
              <p className="text-lg font-bold text-slate-900">
                {invitationData?.firstName} {invitationData?.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="text-sm text-slate-700 font-medium">{invitationData?.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Role</p>
              <p className="text-sm text-slate-700 font-medium capitalize">
                {invitationData?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Password Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                Create Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="Enter your password"
                  required
                  minLength={8}
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">Must be at least 8 characters</p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="Confirm your password"
                  required
                  minLength={8}
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Activating Account...</span>
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  <span>Activate Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-500">
            Need help?{' '}
            <a href="mailto:support@excursions.online" className="text-blue-600 hover:text-blue-700 font-medium">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 text-lg">Loading...</p>
          </div>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
