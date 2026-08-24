import mongoose, { Schema, type Model } from 'mongoose';

export interface AbuseRateLimitDocument {
  scope: string;
  keyHash: string;
  windowStart: Date;
  count: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AbuseRateLimitSchema = new Schema<AbuseRateLimitDocument>(
  {
    scope: { type: String, required: true, trim: true, maxlength: 80 },
    keyHash: { type: String, required: true, trim: true, maxlength: 64 },
    windowStart: { type: Date, required: true },
    count: { type: Number, required: true, min: 0, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);

// One atomically incremented counter per action, privacy-safe identity, and
// fixed window. The TTL index bounds retained abuse metadata.
AbuseRateLimitSchema.index(
  { scope: 1, keyHash: 1, windowStart: 1 },
  { unique: true, name: 'abuse_scope_key_window_unique' },
);

const AbuseRateLimit: Model<AbuseRateLimitDocument> =
  mongoose.models.AbuseRateLimit
  || mongoose.model<AbuseRateLimitDocument>('AbuseRateLimit', AbuseRateLimitSchema);

export default AbuseRateLimit;
