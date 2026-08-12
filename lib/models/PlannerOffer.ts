import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * A short, shareable planner offer link.
 *
 * The long signed token still works, but it is unreadable in a WhatsApp message
 * and cannot be withdrawn once sent. Storing the offer lets a planner hand out
 * `sharmexcursionsonline.com/en/offer/amira-7k2m`, revoke it later, and see
 * whether the customer ever opened it. The discount value is still never stored
 * here — the tenant's Discount record remains the only authority.
 */
export interface IPlannerOffer extends Document {
  tenantId: string;
  slug: string;
  firstName: string;
  discountCode: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  opens: number;
  lastOpenedAt?: Date | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PlannerOfferSchema: Schema<IPlannerOffer> = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
    firstName: { type: String, required: true, trim: true, maxlength: 40 },
    discountCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 24 },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    opens: { type: Number, default: 0, min: 0 },
    lastOpenedAt: { type: Date, default: null },
    createdBy: { type: String, default: null, maxlength: 120 },
  },
  { timestamps: true },
);

// One slug per tenant: two brands may both hand out "amira-7k2m".
PlannerOfferSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

const PlannerOfferModel: Model<IPlannerOffer> =
  (mongoose.models.PlannerOffer as Model<IPlannerOffer>) ||
  mongoose.model<IPlannerOffer>('PlannerOffer', PlannerOfferSchema);

export default PlannerOfferModel;
