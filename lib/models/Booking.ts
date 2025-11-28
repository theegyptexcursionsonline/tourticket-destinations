// lib/models/Booking.ts (Complete - Nothing Omitted)
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBooking extends Document {
  // Multi-tenant support
  tenantId: string;
  
  bookingReference: string;
  tour: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  date: Date;
  dateString?: string; // YYYY-MM-DD format - timezone-safe for display
  time: string;
  guests: number;
  totalPrice: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  paymentId?: string;
  paymentMethod?: string;
  specialRequests?: string;
  emergencyContact?: string;
  hotelPickupDetails?: string;
  hotelPickupLocation?: {
    address: string;
    lat: number;
    lng: number;
    placeId?: string;
  };
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  selectedAddOns?: { [key: string]: number };
  selectedBookingOption?: {
    id: string;
    title: string;
    price: number;
    originalPrice?: number;
    duration?: string;
    badge?: string;
  };
  selectedAddOnDetails?: {
    [key: string]: {
      id: string;
      title: string;
      price: number;
      category?: string;
      perGuest?: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema: Schema<IBooking> = new Schema({
  // Multi-tenant support
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    ref: 'Tenant',
  },
  
  bookingReference: {
    type: String,
    required: true,
  },
  
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: true,
    validate: {
      validator: function(v: any) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid tour ID format'
    }
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: function(v: any) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid user ID format'
    }
  },
  
  date: {
    type: Date,
    required: true,
  },

  // Store original date string (YYYY-MM-DD) for timezone-safe display
  // This prevents timezone drift when displaying dates across different regions
  dateString: {
    type: String,
    match: /^\d{4}-\d{2}-\d{2}$/,
  },

  time: {
    type: String,
    required: true,
  },
  
  guests: {
    type: Number,
    required: true,
    min: 1,
  },
  
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  
  status: {
    type: String,
    enum: ['Confirmed', 'Pending', 'Cancelled'],
    default: 'Confirmed',
  },
  
  paymentId: {
    type: String,
  },
  
  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'bank', 'cash', 'pay_later'],
    default: 'card',
  },
  
  specialRequests: {
    type: String,
    maxlength: 1000,
  },
  
  emergencyContact: {
    type: String,
    maxlength: 200,
  },
  
  hotelPickupDetails: {
    type: String,
    maxlength: 300,
  },
  
  hotelPickupLocation: {
    address: String,
    lat: Number,
    lng: Number,
    placeId: String,
  },
  
  adultGuests: {
    type: Number,
    min: 0,
    default: 1,
  },
  
  childGuests: {
    type: Number,
    min: 0,
    default: 0,
  },
  
  infantGuests: {
    type: Number,
    min: 0,
    default: 0,
  },
  
  selectedAddOns: {
    type: Map,
    of: Number,
    default: new Map(),
  },

  selectedBookingOption: {
    type: {
      id: String,
      title: String,
      price: Number,
      originalPrice: Number,
      duration: String,
      badge: String,
    },
    required: false,
  },

  selectedAddOnDetails: {
    type: Map,
    of: {
      id: String,
      title: String,
      price: Number,
      category: String,
      perGuest: Boolean,
    },
    default: new Map(),
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for guest breakdown text
BookingSchema.virtual('guestBreakdown').get(function() {
  const parts = [];
  if (this.adultGuests > 0) parts.push(`${this.adultGuests} adult${this.adultGuests > 1 ? 's' : ''}`);
  if (this.childGuests > 0) parts.push(`${this.childGuests} child${this.childGuests > 1 ? 'ren' : ''}`);
  if (this.infantGuests > 0) parts.push(`${this.infantGuests} infant${this.infantGuests > 1 ? 's' : ''}`);
  return parts.join(', ');
});

// Indexes for efficient queries (with multi-tenant support)
BookingSchema.index({ tenantId: 1, bookingReference: 1 }, { unique: true });
BookingSchema.index({ tenantId: 1, user: 1, createdAt: -1 });
BookingSchema.index({ tenantId: 1, tour: 1, date: 1 });
BookingSchema.index({ tenantId: 1, status: 1 });
BookingSchema.index({ tenantId: 1, createdAt: -1 });

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;