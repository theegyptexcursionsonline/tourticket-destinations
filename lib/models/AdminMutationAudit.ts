import mongoose, { Document, Model, Schema } from 'mongoose';

export const ADMIN_AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'execute',
  'export',
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

export const ADMIN_AUDIT_OUTCOMES = [
  'succeeded',
  'rejected',
  'failed',
] as const;

export type AdminAuditOutcome = (typeof ADMIN_AUDIT_OUTCOMES)[number];

export interface AdminAuditChange {
  field: string;
  before?: string | number | boolean | string[];
  after?: string | number | boolean | string[];
}

export interface IAdminMutationAudit extends Document {
  actorUserId: string;
  actorEmail?: string;
  actorName?: string;
  actorRole: string;
  action: AdminAuditAction | string;
  outcome?: AdminAuditOutcome;
  statusCode?: number;
  resourceType: string;
  resourceId?: string;
  resourceLabel?: string;
  summary: string;
  changedFields?: string[];
  changes?: AdminAuditChange[];
  failureCode?: string;
  method: string;
  path: string;
  tenantIds: string[];
  requestId?: string;
  clientIp?: string;
  userAgent?: string;
  createdAt: Date;
}

const AdminAuditChangeSchema = new Schema<AdminAuditChange>(
  {
    field: { type: String, required: true, immutable: true },
    before: { type: Schema.Types.Mixed, immutable: true },
    after: { type: Schema.Types.Mixed, immutable: true },
  },
  { _id: false },
);

const AdminMutationAuditSchema = new Schema<IAdminMutationAudit>(
  {
    actorUserId: { type: String, required: true, immutable: true, index: true },
    actorEmail: { type: String, immutable: true },
    actorName: { type: String, immutable: true },
    actorRole: { type: String, required: true, immutable: true },
    action: { type: String, required: true, immutable: true, index: true },
    outcome: { type: String, enum: ADMIN_AUDIT_OUTCOMES, immutable: true, index: true },
    statusCode: { type: Number, immutable: true },
    resourceType: { type: String, required: true, immutable: true, index: true },
    resourceId: { type: String, immutable: true },
    resourceLabel: { type: String, immutable: true },
    summary: { type: String, required: true, immutable: true },
    changedFields: { type: [String], immutable: true, default: [] },
    changes: { type: [AdminAuditChangeSchema], immutable: true, default: [] },
    failureCode: { type: String, immutable: true },
    method: { type: String, required: true, immutable: true },
    path: { type: String, required: true, immutable: true },
    tenantIds: { type: [String], required: true, immutable: true, index: true },
    requestId: { type: String, immutable: true },
    clientIp: { type: String, immutable: true },
    userAgent: { type: String, immutable: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'adminmutationaudits',
    strict: false,
  },
);

AdminMutationAuditSchema.index({ tenantIds: 1, createdAt: -1, _id: -1 });
AdminMutationAuditSchema.index({ actorUserId: 1, createdAt: -1 });
AdminMutationAuditSchema.index({ resourceType: 1, action: 1, createdAt: -1 });
AdminMutationAuditSchema.index({ tenantIds: 1, outcome: 1, createdAt: -1 });

// Audit history is a stated two-year window, not silent infinite growth.
// Retention is env-tunable; changing it later needs a collMod on the index
// (Mongo pins expireAfterSeconds at index creation).
const RETENTION_DAYS = Number(process.env.AUDIT_RETENTION_DAYS || 730);
AdminMutationAuditSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: Math.max(1, Math.floor(RETENTION_DAYS)) * 24 * 60 * 60 },
);

const AdminMutationAudit: Model<IAdminMutationAudit> =
  mongoose.models.AdminMutationAudit
  || mongoose.model<IAdminMutationAudit>('AdminMutationAudit', AdminMutationAuditSchema);

export default AdminMutationAudit;
