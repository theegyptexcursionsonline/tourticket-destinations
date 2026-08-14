import { Schema } from "mongoose";

export const ParentPageSchema = new Schema(
  {
    id: { type: String, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    href: {
      type: String,
      trim: true,
      maxlength: 300,
      validate: {
        validator: (value: string | undefined) =>
          !value || (value.startsWith("/") && !value.startsWith("//")),
        message: "Parent page URL must be an internal path.",
      },
    },
    kind: {
      type: String,
      required: true,
      enum: ["destination", "attraction", "category", "category-2", "landing"],
    },
  },
  { _id: false },
);

export const breadcrumbLabelField = {
  type: String,
  trim: true,
  maxlength: 120,
};
