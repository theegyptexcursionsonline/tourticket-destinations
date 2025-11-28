// lib/models/Review.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IReview extends Document {
  // Multi-tenant support
  tenantId: string;
  
  tour: mongoose.Schema.Types.ObjectId;  // Changed from tourId
  user: mongoose.Schema.Types.ObjectId;  // Changed from userId
  userName: string;
  userEmail: string;
  rating: number;
  title?: string;
  comment?: string;  // Made optional - customers can leave just star rating
  images?: string[];
  verified: boolean;
  helpful: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema<IReview> = new Schema({
  // Multi-tenant support
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    ref: 'Tenant',
  },
  
  tour: {  // Changed from tourId
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: true,
  },
  user: {  // Changed from userId
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true,
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  userEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: false,  // Made optional - customers can leave just star rating
    trim: true,
    maxlength: 1000
  },
  images: [{
    type: String,
    trim: true
  }],
  verified: {
    type: Boolean,
    default: false
  },
  helpful: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Multi-tenant indexes
// Compound index to prevent duplicate reviews (per tenant)
ReviewSchema.index({ tenantId: 1, tour: 1, user: 1 }, { unique: true });

// Index for sorting by date (per tenant)
ReviewSchema.index({ tenantId: 1, createdAt: -1 });

// Index for verified reviews (per tenant)
ReviewSchema.index({ tenantId: 1, tour: 1, verified: 1 });

// Index for tour reviews
ReviewSchema.index({ tenantId: 1, tour: 1, rating: -1 });

const Review: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export default Review;