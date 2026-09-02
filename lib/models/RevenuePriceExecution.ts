import mongoose, { type Document, Schema, type Model, type Types } from 'mongoose';

type ExecutionPrices = { adult: number; child: number; infant: number };

export interface IRevenuePriceExecution extends Document {
  executionId: string;
  idempotencyKey: string;
  tenantId: string;
  recommendationId: string;
  actor: string;
  mode: 'manual' | 'assist' | 'autopilot' | 'commissioning' | 'rollback';
  target: { tourId: Types.ObjectId; optionKey: string; date: Date; time: string };
  currency: string;
  expectedVersion: number;
  appliedVersion?: number;
  previousPrices?: ExecutionPrices;
  requestedPrices?: ExecutionPrices;
  effectivePrices?: ExecutionPrices;
  policyHash: string;
  policySnapshot?: unknown;
  sourceVersion: string;
  confidence?: number;
  requestHash: string;
  state: 'pending' | 'applied' | 'replayed' | 'conflict' | 'blocked' | 'verified' | 'rollback_pending' | 'rollback_applied' | 'rollback_failed';
  blockReason?: string;
  applyClaimToken?: string;
  applyClaimExpiresAt?: Date;
  readbackAttempts: unknown[];
  events: unknown[];
  rollbackExecutionId?: string;
  rollbackIdempotencyKey?: string;
  rollbackRequestHash?: string;
  rollbackClaimToken?: string;
  rollbackClaimExpiresAt?: Date;
  rollbackFailureReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PricesSchema = new Schema({ adult: Number, child: Number, infant: Number }, { _id: false });

const RevenuePriceExecutionSchema = new Schema<IRevenuePriceExecution>({
  executionId: { type: String, required: true, unique: true, index: true },
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  recommendationId: { type: String, required: true },
  actor: { type: String, required: true },
  mode: { type: String, enum: ['manual', 'assist', 'autopilot', 'commissioning', 'rollback'], required: true },
  target: {
    tourId: { type: Schema.Types.ObjectId, ref: 'Tour', required: true },
    optionKey: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
  },
  currency: { type: String, required: true },
  expectedVersion: { type: Number, required: true },
  appliedVersion: { type: Number },
  previousPrices: PricesSchema,
  requestedPrices: PricesSchema,
  effectivePrices: PricesSchema,
  policyHash: { type: String, required: true },
  // New writes require this in application validation. Keep the persisted field
  // optional so pre-rollout receipts remain readable and can receive readback events.
  policySnapshot: { type: Schema.Types.Mixed },
  sourceVersion: { type: String, required: true },
  // Optional only for legacy read compatibility. New writes require and validate it.
  confidence: { type: Number, min: 85, max: 100 },
  requestHash: { type: String, required: true },
  state: { type: String, enum: ['pending', 'applied', 'replayed', 'conflict', 'blocked', 'verified', 'rollback_pending', 'rollback_applied', 'rollback_failed'], required: true },
  blockReason: { type: String },
  applyClaimToken: { type: String },
  applyClaimExpiresAt: { type: Date },
  readbackAttempts: { type: [Schema.Types.Mixed], default: [] },
  events: { type: [Schema.Types.Mixed], default: [] },
  rollbackExecutionId: { type: String },
  rollbackIdempotencyKey: { type: String },
  rollbackRequestHash: { type: String },
  rollbackClaimToken: { type: String },
  rollbackClaimExpiresAt: { type: Date },
  rollbackFailureReason: { type: String },
}, { timestamps: true, minimize: false });

const RevenuePriceExecution: Model<IRevenuePriceExecution> =
  (mongoose.models.RevenuePriceExecution as Model<IRevenuePriceExecution> | undefined)
  || mongoose.model<IRevenuePriceExecution>('RevenuePriceExecution', RevenuePriceExecutionSchema);

export default RevenuePriceExecution;

