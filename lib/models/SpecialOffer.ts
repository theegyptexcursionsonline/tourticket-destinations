// lib/models/SpecialOffer.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISpecialOffer extends Document {
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'bundle' | 'early_bird' | 'last_minute' | 'group';
  discountValue: number;
  code?: string;
  minBookingValue?: number;
  maxDiscount?: number;
  minGroupSize?: number;
  startDate: Date;
  endDate: Date;
  travelStartDate?: Date;
  travelEndDate?: Date;
  bookingWindow?: {
    daysBeforeTravel?: number;
    daysAfterRelease?: number;
  };
  applicableTours: mongoose.Types.ObjectId[];
  applicableCategories?: mongoose.Types.ObjectId[];
  excludedTours?: mongoose.Types.ObjectId[];
  usageLimit?: number;
  usedCount: number;
  perUserLimit?: number;
  isActive: boolean;
  isFeatured: boolean;
  featuredBadgeText?: string;
  priority: number;
  tenantId: string;
  terms?: string[];
  createdAt: Date;
  updatedAt: Date;
}

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
    enum: ['percentage', 'fixed', 'bundle', 'early_bird', 'last_minute', 'group'],
    required: true,
    default: 'percentage',
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  code: {
    type: String,
    trim: true,
    uppercase: true,
    sparse: true,
  },
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
  travelStartDate: {
    type: Date,
  },
  travelEndDate: {
    type: Date,
  },
  bookingWindow: {
    daysBeforeTravel: Number,
    daysAfterRelease: Number,
  },
  applicableTours: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
  }],
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
  const query: Record<string, unknown> = {
    tenantId,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  };

  // Only add usage limit check if it exists
  query.$or = [
    { usageLimit: { $exists: false } },
    { usageLimit: null },
    { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
  ];

  if (tourId) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { applicableTours: { $size: 0 } },
        { applicableTours: tourId },
      ],
    });
    query.$and.push({
      excludedTours: { $ne: tourId },
    });
  }

  if (categoryId) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { applicableCategories: { $size: 0 } },
        { applicableCategories: categoryId },
      ],
    });
  }

  return this.find(query).sort({ priority: -1, discountValue: -1 });
};

const SpecialOffer: Model<ISpecialOffer> = mongoose.models.SpecialOffer || 
  mongoose.model<ISpecialOffer>('SpecialOffer', SpecialOfferSchema);

export default SpecialOffer;

