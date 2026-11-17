'use client';

import React, { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Link } from '@/i18n/navigation';
import {
    ArrowRight, Star, Tag, Clock, Users, ChevronLeft, ChevronRight,
    ShoppingCart, Award, MapPin, CheckCircle2,
    Calendar, Shield, Heart, MessageCircle,
    Sun, DollarSign, Languages, Phone,
    Search, Plus, Minus, ChevronUp, X, Sparkles, Compass,
    Bot, Loader2, ArrowLeft, Send
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Destination, Tour, Category, Review } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useLocale } from 'next-intl';
import { isRTL } from '@/i18n/config';
import BookingSidebar from '@/components/BookingSidebar';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { motion, AnimatePresence } from 'framer-motion';
import 'instantsearch.css/themes/satellite.css';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  getDestinationCategories,
  getDestinationPageSearchResults,
  getDestinationTrendingSearches,
} from '@/lib/destinationPageSearch';
import { filterSearchHitsByTenant } from '@/lib/tenantSearchHitFilter';
import { imageMetadataFor } from '@/lib/content/imageMetadata';
import { curateDestinationTours } from '@/lib/content/destinationTourCuration';
import { buildContentBreadcrumbs } from '@/lib/content/breadcrumbs';
import ContentBreadcrumbs from '@/components/navigation/ContentBreadcrumbs';
import { contentPath } from '@/lib/content/contentUrl';

const DESTINATION_HERO_FALLBACK_IMAGE = '/hero2.jpg';

interface DestinationPageClientProps {
  tenantId?: string;
  destination: Destination;
  destinationTours: Tour[];
  allCategories: Category[];
  reviews?: Review[];
  relatedDestinations?: Destination[];
}

type DestinationPageCopy = {
  featured: string;
  tours: string;
  destinations: string;
  categories: string;
  untitledTour: string;
  untitledDestination: string;
  untitledCategory: string;
  hereAreTours: string;
  hereAreDestinations: string;
  askAiAnything: string;
  clearSearch: string;
  stop: string;
  send: string;
  openAiAssistant: string;
  aiDestinationAssistant: string;
  searchResults: string;
  popularSearches: string;
  noTenantResultsTitle: string;
  noTenantResultsBody: (destination: string) => string;
  newChat: string;
  askDestinationPrompt: string;
  trendingTours: string;
  discover: string;
  exploreDestination: (destination: string) => string;
  thingsToDoIn: (destination: string) => string;
  bestToursIn: (destination: string) => string;
  toursCount: (count: number) => string;
  home: string;
  destinationsRoot: string;
  galleryTitle: string;
  practicalTitle: string;
  practicalClimate: string;
  practicalVisa: string;
  practicalLanguages: string;
  practicalEmergency: string;
  practicalSummer: string;
  practicalWinter: string;
  scrollLeft: string;
  scrollRight: string;
  bookNow: string;
  bookings: (count: number) => string;
  statsToursAvailable: string;
  statsHappyTravelers: string;
  statsAverageRating: string;
  statsCustomerSupport: string;
  travelTipsTitle: string;
  travelTipsSubtitle: string;
  travelTipBestTime: string;
  travelTipCurrency: string;
  travelTipLanguages: string;
  travelTipEmergency: string;
  travelTipDefaultBestTime: string;
  travelTipDefaultCurrency: string;
  travelTipDefaultLanguages: string;
  travelTipDefaultEmergency: string;
  aboutTitle: (destination: string) => string;
  aboutFallback: (destination: string) => string;
  learnMoreAboutUs: string;
  aboutExpertGuidesTitle: string;
  aboutExpertGuidesBody: (destination: string) => string;
  aboutQualityTitle: string;
  aboutQualityBody: (destination: string) => string;
  aboutSafeTitle: string;
  aboutSafeBody: string;
  aboutPriceTitle: string;
  aboutPriceBody: (destination: string) => string;
  faqTitle: string;
  faqSubtitle: (destination: string) => string;
  faqViewAll: string;
  faqViewAllAria: string;
  faqBestTimeQ: (destination: string) => string;
  faqBestTimeA: (destination: string) => string;
  faqDaysQ: (destination: string) => string;
  faqDaysA: (destination: string) => string;
  faqSafeQ: (destination: string) => string;
  faqSafeA: (destination: string) => string;
  faqPackQ: (destination: string) => string;
  faqPackA: string;
  faqGuideQ: (destination: string) => string;
  faqGuideA: string;
  faqDressQ: string;
  faqDressA: string;
  faqLastMinuteQ: string;
  faqLastMinuteA: string;
  faqCancelQ: string;
  faqCancelA: string;
  faqMealsQ: string;
  faqMealsA: string;
  faqMeetingQ: string;
  faqMeetingA: string;
  reviewsTitle: (destination: string) => string;
  reviewsSummary: (average: number, count: number) => string;
  verifiedTraveler: string;
  readAllReviews: string;
  relatedDestinationsTitle: string;
  relatedDestinationsSubtitle: string;
  toursAvailable: (count: number) => string;
  newsletterTitle: (destination: string) => string;
  newsletterSubtitle: string;
  newsletterEmailPlaceholder: string;
  newsletterSubscribe: string;
  newsletterFootnote: string;
  infoBestTime: string;
  infoCurrency: string;
  infoTimeZone: string;
  infoAvailableTours: string;
  infoYearRound: string;
  infoTimezoneFallback: string;
  infoAvailableExperiences: (count: number) => string;
  featuredSectionTitle: (destination: string) => string;
  featuredSectionSubtitle: string;
  topToursTitle: (destination: string) => string;
  topToursSubtitle: string;
  interestsTitle: (destination: string) => string;
  interestsSubtitle: string;
  whyVisitTitle: (destination: string) => string;
};

// Russian counts take three noun forms: one (1, 21, 31...), few (2-4, 22-24...)
// and many (0, 5-20, 25-30...). Counters in the Russian copy below pick a form
// through this helper so a label never reads as broken grammar.
const ruPlural = (count: number, one: string, few: string, many: string): string => {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

const destinationPageCopy: Record<'en' | 'ar' | 'de' | 'fr' | 'es' | 'ru', DestinationPageCopy> = {
  en: {
    featured: 'Featured',
    tours: 'Tours',
    destinations: 'Destinations',
    categories: 'Categories',
    untitledTour: 'Untitled Tour',
    untitledDestination: 'Untitled Destination',
    untitledCategory: 'Untitled Category',
    hereAreTours: 'Here are some tours I found for you:',
    hereAreDestinations: 'Here are some destinations I found for you:',
    askAiAnything: 'Ask AI anything about this destination...',
    clearSearch: 'Clear search',
    stop: 'Stop',
    send: 'Send',
    openAiAssistant: 'Open AI Assistant',
    aiDestinationAssistant: 'AI Destination Assistant',
    searchResults: 'Search Results',
    popularSearches: 'Popular Searches',
    noTenantResultsTitle: 'No matching results found',
    noTenantResultsBody: (destination) =>
      `Try a different search related to ${destination}, or browse the available tours and destinations on this website.`,
    newChat: 'New Chat',
    askDestinationPrompt: 'Ask me anything about this destination!',
    trendingTours: 'Trending Tours',
    discover: 'DISCOVER',
    exploreDestination: (destination: string) => `Explore ${destination}`,
    thingsToDoIn: (destination: string) => `Things to do in ${destination}`,
    bestToursIn: (destination: string) => `Best tours in ${destination}`,
    toursCount: (count: number) => `${count}+ Tours`,
    home: 'Home',
    destinationsRoot: 'Destinations',
    galleryTitle: 'Destination gallery',
    practicalTitle: 'Practical information',
    practicalClimate: 'Climate',
    practicalVisa: 'Visa requirements',
    practicalLanguages: 'Languages',
    practicalEmergency: 'Emergency number',
    practicalSummer: 'Summer temperature',
    practicalWinter: 'Winter temperature',
    scrollLeft: 'Scroll left',
    scrollRight: 'Scroll right',
    bookNow: 'Book now',
    bookings: (count: number) => `${count} ${count === 1 ? 'booking' : 'bookings'}`,
    statsToursAvailable: 'Tours Available',
    statsHappyTravelers: 'Happy Travelers',
    statsAverageRating: 'Average Rating',
    statsCustomerSupport: 'Customer Support',
    travelTipsTitle: 'Travel Tips & Essential Info',
    travelTipsSubtitle: 'Everything you need to know before you go',
    travelTipBestTime: 'Best Time to Visit',
    travelTipCurrency: 'Currency',
    travelTipLanguages: 'Languages',
    travelTipEmergency: 'Emergency',
    travelTipDefaultBestTime: 'Year-round destination with pleasant weather',
    travelTipDefaultCurrency: 'Local currency accepted',
    travelTipDefaultLanguages: 'English widely spoken',
    travelTipDefaultEmergency: 'Local emergency services',
    aboutTitle: (destination: string) => `Your Local Guide In ${destination}`,
    aboutFallback: (destination: string) =>
      `Discover the best of ${destination} with our expert local guides. We'll show you hidden gems, share fascinating stories, and create unforgettable memories that will last a lifetime.`,
    learnMoreAboutUs: 'Learn more about us',
    aboutExpertGuidesTitle: 'Expert Local Guides',
    aboutExpertGuidesBody: (destination: string) =>
      `Our experienced local guides know all the hidden gems and stories of ${destination}.`,
    aboutQualityTitle: 'Quality Experiences',
    aboutQualityBody: (destination: string) =>
      `We offer you the best experiences in ${destination}, handpicked by our experts.`,
    aboutSafeTitle: 'Safe & Reliable',
    aboutSafeBody: 'Your safety is our priority. All tours are carefully vetted and insured.',
    aboutPriceTitle: 'Best Price Guarantee',
    aboutPriceBody: (destination: string) =>
      `Find a lower price? We'll match it. Enjoy the best deals for ${destination}.`,
    faqTitle: 'FREQUENTLY ASKED QUESTIONS',
    faqSubtitle: (destination: string) => `Everything you need to know about visiting ${destination}`,
    faqViewAll: 'VIEW ALL FAQs',
    faqViewAllAria: 'View all FAQs',
    faqBestTimeQ: (destination: string) => `What is the best time to visit ${destination}?`,
    faqBestTimeA: (destination: string) =>
      `The best time to visit ${destination} is during the cooler months from October to April, when temperatures are pleasant for sightseeing and outdoor activities. The weather is ideal for exploring attractions and participating in tours.`,
    faqDaysQ: (destination: string) => `How many days should I spend in ${destination}?`,
    faqDaysA: (_destination: string) =>
      `We recommend spending at least 3-5 days to experience the main attractions comfortably. However, a week or more allows for a more relaxed pace and exploration of hidden gems, local neighborhoods, and day trips to nearby areas.`,
    faqSafeQ: (destination: string) => `Is ${destination} safe for tourists?`,
    faqSafeA: (destination: string) =>
      `Yes, ${destination} is generally safe for tourists. As with any destination, exercise normal precautions like being aware of your surroundings, keeping valuables secure, and following local guidance. Our tours prioritize your safety with professional guides.`,
    faqPackQ: (destination: string) => `What should I pack for ${destination}?`,
    faqPackA:
      `Pack comfortable walking shoes, light breathable clothing for daytime, a light jacket for evenings or air-conditioned spaces, sunscreen, sunglasses, a hat, and any necessary medications. Don't forget your camera to capture the amazing sights!`,
    faqGuideQ: (destination: string) => `Do I need a guide for tours in ${destination}?`,
    faqGuideA:
      `While not mandatory, having a local guide significantly enhances your experience. Guides provide insider knowledge, historical context, help navigate crowds efficiently, and ensure you don't miss important details about the attractions.`,
    faqDressQ: 'Are there any dress codes I should be aware of?',
    faqDressA:
      `For religious sites and certain attractions, modest clothing is required (covering shoulders and knees). It's best to carry a light scarf or shawl. Most restaurants and hotels have no specific dress code, but smart casual is appreciated.`,
    faqLastMinuteQ: 'Can I book tours last minute?',
    faqLastMinuteA:
      `While we recommend booking in advance for popular tours, many experiences can be booked last minute subject to availability. However, skip-the-line tours and special experiences often sell out, so early booking is advisable.`,
    faqCancelQ: 'What is your cancellation policy?',
    faqCancelA:
      `Most tours offer free cancellation up to 24 hours before the start time for a full refund. Some special events may have different policies. Please check the specific tour details for exact cancellation terms.`,
    faqMealsQ: 'Are meals included in the tours?',
    faqMealsA:
      `It varies by tour. Some tours include meals or snacks, while others don't. Each tour description clearly states what's included. Food tours naturally include multiple tastings as part of the experience.`,
    faqMeetingQ: 'How do I get to the meeting points?',
    faqMeetingA:
      `All tour confirmations include detailed meeting point information with maps and directions. Most meeting points are at central, easy-to-reach locations with good public transport access. Our team is available 24/7 if you need assistance.`,
    reviewsTitle: (destination: string) => `What Travelers Say About ${destination}`,
    reviewsSummary: (average: number, count: number) =>
      `${average.toFixed(1)}/5 from ${count} ${count === 1 ? 'review' : 'reviews'}`,
    verifiedTraveler: 'Verified traveler',
    readAllReviews: 'Read All Reviews',
    relatedDestinationsTitle: 'Explore More Destinations',
    relatedDestinationsSubtitle: 'Discover other amazing places you might love',
    toursAvailable: (count: number) => `${count} tours available`,
    newsletterTitle: (destination: string) => `Get Exclusive ${destination} Travel Deals`,
    newsletterSubtitle: 'Subscribe to our newsletter and receive special offers, travel tips, and insider guides',
    newsletterEmailPlaceholder: 'Enter your email',
    newsletterSubscribe: 'Subscribe Now',
    newsletterFootnote: 'Receive destination deals by email. Unsubscribe anytime.',
    infoBestTime: 'Best Time to Visit',
    infoCurrency: 'Currency',
    infoTimeZone: 'Time Zone',
    infoAvailableTours: 'Available Tours',
    infoYearRound: 'Year-round',
    infoTimezoneFallback: 'Central European Time',
    infoAvailableExperiences: (count: number) => `${count} experiences`,
    featuredSectionTitle: (destination: string) => `Best Deals in ${destination}`,
    featuredSectionSubtitle: 'Handpicked experiences at unbeatable prices',
    topToursTitle: (destination: string) => `TOP 10 TOURS IN ${destination.toUpperCase()}`,
    topToursSubtitle: 'Our best-selling tours and experiences curated by local experts',
    interestsTitle: (destination: string) => `Discover ${destination} by Interest`,
    interestsSubtitle: "Find the perfect experience for you, whether you're interested in culture, adventure, or food.",
    whyVisitTitle: (destination: string) => `Why Visit ${destination}?`,
  },
  ar: {
    featured: 'مميز',
    tours: 'الجولات',
    destinations: 'الوجهات',
    categories: 'الفئات',
    untitledTour: 'جولة بدون عنوان',
    untitledDestination: 'وجهة بدون عنوان',
    untitledCategory: 'فئة بدون عنوان',
    hereAreTours: 'إليك بعض الجولات التي وجدتها لك:',
    hereAreDestinations: 'إليك بعض الوجهات التي وجدتها لك:',
    askAiAnything: 'اسأل الذكاء الاصطناعي عن أي شيء حول هذه الوجهة...',
    clearSearch: 'مسح البحث',
    stop: 'إيقاف',
    send: 'إرسال',
    openAiAssistant: 'فتح مساعد الذكاء الاصطناعي',
    aiDestinationAssistant: 'مساعد الوجهات الذكي',
    searchResults: 'نتائج البحث',
    popularSearches: 'عمليات بحث شائعة',
    noTenantResultsTitle: 'لا توجد نتائج مطابقة',
    noTenantResultsBody: (destination) =>
      `جرّب بحثًا مختلفًا مرتبطًا بـ ${destination}، أو تصفح الجولات والوجهات المتاحة على هذا الموقع.`,
    newChat: 'محادثة جديدة',
    askDestinationPrompt: 'اسألني أي شيء عن هذه الوجهة!',
    trendingTours: 'جولات رائجة',
    discover: 'اكتشف',
    exploreDestination: (destination: string) => `استكشف ${destination}`,
    thingsToDoIn: (destination: string) => `أفضل الأنشطة في ${destination}`,
    bestToursIn: (destination: string) => `أفضل الجولات في ${destination}`,
    toursCount: (count: number) => `${count}+ جولة`,
    home: 'الرئيسية',
    destinationsRoot: 'الوجهات',
    galleryTitle: 'معرض صور الوجهة',
    practicalTitle: 'معلومات عملية',
    practicalClimate: 'المناخ',
    practicalVisa: 'متطلبات التأشيرة',
    practicalLanguages: 'اللغات',
    practicalEmergency: 'رقم الطوارئ',
    practicalSummer: 'درجة الحرارة في الصيف',
    practicalWinter: 'درجة الحرارة في الشتاء',
    scrollLeft: 'التمرير لليسار',
    scrollRight: 'التمرير لليمين',
    bookNow: 'احجز الآن',
    bookings: (count: number) => `${count} حجوزات`,
    statsToursAvailable: 'جولات متاحة',
    statsHappyTravelers: 'مسافرون سعداء',
    statsAverageRating: 'متوسط التقييم',
    statsCustomerSupport: 'دعم العملاء',
    travelTipsTitle: 'نصائح السفر ومعلومات أساسية',
    travelTipsSubtitle: 'كل ما تحتاج معرفته قبل الانطلاق',
    travelTipBestTime: 'أفضل وقت للزيارة',
    travelTipCurrency: 'العملة',
    travelTipLanguages: 'اللغات',
    travelTipEmergency: 'الطوارئ',
    travelTipDefaultBestTime: 'وجهة مناسبة على مدار العام بطقس لطيف',
    travelTipDefaultCurrency: 'العملة المحلية مقبولة',
    travelTipDefaultLanguages: 'الإنجليزية منتشرة على نطاق واسع',
    travelTipDefaultEmergency: 'خدمات الطوارئ المحلية',
    aboutTitle: (destination: string) => `دليلك المحلي في ${destination}`,
    aboutFallback: (destination: string) =>
      `اكتشف أفضل ما في ${destination} مع مرشدينا المحليين الخبراء. سنريك الجواهر المخفية ونشاركك القصص الممتعة ونصنع ذكريات لا تنسى.`,
    learnMoreAboutUs: 'اعرف المزيد عنا',
    aboutExpertGuidesTitle: 'مرشدون محليون خبراء',
    aboutExpertGuidesBody: (destination: string) =>
      `مرشدونا المحليون ذوو الخبرة يعرفون كل الجواهر المخفية والقصص المميزة في ${destination}.`,
    aboutQualityTitle: 'تجارب عالية الجودة',
    aboutQualityBody: (destination: string) =>
      `نقدم لك أفضل التجارب في ${destination} والمختارة بعناية بواسطة خبرائنا.`,
    aboutSafeTitle: 'آمن وموثوق',
    aboutSafeBody: 'سلامتك أولويتنا. جميع الجولات مدققة بعناية ومؤمنة.',
    aboutPriceTitle: 'ضمان أفضل سعر',
    aboutPriceBody: (destination: string) =>
      `وجدت سعرًا أقل؟ سنطابقه. استمتع بأفضل العروض في ${destination}.`,
    faqTitle: 'الأسئلة الشائعة',
    faqSubtitle: (destination: string) => `كل ما تحتاج معرفته عن زيارة ${destination}`,
    faqViewAll: 'عرض جميع الأسئلة',
    faqViewAllAria: 'عرض جميع الأسئلة الشائعة',
    faqBestTimeQ: (destination: string) => `ما أفضل وقت لزيارة ${destination}؟`,
    faqBestTimeA: (destination: string) =>
      `أفضل وقت لزيارة ${destination} يكون عادة خلال الأشهر المعتدلة من أكتوبر إلى أبريل، حيث تكون درجات الحرارة مناسبة للجولات والأنشطة الخارجية.`,
    faqDaysQ: (destination: string) => `كم يومًا أحتاج في ${destination}؟`,
    faqDaysA: (_destination: string) =>
      `نوصي بقضاء 3 إلى 5 أيام على الأقل لاكتشاف أهم المعالم براحة. وإذا رغبت بوتيرة أهدأ واستكشاف أعمق، فالأسبوع أو أكثر خيار ممتاز.`,
    faqSafeQ: (destination: string) => `هل ${destination} آمنة للسياح؟`,
    faqSafeA: (destination: string) =>
      `نعم، ${destination} آمنة عمومًا للسياح. وكأي وجهة، يُنصح باتباع الاحتياطات المعتادة والحفاظ على المقتنيات واتباع الإرشادات المحلية.`,
    faqPackQ: (destination: string) => `ماذا أحزم عند زيارة ${destination}؟`,
    faqPackA:
      `يفضل إحضار أحذية مريحة للمشي، ملابس خفيفة، طبقة إضافية للمساء، واقي شمس، نظارة شمسية، قبعة، والأدوية الضرورية، ولا تنسَ الكاميرا.`,
    faqGuideQ: (destination: string) => `هل أحتاج مرشدًا للجولات في ${destination}؟`,
    faqGuideA:
      `ليس إلزاميًا، لكن وجود مرشد محلي يضيف قيمة كبيرة عبر المعلومات التاريخية وتسهيل التنقل وتجنب تفويت التفاصيل المهمة.`,
    faqDressQ: 'هل توجد قواعد لباس يجب معرفتها؟',
    faqDressA:
      `في المواقع الدينية وبعض المعالم يُفضّل ارتداء ملابس محتشمة (تغطية الكتفين والركبتين). غالبية الأماكن الأخرى تقبل اللباس العملي الأنيق.`,
    faqLastMinuteQ: 'هل يمكن حجز الجولات في آخر لحظة؟',
    faqLastMinuteA:
      `يمكن حجز كثير من الجولات في آخر لحظة حسب التوفر، لكن الجولات الأكثر طلبًا قد تنفد بسرعة لذلك يُفضّل الحجز المبكر.`,
    faqCancelQ: 'ما سياسة الإلغاء لديكم؟',
    faqCancelA:
      `معظم الجولات تتيح إلغاءً مجانيًا حتى 24 ساعة قبل وقت البدء لاسترداد كامل المبلغ. راجع تفاصيل كل جولة للسياسة الدقيقة.`,
    faqMealsQ: 'هل الوجبات مشمولة في الجولات؟',
    faqMealsA:
      `يعتمد ذلك على نوع الجولة. بعض الجولات تشمل وجبات أو وجبات خفيفة، بينما أخرى لا تشمل. التفاصيل موضحة في كل جولة.`,
    faqMeetingQ: 'كيف أصل إلى نقاط الالتقاء؟',
    faqMeetingA:
      `ستتضمن رسالة التأكيد كل تفاصيل نقطة الالتقاء مع الخرائط والاتجاهات، وغالبًا تكون في مواقع مركزية يسهل الوصول إليها.`,
    reviewsTitle: (destination: string) => `ماذا يقول المسافرون عن ${destination}`,
    reviewsSummary: (average: number, count: number) =>
      `تقييم ${average.toFixed(1)}/5 من ${count} ${count === 1 ? 'مراجعة' : 'مراجعات'}`,
    verifiedTraveler: 'مسافر موثق',
    readAllReviews: 'قراءة جميع المراجعات',
    relatedDestinationsTitle: 'استكشف المزيد من الوجهات',
    relatedDestinationsSubtitle: 'اكتشف أماكن مذهلة أخرى قد تعجبك',
    toursAvailable: (count: number) => `${count} جولات متاحة`,
    newsletterTitle: (destination: string) => `احصل على عروض سفر حصرية إلى ${destination}`,
    newsletterSubtitle: 'اشترك في نشرتنا البريدية واحصل على عروض خاصة ونصائح سفر وأدلة مميزة',
    newsletterEmailPlaceholder: 'أدخل بريدك الإلكتروني',
    newsletterSubscribe: 'اشترك الآن',
    newsletterFootnote: 'استقبل عروض الوجهات عبر البريد الإلكتروني. يمكنك إلغاء الاشتراك في أي وقت.',
    infoBestTime: 'أفضل وقت للزيارة',
    infoCurrency: 'العملة',
    infoTimeZone: 'المنطقة الزمنية',
    infoAvailableTours: 'الجولات المتاحة',
    infoYearRound: 'طوال العام',
    infoTimezoneFallback: 'توقيت وسط أوروبا',
    infoAvailableExperiences: (count: number) => `${count} تجربة`,
    featuredSectionTitle: (destination: string) => `أفضل العروض في ${destination}`,
    featuredSectionSubtitle: 'تجارب مختارة بعناية بأسعار مميزة',
    topToursTitle: (destination: string) => `أفضل 10 جولات في ${destination}`,
    topToursSubtitle: 'أكثر الجولات والتجارب مبيعًا والمختارة بواسطة خبراء محليين',
    interestsTitle: (destination: string) => `اكتشف ${destination} حسب الاهتمام`,
    interestsSubtitle: 'اعثر على التجربة المناسبة لك سواء كنت مهتمًا بالثقافة أو المغامرة أو الطعام.',
    whyVisitTitle: (destination: string) => `لماذا تزور ${destination}؟`,
  },
  de: {
    featured: 'Empfohlen',
    tours: 'Touren',
    destinations: 'Reiseziele',
    categories: 'Kategorien',
    untitledTour: 'Tour ohne Titel',
    untitledDestination: 'Reiseziel ohne Titel',
    untitledCategory: 'Kategorie ohne Titel',
    hereAreTours: 'Hier sind einige Touren, die ich für Sie gefunden habe:',
    hereAreDestinations: 'Hier sind einige Reiseziele, die ich für Sie gefunden habe:',
    askAiAnything: 'Fragen Sie die KI alles über dieses Reiseziel ...',
    clearSearch: 'Suche zurücksetzen',
    stop: 'Stopp',
    send: 'Senden',
    openAiAssistant: 'KI-Assistenten öffnen',
    aiDestinationAssistant: 'KI-Reiseassistent',
    searchResults: 'Suchergebnisse',
    popularSearches: 'Beliebte Suchanfragen',
    noTenantResultsTitle: 'Keine passenden Ergebnisse gefunden',
    noTenantResultsBody: (destination) =>
      `Versuchen Sie eine andere Suche zu ${destination} oder stöbern Sie in den Touren und Reisezielen auf dieser Website.`,
    newChat: 'Neuer Chat',
    askDestinationPrompt: 'Fragen Sie mich alles über dieses Reiseziel!',
    trendingTours: 'Beliebte Touren',
    discover: 'ENTDECKEN',
    exploreDestination: (destination: string) => `${destination} entdecken`,
    thingsToDoIn: (destination: string) => `Aktivitäten in ${destination}`,
    bestToursIn: (destination: string) => `Die besten Touren in ${destination}`,
    toursCount: (count: number) => `${count}+ Touren`,
    home: 'Startseite',
    destinationsRoot: 'Reiseziele',
    galleryTitle: 'Bildergalerie des Reiseziels',
    practicalTitle: 'Praktische Informationen',
    practicalClimate: 'Klima',
    practicalVisa: 'Visabestimmungen',
    practicalLanguages: 'Sprachen',
    practicalEmergency: 'Notrufnummer',
    practicalSummer: 'Temperatur im Sommer',
    practicalWinter: 'Temperatur im Winter',
    scrollLeft: 'Nach links scrollen',
    scrollRight: 'Nach rechts scrollen',
    bookNow: 'Jetzt buchen',
    bookings: (count: number) => `${count} ${count === 1 ? 'Buchung' : 'Buchungen'}`,
    statsToursAvailable: 'Verfügbare Touren',
    statsHappyTravelers: 'Zufriedene Reisende',
    statsAverageRating: 'Durchschnittliche Bewertung',
    statsCustomerSupport: 'Kundenservice',
    travelTipsTitle: 'Reisetipps & wichtige Infos',
    travelTipsSubtitle: 'Alles, was Sie vor der Reise wissen müssen',
    travelTipBestTime: 'Beste Reisezeit',
    travelTipCurrency: 'Währung',
    travelTipLanguages: 'Sprachen',
    travelTipEmergency: 'Notfall',
    travelTipDefaultBestTime: 'Ganzjähriges Reiseziel mit angenehmem Wetter',
    travelTipDefaultCurrency: 'Landeswährung wird akzeptiert',
    travelTipDefaultLanguages: 'Englisch ist weit verbreitet',
    travelTipDefaultEmergency: 'Örtliche Notdienste',
    aboutTitle: (destination: string) => `Ihr Guide vor Ort in ${destination}`,
    aboutFallback: (destination: string) =>
      `Entdecken Sie die schönsten Seiten von ${destination} mit unseren erfahrenen Guides vor Ort. Wir zeigen Ihnen verborgene Schätze, erzählen faszinierende Geschichten und schaffen unvergessliche Erinnerungen, die ein Leben lang bleiben.`,
    learnMoreAboutUs: 'Mehr über uns erfahren',
    aboutExpertGuidesTitle: 'Erfahrene Guides vor Ort',
    aboutExpertGuidesBody: (destination: string) =>
      `Unsere erfahrenen Guides vor Ort kennen alle verborgenen Schätze und Geschichten von ${destination}.`,
    aboutQualityTitle: 'Erlebnisse mit Qualität',
    aboutQualityBody: (destination: string) =>
      `Wir bieten Ihnen die besten Erlebnisse in ${destination}, handverlesen von unseren Experten.`,
    aboutSafeTitle: 'Sicher & zuverlässig',
    aboutSafeBody: 'Ihre Sicherheit hat Vorrang. Alle Touren werden sorgfältig geprüft und sind versichert.',
    aboutPriceTitle: 'Bestpreis-Garantie',
    aboutPriceBody: (destination: string) =>
      `Günstigeren Preis gefunden? Wir ziehen mit. Freuen Sie sich auf die besten Angebote für ${destination}.`,
    faqTitle: 'HÄUFIG GESTELLTE FRAGEN',
    faqSubtitle: (destination: string) => `Alles, was Sie über einen Besuch in ${destination} wissen müssen`,
    faqViewAll: 'ALLE FAQs ANSEHEN',
    faqViewAllAria: 'Alle FAQs ansehen',
    faqBestTimeQ: (destination: string) => `Wann ist die beste Zeit für einen Besuch in ${destination}?`,
    faqBestTimeA: (destination: string) =>
      `Die beste Zeit für einen Besuch in ${destination} sind die kühleren Monate von Oktober bis April, wenn die Temperaturen angenehm für Besichtigungen und Aktivitäten im Freien sind. Das Wetter ist dann ideal, um Sehenswürdigkeiten zu erkunden und an Touren teilzunehmen.`,
    faqDaysQ: (destination: string) => `Wie viele Tage sollte ich in ${destination} einplanen?`,
    faqDaysA: (_destination: string) =>
      `Wir empfehlen mindestens 3 bis 5 Tage, um die wichtigsten Sehenswürdigkeiten in Ruhe zu erleben. Eine Woche oder mehr erlaubt jedoch ein ruhigeres Tempo und die Entdeckung verborgener Schätze, lokaler Viertel und Tagesausflüge in die Umgebung.`,
    faqSafeQ: (destination: string) => `Ist ${destination} sicher für Touristen?`,
    faqSafeA: (destination: string) =>
      `Ja, ${destination} ist für Touristen im Allgemeinen sicher. Wie an jedem Reiseziel gilt: achten Sie auf Ihre Umgebung, bewahren Sie Wertsachen sicher auf und folgen Sie den Hinweisen vor Ort. Bei unseren Touren steht Ihre Sicherheit mit professionellen Guides im Vordergrund.`,
    faqPackQ: (destination: string) => `Was sollte ich für ${destination} einpacken?`,
    faqPackA:
      'Packen Sie bequeme Schuhe zum Gehen, leichte luftige Kleidung für den Tag, eine leichte Jacke für den Abend oder klimatisierte Räume, Sonnencreme, Sonnenbrille, einen Hut und alle nötigen Medikamente ein. Vergessen Sie Ihre Kamera nicht, um die beeindruckenden Ausblicke festzuhalten!',
    faqGuideQ: (destination: string) => `Brauche ich für Touren in ${destination} einen Guide?`,
    faqGuideA:
      'Ein Guide ist nicht vorgeschrieben, bereichert Ihr Erlebnis aber deutlich. Guides geben Insiderwissen und historische Zusammenhänge weiter, helfen Ihnen zügig durch den Andrang und sorgen dafür, dass Sie keine wichtigen Details der Sehenswürdigkeiten verpassen.',
    faqDressQ: 'Gibt es Kleiderordnungen, die ich beachten sollte?',
    faqDressA:
      'Für religiöse Stätten und bestimmte Sehenswürdigkeiten ist dezente Kleidung vorgeschrieben (Schultern und Knie bedeckt). Am besten haben Sie einen leichten Schal oder ein Tuch dabei. Die meisten Restaurants und Hotels haben keine besondere Kleiderordnung, legere Eleganz wird aber geschätzt.',
    faqLastMinuteQ: 'Kann ich Touren kurzfristig buchen?',
    faqLastMinuteA:
      'Für beliebte Touren empfehlen wir eine Buchung im Voraus, viele Erlebnisse lassen sich je nach Verfügbarkeit aber auch kurzfristig buchen. Touren ohne Warteschlange und besondere Erlebnisse sind jedoch oft ausverkauft, eine frühe Buchung ist daher ratsam.',
    faqCancelQ: 'Wie lauten Ihre Stornierungsbedingungen?',
    faqCancelA:
      'Die meisten Touren lassen sich bis 24 Stunden vor Beginn kostenlos stornieren, mit vollständiger Rückerstattung. Für einzelne besondere Veranstaltungen können andere Bedingungen gelten. Die genauen Stornierungsbedingungen finden Sie in den Details der jeweiligen Tour.',
    faqMealsQ: 'Sind Mahlzeiten in den Touren enthalten?',
    faqMealsA:
      'Das ist von Tour zu Tour unterschiedlich. Manche Touren enthalten Mahlzeiten oder Snacks, andere nicht. In jeder Tourbeschreibung steht klar, was enthalten ist. Bei kulinarischen Touren sind mehrere Kostproben naturgemäß Teil des Erlebnisses.',
    faqMeetingQ: 'Wie komme ich zu den Treffpunkten?',
    faqMeetingA:
      'Jede Tourbestätigung enthält ausführliche Angaben zum Treffpunkt mit Karten und Anfahrt. Die meisten Treffpunkte liegen zentral und sind mit guter Anbindung an den öffentlichen Verkehr leicht zu erreichen. Unser Team ist rund um die Uhr erreichbar, wenn Sie Hilfe brauchen.',
    reviewsTitle: (destination: string) => `Was Reisende über ${destination} sagen`,
    reviewsSummary: (average: number, count: number) =>
      `${average.toFixed(1)}/5 aus ${count} ${count === 1 ? 'Bewertung' : 'Bewertungen'}`,
    verifiedTraveler: 'Verifizierter Reisender',
    readAllReviews: 'Alle Bewertungen lesen',
    relatedDestinationsTitle: 'Weitere Reiseziele entdecken',
    relatedDestinationsSubtitle: 'Entdecken Sie weitere traumhafte Orte, die Ihnen gefallen könnten',
    toursAvailable: (count: number) => `${count} ${count === 1 ? 'Tour verfügbar' : 'Touren verfügbar'}`,
    newsletterTitle: (destination: string) => `Exklusive Reiseangebote für ${destination} erhalten`,
    newsletterSubtitle: 'Abonnieren Sie unseren Newsletter und erhalten Sie Sonderangebote, Reisetipps und Insider-Guides',
    newsletterEmailPlaceholder: 'E-Mail-Adresse eingeben',
    newsletterSubscribe: 'Jetzt abonnieren',
    newsletterFootnote: 'Erhalten Sie Angebote für Reiseziele per E-Mail. Abmeldung jederzeit möglich.',
    infoBestTime: 'Beste Reisezeit',
    infoCurrency: 'Währung',
    infoTimeZone: 'Zeitzone',
    infoAvailableTours: 'Verfügbare Touren',
    infoYearRound: 'Ganzjährig',
    infoTimezoneFallback: 'Mitteleuropäische Zeit',
    infoAvailableExperiences: (count: number) => `${count} ${count === 1 ? 'Erlebnis' : 'Erlebnisse'}`,
    featuredSectionTitle: (destination: string) => `Die besten Angebote in ${destination}`,
    featuredSectionSubtitle: 'Handverlesene Erlebnisse zu unschlagbaren Preisen',
    topToursTitle: (destination: string) => `DIE TOP 10 TOUREN IN ${destination.toUpperCase()}`,
    topToursSubtitle: 'Unsere beliebtesten Touren und Erlebnisse, zusammengestellt von Experten vor Ort',
    interestsTitle: (destination: string) => `${destination} nach Interesse entdecken`,
    interestsSubtitle: 'Finden Sie das passende Erlebnis für sich, ob Sie sich für Kultur, Abenteuer oder Kulinarik begeistern.',
    whyVisitTitle: (destination: string) => `Warum ${destination} besuchen?`,
  },
  fr: {
    featured: 'À la une',
    tours: 'Excursions',
    destinations: 'Destinations',
    categories: 'Catégories',
    untitledTour: 'Excursion sans titre',
    untitledDestination: 'Destination sans titre',
    untitledCategory: 'Catégorie sans titre',
    hereAreTours: "Voici quelques excursions que j'ai trouvées pour vous :",
    hereAreDestinations: "Voici quelques destinations que j'ai trouvées pour vous :",
    askAiAnything: "Posez à l'IA toutes vos questions sur cette destination...",
    clearSearch: 'Effacer la recherche',
    stop: 'Arrêter',
    send: 'Envoyer',
    openAiAssistant: "Ouvrir l'assistant IA",
    aiDestinationAssistant: 'Assistant IA de destination',
    searchResults: 'Résultats de recherche',
    popularSearches: 'Recherches populaires',
    noTenantResultsTitle: 'Aucun résultat correspondant',
    noTenantResultsBody: (destination) =>
      `Essayez une autre recherche liée à ${destination}, ou parcourez les excursions et les destinations proposées sur ce site.`,
    newChat: 'Nouvelle conversation',
    askDestinationPrompt: 'Posez-moi toutes vos questions sur cette destination !',
    trendingTours: 'Excursions les plus demandées',
    discover: 'DÉCOUVRIR',
    exploreDestination: (destination: string) => `Explorer ${destination}`,
    thingsToDoIn: (destination: string) => `Que faire à ${destination}`,
    bestToursIn: (destination: string) => `Les meilleures excursions à ${destination}`,
    toursCount: (count: number) => `${count}+ ${count === 1 ? 'excursion' : 'excursions'}`,
    home: 'Accueil',
    destinationsRoot: 'Destinations',
    galleryTitle: 'Galerie de la destination',
    practicalTitle: 'Informations pratiques',
    practicalClimate: 'Climat',
    practicalVisa: 'Formalités de visa',
    practicalLanguages: 'Langues',
    practicalEmergency: "Numéro d'urgence",
    practicalSummer: 'Températures en été',
    practicalWinter: 'Températures en hiver',
    scrollLeft: 'Faire défiler vers la gauche',
    scrollRight: 'Faire défiler vers la droite',
    bookNow: 'Réserver',
    bookings: (count: number) => `${count} ${count === 1 ? 'réservation' : 'réservations'}`,
    statsToursAvailable: 'Excursions disponibles',
    statsHappyTravelers: 'Voyageurs satisfaits',
    statsAverageRating: 'Note moyenne',
    statsCustomerSupport: 'Service client',
    travelTipsTitle: 'Conseils de voyage et infos essentielles',
    travelTipsSubtitle: "Tout ce qu'il faut savoir avant de partir",
    travelTipBestTime: 'Meilleure période pour partir',
    travelTipCurrency: 'Monnaie',
    travelTipLanguages: 'Langues',
    travelTipEmergency: 'Urgences',
    travelTipDefaultBestTime: "Destination agréable toute l'année",
    travelTipDefaultCurrency: 'Monnaie locale acceptée',
    travelTipDefaultLanguages: 'Anglais largement parlé',
    travelTipDefaultEmergency: "Services d'urgence locaux",
    aboutTitle: (destination: string) => `Votre guide local à ${destination}`,
    aboutFallback: (destination: string) =>
      `Découvrez le meilleur de ${destination} avec nos guides locaux expérimentés. Nous vous emmenons vers des trésors cachés, partageons des histoires passionnantes et créons des souvenirs inoubliables qui vous suivront toute votre vie.`,
    learnMoreAboutUs: 'En savoir plus sur nous',
    aboutExpertGuidesTitle: 'Guides locaux expérimentés',
    aboutExpertGuidesBody: (destination: string) =>
      `Nos guides locaux expérimentés connaissent tous les trésors cachés et toutes les histoires de ${destination}.`,
    aboutQualityTitle: 'Des expériences de qualité',
    aboutQualityBody: (destination: string) =>
      `Nous vous proposons les meilleures expériences à ${destination}, sélectionnées par nos experts.`,
    aboutSafeTitle: 'Sûr et fiable',
    aboutSafeBody: 'Votre sécurité est notre priorité. Toutes les excursions sont soigneusement vérifiées et assurées.',
    aboutPriceTitle: 'Garantie du meilleur prix',
    aboutPriceBody: (destination: string) =>
      `Vous avez trouvé moins cher ? Nous nous alignons. Profitez des meilleures offres pour ${destination}.`,
    faqTitle: 'QUESTIONS FRÉQUENTES',
    faqSubtitle: (destination: string) => `Tout ce qu'il faut savoir pour visiter ${destination}`,
    faqViewAll: 'VOIR TOUTES LES QUESTIONS',
    faqViewAllAria: 'Voir toutes les questions fréquentes',
    faqBestTimeQ: (destination: string) => `Quelle est la meilleure période pour visiter ${destination} ?`,
    faqBestTimeA: (destination: string) =>
      `La meilleure période pour visiter ${destination} correspond aux mois les plus frais, d'octobre à avril, lorsque les températures sont agréables pour les visites et les activités en plein air. La météo est alors idéale pour explorer les sites et participer aux excursions.`,
    faqDaysQ: (destination: string) => `Combien de jours faut-il passer à ${destination} ?`,
    faqDaysA: (_destination: string) =>
      `Nous recommandons au moins 3 à 5 jours pour découvrir tranquillement les principaux sites. Une semaine ou plus permet toutefois un rythme plus détendu et la découverte de trésors cachés, de quartiers authentiques et d'excursions à la journée dans les environs.`,
    faqSafeQ: (destination: string) => `${destination} est-elle sûre pour les touristes ?`,
    faqSafeA: (destination: string) =>
      `Oui, ${destination} est globalement sûre pour les touristes. Comme partout ailleurs, prenez les précautions habituelles : restez attentif à ce qui vous entoure, gardez vos objets de valeur en sécurité et suivez les consignes locales. Nos excursions donnent la priorité à votre sécurité, avec des guides professionnels.`,
    faqPackQ: (destination: string) => `Que faut-il emporter pour ${destination} ?`,
    faqPackA:
      `Prévoyez de bonnes chaussures de marche, des vêtements légers et respirants pour la journée, une veste légère pour le soir ou les espaces climatisés, de la crème solaire, des lunettes de soleil, un chapeau et les médicaments dont vous avez besoin. Et n'oubliez pas votre appareil photo pour immortaliser ces paysages magnifiques !`,
    faqGuideQ: (destination: string) => `Ai-je besoin d'un guide pour les excursions à ${destination} ?`,
    faqGuideA:
      `Ce n'est pas obligatoire, mais un guide local enrichit nettement votre expérience. Il vous apporte son regard d'initié et le contexte historique, vous aide à avancer efficacement malgré la foule et veille à ce que vous ne manquiez aucun détail important des sites visités.`,
    faqDressQ: 'Y a-t-il une tenue particulière à respecter ?',
    faqDressA:
      `Pour les sites religieux et certains monuments, une tenue couvrante est exigée (épaules et genoux couverts). Mieux vaut emporter un foulard ou un châle léger. La plupart des restaurants et hôtels n'imposent aucune tenue précise, mais une allure soignée est appréciée.`,
    faqLastMinuteQ: 'Peut-on réserver une excursion à la dernière minute ?',
    faqLastMinuteA:
      `Nous conseillons de réserver à l'avance pour les excursions très demandées, mais beaucoup d'expériences restent réservables à la dernière minute, selon les disponibilités. Les visites coupe-file et les expériences spéciales partent toutefois vite : mieux vaut réserver tôt.`,
    faqCancelQ: "Quelle est votre politique d'annulation ?",
    faqCancelA:
      `La plupart des excursions sont annulables gratuitement jusqu'à 24 heures avant le départ, avec remboursement intégral. Certains événements spéciaux peuvent suivre d'autres conditions. Consultez la fiche de l'excursion concernée pour connaître les conditions d'annulation exactes.`,
    faqMealsQ: 'Les repas sont-ils inclus dans les excursions ?',
    faqMealsA:
      `Cela dépend de l'excursion. Certaines incluent des repas ou des collations, d'autres non. Chaque description indique clairement ce qui est compris. Les excursions gastronomiques comprennent naturellement plusieurs dégustations dans le cadre de l'expérience.`,
    faqMeetingQ: 'Comment rejoindre les points de rendez-vous ?',
    faqMeetingA:
      `Chaque confirmation d'excursion contient toutes les informations sur le point de rendez-vous, avec cartes et itinéraires. La plupart se trouvent à des endroits centraux, faciles d'accès et bien desservis par les transports en commun. Notre équipe est disponible 24h/24 et 7j/7 si vous avez besoin d'aide.`,
    reviewsTitle: (destination: string) => `Ce que les voyageurs disent de ${destination}`,
    reviewsSummary: (average: number, count: number) =>
      `${average.toFixed(1)}/5 sur ${count} avis`,
    verifiedTraveler: 'Voyageur vérifié',
    readAllReviews: 'Lire tous les avis',
    relatedDestinationsTitle: "Explorer d'autres destinations",
    relatedDestinationsSubtitle: "Découvrez d'autres lieux magnifiques qui pourraient vous plaire",
    toursAvailable: (count: number) =>
      `${count} ${count === 1 ? 'excursion disponible' : 'excursions disponibles'}`,
    newsletterTitle: (destination: string) => `Recevez des offres de voyage exclusives pour ${destination}`,
    newsletterSubtitle: 'Abonnez-vous à notre newsletter pour recevoir des offres spéciales, des conseils de voyage et des guides exclusifs',
    newsletterEmailPlaceholder: 'Saisissez votre e-mail',
    newsletterSubscribe: "Je m'abonne",
    newsletterFootnote: 'Recevez les offres de destinations par e-mail. Désabonnement à tout moment.',
    infoBestTime: 'Meilleure période pour partir',
    infoCurrency: 'Monnaie',
    infoTimeZone: 'Fuseau horaire',
    infoAvailableTours: 'Excursions disponibles',
    infoYearRound: "Toute l'année",
    infoTimezoneFallback: "Heure d'Europe centrale",
    infoAvailableExperiences: (count: number) => `${count} ${count === 1 ? 'expérience' : 'expériences'}`,
    featuredSectionTitle: (destination: string) => `Les meilleures offres à ${destination}`,
    featuredSectionSubtitle: 'Des expériences sélectionnées à des prix imbattables',
    topToursTitle: (destination: string) => `TOP 10 DES EXCURSIONS À ${destination.toUpperCase()}`,
    topToursSubtitle: 'Nos excursions et expériences les plus vendues, sélectionnées par des experts locaux',
    interestsTitle: (destination: string) => `Découvrir ${destination} selon vos envies`,
    interestsSubtitle: "Trouvez l'expérience qui vous correspond, que vous soyez attiré par la culture, l'aventure ou la gastronomie.",
    whyVisitTitle: (destination: string) => `Pourquoi visiter ${destination} ?`,
  },
  es: {
    featured: 'Destacado',
    tours: 'Excursiones',
    destinations: 'Destinos',
    categories: 'Categorías',
    untitledTour: 'Excursión sin título',
    untitledDestination: 'Destino sin título',
    untitledCategory: 'Categoría sin título',
    hereAreTours: 'Estas son algunas excursiones que he encontrado para ti:',
    hereAreDestinations: 'Estos son algunos destinos que he encontrado para ti:',
    askAiAnything: 'Pregunta a la IA lo que quieras sobre este destino...',
    clearSearch: 'Borrar búsqueda',
    stop: 'Detener',
    send: 'Enviar',
    openAiAssistant: 'Abrir el asistente de IA',
    aiDestinationAssistant: 'Asistente de destinos con IA',
    searchResults: 'Resultados de búsqueda',
    popularSearches: 'Búsquedas populares',
    noTenantResultsTitle: 'No se han encontrado resultados',
    noTenantResultsBody: (destination) =>
      `Prueba otra búsqueda relacionada con ${destination} o explora las excursiones y los destinos disponibles en esta web.`,
    newChat: 'Nueva conversación',
    askDestinationPrompt: '¡Pregúntame lo que quieras sobre este destino!',
    trendingTours: 'Excursiones más populares',
    discover: 'DESCUBRE',
    exploreDestination: (destination: string) => `Descubre ${destination}`,
    thingsToDoIn: (destination: string) => `Qué hacer en ${destination}`,
    bestToursIn: (destination: string) => `Las mejores excursiones en ${destination}`,
    toursCount: (count: number) => `${count}+ ${count === 1 ? 'excursión' : 'excursiones'}`,
    home: 'Inicio',
    destinationsRoot: 'Destinos',
    galleryTitle: 'Galería del destino',
    practicalTitle: 'Información práctica',
    practicalClimate: 'Clima',
    practicalVisa: 'Requisitos de visado',
    practicalLanguages: 'Idiomas',
    practicalEmergency: 'Número de emergencias',
    practicalSummer: 'Temperatura en verano',
    practicalWinter: 'Temperatura en invierno',
    scrollLeft: 'Desplazar a la izquierda',
    scrollRight: 'Desplazar a la derecha',
    bookNow: 'Reservar ahora',
    bookings: (count: number) => `${count} ${count === 1 ? 'reserva' : 'reservas'}`,
    statsToursAvailable: 'Excursiones disponibles',
    statsHappyTravelers: 'Viajeros satisfechos',
    statsAverageRating: 'Valoración media',
    statsCustomerSupport: 'Atención al cliente',
    travelTipsTitle: 'Consejos de viaje e información esencial',
    travelTipsSubtitle: 'Todo lo que necesitas saber antes de viajar',
    travelTipBestTime: 'Mejor época para visitar',
    travelTipCurrency: 'Moneda',
    travelTipLanguages: 'Idiomas',
    travelTipEmergency: 'Emergencias',
    travelTipDefaultBestTime: 'Destino para todo el año con un clima agradable',
    travelTipDefaultCurrency: 'Se acepta la moneda local',
    travelTipDefaultLanguages: 'El inglés se habla ampliamente',
    travelTipDefaultEmergency: 'Servicios de emergencia locales',
    aboutTitle: (destination: string) => `Tu guía local en ${destination}`,
    aboutFallback: (destination: string) =>
      `Descubre lo mejor de ${destination} con nuestros guías locales expertos. Te mostraremos rincones escondidos, te contaremos historias fascinantes y crearemos recuerdos inolvidables que te acompañarán toda la vida.`,
    learnMoreAboutUs: 'Conoce más sobre nosotros',
    aboutExpertGuidesTitle: 'Guías locales expertos',
    aboutExpertGuidesBody: (destination: string) =>
      `Nuestros guías locales con experiencia conocen todos los rincones escondidos y las historias de ${destination}.`,
    aboutQualityTitle: 'Experiencias de calidad',
    aboutQualityBody: (destination: string) =>
      `Te ofrecemos las mejores experiencias en ${destination}, seleccionadas por nuestros expertos.`,
    aboutSafeTitle: 'Seguro y fiable',
    aboutSafeBody: 'Tu seguridad es nuestra prioridad. Todas las excursiones están cuidadosamente revisadas y aseguradas.',
    aboutPriceTitle: 'Garantía del mejor precio',
    aboutPriceBody: (destination: string) =>
      `¿Has encontrado un precio más bajo? Lo igualamos. Disfruta de las mejores ofertas para ${destination}.`,
    faqTitle: 'PREGUNTAS FRECUENTES',
    faqSubtitle: (destination: string) => `Todo lo que necesitas saber para visitar ${destination}`,
    faqViewAll: 'VER TODAS LAS PREGUNTAS',
    faqViewAllAria: 'Ver todas las preguntas frecuentes',
    faqBestTimeQ: (destination: string) => `¿Cuál es la mejor época para visitar ${destination}?`,
    faqBestTimeA: (destination: string) =>
      `La mejor época para visitar ${destination} son los meses más frescos, de octubre a abril, cuando las temperaturas resultan agradables para las visitas y las actividades al aire libre. El tiempo es ideal para recorrer los lugares de interés y participar en excursiones.`,
    faqDaysQ: (destination: string) => `¿Cuántos días conviene pasar en ${destination}?`,
    faqDaysA: (_destination: string) =>
      `Recomendamos dedicar al menos 3 a 5 días para disfrutar con calma de los principales lugares de interés. Sin embargo, con una semana o más el ritmo es más relajado y da tiempo a descubrir rincones escondidos, barrios locales y excursiones de un día por los alrededores.`,
    faqSafeQ: (destination: string) => `¿Es ${destination} un destino seguro para los turistas?`,
    faqSafeA: (destination: string) =>
      `Sí, ${destination} es en general un destino seguro para los turistas. Como en cualquier destino, conviene tomar las precauciones habituales: estar atento al entorno, guardar bien los objetos de valor y seguir las indicaciones locales. En nuestras excursiones tu seguridad es lo primero, con guías profesionales.`,
    faqPackQ: (destination: string) => `¿Qué debo llevar a ${destination}?`,
    faqPackA:
      'Lleva calzado cómodo para caminar, ropa ligera y transpirable para el día, una chaqueta fina para la noche o los espacios con aire acondicionado, protector solar, gafas de sol, un sombrero y los medicamentos que necesites. ¡Y no olvides la cámara para capturar estos paisajes increíbles!',
    faqGuideQ: (destination: string) => `¿Necesito un guía para las excursiones en ${destination}?`,
    faqGuideA:
      'No es obligatorio, pero contar con un guía local mejora mucho la experiencia. Los guías aportan información de primera mano y contexto histórico, ayudan a moverse con agilidad entre la gente y se aseguran de que no te pierdas ningún detalle importante de los lugares que visitas.',
    faqDressQ: '¿Hay alguna norma de vestimenta que deba tener en cuenta?',
    faqDressA:
      'En los lugares religiosos y en algunos monumentos se exige ropa discreta (hombros y rodillas cubiertos). Lo mejor es llevar un pañuelo o un chal ligero. La mayoría de los restaurantes y hoteles no tienen una norma concreta, aunque se agradece un estilo informal cuidado.',
    faqLastMinuteQ: '¿Puedo reservar excursiones a última hora?',
    faqLastMinuteA:
      'Para las excursiones más populares recomendamos reservar con antelación, aunque muchas experiencias pueden reservarse a última hora según la disponibilidad. Las visitas sin colas y las experiencias especiales suelen agotarse, así que conviene reservar pronto.',
    faqCancelQ: '¿Cuál es vuestra política de cancelación?',
    faqCancelA:
      'La mayoría de las excursiones permiten la cancelación gratuita hasta 24 horas antes de la hora de inicio, con reembolso completo. Algunos eventos especiales pueden tener condiciones distintas. Consulta los detalles de cada excursión para conocer las condiciones exactas de cancelación.',
    faqMealsQ: '¿Las comidas están incluidas en las excursiones?',
    faqMealsA:
      'Depende de la excursión. Algunas incluyen comidas o tentempiés y otras no. En la descripción de cada excursión se indica claramente qué está incluido. Las rutas gastronómicas incluyen, por supuesto, varias degustaciones como parte de la experiencia.',
    faqMeetingQ: '¿Cómo llego a los puntos de encuentro?',
    faqMeetingA:
      'Todas las confirmaciones de excursión incluyen información detallada del punto de encuentro, con mapas e indicaciones. La mayoría de los puntos de encuentro están en lugares céntricos y de fácil acceso, con buena conexión de transporte público. Nuestro equipo está disponible 24 horas al día, 7 días a la semana, si necesitas ayuda.',
    reviewsTitle: (destination: string) => `Lo que dicen los viajeros sobre ${destination}`,
    reviewsSummary: (average: number, count: number) =>
      `${average.toFixed(1)}/5 de ${count} ${count === 1 ? 'opinión' : 'opiniones'}`,
    verifiedTraveler: 'Viajero verificado',
    readAllReviews: 'Leer todas las opiniones',
    relatedDestinationsTitle: 'Descubre más destinos',
    relatedDestinationsSubtitle: 'Descubre otros lugares increíbles que podrían encantarte',
    toursAvailable: (count: number) =>
      `${count} ${count === 1 ? 'excursión disponible' : 'excursiones disponibles'}`,
    newsletterTitle: (destination: string) => `Recibe ofertas de viaje exclusivas para ${destination}`,
    newsletterSubtitle: 'Suscríbete a nuestra newsletter y recibe ofertas especiales, consejos de viaje y guías exclusivas',
    newsletterEmailPlaceholder: 'Introduce tu correo electrónico',
    newsletterSubscribe: 'Suscribirme',
    newsletterFootnote: 'Recibe ofertas de destinos por correo electrónico. Puedes darte de baja cuando quieras.',
    infoBestTime: 'Mejor época para visitar',
    infoCurrency: 'Moneda',
    infoTimeZone: 'Zona horaria',
    infoAvailableTours: 'Excursiones disponibles',
    infoYearRound: 'Todo el año',
    infoTimezoneFallback: 'Hora de Europa Central',
    infoAvailableExperiences: (count: number) => `${count} ${count === 1 ? 'experiencia' : 'experiencias'}`,
    featuredSectionTitle: (destination: string) => `Las mejores ofertas en ${destination}`,
    featuredSectionSubtitle: 'Experiencias seleccionadas a precios inmejorables',
    topToursTitle: (destination: string) => `LAS 10 MEJORES EXCURSIONES EN ${destination.toUpperCase()}`,
    topToursSubtitle: 'Nuestras excursiones y experiencias más vendidas, seleccionadas por expertos locales',
    interestsTitle: (destination: string) => `Descubre ${destination} según tus intereses`,
    interestsSubtitle: 'Encuentra la experiencia perfecta para ti, ya te interese la cultura, la aventura o la gastronomía.',
    whyVisitTitle: (destination: string) => `¿Por qué visitar ${destination}?`,
  },
  ru: {
    featured: 'Рекомендуем',
    tours: 'Экскурсии',
    destinations: 'Направления',
    categories: 'Категории',
    untitledTour: 'Экскурсия без названия',
    untitledDestination: 'Направление без названия',
    untitledCategory: 'Категория без названия',
    hereAreTours: 'Вот несколько экскурсий, которые я для вас нашёл:',
    hereAreDestinations: 'Вот несколько направлений, которые я для вас нашёл:',
    askAiAnything: 'Спросите ИИ о чём угодно, связанном с этим направлением...',
    clearSearch: 'Очистить поиск',
    stop: 'Остановить',
    send: 'Отправить',
    openAiAssistant: 'Открыть ИИ-помощника',
    aiDestinationAssistant: 'ИИ-помощник по направлению',
    searchResults: 'Результаты поиска',
    popularSearches: 'Популярные запросы',
    noTenantResultsTitle: 'Подходящих результатов не найдено',
    noTenantResultsBody: (destination) =>
      `Попробуйте другой запрос, связанный с ${destination}, или посмотрите экскурсии и направления, доступные на этом сайте.`,
    newChat: 'Новый чат',
    askDestinationPrompt: 'Спросите меня о чём угодно про это направление!',
    trendingTours: 'Популярные экскурсии',
    discover: 'ОТКРОЙТЕ ДЛЯ СЕБЯ',
    exploreDestination: (destination: string) => `Откройте для себя ${destination}`,
    thingsToDoIn: (destination: string) => `Чем заняться в ${destination}`,
    bestToursIn: (destination: string) => `Лучшие экскурсии в ${destination}`,
    toursCount: (count: number) =>
      `${count}+ ${ruPlural(count, 'экскурсия', 'экскурсии', 'экскурсий')}`,
    home: 'Главная',
    destinationsRoot: 'Направления',
    galleryTitle: 'Галерея направления',
    practicalTitle: 'Полезная информация',
    practicalClimate: 'Климат',
    practicalVisa: 'Визовые требования',
    practicalLanguages: 'Языки',
    practicalEmergency: 'Телефон экстренной службы',
    practicalSummer: 'Температура летом',
    practicalWinter: 'Температура зимой',
    scrollLeft: 'Прокрутить влево',
    scrollRight: 'Прокрутить вправо',
    bookNow: 'Забронировать',
    bookings: (count: number) => `${count} ${ruPlural(count, 'бронирование', 'бронирования', 'бронирований')}`,
    statsToursAvailable: 'Доступные экскурсии',
    statsHappyTravelers: 'Довольные путешественники',
    statsAverageRating: 'Средняя оценка',
    statsCustomerSupport: 'Поддержка клиентов',
    travelTipsTitle: 'Советы путешественникам и важная информация',
    travelTipsSubtitle: 'Всё, что нужно знать перед поездкой',
    travelTipBestTime: 'Лучшее время для поездки',
    travelTipCurrency: 'Валюта',
    travelTipLanguages: 'Языки',
    travelTipEmergency: 'Экстренные службы',
    travelTipDefaultBestTime: 'Направление для поездок круглый год с приятной погодой',
    travelTipDefaultCurrency: 'Принимается местная валюта',
    travelTipDefaultLanguages: 'Английский широко распространён',
    travelTipDefaultEmergency: 'Местные экстренные службы',
    aboutTitle: (destination: string) => `Ваш местный гид в ${destination}`,
    aboutFallback: (destination: string) =>
      `Откройте для себя лучшее в ${destination} вместе с нашими опытными местными гидами. Мы покажем вам скрытые жемчужины, расскажем увлекательные истории и подарим незабываемые впечатления, которые останутся с вами на всю жизнь.`,
    learnMoreAboutUs: 'Узнать больше о нас',
    aboutExpertGuidesTitle: 'Опытные местные гиды',
    aboutExpertGuidesBody: (destination: string) =>
      `Наши опытные местные гиды знают все скрытые жемчужины и истории ${destination}.`,
    aboutQualityTitle: 'Качественные впечатления',
    aboutQualityBody: (destination: string) =>
      `Мы предлагаем вам лучшие впечатления в ${destination}, тщательно отобранные нашими специалистами.`,
    aboutSafeTitle: 'Безопасно и надёжно',
    aboutSafeBody: 'Ваша безопасность для нас в приоритете. Все экскурсии тщательно проверены и застрахованы.',
    aboutPriceTitle: 'Гарантия лучшей цены',
    aboutPriceBody: (destination: string) =>
      `Нашли цену ниже? Мы её повторим. Пользуйтесь лучшими предложениями для ${destination}.`,
    faqTitle: 'ЧАСТО ЗАДАВАЕМЫЕ ВОПРОСЫ',
    faqSubtitle: (destination: string) => `Всё, что нужно знать о поездке в ${destination}`,
    faqViewAll: 'ВСЕ ВОПРОСЫ И ОТВЕТЫ',
    faqViewAllAria: 'Посмотреть все вопросы и ответы',
    faqBestTimeQ: (destination: string) => `Когда лучше всего ехать в ${destination}?`,
    faqBestTimeA: (destination: string) =>
      `Лучшее время для поездки в ${destination} — прохладные месяцы с октября по апрель, когда температура комфортна для осмотра достопримечательностей и активностей на свежем воздухе. Погода в это время идеальна для прогулок по достопримечательностям и участия в экскурсиях.`,
    faqDaysQ: (destination: string) => `Сколько дней стоит провести в ${destination}?`,
    faqDaysA: (_destination: string) =>
      `Мы рекомендуем выделить хотя бы 3–5 дней, чтобы спокойно осмотреть основные достопримечательности. Впрочем, неделя или больше позволит путешествовать в более размеренном темпе и открыть скрытые жемчужины, местные кварталы и поездки на день в окрестности.`,
    faqSafeQ: (destination: string) => `Безопасно ли туристам в ${destination}?`,
    faqSafeA: (destination: string) =>
      `Да, в ${destination} туристам в целом безопасно. Как и в любом другом месте, соблюдайте обычные меры предосторожности: следите за происходящим вокруг, храните ценные вещи в надёжном месте и следуйте местным рекомендациям. На наших экскурсиях ваша безопасность на первом месте, с профессиональными гидами.`,
    faqPackQ: (destination: string) => `Что взять с собой в ${destination}?`,
    faqPackA:
      'Возьмите удобную обувь для прогулок, лёгкую дышащую одежду на день, тонкую куртку на вечер или для помещений с кондиционером, солнцезащитный крем, солнечные очки, головной убор и все необходимые лекарства. И не забудьте фотоаппарат, чтобы запечатлеть удивительные виды!',
    faqGuideQ: (destination: string) => `Нужен ли гид для экскурсий в ${destination}?`,
    faqGuideA:
      'Это не обязательно, но местный гид заметно обогатит вашу поездку. Гиды делятся знаниями изнутри и историческим контекстом, помогают быстрее пройти через скопления людей и следят за тем, чтобы вы не пропустили важные детали достопримечательностей.',
    faqDressQ: 'Есть ли требования к одежде, о которых стоит знать?',
    faqDressA:
      'Для религиозных объектов и некоторых достопримечательностей требуется скромная одежда (закрытые плечи и колени). Лучше взять с собой лёгкий платок или шаль. В большинстве ресторанов и отелей особых требований к одежде нет, но опрятный повседневный стиль приветствуется.',
    faqLastMinuteQ: 'Можно ли забронировать экскурсию в последний момент?',
    faqLastMinuteA:
      'Популярные экскурсии мы советуем бронировать заранее, но многие впечатления можно забронировать и в последний момент, при наличии мест. Экскурсии без очереди и особые программы часто распродаются, поэтому раннее бронирование предпочтительнее.',
    faqCancelQ: 'Какие у вас условия отмены?',
    faqCancelA:
      'Большинство экскурсий можно бесплатно отменить не позднее чем за 24 часа до начала и получить полный возврат. Для отдельных особых мероприятий условия могут отличаться. Точные условия отмены смотрите в описании конкретной экскурсии.',
    faqMealsQ: 'Входит ли питание в экскурсии?',
    faqMealsA:
      'Это зависит от экскурсии. В некоторые входит питание или перекус, в другие — нет. В описании каждой экскурсии ясно указано, что включено. В гастрономических экскурсиях несколько дегустаций, разумеется, входят в программу.',
    faqMeetingQ: 'Как добраться до места встречи?',
    faqMeetingA:
      'В каждом подтверждении экскурсии есть подробная информация о месте встречи с картами и схемой проезда. Большинство мест встречи находятся в центре, до них легко добраться, в том числе на общественном транспорте. Наша команда на связи круглосуточно, если вам понадобится помощь.',
    reviewsTitle: (destination: string) => `Что путешественники говорят о ${destination}`,
    reviewsSummary: (average: number, count: number) =>
      `${average.toFixed(1)}/5 — ${count} ${ruPlural(count, 'отзыв', 'отзыва', 'отзывов')}`,
    verifiedTraveler: 'Проверенный путешественник',
    readAllReviews: 'Читать все отзывы',
    relatedDestinationsTitle: 'Другие направления',
    relatedDestinationsSubtitle: 'Откройте другие удивительные места, которые могут вам понравиться',
    toursAvailable: (count: number) =>
      `Доступно: ${count} ${ruPlural(count, 'экскурсия', 'экскурсии', 'экскурсий')}`,
    newsletterTitle: (destination: string) => `Получайте эксклюзивные предложения для поездки в ${destination}`,
    newsletterSubtitle: 'Подпишитесь на нашу рассылку и получайте специальные предложения, советы путешественникам и полезные гиды',
    newsletterEmailPlaceholder: 'Введите ваш e-mail',
    newsletterSubscribe: 'Подписаться',
    newsletterFootnote: 'Получайте предложения по направлениям на e-mail. Отписаться можно в любой момент.',
    infoBestTime: 'Лучшее время для поездки',
    infoCurrency: 'Валюта',
    infoTimeZone: 'Часовой пояс',
    infoAvailableTours: 'Доступные экскурсии',
    infoYearRound: 'Круглый год',
    infoTimezoneFallback: 'Центральноевропейское время',
    infoAvailableExperiences: (count: number) =>
      `${count} ${ruPlural(count, 'впечатление', 'впечатления', 'впечатлений')}`,
    featuredSectionTitle: (destination: string) => `Лучшие предложения в ${destination}`,
    featuredSectionSubtitle: 'Отобранные впечатления по непревзойдённым ценам',
    topToursTitle: (destination: string) => `ТОП-10 ЭКСКУРСИЙ В ${destination.toUpperCase()}`,
    topToursSubtitle: 'Наши самые популярные экскурсии и впечатления, отобранные местными специалистами',
    interestsTitle: (destination: string) => `Откройте ${destination} по интересам`,
    interestsSubtitle: 'Найдите подходящее впечатление, будь вам интересна культура, приключения или еда.',
    whyVisitTitle: (destination: string) => `Зачем ехать в ${destination}?`,
  },
};

type DestinationPageCopyLanguage = keyof typeof destinationPageCopy;

function destinationPageCopyFor(locale: string): DestinationPageCopy {
  // next-intl hands over values such as "de" or "de-AT", so match on the
  // language subtag and fall back to English for anything not translated here.
  const language = locale.slice(0, 2).toLowerCase() as DestinationPageCopyLanguage;
  return destinationPageCopy[language] ?? destinationPageCopy.en;
}

function useDestinationPageLocale() {
  const locale = useLocale();
  const rtl = locale.startsWith('ar') || isRTL(locale);
  const copy = destinationPageCopyFor(locale);
  return { locale, rtl, copy };
}

const hasArabicChars = (value: string): boolean => /[\u0600-\u06FF]/.test(value);

// Algolia Configuration
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';
const INDEX_DESTINATIONS = 'destinations';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// --- Hero Helper Hooks ---
const useSlidingText = (texts: string[], interval = 3000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (texts.length === 0) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const timer = setInterval(() =>
      setCurrentIndex((prev) => (prev + 1) % texts.length),
      interval
    );
    intervalRef.current = timer;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [texts.length, interval]);

  return texts[currentIndex] || texts[0] || "Search...";
};

const TourCard = ({ tour, onHitClick }: { tour: any; onHitClick?: () => void }) => {
  return (
  <motion.div whileHover={{ y: -4 }}>
    <Link
      href={`/${tour.slug}`}
      onClick={onHitClick}
      className="group block flex-shrink-0 w-[240px] bg-white text-gray-900 rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300"
    >
    {tour.image && (
      <div className="relative h-32 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
        <Image
          src={tour.image}
          alt={tour.title}
          fill
          unoptimized
          sizes="240px"
          className="object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {tour.duration && (
          <div className="absolute top-2 end-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-medium">
            {tour.duration}
          </div>
        )}
      </div>
    )}
    <div className="p-2.5">
      <h3 className="font-semibold text-xs text-gray-900 mb-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors">
        {tour.title}
      </h3>
      {tour.location && (
        <div className="flex items-center gap-1 text-[10px] mb-1.5">
          <MapPin className="w-2.5 h-2.5 text-gray-400" />
          <span className="line-clamp-1 text-gray-600">{tour.location}</span>
        </div>
      )}
      {tour.rating && (
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
          <span className="text-[10px] font-medium text-gray-900">{tour.rating}</span>
          {tour.reviews && <span className="text-[10px] text-gray-400">({tour.reviews})</span>}
        </div>
      )}
      {tour.price && (
        <div className="flex items-center gap-1 text-blue-600 font-bold text-sm">
          <DollarSign className="w-3 h-3" />
          <span>{tour.price}</span>
        </div>
      )}
    </div>
    </Link>
  </motion.div>
  );
};

const TourSlider = ({ tours, onHitClick }: { tours: any[]; onHitClick?: () => void }) => {
  const { rtl, copy } = useDestinationPageLocale();
  const sliderRef = useRef<HTMLDivElement>(null);
  const PrevArrow = rtl ? ChevronRight : ChevronLeft;
  const NextArrow = rtl ? ChevronLeft : ChevronRight;

  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 260;
    const baseOffset = direction === 'left' ? -scrollAmount : scrollAmount;
    sliderRef.current.scrollBy({
      left: rtl ? -baseOffset : baseOffset,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative w-full">
      {tours.length > 1 && (
        <>
          <button
            onClick={() => scroll('left')}
            aria-label={copy.scrollLeft}
            className="absolute start-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <PrevArrow className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label={copy.scrollRight}
            className="absolute end-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <NextArrow className="w-3.5 h-3.5" />
          </button>
        </>
      )}
      <div
        ref={sliderRef}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-1"
      >
        {tours.map((tour, idx) => (
          <TourCard key={`${tour.slug}-${idx}`} tour={tour} onHitClick={onHitClick} />
        ))}
      </div>
    </div>
  );
};

// Destination Slider Component for AI Chat
const DestinationSlider = ({ destinations }: { destinations: any[] }) => {
  const { rtl, copy } = useDestinationPageLocale();
  const sliderRef = useRef<HTMLDivElement>(null);
  const PrevArrow = rtl ? ChevronRight : ChevronLeft;
  const NextArrow = rtl ? ChevronLeft : ChevronRight;

  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 280;
    const baseOffset = direction === 'left' ? -scrollAmount : scrollAmount;
    sliderRef.current.scrollBy({
      left: rtl ? -baseOffset : baseOffset,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative w-full my-3">
      {destinations.length > 1 && (
        <>
          <button
            onClick={() => scroll('left')}
            aria-label={copy.scrollLeft}
            className="absolute start-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <PrevArrow className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label={copy.scrollRight}
            className="absolute end-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <NextArrow className="w-3.5 h-3.5" />
          </button>
        </>
      )}
      <div
        ref={sliderRef}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-1"
      >
        {destinations.map((destination, idx) => (
          <a
            key={idx}
            href={contentPath('destination', destination.slug, destination.urlType, null, destination.parentPage?.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="group block flex-shrink-0 w-[260px] bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            {destination.image && (
              <div className="relative h-36 bg-gradient-to-br from-emerald-100 to-teal-100 overflow-hidden">
                <Image
                  src={destination.image}
                  alt={destination.name}
                  fill
                  unoptimized
                  sizes="260px"
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
                {destination.isFeatured && (
                  <div className="absolute top-2 start-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 shadow-md">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    {copy.featured}
                  </div>
                )}
              </div>
            )}
            <div className="p-3">
              <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors leading-tight">
                {destination.name}
              </h3>
              {destination.description && (
                <p className="text-gray-500 text-[11px] mb-2 line-clamp-2">
                  {destination.description}
                </p>
              )}
              {(Number(destination.tourCount) || 0) > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-gray-500 text-[11px]">
                    <MapPin className="w-3 h-3 text-emerald-500" />
                    <span>{copy.toursCount(destination.tourCount)}</span>
                  </div>
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

function TourSearchResults({
  tours,
  onHitClick,
}: {
  tours: any[];
  onHitClick?: () => void;
}) {
  const { copy } = useDestinationPageLocale();

  if (tours.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <MapPin className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            {copy.tours}
          </span>
          <span className="ms-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {tours.length}
          </span>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        <TourSlider tours={tours} onHitClick={onHitClick} />
      </div>
    </div>
  );
}

function DestinationSearchResults({
  destinations,
  onHitClick,
}: {
  destinations: Array<{
    _id?: string;
    slug: string;
    name: string;
    country?: string;
    tourCount?: number;
    urlType?: string;
    parentPage?: Destination['parentPage'];
  }>;
  onHitClick?: () => void;
}) {
  const { copy } = useDestinationPageLocale();
  if (destinations.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Compass className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            {copy.destinations}
          </span>
          <span className="ms-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {destinations.length}
          </span>
        </div>
      </div>
      {destinations.map((item) => (
        <Link
          key={item.slug || item._id}
          href={contentPath('destination', item.slug, item.urlType, null, item.parentPage?.slug)}
          onClick={onHitClick}
          className="block px-4 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-emerald-500/5 hover:via-teal-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-teal-500/0 to-cyan-500/0 group-hover:from-emerald-500/5 group-hover:via-teal-500/5 group-hover:to-cyan-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              <Compass className="w-6 md:w-7 h-6 md:h-7 text-emerald-600" strokeWidth={2.5} />
                      </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-emerald-600 transition-colors duration-300">
                {item.name || copy.untitledDestination}
                      </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {item.country && (
                  <span className="bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium">
                    {item.country}
                  </span>
                )}
                {item.tourCount && (
                  <span className="bg-emerald-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-emerald-700">
                    {copy.toursCount(item.tourCount)}
                  </span>
                    )}
                  </div>
                    </div>
                        </div>
        </Link>
      ))}
                    </div>
  );
}

function CategorySearchResults({
  categories,
  onHitClick,
}: {
  categories: Category[];
  onHitClick?: () => void;
}) {
  const { copy } = useDestinationPageLocale();
  if (categories.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-purple-500/5 via-fuchsia-500/5 to-pink-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Tag className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
                      </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            {copy.categories}
          </span>
          <span className="ms-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {categories.length}
          </span>
                  </div>
                </div>
      {categories.map((item) => (
        <Link
          key={item.slug || item._id}
          href={contentPath('category', item.slug, item.urlType, null, item.parentPage?.slug)}
          onClick={onHitClick}
          className="block px-4 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-purple-500/5 hover:via-fuchsia-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-fuchsia-500/0 to-pink-500/0 group-hover:from-purple-500/5 group-hover:via-fuchsia-500/5 group-hover:to-pink-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-purple-50 to-fuchsia-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              <Tag className="w-6 md:w-7 h-6 md:h-7 text-purple-600" strokeWidth={2.5} />
          </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-purple-600 transition-colors duration-300">
                {item.name || copy.untitledCategory}
        </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5">
                {item.tourCount && (
                  <span className="bg-purple-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-purple-700">
                    {copy.toursCount(item.tourCount)}
                  </span>
                )}
      </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// --- Hero Search Bar ---
const HeroSearchBar = ({
  suggestion,
  tenantId,
  destination,
  destinationTours,
  relatedDestinations,
  allCategories,
}: {
  suggestion: string;
  tenantId?: string;
  destination: Destination;
  destinationTours: Tour[];
  relatedDestinations: Destination[];
  allCategories: Category[];
}) => {
  const { rtl, copy } = useDestinationPageLocale();
  const BackArrow = rtl ? ArrowRight : ArrowLeft;
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [detectedToursByMessage, setDetectedToursByMessage] = useState<Record<string, any[]>>({});
  const [detectedDestinationsByMessage, setDetectedDestinationsByMessage] = useState<Record<string, any[]>>({});
  const activeTenantId = tenantId || 'default';
  const searchResults = getDestinationPageSearchResults({
    query,
    destination,
    destinationTours,
    relatedDestinations,
    allCategories,
  });
  const trendingSearches = getDestinationTrendingSearches({
    destination,
    destinationTours,
    allCategories,
  });
  const hasLocalSearchResults =
    searchResults.tours.length > 0 ||
    searchResults.destinations.length > 0 ||
    searchResults.categories.length > 0;
  const shouldShowSearchDropdown = isExpanded || (isSearchFocused && Boolean(query.trim()));

  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `https://${ALGOLIA_APP_ID}.algolia.net/agent-studio/1/agents/${AGENT_ID}/completions?stream=true&compatibilityMode=ai-sdk-5`,
      headers: {
        'x-algolia-application-id': ALGOLIA_APP_ID,
        'x-algolia-api-key': ALGOLIA_SEARCH_KEY,
      },
    }),
  });
  const isGenerating = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setIsSearchFocused(false);
        setChatMode(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  useEffect(() => {
    if (isExpanded && containerRef.current) {
      const timeout = setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [isExpanded]);

  // Track if user has manually scrolled away from bottom
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const isScrollingRef = useRef(false);
  
  // Auto-scroll only when user hasn't manually scrolled up
  useEffect(() => {
    if (!chatContainerRef.current || userHasScrolledUp) return;
    
    const container = chatContainerRef.current;
    setTimeout(() => {
      if (!userHasScrolledUp && container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }, [messages, isGenerating, userHasScrolledUp]);
  
  // Track manual scrolling - let user scroll freely
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container || !chatMode) return;
    
    let scrollTimeout: NodeJS.Timeout | undefined;
    
    const handleScroll = () => {
      // Don't interfere if this is a programmatic scroll
      if (isScrollingRef.current) return;
      
      clearTimeout(scrollTimeout);
      
      // Check if user is at the bottom
      const isAtBottom = Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 5;
      
      if (isAtBottom) {
        // User scrolled back to bottom - re-enable auto-scroll
        setUserHasScrolledUp(false);
      } else {
        // User scrolled away from bottom - disable auto-scroll
        setUserHasScrolledUp(true);
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [chatMode]);

  const handleCloseDropdown = useCallback(() => {
    setIsExpanded(false);
    setIsSearchFocused(false);
    setChatMode(false);
  }, []);

  const handleClearChat = () => {
    setDetectedToursByMessage({});
    setDetectedDestinationsByMessage({});
    setMessages([]);
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = 0;
      }
    }, 100);
  };

  const handleOpenAIChat = () => {
    setIsExpanded(true);
    setChatMode(true);
    if (query) {
      setTimeout(() => sendMessage({ text: query }), 300);
      setQuery('');
    }
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  };

  const handleBackToSearch = () => {
    setChatMode(false);
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (chatMode) {
      sendMessage({ text: query });
      setQuery('');
    } else {
      setIsExpanded(true);
    }
  };

  const detectAndFetchTours = useCallback(async (text: string) => {
    try {
      const tourPatterns = [
        /(?:^|\n)\s*(?:\d+\.\s*)?(?:Cairo:|Luxor:|Aswan:|Alexandria:|Hurghada:|Sharm El Sheikh:)?\s*([^($\n—]+?)\s+(?:\(\$|—\s*\$)(\d+)\)?/gm,
        /(?:^|\n)\s*(?:\d+\.\s*)?([A-Z][^($\n—]+?Tour[^($\n—]*?)\s+(?:\(\$|—\s*\$)(\d+)\)?/gm,
        /\*\*([^*]+?)\*\*\s+(?:\(\$|—\s*\$)(\d+)\)?/g,
        /(?:^|\n)\s*(?:\d+\.\s*)?([^—\n]{15,}?)\s+—\s*\$(\d+)/gm,
      ];

      const potentialTours = new Map<string, number>();

      for (const pattern of tourPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            const title = match[1].trim().replace(/^(Cairo:|Luxor:|Aswan:|Alexandria:|Hurghada:|Sharm El Sheikh:)\s*/i, '');
            const price = match[2] ? parseInt(match[2]) : 0;
            if (title.length > 10) {
              potentialTours.set(title, price);
            }
          }
        }
      }

      if (potentialTours.size > 0) {
        const toursArray = Array.from(potentialTours.entries()).slice(0, 4);
        const searchPromises = toursArray.map(async ([tourTitle]) => {
          try {
            let response = await searchClient.search([{
              indexName: INDEX_TOURS,
              params: {
                query: tourTitle,
                hitsPerPage: 8,
              }
            }]);
            let firstResult = response.results[0] as any;
            let scopedHits = filterSearchHitsByTenant((firstResult?.hits || []) as any[], activeTenantId);

            if (scopedHits.length === 0) {
              const keywords = tourTitle.split(/\s+/).filter(w => w.length > 3).slice(0, 4).join(' ');
              response = await searchClient.search([{
                indexName: INDEX_TOURS,
                params: {
                  query: keywords,
                  hitsPerPage: 8,
                }
              }]);
              firstResult = response.results[0] as any;
              scopedHits = filterSearchHitsByTenant((firstResult?.hits || []) as any[], activeTenantId);
            }

            return scopedHits[0];
          } catch (error) {
            console.error('Error searching for tour:', tourTitle, error);
            return null;
          }
        });

        const tours = (await Promise.all(searchPromises)).filter(Boolean);
        if (tours.length > 0) {
          const uniqueTours = tours.reduce((acc: any[], tour: any) => {
            const tourId = tour.slug || tour.objectID;
            if (!acc.find(t => (t.slug || t.objectID) === tourId)) {
              acc.push(tour);
            }
            return acc;
          }, []);

          return uniqueTours.map((tour: any) => ({
            slug: tour.slug || tour.objectID,
            title: tour.title || copy.untitledTour,
            image: tour.image || tour.images?.[0] || tour.primaryImage,
            location: tour.location,
            duration: tour.duration,
            rating: tour.rating,
            reviews: tour.reviews,
            price: tour.discountPrice || tour.price,
            discountPrice: tour.discountPrice,
            originalPrice: tour.price,
            isFeatured: tour.isFeatured,
          }));
        }
      }
    } catch (error) {
      console.error('Error detecting tours:', error);
    }
    return [];
  }, [activeTenantId, copy.untitledTour]);

  const detectAndFetchDestinations = useCallback(async (text: string) => {
    try {
      const destinationNames = new Map<string, boolean>();

      const egyptDestinations = ['Cairo', 'Luxor', 'Aswan', 'Alexandria', 'Hurghada', 'Sharm El Sheikh', 'Dahab', 'Makadi Bay', 'Marsa Alam', 'El Gouna'];

      for (const dest of egyptDestinations) {
        const patterns = [
          new RegExp(`(?:^|\\n)\\s*(?:\\d+\\.\\s*)?${dest}:`, 'im'),
          new RegExp(`(?:^|\\n)\\s*(?:\\d+\\.\\s*\\n)?\\s*${dest}\\s*(?:\\n|$)`, 'im'),
          new RegExp(`\\*\\*${dest}\\*\\*`, 'im')
        ];

        if (patterns.some(pattern => pattern.test(text))) {
          destinationNames.set(dest, true);
        }
      }

      if (destinationNames.size > 0) {
        const destsArray = Array.from(destinationNames.keys()).slice(0, 4);
        const searchPromises = destsArray.map(async (destName) => {
          try {
            const response = await searchClient.search([{
              indexName: INDEX_DESTINATIONS,
              params: {
                query: destName,
                hitsPerPage: 8,
              }
            }]);
            const firstResult = response.results[0] as any;
            return filterSearchHitsByTenant((firstResult?.hits || []) as any[], activeTenantId)[0];
          } catch (error) {
            console.error('Error searching for destination:', destName, error);
            return null;
          }
        });

        const destinations = (await Promise.all(searchPromises)).filter(Boolean);
        if (destinations.length > 0) {
          const uniqueDestinations = destinations.reduce((acc: any[], dest: any) => {
            const destId = dest.slug || dest.objectID;
            if (!acc.find(d => (d.slug || d.objectID) === destId)) {
              acc.push(dest);
            }
            return acc;
          }, []);

          return uniqueDestinations.map((dest: any) => ({
            slug: dest.slug || dest.objectID,
            name: dest.name || copy.untitledDestination,
            image: dest.image || dest.images?.[0] || dest.primaryImage,
            description: dest.description,
            tourCount: dest.tourCount,
            isFeatured: dest.isFeatured,
          }));
        }
      }
    } catch (error) {
      console.error('Error detecting destinations:', error);
    }
    return [];
  }, [activeTenantId, copy.untitledDestination]);

  const renderToolOutput = useCallback((obj: any) => {
    if (Array.isArray(obj)) {
      const tours = filterSearchHitsByTenant(obj as any[], activeTenantId)
        .map((item) => ({
          slug: item.slug || item.objectID,
          title: item.title,
          image: item.image || item.images?.[0] || item.primaryImage,
          location: item.location,
          duration: item.duration,
          rating: item.rating,
          reviews: item.reviews,
          price: item.discountPrice || item.price,
        }))
        .filter((item) => item.title && item.slug);
      if (tours.length > 0) return <TourSlider tours={tours} onHitClick={handleCloseDropdown} />;
    }
    if (obj?.hits && Array.isArray(obj.hits)) {
      const tours = filterSearchHitsByTenant(obj.hits as any[], activeTenantId)
        .map((item: any) => ({
          slug: item.slug || item.objectID,
          title: item.title,
          image: item.image || item.images?.[0] || item.primaryImage,
          location: item.location,
          duration: item.duration,
          rating: item.rating,
          reviews: item.reviews,
          price: item.discountPrice || item.price,
        }))
        .filter((item: any) => item.title && item.slug);
      if (tours.length > 0) return <TourSlider tours={tours} onHitClick={handleCloseDropdown} />;
    }
    if (obj?.title && obj?.slug && filterSearchHitsByTenant([obj], activeTenantId).length > 0) {
      return <TourSlider tours={[obj]} onHitClick={handleCloseDropdown} />;
    }
    return (
      <pre className="bg-gray-900 text-gray-100 p-2 rounded-lg text-[10px] overflow-x-auto">
        {JSON.stringify(obj, null, 2)}
      </pre>
    );
  }, [activeTenantId, handleCloseDropdown]);

  useEffect(() => {
    if (isGenerating) return;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role === 'user') {
      return;
    }

    if (lastMessage.role === 'assistant') {
      const messageId = lastMessage.id;
      if (detectedToursByMessage[messageId] || detectedDestinationsByMessage[messageId]) {
        return;
      }

      const textParts = lastMessage.parts?.filter((p: any) => p.type === 'text') || [];
      const fullText = textParts.map((p: any) => p.text).join(' ');

      // Detect if it's a destination-focused response (no prices, mentions destinations)
      const hasDestinationPattern = /destination/i.test(fullText) &&
                                    !(/\$\d+/i.test(fullText)) &&
                                    (/(?:^|\n)\s*(?:\d+\.\s*)?\s*(?:Cairo|Luxor|Aswan|Alexandria|Hurghada|Sharm|Dahab)/im.test(fullText) ||
                                     /\*\*(?:Cairo|Luxor|Aswan|Alexandria|Hurghada|Sharm|Dahab)\*\*/i.test(fullText));

      // Detect if it's a tour-focused response (has prices)
      const hasTourPattern = /\$\d+/i.test(fullText) ||
                            (/tour/i.test(fullText) && /\(\$\d+\)/i.test(fullText));

      if (hasDestinationPattern) {
        detectAndFetchDestinations(fullText).then(destinations => {
          if (destinations.length > 0) {
            setDetectedDestinationsByMessage(prev => ({
              ...prev,
              [messageId]: destinations
            }));
          }
        });
      } else if (hasTourPattern) {
        detectAndFetchTours(fullText).then(tours => {
          if (tours.length > 0) {
            setDetectedToursByMessage(prev => ({
              ...prev,
              [messageId]: tours
            }));
          }
        });
      }
    }
  }, [messages, isGenerating, detectAndFetchTours, detectAndFetchDestinations, detectedToursByMessage, detectedDestinationsByMessage]);

  const renderContent = useCallback((parts: any[], messageId?: string, hideDetails: boolean = false, isUser: boolean = false) => {
    const hasDetectedTours = messageId && detectedToursByMessage[messageId];

    return parts.map((part: any, idx: number) => {
      if (part.type === 'tool-result') {
        try {
          const obj = JSON.parse(part.text);
          return <div key={idx} className="my-2">{renderToolOutput(obj)}</div>;
        } catch {
          return <pre key={idx} className="text-[10px]">{part.text}</pre>;
        }
      }
      if (part.type === 'text') {
        // User message styling
        if (isUser) {
          return (
            <div key={idx} className="leading-relaxed font-medium">
              {part.text}
            </div>
          );
        }

        // If we have detected tours/destinations, show a simplified version of the text
        if (hideDetails) {
          const lines = part.text.split('\n');
          const introLines = [];
          let foundTourContent = false;

          for (const line of lines) {
            const trimmed = line.trim();

            if (
              /^(?:Luxor|Cairo|Aswan|Alexandria|Hurghada|Sharm El Sheikh|Makadi Bay|From):/i.test(trimmed) ||
              /^(\d+[\.\)]\s*|^\d+\s*$)/.test(trimmed) ||
              /^(?:Duration|Highlights?|Why you'?ll love it|Price|From|Perfect for):/i.test(trimmed) ||
              /\(\$\d+\)/.test(trimmed) ||
              /^\*\*[A-Z]/.test(trimmed) ||
              /^[A-Z][a-zA-Z\s]{10,}(?:Tour|Day|Trip|Experience|Adventure)/.test(trimmed) ||
              /^[•\-\*]\s*(?:Price|Duration|Highlights|Perfect)/i.test(trimmed)
            ) {
              foundTourContent = true;
              break;
            }

            introLines.push(line);
          }

          const introText = introLines.join('\n').trim();

          if (foundTourContent && (!introText || introText.length < 20)) {
            return (
              <div key={idx} className="text-gray-800 text-sm leading-relaxed">
                {hasDetectedTours ? copy.hereAreTours : copy.hereAreDestinations}
              </div>
            );
          }

          if (introText && introText.length >= 20) {
            return (
              <div key={idx} className="prose prose-sm max-w-none text-gray-800 leading-relaxed text-sm sm:text-[15px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {introText}
                </ReactMarkdown>
              </div>
            );
          }

          return (
            <div key={idx} className="text-gray-800 text-sm leading-relaxed">
              {hasDetectedTours ? copy.hereAreTours : copy.hereAreDestinations}
            </div>
          );
        }

        return (
        <div key={idx} className="prose prose-sm max-w-none text-gray-800 leading-relaxed text-sm sm:text-[15px]">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {part.text}
          </ReactMarkdown>
        </div>
        );
      }
      return null;
    }).filter(Boolean);
  }, [copy.hereAreDestinations, copy.hereAreTours, detectedToursByMessage, renderToolOutput]);

  return (
    <div className="mt-4 sm:mt-6 lg:mt-8 w-full flex justify-center md:justify-start px-2 sm:px-4 md:px-0" ref={containerRef}>
      <div className="relative w-full max-w-[280px] sm:max-w-xs md:max-w-md lg:max-w-xl">
        <motion.div
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="relative group"
        >
          <form onSubmit={handleSubmit}>
            <div
              className={`relative bg-white/95 backdrop-blur-xl rounded-full transition-all duration-300 ${
                isExpanded
                  ? 'shadow-2xl shadow-blue-500/25 border-2 border-blue-400/50'
                  : 'shadow-xl hover:shadow-2xl border-2 border-blue-300/30 hover:border-blue-400/50'
              }`}
            >
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setIsExpanded(true);
                  }}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    setIsExpanded(true);
                  }}
                  onKeyDown={(e) => {
                    if (chatMode && e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder={chatMode ? copy.askAiAnything : suggestion}
                  className={`w-full py-3 md:py-4 text-sm md:text-base text-gray-900 placeholder-gray-400 font-medium bg-transparent outline-none rounded-full relative z-10 ${rtl ? 'pe-14 md:pe-16 ps-24 md:ps-28 text-right' : 'ps-14 md:ps-16 pe-24 md:pe-28 text-left'}`}
                  style={{ cursor: 'text' }}
                  disabled={chatMode && isGenerating}
                />

                <div className={`absolute top-1/2 transform -translate-y-1/2 z-10 ${rtl ? 'end-4 md:end-5' : 'start-4 md:start-5'}`}>
                  <motion.div
                    className="relative"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isExpanded
                        ? 'bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30'
                        : 'bg-gradient-to-br from-blue-400 to-purple-400 shadow-md'
                    }`}>
                      <Search className="w-4 h-4 text-white" />
                    </div>
                    <motion.div
                      className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </motion.div>
                </div>

                <div className={`absolute top-1/2 transform -translate-y-1/2 flex items-center gap-2 md:gap-2.5 z-10 ${rtl ? 'start-4 md:start-5' : 'end-4 md:end-5'}`}>
                  {query ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setIsExpanded(false);
                        setIsSearchFocused(false);
                        setChatMode(false);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      aria-label={copy.clearSearch}
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  ) : null}

                  {chatMode ? (
                    <>
                      <motion.button
                        type="button"
                        onClick={() => {
                          if (isGenerating) {
                            stop();
                          } else {
                            handleSubmit(new Event('submit') as any);
                          }
                        }}
                        className={`px-3 md:px-3.5 py-1.5 md:py-2 rounded-xl font-semibold text-white flex items-center gap-1.5 transition-all ${
                          isGenerating ? 'bg-red-500 hover:bg-red-600' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-md'
                        }`}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            <span className="text-[11px] md:text-xs">{copy.stop}</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 md:w-4 h-3.5 md:h-4" />
                            <span className="text-[11px] md:text-xs">{copy.send}</span>
                          </>
                        )}
                      </motion.button>
                      {isExpanded && (
                        <motion.div
                          initial={{ rotate: 180, opacity: 0, scale: 0.5 }}
                          animate={{ rotate: 0, opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        >
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <ChevronUp className="w-4 h-4 text-white" />
                          </div>
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <>
                      <motion.button
                        type="button"
                        onClick={handleOpenAIChat}
                        animate={{
                          rotate: [0, 15, -15, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-md cursor-pointer hover:shadow-lg hover:from-blue-500 hover:to-purple-600 transition-all"
                        aria-label={copy.openAiAssistant}
                      >
                        <Sparkles className="w-4 h-4 text-white" />
                      </motion.button>
                      {isExpanded && (
                        <motion.div
                          initial={{ rotate: 180, opacity: 0, scale: 0.5 }}
                          animate={{ rotate: 0, opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        >
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <ChevronUp className="w-4 h-4 text-white" />
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </form>
        </motion.div>

        <AnimatePresence>
          {shouldShowSearchDropdown && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="absolute top-full mt-3 start-0 end-0 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden z-[9999]"
              style={{ maxHeight: '65vh' }}
            >
              <div className="px-6 py-4 border-b border-gray-100/50 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {chatMode ? (
                      <>
                        <button
                          onClick={handleBackToSearch}
                          className={`${rtl ? 'ms-1' : 'me-1'} p-1.5 hover:bg-white/80 rounded-lg transition-colors`}
                        >
                          <BackArrow className="w-4 h-4 text-gray-600" />
                        </button>
                        <Bot className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          {copy.aiDestinationAssistant}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          {query ? copy.searchResults : copy.popularSearches}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {chatMode && messages.length > 0 && (
                      <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={handleClearChat}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all duration-200 bg-white/80 border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span className="hidden sm:inline">{copy.newChat}</span>
                      </motion.button>
                    )}
                    <button
                      onClick={handleCloseDropdown}
                      className="text-gray-400 hover:text-gray-700 transition-all duration-200 p-2 rounded-full hover:bg-white/80 hover:shadow-md group"
                    >
                      <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>
                </div>
              </div>

              <div ref={chatContainerRef} className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(65vh - 120px)' }}>
                {chatMode ? (
                  <div className="p-4 sm:p-6 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <Bot className="w-12 h-12 text-blue-400 mx-auto mb-3 opacity-60" />
                        <p className="text-gray-500 text-sm">{copy.askDestinationPrompt}</p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const messageTours = detectedToursByMessage[msg.id] || [];
                        const messageDestinations = detectedDestinationsByMessage[msg.id] || [];
                        const hasDetectedTours = messageTours.length > 0;
                        const hasDetectedDestinations = messageDestinations.length > 0;
                        const hasDetectedContent = hasDetectedTours || hasDetectedDestinations;
                        const isUser = msg.role === 'user';
                        const isLastAssistantMessage = msg.role === 'assistant' && idx === messages.length - 1;
                        const isStreaming = isLastAssistantMessage && isGenerating;

                        return (
                          <div key={msg.id}>
                            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] ${isUser ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl rounded-be-sm px-4 py-3' : 'bg-gray-50 text-gray-800 rounded-2xl rounded-bs-sm px-4 py-3 border border-gray-200'}`}>
                                {isUser ? (
                                  <p className="text-sm leading-relaxed">{(msg as any).content}</p>
                                ) : (
                                  renderContent(msg.parts, msg.id, hasDetectedContent, isUser)
                                )}
                              </div>
                            </div>
                            
                            {/* Show detected tours or destinations for this message (only when not streaming) */}
                            {!isStreaming && (
                              <>
                                {hasDetectedTours && (
                                  <div className="mt-3 mb-2">
                                    <TourSlider tours={messageTours} onHitClick={handleCloseDropdown} />
                                  </div>
                                )}
                                {hasDetectedDestinations && (
                                  <div className="mt-3 mb-2">
                                    <DestinationSlider destinations={messageDestinations} />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                    {isGenerating && (
                      <div className="flex justify-start">
                        <div className="bg-gray-50 rounded-2xl rounded-bs-sm px-4 py-3 border border-gray-200">
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : query ? (
                  hasLocalSearchResults ? (
                    <div>
                      <TourSearchResults tours={searchResults.tours} onHitClick={handleCloseDropdown} />
                      <DestinationSearchResults destinations={searchResults.destinations} onHitClick={handleCloseDropdown} />
                      <CategorySearchResults categories={searchResults.categories} onHitClick={handleCloseDropdown} />
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/90 via-white to-purple-50/80 p-5 text-center shadow-sm">
                        <Compass className="mx-auto mb-3 h-8 w-8 text-blue-500" />
                        <p className="text-sm font-bold text-gray-900">{copy.noTenantResultsTitle}</p>
                        <p className="mt-2 text-xs leading-relaxed text-gray-500">
                          {copy.noTenantResultsBody(destination.name)}
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-4 h-4 text-blue-500 fill-current" />
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {copy.trendingTours}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {trendingSearches.map((trend) => (
                        <button
                          key={trend}
                          onClick={() => setQuery(trend)}
                          className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-full text-xs font-medium text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 hover:text-blue-700 hover:shadow-md transition-all duration-200 hover:scale-105"
                        >
                          {trend}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const BackgroundSlideshow = ({ 
  slides = [], 
  delay = 6000, 
  fadeMs = 900,
  autoplay = true 
}: { 
  slides?: Array<{src: string, alt: string, title?: string}>,
  delay?: number, 
  fadeMs?: number,
  autoplay?: boolean 
}) => {
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    slides.forEach(s => {
      const img = new window.Image();
      img.src = s.src;
    });
  }, [slides]);

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    
    const next = () => setIndex((i) => (i + 1) % slides.length);
    timeoutRef.current = window.setTimeout(next, delay);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [index, slides.length, delay, autoplay]);

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900">
      {slides.map((s, i) => {
        const visible = i === index;
        return (
          <div
            key={`${s.src}-${i}`}
            aria-hidden={!visible}
            className="absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out"
            style={{
              opacity: visible ? 1 : 0,
              transitionDuration: `${fadeMs}ms`,
              transform: visible ? 'scale(1)' : 'scale(1.02)',
            }}
          >
            <BackgroundSlideImage src={s.src} alt={s.alt} title={s.title} />
          </div>
        );
      })}
    </div>
  );
};

const BackgroundSlideImage = ({ src, alt, title }: { src: string; alt: string; title?: string }) => {
  const [resolvedSrc, setResolvedSrc] = useState(DESTINATION_HERO_FALLBACK_IMAGE);

  useEffect(() => {
    const candidateSrc = src || DESTINATION_HERO_FALLBACK_IMAGE;
    if (candidateSrc === DESTINATION_HERO_FALLBACK_IMAGE) {
      setResolvedSrc(DESTINATION_HERO_FALLBACK_IMAGE);
      return;
    }

    let isMounted = true;
    const image = new window.Image();

    image.onload = () => {
      if (isMounted) {
        setResolvedSrc(candidateSrc);
      }
    };

    image.onerror = () => {
      if (isMounted) {
        setResolvedSrc(DESTINATION_HERO_FALLBACK_IMAGE);
      }
    };

    image.src = candidateSrc;

    return () => {
      isMounted = false;
    };
  }, [src]);

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      title={title}
      fill
      unoptimized
      sizes="100vw"
      className="object-cover"
      onError={() => {
        if (resolvedSrc !== DESTINATION_HERO_FALLBACK_IMAGE) {
          setResolvedSrc(DESTINATION_HERO_FALLBACK_IMAGE);
        }
      }}
    />
  );
};

const DestinationHeroSection = ({
  tenantId,
  destination,
  tourCount,
  destinationTours,
  relatedDestinations,
  allCategories,
}: {
  tenantId?: string;
  destination: Destination;
  tourCount: number;
  destinationTours: Tour[];
  relatedDestinations: Destination[];
  allCategories: Category[];
}) => {
  const { rtl, copy } = useDestinationPageLocale();
  const heroImages = Array.from(new Set([destination.image, ...(destination.images || [])].filter(Boolean)));
  const slides = heroImages.length > 0
    ? heroImages.map((src, index) => {
        const metadata = imageMetadataFor(src, destination.imageMetadata, `${destination.name} ${index + 1}`);
        return { src, alt: metadata.alt, title: metadata.title };
      })
    : [{ src: DESTINATION_HERO_FALLBACK_IMAGE, alt: destination.name, title: destination.name }];

  const searchSuggestions = [
    copy.exploreDestination(destination.name),
    copy.thingsToDoIn(destination.name),
    copy.bestToursIn(destination.name),
  ];

  const currentSuggestion = useSlidingText(searchSuggestions, 3000);
  const breadcrumbs = buildContentBreadcrumbs({
    currentTitle: destination.name,
    breadcrumbLabel: destination.breadcrumbLabel,
    parentPage: destination.parentPage,
    rootLabel: copy.destinationsRoot,
    rootHref: '/destinations',
    homeLabel: copy.home,
  });

  // Phones and tablets: the hero is sized by its content so the copy and the
  // trip search sit under the header instead of floating in a fixed 70vh
  // picture. The full-height hero is a large-screen treatment only.
  return (
    <section data-destination-hero className="relative w-full lg:h-screen lg:max-h-[900px]">
      {/* Background */}
      <BackgroundSlideshow slides={slides} delay={6000} fadeMs={900} autoplay={true} />

      {/* Content */}
      <div className="relative z-20 h-full flex items-center justify-center text-white px-4 sm:px-6 lg:px-8 pt-24 pb-8 sm:pt-28 sm:pb-10 lg:py-0" dir={rtl ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-7xl mx-auto text-center md:text-start">
          <div className="mb-5 flex justify-center md:justify-start">
            <ContentBreadcrumbs items={breadcrumbs} tone="dark" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold uppercase leading-tight tracking-wide mb-3 sm:mb-4 [overflow-wrap:anywhere]">
            {copy.discover}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              {destination.name}
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 max-w-2xl mx-auto md:mx-0 px-4 sm:px-0">
            {destination.description}
          </p>

          <HeroSearchBar
            suggestion={currentSuggestion}
            tenantId={tenantId}
            destination={destination}
            destinationTours={destinationTours}
            relatedDestinations={relatedDestinations}
            allCategories={allCategories}
          />

          <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-white/90 text-xs sm:text-sm px-4 sm:px-0">
            <span className="flex items-center gap-1.5 sm:gap-2">
              <Tag size={14} className="sm:w-4 sm:h-4" />
              <span className="font-semibold">{copy.toursCount(tourCount)}</span>
            </span>
            {/* A fixed rating and a fixed traveller count used to sit here on
                every destination; no data backs either figure, so they are gone. */}
          </div>
        </div>
      </div>
    </section>
  );
};

const DestinationGallerySection = ({ destination }: { destination: Destination }) => {
  const { copy } = useDestinationPageLocale();
  const images = Array.from(new Set([destination.image, ...(destination.images || [])].filter(Boolean)));
  if (images.length <= 1) return null;
  return <section className="bg-white py-12"><div className="container mx-auto max-w-6xl px-4"><h2 className="mb-6 text-3xl font-extrabold text-slate-900">{copy.galleryTitle}</h2><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{images.map((src, index) => { const seo = imageMetadataFor(src, destination.imageMetadata, `${destination.name} ${index + 1}`); return <div key={`${src}-${index}`} className={`relative overflow-hidden rounded-2xl ${index === 0 ? 'col-span-2 row-span-2 min-h-72' : 'min-h-36'}`}><Image src={src} alt={seo.alt} title={seo.title} fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" /></div>; })}</div></div></section>;
};

const DestinationPracticalSection = ({ destination }: { destination: Destination }) => {
  const { copy } = useDestinationPageLocale();
  const details = [destination.climate && [copy.practicalClimate, destination.climate], destination.visaRequirements && [copy.practicalVisa, destination.visaRequirements], destination.languagesSpoken?.length && [copy.practicalLanguages, destination.languagesSpoken.join(', ')], destination.emergencyNumber && [copy.practicalEmergency, destination.emergencyNumber], destination.averageTemperature?.summer && [copy.practicalSummer, destination.averageTemperature.summer], destination.averageTemperature?.winter && [copy.practicalWinter, destination.averageTemperature.winter]].filter(Boolean) as Array<[string, string]>;
  if (details.length === 0 && !destination.thingsToDo?.length && !destination.localCustoms?.length && !destination.weatherWarnings?.length) return null;
  return <section className="bg-slate-50 py-12 sm:py-20"><div className="container mx-auto max-w-6xl px-4"><h2 className="mb-6 text-3xl font-extrabold text-slate-900">{copy.practicalTitle}</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{details.map(([title, value]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{value}</p></article>)}</div></div></section>;
};

// --- Card Components ---
const Top10Card = ({ tour, index, onAddToCartClick }: { tour: Tour, index: number, onAddToCartClick: (tour: Tour) => void }) => {
  const { rtl, copy } = useDestinationPageLocale();
  const ForwardArrow = rtl ? ArrowLeft : ArrowRight;
  const { formatPrice } = useSettings();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCartClick(tour);
  };

  return (
    <Link href={`/${tour.slug}`} className="min-w-0 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 p-3 sm:p-4 bg-white hover:bg-slate-50 transition-colors duration-200 group rounded-lg border border-transparent hover:border-slate-200 hover:shadow-lg">
      <span className="hidden sm:block text-3xl md:text-4xl font-extrabold text-slate-200 group-hover:text-red-500 transition-colors duration-200">{index + 1}.</span>
      <div className="relative w-full sm:w-20 md:w-24 h-32 sm:h-20 md:h-24 flex-shrink-0 rounded-md overflow-hidden">
        <Image src={tour.image} alt={tour.title} fill className="object-cover" />
        <span className="sm:hidden absolute top-2 start-2 bg-red-500 text-white font-bold text-lg px-3 py-1 rounded-full">{index + 1}</span>
      </div>
      <div className="flex-1 w-full min-w-0">
        <h3 className="text-base sm:text-lg font-semibold text-slate-800 group-hover:text-red-600 transition-colors duration-200 line-clamp-2 [overflow-wrap:anywhere]">{tour.title}</h3>
        <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-slate-500">
          <Clock size={14} />
          <span>{tour.duration}</span>
          <Star size={14} className="ms-2 text-yellow-500 fill-current" />
          <span>{tour.rating}</span>
        </div>
        <div className="mt-2 text-sm flex items-center gap-2">
          {tour.originalPrice && tour.originalPrice > tour.discountPrice && <span className="text-slate-500 line-through text-xs sm:text-sm">{formatPrice(tour.originalPrice)}</span>}
          <span className="text-red-600 font-bold text-lg sm:text-xl">{formatPrice(tour.discountPrice)}</span>
        </div>
      </div>
      <div className="flex sm:flex-col flex-shrink-0 items-center gap-2 ms-auto sm:ms-0">
        <button
          onClick={handleAddToCart}
          aria-label={copy.bookNow}
          className="p-2 sm:p-2.5 rounded-full text-white bg-red-600 hover:bg-red-700 transition-all duration-300 ease-in-out"
        >
          <ShoppingCart size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
        <ForwardArrow className="text-slate-400 group-hover:text-red-500 transition-colors duration-200 w-5 h-5" />
      </div>
    </Link>
  );
};

const InterestCard = ({ category, tourCount }: { category: Category, tourCount: number }) => {
  const { copy } = useDestinationPageLocale();
  return (
    <Link href={contentPath('category', category.slug, category.urlType, null, category.parentPage?.slug)} className="flex flex-col items-center p-4 sm:p-6 bg-white shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-lg">
      <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{category.icon}</div>
      <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase text-center">{category.name}</h3>
      <p className="text-xs sm:text-sm text-slate-500">{copy.toursCount(tourCount)}</p>
    </Link>
  );
};

const CombiDealCard = ({ tour, onAddToCartClick }: { tour: Tour, onAddToCartClick: (tour: Tour) => void }) => {
  const { copy } = useDestinationPageLocale();
  const { formatPrice } = useSettings();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCartClick(tour);
  };

  return (
    <Link href={`/${tour.slug}`} className="w-72 sm:w-80 flex-shrink-0 bg-white shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 rounded-lg group">
      <div className="relative">
        <Image src={tour.image} alt={tour.title} width={320} height={180} className="w-full h-36 sm:h-40 object-cover" />
        <button
          onClick={handleAddToCart}
          aria-label={copy.bookNow}
          className="absolute bottom-3 end-3 sm:bottom-4 sm:end-4 p-2 sm:p-2.5 rounded-full text-white bg-red-600 hover:bg-red-700 transition-all duration-300 ease-in-out transform group-hover:scale-110"
        >
          <ShoppingCart size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 line-clamp-2">{tour.title}</h3>
        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500 my-2">
          <span className="flex items-center gap-1">
            <Clock size={14} />{tour.duration}
          </span>
          <span className="flex items-center gap-1">
            <Star size={14} fill="currentColor" className="text-yellow-500" />{tour.rating}
          </span>
          {(tour.bookings || 0) > 0 && <span>{copy.bookings(tour.bookings || 0)}</span>}
        </div>
        <div className="flex items-end justify-end mt-3 sm:mt-4">
          {tour.originalPrice && tour.originalPrice > tour.discountPrice && <span className="text-slate-500 line-through me-2 text-sm">{formatPrice(tour.originalPrice)}</span>}
          <span className="text-lg sm:text-xl font-extrabold text-red-600">{formatPrice(tour.discountPrice)}</span>
        </div>
      </div>
    </Link>
  );
};

// --- Stats Banner ---
const StatsSection = ({ destinationTours }: { destinationTours: Tour[] }) => {
  const { copy } = useDestinationPageLocale();
  const stats = [
    { value: String(destinationTours.length), label: copy.statsToursAvailable, icon: <Calendar /> },
  ];

  return (
    <section className="bg-slate-900 py-12 sm:py-16">
      <div className="container mx-auto px-4">
        {/* Only the trip count is real here: the happy-traveller, rating and
            support tiles were fixed numbers shown on every destination. */}
        <div className="mx-auto max-w-sm text-center">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-2 sm:mb-3 text-red-500">
                {React.cloneElement(stat.icon, { size: 24, className: 'sm:w-8 sm:h-8' })}
              </div>
              <div className="text-2xl sm:text-4xl font-extrabold text-white mb-1 sm:mb-2">{stat.value}</div>
              <div className="text-sm sm:text-base text-slate-300">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Travel Tips Component ---
const TravelTipsSection = ({ destination }: { destination: Destination }) => {
  const { copy } = useDestinationPageLocale();
  const defaultTips = [
    {
      icon: <Sun className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: copy.travelTipBestTime,
      content: destination.bestTimeToVisit || copy.travelTipDefaultBestTime
    },
    {
      icon: <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: copy.travelTipCurrency,
      content: destination.currency || copy.travelTipDefaultCurrency
    },
    {
      icon: <Languages className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: copy.travelTipLanguages,
      content: destination.languagesSpoken?.join(', ') || copy.travelTipDefaultLanguages
    },
    {
      icon: <Phone className="w-5 h-5 sm:w-6 sm:h-6" />,
      title: copy.travelTipEmergency,
      content: destination.emergencyNumber || copy.travelTipDefaultEmergency
    }
  ];
  const tips = destination.travelTips && destination.travelTips.length > 0
    ? destination.travelTips.map((tip) => ({
        icon: <Compass className="w-5 h-5 sm:w-6 sm:h-6" />,
        title: tip.title,
        content: tip.content,
      }))
    : defaultTips;

  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-50 py-12 sm:py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-3 sm:mb-4">{copy.travelTipsTitle}</h2>
          <p className="text-base sm:text-lg text-slate-600">{copy.travelTipsSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {tips.map((tip, index) => (
            <div key={index} className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3 sm:mb-4">
                {tip.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-2 text-sm sm:text-base">{tip.title}</h3>
              <p className="text-slate-600 text-xs sm:text-sm">{tip.content}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- ABOUT US SECTION ---
const AboutUsSection = ({ destination }: { destination: Destination }) => {
  const { rtl, copy } = useDestinationPageLocale();
  const MoreArrow = rtl ? ArrowLeft : ArrowRight;
  return (
    <section className="bg-white py-12 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
          <div className="col-span-1">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-3 sm:mb-4">
              {copy.aboutTitle(destination.name)}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mb-4 sm:mb-6">
              {destination.longDescription || copy.aboutFallback(destination.name)}
            </p>
            <Link href="/about" className="inline-flex items-center gap-2 text-red-600 font-bold hover:text-red-700 transition-colors text-sm sm:text-base">
              <span>{copy.learnMoreAboutUs}</span>
              <MoreArrow size={18} className="sm:w-5 sm:h-5" />
            </Link>
          </div>
          <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-slate-50 p-6 sm:p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <Award className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 mb-3 sm:mb-4" />
              <h3 className="font-bold text-lg sm:text-xl text-slate-900">{copy.aboutExpertGuidesTitle}</h3>
              <p className="mt-2 text-slate-600 text-sm sm:text-base">
                {copy.aboutExpertGuidesBody(destination.name)}
              </p>
            </div>
            <div className="bg-slate-50 p-6 sm:p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <Star className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 mb-3 sm:mb-4" />
              <h3 className="font-bold text-lg sm:text-xl text-slate-900">{copy.aboutQualityTitle}</h3>
              <p className="mt-2 text-slate-600 text-sm sm:text-base">
                {copy.aboutQualityBody(destination.name)}
              </p>
            </div>
            <div className="bg-slate-50 p-6 sm:p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 mb-3 sm:mb-4" />
              <h3 className="font-bold text-lg sm:text-xl text-slate-900">{copy.aboutSafeTitle}</h3>
              <p className="mt-2 text-slate-600 text-sm sm:text-base">
                {copy.aboutSafeBody}
              </p>
            </div>
            <div className="bg-slate-50 p-6 sm:p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 mb-3 sm:mb-4" />
              <h3 className="font-bold text-lg sm:text-xl text-slate-900">{copy.aboutPriceTitle}</h3>
              <p className="mt-2 text-slate-600 text-sm sm:text-base">
                {copy.aboutPriceBody(destination.name)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- FAQ SECTION ---
const FaqItem = ({ item }: { item: { question: string; answer: string } }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-200 py-4 sm:py-6 group">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-start hover:text-red-600 transition-colors"
        aria-expanded={isOpen}
      >
        <h3 className="text-base sm:text-lg font-semibold text-slate-800 group-hover:text-red-600 transition-colors pe-4">
          {item.question}
        </h3>
        {isOpen ? (
          <Minus className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 transition-transform duration-300 flex-shrink-0" />
        ) : (
          <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 transition-transform duration-300 flex-shrink-0" />
        )}
      </button>
      <div
        className={`grid transition-all duration-500 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100 pt-3 sm:pt-4' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-slate-600 text-sm sm:text-base">{item.answer}</p>
        </div>
      </div>
    </div>
  );
};

const FAQSection = ({ destination }: { destination: Destination }) => {
  const { copy } = useDestinationPageLocale();
  const destinationName = destination.name;
  const fallbackFaqData = [
    {
      question: copy.faqBestTimeQ(destinationName),
      answer: copy.faqBestTimeA(destinationName)
    },
    {
      question: copy.faqDaysQ(destinationName),
      answer: copy.faqDaysA(destinationName)
    },
    {
      question: copy.faqSafeQ(destinationName),
      answer: copy.faqSafeA(destinationName)
    },
    {
      question: copy.faqPackQ(destinationName),
      answer: copy.faqPackA
    },
    {
      question: copy.faqGuideQ(destinationName),
      answer: copy.faqGuideA
    },
    {
      question: copy.faqDressQ,
      answer: copy.faqDressA
    },
    {
      question: copy.faqLastMinuteQ,
      answer: copy.faqLastMinuteA
    },
    {
      question: copy.faqCancelQ,
      answer: copy.faqCancelA
    },
    {
      question: copy.faqMealsQ,
      answer: copy.faqMealsA
    },
    {
      question: copy.faqMeetingQ,
      answer: copy.faqMeetingA
    }
  ];
  const faqData = destination.faqs && destination.faqs.length > 0 ? destination.faqs : fallbackFaqData;

  return (
    <section className="bg-white py-12 sm:py-20 font-sans">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            {copy.faqTitle}
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-slate-600">
            {copy.faqSubtitle(destinationName)}
          </p>
        </div>
        <div className="space-y-2 sm:space-y-4">
          {faqData.map((item, index) => (
            <FaqItem key={index} item={item} />
          ))}
        </div>
        <div className="text-center mt-8 sm:mt-12">
          <Link
            href="/faqs"
            className="inline-flex justify-center items-center h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base font-bold text-red-600 border-2 border-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 ease-in-out rounded-full"
            role="button"
            aria-label={copy.faqViewAllAria}
          >
            {copy.faqViewAll}
          </Link>
        </div>
      </div>
    </section>
  );
};

// --- Reviews Component ---
const ReviewsSection = ({ reviews, destinationName }: { reviews: Review[], destinationName: string }) => {
  const { copy } = useDestinationPageLocale();
  if (!reviews || reviews.length === 0) return null;
  const averageRating = reviews.reduce((total, review) => total + (Number(review.rating) || 0), 0) / reviews.length;
  const roundedRating = Math.round(averageRating);

  return (
    <section className="bg-slate-50 py-12 sm:py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-3 sm:mb-4">
            {copy.reviewsTitle(destinationName)}
          </h2>
          <div className="flex items-center justify-center gap-2 text-yellow-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-4 h-4 sm:w-6 sm:h-6 ${i < roundedRating ? 'fill-current' : 'text-slate-300'}`} />
            ))}
            <span className="ms-2 text-slate-600 font-bold text-sm sm:text-base">{copy.reviewsSummary(averageRating, reviews.length)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {reviews.slice(0, 6).map((review) => {
            const reviewText = `${review.title || ''} ${review.comment || ''}`.trim();
            const reviewIsRTL = hasArabicChars(reviewText);
            return (
            <div key={review._id} className={`bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 ${reviewIsRTL ? 'text-right' : 'text-left'}`} dir={reviewIsRTL ? 'rtl' : 'ltr'}>
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3 h-3 sm:w-4 sm:h-4 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-slate-300'}`}
                  />
                ))}
              </div>
              {review.title && <h4 className="font-bold text-slate-900 mb-2 text-sm sm:text-base">{review.title}</h4>}
              <p className="text-slate-700 mb-3 sm:mb-4 line-clamp-4 text-sm sm:text-base">{review.comment}</p>
              <div className="flex items-center gap-3 pt-3 sm:pt-4 border-t border-slate-100">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm sm:text-base">
                  {review.userName?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm sm:text-base">{review.userName}</p>
                  {review.verified && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> {copy.verifiedTraveler}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>

        <div className="text-center mt-8 sm:mt-12">
          <a
            href="#reviews"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base"
          >
            {copy.readAllReviews}
            <MessageCircle size={18} className="sm:w-5 sm:h-5" />
          </a>
        </div>
      </div>
    </section>
  );
};

// --- Related Destinations ---
const RelatedDestinationsSection = ({ destinations }: { destinations: Destination[] }) => {
  const { copy } = useDestinationPageLocale();
  if (!destinations || destinations.length === 0) return null;

  return (
    <section className="bg-white py-12 sm:py-20">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-3 sm:mb-4">
            {copy.relatedDestinationsTitle}
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            {copy.relatedDestinationsSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {destinations.slice(0, 4).map((dest) => (
            <a 
              key={dest._id} 
              href={contentPath('destination', dest.slug, dest.urlType, null, dest.parentPage?.slug)}
              className="group block bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              <div className="relative h-40 sm:h-48">
                <Image
                  src={dest.image || '/placeholder.jpg'}
                  alt={dest.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 sm:bottom-4 start-3 sm:start-4 end-3 sm:end-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1">{dest.name}</h3>
                  {(Number(dest.tourCount) || 0) > 0 && (
                    <p className="text-white/90 text-xs sm:text-sm flex items-center gap-1">
                      <MapPin size={14} />
                      {copy.toursAvailable(Number(dest.tourCount))}
                    </p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Newsletter CTA ---
const NewsletterSection = ({ destinationName }: { destinationName: string }) => {
  const { copy } = useDestinationPageLocale();
  return (
    <section className="bg-gradient-to-r from-red-600 to-red-700 py-12 sm:py-20">
      <div className="container mx-auto px-4 max-w-4xl text-center text-white">
        <h2 className="text-2xl sm:text-4xl font-extrabold mb-3 sm:mb-4">
          {copy.newsletterTitle(destinationName)}
        </h2>
        <p className="text-base sm:text-xl mb-6 sm:mb-8 opacity-90">
          {copy.newsletterSubtitle}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-xl mx-auto">
          <input
            type="email"
            placeholder={copy.newsletterEmailPlaceholder}
            className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-full text-slate-900 outline-none text-sm sm:text-base"
          />
          <button className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-red-600 font-bold rounded-full hover:bg-slate-100 transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base whitespace-nowrap">
            {copy.newsletterSubscribe}
          </button>
        </div>

        <p className="mt-3 sm:mt-4 text-xs sm:text-sm opacity-75">
          {copy.newsletterFootnote}
        </p>
      </div>
    </section>
  );
};

// Below lg the page main is a flex column: the hero and then the first trip list
// (Best deals, or the Top 10 when a destination has no deals) carry this class,
// so on a phone the trips follow the hero instead of the stats strip and the
// gallery. Equal order keeps the hero ahead of the trips (source order breaks
// the tie). Large screens keep the authored section order.
const PHONE_FIRST = 'order-first lg:order-none';

// Top 10 rows are a horizontal card (rank, photo, text, cart button). Two
// columns only from lg: at 768 a half-width track left the text no room and the
// cart buttons stuck out past the edge (the page scrolled sideways).
const TOP_TOURS_GRID = 'grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 max-w-6xl mx-auto';

// --- MAIN COMPONENT ---
export default function DestinationPageClient({
  tenantId = 'default',
  destination,
  destinationTours,
  allCategories,
  reviews = [],
  relatedDestinations = []
}: DestinationPageClientProps) {
  const { rtl, copy } = useDestinationPageLocale();
  const PrevArrow = rtl ? ChevronRight : ChevronLeft;
  const NextArrow = rtl ? ChevronLeft : ChevronRight;
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isBookingSidebarOpen, setBookingSidebarOpen] = useState(false);
  const combiScrollContainer = useRef<HTMLDivElement | null>(null);

  const scroll = (container: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (container.current) {
      const baseAmount = direction === 'left' ? -344 : 344;
      const scrollAmount = rtl ? -baseAmount : baseAmount;
      container.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleAddToCartClick = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingSidebarOpen(true);
  };

  const closeSidebar = () => {
    setBookingSidebarOpen(false);
    setTimeout(() => setSelectedTour(null), 300);
  };

  const { bestDeals: featuredTours, topTours: top10Tours } = curateDestinationTours(
    destinationTours,
    destination.bestDealTourIds,
    destination.topTourIds,
  );
  const destinationCategories = getDestinationCategories(destinationTours, allCategories).map(category => ({
    ...category,
    tourCount: destinationTours.filter(tour => 
      typeof tour.category === 'object' ? tour.category._id === category._id : tour.category === category._id
    ).length
  })).filter(category => category.tourCount > 0);

  return (
    <>
      <Header />
      {/* Phones: the first trip list follows the hero (flex order); large screens keep the authored section order. */}
      <main className="flex min-h-screen flex-col lg:block bg-white" dir={rtl ? 'rtl' : 'ltr'}>
        <div className={PHONE_FIRST}>
          <DestinationHeroSection
            tenantId={tenantId}
            destination={destination}
            tourCount={destinationTours.length}
            destinationTours={destinationTours}
            relatedDestinations={relatedDestinations}
            allCategories={allCategories}
          />
        </div>

        <StatsSection destinationTours={destinationTours} />
        
        <section className="bg-slate-50 py-8 sm:py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-1 sm:mb-2 text-sm sm:text-base">{copy.infoBestTime}</h3>
                <p className="text-slate-600 text-xs sm:text-base">{destination.bestTimeToVisit || copy.infoYearRound}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-1 sm:mb-2 text-sm sm:text-base">{copy.infoCurrency}</h3>
                <p className="text-slate-600 text-xs sm:text-base">{destination.currency || 'EUR'}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-1 sm:mb-2 text-sm sm:text-base">{copy.infoTimeZone}</h3>
                <p className="text-slate-600 text-xs sm:text-base">{destination.timezone || copy.infoTimezoneFallback}</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-800 mb-1 sm:mb-2 text-sm sm:text-base">{copy.infoAvailableTours}</h3>
                <p className="text-slate-600 text-xs sm:text-base">{copy.infoAvailableExperiences(destinationTours.length)}</p>
              </div>
            </div>
          </div>
        </section>

        <DestinationGallerySection destination={destination} />
        
        {featuredTours.length > 0 && (
          <section data-destination-best-deals className={`py-12 sm:py-20 bg-white overflow-hidden ${PHONE_FIRST}`}>
            <div className="container mx-auto">
                <div className="px-4 mb-6 sm:mb-10">
                    <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">{copy.featuredSectionTitle(destination.name)}</h2>
                    <p className="text-base sm:text-lg text-slate-600 mt-2">{copy.featuredSectionSubtitle}</p>
                </div>
                <div className="relative">
                    <div ref={combiScrollContainer} className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scroll-smooth px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {featuredTours.map(tour => <CombiDealCard key={tour._id} tour={tour} onAddToCartClick={handleAddToCartClick} />)}
                    </div>
                    <button 
                        onClick={() => scroll(combiScrollContainer, 'left')} 
                        aria-label={copy.scrollLeft}
                        className="hidden sm:block absolute top-1/2 -translate-y-1/2 start-0 z-10 bg-white/80 p-2 sm:p-3 rounded-full shadow-lg hover:bg-white transition-all duration-300 backdrop-blur-sm ms-2"
                    >
                        <PrevArrow size={20} className="sm:w-6 sm:h-6 text-slate-700"/>
                    </button>
                    <button 
                        onClick={() => scroll(combiScrollContainer, 'right')} 
                        aria-label={copy.scrollRight}
                        className="hidden sm:block absolute top-1/2 -translate-y-1/2 end-0 z-10 bg-white/80 p-2 sm:p-3 rounded-full shadow-lg hover:bg-white transition-all duration-300 backdrop-blur-sm me-2"
                    >
                        <NextArrow size={20} className="sm:w-6 sm:h-6 text-slate-700"/>
                    </button>
                </div>
            </div>
          </section>
        )}
        
        {top10Tours.length > 0 && (
          <section data-destination-top-tours className={`py-12 sm:py-20 bg-slate-50 ${featuredTours.length === 0 ? PHONE_FIRST : ''}`}>
            <div className="container mx-auto px-4">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 text-center mb-3 sm:mb-4">
                {copy.topToursTitle(destination.name)}
              </h2>
              <p className="text-center text-base sm:text-lg text-slate-600 mb-8 sm:mb-12">
                {copy.topToursSubtitle}
              </p>
              <div data-top-tours-grid className={TOP_TOURS_GRID}>
                {top10Tours.map((tour, index) => (
                  <Top10Card key={tour._id} tour={tour} index={index} onAddToCartClick={handleAddToCartClick} />
                ))}
              </div>
            </div>
          </section>
        )}

        {destinationCategories.length > 0 && (
          <section className="bg-white py-12 sm:py-20">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-4 sm:mb-6">
                {copy.interestsTitle(destination.name)}
              </h2>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8 sm:mb-12">
                {copy.interestsSubtitle}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {destinationCategories.map((category) => (
                  <InterestCard key={category._id} category={category} tourCount={category.tourCount} />
                ))}
              </div>
            </div>
          </section>
        )}

        <AboutUsSection destination={destination} />

        {destination.highlights && destination.highlights.length > 0 && (
          <section className="bg-slate-50 py-12 sm:py-20">
            <div className="container mx-auto px-4 max-w-4xl">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 text-center mb-6 sm:mb-10">{copy.whyVisitTitle(destination.name)}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                {destination.highlights.map((highlight, index) => (
                  <div key={index} className="flex items-start gap-3 sm:gap-4">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mt-1 flex-shrink-0" />
                    <p className="text-base sm:text-lg text-slate-600">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <DestinationPracticalSection destination={destination} />

        <TravelTipsSection destination={destination} />

        <ReviewsSection reviews={reviews} destinationName={destination.name} />

        <FAQSection destination={destination} />

        <RelatedDestinationsSection destinations={relatedDestinations} />

        <NewsletterSection destinationName={destination.name} />
        
      </main>
      <Footer />

      {selectedTour && (
        <BookingSidebar
          isOpen={isBookingSidebarOpen}
          onClose={closeSidebar}
          tour={selectedTour as any}
        />
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slide-from-top {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes text-slide-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Slow pulse animation */
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.2;
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        .animate-slide-from-top { animation: slide-from-top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .animate-text-slide-in { animation: text-slide-in 0.5s ease-out forwards; }

        .text-shadow { text-shadow: 1px 1px 4px rgb(0 0 0 / 0.5); }
        .text-shadow-lg { text-shadow: 2px 2px 8px rgb(0 0 0 / 0.6); }

        img {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        /* Custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #d1d5db, #9ca3af);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #9ca3af, #6b7280);
        }

        [style*="scrollbarWidth"]::-webkit-scrollbar {
          display: none;
        }

        /* Hide default Algolia styling */
        .ais-InstantSearch {
          font-family: inherit;
        }

        .ais-SearchBox {
          display: none;
        }

        .ais-Hits-list {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .ais-Hits-item {
          margin: 0;
          padding: 0;
          border: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-text-slide-in,
          .animate-fade-in,
          .animate-slide-from-top,
          .animate-pulse-slow {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
