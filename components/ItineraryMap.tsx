'use client';

import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface ItineraryItem {
  time?: string;
  title: string;
  description: string;
  duration?: string;
  location?: string;
  includes?: string[];
  icon?: string;
}

interface ItineraryMapProps {
  itinerary: ItineraryItem[];
  tourTitle: string;
}

const ItineraryMap: React.FC<ItineraryMapProps> = ({ itinerary, tourTitle }) => {
  // Extract unique locations from itinerary
  let locations = itinerary
    .filter(item => item.location)
    .map((item, index) => ({
      id: index,
      name: item.location!,
      title: item.title,
      time: item.time,
      icon: item.icon || 'location'
    }));

  // If no locations in itinerary, show mock data
  if (locations.length === 0) {
    locations = itinerary.slice(0, 5).map((item, index) => ({
      id: index,
      name: index === 0 ? 'Hotel Pickup' :
            index === itinerary.length - 1 ? 'Hotel Drop-off' :
            `Stop ${index}`,
      title: item.title,
      time: item.time,
      icon: item.icon || 'location'
    }));
  }

  // Still return null if no itinerary items at all
  if (locations.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
      <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Navigation size={20} className="text-blue-600" />
        Tour Route Map
      </h4>

      {/* Map Container */}
      <div className="relative bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        {/* Mobile-friendly route visualization */}
        <div className="p-4 md:p-6">
          <div className="relative">
            {/* Route line */}
            <div className="absolute start-3 md:start-4 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-400 via-indigo-400 to-purple-400"></div>

            {/* Location markers */}
            <div className="space-y-6">
              {locations.map((location, index) => (
                <div key={location.id} className="relative flex items-start gap-3 md:gap-4">
                  {/* Marker */}
                  <div className={`
                    relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md
                    ${index === 0 ? 'bg-green-500' : index === locations.length - 1 ? 'bg-red-500' : 'bg-blue-500'}
                  `}>
                    <MapPin size={16} className="text-white" />
                    {index === 0 && (
                      <div className="absolute -top-1 -end-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                    )}
                  </div>

                  {/* Location info */}
                  <div className="flex-1 bg-slate-50 rounded-lg p-3 md:p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-semibold text-slate-800 text-sm md:text-base">{location.title}</h5>
                      {location.time && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                          {location.time}
                        </span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-slate-600 flex items-center gap-1">
                      <MapPin size={12} className="text-slate-400" />
                      {location.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Map Placeholder - Can be replaced with actual map API */}
        <div className="bg-gradient-to-br from-slate-100 to-slate-200 p-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-xs md:text-sm text-slate-600 flex items-center gap-2">
              <Navigation size={14} className="text-blue-600" />
              <span className="hidden md:inline">Total stops: {locations.length}</span>
              <span className="md:hidden">{locations.length} stops</span>
            </p>
            <button
              onClick={() => {
                // Create search query from locations
                const query = `${tourTitle} ${locations.map(l => l.name).join(' ')}`;
                window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, '_blank');
              }}
              className="text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5"
            >
              <Navigation size={14} />
              <span className="hidden sm:inline">Open in</span> Maps
            </button>
          </div>
        </div>
      </div>

      {/* Route Summary */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-3 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs font-medium text-slate-600">Start Point</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{locations[0]?.name}</p>
        </div>

        <div className="bg-white rounded-lg p-3 border border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-xs font-medium text-slate-600">End Point</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{locations[locations.length - 1]?.name}</p>
        </div>

        {locations.length > 2 && (
          <div className="bg-white rounded-lg p-3 border border-blue-200 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-medium text-slate-600">Waypoints</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{locations.length - 2} stops</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItineraryMap;
