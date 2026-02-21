'use client';

import React from 'react';
import { Wrench, Clock, RefreshCw, Mail } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

export default function MaintenancePage() {
  const { tenant: config } = useTenant();
  
  const brandName = config?.name || 'Egypt Excursions Online';
  const primaryColor = config?.branding?.primaryColor || '#E63946';

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${primaryColor}20 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative max-w-lg w-full text-center space-y-8">
        {/* Icon */}
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center mx-auto animate-pulse">
            <Wrench className="w-12 h-12 text-amber-600" />
          </div>
          {/* Rotating gears effect */}
          <div className="absolute -top-2 -end-2 w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
            <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-dashed" />
          </div>
        </div>

        {/* Brand */}
        <h1 className="text-3xl font-bold text-slate-800">
          {brandName}
        </h1>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 border border-amber-200">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-amber-700 font-medium text-sm">Under Maintenance</span>
        </div>

        {/* Message */}
        <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-amber-100">
          <h2 className="text-2xl font-semibold text-slate-800">
            We'll be back soon!
          </h2>
          <p className="text-slate-600 leading-relaxed">
            We're currently performing scheduled maintenance to improve your experience. 
            This shouldn't take long.
          </p>
          
          {/* Estimated Time */}
          <div className="flex items-center justify-center gap-2 text-slate-500 py-4">
            <Clock className="w-5 h-5" />
            <span>Expected downtime: ~30 minutes</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
            style={{ backgroundColor: primaryColor }}
          >
            <RefreshCw className="w-5 h-5" />
            Check Again
          </button>
        </div>

        {/* Contact */}
        <div className="space-y-2">
          <p className="text-slate-500 text-sm">
            Need immediate assistance?
          </p>
          <a 
            href={`mailto:${config?.contact?.email || 'support@excursions.online'}`}
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
            style={{ color: primaryColor }}
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </a>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-400">
          Thank you for your patience
        </p>
      </div>
    </div>
  );
}

