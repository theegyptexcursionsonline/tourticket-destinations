import mongoose, { Schema, type Model } from 'mongoose';

export type GuestPrices = { adult: number; child: number; infant: number };

interface RevenuePriceOverrideDocument {
  tenantId: string;
  tourId: mongoose.Types.ObjectId;
  optionKey: string;
  date: Date;
  time: string;
  currency: string;
  prices: GuestPrices;
  cataloguePrices: GuestPrices;
  previousPrices: GuestPrices;
  version: number;
  source: 'revenuepilot' | 'manual' | 'legacy';
  recommendationId?: string;
  executionId: string;
  active: boolean;
  revertedAt?: Date;
}

const GuestPricesSchema = new Schema({
  adult: { type: Number, required: true, min: 0 },
  child: { type: Number, required: true, min: 0 },
  infant: { type: Number, required: true, min: 0 },
}, { _id: false });

const RevenuePriceOverrideSchema = new Schema<RevenuePriceOverrideDocument>({
  tenantId: { type: String, required: true, default: 'default', index: true },
  tourId: { type: Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
  optionKey: { type: String, required: true },
  date: { type: Date, required: true, index: true },
  time: { type: String, required: true },
  currency: { type: String, required: true, default: 'USD' },
  prices: { type: GuestPricesSchema, required: true },
  cataloguePrices: { type: GuestPricesSchema, required: true },
  previousPrices: { type: GuestPricesSchema, required: true },
  version: { type: Number, required: true, default: 1, min: 1 },
  source: { type: String, enum: ['revenuepilot', 'manual', 'legacy'], required: true },
  recommendationId: { type: String },
  executionId: { type: String, required: true },
  active: { type: Boolean, default: true, index: true },
  revertedAt: { type: Date },
}, { timestamps: true, minimize: false });

RevenuePriceOverrideSchema.index(
  { tenantId: 1, tourId: 1, optionKey: 1, date: 1, time: 1 },
  { unique: true },
);

const RevenuePriceOverride: Model<RevenuePriceOverrideDocument> = mongoose.models.RevenuePriceOverride
  || mongoose.model<RevenuePriceOverrideDocument>('RevenuePriceOverride', RevenuePriceOverrideSchema);

export default RevenuePriceOverride;

