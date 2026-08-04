import mongoose, { Document, Model, Schema } from 'mongoose';

export const ADMIN_AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'execute',
  'export',
] as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number];

export interface IAdminMutationAudit extends Document {
  actorUserId: string;
  actorEmail?: string;
  actorName?: string;
  actorRole: string;
  action: AdminAuditAction | string;
  resourceType: string;
  resourceId?: string;
  summary: string;
  method: string;
  path: string;
  tenantIds: string[];
  requestId?: string;
  createdAt: Date;
}

const AdminMutationAuditSchema = new Schema<IAdminMutationAudit>(
  {
    actorUserId: { type: String, required: true, immutable: true, index: true },
    actorEmail: { type: String, immutable: true },
    actorName: { type: String, immutable: true },
    actorRole: { type: String, required: true, immutable: true },
    action: { type: String, required: true, immutable: true, index: true },
    resourceType: { type: String, required: true, immutable: true, index: true },
    resourceId: { type: String, immutable: true },
    summary: { type: String, required: true, immutable: true },
    method: { type: String, required: true, immutable: true },
    path: { type: String, required: true, immutable: true },
    tenantIds: { type: [String], required: true, immutable: true, index: true },
    requestId: { type: String, immutable: true },
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

const AdminMutationAudit: Model<IAdminMutationAudit> =
  mongoose.models.AdminMutationAudit
  || mongoose.model<IAdminMutationAudit>('AdminMutationAudit', AdminMutationAuditSchema);

export default AdminMutationAudit;
