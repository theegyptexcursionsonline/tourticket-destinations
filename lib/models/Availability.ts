// lib/models/Availability.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

// Slot interface
export interface ISlot {
  time: string;
  capacity: number;
  booked: number;
  blocked: boolean;
  blockReason?: string;
  price?: number;
  extraCapacity?: number;
}

// Availability document interface
export interface IAvailability extends Document {
  tour: mongoose.Types.ObjectId;
  option?: mongoose.Types.ObjectId;
  date: Date;
  slots: ISlot[];
  stopSale: boolean;
  stopSaleReason?: string;
  tenantId: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Slot schema
const SlotSchema = new Schema<ISlot>({
  time: {
    type: String,
    required: true,
    trim: true,
  },
  capacity: {
    type: Number,
    required: true,
    default: 10,
    min: 0,
  },
  booked: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  blocked: {
    type: Boolean,
    default: false,
  },
  blockReason: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    min: 0,
  },
  extraCapacity: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

// Availability schema
const AvailabilitySchema: Schema<IAvailability> = new Schema({
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: [true, 'Tour is required'],
    index: true,
  },
  option: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourOption',
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true,
  },
  slots: {
    type: [SlotSchema],
    default: [],
  },
  stopSale: {
    type: Boolean,
    default: false,
  },
  stopSaleReason: {
    type: String,
    trim: true,
  },
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for performance
AvailabilitySchema.index({ tour: 1, date: 1 }, { unique: true });
AvailabilitySchema.index({ tenantId: 1, date: 1 });
AvailabilitySchema.index({ tour: 1, date: 1, stopSale: 1 });

// Virtual for available capacity
AvailabilitySchema.virtual('totalCapacity').get(function(this: IAvailability) {
  return this.slots.reduce((sum, slot) => sum + slot.capacity + (slot.extraCapacity || 0), 0);
});

AvailabilitySchema.virtual('totalBooked').get(function(this: IAvailability) {
  return this.slots.reduce((sum, slot) => sum + slot.booked, 0);
});

AvailabilitySchema.virtual('availableCapacity').get(function(this: IAvailability) {
  return this.slots.reduce((sum, slot) => {
    if (slot.blocked) return sum;
    return sum + (slot.capacity + (slot.extraCapacity || 0) - slot.booked);
  }, 0);
});

// Static methods
AvailabilitySchema.statics.findByTourAndDate = async function(
  tourId: string | mongoose.Types.ObjectId, 
  date: Date
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.findOne({
    tour: tourId,
    date: { $gte: startOfDay, $lte: endOfDay },
  });
};

AvailabilitySchema.statics.findByTourAndMonth = async function(
  tourId: string | mongoose.Types.ObjectId,
  year: number,
  month: number
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  return this.find({
    tour: tourId,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });
};

AvailabilitySchema.statics.getAvailabilityStatus = function(
  slots: ISlot[], 
  stopSale: boolean
): 'available' | 'limited' | 'sold_out' | 'blocked' {
  if (stopSale) return 'blocked';
  
  const totalCapacity = slots.reduce((sum, s) => sum + s.capacity + (s.extraCapacity || 0), 0);
  const totalBooked = slots.reduce((sum, s) => sum + s.booked, 0);
  const available = totalCapacity - totalBooked;
  
  if (available <= 0) return 'sold_out';
  if (available <= totalCapacity * 0.2) return 'limited';
  return 'available';
};

const Availability: Model<IAvailability> = mongoose.models.Availability || 
  mongoose.model<IAvailability>('Availability', AvailabilitySchema);

export default Availability;

