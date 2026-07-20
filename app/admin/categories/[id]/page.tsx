// app/categories/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await dbConnect();
  
  const category = await Category.findById(id);
  if (!category) {
    notFound();
  }

  return (
    <div>
      <h1>{category.name} Tours</h1>
      {/* Render tours */}
    </div>
  );
}
