#!/usr/bin/env npx tsx
/**
 * Complete Speedboat Domain Seed Script
 * 
 * Seeds the main database with all data for hurghada-speedboat tenant:
 * - Tenant configuration
 * - Destinations
 * - Categories  
 * - Tours (with full details)
 * - Hero Settings
 * 
 * Run with: pnpm seed:speedboat
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const TENANT_ID = 'hurghada-speedboat';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

// ============================================
// TENANT CONFIGURATION
// ============================================
const tenantConfig = {
  tenantId: TENANT_ID,
  name: 'Hurghada Speedboat Adventures',
  slug: 'hurghada-speedboat',
  domain: 'hurghadaspeedboat.com',
  domains: ['hurghadaspeedboat.com', 'www.hurghadaspeedboat.com', 'localhost:3004'],
  branding: {
    logo: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200&q=80',
    logoAlt: 'Hurghada Speedboat Adventures',
    favicon: '/favicon.ico',
    primaryColor: '#00CED1',
    secondaryColor: '#001F3F',
    accentColor: '#FFD700',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    fontFamily: 'Inter',
    borderRadius: '12px',
  },
  seo: {
    defaultTitle: 'Hurghada Speedboat Adventures - Red Sea Thrills',
    titleSuffix: ' | Hurghada Speedboat',
    defaultDescription: 'Experience thrilling speedboat adventures in Hurghada. Visit Giftun Island, Orange Bay, snorkeling trips, dolphin watching, and sunset cruises on the Red Sea.',
    defaultKeywords: ['hurghada speedboat', 'red sea tours', 'giftun island', 'orange bay', 'snorkeling hurghada', 'dolphin watching', 'boat trips egypt'],
    ogImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80',
  },
  contact: {
    email: 'info@hurghadaspeedboat.com',
    phone: '+20 100 123 4567',
    whatsapp: '+201001234567',
    address: 'Hurghada Marina, Red Sea, Egypt',
  },
  socialLinks: {
    facebook: 'https://facebook.com/hurghadaspeedboat',
    instagram: 'https://instagram.com/hurghadaspeedboat',
    youtube: 'https://youtube.com/@hurghadaspeedboat',
    tiktok: 'https://tiktok.com/@hurghadaspeedboat',
  },
  features: {
    enableBlog: false,
    enableReviews: true,
    enableWishlist: true,
    enableAISearch: true,
    enableIntercom: false,
    enableMultiCurrency: true,
    enableMultiLanguage: true,
    enableLiveChat: true,
    enableNewsletter: true,
    enablePromoBar: true,
    enableHotelPickup: true,
    enableGiftCards: false,
  },
  payments: {
    currency: 'USD',
    currencySymbol: '$',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'EGP'],
    supportedPaymentMethods: ['card', 'paypal'],
  },
  homepage: {
    heroType: 'slider',
    showDestinations: true,
    showCategories: true,
    showFeaturedTours: true,
    showPopularInterests: true,
    showDayTrips: true,
    showReviews: true,
    showFAQ: true,
    showAboutUs: true,
    showPromoSection: true,
  },
  isActive: true,
  isDefault: false,
};

// ============================================
// DESTINATIONS
// ============================================
const destinations = [
  {
    tenantId: TENANT_ID,
    name: 'Hurghada Marina',
    slug: 'hurghada-marina',
    country: 'Egypt',
    description: 'The heart of Red Sea adventures. Crystal clear waters, vibrant coral reefs, and endless marine life await.',
    longDescription: 'Hurghada is Egypt\'s premier Red Sea resort destination, offering world-class diving, snorkeling, and water sports. With year-round sunshine and warm waters, it\'s the perfect base for speedboat adventures to nearby islands and coral reefs.',
    image: 'https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=800&q=80',
    images: [
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/hurghada-1.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/hurghada-2.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/hurghada-3.jpg',
    ],
    coordinates: { lat: 27.2579, lng: 33.8116 },
    highlights: [
      'Crystal clear Red Sea waters',
      'World-class coral reefs',
      'Year-round sunshine',
      'Gateway to Giftun Islands',
      'Vibrant marine life',
    ],
    thingsToDo: [
      'Speedboat tours to islands',
      'Snorkeling at coral reefs',
      'Dolphin watching trips',
      'Sunset cruises',
      'Water sports activities',
    ],
    bestTimeToVisit: 'Year-round, best March-May & September-November',
    currency: 'EGP',
    timezone: 'Africa/Cairo',
    languagesSpoken: ['Arabic', 'English', 'German', 'Russian'],
    featured: true,
    isPublished: true,
    tourCount: 8,
    metaTitle: 'Hurghada Boat Tours & Water Activities',
    metaDescription: 'Discover Hurghada\'s best speedboat tours, snorkeling trips, and island adventures on the Red Sea.',
    keywords: ['hurghada', 'red sea', 'egypt', 'boat tours'],
  },
  {
    tenantId: TENANT_ID,
    name: 'Giftun Island',
    slug: 'giftun-island',
    country: 'Egypt',
    description: 'Paradise island with pristine beaches and spectacular snorkeling spots just off Hurghada coast.',
    longDescription: 'Giftun Island National Park is a protected marine reserve featuring stunning white sand beaches and some of the best snorkeling in the Red Sea. Home to colorful coral gardens and diverse marine life.',
    image: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80',
    images: [
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/giftun-1.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/giftun-2.jpg',
    ],
    coordinates: { lat: 27.2167, lng: 33.9333 },
    highlights: [
      'National Park protected area',
      'Pristine white sand beaches',
      'Incredible snorkeling',
      'Tropical fish & coral reefs',
      'Beach relaxation',
    ],
    thingsToDo: [
      'Snorkeling coral gardens',
      'Beach swimming',
      'Photography',
      'Wildlife spotting',
    ],
    bestTimeToVisit: 'April-October',
    featured: true,
    isPublished: true,
    tourCount: 4,
    metaTitle: 'Giftun Island Tours from Hurghada',
    metaDescription: 'Visit Giftun Island National Park - pristine beaches and amazing snorkeling.',
  },
  {
    tenantId: TENANT_ID,
    name: 'Orange Bay',
    slug: 'orange-bay',
    country: 'Egypt',
    description: 'Exclusive beach paradise with turquoise lagoons and premium facilities.',
    longDescription: 'Orange Bay is a stunning private beach island known for its shallow turquoise lagoon and pristine sandy beach. Perfect for families and those seeking a luxury beach experience with all amenities.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    coordinates: { lat: 27.1833, lng: 33.8833 },
    highlights: [
      'Shallow turquoise lagoon',
      'White sandy beaches',
      'Premium facilities',
      'Water sports available',
      'Restaurant & bars',
    ],
    bestTimeToVisit: 'Year-round',
    featured: true,
    isPublished: true,
    tourCount: 2,
  },
  {
    tenantId: TENANT_ID,
    name: 'Dolphin House',
    slug: 'dolphin-house',
    country: 'Egypt',
    description: 'Natural reef where wild dolphins come to play. Swim alongside these magnificent creatures.',
    longDescription: 'Dolphin House (Shaab El Erg) is a famous reef formation where pods of spinner dolphins rest during the day. This natural sanctuary offers incredible opportunities to swim with wild dolphins in their natural habitat.',
    image: 'https://images.unsplash.com/photo-1570481662006-a3a1374699e8?w=800&q=80',
    highlights: [
      'Wild dolphin encounters',
      'Spinner dolphins',
      'Natural reef habitat',
      'Snorkeling opportunities',
      'Ethical wildlife experience',
    ],
    featured: true,
    isPublished: true,
    tourCount: 2,
  },
];

// ============================================
// CATEGORIES
// ============================================
const categories = [
  {
    tenantId: TENANT_ID,
    name: 'Hurghada Speedboat Tours',
    slug: 'speedboat-tours-hurghada',
    description: 'High-speed adventures across the Red Sea. Experience the thrill of racing over crystal waters.',
    longDescription: 'Our speedboat tours offer the fastest and most exciting way to explore the Red Sea. Feel the adrenaline as you zip across the waves to reach stunning islands and snorkeling spots.',
    icon: '🚤',
    color: '#00CED1',
    heroImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    highlights: ['High-speed thrills', 'Quick island transfers', 'Small group experiences'],
    isPublished: true,
    featured: true,
    order: 1,
    tourCount: 4,
  },
  {
    tenantId: TENANT_ID,
    name: 'Red Sea Snorkeling',
    slug: 'snorkeling-tours-hurghada',
    description: 'Discover the underwater world of the Red Sea. Colorful coral reefs and tropical fish await.',
    longDescription: 'Explore some of the world\'s most spectacular coral reefs. Our snorkeling tours take you to the best spots where you can swim among colorful fish, sea turtles, and pristine corals.',
    icon: '🤿',
    color: '#20B2AA',
    heroImage: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800&q=80',
    highlights: ['Coral reef exploration', 'Marine life viewing', 'Equipment provided'],
    isPublished: true,
    featured: true,
    order: 2,
    tourCount: 5,
  },
  {
    tenantId: TENANT_ID,
    name: 'Hurghada Island Trips',
    slug: 'island-trips-hurghada',
    description: 'Visit paradise islands with white sand beaches and turquoise waters.',
    longDescription: 'Escape to stunning islands in the Red Sea. Spend your day on pristine beaches, swimming in crystal clear waters, and enjoying tropical paradise.',
    icon: '🏝️',
    color: '#FFD700',
    heroImage: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80',
    highlights: ['Beach relaxation', 'Swimming', 'Buffet lunch included'],
    isPublished: true,
    featured: true,
    order: 3,
    tourCount: 3,
  },
  {
    tenantId: TENANT_ID,
    name: 'Hurghada Dolphin Tours',
    slug: 'dolphin-watching-hurghada',
    description: 'Encounter wild dolphins in their natural habitat. Swim alongside these magical creatures.',
    longDescription: 'Experience the magic of swimming with wild dolphins at Dolphin House reef. Our ethical tours give you the chance to observe and swim with spinner dolphins in a responsible way.',
    icon: '🐬',
    color: '#4169E1',
    heroImage: 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=800&q=80',
    highlights: ['Wild dolphin encounters', 'Ethical tourism', 'Natural habitat'],
    isPublished: true,
    featured: true,
    order: 4,
    tourCount: 2,
  },
  {
    tenantId: TENANT_ID,
    name: 'Red Sea Sunset Cruises',
    slug: 'sunset-cruises-hurghada',
    description: 'Romantic sunset experiences on the Red Sea. Watch the sky transform over the water.',
    longDescription: 'End your day in paradise with a magical sunset cruise. Enjoy refreshments, music, and the spectacular colors of a Red Sea sunset.',
    icon: '🌅',
    color: '#FF6347',
    heroImage: 'https://images.unsplash.com/photo-1476673160081-cf065bc4cecb?w=800&q=80',
    highlights: ['Romantic atmosphere', 'Drinks included', 'Live entertainment'],
    isPublished: true,
    featured: true,
    order: 5,
    tourCount: 2,
  },
  {
    tenantId: TENANT_ID,
    name: 'Hurghada Private Charters',
    slug: 'private-charters-hurghada',
    description: 'Exclusive boat rentals for groups, families, and special occasions.',
    longDescription: 'Rent your own private speedboat or yacht for a personalized experience. Perfect for birthdays, proposals, family gatherings, or just wanting your own private adventure.',
    icon: '⛵',
    color: '#9370DB',
    heroImage: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&q=80',
    highlights: ['Fully customizable', 'Private experience', 'Special occasions'],
    isPublished: true,
    featured: true,
    order: 6,
    tourCount: 2,
  },
  {
    tenantId: TENANT_ID,
    name: 'Hurghada Water Sports',
    slug: 'water-sports-hurghada',
    description: 'Parasailing, jet ski, banana boat and more adrenaline-pumping activities.',
    longDescription: 'Get your adrenaline fix with our exciting water sports packages. From parasailing high above the sea to racing on jet skis, there\'s something for every thrill-seeker.',
    icon: '🏄',
    color: '#00FA9A',
    heroImage: 'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/watersports-category.jpg',
    highlights: ['Multiple activities', 'All skill levels', 'Safety equipment'],
    isPublished: true,
    featured: false,
    order: 7,
    tourCount: 3,
  },
];

// ============================================
// TOURS
// ============================================
const createTours = (destinationIds: Record<string, mongoose.Types.ObjectId>, categoryIds: Record<string, mongoose.Types.ObjectId>) => [
  // TOUR 1: Giftun Island Speedboat Trip
  {
    tenantId: TENANT_ID,
    title: 'Giftun Island Speedboat Adventure',
    slug: 'giftun-island-speedboat-adventure',
    destination: destinationIds['giftun-island'],
    category: [categoryIds['speedboat-tours-hurghada'], categoryIds['island-trips-hurghada'], categoryIds['snorkeling-tours-hurghada']],
    description: 'Speed across the Red Sea to stunning Giftun Island. Snorkel pristine coral reefs, relax on white sand beaches, and enjoy a delicious buffet lunch.',
    longDescription: `Experience the ultimate Red Sea adventure with our Giftun Island Speedboat trip! 

Our powerful speedboat will whisk you across crystal-clear waters to the protected Giftun Island National Park. Along the way, feel the exhilarating spray of the sea and enjoy panoramic views of the coastline.

Upon arrival, you'll discover a tropical paradise with some of the most beautiful beaches in Egypt. Dive into the warm waters for world-class snorkeling among vibrant coral gardens teeming with colorful fish.

After working up an appetite, enjoy a freshly prepared buffet lunch with a variety of dishes. Spend the afternoon relaxing on the pristine beach or take another dip in the turquoise lagoon.

This tour is perfect for families, couples, and anyone seeking the perfect blend of adventure and relaxation.`,
    price: 45,
    originalPrice: 60,
    discountPrice: 45,
    duration: '6-7 hours',
    difficulty: 'Easy',
    maxGroupSize: 20,
    location: 'Hurghada Marina',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    images: [
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/giftun-tour-1.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/giftun-tour-2.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/giftun-tour-3.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/giftun-tour-4.jpg',
    ],
    highlights: [
      'Thrilling speedboat ride across the Red Sea',
      'Snorkeling at 2 different coral reef locations',
      'Relax on Giftun Island\'s pristine beaches',
      'Delicious buffet lunch included',
      'All snorkeling equipment provided',
      'Free hotel pickup & drop-off',
    ],
    whatsIncluded: [
      'Speedboat transfer to Giftun Island',
      'Buffet lunch with soft drinks',
      'Snorkeling equipment (mask, snorkel, fins)',
      'Beach towels',
      'Professional guide',
      'Hotel pickup and drop-off',
      'National park entrance fees',
    ],
    whatsNotIncluded: [
      'Alcoholic beverages',
      'Tips for crew',
      'Underwater camera rental',
      'Personal expenses',
    ],
    itinerary: [
      { time: '08:00', title: 'Hotel Pickup', description: 'Our driver will collect you from your hotel lobby', duration: '30 min' },
      { time: '08:30', title: 'Marina Departure', description: 'Board the speedboat and receive safety briefing', duration: '15 min' },
      { time: '08:45', title: 'Speedboat Ride', description: 'Exciting speedboat ride to Giftun Island', duration: '45 min' },
      { time: '09:30', title: 'First Snorkeling Stop', description: 'Explore colorful coral gardens and tropical fish', duration: '1 hour' },
      { time: '10:30', title: 'Second Snorkeling Spot', description: 'Discover another stunning reef location', duration: '1 hour' },
      { time: '11:30', title: 'Beach Arrival', description: 'Arrive at Giftun Island beach', duration: '15 min' },
      { time: '12:00', title: 'Buffet Lunch', description: 'Enjoy fresh Egyptian and international dishes', duration: '1 hour' },
      { time: '13:00', title: 'Free Time', description: 'Relax on the beach, swim, or explore', duration: '2 hours' },
      { time: '15:00', title: 'Return Journey', description: 'Speedboat ride back to Hurghada Marina', duration: '45 min' },
      { time: '16:00', title: 'Hotel Drop-off', description: 'Return to your hotel', duration: '30 min' },
    ],
    faq: [
      { question: 'Is this tour suitable for non-swimmers?', answer: 'Yes! Life jackets are provided and the snorkeling areas have calm, shallow sections perfect for beginners.' },
      { question: 'What should I bring?', answer: 'Bring sunscreen, sunglasses, a hat, swimwear, a towel, and some cash for tips and extras.' },
      { question: 'Are children allowed?', answer: 'Yes, children of all ages are welcome. We have smaller life jackets and snorkeling gear for kids.' },
      { question: 'Can I book a private speedboat?', answer: 'Absolutely! Contact us for private charter options for your group or special occasion.' },
    ],
    bookingOptions: [
      {
        type: 'standard',
        label: 'Standard Package',
        price: 45,
        originalPrice: 60,
        description: 'Full day trip with shared speedboat',
        highlights: ['Shared speedboat', 'Buffet lunch', 'All equipment'],
        isRecommended: true,
        badge: 'Most Popular',
      },
      {
        type: 'premium',
        label: 'VIP Package',
        price: 75,
        originalPrice: 95,
        description: 'Premium experience with extra perks',
        highlights: ['Priority seating', 'Premium lunch', 'Underwater camera rental', 'Beach umbrella'],
      },
    ],
    addOns: [
      { name: 'Underwater Camera Rental', description: 'Capture your underwater memories', price: 15, category: 'Equipment' },
      { name: 'Parasailing Add-on', description: 'Soar above the Red Sea', price: 35, category: 'Activity' },
      { name: 'Professional Photos', description: 'Digital photo package from the day', price: 25, category: 'Service' },
    ],
    whatToBring: ['Sunscreen', 'Sunglasses', 'Hat', 'Swimwear', 'Towel', 'Camera', 'Cash for tips'],
    tags: ['speedboat', 'giftun island', 'snorkeling', 'beach', 'family-friendly', 'island trip'],
    languages: ['English', 'Arabic', 'German', 'Russian'],
    meetingPoint: 'Hotel lobby pickup',
    cancellationPolicy: 'Free cancellation up to 24 hours before the trip for a full refund.',
    minAge: 3,
    rating: 4.9,
    reviewCount: 847,
    isPublished: true,
    isActive: true,
    isFeatured: true,
    bestSeller: true,
    instantConfirmation: true,
    hotelPickup: true,
  },

  // TOUR 2: Orange Bay Island Trip
  {
    tenantId: TENANT_ID,
    title: 'Orange Bay Paradise Island',
    slug: 'orange-bay-paradise-island',
    destination: destinationIds['orange-bay'],
    category: [categoryIds['island-trips-hurghada'], categoryIds['snorkeling-tours-hurghada']],
    description: 'Escape to Orange Bay\'s turquoise lagoon and white sand beaches. Enjoy premium facilities, water sports, and a gourmet lunch.',
    longDescription: `Discover the jewel of the Red Sea at Orange Bay - a stunning private island paradise!

This exclusive destination features a breathtaking shallow turquoise lagoon, perfect for swimming and water activities. The pristine white sand beach stretches before you, inviting relaxation in a tropical setting.

Orange Bay offers premium facilities including comfortable sun loungers, umbrellas, restaurants, and bars. Whether you want to float in the crystal-clear waters, try exciting water sports, or simply unwind on the beach with a cocktail, Orange Bay has it all.

Our tour includes a delicious gourmet lunch at the island's restaurant, giving you a taste of international and local cuisine while overlooking the stunning sea views.`,
    price: 55,
    originalPrice: 70,
    discountPrice: 55,
    duration: '7-8 hours',
    difficulty: 'Easy',
    maxGroupSize: 30,
    location: 'Hurghada Marina',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    images: [
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/orange-bay-1.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/orange-bay-2.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/orange-bay-3.jpg',
    ],
    highlights: [
      'Exclusive access to Orange Bay island',
      'Turquoise lagoon swimming',
      'Premium beach facilities',
      'Gourmet lunch included',
      'Optional water sports',
      'Snorkeling at coral reefs',
    ],
    whatsIncluded: [
      'Boat transfer to Orange Bay',
      'Island entrance fee',
      'Gourmet buffet lunch',
      'Soft drinks',
      'Sun lounger & umbrella',
      'Snorkeling equipment',
      'Hotel transfers',
    ],
    whatsNotIncluded: [
      'Water sports activities',
      'Alcoholic drinks',
      'Tips',
      'Personal expenses',
    ],
    tags: ['orange bay', 'beach', 'lagoon', 'luxury', 'snorkeling', 'family-friendly'],
    languages: ['English', 'Arabic', 'German', 'Russian'],
    cancellationPolicy: 'Free cancellation up to 24 hours before for full refund.',
    rating: 4.8,
    reviewCount: 562,
    isPublished: true,
    isActive: true,
    isFeatured: true,
    bestSeller: true,
    instantConfirmation: true,
    hotelPickup: true,
  },

  // TOUR 3: Dolphin House Swimming with Dolphins
  {
    tenantId: TENANT_ID,
    title: 'Dolphin House - Swim with Wild Dolphins',
    slug: 'dolphin-house-swim-wild-dolphins',
    destination: destinationIds['dolphin-house'],
    category: [categoryIds['dolphin-watching-hurghada'], categoryIds['snorkeling-tours-hurghada']],
    description: 'Swim alongside wild spinner dolphins at their natural reef home. An unforgettable ethical wildlife experience.',
    longDescription: `Experience the magic of swimming with wild dolphins at the famous Dolphin House reef!

Shaab El Erg, known as Dolphin House, is a natural horseshoe-shaped reef where pods of wild spinner dolphins come to rest during the day. This incredible location offers one of the world's best opportunities to observe and swim with dolphins in their natural habitat.

Our experienced guides ensure an ethical and respectful approach to dolphin encounters. We never chase or disturb the dolphins - instead, we enter the water quietly and allow these curious creatures to approach us on their own terms.

After the dolphin encounter, we'll stop at a beautiful coral reef for snorkeling, where you can explore the vibrant underwater world of the Red Sea.

Note: Dolphin sightings are highly likely but cannot be 100% guaranteed as these are wild animals.`,
    price: 35,
    originalPrice: 50,
    discountPrice: 35,
    duration: '5-6 hours',
    difficulty: 'Easy',
    maxGroupSize: 15,
    location: 'Hurghada Marina',
    image: 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=800&q=80',
    images: [
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/dolphin-1.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/dolphin-2.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/dolphin-3.jpg',
    ],
    highlights: [
      'Swim with wild spinner dolphins',
      'Ethical wildlife encounter',
      'Experienced marine guides',
      'Snorkeling at coral reef',
      'Small group experience',
      'High dolphin sighting rate',
    ],
    whatsIncluded: [
      'Speedboat to Dolphin House',
      'Snorkeling equipment',
      'Light lunch & drinks',
      'Professional guide',
      'Hotel transfers',
    ],
    whatsNotIncluded: [
      'Tips for crew',
      'Underwater camera',
      'Personal expenses',
    ],
    faq: [
      { question: 'Will we definitely see dolphins?', answer: 'Dolphin sightings are highly likely (95%+ success rate) but cannot be guaranteed as these are wild animals. If no dolphins are spotted, we offer a 50% refund or free rebooking.' },
      { question: 'Is it safe to swim with wild dolphins?', answer: 'Yes! Spinner dolphins are gentle and curious. Our guides ensure safe, respectful encounters following ethical guidelines.' },
      { question: 'Can children participate?', answer: 'Yes, children aged 6+ can join. Younger children can watch from the boat.' },
    ],
    tags: ['dolphins', 'wildlife', 'snorkeling', 'ethical tourism', 'swimming', 'nature'],
    languages: ['English', 'Arabic', 'German'],
    cancellationPolicy: 'Free cancellation up to 24 hours before.',
    minAge: 6,
    rating: 4.9,
    reviewCount: 423,
    isPublished: true,
    isActive: true,
    isFeatured: true,
    instantConfirmation: true,
    hotelPickup: true,
  },

  // TOUR 4: Sunset Cruise
  {
    tenantId: TENANT_ID,
    title: 'Romantic Red Sea Sunset Cruise',
    slug: 'romantic-red-sea-sunset-cruise',
    destination: destinationIds['hurghada-marina'],
    category: [categoryIds['sunset-cruises-hurghada']],
    description: 'Watch the sun paint the sky gold over the Red Sea. Includes drinks, snacks, music, and magical views.',
    longDescription: `End your day in paradise with the most romantic experience on the Red Sea!

Our sunset cruise takes you on a magical journey as the sky transforms into a canvas of oranges, pinks, and golds. Relax on our comfortable boat as you sail along the Hurghada coastline.

Enjoy complimentary drinks (soft drinks, tea, coffee) and delicious snacks as the sun slowly descends toward the horizon. Our onboard music creates the perfect atmosphere for couples, friends, or anyone wanting to experience the beauty of a Red Sea sunset.

This 2-hour cruise is the perfect way to celebrate a special occasion, create romantic memories, or simply enjoy one of nature's most spectacular shows.`,
    price: 25,
    originalPrice: 35,
    discountPrice: 25,
    duration: '2 hours',
    difficulty: 'Easy',
    maxGroupSize: 40,
    location: 'Hurghada Marina',
    image: 'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/sunset-cruise.jpg',
    images: [
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/sunset-1.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/sunset-2.jpg',
    ],
    highlights: [
      'Spectacular Red Sea sunset views',
      'Complimentary drinks & snacks',
      'Romantic atmosphere',
      'Music & entertainment',
      'Perfect for couples',
      'Photography opportunities',
    ],
    whatsIncluded: [
      'Sunset boat cruise',
      'Soft drinks, tea, coffee',
      'Snacks',
      'Hotel pickup & drop-off',
    ],
    whatsNotIncluded: [
      'Alcoholic beverages',
      'Tips',
    ],
    tags: ['sunset', 'romantic', 'cruise', 'couples', 'photography', 'relaxation'],
    languages: ['English', 'Arabic'],
    cancellationPolicy: 'Free cancellation up to 12 hours before.',
    rating: 4.8,
    reviewCount: 289,
    isPublished: true,
    isActive: true,
    isFeatured: true,
    instantConfirmation: true,
    hotelPickup: true,
  },

  // TOUR 5: Private Speedboat Charter
  {
    tenantId: TENANT_ID,
    title: 'Private Speedboat Charter',
    slug: 'private-speedboat-charter',
    destination: destinationIds['hurghada-marina'],
    category: [categoryIds['private-charters-hurghada'], categoryIds['speedboat-tours-hurghada']],
    description: 'Your own private speedboat for the day. Customize your itinerary and explore the Red Sea your way.',
    longDescription: `Experience the ultimate freedom with your own private speedboat charter!

Whether you're celebrating a special occasion, want an exclusive family adventure, or simply prefer a more intimate experience, our private charter gives you complete flexibility.

Work with our captain to create your perfect day - visit multiple islands, find secluded snorkeling spots, chase dolphins, or simply cruise the beautiful Red Sea coastline. The boat, captain, and day are entirely yours.

Our private speedboat accommodates up to 10 passengers, making it perfect for families, groups of friends, or romantic escapes. All snorkeling equipment, drinks, and a custom lunch are included.`,
    price: 350,
    originalPrice: 450,
    discountPrice: 350,
    duration: '6-8 hours',
    difficulty: 'Easy',
    maxGroupSize: 10,
    location: 'Hurghada Marina',
    image: 'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/private-charter.jpg',
    images: [
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/charter-1.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/charter-2.jpg',
    ],
    highlights: [
      'Entire boat for your group',
      'Customizable itinerary',
      'Visit multiple locations',
      'Private snorkeling spots',
      'Flexible schedule',
      'Perfect for special occasions',
    ],
    whatsIncluded: [
      'Private speedboat (up to 10 pax)',
      'Experienced captain',
      'Snorkeling equipment',
      'Lunch & unlimited soft drinks',
      'All fuel & fees',
      'Hotel transfers',
    ],
    whatsNotIncluded: [
      'Alcoholic beverages',
      'Tips for captain',
      'National park fees (if visiting)',
    ],
    bookingOptions: [
      {
        type: 'half-day',
        label: 'Half Day Charter',
        price: 250,
        description: '4 hours private charter',
        duration: '4 hours',
        highlights: ['4-hour private boat', 'Custom route', 'Snorkeling stop'],
      },
      {
        type: 'full-day',
        label: 'Full Day Charter',
        price: 350,
        originalPrice: 450,
        description: '6-8 hours private charter',
        duration: '6-8 hours',
        highlights: ['Full day boat', 'Multiple stops', 'Lunch included'],
        isRecommended: true,
        badge: 'Best Value',
      },
      {
        type: 'luxury',
        label: 'VIP Yacht Charter',
        price: 600,
        description: 'Luxury yacht experience',
        duration: '8 hours',
        highlights: ['Luxury yacht', 'Premium catering', 'Champagne'],
      },
    ],
    tags: ['private', 'charter', 'exclusive', 'customizable', 'family', 'celebrations'],
    languages: ['English', 'Arabic', 'German', 'Russian'],
    cancellationPolicy: 'Free cancellation up to 48 hours before.',
    rating: 5.0,
    reviewCount: 156,
    isPublished: true,
    isActive: true,
    isFeatured: true,
    instantConfirmation: true,
    hotelPickup: true,
  },

  // TOUR 6: Water Sports Package
  {
    tenantId: TENANT_ID,
    title: 'Ultimate Water Sports Adventure',
    slug: 'ultimate-water-sports-adventure',
    destination: destinationIds['hurghada-marina'],
    category: [categoryIds['water-sports-hurghada']],
    description: 'Parasailing, jet ski, banana boat, and more! The complete adrenaline package.',
    longDescription: `Get your heart pumping with our Ultimate Water Sports Adventure package!

This action-packed experience includes multiple thrilling activities:

🪂 **Parasailing** - Soar up to 100 meters above the Red Sea for breathtaking views
🚤 **Jet Ski** - Race across the waves on your own personal watercraft  
🍌 **Banana Boat** - Hold on tight for this fun group ride
🛶 **Kayaking** - Paddle through calm waters at your own pace

All activities include full safety briefings and equipment. Our experienced instructors ensure you have maximum fun while staying safe.

Perfect for thrill-seekers, families, or anyone wanting to try something new!`,
    price: 65,
    originalPrice: 90,
    discountPrice: 65,
    duration: '3-4 hours',
    difficulty: 'Moderate',
    maxGroupSize: 20,
    location: 'Hurghada Beach',
    image: 'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/watersports-tour.jpg',
    images: [
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/watersports-1.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/watersports-2.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/watersports-3.jpg',
    ],
    highlights: [
      'Parasailing with sea views',
      'Jet ski riding',
      'Banana boat fun',
      'Kayaking',
      'All equipment included',
      'Safety instructors',
    ],
    whatsIncluded: [
      'Parasailing (15 min)',
      'Jet ski (15 min)',
      'Banana boat ride',
      'Kayaking (30 min)',
      'All safety equipment',
      'Instructors',
      'Hotel transfers',
    ],
    whatsNotIncluded: [
      'Food & drinks',
      'Tips',
      'Photos/videos (available for purchase)',
    ],
    bookingOptions: [
      {
        type: 'single',
        label: 'Single Activity',
        price: 25,
        description: 'Choose one activity',
        highlights: ['One activity of your choice'],
      },
      {
        type: 'combo',
        label: 'Combo Package',
        price: 45,
        description: 'Any 3 activities',
        highlights: ['Choose 3 activities', 'Best for groups'],
      },
      {
        type: 'ultimate',
        label: 'Ultimate Package',
        price: 65,
        originalPrice: 90,
        description: 'All 4 activities',
        highlights: ['All activities included', 'Maximum fun'],
        isRecommended: true,
        badge: 'Best Deal',
      },
    ],
    tags: ['water sports', 'parasailing', 'jet ski', 'banana boat', 'adventure', 'adrenaline'],
    languages: ['English', 'Arabic'],
    cancellationPolicy: 'Free cancellation up to 24 hours before.',
    minAge: 8,
    rating: 4.7,
    reviewCount: 312,
    isPublished: true,
    featured: false,
    instantConfirmation: true,
    hotelPickup: true,
  },

  // TOUR 7: Snorkeling Safari
  {
    tenantId: TENANT_ID,
    title: 'Red Sea Snorkeling Safari',
    slug: 'red-sea-snorkeling-safari',
    destination: destinationIds['hurghada-marina'],
    category: [categoryIds['snorkeling-tours-hurghada']],
    description: 'Visit 3 different coral reef sites in one day. See tropical fish, corals, and maybe sea turtles!',
    longDescription: `Explore the underwater wonders of the Red Sea on our comprehensive Snorkeling Safari!

This full-day adventure takes you to three carefully selected snorkeling sites, each offering unique marine life and coral formations:

**Site 1: Coral Garden** - A colorful array of hard and soft corals with countless reef fish
**Site 2: The Aquarium** - Crystal clear waters with amazing visibility and diverse marine life  
**Site 3: Turtle Bay** - Known for frequent green turtle sightings

Our experienced guides will point out interesting creatures and ensure your safety throughout. Whether you're a first-timer or experienced snorkeler, you'll be amazed by the Red Sea's underwater paradise.

Full snorkeling equipment and a delicious lunch on board are included.`,
    price: 30,
    originalPrice: 45,
    discountPrice: 30,
    duration: '6-7 hours',
    difficulty: 'Easy',
    maxGroupSize: 25,
    location: 'Hurghada Marina',
    image: 'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/snorkeling-safari.jpg',
    images: [
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/snorkel-1.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/snorkel-2.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/snorkel-3.jpg',
    ],
    highlights: [
      '3 different snorkeling sites',
      'Colorful coral reefs',
      'Tropical fish galore',
      'Possible turtle sightings',
      'Lunch on board',
      'All equipment provided',
    ],
    whatsIncluded: [
      'Boat trip to 3 snorkel sites',
      'Snorkeling equipment',
      'Buffet lunch',
      'Soft drinks',
      'Professional guide',
      'Hotel transfers',
    ],
    whatsNotIncluded: [
      'Tips',
      'Underwater photos',
      'Wetsuit rental ($5)',
    ],
    tags: ['snorkeling', 'coral reef', 'marine life', 'beginner-friendly', 'fish', 'underwater'],
    languages: ['English', 'Arabic', 'German', 'Russian'],
    cancellationPolicy: 'Free cancellation up to 24 hours before.',
    rating: 4.8,
    reviewCount: 534,
    isPublished: true,
    isActive: true,
    isFeatured: true,
    bestSeller: true,
    instantConfirmation: true,
    hotelPickup: true,
  },

  // TOUR 8: Glass Bottom Boat
  {
    tenantId: TENANT_ID,
    title: 'Glass Bottom Boat & Snorkeling',
    slug: 'glass-bottom-boat-snorkeling',
    destination: destinationIds['hurghada-marina'],
    category: [categoryIds['snorkeling-tours-hurghada']],
    description: 'See the underwater world without getting wet! Perfect for families and non-swimmers.',
    longDescription: `Experience the magic of the Red Sea even if you don't want to swim!

Our glass bottom boat features large viewing panels that let you observe the stunning underwater world from the comfort of a dry seat. Watch colorful fish, beautiful corals, and maybe even an octopus or ray passing by below.

For those who do want to get in the water, we'll also stop at a calm snorkeling spot where you can swim among the fish you've been watching.

This tour is ideal for families with young children, elderly travelers, or anyone who wants to see marine life without snorkeling.`,
    price: 20,
    originalPrice: 30,
    discountPrice: 20,
    duration: '3-4 hours',
    difficulty: 'Very Easy',
    maxGroupSize: 40,
    location: 'Hurghada Marina',
    image: 'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/glass-boat.jpg',
    images: [
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/glass-1.jpg',
      'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/glass-2.jpg',
    ],
    highlights: [
      'See fish through glass panels',
      'No swimming required',
      'Optional snorkeling stop',
      'Family-friendly',
      'Perfect for non-swimmers',
      'Air-conditioned boat',
    ],
    whatsIncluded: [
      'Glass bottom boat ride',
      'Optional snorkeling stop',
      'Snorkeling equipment',
      'Soft drinks',
      'Hotel transfers',
    ],
    whatsNotIncluded: [
      'Tips',
      'Snacks',
    ],
    tags: ['glass boat', 'family-friendly', 'non-swimmers', 'coral viewing', 'easy', 'kids'],
    languages: ['English', 'Arabic'],
    cancellationPolicy: 'Free cancellation up to 24 hours before.',
    minAge: 0,
    rating: 4.6,
    reviewCount: 267,
    isPublished: true,
    featured: false,
    instantConfirmation: true,
    hotelPickup: true,
  },
];

// ============================================
// HERO SETTINGS
// ============================================
const heroSettings = {
  tenantId: TENANT_ID,
  backgroundImages: [
    {
      desktop: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80',
      mobile: 'https://res.cloudinary.com/dvcfefmys/image/upload/v1734100000/speedboat-hero-1-mobile.jpg',
      alt: 'Speedboat racing across the Red Sea',
      isActive: true,
    },
    {
      desktop: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80',
      alt: 'Snorkeling in crystal clear waters',
      isActive: false,
    },
    {
      desktop: 'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=1920&q=80',
      alt: 'Giftun Island paradise beach',
      isActive: false,
    },
  ],
  currentActiveImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80',
  title: {
    main: 'Red Sea',
    highlight: 'Adventures',
  },
  searchSuggestions: [
    'Giftun Island',
    'Orange Bay',
    'Dolphin Watching',
    'Snorkeling Trip',
    'Sunset Cruise',
    'Private Boat',
    'Water Sports',
    'Island Hopping',
  ],
  floatingTags: {
    isEnabled: true,
    tags: [
      'SPEEDBOAT TOURS', 'GIFTUN ISLAND', 'SNORKELING', 'DOLPHINS',
      'ORANGE BAY', 'SUNSET CRUISE', 'WATER SPORTS', 'PRIVATE CHARTER',
      'RED SEA', 'CORAL REEFS', 'ISLAND TRIPS', 'PARASAILING',
      'JET SKI', 'BEACH DAY', 'MARINE LIFE', 'ADVENTURE',
    ],
    animationSpeed: 5,
    tagCount: {
      desktop: 9,
      mobile: 5,
    },
  },
  trustIndicators: {
    travelers: '10K+ Happy Guests',
    rating: '4.9/5 Rating',
    ratingText: '★★★★★',
    isVisible: true,
  },
  overlaySettings: {
    opacity: 0.5,
    gradientType: 'dark' as const,
  },
  animationSettings: {
    slideshowSpeed: 6,
    fadeSpeed: 900,
    enableAutoplay: true,
  },
  isActive: true,
};

// ============================================
// MAIN SEED FUNCTION
// ============================================
async function seedSpeedboatData() {
  console.log('🚤 Speedboat Complete Seed Script');
  console.log('═'.repeat(60));
  console.log('');

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const Tenant = mongoose.models.Tenant || (await import('../lib/models/Tenant')).default;
    const Destination = mongoose.models.Destination || (await import('../lib/models/Destination')).default;
    const Category = mongoose.models.Category || (await import('../lib/models/Category')).default;
    const Tour = mongoose.models.Tour || (await import('../lib/models/Tour')).default;
    const HeroSettings = mongoose.models.HeroSettings || (await import('../lib/models/HeroSettings')).default;

    // Step 1: Create/Update Tenant
    console.log('📝 Step 1: Setting up tenant...');
    await Tenant.findOneAndUpdate(
      { tenantId: TENANT_ID },
      tenantConfig,
      { upsert: true, new: true }
    );
    console.log('   ✅ Tenant created/updated\n');

    // Step 2: Create Destinations
    console.log('📝 Step 2: Creating destinations...');
    const destinationIds: Record<string, mongoose.Types.ObjectId> = {};
    
    for (const dest of destinations) {
      const savedDest = await Destination.findOneAndUpdate(
        { tenantId: TENANT_ID, slug: dest.slug },
        dest,
        { upsert: true, new: true }
      );
      destinationIds[dest.slug] = savedDest._id;
      console.log(`   ✅ ${dest.name}`);
    }
    console.log('');

    // Step 3: Create Categories
    console.log('📝 Step 3: Creating categories...');
    const categoryIds: Record<string, mongoose.Types.ObjectId> = {};
    
    for (const cat of categories) {
      const savedCat = await Category.findOneAndUpdate(
        { tenantId: TENANT_ID, slug: cat.slug },
        cat,
        { upsert: true, new: true }
      );
      categoryIds[cat.slug] = savedCat._id;
      console.log(`   ✅ ${cat.name}`);
    }
    console.log('');

    // Step 4: Create Tours
    console.log('📝 Step 4: Creating tours...');
    const tours = createTours(destinationIds, categoryIds);
    
    for (const tour of tours) {
      await Tour.findOneAndUpdate(
        { tenantId: TENANT_ID, slug: tour.slug },
        tour,
        { upsert: true, new: true }
      );
      console.log(`   ✅ ${tour.title}`);
    }
    console.log('');

    // Step 5: Create Hero Settings
    console.log('📝 Step 5: Creating hero settings...');
    await HeroSettings.findOneAndUpdate(
      { tenantId: TENANT_ID },
      heroSettings,
      { upsert: true, new: true }
    );
    console.log('   ✅ Hero settings created\n');

    // Summary
    console.log('═'.repeat(60));
    console.log('              🎉 SEED COMPLETE! 🎉');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📊 Summary:');
    console.log(`   • Tenant: 1`);
    console.log(`   • Destinations: ${destinations.length}`);
    console.log(`   • Categories: ${categories.length}`);
    console.log(`   • Tours: ${tours.length}`);
    console.log(`   • Hero Settings: 1`);
    console.log('');
    console.log('🌐 Access your speedboat site:');
    console.log('   • Local: http://localhost:3004');
    console.log('   • Production: https://hurghadaspeedboat.com');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from database');
  }
}

// Run the seed
seedSpeedboatData();
