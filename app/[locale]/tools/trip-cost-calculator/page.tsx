import React from 'react';
import { Metadata } from 'next';
import { Globe, RefreshCw, MousePointerClick } from 'lucide-react';

import { ToolsHeader, ToolsFooter } from '@/components/tools/ToolsChrome';
import TripCostCalculator from '@/components/tools/TripCostCalculator';
import EmbedCode from '@/components/tools/EmbedCode';
import { getTenantFromRequest, getTenantPublicConfig, getTenantDomainFromRequest } from '@/lib/tenant';
import { getTripCostConfig } from '@/lib/toolsApi';

export const dynamic = 'force-dynamic';

// One page, every domain: the widget + its embed code, in each site's own brand.
export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    if (tenant) {
      return {
        title: `Egypt Trip Cost Calculator — Free Embeddable Widget | ${tenant.name}`,
        description: `Estimate a full Egypt trip budget in seconds — and embed the calculator on your own website or blog with one line of code, free on ${tenant.name}.`,
        openGraph: {
          title: `Egypt Trip Cost Calculator | ${tenant.name}`,
          description: 'Free trip-budget widget — use it here or embed it on your own site with one line of code.',
          type: 'website',
          siteName: tenant.name,
        },
      };
    }
  } catch (error) {
    console.error('Error generating trip-cost-calculator metadata:', error);
  }
  return {
    title: 'Egypt Trip Cost Calculator — Free Embeddable Widget',
    description: 'Estimate a full Egypt trip budget in seconds — and embed the calculator on your own site, free.',
  };
}

export default async function TripCostCalculatorPage() {
  let tenantName = 'Egypt Excursions Online';
  let accent = '#E05D1A';
  let logoUrl = '/EEO-logo.png';
  let host = '';
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    if (tenant) {
      tenantName = tenant.name;
      accent = tenant.branding.primaryColor || accent;
      logoUrl = tenant.branding.logo || logoUrl;
    }
    host = await getTenantDomainFromRequest();
  } catch (error) {
    console.error('Error resolving tenant for trip-cost-calculator:', error);
  }
  const config = await getTripCostConfig(host);

  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen flex flex-col">
      <ToolsHeader name={tenantName} logoUrl={logoUrl} accent={accent} />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-extrabold text-slate-900">Egypt Trip Cost Calculator</h1>
            <p className="text-lg text-slate-600 mt-3">
              A realistic trip budget in seconds — hotels, food, transport, tours and the e-visa.
              Use it here, or add it to your own website for free.
            </p>
          </div>

          {/* the widget */}
          <div className="flex justify-center mt-10">
            <div className="flex flex-col items-center">
              <TripCostCalculator config={config} accent={accent} />
              <p className="text-xs text-slate-500 mt-3 text-center">
                ⚡ Free tool by{' '}
                {config.links.map((l, i) => (
                  <React.Fragment key={l.url}>
                    {i > 0 && ' · '}
                    <a href={l.url} className="font-semibold underline decoration-2 underline-offset-2" style={{ color: accent }}>
                      {l.name}
                    </a>
                  </React.Fragment>
                ))}
              </p>
            </div>
          </div>

          {/* embed it */}
          <div className="max-w-3xl mx-auto mt-14">
            <EmbedCode
              accent={accent}
              snippet={`<script src="${config.embedBase}/embed.js" data-tool="trip-cost-calculator" async></script>`}
            />
          </div>

          {/* why embed it */}
          <div className="max-w-3xl mx-auto mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <Globe className="w-5 h-5 mb-2.5" style={{ color: accent }} />
              <h3 className="font-bold text-slate-900 text-sm">Anyone can embed it</h3>
              <p className="text-sm text-slate-600 mt-1">
                Travel blogs, hotels, guides — one line of code, no signup, works on any website builder.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <MousePointerClick className="w-5 h-5 mb-2.5" style={{ color: accent }} />
              <h3 className="font-bold text-slate-900 text-sm">Keeps readers on your page</h3>
              <p className="text-sm text-slate-600 mt-1">
                An interactive budget planner your visitors actually use — instead of leaving to search for prices.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <RefreshCw className="w-5 h-5 mb-2.5" style={{ color: accent }} />
              <h3 className="font-bold text-slate-900 text-sm">Always up to date</h3>
              <p className="text-sm text-slate-600 mt-1">
                2026 prices maintained centrally — your embed updates automatically, nothing to maintain.
              </p>
            </div>
          </div>
        </div>
      </main>

      <ToolsFooter name={tenantName} accent={accent} />
    </div>
  );
}
