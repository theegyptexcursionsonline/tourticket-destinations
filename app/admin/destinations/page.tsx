// app/admin/destinations/page.tsx
// Add this line at the top of the file after the imports
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import { IDestination } from '@/lib/models/Destination';
import DestinationManager from './DestinationManager';

async function getDestinations(): Promise<IDestination[]> {
  await dbConnect();
  const destinations = await Destination.find({}).sort({ name: 1 });

  // Get all tours to calculate tour counts per destination
  const tours = await Tour.find({}).select('destination').lean();

  // Count tours per destination
  const tourCounts: Record<string, number> = {};
  tours.forEach(tour => {
    const destId = tour.destination?.toString();
    if (destId) {
      tourCounts[destId] = (tourCounts[destId] || 0) + 1;
    }
  });

  // Sanitize all destinations by providing defaults for missing coordinates
  const sanitizedDestinations = destinations.map(dest => {
    const destObj = dest.toObject();
    const destId = destObj._id.toString();
    return {
      ...destObj,
      coordinates: {
        lat: destObj.coordinates?.lat ?? 0,
        lng: destObj.coordinates?.lng ?? 0
      },
      name: destObj.name || '',
      country: destObj.country || '',
      description: destObj.description || '',
      image: destObj.image || '',
      slug: destObj.slug || '',
      tourCount: tourCounts[destId] || 0
    };
  });

  return JSON.parse(JSON.stringify(sanitizedDestinations));
}

export default async function DestinationsPage() {
  const destinations = await getDestinations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Destinations</h1>
        <p className="text-slate-600 mt-1">
          Manage the destinations where your tours are available.
        </p>
      </div>
      
      <DestinationManager initialDestinations={destinations} />
    </div>
  );
}