// lib/models/Category.ts
import mongoose, { Document, Schema, models } from 'mongoose';

export interface ICategory extends Document {
  // Multi-tenant support
  tenantId: string;
  
  // Basic Info
  name: string;
  slug: string;
  description?: string;
  longDescription?: string;
  
  // Media
  heroImage?: string;
  images?: string[];
  
  // Content
  highlights?: string[];
  features?: string[];
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  
  // Display Settings
  color?: string;
  icon?: string;
  order?: number;
  
  // Status
  isPublished?: boolean;
  featured?: boolean;
  
  // Stats
  tourCount?: number;

  // Multi-language translations
  translations?: Record<string, Record<string, unknown>>;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

const CategorySchema: Schema<ICategory> = new Schema({
  // Multi-tenant support
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    ref: 'Tenant',
  },
  
  // Basic Info
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
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
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  longDescription: {
    type: String,
    trim: true,
    maxlength: [2000, 'Long description cannot exceed 2000 characters'],
  },
  
  // Media
  heroImage: {
    type: String,
    trim: true,
  },
  images: [{
    type: String,
    trim: true,
  }],
  
  // Content
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
  
  // SEO
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
  
  // Display Settings
  color: {
    type: String,
    default: '#3B82F6',
    validate: {
      validator: function(v: string) {
        return /^#[0-9A-F]{6}$/i.test(v);
      },
      message: 'Color must be a valid hex color code'
    }
  },
  icon: {
    type: String,
    trim: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  
  // Status
  isPublished: {
    type: Boolean,
    default: true,
    index: true,
  },
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  // Stats
  tourCount: {
    type: Number,
    default: 0,
    min: [0, 'Tour count cannot be negative'],
  },

  // Multi-language translations
  translations: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes (with multi-tenant support)
CategorySchema.index({ name: 'text', description: 'text' });

// Multi-tenant indexes
CategorySchema.index({ tenantId: 1, slug: 1 }, { unique: true });
CategorySchema.index({ tenantId: 1, name: 1 }, { unique: true });
CategorySchema.index({ tenantId: 1, isPublished: 1 });
CategorySchema.index({ tenantId: 1, featured: 1, isPublished: 1 });
CategorySchema.index({ tenantId: 1, order: 1 });

// Pre-save middleware
CategorySchema.pre('save', function(next) {
  // Auto-generate slug from name if not provided
  if (this.isModified('name') && !this.isModified('slug')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  
  // Auto-generate meta title from name if not provided
  if (!this.metaTitle && this.name) {
    this.metaTitle = this.name.length > 60 ? this.name.substring(0, 57) + '...' : this.name;
  }
  
  // Auto-generate meta description from description if not provided
  if (!this.metaDescription && this.description) {
    this.metaDescription = this.description.length > 160 ? this.description.substring(0, 157) + '...' : this.description;
  }
  
  next();
});

// Post-save hook to sync to Algolia
CategorySchema.post('save', async function(doc) {
  try {
    if (doc.isPublished) {
      const { syncCategoryToAlgolia } = await import('../algolia');
      await syncCategoryToAlgolia(doc);
      console.log(`Auto-synced category ${doc._id} to Algolia`);
    }
  } catch (error) {
    console.error('Error auto-syncing category to Algolia:', error);
  }
});

// Post-delete hooks to remove from Algolia
CategorySchema.post('findOneAndDelete', async function(doc) {
  try {
    if (doc) {
      const { deleteCategoryFromAlgolia } = await import('../algolia');
      await deleteCategoryFromAlgolia(doc._id.toString());
      console.log(`Auto-deleted category ${doc._id} from Algolia`);
    }
  } catch (error) {
    console.error('Error auto-deleting category from Algolia:', error);
  }
});

CategorySchema.post('deleteOne', async function(doc) {
  try {
    if (doc) {
      const { deleteCategoryFromAlgolia } = await import('../algolia');
      await deleteCategoryFromAlgolia(doc._id.toString());
      console.log(`Auto-deleted category ${doc._id} from Algolia`);
    }
  } catch (error) {
    console.error('Error auto-deleting category from Algolia:', error);
  }
});

export default models.Category || mongoose.model<ICategory>('Category', CategorySchema);