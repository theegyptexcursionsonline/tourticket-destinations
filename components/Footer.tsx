'use client';

import React, { useState, useEffect } from "react";
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MessageSquare, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Destination } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { useTenant } from '@/contexts/TenantContext';

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
      toast.error("Please enter a valid email address.");
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
        toast.success(data.message || "Thank you for subscribing!");
        setEmail('');
        setIsSubscribed(true);
      } else {
        toast.error(data.message || "Subscription failed. Please try again.");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("An error occurred. Please try again later.");
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
              Book your adventure, skip the lines. Unforgettable tours, tickets, and activities for a memorable journey with{' '}
              {getSiteName()}.
            </p>

            {/* Trusted by clients */}
            <div className="rounded-2xl border p-5 bg-white border-slate-100">
              <p className="font-semibold text-slate-900 mb-3 text-base">Trusted by our clients</p>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-bold text-slate-900 leading-none">4.9</span>
                <div className="flex text-xl leading-none text-yellow-400">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
              </div>
              <p className="text-sm text-slate-500">Average rating from Tripadvisor</p>
            </div>

            {/* Payment Methods */}
            <div className="rounded-2xl border p-5 bg-white border-slate-100">
              <h3 className="font-bold text-base mb-4 text-slate-900">Ways you can pay</h3>
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
              Things to do
            </h3>
            <ul className="space-y-2 text-sm text-slate-500">
              {destinations.slice(0, 5).map((destination) => (
                  <li key={destination._id}>
                    <Link
                      className="hover:text-[var(--primary-color)] transition-colors inline-flex items-center gap-2"
                      href={`/destinations/${destination.slug}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--primary-color)' }} />
                      Things to do in {destination.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          {/* Column 3: Destinations & Company Links */}
          <div className="space-y-4 relative z-10">
            <h3 className="font-semibold text-base lg:text-lg tracking-wide text-slate-900">
              Top destinations
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
                Company
              </h3>
              <ul className="space-y-2 text-sm text-slate-500">
                <li>
                  <Link
                    className="hover:text-[var(--primary-color)] transition-colors inline-flex items-center gap-2"
                    href="/contact"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:text-[var(--primary-color)] transition-colors inline-flex items-center gap-2"
                    href="/about"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    About us
                  </Link>
                </li>
                {showBlog && (
                  <li>
                    <Link
                      className="hover:text-[var(--primary-color)] transition-colors inline-flex items-center gap-2"
                      href="/blog"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      Blog
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    className="hover:text-[var(--primary-color)] transition-colors inline-flex items-center gap-2"
                    href="/faqs"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 4: Contact, Newsletter & Social Media */}
          <div className="space-y-6 lg:col-span-2 relative z-10">
            <div className="rounded-2xl border p-5 bg-white border-slate-100">
              <h3 className="font-semibold text-base lg:text-lg mb-4 text-slate-900 tracking-wide">Contact information</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
                    <Phone size={18} />
                  </span>
                  <div className="flex flex-col">
                    <a
                      href={`tel:${contactPhone.replace(/\s/g, '')}`}
                      className="font-semibold text-slate-900 transition-colors hover:text-[var(--primary-color)]"
                    >
                      {contactPhone}
                    </a>
                    <span className="text-xs text-slate-500">(24/7 support)</span>
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
                    <p className="text-xs text-slate-500">Replies within 1 hour</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="h-10 w-10 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600">
                    <MessageSquare size={18} />
                  </span>
                  <button
                    type="button"
                    onClick={openChatbot}
                    className="text-sm font-semibold text-slate-900 transition-colors cursor-pointer text-left hover:text-[var(--primary-color)]"
                    aria-label="Open chat"
                  >
                    Chat with us
                  </button>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="bg-white border-slate-100 rounded-2xl border p-5">
              {!isSubscribed ? (
                <>
                  <h4 className="font-semibold text-base mb-2 text-slate-900">
                    Don&apos;t miss our travel updates
                  </h4>
                  <p className="text-xs mb-3 text-slate-500">
                    Get curated tips, exclusive offers, and destination guides straight to your inbox.
                  </p>
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email address" 
                      className="w-full sm:flex-1 h-11 rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 shadow-sm bg-white border-slate-200 focus:ring-[var(--primary-color)]"
                      disabled={isLoading}
                    />
                    <button 
                      type="submit" 
                      className="h-11 w-full sm:w-auto px-4 sm:px-6 rounded-xl text-sm font-semibold flex items-center justify-center disabled:bg-slate-500 transition-colors text-white"
                      style={{ background: 'var(--gradient-primary)' }}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : 'SUBSCRIBE'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <h4 className="font-bold text-sm mb-2 text-green-600">Thank you!</h4>
                  <p className="text-sm text-slate-600">You&apos;ve successfully subscribed to our newsletter.</p>
                </div>
              )}
            </div>
            
            {/* Social Media */}
            <div className="bg-white border-slate-100 rounded-2xl border p-5">
              <h4 className="font-semibold text-base mb-2 text-slate-900">Follow us on social media</h4>
              <p className="text-xs mb-3 text-slate-500">Join our community for live updates, reels, and travel inspiration.</p>
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
        <div className="border-t pt-4 text-xs text-center border-slate-300 text-slate-500">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-3">
            <Link className="underline transition-colors hover:text-slate-700" href="/privacy">Privacy policy</Link>
            <span className="hidden sm:inline">·</span>
            <Link className="underline transition-colors hover:text-slate-700" href="/terms">Terms and conditions</Link>
          </div>
          <p>© {new Date().getFullYear()} {getSiteName()}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
