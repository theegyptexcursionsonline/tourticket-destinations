// lib/models/HeroSettings.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IHeroSettings extends Document {
  // Multi-tenant support
  tenantId: string;
  
  // Background Images
  backgroundImages: {
    desktop: string;
    mobile?: string;
    alt: string;
    isActive: boolean;
  }[];
  currentActiveImage: string;
  
  // Hero Title
  title: {
    main: string;
    highlight: string;
  };
  
  // Search Settings
  searchSuggestions: string[];
  
  // Floating Tags
  floatingTags: {
    isEnabled: boolean;
    tags: string[];
    animationSpeed: number; // in seconds
    tagCount: {
      desktop: number;
      mobile: number;
    };
  };
  
  // Trust Indicators (like the current travelers/rating display)
  trustIndicators: {
    travelers: string;
    rating: string;
    ratingText: string;
    isVisible: boolean;
  };
  
  // Overlay Settings
  overlaySettings: {
    opacity: number;
    gradientType: 'dark' | 'light' | 'custom';
    customGradient?: string;
  };
  
  // Animation Settings
  animationSettings: {
    slideshowSpeed: number; // in seconds
    fadeSpeed: number; // in milliseconds
    enableAutoplay: boolean;
  };
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  
  // Status
  isActive: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const HeroSettingsSchema: Schema<IHeroSettings> = new Schema({
  // Multi-tenant support
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    ref: 'Tenant',
  },
  
  backgroundImages: [{
    desktop: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    alt: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Alt text cannot exceed 200 characters']
    },
    isActive: {
      type: Boolean,
      default: false
    }
  }],
  
  currentActiveImage: {
    type: String,
    required: true
  },
  
  title: {
    main: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Main title cannot exceed 100 characters']
    },
    highlight: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Highlight word cannot exceed 50 characters']
    }
  },
  
  searchSuggestions: {
    type: [String],
    default: [
      "Where are you going?",
      "Find your next adventure",
      "Discover hidden gems",
      "Book unique experiences",
      "Explore new destinations",
      "Create lasting memories"
    ],
    validate: {
      validator: function(arr: string[]) {
        return arr.length > 0 && arr.length <= 20 && arr.every(item => item.length <= 100);
      },
      message: 'Must have 1-20 suggestions, each under 100 characters'
    }
  },
  
  floatingTags: {
    isEnabled: {
      type: Boolean,
      default: true
    },
    tags: {
      type: [String],
      default: [
        "PYRAMID TOURS", "NILE CRUISES", "LUXOR TEMPLES", "SPHINX VISITS",
        "SUNSET FELUCCA", "ASWAN EXCURSIONS", "VALLEY OF THE KINGS", "CAMEL RIDES",
        "DESERT SAFARI", "RED SEA RESORTS", "HURGHADA DIVING", "ABU SIMBEL",
        "EGYPTIAN MUSEUM", "PHILAE TEMPLE", "LUXURY CRUISES", "CULTURAL TOURS",
        "MARKET BAZAARS", "NUBIAN VILLAGES", "ANCIENT TEMPLES", "HOT AIR BALLOON",
        "LOCAL CUISINE", "HISTORICAL SITES", "ADVENTURE SPORTS"
      ],
      validate: {
        validator: function(arr: string[]) {
          return arr.every(tag => tag.length > 0 && tag.length <= 50);
        },
        message: 'Each tag must be non-empty and not exceed 50 characters'
      }
    },
    animationSpeed: {
      type: Number,
      default: 5,
      min: 2,
      max: 20
    },
    tagCount: {
      desktop: {
        type: Number,
        default: 9,
        min: 3,
        max: 15
      },
      mobile: {
        type: Number,
        default: 5,
        min: 2,
        max: 8
      }
    }
  },
  
  trustIndicators: {
    travelers: {
      type: String,
      default: "2M+ travelers",
      trim: true,
      maxlength: [50, 'Travelers text cannot exceed 50 characters']
    },
    rating: {
      type: String,
      default: "4.9/5 rating",
      trim: true,
      maxlength: [50, 'Rating text cannot exceed 50 characters']
    },
    ratingText: {
      type: String,
      default: "★★★★★",
      trim: true,
      maxlength: [20, 'Rating stars cannot exceed 20 characters']
    },
    isVisible: {
      type: Boolean,
      default: true
    }
  },
  
  overlaySettings: {
    opacity: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.6
    },
    gradientType: {
      type: String,
      enum: ['dark', 'light', 'custom'],
      default: 'dark'
    },
    customGradient: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || v.includes('gradient');
        },
        message: 'Custom gradient must be a valid CSS gradient'
      }
    }
  },
  
  animationSettings: {
    slideshowSpeed: {
      type: Number,
      default: 6,
      min: 2,
      max: 30
    },
    fadeSpeed: {
      type: Number,
      default: 900,
      min: 200,
      max: 3000
    },
    enableAutoplay: {
      type: Boolean,
      default: true
    }
  },
  
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'Meta title cannot exceed 60 characters']
  },
  
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save validation
HeroSettingsSchema.pre('save', function(next) {
  // Ensure at least one image is active
  const activeImages = this.backgroundImages.filter(img => img.isActive);
  if (activeImages.length === 0 && this.backgroundImages.length > 0) {
    this.backgroundImages[0].isActive = true;
  }
  
  // Set current active image
  const activeImage = this.backgroundImages.find(img => img.isActive);
  if (activeImage) {
    this.currentActiveImage = activeImage.desktop;
  }
  
  next();
});

// Ensure only one settings document is active per tenant (not globally)
HeroSettingsSchema.pre('save', async function(next) {
  if (this.isActive && this.isNew) {
    await (this.constructor as any).updateMany(
      { _id: { $ne: this._id }, tenantId: this.tenantId },
      { $set: { isActive: false } }
    );
  }
  next();
});

// Multi-tenant indexes
HeroSettingsSchema.index({ tenantId: 1, isActive: 1 });
// Ensure only one active hero settings per tenant
HeroSettingsSchema.index(
  { tenantId: 1, isActive: 1 },
  { 
    unique: true,
    partialFilterExpression: { isActive: true }
  }
);

const HeroSettings: Model<IHeroSettings> = mongoose.models.HeroSettings || mongoose.model<IHeroSettings>('HeroSettings', HeroSettingsSchema);

export default HeroSettings;