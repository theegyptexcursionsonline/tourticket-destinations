import mongoose, { Document, Schema, Model } from 'mongoose';
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  AdminPermission,
  AdminRole,
  DEFAULT_ADMIN_ROLE,
  getDefaultPermissions,
} from '@/lib/constants/adminPermissions';

// Cart item interface for storing in user document
export interface ICartItem {
  tourId: mongoose.Types.ObjectId;
  tourSlug: string;
  tourTitle: string;
  tourImage?: string;
  selectedDate: string;
  selectedTime?: string;
  quantity: number;
  childQuantity?: number;
  adultPrice: number;
  childPrice?: number;
  selectedAddOns?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  uniqueId: string;
  addedAt: Date;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // Password is required for creation, but shouldn't be sent to client
  firebaseUid?: string; // Firebase user ID for Firebase Auth users
  authProvider?: 'firebase' | 'jwt' | 'google'; // Authentication provider
  photoURL?: string; // Profile photo URL (from Google or Firebase)
  emailVerified?: boolean; // Email verification status (from Firebase)
  createdAt: Date;
  role: AdminRole;
  permissions: AdminPermission[];
  isActive: boolean;
  lastLoginAt?: Date;
  invitationToken?: string;
  invitationExpires?: Date;
  requirePasswordChange?: boolean;
  wishlist?: mongoose.Types.ObjectId[]; // Array of Tour IDs
  cart?: ICartItem[]; // Array of cart items
  // Multi-tenant support — which brands this team member can access
  tenantIds?: string[];
}

const UserSchema: Schema<IUser> = new Schema({
  firstName: {
    type: String,
    required: [true, 'Please provide your first name.'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Please provide your last name.'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email.'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address.',
    ],
  },
  password: {
    type: String,
    required: false, // Optional - Firebase users won't have passwords
    minlength: 8,
    select: false, // Do not send password field in query results by default
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness for non-null values
    select: false, // Don't include in queries by default
  },
  authProvider: {
    type: String,
    enum: ['firebase', 'jwt', 'google'],
    default: 'jwt', // Default to JWT for backward compatibility with admin users
  },
  photoURL: {
    type: String,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ADMIN_ROLES,
    default: DEFAULT_ADMIN_ROLE,
  },
  permissions: {
    type: [String],
    enum: ADMIN_PERMISSIONS,
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLoginAt: {
    type: Date,
  },
  invitationToken: {
    type: String,
    select: false, // Don't include in queries by default
  },
  invitationExpires: {
    type: Date,
    select: false,
  },
  requirePasswordChange: {
    type: Boolean,
    default: false,
  },
  // Multi-tenant support — array of brand IDs this team member can access
  tenantIds: {
    type: [String],
    default: [],
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  wishlist: [{
    type: Schema.Types.ObjectId,
    ref: 'Tour',
  }],
  cart: [{
    tourId: { type: Schema.Types.ObjectId, ref: 'Tour', required: true },
    tourSlug: { type: String, required: true },
    tourTitle: { type: String, required: true },
    tourImage: { type: String },
    selectedDate: { type: String, required: true },
    selectedTime: { type: String },
    quantity: { type: Number, required: true, default: 1 },
    childQuantity: { type: Number, default: 0 },
    adultPrice: { type: Number, required: true },
    childPrice: { type: Number },
    selectedAddOns: [{
      id: String,
      name: String,
      price: Number,
      quantity: Number,
    }],
    uniqueId: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
  }],
});

UserSchema.pre('save', function ensurePermissions(next) {
  if (!this.role) {
    this.role = DEFAULT_ADMIN_ROLE;
  }

  if ((!this.permissions || this.permissions.length === 0) && this.role !== 'customer') {
    this.permissions = getDefaultPermissions(this.role);
  }

  next();
});

// Avoid recompiling the model if it's already defined
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;