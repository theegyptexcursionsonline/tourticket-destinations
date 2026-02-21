import { Suspense } from 'react';
import AttractionPageForm from '@/components/admin/AttractionPageForm';

interface EditAttractionPageProps {
  params: Promise<{ id: string }>;
}

async function EditAttractionPageContent({ params }: EditAttractionPageProps) {
  const { id } = await params; // Fix: Await params first
  
  return <AttractionPageForm pageId={id} />;
}

export default function EditAttractionPage({ params }: EditAttractionPageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditAttractionPageContent params={params} />
    </Suspense>
  );
}