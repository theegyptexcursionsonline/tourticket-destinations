import type { Metadata } from 'next';
import AdminDashboardClient from './AdminDashboardClient';

export const metadata: Metadata = {
  title: {
    absolute: 'Dashboard | Admin Panel',
  },
  description: 'Main EEO admin dashboard overview.',
};

export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
