// lib/models/Tour.ts
 
import mongoose, { Document, Schema, Model } from 'mongoose';
import crypto from 'crypto';
import './Review';

export interface IItineraryItem {
  time?: string;
  title: string;
  description: string;
  duration?: string;
  location?: string;
  includes?: string[];
  icon?: string;
  day?: number;
}

export interface IAvailabilitySlot {
  time: string;
  capacity: number;
}

export interface IAvailability extends Document {
  type: 'daily' | 'date_range' | 'specific_dates';
  availableDays?: number[];
  startDate?: Date;
  endDate?: Date;
  specificDates?: Date[];
  slots: IAvailabilitySlot[];
  blockedDates?: Date[];
}

export interface IFAQ {
  question: string;
  answer: string;
}

export interface IBookingOption {
  id?: string; // Stable option id used for option-level stop-sale
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

export interface IAddOn {
  name: string;
  description: string;
  price: number;
  category?: string;
}

// Complete Tour Interface
export interface ITour extends Document {
  // Multi-tenant support
  tenantId: string;
  
  // Basic fields
  title: string;
  slug: string;
  destination: mongoose.Schema.Types.ObjectId;
  category: mongoose.Schema.Types.ObjectId | mongoose.Schema.Types.ObjectId[];
  description: string;
  longDescription?: string;
  price?: number;
  originalPrice?: number;
  discountPrice: number;
  duration: string;
  difficulty?: string;
  maxGroupSize?: number;
  location?: string;

  // Media
  image: string;
  images?: string[];

  // Lists and highlights
  includes?: string[];
  highlights?: string[];
  whatsIncluded?: string[];
  whatsNotIncluded?: string[];
  tags?: string[];

  // Enhanced content
  itinerary?: IItineraryItem[];
  faq?: IFAQ[];
  bookingOptions?: IBookingOption[];
  addOns?: IAddOn[];

  // Practical information
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
  meetingPoint?: string;
  languages?: string[];
  ageRestriction?: string;
  cancellationPolicy?: string;
  operatedBy?: string;

  // Status
  isFeatured?: boolean;
  isPublished?: boolean;

  // Relationships
  reviews?: mongoose.Schema.Types.ObjectId[];
  availability: IAvailability;
  attractions?: mongoose.Schema.Types.ObjectId[]; // Link to AttractionPage
  interests?: mongoose.Schema.Types.ObjectId[]; // Link to AttractionPage (interest type)

  // Meta
  rating?: number;
  bookings?: number;
  createdAt?: Date;
  updatedAt?: Date;
  
  // SEO fields
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];

  // Virtual fields
  reviewDetails?: unknown[];
}

const ItineraryItemSchema = new Schema<IItineraryItem>({
  time: { type: String },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  duration: { type: String, trim: true },
  location: { type: String, trim: true },
  includes: [{ type: String, trim: true }],
  icon: {
    type: String,
    default: 'location',
  },
  day: { type: Number, min: 1 },
}, { _id: false });

const AvailabilitySlotSchema = new Schema<IAvailabilitySlot>({
  time: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v: string) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Time must be in HH:MM format'
    }
  },
  capacity: { 
    type: Number, 
    required: true, 
    min: [1, 'Capacity must be at least 1'],
    max: [1000, 'Capacity cannot exceed 1000']
  },
}, { _id: false });

const AvailabilitySchema = new Schema<IAvailability>({
  type: {
    type: String,
    enum: ['daily', 'date_range', 'specific_dates'],
    required: true,
    default: 'daily',
  },
  availableDays: {
    type: [Number],
    default: [0, 1, 2, 3, 4, 5, 6],
    validate: {
      validator: function(days: number[]) {
        return days.every(day => day >= 0 && day <= 6) && days.length <= 7;
      },
      message: 'Available days must be between 0-6 (Sunday-Saturday) and maximum 7 days'
    }
  },
  startDate: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return !v || v >= new Date();
      },
      message: 'Start date must be in the future'
    }
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return !v || !this.startDate || v > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  specificDates: [{
    type: Date,
    validate: {
      validator: function(v: Date) {
        return v >= new Date();
      },
      message: 'Specific dates must be in the future'
    }
  }],
  slots: {
    type: [AvailabilitySlotSchema],
    required: true,
    default: [{ time: '10:00', capacity: 10 }],
    validate: {
      validator: function(slots: IAvailabilitySlot[]) {
        return slots.length > 0 && slots.length <= 20;
      },
      message: 'Must have between 1 and 20 time slots'
    }
  },
  blockedDates: [{
    type: Date,
    index: true
  }],
}, { _id: false });

const FAQSchema = new Schema<IFAQ>({
  question: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: [5, 'Question must be at least 5 characters'],
    maxlength: [500, 'Question cannot exceed 500 characters']
  },
  answer: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: [10, 'Answer must be at least 10 characters'],
    maxlength: [2000, 'Answer cannot exceed 2000 characters']
  },
}, { _id: false });

const BookingOptionSchema = new Schema<IBookingOption>({
  id: {
    type: String,
    default: () => crypto.randomUUID(),
    index: true,
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  label: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: [2, 'Label must be at least 2 characters'],
    maxlength: [100, 'Label cannot exceed 100 characters']
  },
  price: { 
    type: Number, 
    required: true, 
    min: [0, 'Price cannot be negative'],
    max: [999999, 'Price cannot exceed 999999']
  },
  originalPrice: { 
    type: Number, 
    min: [0, 'Original price cannot be negative'],
    max: [999999, 'Original price cannot exceed 999999']
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  duration: { 
    type: String, 
    trim: true,
    maxlength: [50, 'Duration cannot exceed 50 characters']
  },
  languages: [{ 
    type: String, 
    trim: true,
    maxlength: [50, 'Language cannot exceed 50 characters']
  }],
  highlights: [{ 
    type: String, 
    trim: true,
    maxlength: [200, 'Highlight cannot exceed 200 characters']
  }],
  groupSize: { 
    type: String, 
    trim: true,
    maxlength: [50, 'Group size cannot exceed 50 characters']
  },
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Moderate', 'Challenging', 'Difficult'],
    trim: true 
  },
  badge: { 
    type: String, 
    trim: true,
    maxlength: [50, 'Badge cannot exceed 50 characters']
  },
  discount: { 
    type: Number, 
    min: [0, 'Discount cannot be negative'], 
    max: [100, 'Discount cannot exceed 100%']
  },
  isRecommended: { type: Boolean, default: false },
  // NOTE: keep _id disabled; we use `id` as the stable identifier
}, { _id: false });

const AddOnSchema = new Schema<IAddOn>({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: [2, 'Add-on name must be at least 2 characters'],
    maxlength: [100, 'Add-on name cannot exceed 100 characters']
  },
  description: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: [10, 'Add-on description must be at least 10 characters'],
    maxlength: [500, 'Add-on description cannot exceed 500 characters']
  },
  price: { 
    type: Number, 
    required: true, 
    min: [0, 'Add-on price cannot be negative'],
    max: [99999, 'Add-on price cannot exceed 99999']
  },
  category: {
    type: String,
    trim: true
  }
}, { _id: false });

// COMPLETE Tour Schema with all fields and validation
const TourSchema: Schema<ITour> = new Schema({
  // Multi-tenant support
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    ref: 'Tenant',
  },
  
  // Basic fields
  title: { 
    type: String, 
    required: [true, 'Tour title is required'], 
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: true
  },
  slug: { 
    type: String, 
    required: [true, 'Slug is required'], 
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    minlength: [3, 'Slug must be at least 3 characters'],
    maxlength: [100, 'Slug cannot exceed 100 characters'],
    index: true
  },
  destination: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Destination', 
    required: [true, 'Destination is required'],
    index: true,
    validate: {
      validator: function(v: any) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid destination ID'
    }
  },
  category: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'At least one category is required'],
    index: true,
    validate: {
      validator: function(v: any) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid category ID'
    }
  }],
  description: { 
    type: String, 
    required: [true, 'Description is required'],
    trim: true,
    minlength: [20, 'Description must be at least 20 characters'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  longDescription: { 
    type: String,
    trim: true,
    maxlength: [5000, 'Long description cannot exceed 5000 characters']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters'],
    index: true
  },
  price: { 
    type: Number,
    min: [0, 'Price cannot be negative'],
    max: [999999, 'Price cannot exceed 999999']
  },
  originalPrice: { 
    type: Number,
    min: [0, 'Original price cannot be negative'],
    max: [999999, 'Original price cannot exceed 999999']
  },
  discountPrice: { 
    type: Number, 
    required: [true, 'Discount price is required'],
    min: [0, 'Discount price cannot be negative'],
    max: [999999, 'Discount price cannot exceed 999999'],
    index: true
  },
  duration: { 
    type: String, 
    required: [true, 'Duration is required'],
    trim: true,
    minlength: [1, 'Duration must be specified'],
    maxlength: [100, 'Duration cannot exceed 100 characters']
  },
  difficulty: { 
    type: String, 
    default: 'Easy',
    enum: {
      values: ['Easy', 'Moderate', 'Challenging', 'Difficult'],
      message: 'Difficulty must be Easy, Moderate, Challenging, or Difficult'
    },
    index: true
  },
  maxGroupSize: { 
    type: Number, 
    default: 10,
    min: [1, 'Max group size must be at least 1'],
    max: [1000, 'Max group size cannot exceed 1000']
  },

  // Media
  image: {
    type: String,
    required: [true, 'Main image is required'],
    trim: true,
  },
  images: [{
    type: String,
    trim: true,
  }],

  // Lists
  includes: [{ 
    type: String,
    trim: true,
    maxlength: [300, 'Include item cannot exceed 300 characters']
  }],
  highlights: [{ 
    type: String,
    trim: true,
    maxlength: [300, 'Highlight cannot exceed 300 characters']
  }],
  whatsIncluded: [{ 
    type: String,
    trim: true,
    maxlength: [300, 'Included item cannot exceed 300 characters']
  }],
  whatsNotIncluded: [{ 
    type: String,
    trim: true,
    maxlength: [300, 'Not included item cannot exceed 300 characters']
  }],
  tags: [{ 
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],

  // Enhanced content
  itinerary: {
    type: [ItineraryItemSchema],
    validate: {
      validator: function(arr: IItineraryItem[]) {
        return arr.length <= 30;
      },
      message: 'Cannot have more than 30 itinerary items'
    }
  },
  faq: { 
    type: [FAQSchema], 
    default: [],
    validate: {
      validator: function(arr: IFAQ[]) {
        return arr.length <= 20;
      },
      message: 'Cannot have more than 20 FAQ items'
    }
  },
  bookingOptions: {
    type: [BookingOptionSchema],
    validate: {
      validator: function(arr: IBookingOption[]) {
        return arr.length <= 10;
      },
      message: 'Cannot have more than 10 booking options'
    }
  },
  addOns: {
    type: [AddOnSchema],
    validate: {
      validator: function(arr: IAddOn[]) {
        return arr.length <= 20;
      },
      message: 'Cannot have more than 20 add-ons'
    }
  },

  // Practical information
  whatToBring: [{ 
    type: String,
    trim: true,
    maxlength: [200, 'What to bring item cannot exceed 200 characters']
  }],
  whatToWear: [{ 
    type: String,
    trim: true,
    maxlength: [200, 'What to wear item cannot exceed 200 characters']
  }],
  physicalRequirements: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Physical requirements cannot exceed 1000 characters']
  },
  accessibilityInfo: [{ 
    type: String,
    trim: true,
    maxlength: [300, 'Accessibility info item cannot exceed 300 characters']
  }],
  groupSize: {
    min: { 
      type: Number, 
      default: 1, 
      min: [1, 'Minimum group size must be at least 1'],
      max: [100, 'Minimum group size cannot exceed 100']
    },
    max: { 
      type: Number, 
      default: 10, 
      min: [1, 'Maximum group size must be at least 1'],
      max: [1000, 'Maximum group size cannot exceed 1000']
    }
  },
  transportationDetails: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Transportation details cannot exceed 1000 characters']
  },
  mealInfo: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Meal info cannot exceed 1000 characters']
  },
  weatherPolicy: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Weather policy cannot exceed 1000 characters']
  },
  photoPolicy: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Photo policy cannot exceed 1000 characters']
  },
  tipPolicy: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Tip policy cannot exceed 1000 characters']
  },
  healthSafety: [{ 
    type: String,
    trim: true,
    maxlength: [500, 'Health safety item cannot exceed 500 characters']
  }],
  culturalInfo: [{ 
    type: String,
    trim: true,
    maxlength: [500, 'Cultural info item cannot exceed 500 characters']
  }],
  seasonalVariations: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Seasonal variations cannot exceed 1000 characters']
  },
  localCustoms: [{ 
    type: String,
    trim: true,
    maxlength: [500, 'Local custom cannot exceed 500 characters']
  }],
  meetingPoint: { 
    type: String,
    trim: true,
    maxlength: [500, 'Meeting point cannot exceed 500 characters']
  },
  languages: [{ 
    type: String,
    trim: true,
    maxlength: [50, 'Language cannot exceed 50 characters']
  }],
  ageRestriction: { 
    type: String,
    trim: true,
    maxlength: [200, 'Age restriction cannot exceed 200 characters']
  },
  cancellationPolicy: { 
    type: String,
    trim: true,
    maxlength: [2000, 'Cancellation policy cannot exceed 2000 characters']
  },
  operatedBy: { 
    type: String,
    trim: true,
    maxlength: [200, 'Operated by cannot exceed 200 characters']
  },

  // Status
  isFeatured: { 
    type: Boolean, 
    default: false,
    index: true
  },
  isPublished: { 
    type: Boolean, 
    default: true,
    index: true
  },

  // Meta
  rating: { 
    type: Number, 
    default: 4.5,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5'],
    index: true
  },
  bookings: { 
    type: Number, 
    default: 0,
    min: [0, 'Bookings cannot be negative'],
    index: true
  },
  
  // Relationships
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  availability: {
    type: AvailabilitySchema,
    required: true,
    default: () => ({
      type: 'daily',
      availableDays: [0, 1, 2, 3, 4, 5, 6],
      slots: [{ time: '10:00', capacity: 10 }]
    })
  },
  attractions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttractionPage',
    index: true,
    validate: {
      validator: function(v: any) {
        return !v || mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid attraction ID'
    }
  }],
  interests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttractionPage',
    index: true,
    validate: {
      validator: function(v: any) {
        return !v || mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid interest ID'
    }
  }],
  
  // SEO fields
  metaTitle: { 
    type: String, 
    trim: true,
    maxlength: [60, 'Meta title cannot exceed 60 characters']
  },
  metaDescription: { 
    type: String, 
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  keywords: [{ 
    type: String, 
    trim: true,
    lowercase: true,
    maxlength: [50, 'Keyword cannot exceed 50 characters']
  }],
}, { 
  timestamps: true,
  collection: 'tours',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual property for review details
TourSchema.virtual('reviewDetails', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'tour',
  justOne: false
});

// Validation for group size consistency
TourSchema.pre('validate', function(next) {
  if (this.groupSize && this.groupSize.min && this.groupSize.max) {
    if (this.groupSize.min > this.groupSize.max) {
      return next(new Error('Minimum group size cannot be greater than maximum group size'));
    }
  }
  next();
});

// Pre-save middleware for slug generation and validation
TourSchema.pre('save', async function(next) {
  try {
    // Generate slug if title is modified and slug is not manually set
    if (this.isModified('title') && (!this.slug || !this.isModified('slug'))) {
      let baseSlug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')         // Replace spaces with hyphens
        .replace(/-+/g, '-')          // Replace multiple hyphens with single
        .replace(/^-+|-+$/g, '');     // Remove leading/trailing hyphens
      
      // Reserved words that cannot be used as tour slugs
      const reservedSlugs = [
        'admin', 'api', 'auth', 'login', 'signup', 'destinations', 
        'categories', 'blog', 'about', 'contact', 'privacy', 'terms', 
        'cart', 'checkout', 'profile', 'bookings', 'wishlist', 'search',
        'help', 'support', 'careers', 'press', 'partners', 'tours',
        'experiences', 'activities', 'booking', 'payment', 'confirmation',
        'sitemap', 'robots', 'manifest', 'favicon', 'images', 'uploads',
        'static', '_next', 'monitoring', 'dashboard', 'settings', 'account',
        'reviews', 'ratings', 'gallery', 'pricing', 'schedule', 'calendar'
      ];
      
      // If slug conflicts with reserved words, prefix with 'tour-'
      if (reservedSlugs.includes(baseSlug)) {
        baseSlug = `tour-${baseSlug}`;
      }
      
      // Check for existing slugs and append number if needed
      let slug = baseSlug;
      let counter = 1;
      
      while (await this.constructor.findOne({ 
        slug, 
        _id: { $ne: this._id } 
      }).lean()) {
        slug = `${baseSlug}-${counter}`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 1000) {
          slug = `${baseSlug}-${Date.now()}`;
          break;
        }
      }
      
      this.slug = slug;
    }
    
    // Validation for price consistency
    if (this.originalPrice && this.discountPrice && this.discountPrice > this.originalPrice) {
      return next(new Error('Discount price cannot be higher than original price'));
    }
    
    // Auto-generate meta title if not provided
    if (!this.metaTitle && this.title) {
      this.metaTitle = this.title.length > 60 ? 
        this.title.substring(0, 57) + '...' : 
        this.title;
    }
    
    // Auto-generate meta description if not provided
    if (!this.metaDescription && this.description) {
      this.metaDescription = this.description.length > 160 ? 
        this.description.substring(0, 157) + '...' : 
        this.description;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Post-save hook to sync to Algolia
TourSchema.post('save', async function(doc) {
  try {
    // Only sync if tour is published
    if (doc.isPublished) {
      // Dynamic import to avoid circular dependencies
      const { syncTourToAlgolia } = await import('../algolia');

      // Populate category and destination before syncing
      await doc.populate('category', 'name');
      await doc.populate('destination', 'name');

      await syncTourToAlgolia(doc);
      console.log(`Auto-synced tour ${doc._id} to Algolia`);
    }
  } catch (error) {
    // Log error but don't fail the save operation
    console.error('Error auto-syncing tour to Algolia:', error);
  }
});

// Post-delete hook to remove from Algolia
TourSchema.post('findOneAndDelete', async function(doc) {
  try {
    if (doc) {
      // Dynamic import to avoid circular dependencies
      const { deleteTourFromAlgolia } = await import('../algolia');
      await deleteTourFromAlgolia(doc._id.toString());
      console.log(`Auto-deleted tour ${doc._id} from Algolia`);
    }
  } catch (error) {
    console.error('Error auto-deleting tour from Algolia:', error);
  }
});

TourSchema.post('deleteOne', async function(doc) {
  try {
    if (doc) {
      const { deleteTourFromAlgolia } = await import('../algolia');
      await deleteTourFromAlgolia(doc._id.toString());
      console.log(`Auto-deleted tour ${doc._id} from Algolia`);
    }
  } catch (error) {
    console.error('Error auto-deleting tour from Algolia:', error);
  }
});

// Text search indexes for flexible search
TourSchema.index({
  title: 'text',
  description: 'text',
  location: 'text',
  tags: 'text',
  highlights: 'text',
  longDescription: 'text'
}, {
  weights: {
    title: 10,
    location: 8,
    tags: 6,
    highlights: 5,
    description: 3,
    longDescription: 1
  },
  name: 'tour_text_index'
});

// Multi-tenant indexes - CRITICAL for performance
// Slug must be unique per tenant, not globally
TourSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
TourSchema.index({ tenantId: 1, isPublished: 1 });
TourSchema.index({ tenantId: 1, isFeatured: 1, isPublished: 1 });
TourSchema.index({ tenantId: 1, destination: 1, isPublished: 1 });
TourSchema.index({ tenantId: 1, category: 1, isPublished: 1 });
TourSchema.index({ tenantId: 1, createdAt: -1 });

// Additional performance indexes (with tenant)
TourSchema.index({ tenantId: 1, rating: -1, bookings: -1 });
TourSchema.index({ tenantId: 1, discountPrice: 1, isPublished: 1 });
TourSchema.index({ tenantId: 1, difficulty: 1, isPublished: 1 });

// Compound indexes for common query patterns (with tenant)
TourSchema.index({ 
  tenantId: 1,
  category: 1, 
  destination: 1, 
  isPublished: 1 
});

TourSchema.index({ 
  tenantId: 1,
  discountPrice: 1, 
  rating: -1, 
  isPublished: 1 
});

TourSchema.index({
  tenantId: 1,
  isFeatured: 1,
  rating: -1,
  bookings: -1,
  isPublished: 1
});

// Geospatial index if you add coordinates later
TourSchema.index({ "coordinates": "2dsphere" });

// Static methods for common operations (all include tenantId for multi-tenant support)
TourSchema.statics.findPublished = function(tenantId?: string) {
  const query: any = { isPublished: true };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query);
};

TourSchema.statics.findFeatured = function(tenantId?: string) {
  const query: any = { isFeatured: true, isPublished: true };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query);
};

TourSchema.statics.findByCategory = function(categoryId: string, tenantId?: string) {
  const query: any = { 
    category: categoryId, 
    isPublished: true 
  };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query);
};

TourSchema.statics.findByDestination = function(destinationId: string, tenantId?: string) {
  const query: any = { 
    destination: destinationId, 
    isPublished: true 
  };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query);
};

TourSchema.statics.searchTours = function(query: string, tenantId?: string) {
  const searchQuery: any = {
    $text: { $search: query },
    isPublished: true
  };
  if (tenantId) searchQuery.tenantId = tenantId;
  
  return this.find(searchQuery, {
    score: { $meta: "textScore" }
  }).sort({
    score: { $meta: "textScore" }
  });
};

// Check if slug is available within a tenant
TourSchema.statics.isSlugAvailable = async function(slug: string, tenantId: string, excludeId?: string) {
  const query: any = { slug, tenantId };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const existing = await this.findOne(query).lean();
  return !existing;
};

// Generate unique slug within a tenant
TourSchema.statics.generateUniqueSlug = async function(baseSlug: string, tenantId: string, excludeId?: string) {
  let slug = baseSlug;
  let counter = 1;
  
  while (!(await this.isSlugAvailable(slug, tenantId, excludeId))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    
    if (counter > 1000) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }
  
  return slug;
};

// Find tour by slug within a tenant
TourSchema.statics.findBySlug = async function(slug: string, tenantId: string) {
  return this.findOne({ slug, tenantId, isPublished: true });
};

// Find tour by slug across all tenants (for admin)
TourSchema.statics.findBySlugGlobal = async function(slug: string) {
  return this.findOne({ slug });
};

// Instance methods
TourSchema.methods.updateRating = async function() {
  try {
    const Review = mongoose.model('Review');
    const stats = await Review.aggregate([
      { $match: { tour: this._id } },
      { $group: { 
        _id: null, 
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }}
    ]);
    
    if (stats.length > 0) {
      this.rating = Math.round(stats[0].avgRating * 10) / 10;
      await this.save();
    }
  } catch (error) {
    console.error('Error updating tour rating:', error);
  }
};

TourSchema.methods.incrementBookings = async function() {
  try {
    this.bookings = (this.bookings || 0) + 1;
    await this.save();
  } catch (error) {
    console.error('Error incrementing bookings:', error);
  }
};

TourSchema.methods.generateSlug = async function() {
  if (!this.title) return;
  
  const baseSlug = this.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  this.slug = await this.constructor.generateUniqueSlug(baseSlug, this._id);
};

// Create and export the model
const Tour: Model<ITour> = mongoose.models.Tour || mongoose.model<ITour>('Tour', TourSchema);

export default Tour;

// Export additional types for use in other files
export type { ITour, IItineraryItem, IAvailability, IFAQ, IBookingOption, IAddOn };