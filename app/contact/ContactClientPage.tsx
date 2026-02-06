'use client';

import React, { useState, useEffect } from "react";
import { Phone, Mail, MessageSquare, Facebook, Instagram, Twitter, Youtube, Loader2, MapPin, Clock, Send } from "lucide-react";
import Image from "next/image";
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import Script from 'next/script';

// Reusable Header and Footer components
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTenant } from '@/contexts/TenantContext';

// Extend Window interface for reCAPTCHA
declare global {
  interface Window {
    grecaptcha: any;
  }
}

// =================================================================
// --- MODERN HERO SECTION COMPONENT ---
// =================================================================
function ModernHero() {
  return (
    <div className="relative h-[600px] bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 flex items-center justify-center text-white text-center px-4 overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <Image
          src="/about.png"
          alt="Contact us background"
          fill
          className="object-cover opacity-10"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-red-950/95" />
      </div>

      {/* Enhanced Decorative Elements */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 max-w-5xl mx-auto"
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="inline-flex items-center gap-2 mb-6"
        >
          <span className="px-6 py-2.5 bg-gradient-to-r from-red-600/30 to-orange-600/30 border border-red-400/40 rounded-full text-sm font-semibold backdrop-blur-md shadow-lg shadow-red-500/20">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            24/7 Expert Support Available
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6"
        >
          <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            Get in
          </span>
          <br />
          <span className="bg-gradient-to-r from-red-500 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Touch
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mt-6 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto text-slate-300 leading-relaxed font-light"
        >
          Have a question? We're here to help you plan your perfect Egyptian adventure.
          <br />
          <span className="text-red-400 font-medium">Our travel experts are ready to assist you.</span>
        </motion.p>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Verified Secure</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <span>Reply in 1 Hour</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>4.9/5 Rating</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Enhanced bottom wave with gradient */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg className="w-full h-24" viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none">
          <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" fill="white" fillOpacity="0.1"/>
          <path d="M0,96L48,90.7C96,85,192,75,288,74.7C384,75,480,85,576,85.3C672,85,768,75,864,69.3C960,64,1056,64,1152,69.3C1248,75,1344,85,1392,90.7L1440,96L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" fill="white"/>
        </svg>
      </div>
    </div>
  );
}

// =================================================================
// --- CONTACT US PAGE COMPONENT ---
// =================================================================
export default function ContactClientPage() {
  const { tenant } = useTenant();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    website: '', // Honeypot field
  });
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [formLoadTime, setFormLoadTime] = useState<number>(0);

  // Tenant-specific contact info
  const contactPhone = tenant?.contact?.phone || '';
  const contactEmail = tenant?.contact?.email || 'support@excursions.online';

  // Track when form loads to detect bot submissions
  useEffect(() => {
    setFormLoadTime(Date.now());
  }, []);

  const tenantSocials = tenant?.branding?.socialLinks || tenant?.socialLinks;
  const socialLinks = [
    tenantSocials?.facebook ? { icon: Facebook, href: tenantSocials.facebook } : { icon: Facebook, href: "https://web.facebook.com/EGexcursionsonline/?_rdc=1&_rdr#" },
    tenantSocials?.instagram ? { icon: Instagram, href: tenantSocials.instagram } : { icon: Instagram, href: "https://www.instagram.com/egyptexcursionsonline/" },
    tenantSocials?.twitter ? { icon: Twitter, href: tenantSocials.twitter } : { icon: Twitter, href: "https://x.com/excursiononline" },
    tenantSocials?.youtube ? { icon: Youtube, href: tenantSocials.youtube } : { icon: Youtube, href: "https://www.youtube.com/@egyptexcursionsonline6859" },
  ];

  const openChatbot = (e: React.MouseEvent) => {
    e.preventDefault();
    // Try to open Intercom directly
    try {
      if (typeof (window as any).openIntercom === 'function') {
        (window as any).openIntercom();
        return;
      }
      if (typeof (window as any).Intercom === 'function') {
        (window as any).Intercom('show');
        return;
      }
      // Fallback to event dispatch
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-chatbot'));
      }
    } catch (err) {
      console.error('Failed to open Intercom:', err);
      // Fallback to event dispatch
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-chatbot'));
      }
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Honeypot check - if filled, it's a bot
    if (formData.website) {
      console.log('Bot detected via honeypot');
      toast.error('Please try again.');
      return;
    }

    // Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill out all fields.');
      return;
    }

    // Timing check - prevent submissions faster than 3 seconds (likely bots)
    const timeSinceLoad = Date.now() - formLoadTime;
    if (timeSinceLoad < 3000) {
      console.log('Submission too fast - possible bot');
      toast.error('Please wait a moment before submitting.');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Sending your message...');

    try {
      // Get reCAPTCHA token
      let recaptchaToken = '';
      if (recaptchaLoaded && window.grecaptcha) {
        try {
          recaptchaToken = await window.grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            { action: 'contact_form' }
          );
        } catch (error) {
          console.error('reCAPTCHA error:', error);
          // Continue without reCAPTCHA if it fails
        }
      }

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          recaptchaToken,
          submissionTime: timeSinceLoad,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong');
      }

      toast.success('Message sent successfully!', { id: toastId });
      setFormData({ name: '', email: '', message: '', website: '' }); // Reset form
      setFormLoadTime(Date.now()); // Reset timer

    } catch (error: any) {
      toast.error(error.message || 'Failed to send message.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="bg-gradient-to-b from-white to-slate-50 text-slate-800">
      {/* Load reCAPTCHA v3 */}
      {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
          onLoad={() => setRecaptchaLoaded(true)}
        />
      )}
      <Toaster position="top-center" />
      <Header startSolid />
      <ModernHero />

      {/* Main Contact Section */}
      <main className="container mx-auto px-4 py-20 -mt-16">
        <div className="max-w-7xl mx-auto">

          {/* Quick Contact Cards - Glass Morphism Design */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
          >
            {/* Phone Card */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100" />
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all border border-white/20 overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative flex flex-col items-center text-center">
                  <div className="p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg shadow-red-500/30 group-hover:shadow-red-500/50 transition-all mb-4 group-hover:scale-110 transform">
                    <Phone size={28} className="text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 text-lg">Call Us</h3>
                  <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="text-red-600 font-bold hover:text-red-700 text-xl mb-3 hover:scale-105 transition-transform inline-block">
                    {contactPhone}
                  </a>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                    <Clock size={14} className="text-green-500" />
                    <span className="font-medium">Available 24/7</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Email Card */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100" />
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all border border-white/20 overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative flex flex-col items-center text-center">
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all mb-4 group-hover:scale-110 transform">
                    <Mail size={28} className="text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 text-lg">Email Us</h3>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-blue-600 font-semibold hover:text-blue-700 text-sm break-all hover:scale-105 transition-transform inline-block mb-3"
                  >
                    {contactEmail}
                  </a>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                    <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
                    </svg>
                    <span className="font-medium">Reply within 1 hour</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Chat Card */}
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              onClick={openChatbot}
              className="relative group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100" />
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all border border-white/20 overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative flex flex-col items-center text-center">
                  <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all mb-4 group-hover:scale-110 transform">
                    <MessageSquare size={28} className="text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 text-lg">Live Chat</h3>
                  <p className="text-green-600 font-bold text-lg mb-3">Start a conversation</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="font-medium">Instant support</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Contact Form - Takes 2 columns */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2"
            >
              <div className="relative bg-gradient-to-br from-white via-white to-red-50/30 rounded-3xl shadow-2xl p-8 lg:p-12 border border-white/60 overflow-hidden">
                {/* Decorative gradient orbs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-100/40 to-orange-100/40 rounded-full blur-3xl -z-0" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-100/40 to-purple-100/40 rounded-full blur-3xl -z-0" />

                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-10">
                    <div className="p-3 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl shadow-lg shadow-red-500/30">
                      <Send size={28} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-3xl font-black text-slate-900 mb-2 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Send us a Message
                      </h2>
                      <p className="text-slate-600 font-medium">We'll get back to you within 24 hours</p>

                      {/* Security badge */}
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-semibold text-green-700">Secure & Protected</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="group">
                      <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        Full Name
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="John Doe"
                          className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all placeholder:text-slate-400 font-medium text-slate-900 hover:border-slate-300 shadow-sm"
                          required
                        />
                        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-red-500/5 to-orange-500/5 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
                      </div>
                    </div>
                    <div className="group">
                      <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          id="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="john@example.com"
                          className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium text-slate-900 hover:border-slate-300 shadow-sm"
                          required
                        />
                        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
                      </div>
                    </div>
                  </div>

                  <div className="group">
                    <label htmlFor="message" className="block text-sm font-bold text-slate-700 mb-2.5 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                      Your Message
                    </label>
                    <div className="relative">
                      <textarea
                        id="message"
                        rows={6}
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder="Tell us how we can help you plan your perfect Egyptian adventure..."
                        className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none placeholder:text-slate-400 font-medium text-slate-900 hover:border-slate-300 shadow-sm"
                        required
                      ></textarea>
                      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
                    </div>
                  </div>

                  {/* Honeypot field - hidden from users, bots will fill it */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="website">Website</label>
                    <input
                      type="text"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative w-full h-16 px-8 rounded-2xl text-white overflow-hidden font-bold text-lg shadow-2xl shadow-red-500/30 disabled:cursor-not-allowed group"
                  >
                    {/* Animated gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 group-hover:from-red-700 group-hover:via-orange-700 group-hover:to-red-700 transition-all duration-300 bg-[length:200%_100%] animate-gradient" />

                    {/* Shine effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </div>

                    <span className="relative flex items-center justify-center gap-3">
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={22} />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
                        </>
                      )}
                    </span>
                  </motion.button>

                  <div className="space-y-3 pt-4">
                    {/* Security indicators */}
                    <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-green-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">SSL Encrypted</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1.5 text-blue-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">Spam Protected</span>
                      </div>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1.5 text-purple-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        <span className="font-semibold">GDPR Compliant</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 text-center leading-relaxed">
                      By submitting this form, you agree to our{' '}
                      <a href="/privacy" className="text-red-600 hover:text-red-700 font-medium underline">privacy policy</a>
                      {' '}and{' '}
                      <a href="/terms" className="text-red-600 hover:text-red-700 font-medium underline">terms of service</a>.
                    </p>

                    {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
                      <p className="text-xs text-slate-400 text-center leading-relaxed">
                        This site is protected by reCAPTCHA and the Google{' '}
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Privacy Policy</a> and{' '}
                        <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Terms of Service</a> apply.
                      </p>
                    )}
                  </div>
                  </form>
                </div>
              </div>
            </motion.div>

            {/* Sidebar - Additional Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              {/* Office Hours - Dark Gradient Card */}
              <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 rounded-3xl p-8 text-white shadow-2xl overflow-hidden border border-white/10">
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg shadow-red-500/30">
                      <Clock size={22} className="text-white" />
                    </div>
                    <h3 className="font-black text-xl">Office Hours</h3>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center py-3 border-b border-white/10 group hover:border-red-400/30 transition-colors">
                      <span className="text-slate-400 group-hover:text-slate-300 transition-colors">Monday - Friday</span>
                      <span className="font-bold text-white">9:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/10 group hover:border-red-400/30 transition-colors">
                      <span className="text-slate-400 group-hover:text-slate-300 transition-colors">Saturday</span>
                      <span className="font-bold text-white">10:00 AM - 4:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center py-3 group">
                      <span className="text-slate-400 group-hover:text-slate-300 transition-colors">Sunday</span>
                      <span className="font-bold text-red-400">Closed</span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-2xl border border-red-400/20 backdrop-blur-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">⚡</span>
                      <p className="text-xs text-red-100 leading-relaxed font-medium">
                        Emergency support available 24/7 via phone and live chat
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location - Clean White Card */}
              <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/60 overflow-hidden group">
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg shadow-red-500/20">
                      <MapPin size={22} className="text-white" />
                    </div>
                    <h3 className="font-black text-xl text-slate-900">Visit Us</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="font-bold text-slate-900 mb-1">Egypt Excursions Online</p>
                      <p className="text-sm text-slate-600">Cairo, Egypt</p>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed">
                      Located in the heart of Cairo, we're ready to help you plan your perfect Egyptian adventure. Visit us for personalized consultation.
                    </p>

                    {/* Map link button */}
                    <button className="w-full px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl">
                      <MapPin size={16} />
                      <span>View on Map</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Social Media - Gradient Card */}
              <div className="relative bg-gradient-to-br from-white via-white to-purple-50/30 rounded-3xl p-8 shadow-2xl border border-white/60 overflow-hidden">
                {/* Decorative element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-2xl" />

                <div className="relative z-10">
                  <h3 className="font-black text-xl text-slate-900 mb-3">Connect With Us</h3>
                  <p className="text-slate-600 text-sm mb-6 font-medium">Follow us for travel inspiration and exclusive updates</p>

                  <div className="grid grid-cols-4 gap-3">
                    {socialLinks.map(({ icon: Icon, href }, i) => (
                      <motion.a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.1, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                        className="aspect-square rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center hover:from-red-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-2xl hover:shadow-red-500/30 group"
                        aria-label={`Follow us on ${Icon.displayName || 'social media'}`}
                      >
                        <Icon size={22} className="group-hover:scale-110 transition-transform" />
                      </motion.a>
                    ))}
                  </div>

                  {/* Follower count (example) */}
                  <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-center gap-6 text-xs text-slate-600">
                    <div className="text-center">
                      <p className="font-black text-xl text-slate-900 mb-1">10K+</p>
                      <p className="font-medium">Followers</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div className="text-center">
                      <p className="font-black text-xl text-slate-900 mb-1">4.9</p>
                      <p className="font-medium">Rating</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div className="text-center">
                      <p className="font-black text-xl text-slate-900 mb-1">500+</p>
                      <p className="font-medium">Reviews</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* FAQ Section - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-24 relative"
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 rounded-3xl blur-xl opacity-60" />

            <div className="relative bg-white/60 backdrop-blur-sm rounded-3xl p-8 lg:p-12 border border-white/60 shadow-2xl overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-200/20 to-orange-200/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-3xl" />

              <div className="relative z-10">
                <div className="text-center mb-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                    className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-red-100 border border-red-200 rounded-full"
                  >
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-bold text-red-700">FAQ</span>
                  </motion.div>

                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 bg-gradient-to-r from-slate-900 via-red-900 to-slate-900 bg-clip-text text-transparent">
                    Frequently Asked Questions
                  </h2>
                  <p className="text-slate-600 font-medium text-lg">Quick answers to common questions</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                  {[
                    {
                      icon: "⏱️",
                      question: "How quickly will I get a response?",
                      answer: "We typically respond to emails within 1 hour during business hours and within 24 hours on weekends.",
                      color: "from-blue-500 to-cyan-500"
                    },
                    {
                      icon: "📝",
                      question: "Can I modify my booking?",
                      answer: "Yes! Contact us at least 24 hours before your tour for modifications. Some tours offer free cancellation.",
                      color: "from-purple-500 to-pink-500"
                    },
                    {
                      icon: "👥",
                      question: "Do you offer group discounts?",
                      answer: "Absolutely! We offer special rates for groups of 10 or more. Contact us for a custom quote.",
                      color: "from-green-500 to-emerald-500"
                    },
                    {
                      icon: "💳",
                      question: "What payment methods do you accept?",
                      answer: "We accept all major credit cards, PayPal, and bank transfers. Payment is secure and encrypted.",
                      color: "from-orange-500 to-red-500"
                    }
                  ].map((faq, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl blur-xl -z-10 from-red-500/20 to-orange-500/20" />
                      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all border border-white/60 h-full">
                        <div className="flex items-start gap-4 mb-3">
                          <div className={`p-3 bg-gradient-to-br ${faq.color} rounded-xl shadow-lg flex-shrink-0`}>
                            <span className="text-2xl">{faq.icon}</span>
                          </div>
                          <h4 className="font-black text-slate-900 text-lg leading-tight pt-2">{faq.question}</h4>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium pl-16">{faq.answer}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Additional help CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="mt-10 text-center"
                >
                  <p className="text-slate-600 mb-4 font-medium">Still have questions?</p>
                  <button
                    onClick={openChatbot}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl hover:shadow-red-500/30 transition-all hover:scale-105"
                  >
                    <MessageSquare size={20} />
                    <span>Chat with our team</span>
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      <Footer />
    </div>
  );
}


