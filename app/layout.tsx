// app/layout.tsx
import type { Metadata } from "next";
import { Inter, Almarai } from "next/font/google";
import "./globals.css";
import { TenantProvider } from "@/contexts/TenantContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import CartSidebar from "@/components/CartSidebar";
import WishlistSidebar from "@/components/WishlistSidebar";
import { Toaster } from 'react-hot-toast';
import IntercomClient from "@/components/IntercomClient";
import ConditionalAIWidgets from "@/components/ConditionalAIWidgets";
import { getTenantFromRequest, getTenantPublicConfig } from "@/lib/tenant";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const almarai = Almarai({
  subsets: ["arabic"],
  weight: ['400', '700', '800'],
  variable: '--font-almarai'
});

// Dynamic metadata generation based on tenant
export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenantConfig = await getTenantPublicConfig(tenantId);
    
    if (tenantConfig) {
      return {
        title: {
          default: tenantConfig.seo.defaultTitle,
          template: `%s | ${tenantConfig.seo.titleSuffix}`,
        },
        description: tenantConfig.seo.defaultDescription,
        openGraph: {
          images: [tenantConfig.seo.ogImage],
          siteName: tenantConfig.name,
        },
        icons: {
          icon: tenantConfig.branding.favicon,
        },
      };
    }
  } catch (error) {
    console.error('Error generating metadata:', error);
  }
  
  // Fallback metadata
  return {
    title: {
      default: "Egypt Excursions Online - Unforgettable Experiences",
      template: "%s | Egypt Excursions Online",
    },
    description:
      "Discover and book unforgettable activities, tours, and experiences across the globe. Your adventure starts here.",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get initial tenant config for server-side rendering
  let initialTenant = null;
  let initialTenantId = 'default';
  
  try {
    initialTenantId = await getTenantFromRequest();
    initialTenant = await getTenantPublicConfig(initialTenantId);
  } catch (error) {
    console.error('Error fetching initial tenant:', error);
  }
  
  // Generate CSS variables for tenant branding
  const brandingStyles = initialTenant ? `
    :root {
      --primary-color: ${initialTenant.branding.primaryColor};
      --secondary-color: ${initialTenant.branding.secondaryColor};
      --accent-color: ${initialTenant.branding.accentColor};
      --background-color: ${initialTenant.branding.backgroundColor || '#FFFFFF'};
      --text-color: ${initialTenant.branding.textColor || '#1F2937'};
      --font-family: ${initialTenant.branding.fontFamily}, system-ui, sans-serif;
      --font-family-heading: ${initialTenant.branding.fontFamilyHeading || initialTenant.branding.fontFamily}, system-ui, sans-serif;
      --border-radius: ${initialTenant.branding.borderRadius || '8px'};
    }
  ` : '';
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inject tenant branding styles */}
        {brandingStyles && (
          <style dangerouslySetInnerHTML={{ __html: brandingStyles }} />
        )}
      </head>
      <body className={`${inter.variable} ${almarai.variable} font-sans`} suppressHydrationWarning>
        <IntercomClient />
        {/* TenantProvider wraps all other providers */}
        <TenantProvider 
          initialTenant={initialTenant as any}
          initialTenantId={initialTenantId}
        >
          <AuthProvider>
            <SettingsProvider>
              <CartProvider>
                <WishlistProvider>
                  {children}
                  <CartSidebar />
                  <WishlistSidebar />
                  {/* AISearchWidget moved to specific pages (homepage, destinations, etc.) */}
                  <ConditionalAIWidgets />
                  <Toaster
                    position="top-right"
                    reverseOrder={false}
                    gutter={8}
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#fff',
                        color: '#333',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        fontSize: '14px',
                        maxWidth: '500px',
                      },
                      success: {
                        duration: 4000,
                        style: {
                          background: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                        },
                        iconTheme: {
                          primary: '#22c55e',
                          secondary: '#f0fdf4',
                        },
                      },
                      error: {
                        duration: 6000,
                        style: {
                          background: '#fef2f2',
                          color: '#b91c1c',
                          border: '1px solid #fecaca',
                          whiteSpace: 'pre-line',
                        },
                        iconTheme: {
                          primary: '#ef4444',
                          secondary: '#fef2f2',
                        },
                      },
                      loading: {
                        style: {
                          background: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                        },
                      },
                    }}
                  />
                </WishlistProvider>
              </CartProvider>
            </SettingsProvider>
          </AuthProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
