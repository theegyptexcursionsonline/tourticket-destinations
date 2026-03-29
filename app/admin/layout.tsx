import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AdminClientLayout from './AdminClientLayout';
import ClientErrorReporter from '@/components/ClientErrorReporter';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: {
        default: 'Admin Panel',
        template: '%s | Admin Panel',
    },
    description: 'Admin Dashboard',
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" dir="ltr">
            <body className={`${inter.variable} font-sans`}>
                <AdminClientLayout>{children}</AdminClientLayout>
                <ClientErrorReporter />
            </body>
        </html>
    );
}
