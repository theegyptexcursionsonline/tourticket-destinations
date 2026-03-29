import { Inter } from 'next/font/google';
import AdminClientLayout from './AdminClientLayout';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// Force all admin pages to be dynamic (they require auth, no static generation)
export const dynamic = 'force-dynamic';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" dir="ltr">
            <body className={`${inter.variable} font-sans`}>
                <AdminClientLayout>{children}</AdminClientLayout>
            </body>
        </html>
    );
}
