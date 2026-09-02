import { BOOKING_STATUS, BOOKING_STATUS_LABEL } from '@/lib/constants/bookingStatus';

/** Both persisted status formats accepted by the Booking schema hold capacity. */
export const REVENUE_CAPACITY_BOOKING_STATUSES = [
  BOOKING_STATUS_LABEL.pending,
  BOOKING_STATUS_LABEL.confirmed,
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
] as const;
