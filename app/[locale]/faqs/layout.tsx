import FAQSchema from '@/components/schema/FAQSchema';
import WebSiteSchema from '@/components/schema/WebSiteSchema';

const faqItems = [
  { question: 'How do I book a tour or ticket?', answer: 'Simply choose your preferred tour, select your date and number of participants, and complete the checkout. Your booking is confirmed instantly after payment.' },
  { question: 'Is my booking confirmed instantly?', answer: 'Yes, most bookings are confirmed instantly after successful payment. You will receive a confirmation email with your tickets.' },
  { question: 'Do I need to print my ticket?', answer: 'No. All our tickets are mobile-friendly. Simply show the e-ticket on your phone.' },
  { question: 'Can I cancel or reschedule my tickets?', answer: 'Yes, in most cases you can cancel or reschedule up to 24 hours before the tour. Check specific tour terms for details.' },
  { question: 'Are there any hidden fees?', answer: 'No. The price shown on the product page is the final price with no hidden charges.' },
  { question: 'What languages do the tour guides speak?', answer: 'Tours are commonly offered in English and the local language. Many offer audio guides in multiple languages.' },
  { question: 'What if my tour is canceled by the provider?', answer: 'We will notify you immediately and provide a full refund or help find a suitable alternative.' },
  { question: 'Is my payment secure?', answer: 'Yes. We use industry-standard SSL encryption and process payments securely through Stripe.' },
];

export default function FAQsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FAQSchema items={faqItems} />
      <WebSiteSchema
        pageName="Frequently Asked Questions - Egypt Excursions Online"
        pageDescription="Find answers to common questions about booking tours, payments, cancellations, and more."
        pageUrl="/faqs"
        breadcrumbs={[{ name: 'Home', url: '/' }, { name: 'FAQs', url: '/faqs' }]}
      />
      {children}
    </>
  );
}
