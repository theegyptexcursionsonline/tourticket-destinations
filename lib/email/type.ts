// lib/email/types.ts

export interface BaseEmailData {
  customerName: string;
  customerEmail: string;
}

export interface BookingEmailData extends BaseEmailData {
  customerPhone?: string;
  tourTitle: string;
  bookingDate: string;
  bookingTime: string;
  participants: string;
  participantBreakdown?: string; // e.g., "2 x Adults (£22.4)"
  totalPrice: string;
  bookingId: string;
  bookingOption?: string; // Selected booking option name
  specialRequests?: string;
  hotelPickupDetails?: string;
  hotelPickupLocation?: {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  };
  hotelPickupMapImage?: string;
  hotelPickupMapLink?: string;
  meetingPoint?: string;
  contactNumber?: string;
  tourImage?: string;
  baseUrl?: string;
  qrCodeDataUrl?: string; // QR code as data URL for embedding in email
  verificationUrl?: string; // URL that the QR code points to
  dateBadge?: {
    dayLabel: string;
    dayNumber: number;
    monthLabel: string;
    year: number;
  };
  orderedItems?: Array<{
    title: string;
    image?: string;
    adults: number;
    children: number;
    infants: number;
    bookingOption?: string;
    totalPrice: string;
  }>;
  pricingDetails?: {
    subtotal: string;
    serviceFee: string;
    tax: string;
    discount?: string;
    total: string;
    currencySymbol: string;
  };
  timeUntil?: {
    days: number;
    hours: number;
    minutes: number;
  };
}

export interface PaymentEmailData extends BaseEmailData {
  paymentId: string;
  paymentMethod: string;
  amount: string;
  currency: string;
  bookingId: string;
  tourTitle: string;
  baseUrl?: string;
}

export interface TripReminderData extends BaseEmailData {
  tourTitle: string;
  bookingDate: string;
  bookingTime: string;
  meetingPoint: string;
  contactNumber: string;
  weatherInfo?: string;
  whatToBring?: string[];
  importantNotes?: string;
  bookingId: string;
  baseUrl?: string;
}

export interface TripCompletionData extends BaseEmailData {
  tourTitle: string;
  bookingDate: string;
  reviewLink: string;
  photoSharingLink?: string;
  recommendedTours?: Array<{
    title: string;
    image: string;
    price: string;
    link: string;
  }>;
  baseUrl?: string;
}

export interface CancellationData extends BaseEmailData {
  tourTitle: string;
  bookingDate: string;
  bookingId: string;
  refundAmount?: string;
  refundProcessingDays?: number;
  cancellationReason?: string;
  baseUrl?: string;
}

export interface WelcomeEmailData extends BaseEmailData {
  verificationLink?: string;
  dashboardLink: string;
  recommendedTours?: Array<{
    title: string;
    image: string;
    price: string;
    link: string;
  }>;
  baseUrl?: string;
}

export interface AdminAlertData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  tourTitle: string;
  bookingId: string;
  bookingDate: string;
  totalPrice: string;
  paymentMethod?: string;
  specialRequests?: string;
  hotelPickupDetails?: string;
  hotelPickupLocation?: {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  };
  hotelPickupMapImage?: string;
  hotelPickupMapLink?: string;
  timeUntil?: {
    days: number;
    hours: number;
    minutes: number;
  };
  adminDashboardLink?: string;
  baseUrl?: string;
  tours?: Array<{
    title: string;
    date: string;
    time: string;
    adults: number;
    children: number;
    infants: number;
    bookingOption?: string;
    addOns?: string[];
    price: string;
  }>;
  dateBadge?: {
    dayLabel: string;
    dayNumber: number;
    monthLabel: string;
    year: number;
  };
}

export interface BookingStatusUpdateData extends BaseEmailData {
  tourTitle: string;
  bookingId: string;
  bookingDate: string;
  bookingTime: string;
  newStatus: string;
  statusMessage: string;
  additionalInfo?: string;
  baseUrl?: string;
}

export interface AdminInviteEmailData {
  inviteeName: string;
  inviteeEmail: string;
  inviterName: string;
  temporaryPassword: string;
  role: string;
  permissions: string[];
  portalLink: string;
  supportEmail?: string;
}

export interface AdminAccessUpdateEmailData {
  inviteeName: string;
  inviteeEmail: string;
  updatedBy?: string;
  action: 'activated' | 'deactivated' | 'permissions_updated' | 'deleted';
  portalLink: string;
  supportEmail?: string;
  isActivated?: boolean;
}

export interface BankTransferEmailData extends BaseEmailData {
  tourTitle: string;
  bookingId: string;
  bookingDate: string;
  bookingTime: string;
  participants: string;
  totalPrice: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  currency: string;
  specialRequests?: string;
  hotelPickupDetails?: string;
  baseUrl?: string;
}

export type EmailType =
  | 'booking-confirmation'
  | 'payment-confirmation'
  | 'bank-transfer-instructions'
  | 'trip-reminder'
  | 'trip-completion'
  | 'booking-cancellation'
  | 'booking-update'
  | 'welcome'
  | 'admin-booking-alert'
  | 'admin-invite'
  | 'admin-access-update';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}