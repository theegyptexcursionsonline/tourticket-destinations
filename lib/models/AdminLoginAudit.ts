import mongoose, { Schema, Document, Model } from 'mongoose';
import { LOGIN_AUDIT_OUTCOMES, type LoginAuditOutcome } from '@/lib/auth/loginAuditOutcomes';

export { LOGIN_AUDIT_OUTCOMES, type LoginAuditOutcome };

export interface IAdminLoginAudit extends Document {
  email: string;
  outcome: LoginAuditOutcome;
  ip: string;
  userAgent: string;
  createdAt: Date;
}

const AdminLoginAuditSchema = new Schema<IAdminLoginAudit>({
  email: { type: String, required: true, lowercase: true, trim: true },
  outcome: { type: String, required: true, enum: LOGIN_AUDIT_OUTCOMES },
  ip: { type: String, default: 'unknown' },
  userAgent: { type: String, default: 'unknown' },
  createdAt: { type: Date, default: Date.now },
});

// Forensic window only — expire records after 30 days.
AdminLoginAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
AdminLoginAuditSchema.index({ email: 1, createdAt: -1 });

const AdminLoginAudit: Model<IAdminLoginAudit> =
  mongoose.models.AdminLoginAudit ||
  mongoose.model<IAdminLoginAudit>('AdminLoginAudit', AdminLoginAuditSchema);

export default AdminLoginAudit;
