'use client';

import React from 'react';
import { WifiOff, Mail, Phone } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

export default function OfflinePage() {
  const { tenant: config } = useTenant();
  
  const brandName = config?.name || 'Egypt Excursions Online';
  const primaryColor = config?.branding?.primaryColor || '#E63946';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center mx-auto">
          <WifiOff className="w-12 h-12 text-slate-400" />
        </div>

        {/* Brand */}
        <h1 className="text-3xl font-bold text-slate-800">
          {brandName}
        </h1>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-200 border border-slate-300">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <span className="text-slate-600 font-medium text-sm">Currently Offline</span>
        </div>

        {/* Message */}
        <div className="space-y-4 bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
          <h2 className="text-2xl font-semibold text-slate-800">
            Website Temporarily Unavailable
          </h2>
          <p className="text-slate-600 leading-relaxed">
            This website is currently offline. Please check back later or contact us directly for assistance.
          </p>
        </div>

        {/* Contact Options */}
        <div className="space-y-4">
          <p className="text-slate-500 text-sm font-medium">
            Contact us directly:
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href={`mailto:${config?.contact?.email || 'support@excursions.online'}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <Mail className="w-5 h-5" />
              Email Us
            </a>
            {config?.contact?.phone && (
              <a 
                href={`tel:${config.contact.phone}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border-2 transition-all hover:bg-slate-50"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                <Phone className="w-5 h-5" />
                Call Us
              </a>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-400">
          We apologize for any inconvenience
        </p>
      </div>
    </div>
  );
}

