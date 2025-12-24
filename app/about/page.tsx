import React from "react";
import { Metadata } from "next";
import {
  Award, DollarSign, Smartphone, CalendarCheck,
  Heart, Users, Compass
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Import the reusable Header and Footer components
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getTenantFromRequest, getTenantPublicConfig } from "@/lib/tenant";

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;

// Generate dynamic metadata based on tenant
export async function generateMetadata(): Promise<Metadata> {
  try {
    const tenantId = await getTenantFromRequest();
    const tenant = await getTenantPublicConfig(tenantId);
    
    if (tenant) {
      return {
        title: `About Us - Your Best Travel Buddy | ${tenant.name}`,
        description: `Learn about ${tenant.name}, your trusted partner for extraordinary travel experiences with 15 years of expertise in tourism.`,
        openGraph: {
          title: `About Us | ${tenant.name}`,
          description: 'Your trusted partner for extraordinary travel experiences with 15 years of expertise.',
          type: 'website',
          siteName: tenant.name,
          images: [tenant.seo.ogImage || '/about.png'],
        },
      };
    }
  } catch (error) {
    console.error('Error generating about page metadata:', error);
  }
  
  return {
    title: 'About Us - Your Best Travel Buddy',
    description: 'Your trusted partner for extraordinary travel experiences with 15 years of expertise in tourism.',
  };
}

// =================================================================
// --- DARK HERO SECTION COMPONENT ---
// Reusing the hero section to maintain a consistent brand look
// =================================================================
function DarkHero() {
  return (
    <div className="relative h-96 bg-slate-900 flex items-center justify-center text-white text-center px-4 overflow-hidden">
      {/* Background Image/Overlay for Visuals */}
      <div className="absolute inset-0 z-0 opacity-20">
        <Image
          src="/about.png" // Placeholder for a dark, stylish background image
          alt="Abstract dark background"
          layout="fill"
          objectFit="cover"
        />
      </div>

      <div className="relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
          Your Best Travel Buddy
        </h1>
        <p className="mt-4 text-lg sm:text-xl max-w-2xl mx-auto opacity-80">
          Discover hidden gems and unforgettable experiences with our expert guidance.
        </p>
      </div>
    </div>
  );
}

// =================================================================
// --- ABOUT US PAGE COMPONENT ---
// =================================================================
export default function AboutUsPage() {
  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      {/* Add the DarkHero section at the top of the page */}
      <DarkHero />
      
      {/* Page Header (imported) */}
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <section className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4">
              About Egypt Excursions Online
            </h1>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Your trusted partner for extraordinary travel experiences, with 15 years of expertise in tourism. Egypt&apos;s biggest collection of things to do, activities, sightseeing tours, snorkeling, Safari tours, Quad biking, Private boats, and much more.
            </p>
          </section>

          {/* Our Story Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="relative h-64 sm:h-80 lg:h-96 w-full rounded-lg overflow-hidden shadow-xl">
              <Image 
                src="/about.png" // Placeholder image
                alt="A beautiful view of an ancient Egyptian site"
                layout="fill"
                objectFit="cover"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-slate-900">Our Story</h2>
              <p className="text-slate-700 leading-relaxed">
                Founded with a passion for creating unforgettable memories, Egypt Excursions Online has been a leader in the travel industry for 15 years. We started with a simple goal: to make discovering the world&apos;s most incredible destinations accessible and seamless for everyone.
              </p>
              <p className="text-slate-700 leading-relaxed">
                Our journey began by connecting travelers with authentic, high-quality experiences, and today, we continue that tradition. We are proud to be travel experts, dedicated to curating the best tours, tickets, and activities that offer genuine insight and joy.
              </p>
            </div>
          </section>

          {/* Why Book With Us Section */}
          <section className="bg-slate-100 py-12 px-6 rounded-xl mb-16">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-8">Why book with us?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Card 1 */}
              <div className="text-center p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                <Award size={48} className="text-red-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg text-slate-900 mb-2">Official Partner</h3>
                <p className="text-sm text-slate-600">
                  We are official partners of top museums and attractions, ensuring authentic and reliable tickets.
                </p>
              </div>
              {/* Card 2 */}
              <div className="text-center p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                <DollarSign size={48} className="text-red-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg text-slate-900 mb-2">Best Price Guaranteed</h3>
                <p className="text-sm text-slate-600">
                  Our commitment to great value means you get the best price for your adventure, guaranteed.
                </p>
              </div>
              {/* Card 3 */}
              <div className="text-center p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                <Smartphone size={48} className="text-red-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg text-slate-900 mb-2">Mobile Tickets</h3>
                <p className="text-sm text-slate-600">
                  No printer needed! Simply show your tickets on your smartphone for quick and easy access.
                </p>
              </div>
              {/* Card 4 */}
              <div className="text-center p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                <CalendarCheck size={48} className="text-red-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg text-slate-900 mb-2">Free Cancellation</h3>
                <p className="text-sm text-slate-600">
                  Enjoy flexibility with free cancellation on most tours up to 8 hours in advance.
                </p>
              </div>
            </div>
          </section>
          
          {/* Our Values Section */}
          <section className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Our Core Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-lg border border-slate-200 bg-white shadow-sm">
                <Compass size={48} className="text-slate-700 mx-auto mb-4" />
                <h3 className="font-semibold text-xl mb-2">Expertise</h3>
                <p className="text-slate-600">
                  We leverage our deep industry knowledge to craft authentic and enriching experiences for every traveler.
                </p>
              </div>
              <div className="p-6 rounded-lg border border-slate-200 bg-white shadow-sm">
                <Heart size={48} className="text-slate-700 mx-auto mb-4" />
                <h3 className="font-semibold text-xl mb-2">Passion</h3>
                <p className="text-slate-600">
                  Our team is fueled by a love for travel, and we bring that passion to every interaction and every itinerary.
                </p>
              </div>
              <div className="p-6 rounded-lg border border-slate-200 bg-white shadow-sm">
                <Users size={48} className="text-slate-700 mx-auto mb-4" />
                <h3 className="font-semibold text-xl mb-2">Community</h3>
                <p className="text-slate-600">
                  We believe in supporting local businesses and building connections that benefit both travelers and host communities.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center bg-slate-800 text-white p-12 rounded-lg shadow-xl">
            <h2 className="text-3xl font-bold mb-4">Ready to start your adventure?</h2>
            <p className="text-lg mb-6 max-w-2xl mx-auto">
              Browse our hand-picked selection of tours and tickets and find your next unforgettable experience.
            </p>
            <Link href="/" className="inline-block bg-red-600 text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-red-700 transition-colors">
              Explore Tours
            </Link>
          </section>

        </div>
      </main>

      {/* Page Footer (imported) */}
      <Footer />
    </div>
  );
}