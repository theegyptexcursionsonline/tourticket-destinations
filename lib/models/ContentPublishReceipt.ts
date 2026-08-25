import mongoose, { Document, Model, Schema } from 'mongoose';

export type ContentPublishReceiptState = 'pending' | 'completed';

export interface IContentPublishReceipt extends Document {
  idempotencyKey: string;
  tenantId: string;
  contentType: string;
  requestHash: string;
  resourceId: string;
  state: ContentPublishReceiptState;
  claimToken?: string;
  claimExpiresAt?: Date;
  statusCode?: number;
  response?: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContentPublishReceiptSchema = new Schema<IContentPublishReceipt>(
  {
    idempotencyKey: { type: String, required: true, trim: true },
    tenantId: { type: String, required: true, trim: true },
    contentType: { type: String, required: true, trim: true },
    requestHash: { type: String, required: true },
    // Generated at claim time and used as the content document's _id. If the
    // content commit succeeds but the response/receipt completion is lost, the
    // retry can prove that the existing document belongs to this claim.
    resourceId: { type: String, required: true, trim: true },
    state: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
      required: true,
    },
    claimToken: { type: String },
    claimExpiresAt: { type: Date },
    statusCode: { type: Number },
    response: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

ContentPublishReceiptSchema.index(
  { idempotencyKey: 1, tenantId: 1, contentType: 1 },
  { unique: true },
);
ContentPublishReceiptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ContentPublishReceipt: Model<IContentPublishReceipt> =
  (mongoose.models.ContentPublishReceipt as Model<IContentPublishReceipt>) ||
  mongoose.model<IContentPublishReceipt>('ContentPublishReceipt', ContentPublishReceiptSchema);

export default ContentPublishReceipt;
