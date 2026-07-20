 
import mongoose, { Document, Schema, Model } from 'mongoose';
import { PAGE_URL_TYPES, type PageUrlType } from '@/lib/attractionPages/pageUrl';

export interface IAttractionPageTranslation {
  title?: string;
  description?: string;
  longDescription?: string;
  gridTitle?: string;
  gridSubtitle?: string;
  highlights?: string[];
  features?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface IAttractionPage extends Document {
  // Multi-tenant support
  tenantId: string;
  
  // Basic Info
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  
  // Page Type
  pageType: 'attraction' | 'category';
  categoryId?: mongoose.Schema.Types.ObjectId;
  urlType?: PageUrlType;
  
  // Content
  heroImage?: string; // NOW OPTIONAL
  images?: string[];
  highlights?: string[];
  features?: string[];
  linkedTourIds?: mongoose.Types.ObjectId[];
  linkedPageIds?: mongoose.Types.ObjectId[];
  linkedCategoryIds?: mongoose.Types.ObjectId[];
  
  // Grid Settings
  gridTitle: string;
  gridSubtitle?: string;
  showStats?: boolean;
  itemsPerRow: number;
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  translations?: Map<string, IAttractionPageTranslation>;
  
  // Status
  isPublished: boolean;
  featured: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const AttractionPageTranslationSchema = new Schema<IAttractionPageTranslation>(
  {
    title: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500 },
    longDescription: { type: String, trim: true, maxlength: 2000 },
    gridTitle: { type: String, trim: true, maxlength: 200 },
    gridSubtitle: { type: String, trim: true, maxlength: 500 },
    highlights: [{ type: String, trim: true, maxlength: 200 }],
    features: [{ type: String, trim: true, maxlength: 300 }],
    metaTitle: { type: String, trim: true, maxlength: 60 },
    metaDescription: { type: String, trim: true, maxlength: 160 },
  },
  { _id: false },
);

const AttractionPageSchema: Schema<IAttractionPage> = new Schema({
  // Multi-tenant support
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    ref: 'Tenant',
  },
  
  title: {
    type: String,
    required: [true, 'Page title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: true,
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    index: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  longDescription: {
    type: String,
    trim: true,
    maxlength: [2000, 'Long description cannot exceed 2000 characters'],
  },
  pageType: {
    type: String,
    enum: ['attraction', 'category'],
    required: true,
    index: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    index: true,
    required: function(this: IAttractionPage) {
      return this.pageType === 'category';
    },
    validate: {
      validator: function(v: any) {
        // If pageType is 'attraction', categoryId can be undefined/null
        if (this.pageType === 'attraction') {
          return v === undefined || v === null || mongoose.Types.ObjectId.isValid(v);
        }
        // If pageType is 'category', categoryId is required and must be valid
        return v && mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid category ID'
    }
  },
  urlType: {
    type: String,
    enum: PAGE_URL_TYPES,
    default: 'default',
  },
  heroImage: {
    type: String,
    required: false,
    trim: true,
  },
  images: [{
    type: String,
    trim: true,
  }],
  linkedTourIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
  }],
  linkedPageIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttractionPage',
  }],
  linkedCategoryIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  highlights: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(item => item.trim().length > 0 && item.length <= 200);
      },
      message: 'Each highlight must be non-empty and not exceed 200 characters'
    }
  },
  features: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(item => item.trim().length > 0 && item.length <= 300);
      },
      message: 'Each feature must be non-empty and not exceed 300 characters'
    }
  },
  gridTitle: {
    type: String,
    required: [true, 'Grid title is required'],
    trim: true,
    maxlength: [200, 'Grid title cannot exceed 200 characters'],
  },
  gridSubtitle: {
    type: String,
    trim: true,
    maxlength: [500, 'Grid subtitle cannot exceed 500 characters'],
  },
  showStats: {
    type: Boolean,
    default: true,
  },
  itemsPerRow: {
    type: Number,
    default: 4,
    min: [2, 'Items per row must be at least 2'],
    max: [8, 'Items per row cannot exceed 8'],
  },
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'Meta title cannot exceed 60 characters'],
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters'],
  },
  keywords: [{
    type: String,
    trim: true,
    maxlength: [50, 'Each keyword cannot exceed 50 characters'],
  }],
  translations: {
    type: Map,
    of: AttractionPageTranslationSchema,
    default: undefined,
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true,
  },
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes (with multi-tenant support)
AttractionPageSchema.index({ title: 'text', description: 'text' });

// Multi-tenant indexes
AttractionPageSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
AttractionPageSchema.index({ tenantId: 1, pageType: 1, isPublished: 1 });
AttractionPageSchema.index({ tenantId: 1, featured: 1, isPublished: 1 });
AttractionPageSchema.index({ tenantId: 1, isPublished: 1 });

// Pre-save middleware
AttractionPageSchema.pre('save', function(next) {
  // Auto-generate slug from name if not provided
  if (this.isModified('title') && !this.isModified('slug')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  
  // Auto-generate meta title from title if not provided
  if (!this.metaTitle && this.title) {
    this.metaTitle = this.title.length > 60 ? this.title.substring(0, 57) + '...' : this.title;
  }
  
  // Auto-generate meta description from description if not provided
  if (!this.metaDescription && this.description) {
    this.metaDescription = this.description.length > 160 ? this.description.substring(0, 157) + '...' : this.description;
  }
  
  next();
});

// Static methods (with multi-tenant support)
AttractionPageSchema.statics.getPublished = function(tenantId?: string) {
  const query: any = { isPublished: true };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query).sort({ featured: -1, createdAt: -1 });
};

AttractionPageSchema.statics.getFeatured = function(tenantId?: string) {
  const query: any = { isPublished: true, featured: true };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query).sort({ createdAt: -1 });
};

AttractionPageSchema.statics.getByType = function(pageType: 'attraction' | 'category', tenantId?: string) {
  const query: any = { isPublished: true, pageType };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query).sort({ createdAt: -1 });
};

AttractionPageSchema.statics.findBySlug = function(slug: string, tenantId: string) {
  return this.findOne({ slug, tenantId, isPublished: true });
};

const AttractionPage: Model<IAttractionPage> = mongoose.models.AttractionPage || mongoose.model<IAttractionPage>('AttractionPage', AttractionPageSchema);

export default AttractionPage;
