// app/admin/tours/page.tsx
// Tours management page with multi-tenant support
// Data is fetched client-side to react to tenant selection

import { ToursPageClient } from './ToursPageClient';

export default function ToursPage() {
  return <ToursPageClient />;
}