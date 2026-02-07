// scripts/seed-homepage-content.ts
// Seed homepage content (aboutUs, reviews, FAQ, promo) for tenants
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined');
  process.exit(1);
}

// Homepage content configurations for each tenant
const TENANT_HOMEPAGE_CONTENT: Record<string, {
  aboutUsContent: {
    title: string;
    subtitle: string;
    features: { icon: string; text: string }[];
    image: string;
    imageAlt: string;
    ctaText: string;
    ctaLink: string;
    accentColor: string;
  };
  reviewsContent: {
    title: string;
    subtitle: string;
    reviews: { name: string; country: string; review: string; rating: number; datePublished: string }[];
    showElfsightWidget: boolean;
  };
  faqContent: {
    title: string;
    faqs: { question: string; answer: string }[];
    ctaText: string;
    ctaLink: string;
  };
  promoContent: {
    image: string;
    imageAlt: string;
    heading: string;
    subheading: string;
    description: string;
    primaryHref: string;
    primaryText: string;
  };
}> = {
  'hurghada-speedboat': {
    aboutUsContent: {
      title: 'Why book with Hurghada Speedboat?',
      subtitle: 'Your Red Sea adventure experts since 2015.',
      features: [
        { icon: 'anchor', text: 'Modern speedboat fleet maintained to highest standards' },
        { icon: 'shield', text: 'Licensed & insured with experienced captains' },
        { icon: 'users', text: 'Small groups for personalized experiences' },
        { icon: 'clock', text: 'Free cancellation up to 24 hours before' },
      ],
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
      imageAlt: 'Speedboat on crystal clear Red Sea waters',
      ctaText: 'Explore our boats',
      ctaLink: '/about',
      accentColor: 'from-cyan-500 to-cyan-600',
    },
    reviewsContent: {
      title: 'What Our Guests Say',
      subtitle: 'Real experiences from our Red Sea adventurers.',
      reviews: [
        {
          name: 'Sophie',
          country: 'Germany',
          review: 'Best speedboat trip ever! The snorkeling at Giftun Island was incredible. So many colorful fish!',
          rating: 5,
          datePublished: '2024-11-20',
        },
        {
          name: 'James',
          country: 'UK',
          review: 'Swimming with dolphins at Dolphin House was a dream come true. Captain Ahmed was fantastic!',
          rating: 5,
          datePublished: '2024-11-05',
        },
        {
          name: 'Anna',
          country: 'Russia',
          review: 'Orange Bay is paradise! Crystal clear water, white sand beach. Perfect day trip from Hurghada.',
          rating: 5,
          datePublished: '2024-10-28',
        },
      ],
      showElfsightWidget: true,
    },
    faqContent: {
      title: 'FREQUENTLY ASKED QUESTIONS',
      faqs: [
        {
          question: 'What should I bring on the speedboat trip?',
          answer: 'We recommend bringing sunscreen, sunglasses, a hat, swimwear, a towel, and a waterproof bag for your phone. Snorkeling equipment is provided on all trips.',
        },
        {
          question: 'Is the trip suitable for non-swimmers?',
          answer: 'Yes! Life jackets are provided and our crew is trained to assist non-swimmers. The snorkeling spots have calm, shallow areas perfect for beginners.',
        },
        {
          question: 'Will we definitely see dolphins on the Dolphin House trip?',
          answer: 'Dolphin House has a 95%+ success rate for dolphin sightings. If no dolphins are spotted, we offer a 50% refund or free rebooking.',
        },
        {
          question: 'What time does hotel pickup start?',
          answer: 'Pickup times vary by hotel location, typically between 7:30 AM - 8:30 AM for full-day trips. You will receive exact pickup time via WhatsApp the evening before.',
        },
        {
          question: 'Can children join the speedboat trips?',
          answer: 'Yes! Children of all ages are welcome. We have child-sized life jackets and snorkeling gear. Some water sports have minimum age requirements (usually 8+).',
        },
      ],
      ctaText: 'VIEW ALL FAQS',
      ctaLink: '/faqs',
    },
    promoContent: {
      image: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?w=1200',
      imageAlt: 'Crystal clear Red Sea waters with speedboat',
      heading: 'Island Paradise',
      subheading: 'Crystal waters, coral reefs & endless adventure',
      description: 'Escape to stunning Red Sea islands — snorkel vibrant reefs, swim with dolphins, and discover hidden beaches aboard our modern speedboats.',
      primaryHref: '/tours',
      primaryText: 'View All Tours',
    },
  },

  'hurghada-excursions-online': {
    aboutUsContent: {
      title: 'Why book with Hurghada Excursions Online?',
      subtitle: 'Your gateway to unforgettable Red Sea experiences.',
      features: [
        { icon: 'award', text: 'Top-rated excursions with 10,000+ happy customers' },
        { icon: 'dollar', text: 'Best price guarantee - we match any competitor' },
        { icon: 'smartphone', text: 'Instant e-tickets - show on your phone' },
        { icon: 'calendar', text: 'Free cancellation up to 24 hours before' },
      ],
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
      imageAlt: 'Beautiful Red Sea coastline in Hurghada',
      ctaText: 'About Us',
      ctaLink: '/about',
      accentColor: 'from-cyan-600 to-teal-600',
    },
    reviewsContent: {
      title: 'Traveler Reviews',
      subtitle: 'See what our guests are saying about their adventures.',
      reviews: [
        {
          name: 'Michael',
          country: 'USA',
          review: 'The Luxor day trip from Hurghada was incredible. Our guide knew everything about ancient Egypt!',
          rating: 5,
          datePublished: '2024-12-01',
        },
        {
          name: 'Elena',
          country: 'Spain',
          review: 'Desert safari at sunset was magical. The quad biking and Bedouin dinner were highlights of our trip.',
          rating: 5,
          datePublished: '2024-11-15',
        },
        {
          name: 'Thomas',
          country: 'France',
          review: 'Snorkeling trip to Giftun was perfect. Crystal clear water and amazing marine life!',
          rating: 5,
          datePublished: '2024-11-10',
        },
      ],
      showElfsightWidget: true,
    },
    faqContent: {
      title: 'HAVE QUESTIONS?',
      faqs: [
        {
          question: 'How do I book an excursion?',
          answer: 'Simply choose your tour, select your date, and complete the booking. You will receive instant confirmation via email with all details.',
        },
        {
          question: 'Is hotel pickup included?',
          answer: 'Yes! All our excursions include free hotel pickup and drop-off from any hotel in Hurghada, Makadi Bay, or El Gouna.',
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards, PayPal, and cash payment on the day of your tour.',
        },
        {
          question: 'Can I modify my booking?',
          answer: 'Yes, you can modify your booking up to 24 hours before the tour. Contact us via WhatsApp or email.',
        },
      ],
      ctaText: 'MORE QUESTIONS',
      ctaLink: '/faqs',
    },
    promoContent: {
      image: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1200',
      imageAlt: 'Ancient temples of Luxor',
      heading: 'Discover Hurghada',
      subheading: 'Red Sea adventures & ancient wonders await',
      description: 'From pristine beaches to ancient temples — explore the best of Egypt with our curated excursions from Hurghada.',
      primaryHref: '/tours',
      primaryText: 'Explore Tours',
    },
  },

  'cairo-excursions-online': {
    aboutUsContent: {
      title: 'Why book with Cairo Excursions Online?',
      subtitle: 'Expert guides to Egypt\'s ancient treasures.',
      features: [
        { icon: 'award', text: 'Certified Egyptologist guides on every tour' },
        { icon: 'shield', text: 'Licensed and fully insured tours' },
        { icon: 'users', text: 'Small groups for a personal experience' },
        { icon: 'clock', text: 'Flexible scheduling & free cancellation' },
      ],
      image: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800',
      imageAlt: 'The Great Pyramids of Giza at sunset',
      ctaText: 'Learn More',
      ctaLink: '/about',
      accentColor: 'from-amber-500 to-amber-600',
    },
    reviewsContent: {
      title: 'Guest Testimonials',
      subtitle: 'Hear from travelers who explored Egypt with us.',
      reviews: [
        {
          name: 'David',
          country: 'Australia',
          review: 'Our Egyptologist guide Ahmed made the pyramids come alive with his knowledge. Best tour experience ever!',
          rating: 5,
          datePublished: '2024-12-05',
        },
        {
          name: 'Maria',
          country: 'Brazil',
          review: 'The Egyptian Museum tour was fascinating. So much history in one place!',
          rating: 5,
          datePublished: '2024-11-20',
        },
        {
          name: 'Kenji',
          country: 'Japan',
          review: 'Sunrise at the pyramids was a once-in-a-lifetime experience. Thank you for arranging it!',
          rating: 5,
          datePublished: '2024-11-08',
        },
      ],
      showElfsightWidget: true,
    },
    faqContent: {
      title: 'COMMON QUESTIONS',
      faqs: [
        {
          question: 'How early should I arrive at the pyramids?',
          answer: 'We recommend sunrise tours (around 6 AM) to avoid crowds and heat. Our pickup will be arranged accordingly.',
        },
        {
          question: 'Can I go inside the pyramids?',
          answer: 'Yes! Entry tickets to the Great Pyramid interior can be added to your tour. Note: spaces are limited and it requires climbing.',
        },
        {
          question: 'What should I wear?',
          answer: 'Comfortable walking shoes, light breathable clothing, and a hat. For mosque visits, women should bring a scarf.',
        },
        {
          question: 'Is lunch included?',
          answer: 'Full-day tours include lunch at a quality local restaurant. Half-day tours typically do not include meals.',
        },
      ],
      ctaText: 'ALL FAQS',
      ctaLink: '/faqs',
    },
    promoContent: {
      image: 'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=1200',
      imageAlt: 'Inside the Egyptian Museum',
      heading: 'Ancient Wonders',
      subheading: 'Walk in the footsteps of pharaohs',
      description: 'Discover the mysteries of ancient Egypt — from the majestic pyramids to the treasures of Tutankhamun.',
      primaryHref: '/tours',
      primaryText: 'Book Your Tour',
    },
  },

  'luxor-excursions': {
    aboutUsContent: {
      title: 'Why choose Luxor Excursions?',
      subtitle: 'Specialists in ancient Thebes since 2010.',
      features: [
        { icon: 'award', text: 'Expert Egyptologists with deep local knowledge' },
        { icon: 'calendar', text: 'Hot air balloon rides at sunrise' },
        { icon: 'users', text: 'Private and small group options' },
        { icon: 'clock', text: 'Flexible itineraries tailored to you' },
      ],
      image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800',
      imageAlt: 'Karnak Temple columns at sunset',
      ctaText: 'Discover More',
      ctaLink: '/about',
      accentColor: 'from-purple-600 to-purple-700',
    },
    reviewsContent: {
      title: 'Visitor Reviews',
      subtitle: 'What travelers say about their Luxor experience.',
      reviews: [
        {
          name: 'Sarah',
          country: 'Canada',
          review: 'The hot air balloon over Valley of the Kings was breathtaking. Worth every penny!',
          rating: 5,
          datePublished: '2024-12-10',
        },
        {
          name: 'Hans',
          country: 'Germany',
          review: 'Our guide brought ancient Egypt to life. The temples are even more impressive in person.',
          rating: 5,
          datePublished: '2024-11-25',
        },
        {
          name: 'Lisa',
          country: 'UK',
          review: 'Perfect organization from start to finish. The felucca sunset cruise was magical.',
          rating: 5,
          datePublished: '2024-11-12',
        },
      ],
      showElfsightWidget: true,
    },
    faqContent: {
      title: 'YOUR QUESTIONS ANSWERED',
      faqs: [
        {
          question: 'What is the best time to visit Luxor?',
          answer: 'October to April offers the best weather. Summer can be very hot (40°C+). Early morning tours are recommended year-round.',
        },
        {
          question: 'How long do I need in Luxor?',
          answer: 'We recommend 2-3 days minimum to see the main sites: Valley of the Kings, Karnak, Luxor Temple, and the West Bank.',
        },
        {
          question: 'Is the hot air balloon safe?',
          answer: 'Yes! We only work with licensed operators with excellent safety records. Flights depend on weather conditions.',
        },
        {
          question: 'Can I take photos inside the tombs?',
          answer: 'Photography is allowed in most tombs but flash is prohibited. Some special tombs require an extra photography ticket.',
        },
      ],
      ctaText: 'MORE INFO',
      ctaLink: '/faqs',
    },
    promoContent: {
      image: 'https://images.unsplash.com/photo-1595981234058-a9302fb97229?w=1200',
      imageAlt: 'Hot air balloons over Luxor temples',
      heading: 'Ancient Thebes',
      subheading: 'Temples, tombs & timeless wonders',
      description: 'Explore the world\'s greatest open-air museum — Valley of the Kings, Karnak Temple, and the treasures of ancient Thebes.',
      primaryHref: '/tours',
      primaryText: 'Explore Luxor',
    },
  },

  'sharm-excursions-online': {
    aboutUsContent: {
      title: 'Why book with Sharm Excursions Online?',
      subtitle: 'Your diving and adventure experts in Sinai.',
      features: [
        { icon: 'anchor', text: 'PADI certified dive centers and instructors' },
        { icon: 'shield', text: 'Safety-first approach on all excursions' },
        { icon: 'users', text: 'Small groups for better experiences' },
        { icon: 'dollar', text: 'Best prices guaranteed' },
      ],
      image: 'https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=800',
      imageAlt: 'Coral reef diving in Sharm El Sheikh',
      ctaText: 'About Us',
      ctaLink: '/about',
      accentColor: 'from-blue-600 to-blue-700',
    },
    reviewsContent: {
      title: 'Diver Reviews',
      subtitle: 'Experiences from underwater adventurers.',
      reviews: [
        {
          name: 'Alex',
          country: 'Netherlands',
          review: 'Ras Mohammed diving was world-class. Saw sharks, turtles, and incredible coral walls!',
          rating: 5,
          datePublished: '2024-12-08',
        },
        {
          name: 'Yuki',
          country: 'Japan',
          review: 'The Blue Hole in Dahab was amazing. Great organization and professional dive masters.',
          rating: 5,
          datePublished: '2024-11-22',
        },
        {
          name: 'Marco',
          country: 'Italy',
          review: 'Quad biking in the desert and dinner with Bedouins - unforgettable evening!',
          rating: 5,
          datePublished: '2024-11-05',
        },
      ],
      showElfsightWidget: true,
    },
    faqContent: {
      title: 'FAQ',
      faqs: [
        {
          question: 'Do I need diving experience?',
          answer: 'Not at all! We offer discover scuba diving for beginners and snorkeling for non-divers. Certified divers can join advanced dives.',
        },
        {
          question: 'What marine life will I see?',
          answer: 'Expect colorful coral, tropical fish, turtles, rays, and sometimes dolphins or sharks depending on the dive site.',
        },
        {
          question: 'Is Ras Mohammed worth visiting?',
          answer: 'Absolutely! It\'s one of the world\'s top dive sites. The national park also offers beautiful beaches and mangroves.',
        },
        {
          question: 'Can I visit St. Catherine\'s Monastery?',
          answer: 'Yes! We offer overnight trips to Mount Sinai for sunrise and St. Catherine\'s Monastery visits.',
        },
      ],
      ctaText: 'ALL QUESTIONS',
      ctaLink: '/faqs',
    },
    promoContent: {
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200',
      imageAlt: 'Crystal clear waters of Sharm El Sheikh',
      heading: 'Dive Paradise',
      subheading: 'World-class diving & desert adventures',
      description: 'Discover the underwater wonders of the Red Sea — pristine coral reefs, vibrant marine life, and unforgettable diving experiences.',
      primaryHref: '/tours',
      primaryText: 'Explore Diving',
    },
  },

  'makadi-bay': {
    aboutUsContent: {
      title: 'Why book with Makadi Bay Excursions?',
      subtitle: 'Your Red Sea holiday experts based in Makadi Bay.',
      features: [
        { icon: 'sun', text: 'Year-round sunshine and warm waters' },
        { icon: 'shield', text: 'Fully licensed and insured excursions' },
        { icon: 'users', text: 'Small group sizes for personal service' },
        { icon: 'dollar', text: 'Resort-area pickup included' },
      ],
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      imageAlt: 'Makadi Bay beach and resort',
      ctaText: 'About Us',
      ctaLink: '/about',
      accentColor: 'from-teal-600 to-teal-700',
    },
    reviewsContent: {
      title: 'Guest Reviews',
      subtitle: 'What our Makadi Bay visitors say.',
      reviews: [
        { name: 'Hannah', country: 'Germany', review: 'The snorkeling trip was incredible! Crystal clear water and colourful fish everywhere.', rating: 5, datePublished: '2025-08-20' },
        { name: 'James', country: 'UK', review: 'Quad bike desert safari was the highlight of our holiday. Great guides!', rating: 5, datePublished: '2025-07-15' },
        { name: 'Sophia', country: 'Italy', review: 'Glass-bottom boat ride was perfect for the kids. Easy pickup from our hotel.', rating: 5, datePublished: '2025-06-10' },
      ],
      showElfsightWidget: false,
    },
    faqContent: {
      title: 'FREQUENTLY ASKED QUESTIONS',
      faqs: [
        { question: 'Do you offer hotel pickup from Makadi Bay resorts?', answer: 'Yes! We offer complimentary pickup from all Makadi Bay hotels and resorts.' },
        { question: 'What snorkeling equipment is provided?', answer: 'All snorkeling gear (mask, snorkel, fins) is included. Wetsuits available on request.' },
        { question: 'Can I book a Luxor day trip from Makadi Bay?', answer: 'Yes, we run daily trips to Luxor with pickup from Makadi Bay. The journey takes about 3.5 hours each way.' },
        { question: 'Are your tours suitable for children?', answer: 'Many of our tours are family-friendly. Check each tour page for age recommendations.' },
      ],
      ctaText: 'MORE INFO',
      ctaLink: '/faqs',
    },
    promoContent: {
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
      imageAlt: 'Tropical beach resort in Makadi Bay',
      heading: 'Makadi Bay Awaits',
      subheading: 'Pristine beaches, coral gardens & starlit deserts',
      description: 'Snorkel crystal-clear waters, explore the Sahara by quad bike, and relax on pristine beaches — Makadi Bay is your Red Sea paradise.',
      primaryHref: '/tours',
      primaryText: 'Browse All Tours',
    },
  },

  'el-gouna': {
    aboutUsContent: {
      title: 'Why book with El Gouna Excursions?',
      subtitle: 'The Venice of the Red Sea — your gateway to luxury adventures.',
      features: [
        { icon: 'anchor', text: 'Private yacht charters and boat trips' },
        { icon: 'wind', text: 'Kitesurfing and water sports specialists' },
        { icon: 'star', text: 'Premium experiences with 5-star service' },
        { icon: 'dollar', text: 'Best prices guaranteed in El Gouna' },
      ],
      image: 'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=800',
      imageAlt: 'El Gouna lagoon and marina view',
      ctaText: 'About Us',
      ctaLink: '/about',
      accentColor: 'from-cyan-600 to-cyan-700',
    },
    reviewsContent: {
      title: 'Guest Reviews',
      subtitle: 'Experiences from El Gouna visitors.',
      reviews: [
        { name: 'Oliver', country: 'Netherlands', review: 'Kitesurfing lesson was amazing! El Gouna has the perfect lagoons for beginners.', rating: 5, datePublished: '2025-09-05' },
        { name: 'Emma', country: 'France', review: 'Private yacht trip was worth every penny. Beautiful sunset and great crew.', rating: 5, datePublished: '2025-08-22' },
        { name: 'Thomas', country: 'Austria', review: 'Diving at Abu Nuhas was unforgettable. The shipwrecks are stunning!', rating: 5, datePublished: '2025-07-18' },
      ],
      showElfsightWidget: false,
    },
    faqContent: {
      title: 'FREQUENTLY ASKED QUESTIONS',
      faqs: [
        { question: 'What water sports are available in El Gouna?', answer: 'We offer kitesurfing, windsurfing, wakeboarding, diving, snorkeling, and paddleboarding.' },
        { question: 'Do you offer private yacht charters?', answer: 'Yes! We have a range of yacht options from half-day trips to full-day luxury charters.' },
        { question: 'Is El Gouna good for beginners in kitesurfing?', answer: 'Absolutely! The shallow lagoons are perfect for learning. We offer beginner courses daily.' },
        { question: 'Can I visit Hurghada from El Gouna?', answer: 'Yes, Hurghada is only 25 minutes away. We offer transfers and combined tour packages.' },
      ],
      ctaText: 'MORE INFO',
      ctaLink: '/faqs',
    },
    promoContent: {
      image: 'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=1200',
      imageAlt: 'El Gouna lagoon and marina',
      heading: 'Experience El Gouna',
      subheading: 'Lagoons, luxury & endless water adventures',
      description: 'Kitesurf turquoise lagoons, charter a private yacht, and explore vibrant coral reefs — El Gouna is the Red Sea Riviera.',
      primaryHref: '/tours',
      primaryText: 'Browse All Tours',
    },
  },

  'aswan-excursions': {
    aboutUsContent: {
      title: 'Why book with Aswan Excursions?',
      subtitle: 'Your gateway to Nubian heritage and ancient wonders.',
      features: [
        { icon: 'award', text: 'Expert-guided temple and heritage tours' },
        { icon: 'dollar', text: 'Best prices for Abu Simbel & Nile experiences' },
        { icon: 'smartphone', text: 'Instant booking confirmation on your phone' },
        { icon: 'calendar', text: 'Free cancellation up to 24 hours before' },
      ],
      image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800',
      imageAlt: 'Philae Temple on the Nile in Aswan',
      ctaText: 'More about us',
      ctaLink: '/about',
      accentColor: 'from-orange-600 to-orange-700',
    },
    reviewsContent: {
      title: 'What Our Guests Say',
      subtitle: 'Real stories from travellers who explored Aswan with us.',
      reviews: [
        { author: 'Thomas K.', rating: 5, text: 'The Abu Simbel sunrise tour was absolutely magical. Our guide was incredibly knowledgeable about the history.', tour: 'Abu Simbel Day Trip' },
        { author: 'Marie L.', rating: 5, text: 'The Nubian village visit was the highlight of our Egypt trip. Such warm hospitality and beautiful colours everywhere!', tour: 'Nubian Village Tour' },
        { author: 'Hans W.', rating: 5, text: 'Sunset felucca ride around Elephantine Island — pure bliss. The perfect way to end a day of temple visits.', tour: 'Felucca Nile Cruise' },
      ],
    },
    faqContent: {
      title: 'Frequently Asked Questions',
      subtitle: 'Everything you need to know about Aswan tours.',
      faqs: [
        { question: 'How early does the Abu Simbel trip depart?', answer: 'The Abu Simbel day trip departs around 3:00 AM to arrive for the stunning sunrise. The drive is approximately 3 hours each way.' },
        { question: 'What should I wear to visit temples?', answer: 'Comfortable shoes, sun hat, and light clothing. Temples have no dress code but modest clothing is respectful. Bring sunscreen and water.' },
        { question: 'Are felucca rides safe?', answer: 'Absolutely! Feluccas have been sailing the Nile for centuries. Our captains are experienced and life jackets are provided.' },
      ],
    },
    promoContent: {
      image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800',
      imageAlt: 'Ancient temples along the Nile in Aswan',
      heading: 'Discover Ancient Aswan',
      subheading: 'Temples, Nubian villages & Nile adventures',
      description: 'From the colossal Abu Simbel to peaceful felucca rides at sunset — explore the best of Upper Egypt with our expert local guides.',
      primaryHref: '/tours',
      primaryText: 'Explore Aswan Tours',
    },
  },

  'marsa-alam-excursions': {
    aboutUsContent: {
      title: 'Why book with Marsa Alam Excursions?',
      subtitle: 'Your experts for pristine reefs and marine encounters.',
      features: [
        { icon: 'award', text: 'Eco-friendly tours with marine biologist guides' },
        { icon: 'dollar', text: 'Best prices for dugong & reef experiences' },
        { icon: 'smartphone', text: 'Instant booking confirmation on your phone' },
        { icon: 'calendar', text: 'Free cancellation up to 24 hours before' },
      ],
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
      imageAlt: 'Crystal clear waters of Marsa Alam',
      ctaText: 'More about us',
      ctaLink: '/about',
      accentColor: 'from-emerald-600 to-emerald-700',
    },
    reviewsContent: {
      title: 'What Our Guests Say',
      subtitle: 'Real stories from marine adventurers.',
      reviews: [
        { author: 'Sophie M.', rating: 5, text: 'We swam with a dugong at Abu Dabbab! A once-in-a-lifetime experience. The guides were excellent at spotting wildlife.', tour: 'Dugong Snorkeling Tour' },
        { author: 'Klaus H.', rating: 5, text: 'Sataya Reef was incredible — pods of spinner dolphins all around us. The most beautiful reef I have ever seen.', tour: 'Sataya Dolphin Reef' },
        { author: 'Emma R.', rating: 5, text: 'The colours of the coral at Elphinstone are unreal. Saw a sea turtle within the first five minutes!', tour: 'Elphinstone Reef Dive' },
      ],
    },
    faqContent: {
      title: 'Frequently Asked Questions',
      subtitle: 'Everything you need to know about Marsa Alam marine tours.',
      faqs: [
        { question: 'When is the best time to see dugongs?', answer: 'Dugongs at Abu Dabbab can be seen year-round, but sightings are most frequent in the morning. We recommend early departures for the best chance.' },
        { question: 'Do I need diving experience?', answer: 'Not at all! Most of our popular tours are snorkeling-based. The reefs are shallow enough to enjoy from the surface.' },
        { question: 'How far are the reefs from shore?', answer: 'Many of our best sites like Abu Dabbab are accessible from the beach. Offshore reefs like Sataya and Elphinstone are reached by a comfortable boat ride.' },
      ],
    },
    promoContent: {
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
      imageAlt: 'Pristine reef and marine life in Marsa Alam',
      heading: 'Explore Marsa Alam',
      subheading: 'Pristine reefs, dugongs & untouched beauty',
      description: 'Swim with dugongs, discover vibrant coral reefs, and experience the Red Sea at its most pristine — Marsa Alam is nature\'s aquarium.',
      primaryHref: '/tours',
      primaryText: 'Explore Marine Tours',
    },
  },

  'dahab-excursions': {
    aboutUsContent: {
      title: 'Why book with Dahab Excursions?',
      subtitle: 'Your local guides to the Blue Hole and Sinai adventures.',
      features: [
        { icon: 'award', text: 'Local experts — we live and breathe Dahab' },
        { icon: 'dollar', text: 'Best prices for diving, trekking & safaris' },
        { icon: 'smartphone', text: 'Instant booking confirmation on your phone' },
        { icon: 'calendar', text: 'Free cancellation up to 24 hours before' },
      ],
      image: 'https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=800',
      imageAlt: 'Blue Hole diving spot in Dahab',
      ctaText: 'More about us',
      ctaLink: '/about',
      accentColor: 'from-amber-600 to-amber-700',
    },
    reviewsContent: {
      title: 'What Our Guests Say',
      subtitle: 'Real stories from Dahab adventurers.',
      reviews: [
        { author: 'Jake P.', rating: 5, text: 'Snorkeling at the Blue Hole was surreal — staring into that endless blue abyss. The reef around the rim is gorgeous too.', tour: 'Blue Hole Snorkeling' },
        { author: 'Anna S.', rating: 5, text: 'Watching sunrise from the top of Mount Sinai was deeply moving. The night trek was challenging but so worth it.', tour: 'Mount Sinai Trek' },
        { author: 'Luca B.', rating: 5, text: 'The Three Pools snorkeling was amazing — so colourful and peaceful. Followed by a Bedouin lunch in the desert. Perfect day!', tour: 'Three Pools & Safari' },
      ],
    },
    faqContent: {
      title: 'Frequently Asked Questions',
      subtitle: 'Everything you need to know about Dahab adventures.',
      faqs: [
        { question: 'Is the Blue Hole safe for snorkeling?', answer: 'Absolutely! The rim of the Blue Hole is only 6-8 metres deep with beautiful coral — perfect for snorkeling. The deep diving requires advanced certification.' },
        { question: 'How difficult is the Mount Sinai trek?', answer: 'It is a moderate trek suitable for most fitness levels. The "camel path" is the easier route (2-3 hours). Warm clothing is essential as the summit is cold even in summer.' },
        { question: 'What is the vibe in Dahab?', answer: 'Dahab is famously laid-back and bohemian. Think beachfront cafes, yoga retreats, and a friendly international community. Very different from resort towns like Sharm.' },
      ],
    },
    promoContent: {
      image: 'https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=800',
      imageAlt: 'The famous Blue Hole in Dahab',
      heading: 'Discover Dahab',
      subheading: 'Blue Hole, Sinai peaks & bohemian vibes',
      description: 'Dive the legendary Blue Hole, trek to the summit of Mount Sinai, and embrace the free-spirited magic of Dahab.',
      primaryHref: '/tours',
      primaryText: 'Explore Dahab Tours',
    },
  },

  'default': {
    aboutUsContent: {
      title: 'Why book with Egypt Excursions Online?',
      subtitle: 'With 15 years of experience, we are the travel experts.',
      features: [
        { icon: 'award', text: 'Official partner of top museums & attractions' },
        { icon: 'dollar', text: 'Best price guaranteed & simple booking process' },
        { icon: 'smartphone', text: 'No printer needed! Show your tickets on your smartphone' },
        { icon: 'calendar', text: 'Cancel for free up to 8 hours in advance' },
      ],
      image: '/about.png',
      imageAlt: 'A scenic view of Egypt\'s ancient wonders',
      ctaText: 'More about us',
      ctaLink: '/about',
      accentColor: 'from-red-600 to-red-700',
    },
    reviewsContent: {
      title: 'What Our Guests Say',
      subtitle: 'Real stories from our valued customers.',
      reviews: [
        {
          name: 'Aisha',
          country: 'Egypt',
          review: 'Amazing Nile sunset cruise—the guide was exceptional and the dinner unforgettable.',
          rating: 5,
          datePublished: '2024-11-12',
        },
        {
          name: 'Luca',
          country: 'Italy',
          review: 'Private pyramid tour at sunrise was once-in-a-lifetime. Highly recommended.',
          rating: 5,
          datePublished: '2024-10-02',
        },
        {
          name: 'Maya',
          country: 'UK',
          review: 'Seamless booking and the felucca ride on the Nile was so peaceful and beautiful.',
          rating: 5,
          datePublished: '2024-09-15',
        },
      ],
      showElfsightWidget: true,
    },
    faqContent: {
      title: 'FREQUENTLY ASKED QUESTIONS',
      faqs: [
        {
          question: 'Can I reschedule or cancel my tickets?',
          answer: 'Yes, in most cases you can reschedule or cancel your tickets up to 24 hours in advance.',
        },
        {
          question: 'How long are open tickets valid?',
          answer: 'Open tickets are typically valid for one year from the date of purchase.',
        },
        {
          question: 'What languages do the tour guides speak?',
          answer: 'Our tours are most commonly offered in English. Many also offer audio guides in multiple languages.',
        },
        {
          question: 'Is my booking confirmed instantly?',
          answer: 'Yes, most bookings are confirmed instantly after successful payment.',
        },
        {
          question: 'Do I need to print my ticket?',
          answer: 'No! All our tickets are mobile-friendly. Just show the e-ticket on your smartphone.',
        },
      ],
      ctaText: 'VIEW ALL',
      ctaLink: '/faqs',
    },
    promoContent: {
      image: '/pyramid2.jpg',
      imageAlt: 'Pyramids and desert landscape in Egypt',
      heading: 'Discover Egypt',
      subheading: 'Timeless wonders, Nile sunsets & ancient stories',
      description: 'Unveil the wonders of the Pharaohs — sail the Nile, explore the pyramids, and feel history come alive with curated luxury experiences.',
      primaryHref: '/egypt',
      primaryText: 'Explore Egypt',
    },
  },
};

async function seedHomepageContent() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    const tenantsCollection = db.collection('tenants');

    // Get all tenants
    const tenants = await tenantsCollection.find({}).toArray();
    console.log(`Found ${tenants.length} tenants`);

    for (const tenant of tenants) {
      const tenantId = tenant.tenantId;
      const content = TENANT_HOMEPAGE_CONTENT[tenantId] || TENANT_HOMEPAGE_CONTENT['default'];

      console.log(`\nUpdating homepage content for tenant: ${tenantId}`);

      const result = await tenantsCollection.updateOne(
        { tenantId },
        {
          $set: {
            'homepage.aboutUsContent': content.aboutUsContent,
            'homepage.reviewsContent': content.reviewsContent,
            'homepage.faqContent': content.faqContent,
            'homepage.promoContent': content.promoContent,
            'homepage.showPromoSection': true, // Enable promo section
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`  ✓ Updated ${tenantId} homepage content`);
      } else if (result.matchedCount > 0) {
        console.log(`  - ${tenantId} matched but no changes needed`);
      } else {
        console.log(`  ✗ ${tenantId} not found`);
      }
    }

    console.log('\n✅ Homepage content seeding complete!');
    console.log('\nYou can now preview the content using:');
    console.log('  https://eeo-main.netlify.app/?tenant=hurghada-speedboat');
    console.log('  https://eeo-main.netlify.app/?tenant=cairo-excursions-online');
    console.log('  https://eeo-main.netlify.app/?tenant=luxor-excursions');

  } catch (error) {
    console.error('Error seeding homepage content:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the seed function
seedHomepageContent();
