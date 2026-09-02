// lib/models/Booking.ts (Complete - Nothing Omitted)
 
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBooking extends Document {
  // Multi-tenant support
  tenantId: string;
  
  bookingReference: string;
  tour: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  // Booking source tracking
  source?: 'online' | 'manual' | 'app';
  createdBy?: mongoose.Schema.Types.ObjectId; // Admin user who created manual booking

  // Customer contact (snapshot at booking time; user profile may change)
  customerPhone?: string;
  customerCountry?: string;

  date: Date;
  dateString?: string; // YYYY-MM-DD format - timezone-safe for display
  time: string;
  guests: number;
  totalPrice: number;
  /** ISO-4217 currency frozen with the booking; legacy rows may omit it. */
  currency?: string;
  status:
    | 'Confirmed'
    | 'Pending'
    | 'Completed'
    | 'Cancelled'
    | 'Refunded'
    | 'Partial Refunded'
    // Backward compatibility if any records stored codes
    | 'confirmed'
    | 'pending'
    | 'completed'
    | 'cancelled'
    | 'refunded'
    | 'partial_refunded';
  paymentId?: string;
  paymentItemIndex?: number;
  confirmationSentAt?: Date;
  confirmationEmailFailedAt?: Date;
  confirmationEmailFailureCode?: string;
  operatorNotificationSentAt?: Date;
  operatorNotificationFailedAt?: Date;
  operatorNotificationFailureCode?: string;
  checkoutItemKey?: string;
  paymentMethod?: string;
  paymentStatus?: 'paid' | 'pending' | 'pay_on_arrival';
  amountPaid?: number;
  specialRequests?: string;
  emergencyContact?: string;
  hotelPickupDetails?: string;
  hotelPickupLocation?: {
    address: string;
    lat: number;
    lng: number;
    placeId?: string;
  };
  pickupLocation?: string;
  pickupAddress?: string;
  internalNotes?: string; // Not visible to customer

  // Offer/discount snapshot applied at booking time (optional)
  appliedOffer?: {
    id: string;
    name: string;
    offerType: string;
    discountAmount: number;
    discountValue: number;
    endDate?: Date;
  };
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  /**
   * Unit prices each guest type was charged, resolved from the stored tour
   * for the selected option and departure at booking time. Absent on legacy
   * bookings, which were priced child = half the adult price, infant free.
   */
  guestPrices?: {
    adult: number;
    child: number;
    infant: number;
  };
  selectedAddOns?: { [key: string]: number };
  selectedBookingOption?: {
    id: string;
    pricingKey?: string;
    title: string;
    /** Per Person / Per Couple / Per Family / Per Group — drives the whole-unit pricing rule. */
    type?: string;
    price: number;
    originalPrice?: number;
    duration?: string;
    badge?: string;
  };
  /** Immutable price evidence captured when the booking was charged/created. */
  priceSnapshot?: {
    guestPrices: { adult: number; child: number; infant: number };
    unitPricing?: { unitSize: number; unitPrice: number };
    version: number;
    sourceVersion?: string;
    executionId?: string;
    overrideId?: string;
    source?: 'catalogue' | 'override' | 'manual';
    capturedAt: Date;
  };
  selectedAddOnDetails?: {
    [key: string]: {
      id: string;
      title: string;
      price: number;
      category?: string;
      perGuest?: boolean;
      /** Server-authoritative units billed for new per-person selections. */
      quantity?: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const SelectedBookingOptionSchema = new Schema(
  {
    id: String,
    pricingKey: String,
    title: String,
    // `type: { type: String }` is the explicit form; a bare `type: String`
    // here would be read as this schema's own SchemaType.
    type: { type: String },
    price: Number,
    originalPrice: Number,
    duration: String,
    badge: String,
  },
  { _id: false },
);

// The per-guest unit prices recorded with the booking. No field here is named
// `type`, so an inline declaration would be safe, but it is kept as its own
// Schema for the same reason as SelectedBookingOptionSchema.
const GuestPricesSchema = new Schema(
  {
    adult: { type: Number, required: true, min: 0 },
    child: { type: Number, required: true, min: 0 },
    infant: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

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

  source: {
    type: String,
    enum: ['online', 'manual', 'app'],
    default: 'online',
    index: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    required: false,
  },

  customerPhone: {
    type: String,
    maxlength: 50,
  },

  customerCountry: {
    type: String,
    maxlength: 100,
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
  currency: {
    type: String,
    uppercase: true,
    trim: true,
    match: [/^[A-Z]{3}$/, 'Currency must be a three-letter ISO code'],
  },
  
  status: {
    type: String,
    enum: [
      'Confirmed',
      'Pending',
      'Completed',
      'Cancelled',
      'Refunded',
      'Partial Refunded',
      // accept codes too
      'confirmed',
      'pending',
      'completed',
      'cancelled',
      'refunded',
      'partial_refunded',
    ],
    default: 'Confirmed',
  },
  
  paymentId: {
    type: String,
  },
  paymentItemIndex: {
    type: Number,
    min: 0,
  },
  checkoutItemKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
    immutable: true,
  },
  
  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'bank', 'cash', 'pay_later', 'other'],
    default: 'card',
  },

  // "Nothing silent": tracks whether the booking-confirmation email reached
  // the customer; failures surface in the admin UI and clear on resend.
  confirmationSentAt: {
    type: Date,
  },
  confirmationEmailFailedAt: {
    type: Date,
  },
  confirmationEmailFailureCode: {
    type: String,
    maxlength: 200,
  },
  operatorNotificationSentAt: {
    type: Date,
  },
  operatorNotificationFailedAt: {
    type: Date,
  },
  operatorNotificationFailureCode: {
    type: String,
    maxlength: 200,
  },

  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'pay_on_arrival'],
    default: 'paid',
    index: true,
  },

  amountPaid: {
    type: Number,
    min: 0,
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

  pickupLocation: {
    type: String,
    maxlength: 200,
  },

  pickupAddress: {
    type: String,
    maxlength: 300,
  },

  internalNotes: {
    type: String,
    maxlength: 2000,
  },

  appliedOffer: {
    type: {
      id: String,
      name: String,
      offerType: String,
      discountAmount: Number,
      discountValue: Number,
      endDate: Date,
    },
    required: false,
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

  guestPrices: {
    type: GuestPricesSchema,
    required: false,
  },
  
  selectedAddOns: {
    type: Map,
    of: Number,
    default: new Map(),
  },

  // Declared as its own Schema, not an inline object. A nested field literally
  // named `type` makes Mongoose read the surrounding object as a SchemaType
  // declaration, which collapsed this subdocument and threw "`false` is not a
  // valid type at path `required`" when the schema compiled.
  selectedBookingOption: {
    type: SelectedBookingOptionSchema,
    required: false,
  },

  priceSnapshot: {
    type: {
      guestPrices: { adult: Number, child: Number, infant: Number },
      unitPricing: {
        type: { unitSize: Number, unitPrice: Number },
        required: false,
      },
      version: { type: Number, required: true },
      sourceVersion: String,
      executionId: String,
      overrideId: String,
      source: { type: String, enum: ['catalogue', 'override', 'manual'] },
      capturedAt: { type: Date, required: true },
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
      quantity: { type: Number, min: 1 },
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
  if (this.adultGuests && this.adultGuests > 0) parts.push(`${this.adultGuests} adult${this.adultGuests > 1 ? 's' : ''}`);
  if (this.childGuests && this.childGuests > 0) parts.push(`${this.childGuests} child${this.childGuests > 1 ? 'ren' : ''}`);
  if (this.infantGuests && this.infantGuests > 0) parts.push(`${this.infantGuests} infant${this.infantGuests > 1 ? 's' : ''}`);
  return parts.join(', ');
});

// Indexes for efficient queries (with multi-tenant support)
BookingSchema.index({ tenantId: 1, bookingReference: 1 }, { unique: true });
BookingSchema.index({ tenantId: 1, user: 1, createdAt: -1 });
BookingSchema.index({ tenantId: 1, tour: 1, date: 1 });
BookingSchema.index({ tenantId: 1, status: 1 });
BookingSchema.index({ tenantId: 1, createdAt: -1 });
BookingSchema.index({ tenantId: 1, source: 1, createdAt: -1 });
BookingSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
