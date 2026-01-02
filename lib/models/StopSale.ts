// lib/models/StopSale.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * StopSale records allow blocking bookings for a tour (all options) or a specific option
 * over a date range.
 *
 * Convention:
 * - optionIds: []  => all options for the tour
 * - optionIds: [<optionId>] => a single tour option (bookingOptions[].id)
 *
 * Note: We intentionally store one optionId per document (or empty array for all options)
 * so that unblocking a single option doesn't require splitting date ranges.
 */
export interface IStopSale extends Document {
  tourId: mongoose.Types.ObjectId;
  optionIds: string[]; // [] => all, [id] => one option
  startDate: Date;
  endDate: Date;
  reason?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

const StopSaleSchema = new Schema<IStopSale>(
  {
    tourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tour',
      required: true,
      index: true,
    },
    optionIds: {
      type: [String],
      default: [],
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
    reason: {
      type: String,
      trim: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Useful query pattern: stop-sales overlapping a month for a tour
StopSaleSchema.index({ tenantId: 1, tourId: 1, startDate: 1, endDate: 1 });

// Avoid exact duplicates (same tour, same single option/all, same range)
StopSaleSchema.index(
  { tenantId: 1, tourId: 1, startDate: 1, endDate: 1, optionIds: 1 },
  { unique: true },
);

const StopSale: Model<IStopSale> =
  mongoose.models.StopSale || mongoose.model<IStopSale>('StopSale', StopSaleSchema);

export default StopSale;


