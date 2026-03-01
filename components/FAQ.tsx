'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { isRTL } from '@/i18n/config';
import type { IFAQContent, IFAQItem } from '@/lib/models/Tenant';

// Props interface for server-side content injection
export interface FAQProps {
  content?: IFAQContent | null;
}

type FAQItem = IFAQItem;

// Fallback FAQs (used when DB content is not available)
const FALLBACK_FAQS: Record<string, FAQItem[]> = {
    'hurghada-speedboat': [
        {
            question: 'What should I bring on the speedboat trip?',
            answer: 'We recommend bringing sunscreen, sunglasses, a hat, swimwear, a towel, and a waterproof bag for your phone. Snorkeling equipment is provided on all trips.'
        },
        {
            question: 'Is the trip suitable for non-swimmers?',
            answer: 'Yes! Life jackets are provided and our crew is trained to assist non-swimmers. The snorkeling spots have calm, shallow areas perfect for beginners. You can also enjoy the beach and views without going in the water.'
        },
        {
            question: 'Will we definitely see dolphins on the Dolphin House trip?',
            answer: 'Dolphin House has a 95%+ success rate for dolphin sightings. However, as these are wild animals, sightings cannot be 100% guaranteed. If no dolphins are spotted, we offer a 50% refund or free rebooking.'
        },
        {
            question: 'What time does hotel pickup start?',
            answer: 'Pickup times vary by hotel location, typically between 7:30 AM - 8:30 AM for full-day trips. You will receive exact pickup time via email/WhatsApp the evening before your trip.'
        },
        {
            question: 'Can children join the speedboat trips?',
            answer: 'Yes! Children of all ages are welcome on most trips. We have child-sized life jackets and snorkeling gear. Some water sports activities have minimum age requirements (usually 8+).'
        },
        {
            question: 'What is included in the lunch?',
            answer: 'Our trips include a freshly prepared buffet lunch with grilled fish/chicken, rice, salads, bread, and fresh fruits. Vegetarian options are available upon request. Soft drinks and water are included throughout the day.'
        },
        {
            question: 'Can I book a private boat for my group?',
            answer: 'Absolutely! We offer private speedboat charters for groups up to 10 people. Private trips can be customized to your preferences - choose your destinations, timing, and activities. Contact us for special pricing.'
        },
        {
            question: 'What happens if there is bad weather?',
            answer: 'Safety is our priority. If weather conditions are unsuitable (strong winds, rough seas), we will contact you to reschedule to the next available day or offer a full refund.'
        },
        {
            question: 'How do I cancel or reschedule?',
            answer: 'Free cancellation is available up to 24 hours before your trip for a full refund. To reschedule or cancel, contact us via WhatsApp, email, or through your booking confirmation link.'
        },
        {
            question: 'Is snorkeling equipment included?',
            answer: 'Yes! High-quality snorkeling equipment (mask, snorkel, fins) is included free of charge on all our trips. If you prefer, you can bring your own equipment.'
        }
    ],
    'default': [
        {
            question: 'Can I reschedule or cancel my tickets?',
            answer: 'Yes, in most cases you can reschedule or cancel your tickets up to 24 hours in advance. Please check the specific conditions for your chosen tour or attraction on its product page. Some special events may have different policies.'
        },
        {
            question: 'How long are open tickets valid?',
            answer: 'Open tickets, which do not require a specific date and time slot, are typically valid for one year from the date of purchase. We always recommend checking the "Details" section on the ticket page for the exact validity period.'
        },
        {
            question: 'What languages do the tour guides speak?',
            answer: 'Our live guided tours are most commonly offered in English and the local language. Many tours also offer audio guides in multiple languages, including Spanish, French, German, Italian, and more. The available languages are always listed on the product page.'
        },
        {
            question: 'Is my booking confirmed instantly?',
            answer: 'Yes, most of our bookings are confirmed instantly after a successful payment. You will receive a booking confirmation email with your tickets and all necessary information right away.'
        },
        {
            question: 'Do I need to print my ticket?',
            answer: 'No, you don\'t! All our tickets are mobile-friendly. You can simply show the e-ticket on your smartphone or tablet to the tour guide or at the entrance. This makes your experience smooth and hassle-free.'
        },
        {
            question: 'What happens if my tour is canceled by the operator?',
            answer: 'In the rare event that a tour is canceled by the operator due to unforeseen circumstances (e.g., bad weather), we will notify you immediately via email and provide a full refund or help you find a suitable alternative.'
        },
        {
            question: 'Are there any hidden fees?',
            answer: 'The price you see on the product page is the final price. It includes all taxes and fees unless otherwise stated. We believe in transparent pricing, so you won\'t be surprised by any extra charges at checkout.'
        },
        {
            question: 'Can I pay with a different currency?',
            answer: 'Yes, our website supports multiple currencies. You can change your preferred currency at the top of the page. The final payment will be processed in your chosen currency at the prevailing exchange rate.'
        },
        {
            question: 'Are the tours accessible for people with disabilities?',
            answer: 'Accessibility varies by tour. We provide detailed information about accessibility on each product page. If you have specific needs, we recommend contacting our support team before booking to ensure the tour is suitable for you.'
        },
        {
            question: 'What should I bring on my tour?',
            answer: 'The items you should bring depend on the tour. We generally recommend comfortable shoes, a water bottle, and weather-appropriate clothing. Specific recommendations are listed in the "What to bring" section on each product page.'
        }
    ]
};

const FALLBACK_FAQS_AR: Record<string, FAQItem[]> = {
    'hurghada-speedboat': [
        {
            question: 'ماذا يجب أن أحضر معي في رحلة القارب السريع؟',
            answer: 'ننصح بإحضار واقي الشمس، النظارات الشمسية، قبعة، ملابس سباحة، منشفة، وحقيبة مقاومة للماء للهاتف. معدات السنوركل متوفرة في جميع الرحلات.'
        },
        {
            question: 'هل الرحلة مناسبة لغير السباحين؟',
            answer: 'نعم. نوفر سترات نجاة وفريقنا مدرّب لمساعدة غير السباحين. كما توجد مناطق هادئة وضحلة مناسبة للمبتدئين ويمكنك الاستمتاع بالشاطئ دون النزول للماء.'
        },
        {
            question: 'هل سنرى الدلافين بالتأكيد في رحلة Dolphin House؟',
            answer: 'احتمال رؤية الدلافين مرتفع جدًا، لكن لا يمكن ضمان ذلك بنسبة 100% لأنها كائنات برية. في حال عدم الرؤية نوفر تعويضًا مناسبًا بحسب سياسة المشغل.'
        },
        {
            question: 'متى يبدأ اصطحاب الفنادق؟',
            answer: 'تختلف مواعيد الاصطحاب حسب موقع الفندق، وغالبًا بين 7:30 و8:30 صباحًا للرحلات اليومية. ستصلك التفاصيل الدقيقة عبر البريد أو واتساب قبل الرحلة.'
        },
        {
            question: 'هل يمكن للأطفال الانضمام لرحلات القارب السريع؟',
            answer: 'نعم، معظم الرحلات مناسبة للأطفال مع توفر سترات نجاة ومعدات مناسبة للأعمار الصغيرة. بعض الأنشطة المائية قد تتطلب عمرًا أدنى.'
        },
        {
            question: 'ماذا يشمل الغداء؟',
            answer: 'تشمل الرحلات عادة غداءً طازجًا مع خيارات متنوعة ومشروبات خفيفة ومياه خلال اليوم. تتوفر خيارات نباتية عند الطلب.'
        },
        {
            question: 'هل يمكن حجز قارب خاص لمجموعتي؟',
            answer: 'نعم، نوفر حجوزات خاصة للمجموعات مع إمكانية تخصيص الوجهات والتوقيت والأنشطة حسب رغبتكم.'
        },
        {
            question: 'ماذا يحدث في حال سوء الأحوال الجوية؟',
            answer: 'السلامة أولويتنا. إذا كانت الظروف غير مناسبة، سنساعدك في إعادة الجدولة أو استرداد المبلغ وفق سياسة الحجز.'
        },
        {
            question: 'كيف يمكنني الإلغاء أو إعادة الجدولة؟',
            answer: 'يتوفر الإلغاء المجاني غالبًا حتى 24 ساعة قبل الرحلة. يمكن الإلغاء أو التعديل عبر واتساب أو البريد أو رابط تأكيد الحجز.'
        },
        {
            question: 'هل معدات السنوركل مشمولة؟',
            answer: 'نعم، معدات السنوركل (ماسك، أنبوب، زعانف) مشمولة في جميع الرحلات ويمكنك إحضار معداتك الخاصة إذا رغبت.'
        }
    ],
    'default': [
        {
            question: 'هل يمكنني تعديل أو إلغاء التذاكر؟',
            answer: 'نعم، في أغلب الحالات يمكنك التعديل أو الإلغاء حتى 24 ساعة قبل الموعد. راجع شروط المنتج المحدد لأن بعض الفعاليات لها سياسات مختلفة.'
        },
        {
            question: 'كم مدة صلاحية التذاكر المفتوحة؟',
            answer: 'عادةً تكون التذاكر المفتوحة صالحة لمدة تصل إلى سنة من تاريخ الشراء، ويجب التأكد من التفاصيل في صفحة المنتج.'
        },
        {
            question: 'ما اللغات المتوفرة للمرشدين؟',
            answer: 'غالبًا تتوفر الجولات بالإنجليزية واللغة المحلية، كما قد تتوفر أدلة صوتية بلغات إضافية حسب الجولة.'
        },
        {
            question: 'هل يتم تأكيد الحجز فورًا؟',
            answer: 'نعم، معظم الحجوزات تؤكد فور نجاح الدفع، وستصلك رسالة تأكيد تتضمن تفاصيل الحجز مباشرة.'
        },
        {
            question: 'هل يجب طباعة التذكرة؟',
            answer: 'لا، التذاكر إلكترونية ويمكن عرضها من الهاتف عند نقطة الدخول أو الالتقاء.'
        },
        {
            question: 'ماذا لو أُلغي النشاط من طرف المشغل؟',
            answer: 'في الحالات النادرة سنقوم بإبلاغك فورًا وتوفير استرداد كامل أو مساعدتك في اختيار بديل مناسب.'
        },
        {
            question: 'هل هناك رسوم مخفية؟',
            answer: 'لا، السعر الظاهر هو النهائي ما لم يُذكر خلاف ذلك بوضوح في صفحة المنتج.'
        },
        {
            question: 'هل يمكن الدفع بعملة مختلفة؟',
            answer: 'نعم، يدعم الموقع عدة عملات ويمكنك اختيار العملة المفضلة قبل الدفع.'
        },
        {
            question: 'هل الجولات مناسبة لذوي الاحتياجات الخاصة؟',
            answer: 'تختلف إمكانية الوصول حسب الجولة. راجع تفاصيل المنتج أو تواصل مع الدعم قبل الحجز.'
        },
        {
            question: 'ماذا يجب أن أحضر معي في الجولة؟',
            answer: 'ننصح بأحذية مريحة، زجاجة ماء، وملابس مناسبة للطقس. وستجد التفاصيل الإضافية في صفحة كل جولة.'
        }
    ]
};

const FaqItem = ({ item, rtl }: { item: FAQItem; rtl: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-slate-200 py-4 sm:py-5 md:py-6 group">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex justify-between items-start gap-3 sm:gap-4 transition-colors ${rtl ? 'text-right' : 'text-start'}`}
                aria-expanded={isOpen}
            >
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 group-hover:text-[var(--primary-color)] transition-colors flex-1">{item.question}</h3>
                {isOpen ? (
                    <Minus className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 transform rotate-180 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary-color)' }} />
                ) : (
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 transition-transform duration-300 flex-shrink-0 mt-0.5" />
                )}
            </button>
            <div
                className={`grid transition-all duration-500 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100 pt-3 sm:pt-4' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden">
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                        {item.answer}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default function FAQ({ content: dbContent }: FAQProps) {
    const t = useTranslations('destinations');
    const locale = useLocale();
    const rtl = isRTL(locale);
    const { tenant } = useTenant();
    const tenantId = tenant?.tenantId || 'default';

    // Use DB content if available, otherwise fall back to hardcoded content
    const localeFallback = rtl ? FALLBACK_FAQS_AR : FALLBACK_FAQS;
    const fallbackFaqs = localeFallback[tenantId] || localeFallback['default'];
    const faqData = dbContent?.faqs?.length ? dbContent.faqs : fallbackFaqs;
    const title = dbContent?.title || t('faqTitle');
    const ctaText = dbContent?.ctaText || t('viewAllFaqs');
    const ctaLink = dbContent?.ctaLink || '/faqs';

    return (
        <section className="bg-white py-12 sm:py-16 md:py-20 font-sans" dir={rtl ? 'rtl' : 'ltr'}>
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-8 sm:mb-10">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight px-4">
                        {title}
                    </h2>
                </div>
                <div className="space-y-3 sm:space-y-4">
                    {faqData.map((item, index) => (
                        <FaqItem key={index} item={item} rtl={rtl} />
                    ))}
                </div>
                <div className="text-center mt-8 sm:mt-10 md:mt-12">
                    <Link
                      href={ctaLink}
                      className="inline-flex justify-center items-center h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base font-bold border-2 transition-all duration-300 ease-in-out rounded-full hover:text-white"
                      style={{
                        color: 'var(--primary-color)',
                        borderColor: 'var(--primary-color)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-color)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--primary-color)'; }}
                      role="button"
                      aria-label={t('viewAllFaqs')}
                    >
                        {ctaText}
                    </Link>
                </div>
            </div>
        </section>
    );
}
