// app/admin/destinations/page.tsx
export const dynamic = 'force-dynamic';
import DestinationManager from './DestinationManager';

/**
 * The manager loads destinations from /api/admin/destinations, which applies
 * the admin's tenant scope. This page used to query Destination.find({}) and
 * Tour.find({}) directly, so it rendered every brand's destinations — and
 * their tour counts — to anyone with manageContent.
 */
export default function DestinationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Destinations</h1>
        <p className="text-slate-600 mt-1">
          Manage the destinations where your tours are available.
        </p>
      </div>

      <DestinationManager />
    </div>
  );
}
