// lib/models/Discount.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IDiscount extends Document {
  // Multi-tenant support
  tenantId: string;
  
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
  expiresAt?: Date;
  usageLimit?: number;
  timesUsed: number;
}

const DiscountSchema: Schema<IDiscount> = new Schema({
  // Multi-tenant support
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    ref: 'Tenant',
  },
  
  code: {
    type: String,
    required: [true, 'Discount code is required.'],
    trim: true,
    uppercase: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Discount type is required.'],
  },
  value: {
    type: Number,
    required: [true, 'Discount value is required.'],
    min: [0, 'Discount value cannot be negative.'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  expiresAt: {
    type: Date,
  },
  usageLimit: {
    type: Number,
    min: [0, 'Usage limit cannot be negative.'],
  },
  timesUsed: {
    type: Number,
    default: 0,
    min: [0, 'Times used cannot be negative.'],
  },
}, { timestamps: true });

// Multi-tenant indexes
DiscountSchema.index({ tenantId: 1, code: 1 }, { unique: true });
DiscountSchema.index({ tenantId: 1, isActive: 1 });
DiscountSchema.index({ tenantId: 1, expiresAt: 1 });

const Discount: Model<IDiscount> = mongoose.models.Discount || mongoose.model<IDiscount>('Discount', DiscountSchema);

export default Discount;