'use client';

import React, { useState } from 'react';
import { Rocket, Mail, Bell, Sparkles, Clock, MapPin } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

export default function ComingSoonPage() {
  const { tenant: config } = useTenant();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        setEmail('');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to subscribe. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const brandName = config?.name || 'Egypt Excursions Online';
  const primaryColor = config?.branding?.primaryColor || '#E63946';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 rounded-full opacity-20 animate-pulse" style={{ backgroundColor: primaryColor }} />
      <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full opacity-10 animate-pulse delay-1000" style={{ backgroundColor: primaryColor }} />
      <div className="absolute top-1/3 right-1/4 w-16 h-16 rounded-full opacity-15 animate-bounce" style={{ backgroundColor: primaryColor }} />

      <div className="relative max-w-2xl w-full text-center space-y-8">
        {/* Logo/Brand */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl shadow-2xl mb-4" style={{ backgroundColor: primaryColor }}>
            <Rocket className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            {brandName}
          </h1>
        </div>

        {/* Coming Soon Badge */}
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span className="text-white font-semibold">Coming Soon</span>
          <Sparkles className="w-5 h-5 text-yellow-400" />
        </div>

        {/* Description */}
        <div className="space-y-4">
          <p className="text-xl md:text-2xl text-slate-300 leading-relaxed">
            We're crafting something extraordinary for you.
          </p>
          <p className="text-slate-400">
            Our team is working hard to bring you the best travel experiences.
            Sign up below to be the first to know when we launch!
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-3 gap-4 py-6">
          <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
            <MapPin className="w-6 h-6 mx-auto mb-2" style={{ color: primaryColor }} />
            <p className="text-sm text-slate-300">Unique Tours</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
            <Clock className="w-6 h-6 mx-auto mb-2" style={{ color: primaryColor }} />
            <p className="text-sm text-slate-300">Easy Booking</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
            <Bell className="w-6 h-6 mx-auto mb-2" style={{ color: primaryColor }} />
            <p className="text-sm text-slate-300">24/7 Support</p>
          </div>
        </div>

        {/* Email Subscription */}
        {!isSubscribed ? (
          <form onSubmit={handleSubscribe} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-4 rounded-xl font-semibold text-white shadow-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                style={{ backgroundColor: primaryColor }}
              >
                {isSubmitting ? 'Subscribing...' : 'Notify Me'}
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            <p className="text-xs text-slate-500">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </form>
        ) : (
          <div className="p-6 rounded-2xl bg-green-500/20 border border-green-500/30">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <Bell className="w-5 h-5" />
              <span className="font-semibold">You're on the list!</span>
            </div>
            <p className="text-slate-300 mt-2">
              We'll notify you as soon as we launch.
            </p>
          </div>
        )}

        {/* Contact */}
        <div className="pt-8 border-t border-white/10">
          <p className="text-slate-500 text-sm">
            Questions? Contact us at{' '}
            <a 
              href={`mailto:${config?.contact?.email || 'support@excursions.online'}`}
              className="hover:underline"
              style={{ color: primaryColor }}
            >
              {config?.contact?.email || 'support@excursions.online'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

