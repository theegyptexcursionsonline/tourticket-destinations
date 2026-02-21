// app/layout.tsx — Minimal root layout
// The actual providers and branding are in app/[locale]/layout.tsx
import type { Metadata } from "next";
import { Inter, Almarai } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const almarai = Almarai({
  subsets: ["arabic"],
  weight: ['400', '700', '800'],
  variable: '--font-almarai'
});

export const metadata: Metadata = {
  title: "Egypt Excursions Online",
  description: "Discover and book unforgettable tours and experiences.",
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
