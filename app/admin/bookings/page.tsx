import type { Metadata } from 'next';
import BookingsPageClient from './BookingsPageClient';

export const metadata: Metadata = {
  title: {
    absolute: 'Bookings Management | Admin Panel',
  },
  description: 'Manage bookings for Egypt Excursions Online.',
};

export default function AdminBookingsPage() {
  return <BookingsPageClient />;
}
