import { Schema } from 'mongoose';

/** Immutable actor snapshot used by content records. */
export const AuditActorSchema = new Schema({
  id: { type: String, trim: true },
  name: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
}, { _id: false });
