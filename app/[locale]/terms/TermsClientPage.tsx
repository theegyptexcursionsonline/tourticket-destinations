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
// --- TERMS AND CONDITIONS PAGE COMPONENT ---
// =================================================================
export default function TermsAndConditionsPage() {
  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <DarkHero />
      <Header />

      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-4xl mx-auto">
          <section className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-2">
              Terms of Service
            </h1>
            <p className="text-slate-600">
              Last updated: 12 November 2025
            </p>
          </section>

          <section className="prose prose-lg max-w-none mx-auto text-slate-700">
            {/* Company Information Box */}
            <div className="bg-slate-50 border-s-4 border-blue-600 p-6 mb-10 rounded-e-lg">
              <p className="text-lg mb-2"><strong className="text-slate-900">Company name:</strong> Egypt Excursions Online</p>
              <p className="text-lg mb-2"><strong className="text-slate-900">Mother company:</strong> <a href="https://www.excursions.online" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Excursions Online LLC FZ</a></p>
              <p className="text-lg mb-2"><strong className="text-slate-900">Official email:</strong> info@egypt-excursionsonline.com</p>
              <p className="text-lg mb-0"><strong className="text-slate-900">Website:</strong> https://www.egypt-excursionsonline.com</p>
            </div>

            {/* Section 1 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">1. Introduction</h2>
              <p className="leading-relaxed mb-4">
                Welcome to <strong>Egypt Excursions Online</strong> (<strong>"Company"</strong>, <strong>"we"</strong>, <strong>"our"</strong>, <strong>"us"</strong>). These Terms of Service (<strong>"Terms"</strong>) govern your access to and use of our website located at www.egypt-excursionsonline.com and any related pages, content, features, or services we operate (collectively, the <strong>"Service"</strong>).
              </p>
              <p className="leading-relaxed mb-4">
                Egypt Excursions Online is operated by <a href="https://www.excursions.online" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-bold">Excursions Online LLC FZ</a> (the <strong>"Mother Company"</strong>).
              </p>
              <p className="leading-relaxed">
                Our Privacy Policy (published on a separate page) explains how we collect, safeguard, and disclose personal data. These Terms of Service govern your access to and use of the Service. <strong>By accessing or using the Service you agree to be bound by these Terms.</strong> For privacy matters, please refer to the Privacy Policy. If you have questions, contact us at <strong>info@egypt-excursionsonline.com</strong>.
              </p>
            </div>

            {/* Section 2 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">2. Communications</h2>
              <p className="leading-relaxed">
                By using the Service, you agree that we may send you transactional notices and essential service communications. You may opt out of marketing communications at any time by following the unsubscribe link in the message or by emailing <strong>info@egypt-excursionsonline.com</strong>.
              </p>
            </div>

            {/* Section 3 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">3. Tour Booking</h2>
              <p className="leading-relaxed mb-4">
                If you book any service made available through the Service (a <strong>"Tour Booking"</strong>), you may be asked to provide information including, without limitation, your payment card details, billing address, hotel/accommodation information, and participant details.
              </p>
              <p className="leading-relaxed mb-4">
                You represent and warrant that <strong>(i)</strong> you have the legal right to use any payment method in connection with a Tour Booking, and <strong>(ii)</strong> all information you supply is true, correct, and complete. We may use third-party services to process payments and to complete bookings. By submitting your information, you grant us the right to provide that information to third parties subject to our Privacy Policy.
              </p>
              <p className="leading-relaxed mb-6">
                We reserve the right to refuse or cancel any booking for reasons including, but not limited to, service availability, pricing or descriptive errors, suspected fraud or unauthorized/illegal activity, or errors in your booking information.
              </p>

              <h3 className="text-xl font-bold text-slate-900 mb-3 mt-8">3.1 Booking Information Accuracy & Modifications</h3>
              <p className="leading-relaxed mb-6">
                All information regarding travelers must be <strong>true and complete</strong> at the time of booking. Requests for modifications/amendments must be sent by email to <strong>info@egypt-excursionsonline.com</strong>.
              </p>

              <h3 className="text-xl font-bold text-slate-900 mb-3 mt-8">3.2 Ways to Book</h3>
              <p className="leading-relaxed mb-3">You may book a tour with us via any of the following:</p>
              <ul className="space-y-2 ms-6">
                <li className="leading-relaxed"><strong>Our site:</strong> https://www.egypt-excursionsonline.com</li>
                <li className="leading-relaxed"><strong>By phone (Egypt) or via email / Online Support Team</strong><br/>EGY: +20 11 42255624</li>
              </ul>

              <h3 className="text-xl font-bold text-slate-900 mb-3 mt-8">3.3 After Payment & Voucher</h3>
              <p className="leading-relaxed mb-6">
                After paying the tour cost by credit/debit card, an <strong>invoice and trip voucher</strong> (including pickup time and other relevant information) will be issued to you via email.
              </p>

              <h3 className="text-xl font-bold text-slate-900 mb-3 mt-8">3.4 Traveler Phone Numbers & Documents</h3>
              <ul className="space-y-2 ms-6">
                <li className="leading-relaxed">Your <strong>phone number</strong> is required so we can contact you in case of itinerary updates.</li>
                <li className="leading-relaxed">For certain private tours, you may be asked to send a <strong>copy of your passport</strong> to complete arrangements.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">4. Contests, Sweepstakes, and Promotions</h2>
              <p className="leading-relaxed">
                Any contests, sweepstakes, or other promotions (collectively, <strong>"Promotions"</strong>) made available through the Service may be governed by rules separate from these Terms. If you participate in any Promotions, please review the applicable rules and our Privacy Policy. If Promotion rules conflict with these Terms, the Promotion rules will apply.
              </p>
            </div>

            {/* Section 5 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">5. Refunds & Cancellations</h2>
              <p className="leading-relaxed mb-6">
                We issue refunds for bookings within <strong>1 day (24 hours)</strong> of the original purchase unless otherwise stated in the specific product's cancellation policy or required by applicable law.
              </p>

              <h3 className="text-xl font-bold text-slate-900 mb-3 mt-8">5.1 Cancellation Scale (unless otherwise stated)</h3>
              <ul className="space-y-2 ms-6 mb-4">
                <li className="leading-relaxed"><strong>7 days before the trip:</strong> Full refund (except Flights, Boats, and Private Tours).</li>
                <li className="leading-relaxed"><strong>4 days before the trip:</strong> 50% refund (except Flights, Boats, and Private Tours).</li>
                <li className="leading-relaxed"><strong>1 day before or on the day of the trip:</strong> No refund.</li>
              </ul>
              <p className="leading-relaxed mb-3">
                If the Company cancels your trip for any reason, a <strong>full refund</strong> will be provided.
              </p>
              <p className="leading-relaxed mb-6">
                Cancellations due to sickness may require a doctor's certificate; refunds in such cases are at management's discretion.
              </p>

              <h3 className="text-xl font-bold text-slate-900 mb-3 mt-8">5A. Payment Policy</h3>
              <p className="leading-relaxed mb-4">
                <strong className="text-slate-900">Cash payment:</strong> Per our policy, cash balances for tours must be paid <strong>2 days before the tour</strong> to our local supplier in order to receive your paid voucher.
              </p>
              <p className="leading-relaxed mb-4">
                Certain tours (e.g., Cairo by plane, Petra by air or ferry) must be <strong>fully prepaid in advance</strong>.
              </p>
              <p className="leading-relaxed mb-4">
                Upon arrival, please contact us at <strong>+20 11 42255624</strong> (or email) with your room number; we will reconfirm your pickup time.
              </p>
              <p className="leading-relaxed mb-4">
                <strong>Accepted cash currencies:</strong> GBP (Pounds Sterling), USD, EUR, and EGP, calculated per the prevailing Egypt rate on the tour date.
              </p>
              <p className="leading-relaxed mb-4">
                <strong className="text-slate-900">Card payment:</strong> If you prefer to pay the outstanding balance by card, we accept <strong>Visa, MasterCard, American Express, and PayPal</strong>.
              </p>
              <p className="leading-relaxed">
                <strong>Merchant of Record / Statement Name:</strong> Excursions Online LLC FZ.
                You may be charged in GBP or your preferred currency at the conversion rate applicable on the date of payment.
              </p>
            </div>

            {/* Section 6 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">6. Content</h2>
              <p className="leading-relaxed">
                The content found on or through the Service is the property of <strong>Egypt Excursions Online</strong> or used with permission. You may not distribute, modify, transmit, reuse, download, repost, copy, or use such content, whether in whole or in part, for commercial purposes or personal gain without our prior express written permission.
              </p>
            </div>

            {/* Section 7 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">7. Prohibited Uses</h2>
              <p className="leading-relaxed mb-4">
                You may use the Service only for <strong>lawful purposes</strong> and in accordance with these Terms. You agree not to use the Service:
              </p>
              <ol className="space-y-2 ms-6 mb-4 list-decimal">
                <li className="leading-relaxed">In any way that violates any applicable national or international law or regulation.</li>
                <li className="leading-relaxed">To exploit, harm, or attempt to exploit or harm minors in any way.</li>
                <li className="leading-relaxed">To transmit or procure the sending of any unsolicited advertising or promotional material ("spam").</li>
                <li className="leading-relaxed">To impersonate the Company, a Company employee, another user, or any other person or entity.</li>
                <li className="leading-relaxed">In any way that infringes upon the rights of others or is illegal, threatening, fraudulent, or harmful.</li>
                <li className="leading-relaxed">To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service or that may harm the Company or users of the Service or expose them to liability.</li>
              </ol>
              <p className="leading-relaxed mb-4"><strong>Additionally, you agree not to:</strong></p>
              <ol className="space-y-2 ms-6 list-decimal">
                <li className="leading-relaxed">Use the Service in any manner that could disable, overburden, damage, or impair the Service or interfere with others' use of the Service.</li>
                <li className="leading-relaxed">Use any robot, spider, or other automatic device, process, or means to access the Service for any purpose, including monitoring or copying material on the Service.</li>
                <li className="leading-relaxed">Use any manual process to monitor or copy any material on the Service without our prior written consent.</li>
                <li className="leading-relaxed">Use any device, software, or routine that interferes with the proper working of the Service.</li>
                <li className="leading-relaxed">Introduce viruses, Trojan horses, worms, logic bombs, or other material that is malicious or technologically harmful.</li>
                <li className="leading-relaxed">Attempt to gain unauthorized access to, interfere with, damage, or disrupt any parts of the Service, the server on which the Service is stored, or any server, computer, or database connected to the Service.</li>
                <li className="leading-relaxed">Attack the Service via a denial-of-service or distributed denial-of-service attack.</li>
                <li className="leading-relaxed">Take any action that may damage or falsify the Company rating.</li>
                <li className="leading-relaxed">Otherwise attempt to interfere with the proper working of the Service.</li>
              </ol>
            </div>

            {/* Section 8 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">8. Analytics</h2>
              <p className="leading-relaxed">
                We may use third-party service providers to monitor and analyze the use of the Service.
              </p>
            </div>

            {/* Section 9 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">9. No Use by Minors</h2>
              <p className="leading-relaxed">
                The Service is intended only for individuals at least <strong>eighteen (18) years old</strong>. By accessing or using the Service, you represent and warrant that you are at least 18 years of age and have the full authority and capacity to enter into the Agreements. If you are not at least 18 years old, you are prohibited from accessing or using the Service.
              </p>
            </div>

            {/* Section 10 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">10. Intellectual Property</h2>
              <p className="leading-relaxed">
                The Service and its original content (excluding content provided by users), features, and functionality are and will remain the <strong>exclusive property</strong> of Egypt Excursions Online and its licensors, and are protected by copyright, trademark, and other laws. Our trademarks may not be used in connection with any product or service without our prior written consent.
              </p>
            </div>

            {/* Section 11 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">11. Copyright Policy</h2>
              <p className="leading-relaxed mb-4">
                We respect the intellectual property rights of others and will respond to claims that content posted on the Service infringes the copyright or other intellectual property rights of any person or entity. If you believe your copyrighted work has been copied in a way that constitutes infringement, please email <strong>info@egypt-excursionsonline.com</strong> with the subject line <strong>"Copyright Infringement"</strong>, including the details set forth below under Section 12.
              </p>
              <p className="leading-relaxed">
                You may be held liable for damages (including costs and attorneys' fees) for misrepresentation or bad-faith claims.
              </p>
            </div>

            {/* Section 12 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">12. DMCA Notice and Procedure for Copyright Infringement Claims</h2>
              <p className="leading-relaxed mb-4">
                You may submit a notification under the <strong>Digital Millennium Copyright Act (DMCA)</strong> by providing our Copyright Agent with the following information in writing (see 17 U.S.C. §512(c)(3) for further detail):
              </p>
              <ol className="space-y-2 ms-6 mb-4 list-decimal">
                <li className="leading-relaxed">An electronic or physical signature of the person authorized to act on behalf of the copyright owner.</li>
                <li className="leading-relaxed">A description of the copyrighted work that you claim has been infringed, including the URL of the location where the copyrighted work exists or a copy of the work.</li>
                <li className="leading-relaxed">Identification of the URL or other specific location on the Service where the material that you claim is infringing is located.</li>
                <li className="leading-relaxed">Your address, telephone number, and email address.</li>
                <li className="leading-relaxed">A statement by you that you have a good-faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law.</li>
                <li className="leading-relaxed">A statement by you, made under penalty of perjury, that the information in your notice is accurate and that you are authorized to act on the copyright owner's behalf.</li>
              </ol>
              <p className="leading-relaxed"><strong>Copyright Agent Contact:</strong> info@egypt-excursionsonline.com</p>
            </div>

            {/* Section 13 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">13. Error Reporting and Feedback</h2>
              <p className="leading-relaxed">
                You may provide us with feedback, suggestions for improvements, ideas, problems, or other matters related to the Service (<strong>"Feedback"</strong>) by emailing <strong>info@egypt-excursionsonline.com</strong> or via third-party tools. You agree that <strong>(i)</strong> you will not retain or assert any IP or other rights in the Feedback; <strong>(ii)</strong> the Company may have developed ideas similar to the Feedback; <strong>(iii)</strong> Feedback is non-confidential; and <strong>(iv)</strong> the Company has no obligation of confidentiality with respect to the Feedback. Where ownership transfer is not possible under applicable law, you grant the Company an exclusive, transferable, irrevocable, royalty-free, sublicensable, perpetual license to use and commercialize the Feedback.
              </p>
            </div>

            {/* Section 14 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">14. Links to Other Websites</h2>
              <p className="leading-relaxed">
                The Service may contain links to third-party websites or services that are not owned or controlled by Egypt Excursions Online. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services. You acknowledge and agree that the Company shall not be responsible or liable, directly or indirectly, for any damage or loss caused by or in connection with use of or reliance on any such content, goods, or services. We strongly advise you to review the terms and privacy policies of any third-party websites or services that you visit.
              </p>
            </div>

            {/* Section 15 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">15. Disclaimer of Warranty</h2>
              <p className="leading-relaxed mb-4 uppercase text-sm">
                <strong>The Service is provided on an "as is" and "as available" basis. The Company makes no representations or warranties of any kind, express or implied, regarding the operation of the Service or the information, content, or materials included therein. You expressly agree that your use of the Service is at your sole risk.</strong>
              </p>
              <p className="leading-relaxed mb-4 uppercase text-sm">
                <strong>Neither the Company nor any person associated with the Company makes any warranty or representation with respect to the completeness, security, reliability, quality, accuracy, or availability of the Service. Without limiting the foregoing, neither the Company nor anyone associated with the Company represents or warrants that the Service or its content will be accurate, reliable, error-free, or uninterrupted, that defects will be corrected, that the Service or the server that makes it available are free of viruses or other harmful components, or that the Service will otherwise meet your needs or expectations.</strong>
              </p>
              <p className="leading-relaxed uppercase text-sm">
                <strong>To the fullest extent permitted by law, the Company disclaims all warranties, whether express or implied, statutory or otherwise, including but not limited to warranties of merchantability, non-infringement, and fitness for a particular purpose.</strong>
              </p>
            </div>

            {/* Section 16 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">16. Limitation of Liability</h2>
              <p className="leading-relaxed uppercase text-sm">
                <strong>Except as prohibited by law, you will hold us and our officers, directors, employees, and agents harmless for any indirect, punitive, special, incidental, or consequential damage, however it arises (including attorneys' fees and all related costs), whether in an action of contract, negligence, or other tort, arising out of or in connection with these Terms or the Service. Except as prohibited by law, if liability is found on the part of the Company, it will be limited to the amount paid for the products and/or services, and in no event shall there be consequential or punitive damages. Some jurisdictions do not allow the exclusion or limitation of certain damages; in such jurisdictions, the above limitations shall apply to the maximum extent permitted by law.</strong>
              </p>
            </div>

            {/* Section 17 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">17. Termination</h2>
              <p className="leading-relaxed">
                We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, at our sole discretion for any reason, including without limitation a breach of these Terms. If you wish to terminate your account, you may simply discontinue using the Service. Sections that by their nature should survive termination will survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
              </p>
            </div>

            {/* Section 18 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">18. Governing Law</h2>
              <p className="leading-relaxed">
                These Terms are governed by and construed in accordance with the laws of the <strong>Arab Republic of Egypt</strong>, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision is held to be invalid or unenforceable by a court, the remaining provisions will remain in effect. These Terms constitute the entire agreement between you and us regarding the Service and supersede all prior agreements regarding the Service.
              </p>
            </div>

            {/* Section 19 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">19. Changes to Service</h2>
              <p className="leading-relaxed">
                We reserve the right to withdraw or amend the Service, and any service or material we provide via the Service, in our sole discretion without notice. We will not be liable if for any reason all or any part of the Service is unavailable at any time or for any period. From time to time, we may restrict access to some parts of the Service, or the entire Service, to users, including registered users.
              </p>
            </div>

            {/* Section 20 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">20. Amendments to Terms</h2>
              <p className="leading-relaxed">
                We may amend these Terms at any time by posting the amended terms on the Service. It is your responsibility to review the Terms periodically. Your continued use of the Service following the posting of revised Terms means that you accept and agree to the changes. If you do not agree to the new Terms, you are no longer authorized to use the Service.
              </p>
            </div>

            {/* Section 21 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">21. Waiver and Severability</h2>
              <p className="leading-relaxed">
                No waiver by the Company of any term or condition set out in these Terms shall be deemed a further or continuing waiver of such term or condition or a waiver of any other term or condition. If any provision of these Terms is held by a court or other tribunal of competent jurisdiction to be invalid, illegal, or unenforceable for any reason, such provision shall be eliminated or limited to the minimum extent such that the remaining provisions will continue in full force and effect.
              </p>
            </div>

            {/* Section 22 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">22. Acknowledgement</h2>
              <p className="leading-relaxed mb-6 uppercase text-sm">
                <strong>By using the Service or other services provided by us, you acknowledge that you have read these Terms of Service and agree to be bound by them.</strong>
              </p>

              <h3 className="text-xl font-bold text-slate-900 mb-3 mt-8">22A. Operational Information & Disclaimers</h3>
              <p className="leading-relaxed mb-4">
                <strong className="text-slate-900">Passport validity:</strong> Your passport should be valid for at least <strong>6 months</strong> to avoid tour cancellation.
              </p>
              <p className="leading-relaxed mb-4">
                <strong className="text-slate-900">Police checkpoints:</strong> Intercity travel in Egypt may involve highway checkpoints; you may be required to show a passport.
              </p>
              <p className="leading-relaxed mb-4">
                <strong className="text-slate-900">Complaints:</strong> If you experience any problem during Tours/Transfers, notify our representative or Company Hotline immediately so we can attempt to resolve it on the spot. Post-trip complaints are difficult to remedy.
              </p>
              <p className="leading-relaxed mb-4">
                <strong className="text-slate-900">Partial participation:</strong> If you choose not to participate in any portion of a tour once started, no refund will be issued for unused services (many services are prepaid and capacity-based).
              </p>
              <p className="leading-relaxed mb-4">
                <strong className="text-slate-900">Agent role & Force Majeure:</strong> We act as an agent for participants with respect to travel by railroad, motor coach, private car, boat, aircraft, or other conveyance, and assume no liability for injury, illness, damage, loss, accident, delay, or irregularity to person or property resulting directly or indirectly from causes including, but not limited to: weather, acts of God, force majeure, governmental acts, civil disturbances, labor disputes, riots, theft, mechanical breakdowns, quarantines, defaults, delays, cancellations, or changes by any hotel, carrier, or restaurant. We accept no responsibility for any additional expenses arising therefrom.
              </p>
              <p className="leading-relaxed mb-3">
                <strong className="text-slate-900">Local suppliers:</strong> We carefully select local providers in each city to deliver quality service and value.
              </p>
              <p className="leading-relaxed mb-3">
                <strong className="text-slate-900">Drivers:</strong> Our drivers are chosen for experience and safety.
              </p>
              <p className="leading-relaxed">
                <strong className="text-slate-900">Guides:</strong> We work with qualified and certified tour guides across Egypt.
              </p>
            </div>

            {/* Section 23 */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b-2 border-slate-200">23. Contact Us</h2>
              <p className="leading-relaxed">
                Questions, feedback, or requests for support may be sent to <strong>info@egypt-excursionsonline.com</strong>. For privacy inquiries and data rights, please see our separate Privacy Policy page.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}