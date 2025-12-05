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
  Settings, Eye, Image, Type, Layout, Shield
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

  // Save tenant
  const saveTenant = async () => {
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
  };

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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Tenant not found</p>
        <Link href="/admin/tenants" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to tenants
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/tenants"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Brand: {tenant.name}</h1>
            <p className="text-gray-500 mt-1">{tenant.domain}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-orange-600">Unsaved changes</span>
          )}
          <button
            onClick={saveTenant}
            disabled={isSaving || !hasChanges}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === 'general' && (
          <GeneralTab tenant={tenant} updateField={updateField} />
        )}
        {activeTab === 'branding' && (
          <BrandingTab tenant={tenant} updateField={updateField} />
        )}
        {activeTab === 'seo' && (
          <SEOTab tenant={tenant} updateField={updateField} />
        )}
        {activeTab === 'contact' && (
          <ContactTab tenant={tenant} updateField={updateField} />
        )}
        {activeTab === 'social' && (
          <SocialTab tenant={tenant} updateField={updateField} />
        )}
        {activeTab === 'features' && (
          <FeaturesTab tenant={tenant} updateField={updateField} />
        )}
        {activeTab === 'payments' && (
          <PaymentsTab tenant={tenant} updateField={updateField} />
        )}
        {activeTab === 'homepage' && (
          <HomepageTab tenant={tenant} updateField={updateField} />
        )}
      </div>
    </div>
  );
}

// Tab Components
function GeneralTab({ tenant, updateField }: { tenant: TenantData; updateField: (path: string, value: unknown) => void }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand ID
          </label>
          <input
            type="text"
            value={tenant.tenantId}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">Cannot be changed after creation</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={tenant.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Primary Domain <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={tenant.domain}
            onChange={(e) => updateField('domain', e.target.value.toLowerCase())}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Domains
          </label>
          <input
            type="text"
            value={tenant.domains?.join(', ') || ''}
            onChange={(e) => updateField('domains', e.target.value.split(',').map(d => d.trim().toLowerCase()).filter(Boolean))}
            placeholder="domain1.com, domain2.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Comma-separated list of domains</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6 pt-4 border-t">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={tenant.isActive}
            onChange={(e) => updateField('isActive', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Active (website is live)</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={tenant.isDefault}
            onChange={(e) => updateField('isDefault', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Default brand (fallback)</span>
        </label>
      </div>
    </div>
  );
}

function BrandingTab({ tenant, updateField }: { tenant: TenantData; updateField: (path: string, value: unknown) => void }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Branding & Design</h3>
      
      {/* Logo & Favicon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
          <input
            type="text"
            value={tenant.branding?.logo || ''}
            onChange={(e) => updateField('branding.logo', e.target.value)}
            placeholder="/logo.png or https://..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {tenant.branding?.logo && (
            <img src={tenant.branding.logo} alt="Logo preview" className="mt-2 h-12 object-contain" />
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
          <input
            type="text"
            value={tenant.branding?.favicon || ''}
            onChange={(e) => updateField('branding.favicon', e.target.value)}
            placeholder="/favicon.ico"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Colors */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Brand Colors</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'primaryColor', label: 'Primary' },
            { key: 'secondaryColor', label: 'Secondary' },
            { key: 'accentColor', label: 'Accent' },
            { key: 'backgroundColor', label: 'Background' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(tenant.branding as Record<string, string>)?.[key] || '#000000'}
                  onChange={(e) => updateField(`branding.${key}`, e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={(tenant.branding as Record<string, string>)?.[key] || ''}
                  onChange={(e) => updateField(`branding.${key}`, e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Typography */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
          <select
            value={tenant.branding?.fontFamily || 'Inter'}
            onChange={(e) => updateField('branding.fontFamily', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Border Radius</label>
          <select
            value={tenant.branding?.borderRadius || '8px'}
            onChange={(e) => updateField('branding.borderRadius', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Header Style</label>
          <select
            value={tenant.branding?.headerVariant || 'light'}
            onChange={(e) => updateField('branding.headerVariant', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="transparent">Transparent</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Footer Style</label>
          <select
            value={tenant.branding?.footerVariant || 'dark'}
            onChange={(e) => updateField('branding.footerVariant', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">SEO Settings</h3>
      
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Page Title</label>
          <input
            type="text"
            value={tenant.seo?.defaultTitle || ''}
            onChange={(e) => updateField('seo.defaultTitle', e.target.value)}
            placeholder="Your Brand - Tours & Excursions"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title Suffix</label>
          <input
            type="text"
            value={tenant.seo?.titleSuffix || ''}
            onChange={(e) => updateField('seo.titleSuffix', e.target.value)}
            placeholder="| Your Brand Name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Added to the end of all page titles</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
          <textarea
            value={tenant.seo?.defaultDescription || ''}
            onChange={(e) => updateField('seo.defaultDescription', e.target.value)}
            rows={3}
            placeholder="Describe your brand and services..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">{(tenant.seo?.defaultDescription || '').length}/160 characters</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
          <input
            type="text"
            value={tenant.seo?.defaultKeywords?.join(', ') || ''}
            onChange={(e) => updateField('seo.defaultKeywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
            placeholder="tours, excursions, travel, egypt"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Comma-separated keywords</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Open Graph Image URL</label>
          <input
            type="text"
            value={tenant.seo?.ogImage || ''}
            onChange={(e) => updateField('seo.ogImage', e.target.value)}
            placeholder="/og-image.jpg or https://..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Recommended size: 1200x630 pixels</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Twitter Handle</label>
            <input
              type="text"
              value={tenant.seo?.twitterHandle || ''}
              onChange={(e) => updateField('seo.twitterHandle', e.target.value)}
              placeholder="@yourbrand"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Site Verification</label>
            <input
              type="text"
              value={tenant.seo?.googleSiteVerification || ''}
              onChange={(e) => updateField('seo.googleSiteVerification', e.target.value)}
              placeholder="verification code"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactTab({ tenant, updateField }: { tenant: TenantData; updateField: (path: string, value: unknown) => void }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Mail className="w-4 h-4 inline mr-1" /> Email
          </label>
          <input
            type="email"
            value={tenant.contact?.email || ''}
            onChange={(e) => updateField('contact.email', e.target.value)}
            placeholder="info@yourdomain.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Phone className="w-4 h-4 inline mr-1" /> Phone
          </label>
          <input
            type="tel"
            value={tenant.contact?.phone || ''}
            onChange={(e) => updateField('contact.phone', e.target.value)}
            placeholder="+20 100 000 0000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
          <input
            type="tel"
            value={tenant.contact?.whatsapp || ''}
            onChange={(e) => updateField('contact.whatsapp', e.target.value)}
            placeholder="+201000000000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
          <input
            type="email"
            value={tenant.contact?.supportEmail || ''}
            onChange={(e) => updateField('contact.supportEmail', e.target.value)}
            placeholder="support@yourdomain.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            value={tenant.contact?.address || ''}
            onChange={(e) => updateField('contact.address', e.target.value)}
            placeholder="123 Street Name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            value={tenant.contact?.city || ''}
            onChange={(e) => updateField('contact.city', e.target.value)}
            placeholder="Cairo"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <input
            type="text"
            value={tenant.contact?.country || ''}
            onChange={(e) => updateField('contact.country', e.target.value)}
            placeholder="Egypt"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Social Media Links</h3>
      
      <div className="grid grid-cols-1 gap-4">
        {socialFields.map(({ key, label, icon: Icon, placeholder }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Icon className="w-4 h-4 inline mr-1" /> {label}
            </label>
            <input
              type="url"
              value={(tenant.socialLinks as Record<string, string>)?.[key] || ''}
              onChange={(e) => updateField(`socialLinks.${key}`, e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      <h3 className="text-lg font-semibold text-gray-900">Feature Toggles</h3>
      
      {featureGroups.map((group) => (
        <div key={group.title}>
          <h4 className="text-sm font-medium text-gray-700 mb-3">{group.title}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.features.map(({ key, label, description }) => (
              <label
                key={key}
                className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(tenant.features as Record<string, boolean>)?.[key] || false}
                  onChange={(e) => updateField(`features.${key}`, e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">{label}</span>
                  <p className="text-sm text-gray-500">{description}</p>
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
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Payment Settings</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
          <select
            value={tenant.payments?.currency || 'USD'}
            onChange={(e) => updateField('payments.currency', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
          <input
            type="text"
            value={tenant.payments?.currencySymbol || '$'}
            onChange={(e) => updateField('payments.currencySymbol', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Supported Currencies</label>
          <input
            type="text"
            value={tenant.payments?.supportedCurrencies?.join(', ') || ''}
            onChange={(e) => updateField('payments.supportedCurrencies', e.target.value.split(',').map(c => c.trim().toUpperCase()).filter(Boolean))}
            placeholder="USD, EUR, GBP, EGP"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Payment Methods</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'stripeEnabled', label: 'Stripe', description: 'Credit/Debit cards' },
            { key: 'paypalEnabled', label: 'PayPal', description: 'PayPal payments' },
            { key: 'bankTransferEnabled', label: 'Bank Transfer', description: 'Direct bank transfer' },
          ].map(({ key, label, description }) => (
            <label
              key={key}
              className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={(tenant.payments as Record<string, boolean>)?.[key] || false}
                onChange={(e) => updateField(`payments.${key}`, e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">{label}</span>
                <p className="text-sm text-gray-500">{description}</p>
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
        <h3 className="text-lg font-semibold text-gray-900">Homepage Settings</h3>
        <p className="text-sm text-gray-500 mt-1">Configure what appears on the homepage for this brand</p>
      </div>
      
      {/* Hero Section Settings */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Hero Section</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Type</label>
            <select
              value={tenant.homepage?.heroType || 'slider'}
              onChange={(e) => updateField('homepage.heroType', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="slider">Image Slider</option>
              <option value="video">Video Background</option>
              <option value="static">Static Image</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
            <input
              type="text"
              value={tenant.homepage?.heroTitle || ''}
              onChange={(e) => updateField('homepage.heroTitle', e.target.value)}
              placeholder="Discover Amazing Tours"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Subtitle</label>
            <input
              type="text"
              value={tenant.homepage?.heroSubtitle || ''}
              onChange={(e) => updateField('homepage.heroSubtitle', e.target.value)}
              placeholder="Book your next adventure"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {tenant.homepage?.heroType === 'video' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
            <input
              type="text"
              value={tenant.homepage?.heroVideoUrl || ''}
              onChange={(e) => updateField('homepage.heroVideoUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL (for static/fallback)</label>
          <input
            type="text"
            value={tenant.homepage?.heroImage || ''}
            onChange={(e) => updateField('homepage.heroImage', e.target.value)}
            placeholder="/hero.jpg or https://..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Homepage Sections Toggle */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Homepage Sections</h4>
        <p className="text-sm text-gray-500 mb-4">Choose which sections to display on the homepage</p>
        
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
            <label key={section.key} className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300">
              <input
                type="checkbox"
                checked={tenant.homepage?.[section.key as keyof typeof tenant.homepage] !== false}
                onChange={(e) => updateField(`homepage.${section.key}`, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{section.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Featured Tours Selection */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium text-gray-900">Featured Tours</h4>
            <p className="text-sm text-gray-500">Select specific tours to feature on the homepage</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Default count:</label>
            <input
              type="number"
              min="1"
              max="24"
              value={tenant.homepage?.featuredToursCount || 8}
              onChange={(e) => updateField('homepage.featuredToursCount', parseInt(e.target.value) || 8)}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
            />
          </div>
        </div>
        
        {isLoadingTours ? (
          <div className="text-center py-8 text-gray-500">Loading tours...</div>
        ) : tours.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tours found for this brand. Create tours first.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {tours.map((tour) => {
              const isSelected = (tenant.homepage?.featuredTourIds || []).includes(tour._id);
              return (
                <button
                  key={tour._id}
                  type="button"
                  onClick={() => toggleFeaturedTour(tour._id)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isSelected 
                      ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' 
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      isSelected ? 'bg-blue-500 text-white' : 'border border-gray-300'
                    }`}>
                      {isSelected && <span>✓</span>}
                    </div>
                    <span className={`text-sm truncate ${isSelected ? 'font-medium text-blue-900' : 'text-gray-700'}`}>
                      {tour.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        
        {(tenant.homepage?.featuredTourIds?.length || 0) > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {tenant.homepage?.featuredTourIds?.length} tours selected
            </span>
            <button
              type="button"
              onClick={() => updateField('homepage.featuredTourIds', [])}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Promo Bar Settings */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Promo Bar</h4>
        
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={tenant.homepage?.promoBarActive || false}
            onChange={(e) => updateField('homepage.promoBarActive', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Show promo bar on homepage</span>
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Promo Text</label>
            <input
              type="text"
              value={tenant.homepage?.promoBarText || ''}
              onChange={(e) => updateField('homepage.promoBarText', e.target.value)}
              placeholder="🎉 Special offer: 20% off all tours!"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Promo Link</label>
            <input
              type="text"
              value={tenant.homepage?.promoBarLink || ''}
              onChange={(e) => updateField('homepage.promoBarLink', e.target.value)}
              placeholder="/tours"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

