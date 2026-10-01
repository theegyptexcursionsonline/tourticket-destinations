import { redirect } from 'next/navigation';

/**
 * A category is managed in its editor. This route used to render a bare
 * heading from an unauthenticated lookup that ignored the brand, so any
 * visitor could read any brand's category name by id. It now reads nothing and
 * sends the admin to the editor, which loads through the guarded API.
 */
export default async function AdminCategoryRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/categories/${encodeURIComponent(id)}/edit`);
}
