'use client';

import React, { useState } from "react";
import { 
  Plus, Minus
} from "lucide-react";
import Image from "next/image";

// Import reusable components
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// =================================================================
// --- DARK HERO SECTION COMPONENT ---
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
// --- FAQs DATA (EXPANDED) ---
// =================================================================
const faqsData = [
  {
    category: "Booking & Tickets",
    faqs: [
      {
        question: "How do I book a tour or ticket?",
        answer: "You can easily book a tour or ticket directly on our website. Simply find the activity you want, choose your date and time, and follow the steps to complete your booking. You'll receive a mobile ticket via email that you can show on your smartphone."
      },
      {
        question: "Is my booking confirmed instantly?",
        answer: "Yes, most of our bookings are confirmed instantly after a successful payment. You will receive a booking confirmation email with your tickets and all necessary information right away."
      },
      {
        question: "Do I need to print my ticket?",
        answer: "No, you don't! All our tickets are mobile-friendly. You can simply show the e-ticket on your smartphone or tablet to the tour guide or at the entrance. This makes your experience smooth and hassle-free."
      },
      {
        question: "What is an open ticket and how long is it valid?",
        answer: "An open ticket does not require a specific date and time slot. They are typically valid for one year from the date of purchase. We always recommend checking the 'Details' section on the ticket page for the exact validity period."
      },
      {
        question: "Can I book for someone else?",
        answer: "Yes, you can book on behalf of others. The confirmation will be sent to your email address, and you are responsible for forwarding the tickets and information to the traveler."
      },
      {
        question: "What information is required to make a booking?",
        answer: "We typically require your full name, email address, and phone number to secure a booking. For some tours, additional information like passport details or age might be necessary."
      },
      {
        question: "I haven't received my confirmation email. What should I do?",
        answer: "First, please check your spam or junk folder. If it's not there, it's possible you entered an incorrect email address. Please contact our customer support with your booking reference number or name, and we'll help you resolve the issue."
      },
      {
        question: "Can I make changes to my booking after it's confirmed?",
        answer: "Booking modifications depend on the specific tour's policy. Some bookings can be changed, while others are final. Please check the product page or contact customer support for assistance."
      },
      {
        question: "What is a 'Combi Ticket'?",
        answer: "A Combi Ticket is a bundle of tickets for two or more attractions or tours sold together at a discounted price. It's a great way to save money and plan your itinerary efficiently."
      },
      {
        question: "How do I use my mobile ticket?",
        answer: "Simply show the QR code or barcode on your smartphone at the entrance of the attraction or to your tour guide. There is no need for a physical copy."
      }
    ]
  },
  {
    category: "Payments & Refunds",
    faqs: [
      {
        question: "Are tickets refundable?",
        answer: "Refund policies vary by tour. Most of our tickets are fully refundable if canceled within the free cancellation window. The specific refund details are listed on each product page and in your booking confirmation."
      },
      {
        question: "Can I cancel or reschedule my tickets?",
        answer: "Yes, you can cancel most tickets for free up to 8 hours before the scheduled activity time. To reschedule, you'll need to cancel your original booking and make a new one. Please check the specific policy for your chosen activity."
      },
      {
        question: "Is my payment secure?",
        answer: "Yes, all payments are processed through a secure, encrypted connection. We do not store your credit card information on our servers, ensuring your data is always safe."
      },
      {
        question: "Can I pay with a different currency?",
        answer: "Yes, our website supports multiple currencies. You can change your preferred currency at the top of the page. The final payment will be processed in your chosen currency at the prevailing exchange rate."
      },
      {
        question: "Are there any hidden fees?",
        answer: "The price you see on the product page is the final price. It includes all taxes and fees unless otherwise stated. We believe in transparent pricing, so you won't be surprised by any extra charges at checkout."
      },
      {
        question: "I have a discount code. How do I use it?",
        answer: "You can apply your discount code on the checkout page. There will be an option to enter your code, and the discount will be applied to your total price."
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit and debit cards, including Visa, MasterCard, and American Express. We also accept payments via PayPal, Apple Pay, and Google Pay in supported regions."
      },
    ]
  },
  {
    category: "Tours & Activities",
    faqs: [
      {
        question: "What languages do the tour guides speak?",
        answer: "Our tour guides are knowledgeable and multilingual. The languages offered for a specific tour are listed on the tour's product page. English is available on all tours, with many also offering Spanish, French, German, and more."
      },
      {
        question: "What if my tour is canceled by the provider?",
        answer: "In the rare event that a tour is canceled by the provider, we will notify you immediately and provide a full refund. We will also help you find a suitable alternative for your trip."
      },
      {
        question: "Are the tours accessible for people with disabilities?",
        answer: "Accessibility varies by tour. We provide detailed information about accessibility on each product page. If you have specific needs, we recommend contacting our support team before booking to ensure the tour is suitable for you."
      },
      {
        question: "What should I bring on my tour?",
        answer: "The items you should bring depend on the tour. We generally recommend comfortable shoes, a water bottle, and weather-appropriate clothing. Specific recommendations are listed in the 'What to bring' section on each product page."
      },
      {
        question: "Are food and drinks included in the tour price?",
        answer: "Unless specified in the tour's details, food and drinks are not included. Please check the 'What's included' section on the product page for a full list of what is covered."
      },
      {
        question: "How do I find the meeting point for my tour?",
        answer: "The exact meeting point and a map are provided in your booking confirmation email. We recommend arriving at the meeting point at least 15 minutes before the start time."
      },
      {
        question: "Can I bring my children on the tour?",
        answer: "Child-friendly policies vary by tour. Many of our tours are suitable for all ages, while some may have age restrictions. Please check the product page for details and any special rates for children."
      },
      {
        question: "What happens if I'm late for my tour?",
        answer: "Tour operators operate on a strict schedule. If you are late, you may not be able to join the tour and no refund will be issued. We highly recommend arriving on time."
      }
    ]
  },
  {
    category: "Customer Service",
    faqs: [
      {
        question: "How can I contact customer support?",
        answer: "You can contact our customer support team via our contact form on the 'Contact Us' page, by phone, or through our live chat feature. Our team is available from 8:30 to 17:00 EET."
      },
      {
        question: "What are your customer service hours?",
        answer: "Our customer service is available from 8:30 to 17:00 EET, Monday to Friday. We aim to respond to all inquiries within 2 working days."
      },
      {
        question: "Where can I read reviews about your company?",
        answer: "You can find our customer reviews on our website's review section, as well as on platforms like Tripadvisor. We are proud of our high customer satisfaction rating."
      },
      {
        question: "What is your privacy policy?",
        answer: "Our privacy policy outlines how we collect, use, and protect your personal information. You can find the full policy in the footer of our website. We are committed to protecting your data and privacy."
      },
      {
        question: "How do I get an invoice for my booking?",
        answer: "Your booking confirmation email serves as your invoice. If you need a more detailed invoice, please contact our customer support team with your booking details."
      },
    ]
  },
  {
    category: "General Information",
    faqs: [
      {
        question: "Where is your company located?",
        answer: "Our headquarters are based in Egypt. However, as an online platform, we operate globally, providing tours and experiences in many major destinations worldwide."
      },
      {
        question: "How do I create an account?",
        answer: "You can easily create an account on our 'Sign Up' page. Having an account allows you to manage your bookings, save your favorite tours, and speed up the checkout process."
      },
      {
        question: "Can I become an affiliate partner?",
        answer: "Yes, we have an affiliate program for travel bloggers and partners. Please visit our 'Careers' or 'Contact Us' page for more information on how to partner with us."
      },
      {
        question: "How do I stay updated on new tours and deals?",
        answer: "You can sign up for our newsletter at the bottom of our website to receive the latest updates on new tours, exclusive deals, and travel inspiration directly in your inbox."
      },
      {
        question: "Do you offer private tours?",
        answer: "Yes, we offer a selection of private tours for a more personalized experience. You can find these options by filtering your search on our website or by contacting our team for a custom itinerary."
      },
      {
        question: "What is a 'city pass'?",
        answer: "A city pass gives you access to multiple attractions and public transport for a fixed price, usually for a set number of days. It's a convenient and cost-effective way to explore a city."
      },
    ]
  }
];

const FaqItem = ({ item }: { item: typeof faqsData[0]['faqs'][0] }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-slate-200 py-6 group">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left hover:text-red-600 transition-colors"
            >
                <h3 className="text-lg font-semibold text-slate-800 group-hover:text-red-600 transition-colors">{item.question}</h3>
                {isOpen ? (
                    <Minus className="w-6 h-6 text-red-500 transition-transform duration-300 transform rotate-180" />
                ) : (
                    <Plus className="w-6 h-6 text-slate-500 transition-transform duration-300" />
                )}
            </button>
            <div
                className={`grid transition-all duration-500 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100 pt-4' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden">
                    <p className="text-slate-600">
                        {item.answer}
                    </p>
                </div>
            </div>
        </div>
    );
};

// =================================================================
// --- FAQs PAGE COMPONENT ---
// =================================================================
export default function FAQsPage() {
  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <DarkHero />
      <Header />

      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-4xl mx-auto">
          <section className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Find answers to the most common questions about our tours and services.
            </p>
          </section>

          {faqsData.map((category, catIndex) => (
            <div key={catIndex} className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b-2 border-red-600 pb-2 inline-block">
                {category.category}
              </h2>
              <div className="space-y-4">
                {category.faqs.map((faq, faqIndex) => (
                  <FaqItem key={faqIndex} item={faq} />
                ))}
              </div>
            </div>
          ))}

          <section className="text-center mt-12">
            <p className="text-lg text-slate-700">
              Still have questions? Our team is here to help.
            </p>
            <a 
              href="/contact" 
              className="mt-4 inline-block px-8 py-3 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
            >
              Contact Us
            </a>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}