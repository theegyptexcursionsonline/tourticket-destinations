import AdminClientLayout from './AdminClientLayout';

// Force all admin pages to be dynamic (they require auth, no static generation)
export const dynamic = 'force-dynamic';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <AdminClientLayout>{children}</AdminClientLayout>;
}
