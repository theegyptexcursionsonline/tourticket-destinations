import { Suspense } from 'react';
import CategoryForm from '@/components/admin/CategoryForm';

interface EditCategoryPageProps {
  params: Promise<{ id: string }>;
}

async function EditCategoryPageContent({ params }: EditCategoryPageProps) {
  const { id } = await params;
  
  return <CategoryForm categoryId={id} />;
}

export default function EditCategoryPage({ params }: EditCategoryPageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditCategoryPageContent params={params} />
    </Suspense>
  );
}