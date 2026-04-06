'use client';

import React, { useState, useEffect } from "react";
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MessageSquare, Loader2, Smartphone, X } from "lucide-react";
import Image from "next/image";
import { Link } from '@/i18n/navigation';
import { Destination } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { useTenant } from '@/contexts/TenantContext';
import { useLocale, useTranslations } from 'next-intl';
import { isRTL } from '@/i18n/config';

// Import the single, consolidated switcher component
import CurrencyLanguageSwitcher from '@/components/shared/CurrencyLanguageSwitcher';

// =================================================================
// --- FOOTER-SPECIFIC DATA ---
// =================================================================
const socialLinks = [
  { icon: Facebook, href: "https://web.facebook.com/EGexcursionsonline/?_rdc=1&_rdr#" },
  { icon: Instagram, href: "https://www.instagram.com/egyptexcursionsonline/" },
  { icon: Twitter, href: "https://x.com/excursiononline" },
  { icon: Youtube, href: "https://www.youtube.com/@egyptexcursionsonline6859" },
];

const PaymentIcons = {
  Visa: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" /><text x="20" y="16" textAnchor="middle" fill="#1A1F71" fontSize="10" fontWeight="bold">VISA</text></svg>,
  Mastercard: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" /><circle cx="16" cy="12" r="6" fill="#FF5F00" /><circle cx="24" cy="12" r="6" fill="#EB001B" fillOpacity="0.8" /></svg>,
  Amex: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="#006FCF" /><text x="20" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">AMEX</text></svg>,
  PayPal: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" /><path d="M14.5 7h3.2c1.6 0 2.8 1.2 2.8 2.7 0 1.8-1.5 3.3-3.3 3.3h-1.5L15 16h-1.5l1-9zm2.8 4.5c.8 0 1.5-.7 1.5-1.5s-.7-1.3-1.5-1.3h-1.3l-.4 2.8h1.7z" fill="#003087" /><path d="M19.5 7h3.2c1.6 0 2.8 1.2 2.8 2.7 0 1.8-1.5 3.3-3.3 3.3H21L20.3 16h-1.5l1-9zm2.8 4.5c.8 0 1.5-.7 1.5-1.5s-.7-1.3-1.5-1.3H21l-.4 2.8h1.7z" fill="#0070E0" /></svg>,
  Alipay: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="#00A1E9" /><text x="20" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">alipay</text></svg>,
  GPay: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" /><path d="M12 8.5h3.5v7H12v-7zm4.5 0h3v7h-3v-7zm4 0H24v7h-3.5v-7z" fill="#4285F4" /><path d="M25 10.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5z" fill="#EA4335" /><text x="20" y="20" textAnchor="middle" fill="#5f6368" fontSize="6">Pay</text></svg>,
};

const paymentMethods = [
  { name: "Visa", component: PaymentIcons.Visa },
  { name: "Mastercard", component: PaymentIcons.Mastercard },
  { name: "Amex", component: PaymentIcons.Amex },
  { name: "PayPal", component: PaymentIcons.PayPal },
  { name: "Alipay", component: PaymentIcons.Alipay },
  { name: "G Pay", component: PaymentIcons.GPay },
];

// Tenant-specific default destinations for footer
const tenantFooterDestinations: Record<string, { _id: string; name: string; slug: string }[]> = {
  'hurghada-speedboat': [
    { _id: 'sb-dest-1', name: 'Giftun Island', slug: 'giftun-island' },
    { _id: 'sb-dest-2', name: 'Orange Bay', slug: 'orange-bay' },
    { _id: 'sb-dest-3', name: 'Mahmya Island', slug: 'mahmya-island' },
    { _id: 'sb-dest-4', name: 'Paradise Island', slug: 'paradise-island' },
    { _id: 'sb-dest-5', name: 'Dolphin House', slug: 'dolphin-house' },
  ],
  'sharm-excursions-online': [
    { _id: 'sh-dest-1', name: 'Ras Mohammed', slug: 'ras-mohammed' },
    { _id: 'sh-dest-2', name: 'Tiran Island', slug: 'tiran-island' },
    { _id: 'sh-dest-3', name: 'Blue Hole', slug: 'blue-hole' },
    { _id: 'sh-dest-4', name: 'Naama Bay', slug: 'naama-bay' },
    { _id: 'sh-dest-5', name: 'White Island', slug: 'white-island' },
  ],
  'luxor-excursions': [
    { _id: 'lx-dest-1', name: 'Valley of Kings', slug: 'valley-of-kings' },
    { _id: 'lx-dest-2', name: 'Karnak Temple', slug: 'karnak-temple' },
    { _id: 'lx-dest-3', name: 'Luxor Temple', slug: 'luxor-temple' },
    { _id: 'lx-dest-4', name: 'West Bank', slug: 'west-bank' },
    { _id: 'lx-dest-5', name: 'Hatshepsut Temple', slug: 'hatshepsut-temple' },
  ],
  'cairo-excursions-online': [
    { _id: 'ca-dest-1', name: 'Giza Pyramids', slug: 'giza-pyramids' },
    { _id: 'ca-dest-2', name: 'Egyptian Museum', slug: 'egyptian-museum' },
    { _id: 'ca-dest-3', name: 'Khan El Khalili', slug: 'khan-el-khalili' },
    { _id: 'ca-dest-4', name: 'Islamic Cairo', slug: 'islamic-cairo' },
    { _id: 'ca-dest-5', name: 'Coptic Cairo', slug: 'coptic-cairo' },
  ],
};

// =================================================================
// --- FOOTER COMPONENT ---
// =================================================================
export default function Footer() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showAppModal, setShowAppModal] = useState(false);
  const t = useTranslations();
  const locale = useLocale();
  const rtl = isRTL(locale);

  // Get tenant branding and contact info
  const { tenant, getLogo, getSiteName, isFeatureEnabled } = useTenant();
  
  // Get social links from tenant or use defaults
  const tenantSocialLinks = tenant?.socialLinks || {};
  const displaySocialLinks = [
    tenantSocialLinks.facebook && { icon: Facebook, href: tenantSocialLinks.facebook },
    tenantSocialLinks.instagram && { icon: Instagram, href: tenantSocialLinks.instagram },
    tenantSocialLinks.twitter && { icon: Twitter, href: tenantSocialLinks.twitter },
    tenantSocialLinks.youtube && { icon: Youtube, href: tenantSocialLinks.youtube },
  ].filter(Boolean) as { icon: typeof Facebook; href: string }[];
  
  // Use default social links if tenant doesn't have any
  const finalSocialLinks = displaySocialLinks.length > 0 ? displaySocialLinks : socialLinks;
  
  // Get contact info from tenant
  const contactPhone = tenant?.contact?.phone || '';
  const contactEmail = tenant?.contact?.email || 'support@excursions.online';

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        // Use public destinations endpoint (tenant-aware)
        const tenantId = tenant?.tenantId || 'default';
        const response = await fetch(`/api/destinations?tenantId=${encodeURIComponent(tenantId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.length > 0) {
            // Check if any destinations are tenant-specific
            const hasTenantSpecific = data.data.some((d: any) => d.tenantId === tenantId);
            if (hasTenantSpecific || !tenantFooterDestinations[tenantId]) {
              setDestinations(data.data);
            } else {
              // Use tenant-specific defaults
              setDestinations(tenantFooterDestinations[tenantId] as any);
            }
          } else if (tenantFooterDestinations[tenantId]) {
            // Use tenant-specific defaults if no data returned
            setDestinations(tenantFooterDestinations[tenantId] as any);
          }
        } else if (tenantFooterDestinations[tenantId]) {
          // Use tenant-specific defaults on API error
          setDestinations(tenantFooterDestinations[tenantId] as any);
        }
      } catch (error) {
        console.error("Failed to fetch destinations for footer:", error);
        // Use tenant-specific defaults on error
        const tenantId = tenant?.tenantId;
        if (tenantId && tenantFooterDestinations[tenantId]) {
          setDestinations(tenantFooterDestinations[tenantId] as any);
        }
      }
    };
    fetchDestinations();
  }, [tenant?.tenantId]);

  // Listen for open-chatbot events (dispatched by openChatbot)
  useEffect(() => {
    const handler = () => {
      // Prefer openIntercom helper if available, then window.Intercom("show")
      try {
        if (typeof (window as any).openIntercom === 'function') {
          (window as any).openIntercom();
          return;
        }
        if (typeof (window as any).Intercom === 'function') {
          (window as any).Intercom('show');
          return;
        }
        // Try messenger instance directly
        if ((window as any).__intercomMessenger && typeof (window as any).__intercomMessenger.showMessenger === 'function') {
          (window as any).__intercomMessenger.showMessenger();
          return;
        }
        console.warn('Intercom not initialized yet');
      } catch (err) {
        console.error('Failed to open Intercom:', err);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('open-chatbot', handler as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-chatbot', handler as EventListener);
      }
    };
  }, []);

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(t('footer.enterValidEmail'));
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || t('footer.thankYouSubscribing'));
        setEmail('');
        setIsSubscribed(true);
      } else {
        toast.error(data.message || t('footer.subscriptionFailed'));
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error(t('footer.subscriptionError'));
    } finally {
      setIsLoading(false);
    }
  };

  const openChatbot = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log('🔵 Footer: Chat button clicked');
    
    // Try to open Intercom directly
    try {
      if (typeof window === 'undefined') {
        console.warn('🔴 Footer: window is undefined');
        return;
      }
      
      const win = window as any;
      
      console.log('🔵 Footer: Checking Intercom availability...');
      console.log('  - openIntercom:', typeof win.openIntercom);
      console.log('  - Intercom:', typeof win.Intercom);
      console.log('  - __intercomMessenger:', !!win.__intercomMessenger);
      
      // Method 1: Try openIntercom helper
      if (typeof win.openIntercom === 'function') {
        console.log('✅ Footer: Using openIntercom()');
        win.openIntercom();
        return;
      }
      
      // Method 2: Try window.Intercom('show')
      if (typeof win.Intercom === 'function') {
        console.log('✅ Footer: Using Intercom("show")');
        win.Intercom('show');
        return;
      }
      
      // Method 3: Try messenger instance directly
      if (win.__intercomMessenger) {
        console.log('🔵 Footer: Found __intercomMessenger, checking methods...');
        console.log('  - showMessenger:', typeof win.__intercomMessenger.showMessenger);
        console.log('  - show:', typeof win.__intercomMessenger.show);
        console.log('  - Methods:', Object.keys(win.__intercomMessenger));
        
        if (typeof win.__intercomMessenger.showMessenger === 'function') {
          console.log('✅ Footer: Using __intercomMessenger.showMessenger()');
          win.__intercomMessenger.showMessenger();
          return;
        }
        if (typeof win.__intercomMessenger.show === 'function') {
          console.log('✅ Footer: Using __intercomMessenger.show()');
          win.__intercomMessenger.show();
          return;
        }
      }
      
      console.warn('⚠️ Footer: Intercom not available, will retry...');
      
      // Method 4: Wait a bit and retry (in case Intercom is still loading)
      setTimeout(() => {
        console.log('🔵 Footer: Retrying after 500ms...');
        if (typeof win.openIntercom === 'function') {
          console.log('✅ Footer: Retry - Using openIntercom()');
          win.openIntercom();
          return;
        }
        if (typeof win.Intercom === 'function') {
          console.log('✅ Footer: Retry - Using Intercom("show")');
          win.Intercom('show');
          return;
        }
        if (win.__intercomMessenger) {
          if (typeof win.__intercomMessenger.showMessenger === 'function') {
            console.log('✅ Footer: Retry - Using __intercomMessenger.showMessenger()');
            win.__intercomMessenger.showMessenger();
            return;
          }
          if (typeof win.__intercomMessenger.show === 'function') {
            console.log('✅ Footer: Retry - Using __intercomMessenger.show()');
            win.__intercomMessenger.show();
            return;
          }
        }
        console.warn('⚠️ Footer: All methods failed, dispatching event');
        window.dispatchEvent(new CustomEvent('open-chatbot'));
      }, 500);
      
      // Also dispatch event immediately as fallback
      window.dispatchEvent(new CustomEvent('open-chatbot'));
      
    } catch (err) {
      console.error('🔴 Footer: Failed to open Intercom:', err);
      // Fallback to event dispatch
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-chatbot'));
      }
    }
  };

  const showBlog = isFeatureEnabled('enableBlog');
  
  return (
    <footer className="bg-white text-slate-700 pb-20 md:pb-24">
      <Toaster position="top-center" />
      <div className="container mx-auto px-4 py-12">

        {/* App Download Banner */}
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.22)]">
          {/* Layered gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-amber-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(244,63,94,0.16)_0%,_transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(251,191,36,0.14)_0%,_transparent_52%)]" />

          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(15,23,42,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.04) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

          {/* Floating accent orbs */}
          <div className="absolute top-1/2 right-[15%] -translate-y-1/2 h-[320px] w-[320px] rounded-full bg-rose-300/[0.14] blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-20 left-[10%] h-[240px] w-[240px] rounded-full bg-amber-300/[0.12] blur-[70px] pointer-events-none" />

          <div className="relative flex flex-col items-stretch gap-6 p-6 sm:gap-8 sm:p-10 lg:flex-row lg:items-center lg:gap-0 lg:py-0 lg:ps-12 lg:pe-0">

            {/* Left content */}
            <div className="flex-1 text-center lg:text-left lg:py-12">
              {/* Badge */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-xs font-medium tracking-wide text-rose-700">{t('footer.comingSoon')}</span>
              </div>

              <h3 className="mb-3 text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl">
                {t('footer.getTheApp')}
              </h3>
              <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-slate-600 sm:mb-8 sm:text-base lg:mx-0">
                {t('footer.getTheAppDesc')}
              </p>
              <p className="mx-auto mb-5 inline-flex rounded-full border border-rose-200 bg-white/85 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm lg:mx-0">
                {t('footer.launchingOn')}
              </p>

              {/* Store buttons */}
              <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2 lg:mx-0 lg:mb-0 lg:max-w-[26rem]">
                {/* App Store */}
                <button
                  type="button"
                  onClick={() => setShowAppModal(true)}
                  className="group inline-flex min-h-[72px] w-full items-center justify-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50/60 hover:shadow-[0_16px_32px_-20px_rgba(244,63,94,0.25)] sm:px-5"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="shrink-0">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="min-w-0 flex flex-col leading-tight text-left">
                    <span className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-500">{t('footer.downloadOn')}</span>
                    <span className="text-base font-bold">App Store</span>
                  </div>
                </button>

                {/* Google Play */}
                <button
                  type="button"
                  onClick={() => setShowAppModal(true)}
                  className="group inline-flex min-h-[72px] w-full items-center justify-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50/60 hover:shadow-[0_16px_32px_-20px_rgba(244,63,94,0.25)] sm:px-5"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" className="shrink-0">
                    <path d="M3.18 23.67c-.38-.4-.56-.96-.56-1.68V2.01c0-.72.18-1.28.56-1.68l.1-.1L14.7 11.65v.26L3.28 23.57l-.1-.1z" fill="#4285F4" />
                    <path d="M18.54 15.79l-3.84-3.84v-.26l3.84-3.84.08.05 4.56 2.59c1.3.74 1.3 1.95 0 2.69l-4.56 2.59-.08.02z" fill="#FBBC04" />
                    <path d="M18.62 15.77L14.7 11.78 3.18 23.67c.43.46 1.14.51 1.96.06l13.48-7.96" fill="#EA4335" />
                    <path d="M18.62 7.85L5.14.27C4.32-.18 3.61-.13 3.18.33l11.52 11.45 3.92-3.93z" fill="#34A853" />
                  </svg>
                  <div className="min-w-0 flex flex-col leading-tight text-left">
                    <span className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-500">{t('footer.getItOn')}</span>
                    <span className="text-base font-bold">Google Play</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Right: Phone mockup (mobile) */}
            <div className="w-full shrink-0 lg:w-auto">
              <div className="mx-auto flex w-full max-w-md justify-center pb-4 lg:hidden">
                <div className="relative h-[280px] w-[176px] sm:h-[300px] sm:w-[188px]">
                  <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-slate-800 to-slate-700 border border-white/40 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.4)] overflow-hidden">
                    <div className="absolute top-0 left-1/2 z-10 h-[22px] w-[84px] -translate-x-1/2 rounded-b-2xl bg-slate-900" />
                    <div className="absolute inset-[3px] rounded-[1.75rem] bg-gradient-to-b from-rose-400 via-rose-500 to-slate-900 overflow-hidden">
                      <div className="flex items-center justify-between px-5 pb-2 pt-7">
                        <span className="text-[8px] font-medium text-white/75">9:41</span>
                        <div className="flex gap-1">
                          <div className="h-1.5 w-3 rounded-sm bg-white/55" />
                          <div className="h-1.5 w-1.5 rounded-full bg-white/55" />
                        </div>
                      </div>
                      <div className="space-y-2.5 px-3.5 pt-1">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20">
                            <Smartphone size={12} className="text-white" />
                          </div>
                          <div className="h-2 w-14 rounded-full bg-white/30" />
                        </div>
                        <div className="h-2.5 w-24 rounded-full bg-white/20" />
                        <div className="h-2 w-16 rounded-full bg-white/15" />
                        <div className="rounded-xl border border-white/10 bg-white/10 p-2.5 backdrop-blur-sm">
                          <div className="mb-2 h-14 rounded-lg bg-white/12" />
                          <div className="mb-1.5 h-2 w-20 rounded-full bg-white/25" />
                          <div className="h-1.5 w-12 rounded-full bg-white/15" />
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <svg key={i} className="h-2.5 w-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                              ))}
                            </div>
                            <div className="h-5 w-10 rounded-md bg-rose-200/80" />
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/10 p-2.5 backdrop-blur-sm">
                          <div className="mb-2 h-8 rounded-lg bg-white/10" />
                          <div className="h-2 w-16 rounded-full bg-white/20" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -left-10 top-6 rounded-2xl border border-rose-100 bg-white/95 px-3 py-2 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.3)] backdrop-blur-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-600">{t('footer.comingSoon')}</p>
                  </div>
                </div>
              </div>

              {/* Desktop phone mockup */}
              <div className="hidden items-end justify-center gap-6 lg:flex lg:gap-8 lg:self-end">
                <div className="relative h-[320px] w-[200px]">
                  <div className="absolute inset-0 rounded-[2rem] rounded-b-none bg-gradient-to-b from-slate-800 to-slate-700 border border-white/[0.12] border-b-0 shadow-2xl shadow-black/40 overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90px] h-[26px] bg-slate-900 rounded-b-2xl z-10" />
                    <div className="absolute inset-[3px] inset-b-0 rounded-[1.75rem] rounded-b-none bg-gradient-to-b from-red-600 via-red-700 to-slate-900 overflow-hidden">
                      <div className="flex justify-between items-center px-6 pt-8 pb-2">
                        <span className="text-[9px] text-white/70 font-medium">9:41</span>
                        <div className="flex gap-1">
                          <div className="w-3 h-1.5 rounded-sm bg-white/50" />
                          <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                        </div>
                      </div>
                      <div className="px-4 pt-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                            <Smartphone size={14} className="text-white" />
                          </div>
                          <div className="h-2 w-16 bg-white/30 rounded-full" />
                        </div>
                        <div className="h-2.5 w-28 bg-white/20 rounded-full" />
                        <div className="h-2 w-20 bg-white/15 rounded-full" />
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 border border-white/10 mt-2">
                          <div className="w-full h-16 bg-white/10 rounded-lg mb-2" />
                          <div className="h-2 w-24 bg-white/25 rounded-full mb-1.5" />
                          <div className="h-1.5 w-16 bg-white/15 rounded-full" />
                          <div className="flex items-center justify-between mt-2.5">
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <svg key={i} className="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                              ))}
                            </div>
                            <div className="h-5 w-12 bg-red-500/60 rounded-md" />
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 border border-white/10">
                          <div className="w-full h-10 bg-white/10 rounded-lg mb-2" />
                          <div className="h-2 w-20 bg-white/20 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Modal */}
        {showAppModal && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-md sm:items-center sm:p-4"
            onClick={() => setShowAppModal(false)}
          >
            <div
              className="relative max-h-[calc(100vh-1rem)] w-full max-w-sm overflow-y-auto rounded-[2rem] bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-amber-50 px-6 pb-12 pt-8 text-center sm:px-8 sm:pb-14 sm:pt-10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(244,63,94,0.16)_0%,_transparent_60%)]" />
                <button
                  type="button"
                  onClick={() => setShowAppModal(false)}
                  className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-slate-700"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>

                <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-200 bg-white/90 shadow-sm backdrop-blur-sm">
                  <Smartphone size={28} className="text-rose-700" />
                </div>

                <h3 className="relative text-2xl font-extrabold tracking-tight text-slate-900">{t('footer.comingSoon')}</h3>
                <p className="relative mt-3 inline-flex rounded-full border border-rose-200 bg-white/85 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm">
                  {t('footer.launchingOn')}
                </p>
              </div>

              <div className="relative -mt-6 px-5 pb-6 sm:px-8 sm:pb-8">
                <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-lg">
                  <p className="text-sm text-slate-600">{t('footer.comingSoonDesc')}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAppModal(false)}
                  className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  {t('footer.gotIt')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Footer Content */}
        <div
          className="relative overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-6 mb-6 items-start bg-slate-50 border-slate-100 border rounded-3xl p-6 sm:p-8 lg:p-10 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]"
        >

          {/* Column 1: Brand Info, Trust Badge & Payment Methods */}
          <div className="space-y-6 lg:col-span-2 relative z-10">
            <Link href="/" className="inline-block">
              <Image
                src={getLogo()}
                alt={getSiteName()}
                width={160}
                height={80}
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </Link>
            <p className="text-sm leading-relaxed max-w-xs text-slate-600">
              {t('footer.tagline', { siteName: getSiteName() })}
            </p>

            {/* Trusted by clients */}
            <div className="rounded-2xl border p-5 bg-white border-slate-100">
              <p className="font-semibold text-slate-900 mb-3 text-base">{t('footer.trustedByClients')}</p>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-bold text-slate-900 leading-none">4.9</span>
                <div className="flex text-xl leading-none text-yellow-400">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
              </div>
              <p className="text-sm text-slate-500">{t('footer.averageRating')}</p>
            </div>

            {/* Payment Methods */}
            <div className="rounded-2xl border p-5 bg-white border-slate-100">
              <h3 className="font-bold text-base mb-4 text-slate-900">{t('footer.waysToPayTitle')}</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {paymentMethods.map((method, idx) => (
                  <div
                    key={idx}
                    title={method.name}
                    className="flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 hover:shadow-sm transition-shadow aspect-[5/3]"
                  >
                    <method.component />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Things To Do */}
          <div className="space-y-4 relative z-10">
            <h3 className="font-semibold text-base lg:text-lg tracking-wide text-slate-900">
              {t('footer.thingsToDo')}
            </h3>
            <ul className="space-y-2 text-sm text-slate-500">
              {destinations.slice(0, 5).map((destination) => (
                  <li key={destination._id}>
                    <Link
                      className="hover:text-[var(--primary-color)] transition-colors inline-flex items-center gap-2"
                      href={`/destinations/${destination.slug}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--primary-color)' }} />
                      {t('footer.thingsToDoIn', { destination: destination.name })}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          {/* Column 3: Destinations & Company Links */}
          <div className="space-y-4 relative z-10">
            <h3 className="font-semibold text-base lg:text-lg tracking-wide text-slate-900">
              {t('footer.topDestinations')}
            </h3>
            <ul className="space-y-2 text-sm text-slate-500">
              {destinations.slice(0, 5).map((destination) => (
                <li key={destination._id}>
                  <Link
                    className="hover:text-[var(--primary-color)] transition-colors inline-flex items-center gap-2"
                    href={`/destinations/${destination.slug}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    {destination.name}
                  </Link>
                </li>
              ))}
            </ul>
            
            <div className="mt-6">
              <h3 className="font-semibold text-base lg:text-lg tracking-wide text-slate-900">
                {t('footer.company')}
              </h3>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <Link
                    className="hover:text-[var(--primary-color)] transition-colors inline-flex items-center gap-2"
                    href="/contact"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    {t('footer.contact')}
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-[var(--primary-color)] transition-colors inline-flex items-center gap-2"
                    href="/about"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    {t('footer.aboutUs')}
                  </Link>
                </li>
                {showBlog && (
                  <li>
                    <Link
                      className="hover:text-[var(--primary-color)] transition-colors inline-flex items-center gap-2"
                      href="/blog"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      {t('footer.blog')}
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    className="hover:text-[var(--primary-color)] transition-colors inline-flex items-center gap-2"
                    href="/faqs"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    {t('footer.faq')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 4: Contact, Newsletter & Social Media */}
          <div className="space-y-6 lg:col-span-2 relative z-10">
            <div className="rounded-2xl border p-5 bg-white border-slate-100">
              <h3 className="font-semibold text-base lg:text-lg mb-4 text-slate-900 tracking-wide">{t('footer.contactInfo')}</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
                    <Phone size={18} />
                  </span>
                  <div className={`flex flex-col ${rtl ? 'text-right' : 'text-left'}`}>
                    <a
                      href={`tel:${contactPhone.replace(/\s/g, '')}`}
                      className="font-semibold text-slate-900 transition-colors hover:text-[var(--primary-color)]"
                    >
                      <bdi dir="ltr">{contactPhone}</bdi>
                    </a>
                    <span className="text-xs text-slate-500">{t('footer.support247')}</span>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-50 text-blue-600">
                    <Mail size={18} />
                  </span>
                  <div>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="font-semibold text-slate-900 transition-colors break-all hover:text-[var(--primary-color)]"
                    >
                      {contactEmail}
                    </a>
                    <p className="text-xs text-slate-500">{t('footer.repliesWithinHour')}</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="h-10 w-10 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600">
                    <MessageSquare size={18} />
                  </span>
                  <button
                    type="button"
                    onClick={openChatbot}
                    className="text-sm font-semibold text-slate-900 transition-colors cursor-pointer text-start hover:text-[var(--primary-color)]"
                    aria-label="Open chat"
                  >
                    {t('footer.chatWithUs')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="bg-white border-slate-100 rounded-2xl border p-5">
              {!isSubscribed ? (
                <>
                  <h4 className="font-semibold text-base mb-2 text-slate-900">
                    {t('footer.newsletterTitle')}
                  </h4>
                  <p className="text-xs mb-3 text-slate-500">
                    {t('footer.newsletterDescription')}
                  </p>
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('footer.emailPlaceholder')} 
                      className="w-full sm:flex-1 h-11 rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 shadow-sm bg-white border-slate-200 focus:ring-[var(--primary-color)]"
                      disabled={isLoading}
                    />
                    <button 
                      type="submit" 
                      className="h-11 w-full sm:w-auto px-4 sm:px-6 rounded-xl text-sm font-semibold flex items-center justify-center disabled:bg-slate-500 transition-colors text-white"
                      style={{ background: 'var(--gradient-primary)' }}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : t('footer.subscribe')}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <h4 className="font-bold text-sm mb-2 text-green-600">{t('footer.thankYou')}</h4>
                  <p className="text-sm text-slate-600">{t('footer.subscribedSuccess')}</p>
                </div>
              )}
            </div>
            
            {/* Social Media */}
            <div className="bg-white border-slate-100 rounded-2xl border p-5">
              <h4 className="font-semibold text-base mb-2 text-slate-900">{t('footer.followUs')}</h4>
              <p className="text-xs mb-3 text-slate-500">{t('footer.socialDescription')}</p>
              <div className="flex gap-3">
                {finalSocialLinks.map(({ icon: Icon, href }, i) => (
                  <a 
                    key={i} 
                    href={href} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-slate-900 text-white hover:bg-[var(--primary-color)] border-slate-200 flex items-center justify-center transition-colors border" 
                    aria-label={`Follow us on social media`}
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Currency/Language Switcher */}
        <div className="border-t pt-4 mb-4 border-slate-300">
          <CurrencyLanguageSwitcher variant="footer" />
        </div>

        {/* Legal Footer */}
        <div className="border-t pt-4 text-xs text-center border-slate-300 text-slate-500" dir={rtl ? 'rtl' : 'ltr'}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-3">
            <Link className="underline transition-colors hover:text-slate-700" href="/privacy">{t('footer.privacyPolicy')}</Link>
            <span className="hidden sm:inline">·</span>
            <Link className="underline transition-colors hover:text-slate-700" href="/terms">{t('footer.termsAndConditions')}</Link>
          </div>
          <p>
            {rtl ? (
              <>
                {t('footer.allRightsReserved')}. <bdi dir="ltr">{getSiteName()}</bdi> © {new Date().getFullYear()}
              </>
            ) : (
              <>
                © {new Date().getFullYear()} <bdi dir="ltr">{getSiteName()}</bdi>. {t('footer.allRightsReserved')}.
              </>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
