// lib/models/Destination.ts
import mongoose, { Document, Schema, models } from 'mongoose';

export interface IDestination extends Document {
  // Multi-tenant support
  tenantId: string;
  
  // Basic Info
  name: string;
  slug: string;
  country?: string;
  
  // Media
  image?: string;
  images?: string[];
  
  // Descriptions
  description: string;
  longDescription?: string;
  
  // Location Data
  coordinates?: {
    lat: number;
    lng: number;
  };
  
  // Practical Information
  currency?: string;
  timezone?: string;
  bestTimeToVisit?: string;
  
  // Content Arrays
  highlights?: string[];
  thingsToDo?: string[];
  localCustoms?: string[];
  
  // Travel Information
  visaRequirements?: string;
  languagesSpoken?: string[];
  emergencyNumber?: string;
  
  // Climate & Weather
  averageTemperature?: {
    summer: string;
    winter: string;
  };
  climate?: string;
  weatherWarnings?: string[];
  
  // Status & Meta
  featured?: boolean;
  isPublished?: boolean;
  tourCount?: number;
// SEO & Meta
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  tags?: string[];

  // Multi-language translations
  translations?: Record<string, Record<string, unknown>>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const CoordinatesSchema = new Schema({
  lat: {
    type: Number,
    required: false,
  },
  lng: {
    type: Number,
    required: false,
  }
}, { _id: false });

const AverageTemperatureSchema = new Schema({
  summer: {
    type: String,
    trim: true,
  },
  winter: {
    type: String,
    trim: true,
  }
}, { _id: false });

const DestinationSchema: Schema<IDestination> = new Schema({
  // Multi-tenant support
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    ref: 'Tenant',
  },
  
  // Basic Info - Only name and description are required
  name: {
    type: String,
    required: [true, 'Destination name is required'],
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
country: {
  type: String,
  required: false,
  trim: true,
  maxlength: [100, 'Country cannot exceed 100 characters'],
  index: true,
  validate: {
    validator: function(v: string) {
      // Only validate length if country is provided and not empty
      return !v || v.length >= 2;
    },
    message: 'Country must be at least 2 characters when provided'
  }
},
  
  // Media
  image: {
    type: String,
    required: false,
    trim: true,
  },
  images: [{
    type: String,
    trim: true,
  }],
  
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
  
  coordinates: {
    type: CoordinatesSchema,
    required: false,
  },
  
currency: {
  type: String,
  uppercase: true,
  trim: true,
  required: false,
  // No validation - completely optional
},
 timezone: {
  type: String,
  trim: true,
  validate: {
    validator: function(v: string) {
      // Only validate if timezone is provided and not empty
      return !v || v.length > 0; // Allow empty or any non-empty string
    },
    message: 'Timezone must not be empty when provided'
  }
},
  bestTimeToVisit: {
    type: String,
    trim: true,
    maxlength: [200, 'Best time to visit cannot exceed 200 characters'],
  },
  
  // Content Arrays
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
  thingsToDo: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(item => item.trim().length > 0 && item.length <= 300);
      },
      message: 'Each thing to do must be non-empty and not exceed 300 characters'
    }
  },
  localCustoms: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(item => item.trim().length > 0 && item.length <= 500);
      },
      message: 'Each custom must be non-empty and not exceed 500 characters'
    }
  },
  
  // Travel Information
  visaRequirements: {
    type: String,
    trim: true,
    maxlength: [1000, 'Visa requirements cannot exceed 1000 characters'],
  },
  languagesSpoken: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(lang => lang.trim().length > 0 && lang.length <= 50);
      },
      message: 'Each language must be non-empty and not exceed 50 characters'
    }
  },
  emergencyNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^[\d\s\-\+\(\)]+$/.test(v);
      },
      message: 'Emergency number must contain only numbers, spaces, and phone characters'
    }
  },
  
  // Climate & Weather
  averageTemperature: {
    type: AverageTemperatureSchema,
  },
  climate: {
    type: String,
    trim: true,
    maxlength: [500, 'Climate description cannot exceed 500 characters'],
  },
  weatherWarnings: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(warning => warning.trim().length > 0 && warning.length <= 300);
      },
      message: 'Each weather warning must be non-empty and not exceed 300 characters'
    }
  },
  
  // Status & Meta
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
  isPublished: {
    type: Boolean,
    default: true,
    index: true,
  },
  tourCount: {
    type: Number,
    default: 0,
    min: [0, 'Tour count cannot be negative'],
    index: true,
  },
  
  // SEO & Meta
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
  keywords: [{ type: String, trim: true }],
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(tag => tag.trim().length > 0 && tag.length <= 50);
      },
      message: 'Each tag must be non-empty and not exceed 50 characters'
    }
  },

  // Multi-language translations (backward-compatible)
  // Structure: { ar: { name: "...", description: "..." }, es: { ... }, fr: { ... }, ru: { ... }, de: { ... } }
  translations: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance (with multi-tenant support)
DestinationSchema.index({ name: 'text', description: 'text', country: 'text' });

// Multi-tenant indexes
DestinationSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
DestinationSchema.index({ tenantId: 1, name: 1 }, { unique: true });
DestinationSchema.index({ tenantId: 1, isPublished: 1 });
DestinationSchema.index({ tenantId: 1, featured: 1, isPublished: 1 });
DestinationSchema.index({ tenantId: 1, country: 1, featured: 1 });
DestinationSchema.index({ tenantId: 1, tourCount: -1 });

// Virtual for full name with country
DestinationSchema.virtual('fullName').get(function() {
  return this.country ? `${this.name}, ${this.country}` : this.name;
});

// Virtual for coordinate string
DestinationSchema.virtual('coordinateString').get(function() {
  if (this.coordinates && this.coordinates.lat && this.coordinates.lng) {
    return `${this.coordinates.lat}, ${this.coordinates.lng}`;
  }
  return 'Not specified';
});

// Pre-save middleware to ensure slug is generated
DestinationSchema.pre('save', function(next) {
  // Auto-generate slug from name if not provided
  if (this.isModified('name') && !this.isModified('slug')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  
  next();
});

// Post-save hook to sync to Algolia
DestinationSchema.post('save', async function(doc) {
  try {
    if (doc.isPublished) {
      const { syncDestinationToAlgolia } = await import('../algolia');
      await syncDestinationToAlgolia(doc);
      console.log(`Auto-synced destination ${doc._id} to Algolia`);
    }
  } catch (error) {
    console.error('Error auto-syncing destination to Algolia:', error);
  }
});

// Post-delete hooks to remove from Algolia
DestinationSchema.post('findOneAndDelete', async function(doc) {
  try {
    if (doc) {
      const { deleteDestinationFromAlgolia } = await import('../algolia');
      await deleteDestinationFromAlgolia(doc._id.toString());
      console.log(`Auto-deleted destination ${doc._id} from Algolia`);
    }
  } catch (error) {
    console.error('Error auto-deleting destination from Algolia:', error);
  }
});

DestinationSchema.post('deleteOne', async function(doc) {
  try {
    if (doc) {
      const { deleteDestinationFromAlgolia } = await import('../algolia');
      await deleteDestinationFromAlgolia(doc._id.toString());
      console.log(`Auto-deleted destination ${doc._id} from Algolia`);
    }
  } catch (error) {
    console.error('Error auto-deleting destination from Algolia:', error);
  }
});

export default models.Destination || mongoose.model<IDestination>('Destination', DestinationSchema);