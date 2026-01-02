// lib/models/SpecialOffer.ts
/**
 * SPECIAL OFFERS MODULE
 * 
 * This module handles various types of promotional offers for tours:
 * 
 * OFFER TYPES:
 * 
 * 1. PERCENTAGE DISCOUNT (type: 'percentage')
 *    - Applies X% off the base price
 *    - Example: 20% off = $100 becomes $80
 *    - Uses: discountValue (0-100)
 * 
 * 2. FIXED AMOUNT (type: 'fixed')
 *    - Subtracts a fixed amount from the price
 *    - Example: $15 off = $100 becomes $85
 *    - Uses: discountValue (dollar amount)
 * 
 * 3. EARLY BIRD (type: 'early_bird')
 *    - Discount for bookings made X days in advance of tour date
 *    - Example: Book 14+ days ahead, get 10% off
 *    - Uses: minDaysInAdvance, discountValue
 * 
 * 4. LAST MINUTE (type: 'last_minute')
 *    - Discount for bookings made close to the tour date
 *    - Example: Book within 48 hours (2 days), get 15% off
 *    - Uses: maxDaysBeforeTour, discountValue
 * 
 * 5. GROUP DISCOUNT (type: 'group')
 *    - Discount when booking for multiple people
 *    - Example: Book for 5+ people, get 10% off
 *    - Uses: minGroupSize, discountValue
 * 
 * 6. BUNDLE DEAL (type: 'bundle')
 *    - Special pricing for tour packages/combinations
 *    - Uses: discountValue, applicableTours (multiple tours)
 * 
 * 7. PROMO CODE (type: 'promo_code')
 *    - Requires code entry at checkout
 *    - Uses: code, discountValue, usageLimit
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for option-level selection
export interface ITourOptionSelection {
  tourId: mongoose.Types.ObjectId;
  tourTitle?: string; // Populated from Tour
  selectedOptions?: string[]; // Array of option types (e.g., "private-tour", "group-tour")
  allOptions?: boolean; // If true, offer applies to all options of this tour
}

// Offer type definition
export type OfferType = 'percentage' | 'fixed' | 'bundle' | 'early_bird' | 'last_minute' | 'group' | 'promo_code';

export interface ISpecialOffer extends Document {
  name: string;
  description?: string;
  type: OfferType;
  discountValue: number; // Percentage (0-100) for percentage type, or dollar amount for fixed
  
  // Promo code specific
  code?: string;
  
  // Early bird specific - minimum days before tour to qualify
  minDaysInAdvance?: number;
  
  // Last minute specific - maximum days before tour to qualify
  maxDaysBeforeTour?: number;
  
  // Booking constraints
  minBookingValue?: number;
  maxDiscount?: number; // Cap on maximum discount amount
  minGroupSize?: number; // For group discount type
  
  // Validity period (when the offer can be used)
  startDate: Date;
  endDate: Date;
  
  // Travel date restrictions (when the tour must occur)
  travelStartDate?: Date;
  travelEndDate?: Date;
  
  // Legacy booking window (kept for backward compatibility)
  bookingWindow?: {
    daysBeforeTravel?: number;
    daysAfterRelease?: number;
  };
  
  // Tour targeting
  applicableTours: mongoose.Types.ObjectId[];
  tourOptionSelections?: ITourOptionSelection[]; // Option-level selections
  applicableCategories?: mongoose.Types.ObjectId[];
  excludedTours?: mongoose.Types.ObjectId[];
  
  // Usage limits
  usageLimit?: number; // Total usage limit
  usedCount: number;
  perUserLimit?: number; // Usage limit per user
  
  // Status and display
  isActive: boolean;
  isFeatured: boolean;
  featuredBadgeText?: string;
  priority: number; // Higher priority offers take precedence
  
  // Multi-tenant
  tenantId: string;
  
  // Terms and conditions
  terms?: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Sub-schema for tour option selections
const TourOptionSelectionSchema = new Schema({
  tourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: true,
  },
  selectedOptions: [{
    type: String,
    trim: true,
  }],
  allOptions: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const SpecialOfferSchema: Schema<ISpecialOffer> = new Schema({
  name: {
    type: String,
    required: [true, 'Offer name is required'],
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'bundle', 'early_bird', 'last_minute', 'group', 'promo_code'],
    required: true,
    default: 'percentage',
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  // Promo code
  code: {
    type: String,
    trim: true,
    uppercase: true,
    sparse: true,
  },
  // Early bird: minimum days before tour date to qualify
  minDaysInAdvance: {
    type: Number,
    min: 1,
    default: 7, // Default: book 7+ days ahead
  },
  // Last minute: maximum days before tour to qualify
  maxDaysBeforeTour: {
    type: Number,
    min: 0,
    default: 2, // Default: within 2 days of tour
  },
  // Booking constraints
  minBookingValue: {
    type: Number,
    min: 0,
  },
  maxDiscount: {
    type: Number,
    min: 0,
  },
  minGroupSize: {
    type: Number,
    min: 2,
  },
  // Validity period
  startDate: {
    type: Date,
    required: true,
    index: true,
  },
  endDate: {
    type: Date,
    required: true,
    index: true,
  },
  // Travel date restrictions
  travelStartDate: {
    type: Date,
  },
  travelEndDate: {
    type: Date,
  },
  // Legacy booking window
  bookingWindow: {
    daysBeforeTravel: Number,
    daysAfterRelease: Number,
  },
  // Tour targeting
  applicableTours: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
  }],
  // Enhanced option-level selections
  tourOptionSelections: [TourOptionSelectionSchema],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  excludedTours: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
  }],
  usageLimit: {
    type: Number,
    min: 0,
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  perUserLimit: {
    type: Number,
    min: 1,
    default: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  featuredBadgeText: {
    type: String,
    trim: true,
    default: 'Special Offer',
  },
  priority: {
    type: Number,
    default: 0,
  },
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
  },
  terms: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true,
});

// Indexes
SpecialOfferSchema.index({ tenantId: 1, isActive: 1, startDate: 1, endDate: 1 });
SpecialOfferSchema.index({ code: 1, tenantId: 1 }, { unique: true, sparse: true });

// Virtual to check if offer is currently valid
SpecialOfferSchema.virtual('isCurrentlyValid').get(function(this: ISpecialOffer) {
  const now = new Date();
  return this.isActive && 
         now >= this.startDate && 
         now <= this.endDate &&
         (!this.usageLimit || this.usedCount < this.usageLimit);
});

// Static method to find active offers
SpecialOfferSchema.statics.findActiveOffers = async function(
  tenantId: string,
  tourId?: string,
  categoryId?: string
) {
  const now = new Date();
  
  // Build the $and array for complex conditions
  const andConditions: Record<string, unknown>[] = [];
  
  // Base query
  const query: Record<string, unknown> = {
    tenantId,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    // Usage limit check
    $or: [
      { usageLimit: { $exists: false } },
      { usageLimit: null },
      { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
    ],
  };

  if (tourId) {
    andConditions.push({
      $or: [
        { applicableTours: { $size: 0 } },
        { applicableTours: tourId },
      ],
    });
    andConditions.push({
      excludedTours: { $ne: tourId },
    });
  }

  if (categoryId) {
    andConditions.push({
      $or: [
        { applicableCategories: { $size: 0 } },
        { applicableCategories: categoryId },
      ],
    });
  }

  // Add $and conditions if any exist
  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  return this.find(query).sort({ priority: -1, discountValue: -1 });
};

const SpecialOffer: Model<ISpecialOffer> = mongoose.models.SpecialOffer || 
  mongoose.model<ISpecialOffer>('SpecialOffer', SpecialOfferSchema);

export default SpecialOffer;

