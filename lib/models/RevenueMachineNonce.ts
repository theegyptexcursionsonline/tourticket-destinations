import mongoose, { Schema, type Model } from 'mongoose';

interface RevenueMachineNonceDocument {
  keyId: string;
  nonce: string;
  expiresAt: Date;
}

const RevenueMachineNonceSchema = new Schema<RevenueMachineNonceDocument>({
  keyId: { type: String, required: true },
  nonce: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });

RevenueMachineNonceSchema.index({ keyId: 1, nonce: 1 }, { unique: true });

const RevenueMachineNonce: Model<RevenueMachineNonceDocument> = mongoose.models.RevenueMachineNonce
  || mongoose.model<RevenueMachineNonceDocument>('RevenueMachineNonce', RevenueMachineNonceSchema);

export default RevenueMachineNonce;

