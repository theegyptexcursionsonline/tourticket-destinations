// app/layout.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
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
import { getTenantFromRequest, getTenantPublicConfig, TenantPublicConfig } from "@/lib/tenant";
import ComingSoonPage from "@/components/ComingSoonPage";

// Force all routes to be dynamic - root layout uses headers() for tenant detection
export const dynamic = 'force-dynamic';

const COMING_SOON_MODE = false;

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const almarai = Almarai({
  subsets: ["arabic"],
  weight: ['400', '700', '800'],
  variable: '--font-almarai'
});

// Dynamic metadata generation based on tenant
export async function generateMetadata(): Promise<Metadata> {
  let comingSoonBypassed = false;
  
  try {
    const headersList = await headers();
    comingSoonBypassed = headersList.get('x-coming-soon-exempt') === 'true';
  } catch (error) {
    console.warn('Unable to read headers in generateMetadata:', error);
  }

  if (COMING_SOON_MODE && !comingSoonBypassed) {
    try {
      const tenantId = await getTenantFromRequest();
      const tenantConfig = await getTenantPublicConfig(tenantId);
      
      if (tenantConfig) {
        return {
          title: `Coming Soon - ${tenantConfig.name}`,
          description: `Something extraordinary is coming to ${tenantConfig.name}. Sign up for early access!`,
        };
      }
    } catch (error) {
      console.error('Error generating metadata:', error);
    }
    
    return {
      title: 'Coming Soon - Egypt Excursions Online',
      description: 'Something extraordinary is coming. Sign up for early access!',
    };
  }

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
    icons: {
      icon: '/favicon.ico',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let comingSoonBypassed = false;
  
  try {
    const headersList = await headers();
    comingSoonBypassed = headersList.get('x-coming-soon-exempt') === 'true';
  } catch (error) {
    console.warn('Unable to read headers in RootLayout:', error);
  }

  const showComingSoonPage = COMING_SOON_MODE && !comingSoonBypassed;

  // Always fetch tenant config
  let tenantConfig: TenantPublicConfig | null = null;
  let tenantId = 'default';
  
  try {
    tenantId = await getTenantFromRequest();
    tenantConfig = await getTenantPublicConfig(tenantId);
  } catch (error) {
    console.error('Error fetching tenant:', error);
  }

  if (showComingSoonPage) {
    return (
      <html lang="en">
        <body>
          <ComingSoonPage tenant={tenantConfig} />
        </body>
      </html>
    );
  }

  // Helper: Adjust color brightness (same logic as TenantContext)
  const adjustColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + 
      (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + 
      (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + 
      (B < 255 ? B < 0 ? 0 : B : 255)
    ).toString(16).slice(1);
  };

  // Generate CSS variables for tenant branding (including derived values)
  const pc = tenantConfig?.branding?.primaryColor;
  const sc = tenantConfig?.branding?.secondaryColor;
  const brandingStyles = tenantConfig ? `
    :root {
      --primary-color: ${pc};
      --secondary-color: ${sc};
      --accent-color: ${tenantConfig.branding.accentColor};
      --background-color: ${tenantConfig.branding.backgroundColor || '#FFFFFF'};
      --text-color: ${tenantConfig.branding.textColor || '#1F2937'};
      --font-family: ${tenantConfig.branding.fontFamily}, system-ui, sans-serif;
      --font-family-heading: ${tenantConfig.branding.fontFamilyHeading || tenantConfig.branding.fontFamily}, system-ui, sans-serif;
      --border-radius: ${tenantConfig.branding.borderRadius || '8px'};
      --primary-hover: ${pc ? adjustColor(pc, -10) : '#b91c1c'};
      --primary-light: ${pc ? adjustColor(pc, 90) : '#fef2f2'};
      --gradient-primary: linear-gradient(135deg, ${pc} 0%, ${pc ? adjustColor(pc, -10) : '#b91c1c'} 100%);
      --gradient-secondary: linear-gradient(135deg, ${sc} 0%, ${sc ? adjustColor(sc, 20) : '#374151'} 100%);
      --shadow-primary: 0 4px 14px 0 ${pc}40;
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
          initialTenant={tenantConfig as any}
          initialTenantId={tenantId}
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
