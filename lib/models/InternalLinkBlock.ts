import mongoose, { Schema, type Document, type Model } from "mongoose";
import type {
  InternalLinkBlockValue,
  LocalizedText,
} from "@/lib/navigation/internalLinks";

export interface IInternalLinkBlock extends Document, InternalLinkBlockValue {
  tenantId: string;
  updatedAt: Date;
  createdAt: Date;
}

const LocalizedTextSchema = new Schema<LocalizedText>(
  {
    en: { type: String, trim: true, maxlength: 160 },
    ar: { type: String, trim: true, maxlength: 160 },
    de: { type: String, trim: true, maxlength: 160 },
    fr: { type: String, trim: true, maxlength: 160 },
    es: { type: String, trim: true, maxlength: 160 },
    ru: { type: String, trim: true, maxlength: 160 },
  },
  { _id: false },
);

const LinkSchema = new Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 64 },
    label: { type: LocalizedTextSchema, required: true },
    href: { type: String, required: true, trim: true, maxlength: 300 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const GroupSchema = new Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 64 },
    title: { type: LocalizedTextSchema, required: true },
    enabled: { type: Boolean, default: true },
    links: { type: [LinkSchema], default: [] },
  },
  { _id: false },
);

const InternalLinkBlockSchema = new Schema<IInternalLinkBlock>(
  {
    tenantId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true,
    },
    enabled: { type: Boolean, default: true },
    heading: {
      type: LocalizedTextSchema,
      default: () => ({ en: "Explore Egypt" }),
    },
    groups: { type: [GroupSchema], default: [] },
  },
  { timestamps: true },
);

const InternalLinkBlock: Model<IInternalLinkBlock> =
  (mongoose.models.InternalLinkBlock as Model<IInternalLinkBlock>) ||
  mongoose.model<IInternalLinkBlock>(
    "InternalLinkBlock",
    InternalLinkBlockSchema,
  );

export default InternalLinkBlock;
