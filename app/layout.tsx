// app/layout.tsx — Minimal root layout
// The actual providers and branding are in app/[locale]/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

const defaultMetadataBase = (() => {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (configuredBaseUrl) {
    try {
      return new URL(configuredBaseUrl);
    } catch (error) {
      console.warn('Invalid metadata base URL configuration:', error);
    }
  }

  return new URL('http://localhost:3000');
})();

export const metadata: Metadata = {
  metadataBase: defaultMetadataBase,
  title: "Egypt Excursions Online - Tours & Day Trips in Egypt",
  description: "Discover and book unforgettable tours, day trips, and excursions across Egypt. Explore Hurghada, Cairo, Luxor, Sharm El Sheikh and more.",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'Egypt Excursions Online',
    title: 'Egypt Excursions Online - Tours & Day Trips in Egypt',
    description: 'Book the best tours, day trips, and excursions across Egypt.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Egypt Excursions Online' }],
    locale: 'en',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Egypt Excursions Online - Tours & Day Trips in Egypt',
    description: 'Book the best tours, day trips, and excursions across Egypt.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // next-intl renders <html> and <body> in the [locale]/layout.tsx
  // This root layout just passes through with font variables available globally
  return children;
}
