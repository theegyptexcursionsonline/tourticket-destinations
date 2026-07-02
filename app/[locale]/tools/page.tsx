import React from 'react';
import { Metadata } from 'next';
import { Calculator, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getTenantFromRequest, getTenantPublicConfig } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    if (tenant) {
      return {
        title: `Free Travel Tools | ${tenant.name}`,
        description: `Free planning tools for your Egypt trip from ${tenant.name} — budget calculators and more.`,
      };
    }
  } catch (error) {
    console.error('Error generating tools index metadata:', error);
  }
  return { title: 'Free Travel Tools', description: 'Free planning tools for your Egypt trip.' };
}

export default async function ToolsIndexPage() {
  let accent = '#E05D1A';
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    if (tenant) accent = tenant.branding.primaryColor || accent;
  } catch (error) {
    console.error('Error resolving tenant for tools index:', error);
  }

  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Free travel tools</h1>
          <p className="text-lg text-slate-600 mb-10">Plan your Egypt trip with quick, free tools.</p>

          <Link
            href="/tools/trip-cost-calculator"
            className="group flex items-center justify-between border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-4">
              <span className="rounded-xl p-3" style={{ backgroundColor: `${accent}14`, color: accent }}>
                <Calculator className="w-6 h-6" />
              </span>
              <span>
                <span className="block text-lg font-bold text-slate-900">Egypt Trip Cost Calculator</span>
                <span className="block text-sm text-slate-500">
                  Estimate your full budget — hotels, food, transport, tours and visa.
                </span>
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
