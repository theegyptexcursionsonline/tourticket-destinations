// types/index.ts

// =================================================================
// CORE ENTITIES
// =================================================================

export interface ImageMetadata {
  url: string;
  alt: string;
  title?: string;
}

export interface ContentFaq {
  question: string;
  answer: string;
}

export interface ContentTravelTip {
  title: string;
  content: string;
}

export interface User {
  _id: string;
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  favorites?: string[];
  bookings?: Booking[];
  createdAt?: string;
  updatedAt?: string;
  role?: string;
  permissions?: string[];
  isActive?: boolean;
  lastLoginAt?: string;
}

export interface Destination {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  country?: string;
  image: string;
  images?: string[];
  imageMetadata?: ImageMetadata[];
  description: string;
  longDescription?: string;
  featured?: boolean;
  tourCount?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  highlights?: string[];
  thingsToDo?: string[];
  localCustoms?: string[];
  bestTimeToVisit?: string;
  currency?: string;
  timezone?: string;
  visaRequirements?: string;
  languagesSpoken?: string[];
  emergencyNumber?: string;
  averageTemperature?: { summer?: string; winter?: string };
  climate?: string;
  weatherWarnings?: string[];
  faqs?: ContentFaq[];
  travelTips?: ContentTravelTip[];
  bestDealTourIds?: string[];
  topTourIds?: string[];
  isPublished?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// types/index.ts - Update the Category interface
export interface Category {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  longDescription?: string;
  heroImage?: string;
  images?: string[];
  imageMetadata?: ImageMetadata[];
  highlights?: string[];
  features?: string[];
  faqs?: ContentFaq[];
  travelTips?: ContentTravelTip[];
  popularDestinationIds?: Array<string | Destination>;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  color?: string;
  icon?: string;
  order?: number;
  isPublished?: boolean;
  featured?: boolean;
  tourCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
// =================================================================
// TOUR-SPECIFIC SUB-INTERFACES
// =================================================================

export interface AvailabilitySlot {
  time: string;
  capacity: number;
}

export interface Availability {
  type: 'daily' | 'date_range' | 'specific_dates';
  availableDays?: number[];
  startDate?: string;
  endDate?: string;
  specificDates?: string[];
  slots: AvailabilitySlot[];
  blockedDates?: string[];
}

export interface ItineraryItem {
  time?: string;
  title: string;
  description: string;
  duration?: string;
  location?: string;
  includes?: string[];
  icon?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface BookingOption {
  id?: string; // Stable id used for option-level stop-sale
  type: string;
  label: string;
  price: number;
  originalPrice?: number;
  description?: string;
  duration?: string;
  languages?: string[];
  highlights?: string[];
  groupSize?: string;
  difficulty?: string;
  badge?: string;
  discount?: number;
  isRecommended?: boolean;
}

export interface AddOn {
  name: string;
  description: string;
  price: number;
  category?: string;
  pricingMethod?: 'per_unit' | 'per_person';
}

// =================================================================
// TOUR & REVIEW INTERFACES
// =================================================================

export interface Tour {
  _id: string;
  id?: string | number;
  title: string;
  slug: string;
  image: string;
  images?: string[];
  imageMetadata?: ImageMetadata[];
  discountPrice: number;
  originalPrice?: number;
  price?: number;
  duration: string;
  rating?: number;
  bookings?: number;
  tags?: string[];
  description: string;
  longDescription?: string;
  highlights?: string[];
  includes?: string[];
  whatsIncluded?: string[];
  whatsNotIncluded?: string[];
  itinerary?: ItineraryItem[];
  faq?: FAQ[];
  bookingOptions?: BookingOption[];
  addOns?: AddOn[];
  isPublished?: boolean;
  isFeatured?: boolean;
  difficulty?: string;
  maxGroupSize?: number;
  meetingPoint?: string;
  languages?: string[];
  ageRestriction?: string;
  cancellationPolicy?: string;
  operatedBy?: string;
  destination: Destination | string;
  category: Category | string;
  availability?: Availability;
  reviews?: Review[];
  attractions?: (AttractionPage | string)[];
  interests?: (AttractionPage | string)[];
  whatToBring?: string[];
  whatToWear?: string[];
  physicalRequirements?: string;
  accessibilityInfo?: string[];
  groupSize?: { min: number; max: number };
  transportationDetails?: string;
  mealInfo?: string;
  weatherPolicy?: string;
  photoPolicy?: string;
  tipPolicy?: string;
  healthSafety?: string[];
  culturalInfo?: string[];
  seasonalVariations?: string;
  localCustoms?: string[];
  notSuitableFor?: string[];
  needToKnow?: string[];
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  translations?: Record<
    string,
    {
      title?: string;
      description?: string;
      longDescription?: string;
      location?: string;
      duration?: string;
      includes?: string[];
      highlights?: string[];
      whatsIncluded?: string[];
      whatsNotIncluded?: string[];
      tags?: string[];
      metaTitle?: string;
      metaDescription?: string;
      itinerary?: Array<{
        title?: string;
        description?: string;
        location?: string;
        includes?: string[];
      }>;
      faq?: Array<{
        question?: string;
        answer?: string;
      }>;
      bookingOptions?: Array<{
        label?: string;
        description?: string;
        badge?: string;
      }>;
      addOns?: Array<{
        name?: string;
        description?: string;
      }>;
    }
  >;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  _id: string;
  tour: string;
  user: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  comment: string;
  date?: string;
  verified?: boolean;
  helpful?: number;
  images?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// =================================================================
// ATTRACTION & CATEGORY PAGE INTERFACES
// =================================================================

export interface AttractionPage {
  _id: string;
  tenantId?: string;
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  pageType: 'attraction' | 'category';
  categoryId?: string | Category;
  urlType?: string;
  heroImage: string;
  images?: string[];
  highlights?: string[];
  features?: string[];
  gridTitle: string;
  gridSubtitle?: string;
  showStats?: boolean;
  itemsPerRow: number;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  isPublished: boolean;
  featured: boolean;
  createdAt?: string;
  updatedAt?: string;
  linkedTourIds?: string[];
  linkedPageIds?: string[];
  linkedCategoryIds?: string[];
  translations?: Record<string, Record<string, unknown>>;
}

export interface AttractionPageFormData {
  title: string;
  slug: string;
  description: string;
  longDescription: string;
  pageType: 'attraction' | 'category';
  categoryId: string;
  urlType: string;
  heroImage: string;
  images: string[];
  imageMetadata?: ImageMetadata[];
  highlights: string[];
  features: string[];
  faqs?: ContentFaq[];
  travelTips?: ContentTravelTip[];
  gridTitle: string;
  gridSubtitle: string;
  showStats: boolean;
  itemsPerRow: number;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  isPublished: boolean;
  featured: boolean;
  linkedTours?: string[];
  linkedPages?: string[];
  linkedCategories?: string[];
  translations?: Record<string, Record<string, unknown>>;
}

export interface CategoryPageData extends AttractionPage {
  category?: Category;
  tours: Tour[];
  totalTours: number;
  reviews?: Review[];
  linkedPages?: Array<{
    id: string;
    title: string;
    description?: string;
    image?: string;
    href: string;
    kind: 'page' | 'category';
  }>;
}

// =================================================================
// POPULATED INTERFACES
// =================================================================

export interface PopulatedTour extends Omit<Tour, 'destination' | 'category' | 'reviews'> {
  destination: Destination;
  category: Category;
  reviews?: Review[];
}

export interface DestinationWithTourCount extends Destination {
  tourCount: number;
}

// =================================================================
// CONTEXT & CLIENT-SIDE INTERFACES
// =================================================================

export interface CartItem extends Tour {
  uniqueId: string;
  quantity: number;
  childQuantity: number;
  infantQuantity: number;
  selectedDate: string;
  selectedTime: string;
  selectedAddOns: { [key: string]: number };
  selectedAddOnDetails?: {
    [key: string]: {
      id: string;
      title: string;
      price: number;
      category: string;
      perGuest: boolean;
    }
  };
  selectedBookingOption?: {
    id: string;
    title: string;
    price: number;
    originalPrice?: number;
    duration?: string;
    badge?: string;
  };
  totalPrice: number;
}

export interface Booking {
  _id: string;
  bookingReference?: string;
  tour: Tour | string;
  user: User | string;
  bookingDate: string;
  dateString?: string; // YYYY-MM-DD format - timezone-safe for display
  date?: string | Date; // MongoDB date field
  bookingTime: string;
  adults: number;
  children: number;
  infants: number;
  totalPrice: number;
  status:
    | 'Confirmed'
    | 'Pending'
    | 'Completed'
    | 'Cancelled'
    | 'Refunded'
    | 'Partial Refunded'
    // Backward compatibility
    | 'confirmed'
    | 'pending'
    | 'completed'
    | 'cancelled'
    | 'refunded'
    | 'partial_refunded';
  paymentId?: string;
  paymentMethod?: string;
  specialRequests?: string;
  emergencyContact?: string;
  selectedAddOns?: { [key: string]: number };
  createdAt: string;
  updatedAt: string;
}

// =================================================================
// BLOG & CONTENT INTERFACES
// =================================================================

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  images?: string[];
  category: string;
  tags: string[];
  author: string;
  authorAvatar?: string;
  authorBio?: string;
  metaTitle?: string;
  metaDescription?: string;
  readTime: number;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: string;
  scheduledFor?: string;
  featured: boolean;
  allowComments: boolean;
  views: number;
  likes: number;
  relatedDestinations?: Destination[];
  relatedTours?: Tour[];
  createdAt?: string;
  updatedAt?: string;
}

// =================================================================
// UTILITY & OTHER INTERFACES
// =================================================================

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface SearchFilters {
  destination?: string;
  category?: string;
  priceRange?: [number, number];
  duration?: string;
  rating?: number;
  dateRange?: [string, string];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// =================================================================
// ADMIN-SPECIFIC INTERFACES
// =================================================================

export interface AdminStats {
  totalTours: number;
  totalBookings: number;
  totalUsers: number;
  totalRevenue: number;
  recentBookingsCount: number;
  recentActivities: Array<{
    id: string;
    text: string;
  }>;
}

export interface TourFormData {
  title: string;
  slug: string;
  description: string;
  longDescription: string;
  duration: string;
  discountPrice: string | number;
  originalPrice: string | number;
  destination: string;
  category: string;
  image: string;
  images: string[];
  highlights: string[];
  includes: string[];
  whatsIncluded: string[];
  whatsNotIncluded: string[];
  itinerary: ItineraryItem[];
  faqs: FAQ[];
  bookingOptions: BookingOption[];
  addOns: AddOn[];
  isPublished: boolean;
  difficulty: string;
  maxGroupSize: number;
  tags: string;
  isFeatured: boolean;
  availability: Availability;
  attractions?: string[];
  interests?: string[];
}
