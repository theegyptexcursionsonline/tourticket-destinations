'use client';

// app/admin/tenants/[tenantId]/page.tsx
// Edit tenant/brand page

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, Save, Globe, Palette, Mail, Phone, 
  Facebook, Twitter, Instagram, Youtube, Linkedin,
  Settings, Eye, Layout, Shield,
  ExternalLink, Copy, Loader2, Star, CheckCircle2, XCircle
} from 'lucide-react';

interface TenantData {
  _id: string;
  tenantId: string;
  name: string;
  slug: string;
  domain: string;
  domains: string[];
  isActive: boolean;
  isDefault: boolean;
  websiteStatus: 'active' | 'coming_soon' | 'maintenance' | 'offline';
  branding: {
    logo: string;
    logoAlt: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    borderRadius: string;
    headerVariant: 'light' | 'dark' | 'transparent';
    footerVariant: 'light' | 'dark' | 'minimal';
  };
  seo: {
    defaultTitle: string;
    titleSuffix: string;
    defaultDescription: string;
    defaultKeywords: string[];
    ogImage: string;
    twitterHandle: string;
    googleSiteVerification: string;
    bingSiteVerification: string;
  };
  contact: {
    email: string;
    phone: string;
    whatsapp: string;
    address: string;
    city: string;
    country: string;
    supportEmail: string;
    bookingEmail: string;
  };
  socialLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
    youtube: string;
    linkedin: string;
    tiktok: string;
  };
  features: {
    enableBlog: boolean;
    enableReviews: boolean;
    enableWishlist: boolean;
    enableAISearch: boolean;
    enableIntercom: boolean;
    enableMultiCurrency: boolean;
    enableMultiLanguage: boolean;
    enableLiveChat: boolean;
    enableNewsletter: boolean;
    enablePromoBar: boolean;
    enableHotelPickup: boolean;
    enableGiftCards: boolean;
  };
  localization: {
    defaultLanguage: string;
    supportedLanguages: string[];
    defaultCurrency: string;
    supportedCurrencies: string[];
    timezone: string;
    dateFormat: string;
  };
  payments: {
    currency: string;
    currencySymbol: string;
    supportedCurrencies: string[];
    stripeEnabled: boolean;
    paypalEnabled: boolean;
    bankTransferEnabled: boolean;
  };
  analytics: {
    googleAnalyticsId: string;
    facebookPixelId: string;
    hotjarId: string;
  };
  homepage: {
    heroType: 'slider' | 'video' | 'static';
    heroTitle: string;
    heroSubtitle: string;
    heroImage: string;
    heroImages: string[];
    heroVideoUrl: string;
    promoBarText: string;
    promoBarLink: string;
    promoBarActive: boolean;
    showDestinations: boolean;
    showCategories: boolean;
    showFeaturedTours: boolean;
    showPopularInterests: boolean;
    showDayTrips: boolean;
    showReviews: boolean;
    showFAQ: boolean;
    showAboutUs: boolean;
    showPromoSection: boolean;
    featuredTourIds: string[];
    featuredToursCount: number;
  };
}

const defaultTenant: Partial<TenantData> = {
  branding: {
    logo: '',
    logoAlt: '',
    favicon: '',
    primaryColor: '#E63946',
    secondaryColor: '#1D3557',
    accentColor: '#F4A261',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    fontFamily: 'Inter',
    borderRadius: '8px',
    headerVariant: 'light',
    footerVariant: 'dark',
  },
  seo: {
    defaultTitle: '',
    titleSuffix: '',
    defaultDescription: '',
    defaultKeywords: [],
    ogImage: '',
    twitterHandle: '',
    googleSiteVerification: '',
    bingSiteVerification: '',
  },
  contact: {
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    country: '',
    supportEmail: '',
    bookingEmail: '',
  },
  socialLinks: {
    facebook: '',
    twitter: '',
    instagram: '',
    youtube: '',
    linkedin: '',
    tiktok: '',
  },
  features: {
    enableBlog: true,
    enableReviews: true,
    enableWishlist: true,
    enableAISearch: true,
    enableIntercom: false,
    enableMultiCurrency: true,
    enableMultiLanguage: true,
    enableLiveChat: false,
    enableNewsletter: true,
    enablePromoBar: false,
    enableHotelPickup: true,
    enableGiftCards: false,
  },
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en'],
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD'],
    timezone: 'Africa/Cairo',
    dateFormat: 'DD/MM/YYYY',
  },
  payments: {
    currency: 'USD',
    currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP'],
    stripeEnabled: true,
    paypalEnabled: false,
    bankTransferEnabled: false,
  },
  analytics: {
    googleAnalyticsId: '',
    facebookPixelId: '',
    hotjarId: '',
  },
  homepage: {
    heroType: 'slider' as const,
    heroTitle: '',
    heroSubtitle: '',
    heroImage: '',
    heroImages: [],
    heroVideoUrl: '',
    promoBarText: '',
    promoBarLink: '',
    promoBarActive: false,
    showDestinations: true,
    showCategories: true,
    showFeaturedTours: true,
    showPopularInterests: true,
    showDayTrips: true,
    showReviews: true,
    showFAQ: true,
    showAboutUs: true,
    showPromoSection: false,
    featuredTourIds: [],
    featuredToursCount: 8,
  },
};

type TabType = 'general' | 'branding' | 'seo' | 'contact' | 'social' | 'features' | 'payments' | 'homepage';

const UI = {
  container: 'mx-auto w-full max-w-7xl',
  surface:
    'rounded-3xl border border-slate-200/70 bg-white/80 backdrop-blur shadow-sm',
  surfaceSolid:
    'rounded-3xl border border-slate-200/70 bg-white shadow-sm',
  input:
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 disabled:bg-slate-50 disabled:text-slate-500',
  textarea:
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 disabled:bg-slate-50 disabled:text-slate-500',
  select:
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 disabled:bg-slate-50 disabled:text-slate-500',
  checkbox: 'h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500',
};

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch tenant data
  const fetchTenant = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/tenants/${tenantId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // Merge with defaults to ensure all fields exist
        const merged = {
          ...defaultTenant,
          ...data.data,
          branding: { ...defaultTenant.branding, ...data.data.branding },
          seo: { ...defaultTenant.seo, ...data.data.seo },
          contact: { ...defaultTenant.contact, ...data.data.contact },
          socialLinks: { ...defaultTenant.socialLinks, ...data.data.socialLinks },
          features: { ...defaultTenant.features, ...data.data.features },
          localization: { ...defaultTenant.localization, ...data.data.localization },
          payments: { ...defaultTenant.payments, ...data.data.payments },
          analytics: { ...defaultTenant.analytics, ...data.data.analytics },
          homepage: { ...defaultTenant.homepage, ...data.data.homepage },
        };
        setTenant(merged as TenantData);
      } else {
        toast.error('Tenant not found');
        router.push('/admin/tenants');
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
      toast.error('Failed to load tenant');
      router.push('/admin/tenants');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, router]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  // Warn before leaving when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasChanges) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Update field helper
  const updateField = (path: string, value: unknown) => {
    if (!tenant) return;
    
    setHasChanges(true);
    const keys = path.split('.');
    const newTenant = { ...tenant };
    
    let current: Record<string, unknown> = newTenant;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) };
      current = current[keys[i]] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
    
    setTenant(newTenant as TenantData);
  };

  const copyToClipboard = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch (error) {
      console.error('Clipboard error:', error);
      toast.error('Could not copy to clipboard');
    }
  }, []);

  // Save tenant
  const saveTenant = useCallback(async () => {
    if (!tenant) return;
    
    try {
      setIsSaving(true);
      
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenant),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Tenant saved successfully!');
        setHasChanges(false);
      } else {
        toast.error(data.error || 'Failed to save tenant');
      }
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast.error('Failed to save tenant');
    } finally {
      setIsSaving(false);
    }
  }, [tenant, tenantId]);

  // Cmd/Ctrl+S to save
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's';
      if (!isSave) return;
      e.preventDefault();
      if (!isSaving && hasChanges) saveTenant();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasChanges, isSaving, saveTenant]);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'branding', label: 'Branding', icon: <Palette className="w-4 h-4" /> },
    { id: 'seo', label: 'SEO', icon: <Eye className="w-4 h-4" /> },
    { id: 'contact', label: 'Contact', icon: <Mail className="w-4 h-4" /> },
    { id: 'social', label: 'Social', icon: <Facebook className="w-4 h-4" /> },
    { id: 'features', label: 'Features', icon: <Shield className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <Globe className="w-4 h-4" /> },
    { id: 'homepage', label: 'Homepage', icon: <Layout className="w-4 h-4" /> },
  ];

  if (isLoading) {
    return (
      <div className={`${UI.container} py-10`}>
        <div className={`${UI.surface} p-6 md:p-8`}>
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-64 rounded bg-slate-200" />
                <div className="h-4 w-40 rounded bg-slate-200" />
              </div>
              <div className="h-10 w-32 rounded-2xl bg-slate-200" />
            </div>
            <div className="h-12 w-full rounded-2xl bg-slate-200" />
            <div className="h-80 w-full rounded-3xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className={`${UI.container} py-12`}>
        <div className={`${UI.surface} p-10 text-center`}>
          <p className="text-slate-600">Brand not found</p>
          <Link
            href="/admin/tenants"
            className="mt-3 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-slate-800 transition-colors"
          >
            Back to brands
          </Link>
        </div>
      </div>
    );
  }

  const primary = tenant.branding?.primaryColor || '#6366F1';

  return (
    <div className="space-y-6">
      {/* Sticky header + tabs */}
      <div className="-mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 sticky top-0 z-30 bg-gray-100/80 backdrop-blur supports-[backdrop-filter]:bg-gray-100/60 py-4">
        <div className={`${UI.container} space-y-4`}>
          <div className={`${UI.surface} p-5 md:p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <Link
                  href="/admin/tenants"
                  className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  aria-label="Back to brands"
                  title="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>

                <div className="flex items-start gap-4">
                  <div
                    className="h-12 w-12 rounded-2xl text-white flex items-center justify-center font-bold shadow"
                    style={{ backgroundColor: primary }}
                    aria-hidden="true"
                  >
                    {tenant.name?.charAt(0) || 'B'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 truncate">
                        {tenant.name}
                      </h1>
                      {tenant.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          <Star className="h-3.5 w-3.5" />
                          Default
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                          tenant.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${tenant.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {tenant.isActive ? 'Live' : 'Hidden'}
                      </span>
                      {hasChanges && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                          <span className="h-2 w-2 rounded-full bg-orange-500" />
                          Unsaved changes
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span className="font-medium">{tenant.domain}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`https://${tenant.domain}`, 'URL')}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
                        title="Copy URL"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                      <a
                        href={`https://${tenant.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 transition-colors"
                        title="Open website"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Visit
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={saveTenant}
                  disabled={isSaving || !hasChanges}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{isSaving ? 'Saving…' : 'Save changes'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className={`${UI.surfaceSolid} p-2`}>
            <nav className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className={`${UI.container} grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6`}>
        {/* Main */}
        <div className={`${UI.surface} p-6 md:p-8`}>
          {activeTab === 'general' && <GeneralTab tenant={tenant} updateField={updateField} />}
          {activeTab === 'branding' && <BrandingTab tenant={tenant} updateField={updateField} />}
          {activeTab === 'seo' && <SEOTab tenant={tenant} updateField={updateField} />}
          {activeTab === 'contact' && <ContactTab tenant={tenant} updateField={updateField} />}
          {activeTab === 'social' && <SocialTab tenant={tenant} updateField={updateField} />}
          {activeTab === 'features' && <FeaturesTab tenant={tenant} updateField={updateField} />}
          {activeTab === 'payments' && <PaymentsTab tenant={tenant} updateField={updateField} />}
          {activeTab === 'homepage' && <HomepageTab tenant={tenant} updateField={updateField} />}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 xl:sticky xl:top-6 self-start">
          <div className={`${UI.surface} p-5`}>
            <h3 className="text-sm font-semibold text-slate-900">Quick actions</h3>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => copyToClipboard(tenant.tenantId, 'Brand ID')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Copy className="h-4 w-4" />
                Copy Brand ID
              </button>
              <a
                href={`https://${tenant.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Preview site
              </a>
            </div>

            <div className="mt-5 border-t border-slate-200/70 pt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</h4>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    {tenant.isActive ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-600" />
                    )}
                    <span className="font-semibold text-slate-800">{tenant.isActive ? 'Live' : 'Hidden'}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {tenant.isActive ? 'Visible to customers' : 'Not visible on web'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Star className={`h-4 w-4 ${tenant.isDefault ? 'text-amber-500' : 'text-slate-300'}`} />
                    <span className="font-semibold text-slate-800">{tenant.isDefault ? 'Default' : 'Normal'}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {tenant.isDefault ? 'Fallback brand' : 'Standard brand'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={`${UI.surface} p-5`}>
            <h3 className="text-sm font-semibold text-slate-900">Design preview</h3>
            <p className="mt-1 text-xs text-slate-500">Quickly sanity-check colors & contrast.</p>
            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl shadow-inner" style={{ backgroundColor: tenant.branding?.primaryColor || '#6366F1' }} />
                <span className="h-10 w-10 rounded-2xl shadow-inner" style={{ backgroundColor: tenant.branding?.secondaryColor || '#1D3557' }} />
                <span className="h-10 w-10 rounded-2xl shadow-inner" style={{ backgroundColor: tenant.branding?.accentColor || '#F4A261' }} />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-10 rounded-2xl text-white font-semibold flex items-center justify-center shadow" style={{ backgroundColor: tenant.branding?.primaryColor || '#6366F1' }}>
                  Primary button
                </div>
                <div className="h-10 rounded-2xl border font-semibold flex items-center justify-center" style={{ borderColor: tenant.branding?.secondaryColor || '#1D3557', color: tenant.branding?.secondaryColor || '#1D3557' }}>
                  Secondary button
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Tab Components
function GeneralTab({ tenant, updateField }: { tenant: TenantData; updateField: (path: string, value: unknown) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">General</h3>
        <p className="mt-1 text-sm text-slate-500">Identity, domains, and visibility.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Brand ID</label>
          <input type="text" value={tenant.tenantId} disabled className={UI.input} />
          <p className="text-xs text-slate-500 mt-1">Cannot be changed after creation.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Brand Name <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            value={tenant.name}
            onChange={(e) => updateField('name', e.target.value)}
            className={UI.input}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Primary Domain <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            value={tenant.domain}
            onChange={(e) => updateField('domain', e.target.value.toLowerCase())}
            className={UI.input}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Additional Domains</label>
          <input
            type="text"
            value={tenant.domains?.join(', ') || ''}
            onChange={(e) =>
              updateField(
                'domains',
                e.target.value
                  .split(',')
                  .map((d) => d.trim().toLowerCase())
                  .filter(Boolean)
              )
            }
            placeholder="domain1.com, domain2.com"
            className={UI.input}
          />
          <p className="text-xs text-slate-500 mt-1">Comma-separated list of domains.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={tenant.isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
              className={`${UI.checkbox} mt-0.5`}
            />
            <div>
              <div className="font-semibold text-slate-900">Active (website is live)</div>
              <div className="text-sm text-slate-500">When disabled, the brand is hidden from the public site.</div>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={tenant.isDefault}
              onChange={(e) => updateField('isDefault', e.target.checked)}
              className={`${UI.checkbox} mt-0.5`}
            />
            <div>
              <div className="font-semibold text-slate-900">Default brand</div>
              <div className="text-sm text-slate-500">Used as the fallback when a domain doesn't match.</div>
            </div>
          </label>
        </div>
      </div>

      {/* Website Status */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
        <label className="block text-sm font-semibold text-slate-700 mb-3">Website Status</label>
        <p className="text-sm text-slate-500 mb-4">Control whether the website is accessible to visitors.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { value: 'active', label: 'Active', desc: 'Website fully functional', color: 'green' },
            { value: 'coming_soon', label: 'Coming Soon', desc: 'Show coming soon page', color: 'blue' },
            { value: 'maintenance', label: 'Maintenance', desc: 'Show maintenance page', color: 'amber' },
            { value: 'offline', label: 'Offline', desc: 'Website disabled', color: 'red' },
          ].map((status) => (
            <label
              key={status.value}
              className={`relative flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                tenant.websiteStatus === status.value
                  ? status.color === 'green' ? 'border-green-500 bg-green-50'
                  : status.color === 'blue' ? 'border-blue-500 bg-blue-50'
                  : status.color === 'amber' ? 'border-amber-500 bg-amber-50'
                  : 'border-red-500 bg-red-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="websiteStatus"
                value={status.value}
                checked={tenant.websiteStatus === status.value}
                onChange={(e) => updateField('websiteStatus', e.target.value)}
                className="sr-only"
              />
              <div className={`w-3 h-3 rounded-full mb-2 ${
                status.color === 'green' ? 'bg-green-500'
                : status.color === 'blue' ? 'bg-blue-500'
                : status.color === 'amber' ? 'bg-amber-500'
                : 'bg-red-500'
              }`} />
              <div className="font-semibold text-slate-900 text-sm">{status.label}</div>
              <div className="text-xs text-slate-500 mt-1">{status.desc}</div>
              {tenant.websiteStatus === status.value && (
                <CheckCircle2 className={`absolute top-3 right-3 w-5 h-5 ${
                  status.color === 'green' ? 'text-green-500'
                  : status.color === 'blue' ? 'text-blue-500'
                  : status.color === 'amber' ? 'text-amber-500'
                  : 'text-red-500'
                }`} />
              )}
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Note: To enable per-tenant status, add the TENANT_WEBSITE_STATUS environment variable with format: {`{"tenant-id": "status"}`}
        </p>
      </div>
    </div>
  );
}

function BrandingTab({ tenant, updateField }: { tenant: TenantData; updateField: (path: string, value: unknown) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Branding</h3>
        <p className="mt-1 text-sm text-slate-500">Logos, colors, typography, and layout variants.</p>
      </div>

      {/* Logo & Favicon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Logo URL</label>
          <input
            type="text"
            value={tenant.branding?.logo || ''}
            onChange={(e) => updateField('branding.logo', e.target.value)}
            placeholder="/logo.png or https://..."
            className={UI.input}
          />
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Preview</div>
            <div className="mt-3 flex items-center gap-3">
              {tenant.branding?.logo ? (
                <img src={tenant.branding.logo} alt="Logo preview" className="h-10 w-auto object-contain" />
              ) : (
                <div className="h-10 w-10 rounded-2xl bg-slate-100 border border-slate-200" />
              )}
              <div className="text-sm font-semibold text-slate-800 truncate">{tenant.name}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Favicon URL</label>
          <input
            type="text"
            value={tenant.branding?.favicon || ''}
            onChange={(e) => updateField('branding.favicon', e.target.value)}
            placeholder="/favicon.ico"
            className={UI.input}
          />
          <p className="mt-2 text-xs text-slate-500">Tip: use a square icon (32×32 or 48×48).</p>
        </div>
      </div>

      {/* Colors */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Brand colors</h4>
            <p className="mt-1 text-xs text-slate-500">Keep contrast readable across buttons and text.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: 'primaryColor', label: 'Primary' },
            { key: 'secondaryColor', label: 'Secondary' },
            { key: 'accentColor', label: 'Accent' },
            { key: 'backgroundColor', label: 'Background' },
          ].map(({ key, label }) => (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {label}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={(tenant.branding as Record<string, string>)?.[key] || '#000000'}
                  onChange={(e) => updateField(`branding.${key}`, e.target.value)}
                  className="w-11 h-11 rounded-2xl cursor-pointer border border-slate-200 bg-white"
                />
                <input
                  type="text"
                  value={(tenant.branding as Record<string, string>)?.[key] || ''}
                  onChange={(e) => updateField(`branding.${key}`, e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Font family</label>
          <select
            value={tenant.branding?.fontFamily || 'Inter'}
            onChange={(e) => updateField('branding.fontFamily', e.target.value)}
            className={UI.select}
          >
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Poppins">Poppins</option>
            <option value="Open Sans">Open Sans</option>
            <option value="Lato">Lato</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Playfair Display">Playfair Display</option>
          </select>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Border radius</label>
          <select
            value={tenant.branding?.borderRadius || '8px'}
            onChange={(e) => updateField('branding.borderRadius', e.target.value)}
            className={UI.select}
          >
            <option value="0px">Sharp (0px)</option>
            <option value="4px">Subtle (4px)</option>
            <option value="8px">Rounded (8px)</option>
            <option value="12px">More Rounded (12px)</option>
            <option value="16px">Very Rounded (16px)</option>
          </select>
        </div>
      </div>

      {/* Header/Footer Variants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Header style</label>
          <select
            value={tenant.branding?.headerVariant || 'light'}
            onChange={(e) => updateField('branding.headerVariant', e.target.value)}
            className={UI.select}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="transparent">Transparent</option>
          </select>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Footer style</label>
          <select
            value={tenant.branding?.footerVariant || 'dark'}
            onChange={(e) => updateField('branding.footerVariant', e.target.value)}
            className={UI.select}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="minimal">Minimal</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function SEOTab({ tenant, updateField }: { tenant: TenantData; updateField: (path: string, value: unknown) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">SEO</h3>
        <p className="mt-1 text-sm text-slate-500">Defaults used across pages when specific metadata isn’t set.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Default page title</label>
          <input
            type="text"
            value={tenant.seo?.defaultTitle || ''}
            onChange={(e) => updateField('seo.defaultTitle', e.target.value)}
            placeholder="Your Brand - Tours & Excursions"
            className={UI.input}
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Title suffix</label>
          <input
            type="text"
            value={tenant.seo?.titleSuffix || ''}
            onChange={(e) => updateField('seo.titleSuffix', e.target.value)}
            placeholder="| Your Brand Name"
            className={UI.input}
          />
          <p className="text-xs text-slate-500 mt-2">Added to the end of all page titles.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Meta description</label>
          <textarea
            value={tenant.seo?.defaultDescription || ''}
            onChange={(e) => updateField('seo.defaultDescription', e.target.value)}
            rows={4}
            placeholder="Describe your brand and services..."
            className={UI.textarea}
          />
          <p className="text-xs text-slate-500 mt-2">{(tenant.seo?.defaultDescription || '').length}/160 characters</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Keywords</label>
          <input
            type="text"
            value={tenant.seo?.defaultKeywords?.join(', ') || ''}
            onChange={(e) =>
              updateField(
                'seo.defaultKeywords',
                e.target.value
                  .split(',')
                  .map((k) => k.trim())
                  .filter(Boolean)
              )
            }
            placeholder="tours, excursions, travel, egypt"
            className={UI.input}
          />
          <p className="text-xs text-slate-500 mt-2">Comma-separated keywords.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Open Graph image URL</label>
          <input
            type="text"
            value={tenant.seo?.ogImage || ''}
            onChange={(e) => updateField('seo.ogImage', e.target.value)}
            placeholder="/og-image.jpg or https://..."
            className={UI.input}
          />
          <p className="text-xs text-slate-500 mt-2">Recommended size: 1200×630.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Twitter handle</label>
            <input
              type="text"
              value={tenant.seo?.twitterHandle || ''}
              onChange={(e) => updateField('seo.twitterHandle', e.target.value)}
              placeholder="@yourbrand"
              className={UI.input}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Google site verification</label>
            <input
              type="text"
              value={tenant.seo?.googleSiteVerification || ''}
              onChange={(e) => updateField('seo.googleSiteVerification', e.target.value)}
              placeholder="verification code"
              className={UI.input}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactTab({ tenant, updateField }: { tenant: TenantData; updateField: (path: string, value: unknown) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Contact</h3>
        <p className="mt-1 text-sm text-slate-500">Support and booking contact details shown across the site.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            <Mail className="w-4 h-4 inline mr-1" /> Email
          </label>
          <input
            type="email"
            value={tenant.contact?.email || ''}
            onChange={(e) => updateField('contact.email', e.target.value)}
            placeholder="info@yourdomain.com"
            className={UI.input}
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            <Phone className="w-4 h-4 inline mr-1" /> Phone
          </label>
          <input
            type="tel"
            value={tenant.contact?.phone || ''}
            onChange={(e) => updateField('contact.phone', e.target.value)}
            placeholder="+20 100 000 0000"
            className={UI.input}
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">WhatsApp</label>
          <input
            type="tel"
            value={tenant.contact?.whatsapp || ''}
            onChange={(e) => updateField('contact.whatsapp', e.target.value)}
            placeholder="+201000000000"
            className={UI.input}
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Support email</label>
          <input
            type="email"
            value={tenant.contact?.supportEmail || ''}
            onChange={(e) => updateField('contact.supportEmail', e.target.value)}
            placeholder="support@yourdomain.com"
            className={UI.input}
          />
        </div>

        <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
          <input
            type="text"
            value={tenant.contact?.address || ''}
            onChange={(e) => updateField('contact.address', e.target.value)}
            placeholder="123 Street Name"
            className={UI.input}
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">City</label>
          <input
            type="text"
            value={tenant.contact?.city || ''}
            onChange={(e) => updateField('contact.city', e.target.value)}
            placeholder="Cairo"
            className={UI.input}
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Country</label>
          <input
            type="text"
            value={tenant.contact?.country || ''}
            onChange={(e) => updateField('contact.country', e.target.value)}
            placeholder="Egypt"
            className={UI.input}
          />
        </div>
      </div>
    </div>
  );
}

function SocialTab({ tenant, updateField }: { tenant: TenantData; updateField: (path: string, value: unknown) => void }) {
  const socialFields = [
    { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/yourbrand' },
    { key: 'twitter', label: 'Twitter/X', icon: Twitter, placeholder: 'https://twitter.com/yourbrand' },
    { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/yourbrand' },
    { key: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@yourbrand' },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/company/yourbrand' },
  ];
  
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Social</h3>
        <p className="mt-1 text-sm text-slate-500">Links shown in the footer and shared pages.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {socialFields.map(({ key, label, icon: Icon, placeholder }) => (
          <div key={key} className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              <Icon className="w-4 h-4 inline mr-1" /> {label}
            </label>
            <input
              type="url"
              value={(tenant.socialLinks as Record<string, string>)?.[key] || ''}
              onChange={(e) => updateField(`socialLinks.${key}`, e.target.value)}
              placeholder={placeholder}
              className={UI.input}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturesTab({ tenant, updateField }: { tenant: TenantData; updateField: (path: string, value: unknown) => void }) {
  const featureGroups = [
    {
      title: 'Content Features',
      features: [
        { key: 'enableBlog', label: 'Blog', description: 'Enable blog posts and articles' },
        { key: 'enableReviews', label: 'Reviews', description: 'Allow customer reviews on tours' },
        { key: 'enableWishlist', label: 'Wishlist', description: 'Let users save favorite tours' },
      ],
    },
    {
      title: 'Search & AI',
      features: [
        { key: 'enableAISearch', label: 'AI Search', description: 'Enable AI-powered search assistant' },
        { key: 'enableLiveChat', label: 'Live Chat', description: 'Enable live chat support' },
        { key: 'enableIntercom', label: 'Intercom', description: 'Enable Intercom widget' },
      ],
    },
    {
      title: 'E-commerce',
      features: [
        { key: 'enableMultiCurrency', label: 'Multi-Currency', description: 'Support multiple currencies' },
        { key: 'enableMultiLanguage', label: 'Multi-Language', description: 'Support multiple languages' },
        { key: 'enableHotelPickup', label: 'Hotel Pickup', description: 'Offer hotel pickup service' },
        { key: 'enableGiftCards', label: 'Gift Cards', description: 'Sell gift cards' },
      ],
    },
    {
      title: 'Marketing',
      features: [
        { key: 'enableNewsletter', label: 'Newsletter', description: 'Show newsletter signup' },
        { key: 'enablePromoBar', label: 'Promo Bar', description: 'Show promotional banner' },
      ],
    },
  ];
  
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Features</h3>
        <p className="mt-1 text-sm text-slate-500">Enable or disable modules per brand.</p>
      </div>

      {featureGroups.map((group) => (
        <div key={group.title} className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
          <h4 className="text-sm font-semibold text-slate-900">{group.title}</h4>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.features.map(({ key, label, description }) => (
              <label
                key={key}
                className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={(tenant.features as Record<string, boolean>)?.[key] || false}
                  onChange={(e) => updateField(`features.${key}`, e.target.checked)}
                  className={`${UI.checkbox} mt-0.5`}
                />
                <div className="min-w-0">
                  <span className="font-semibold text-slate-900">{label}</span>
                  <p className="text-sm text-slate-500">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentsTab({ tenant, updateField }: { tenant: TenantData; updateField: (path: string, value: unknown) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Payments</h3>
        <p className="mt-1 text-sm text-slate-500">Currencies and payment method availability per brand.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Default currency</label>
            <select
              value={tenant.payments?.currency || 'USD'}
              onChange={(e) => updateField('payments.currency', e.target.value)}
              className={UI.select}
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="EGP">EGP - Egyptian Pound</option>
              <option value="AED">AED - UAE Dirham</option>
              <option value="SAR">SAR - Saudi Riyal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Currency symbol</label>
            <input
              type="text"
              value={tenant.payments?.currencySymbol || '$'}
              onChange={(e) => updateField('payments.currencySymbol', e.target.value)}
              className={UI.input}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Supported currencies</label>
            <input
              type="text"
              value={tenant.payments?.supportedCurrencies?.join(', ') || ''}
              onChange={(e) =>
                updateField(
                  'payments.supportedCurrencies',
                  e.target.value
                    .split(',')
                    .map((c) => c.trim().toUpperCase())
                    .filter(Boolean)
                )
              }
              placeholder="USD, EUR, GBP, EGP"
              className={UI.input}
            />
            <p className="mt-2 text-xs text-slate-500">Comma-separated ISO currency codes.</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
        <h4 className="text-sm font-semibold text-slate-900">Payment methods</h4>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'stripeEnabled', label: 'Stripe', description: 'Credit/Debit cards' },
            { key: 'paypalEnabled', label: 'PayPal', description: 'PayPal payments' },
            { key: 'bankTransferEnabled', label: 'Bank transfer', description: 'Direct bank transfer' },
          ].map(({ key, label, description }) => (
            <label
              key={key}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={(tenant.payments as Record<string, boolean>)?.[key] || false}
                onChange={(e) => updateField(`payments.${key}`, e.target.checked)}
                className={`${UI.checkbox} mt-0.5`}
              />
              <div className="min-w-0">
                <span className="font-semibold text-slate-900">{label}</span>
                <p className="text-sm text-slate-500">{description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomepageTab({ tenant, updateField }: { tenant: TenantData; updateField: (path: string, value: unknown) => void }) {
  const [tours, setTours] = React.useState<Array<{ _id: string; title: string }>>([]);
  const [isLoadingTours, setIsLoadingTours] = React.useState(false);

  // Fetch tours for this tenant
  React.useEffect(() => {
    const fetchTours = async () => {
      setIsLoadingTours(true);
      try {
        const response = await fetch(`/api/admin/tours?tenantId=${tenant.tenantId}`);
        const data = await response.json();
        if (data.success) {
          setTours(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch tours:', error);
      } finally {
        setIsLoadingTours(false);
      }
    };
    fetchTours();
  }, [tenant.tenantId]);

  const toggleFeaturedTour = (tourId: string) => {
    const currentIds = tenant.homepage?.featuredTourIds || [];
    if (currentIds.includes(tourId)) {
      updateField('homepage.featuredTourIds', currentIds.filter(id => id !== tourId));
    } else {
      updateField('homepage.featuredTourIds', [...currentIds, tourId]);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Homepage</h3>
        <p className="text-sm text-slate-500 mt-1">Configure what appears on the homepage for this brand.</p>
      </div>
      
      {/* Hero Section Settings */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
        <h4 className="font-semibold text-slate-900 mb-4">Hero section</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Hero type</label>
            <select
              value={tenant.homepage?.heroType || 'slider'}
              onChange={(e) => updateField('homepage.heroType', e.target.value)}
              className={UI.select}
            >
              <option value="slider">Image Slider</option>
              <option value="video">Video Background</option>
              <option value="static">Static Image</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Hero title</label>
            <input
              type="text"
              value={tenant.homepage?.heroTitle || ''}
              onChange={(e) => updateField('homepage.heroTitle', e.target.value)}
              placeholder="Discover Amazing Tours"
              className={UI.input}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Hero subtitle</label>
            <input
              type="text"
              value={tenant.homepage?.heroSubtitle || ''}
              onChange={(e) => updateField('homepage.heroSubtitle', e.target.value)}
              placeholder="Book your next adventure"
              className={UI.input}
            />
          </div>
        </div>
        
        {tenant.homepage?.heroType === 'video' && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Video URL</label>
            <input
              type="text"
              value={tenant.homepage?.heroVideoUrl || ''}
              onChange={(e) => updateField('homepage.heroVideoUrl', e.target.value)}
              placeholder="https://..."
              className={UI.input}
            />
          </div>
        )}
        
        <div className="mt-4">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Hero image URL (for static/fallback)</label>
          <input
            type="text"
            value={tenant.homepage?.heroImage || ''}
            onChange={(e) => updateField('homepage.heroImage', e.target.value)}
            placeholder="/hero.jpg or https://..."
            className={UI.input}
          />
        </div>
      </div>

      {/* Homepage Sections Toggle */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
        <h4 className="font-semibold text-slate-900 mb-2">Homepage sections</h4>
        <p className="text-sm text-slate-500 mb-4">Choose which sections to display on the homepage.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'showDestinations', label: 'Destinations' },
            { key: 'showCategories', label: 'Categories' },
            { key: 'showFeaturedTours', label: 'Featured Tours' },
            { key: 'showPopularInterests', label: 'Popular Interests' },
            { key: 'showDayTrips', label: 'Day Trips' },
            { key: 'showReviews', label: 'Reviews' },
            { key: 'showFAQ', label: 'FAQ' },
            { key: 'showAboutUs', label: 'About Us' },
            { key: 'showPromoSection', label: 'Promo Section' },
          ].map((section) => (
            <label
              key={section.key}
              className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-colors"
            >
              <input
                type="checkbox"
                checked={tenant.homepage?.[section.key as keyof typeof tenant.homepage] !== false}
                onChange={(e) => updateField(`homepage.${section.key}`, e.target.checked)}
                className={UI.checkbox}
              />
              <span className="text-sm text-slate-700">{section.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Featured Tours Selection */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-slate-900">Featured tours</h4>
            <p className="text-sm text-slate-500">Select specific tours to feature on the homepage.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Default count:</label>
            <input
              type="number"
              min="1"
              max="24"
              value={tenant.homepage?.featuredToursCount || 8}
              onChange={(e) => updateField('homepage.featuredToursCount', parseInt(e.target.value) || 8)}
              className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-center text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
            />
          </div>
        </div>
        
        {isLoadingTours ? (
          <div className="text-center py-10 text-slate-500">Loading tours...</div>
        ) : tours.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No tours found for this brand. Create tours first.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            {tours.map((tour) => {
              const isSelected = (tenant.homepage?.featuredTourIds || []).includes(tour._id);
              return (
                <button
                  key={tour._id}
                  type="button"
                  onClick={() => toggleFeaturedTour(tour._id)}
                  className={`text-left p-3 rounded-2xl border transition-all ${
                    isSelected 
                      ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                    }`}>
                      {isSelected && <span>✓</span>}
                    </div>
                    <span className={`text-sm truncate ${isSelected ? 'font-semibold text-indigo-900' : 'text-slate-700'}`}>
                      {tour.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        
        {(tenant.homepage?.featuredTourIds?.length || 0) > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-600">
              {tenant.homepage?.featuredTourIds?.length} tours selected
            </span>
            <button
              type="button"
              onClick={() => updateField('homepage.featuredTourIds', [])}
              className="text-sm font-semibold text-rose-600 hover:text-rose-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Promo Bar Settings */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
        <h4 className="font-semibold text-slate-900 mb-4">Promo bar</h4>
        
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={tenant.homepage?.promoBarActive || false}
            onChange={(e) => updateField('homepage.promoBarActive', e.target.checked)}
            className={UI.checkbox}
          />
          <span className="text-sm text-slate-700">Show promo bar on homepage</span>
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Promo text</label>
            <input
              type="text"
              value={tenant.homepage?.promoBarText || ''}
              onChange={(e) => updateField('homepage.promoBarText', e.target.value)}
              placeholder="🎉 Special offer: 20% off all tours!"
              className={UI.input}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Promo link</label>
            <input
              type="text"
              value={tenant.homepage?.promoBarLink || ''}
              onChange={(e) => updateField('homepage.promoBarLink', e.target.value)}
              placeholder="/tours"
              className={UI.input}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

