'use client';

import React from "react";
import Image from "next/image";

// Import reusable components
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// =================================================================
// --- DARK HERO SECTION COMPONENT ---
// Reusing this component to maintain consistent styling.
// =================================================================
function DarkHero() {
  return (
    <div className="relative h-96 bg-slate-900 flex items-center justify-center text-white text-center px-4 overflow-hidden">
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
// --- PRIVACY POLICY PAGE COMPONENT ---
// =================================================================
export default function PrivacyPolicyPage() {
  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <DarkHero />
      <Header />

      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-4xl mx-auto">
          <section className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-2">
              Privacy Policy
            </h1>
            <p className="text-slate-600">
              Last updated: 12 November 2025
            </p>
          </section>

          <section className="prose prose-lg max-w-none mx-auto text-slate-700">
            {/* Company Information Box */}
            <div className="bg-slate-50 border-l-4 border-blue-600 p-6 mb-10 rounded-r-lg">
              <p className="text-lg mb-2"><strong className="text-slate-900">Company name:</strong> Egypt Excursions Online</p>
              <p className="text-lg mb-2"><strong className="text-slate-900">Mother company:</strong> <a href="https://www.excursions.online" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Excursions Online LLC FZ</a></p>
              <p className="text-lg mb-2"><strong className="text-slate-900">Official email:</strong> info@egypt-excursionsonline.com</p>
              <p className="text-lg mb-0"><strong className="text-slate-900">Website:</strong> https://www.egypt-excursionsonline.com</p>
            </div>

            {/* Section 1 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">1. Who We Are</h2>
              <p className="leading-relaxed">
                This Privacy Policy explains how <strong>Egypt Excursions Online</strong> (operated by <strong>Excursions Online LLC FZ</strong>) collects, uses, shares, and protects personal data when you visit our website or book our tours and related services (the <strong>"Service"</strong>).
              </p>
            </div>

            {/* Section 2 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">2. Scope</h2>
              <p className="leading-relaxed">
                This Policy applies to visitors and customers who access or use the Service, contact us by email/phone/WhatsApp, or interact with our social channels. By using the Service, you agree to the practices described here.
              </p>
            </div>

            {/* Section 3 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">3. What Data We Collect</h2>
              <p className="leading-relaxed mb-4">
                We collect the following categories of personal data when necessary for the purposes described in Section 4:
              </p>
              <ul className="space-y-3 ml-6">
                <li className="leading-relaxed"><strong className="text-slate-900">Identification & contact data:</strong> name, email, phone number, country, hotel/accommodation, room number (where relevant).</li>
                <li className="leading-relaxed"><strong className="text-slate-900">Booking details:</strong> travel dates, party size, special requests, pickup/dropoff locations, preferred languages.</li>
                <li className="leading-relaxed"><strong className="text-slate-900">Government ID (where required):</strong> passport number/copy for certain private tours or as required by checkpoints/security regulations.</li>
                <li className="leading-relaxed"><strong className="text-slate-900">Payment & billing data:</strong> billing address, payment method details (processed by third-party providers; we do not store full card numbers).</li>
                <li className="leading-relaxed"><strong className="text-slate-900">Communications:</strong> emails, messages, call notes, and feedback.</li>
                <li className="leading-relaxed"><strong className="text-slate-900">Device & usage data:</strong> IP address, device identifiers, browser type, pages viewed, and interaction data (via cookies and similar technologies).</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">4. Why We Use Your Data (Legal Bases)</h2>
              <p className="leading-relaxed mb-4">We process personal data for:</p>
              <ul className="space-y-3 ml-6">
                <li className="leading-relaxed"><strong className="text-slate-900">Booking & operations (Contract):</strong> to confirm bookings, issue vouchers, coordinate pickups, and provide customer support.</li>
                <li className="leading-relaxed"><strong className="text-slate-900">Safety & compliance (Legal obligation/Legitimate interests):</strong> to meet legal, tax, accounting, and security requirements (e.g., passport checks, police checkpoints).</li>
                <li className="leading-relaxed"><strong className="text-slate-900">Service improvement & analytics (Legitimate interests/Consent):</strong> to monitor performance, troubleshoot, and enhance user experience.</li>
                <li className="leading-relaxed"><strong className="text-slate-900">Marketing (Consent/Legitimate interests):</strong> to send offers and updates; you may opt out anytime.</li>
              </ul>
            </div>

            {/* Section 5 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">5. Cookies and Similar Technologies</h2>
              <p className="leading-relaxed">
                We use <strong>cookies and similar technologies</strong> to operate the Service, remember preferences, and perform analytics. Where required, we will request consent. You can manage cookie preferences in your browser settings; some features may not function without certain cookies.
              </p>
            </div>

            {/* Section 6 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">6. Analytics and Measurement</h2>
              <p className="leading-relaxed">
                We may use third-party analytics tools (e.g., <strong>Google Analytics</strong>, ad platforms) to understand usage and performance. These providers process limited data on our behalf under their own privacy terms. We configure dashboards, conversion tracking, and goals/events to measure leads, bookings, and key actions.
              </p>
            </div>

            {/* Section 7 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">7. Sharing Your Data</h2>
              <p className="leading-relaxed mb-4">We share personal data only as needed with:</p>
              <ul className="space-y-2 ml-6">
                <li className="leading-relaxed">Local suppliers/operators, guides, and drivers to deliver the booked services.</li>
                <li className="leading-relaxed">Payment processors and banks to take payments and prevent fraud.</li>
                <li className="leading-relaxed">IT/service providers (hosting, email, CRM, analytics) under contractual obligations.</li>
                <li className="leading-relaxed">Authorities where legally required (e.g., security checkpoints, law enforcement).</li>
                <li className="leading-relaxed">Business transfers (e.g., merger or acquisition) with appropriate safeguards.</li>
              </ul>
              <p className="leading-relaxed mt-4"><strong className="text-slate-900">We do not sell personal data.</strong></p>
            </div>

            {/* Section 8 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">8. International Transfers</h2>
              <p className="leading-relaxed">
                Data may be processed in countries outside your residence. Where required, we implement safeguards such as contractual clauses to protect your data.
              </p>
            </div>

            {/* Section 9 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">9. Data Retention</h2>
              <p className="leading-relaxed">
                We retain personal data only for as long as necessary for the purposes described, including legal, accounting, or reporting requirements. <strong>Typical retention:</strong> booking records and invoices for statutory periods; support communications for operational needs.
              </p>
            </div>

            {/* Section 10 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">10. Your Choices and Rights</h2>
              <p className="leading-relaxed">
                Depending on your location, you may have rights to <strong>access, correct, delete, object to, or restrict processing</strong> of your personal data, and to withdraw consent where processing is based on consent. To exercise these rights, contact <strong>info@egypt-excursionsonline.com</strong>.
              </p>
            </div>

            {/* Section 11 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">11. Security</h2>
              <p className="leading-relaxed">
                We implement administrative, technical, and physical safeguards intended to protect personal data. <strong>No method of transmission or storage is 100% secure</strong>; we cannot guarantee absolute security.
              </p>
            </div>

            {/* Section 12 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">12. Children</h2>
              <p className="leading-relaxed">
                The Service is intended for <strong>individuals 18+</strong>. We do not knowingly collect data from children under 18. If you believe a child has provided us data, contact us to request deletion.
              </p>
            </div>

            {/* Section 13 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">13. Third-Party Links</h2>
              <p className="leading-relaxed">
                Our site may contain links to third-party websites or services. We are not responsible for their privacy practices. Review their policies before providing personal data.
              </p>
            </div>

            {/* Section 14 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">14. Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this Policy from time to time. We will post the updated version with a new effective date. Your continued use of the Service signifies acceptance of the updated Policy.
              </p>
            </div>

            {/* Section 15 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">15. Contact</h2>
              <p className="leading-relaxed">
                For questions or privacy requests, contact: <strong>info@egypt-excursionsonline.com</strong>
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}