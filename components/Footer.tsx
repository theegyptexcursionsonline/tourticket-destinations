'use client';

import React, { useState, useEffect } from "react";
import { ArrowUpRight, Facebook, Instagram, Twitter, Youtube, Phone, Mail, MessageSquare, Loader2, ScanLine, Smartphone, Sparkles, X } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import { Link } from '@/i18n/navigation';
import { Destination } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { useTenant } from '@/contexts/TenantContext';
import { useLocale, useTranslations } from 'next-intl';
import { isRTL } from '@/i18n/config';
import {
  getTenantFooterDestinations,
  getTenantDestinationHref,
  hasTenantScopedNavigationContent,
} from '@/lib/tenantNavigation';

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

// =================================================================
// --- FOOTER COMPONENT ---
// =================================================================
export default function Footer() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showAppModal, setShowAppModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [appLandingUrl, setAppLandingUrl] = useState('');
  const t = useTranslations();
  const locale = useLocale();
  const rtl = isRTL(locale);
  const appLandingPath = locale === 'en' ? '/coming-soon' : `/${locale}/coming-soon`;
  const appLandingLabel = appLandingUrl.replace(/^https?:\/\//, '');

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
    if (typeof window === 'undefined') return;
    setAppLandingUrl(`${window.location.origin}${appLandingPath}`);
  }, [appLandingPath]);

  useEffect(() => {
    let isMounted = true;
    if (!appLandingUrl) return;

    QRCode.toDataURL(appLandingUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        if (isMounted) setQrDataUrl(dataUrl);
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [appLandingUrl]);

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        // Use public destinations endpoint (tenant-aware)
        const tenantId = tenant?.tenantId || 'default';
        const tenantFallbackDestinations = getTenantFooterDestinations(tenantId);
        const response = await fetch(`/api/destinations?tenantId=${encodeURIComponent(tenantId)}&locale=${encodeURIComponent(locale)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.length > 0) {
            const hasTenantSpecific = hasTenantScopedNavigationContent(data.data, tenantId);
            if (hasTenantSpecific || !tenantFallbackDestinations) {
              setDestinations(data.data);
            } else {
              setDestinations(tenantFallbackDestinations as any);
            }
          } else if (tenantFallbackDestinations) {
            setDestinations(tenantFallbackDestinations as any);
          }
        } else if (tenantFallbackDestinations) {
          setDestinations(tenantFallbackDestinations as any);
        }
      } catch (error) {
        console.error("Failed to fetch destinations for footer:", error);
        const tenantId = tenant?.tenantId;
        const tenantFallbackDestinations = getTenantFooterDestinations(tenantId);
        if (tenantFallbackDestinations) {
          setDestinations(tenantFallbackDestinations as any);
        }
      }
    };
    fetchDestinations();
  }, [tenant?.tenantId, locale]);

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
        <section aria-labelledby="app-launch-title" className="relative mb-8 overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 text-white shadow-[0_32px_90px_-36px_rgba(15,23,42,0.75)] sm:rounded-[2.5rem]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(244,63,94,0.2),transparent_30%),radial-gradient(circle_at_48%_100%,rgba(251,146,60,0.1),transparent_28%)]" />
          <div className="absolute inset-y-0 right-0 hidden w-[46%] bg-[linear-gradient(145deg,#fb7185_0%,#ef4444_42%,#f97316_100%)] lg:block" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="relative grid lg:min-h-[610px] lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] lg:items-stretch">
            <div className="relative z-10 flex flex-col justify-center px-5 py-9 sm:px-10 sm:py-12 lg:px-12 lg:py-14 xl:px-16">
              <div className="mb-7 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2.5 shadow-sm backdrop-blur">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/85">{t('footer.comingSoon')}</span>
                </div>
              </div>

              <div className="max-w-2xl">
                <h3 id="app-launch-title" className="max-w-2xl text-[clamp(2.35rem,5vw,4.6rem)] font-black leading-[1.01] tracking-[-0.045em] text-white">
                  {t('footer.getTheApp')}
                </h3>
                <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                  {t('footer.getTheAppDesc')}
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 px-5 py-3 text-sm font-bold text-white shadow-[0_18px_34px_-18px_rgba(244,63,94,0.8)]">
                  <Sparkles size={17} className="text-amber-200" />
                  <span>{t('footer.launchingOn')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAppModal(true)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  <ScanLine size={17} className="text-rose-300" />
                  <span>{t('footer.scanToDownload')}</span>
                </button>
              </div>

              <div className="mt-7 grid w-full max-w-xl grid-cols-2 gap-2.5 sm:mt-8 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowAppModal(true)}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:p-3.5"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/[0.04] to-rose-400/[0.08] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative flex items-center gap-2.5 sm:gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-950 shadow-lg shadow-black/20 sm:h-11 sm:w-11">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="shrink-0">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{t('footer.downloadOn')}</span>
                      <span className="mt-0.5 block text-lg font-bold tracking-tight text-white">App Store</span>
                    </div>
                    <ArrowUpRight size={17} className="hidden text-white/35 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white sm:block" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAppModal(true)}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:p-3.5"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/[0.04] to-amber-300/[0.08] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative flex items-center gap-2.5 sm:gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-lg shadow-black/20 sm:h-11 sm:w-11">
                      <svg viewBox="0 0 24 24" width="24" height="24" className="shrink-0">
                        <path d="M3.18 23.67c-.38-.4-.56-.96-.56-1.68V2.01c0-.72.18-1.28.56-1.68l.1-.1L14.7 11.65v.26L3.28 23.57l-.1-.1z" fill="#4285F4" />
                        <path d="M18.54 15.79l-3.84-3.84v-.26l3.84-3.84.08.05 4.56 2.59c1.3.74 1.3 1.95 0 2.69l-4.56 2.59-.08.02z" fill="#FBBC04" />
                        <path d="M18.62 15.77L14.7 11.78 3.18 23.67c.43.46 1.14.51 1.96.06l13.48-7.96" fill="#EA4335" />
                        <path d="M18.62 7.85L5.14.27C4.32-.18 3.61-.13 3.18.33l11.52 11.45 3.92-3.93z" fill="#34A853" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{t('footer.getItOn')}</span>
                      <span className="mt-0.5 block text-lg font-bold tracking-tight text-white">Google Play</span>
                    </div>
                    <ArrowUpRight size={17} className="hidden text-white/35 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white sm:block" />
                  </div>
                </button>
              </div>
            </div>

            <div className="relative flex min-h-[390px] items-center justify-center overflow-hidden border-t border-white/10 bg-[linear-gradient(145deg,#fb7185_0%,#ef4444_46%,#f97316_100%)] lg:min-h-full lg:border-s lg:border-t-0 lg:bg-transparent">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[52px] border-white/10" />
              <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-slate-950/15 blur-2xl" />
              <div className="relative z-10 w-full px-4 py-8 sm:px-6 sm:py-10">
                <div className="mx-auto grid max-w-[440px] items-center gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <div className="order-2 hidden sm:order-1 sm:block">
                    <div className="mx-auto w-fit rounded-[1.5rem] border border-white/25 bg-slate-950/15 p-2 shadow-[0_24px_55px_-24px_rgba(15,23,42,0.55)] backdrop-blur-md">
                      <div className="rounded-[1.05rem] bg-white p-2.5">
                        {qrDataUrl ? (
                          <Image src={qrDataUrl} alt="Scan to download app" width={120} height={120} className="rounded-xl" />
                        ) : (
                          <div className="h-[120px] w-[120px] animate-pulse rounded-xl bg-slate-100" />
                        )}
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">{t('footer.scanToDownload')}</p>
                      {appLandingLabel ? (
                        <p className="mt-2 truncate text-xs text-white/70">{appLandingLabel}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="order-1 flex justify-center sm:order-2 sm:justify-end">
                    <div className="relative h-[300px] w-[184px] sm:h-[390px] sm:w-[232px]">
                      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-slate-700 to-slate-950 shadow-[0_38px_80px_-24px_rgba(15,23,42,0.8)] ring-1 ring-white/30" />
                      <div className="absolute left-1/2 top-0 z-20 h-7 w-24 -translate-x-1/2 rounded-b-3xl bg-slate-950" />
                      <div className="absolute inset-[5px] overflow-hidden rounded-[2.15rem] bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_56%,#020617_100%)]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.16),_transparent_34%)]" />
                        <div className="flex items-center justify-between px-5 pb-3 pt-8">
                          <span className="text-[10px] font-semibold tracking-[0.18em] text-white/75">9:41</span>
                          <div className="flex gap-1">
                            <div className="h-1.5 w-3 rounded-sm bg-white/55" />
                            <div className="h-1.5 w-1.5 rounded-full bg-white/55" />
                          </div>
                        </div>
                        <div className="space-y-3 px-4">
                          <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                              <Smartphone size={15} className="text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="h-2 w-16 rounded-full bg-white/30" />
                              <div className="mt-2 h-1.5 w-12 rounded-full bg-white/15" />
                            </div>
                          </div>
                          <div className="rounded-[1.35rem] border border-white/10 bg-white/10 p-3 backdrop-blur">
                            <div className="mb-3 h-20 rounded-[1rem] bg-white/10" />
                            <div className="h-2 w-24 rounded-full bg-white/30" />
                            <div className="mt-2 h-2 w-16 rounded-full bg-white/15" />
                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <svg key={i} className="h-2.5 w-2.5 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                ))}
                              </div>
                              <div className="h-6 w-14 rounded-full bg-white/20" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-[1.1rem] border border-white/10 bg-white/10 p-3 backdrop-blur">
                              <div className="h-9 rounded-xl bg-white/10" />
                              <div className="mt-3 h-1.5 w-12 rounded-full bg-white/20" />
                            </div>
                            <div className="rounded-[1.1rem] border border-white/10 bg-white/10 p-3 backdrop-blur">
                              <div className="h-9 rounded-xl bg-white/10" />
                              <div className="mt-3 h-1.5 w-12 rounded-full bg-white/20" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="absolute -left-6 bottom-14 rounded-2xl border border-white/20 bg-slate-950/35 px-4 py-3 text-white shadow-xl backdrop-blur-md">
                        <div className="flex items-center gap-2">
                          <Sparkles size={15} className="text-amber-300" />
                          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">{t('footer.comingSoon')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

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
                      href={getTenantDestinationHref(destination)}
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
                    href={getTenantDestinationHref(destination)}
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
