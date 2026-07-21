import { Schema } from 'mongoose';

export const ImageMetadataSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, maxlength: 300, default: '' },
    title: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: false },
);
