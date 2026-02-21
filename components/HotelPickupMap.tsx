'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, X, Check, Building2, Navigation, Clock, Phone } from 'lucide-react';

interface HotelPickupLocation {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  name?: string;
}

interface HotelPickupMapProps {
  onLocationSelect: (location: HotelPickupLocation | null) => void;
  initialLocation?: HotelPickupLocation;
  tourLocation?: string;
}

declare global {
  interface Window {
    google: any;
    googleMapsScriptLoaded?: boolean;
    googleMapsCallback?: () => void;
  }
}

// Popular areas in Egypt for quick selection
const POPULAR_AREAS = [
  { name: 'Giza (Pyramids Area)', lat: 29.9792, lng: 31.1342 },
  { name: 'Downtown Cairo', lat: 30.0444, lng: 31.2357 },
  { name: 'Zamalek', lat: 30.0609, lng: 31.2194 },
  { name: 'Nasr City', lat: 30.0511, lng: 31.3656 },
  { name: 'Maadi', lat: 29.9602, lng: 31.2569 },
  { name: 'Heliopolis', lat: 30.0866, lng: 31.3225 },
];

export default function HotelPickupMap({ onLocationSelect, initialLocation, tourLocation: _tourLocation = 'Cairo, Egypt' }: HotelPickupMapProps) {
  const [pickupOption, setPickupOption] = useState<'now' | 'later' | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialLocation?.address || '');
  const [selectedLocation, setSelectedLocation] = useState<HotelPickupLocation | null>(initialLocation || null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [_isSearching, setIsSearching] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const isInitializing = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Load Google Maps script
  useEffect(() => {
    if (pickupOption !== 'now') return;
    if (!GOOGLE_MAPS_API_KEY) {
      setMapError(true);
      return;
    }

    if (window.google && window.google.maps) {
      setScriptLoaded(true);
      return;
    }

    if (window.googleMapsScriptLoaded) {
      const checkGoogle = setInterval(() => {
        if (window.google && window.google.maps) {
          setScriptLoaded(true);
          clearInterval(checkGoogle);
        }
      }, 100);
      return () => clearInterval(checkGoogle);
    }

    window.googleMapsScriptLoaded = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=googleMapsCallback`;
    script.async = true;
    script.defer = true;

    window.googleMapsCallback = () => {
      setScriptLoaded(true);
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      window.googleMapsScriptLoaded = false;
      setMapError(true);
    };

    document.head.appendChild(script);
  }, [pickupOption, GOOGLE_MAPS_API_KEY]);

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!window.google || !mapRef.current || isInitializing.current) return;

    isInitializing.current = true;

    try {
      const defaultCenter = { lat: 30.0444, lng: 31.2357 }; // Cairo

      const map = new window.google.maps.Map(mapRef.current, {
        center: initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : defaultCenter,
        zoom: initialLocation ? 15 : 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [
          { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] }
        ]
      });

      mapInstanceRef.current = map;
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      placesServiceRef.current = new window.google.maps.places.PlacesService(map);
      geocoderRef.current = new window.google.maps.Geocoder();

      // Click listener for map
      map.addListener('click', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        geocoderRef.current.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
          if (status === 'OK' && results[0]) {
            const location: HotelPickupLocation = {
              address: results[0].formatted_address,
              lat,
              lng,
              placeId: results[0].place_id
            };
            handleLocationSelect(location);
          }
        });
      });

      if (initialLocation) {
        placeMarker(initialLocation.lat, initialLocation.lng);
      }

      setIsMapLoaded(true);
      isInitializing.current = false;
    } catch (error) {
      console.error('Error initializing map:', error);
      isInitializing.current = false;
      setMapError(true);
    }
  }, [initialLocation]);

  // Initialize map when ready
  useEffect(() => {
    if (scriptLoaded && pickupOption === 'now' && !mapInstanceRef.current) {
      const timer = setTimeout(initializeMap, 100);
      return () => clearTimeout(timer);
    }
  }, [scriptLoaded, pickupOption, initializeMap]);

  const placeMarker = (lat: number, lng: number) => {
    if (!mapInstanceRef.current || !window.google) return;

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      animation: window.google.maps.Animation.DROP,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 28 20 28s20-14 20-28C40 8.954 31.046 0 20 0z" fill="#DC2626"/>
            <circle cx="20" cy="20" r="8" fill="white"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(40, 48),
        anchor: new window.google.maps.Point(20, 48),
      }
    });

    mapInstanceRef.current.panTo({ lat, lng });
    mapInstanceRef.current.setZoom(16);
  };

  const handleLocationSelect = (location: HotelPickupLocation) => {
    setSelectedLocation(location);
    setSearchQuery(location.name || location.address);
    onLocationSelect(location);
    placeMarker(location.lat, location.lng);
    setShowPredictions(false);
    setPredictions([]);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim() || !autocompleteServiceRef.current) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: value,
          componentRestrictions: { country: 'eg' },
          types: ['lodging'], // Only hotels
        },
        (results: any[], status: string) => {
          setIsSearching(false);
          if (status === 'OK' && results) {
            setPredictions(results.slice(0, 5));
            setShowPredictions(true);
          } else {
            // Try with geocode if no lodging results
            autocompleteServiceRef.current.getPlacePredictions(
              {
                input: value,
                componentRestrictions: { country: 'eg' },
              },
              (geoResults: any[], geoStatus: string) => {
                if (geoStatus === 'OK' && geoResults) {
                  setPredictions(geoResults.slice(0, 5));
                  setShowPredictions(true);
                } else {
                  setPredictions([]);
                }
              }
            );
          }
        }
      );
    }, 300);
  };

  const handlePredictionSelect = (prediction: any) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      { placeId: prediction.place_id, fields: ['formatted_address', 'geometry', 'name'] },
      (place: any, status: string) => {
        if (status === 'OK' && place.geometry) {
          const location: HotelPickupLocation = {
            address: place.formatted_address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            placeId: prediction.place_id,
            name: place.name
          };
          handleLocationSelect(location);
        }
      }
    );
  };

  const handleQuickAreaSelect = (area: typeof POPULAR_AREAS[0]) => {
    const location: HotelPickupLocation = {
      address: area.name + ', Egypt',
      lat: area.lat,
      lng: area.lng,
      name: area.name
    };
    handleLocationSelect(location);
  };

  const handleClear = () => {
    setSelectedLocation(null);
    setSearchQuery('');
    onLocationSelect(null);
    setPredictions([]);
    setShowPredictions(false);
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  };

  const handleLaterOption = () => {
    setPickupOption('later');
    onLocationSelect(null);
  };

  return (
    <div className="space-y-4">
      {/* Initial Choice */}
      {pickupOption === null && (
        <div className="space-y-3">
          <p className="text-base font-medium text-slate-800 mb-3">
            Where should we pick you up?
          </p>

          <button
            type="button"
            onClick={() => setPickupOption('now')}
            className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-start hover:border-red-400 hover:bg-red-50/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                <MapPin className="text-red-600" size={20} />
              </div>
              <div>
                <div className="font-semibold text-slate-900">Enter pickup location</div>
                <div className="text-sm text-slate-500">Search for your hotel or address</div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleLaterOption}
            className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-start hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Clock className="text-blue-600" size={20} />
              </div>
              <div>
                <div className="font-semibold text-slate-900">I'll provide it later</div>
                <div className="text-sm text-slate-500">We'll contact you before the tour</div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Later Option Confirmation */}
      {pickupOption === 'later' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <Check className="text-white" size={16} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-blue-900">No problem!</p>
              <p className="text-sm text-blue-700 mt-1">
                We'll contact you via WhatsApp or email 24 hours before your tour to confirm your pickup location.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPickupOption(null)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Location Entry */}
      {pickupOption === 'now' && (
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                placeholder="Search hotel name or address..."
                className="w-full ps-10 pe-10 py-3.5 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all text-base"
              />
              {(searchQuery || selectedLocation) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Predictions Dropdown */}
            {showPredictions && predictions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                {predictions.map((prediction, index) => (
                  <button
                    key={prediction.place_id}
                    type="button"
                    onClick={() => handlePredictionSelect(prediction)}
                    className={`w-full px-4 py-3 text-start hover:bg-slate-50 flex items-start gap-3 transition-colors ${
                      index !== predictions.length - 1 ? 'border-b border-slate-100' : ''
                    }`}
                  >
                    <Building2 className="text-slate-400 mt-0.5 flex-shrink-0" size={18} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {prediction.structured_formatting?.main_text || prediction.description}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {prediction.structured_formatting?.secondary_text || ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Location Display */}
          {selectedLocation && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <Check className="text-white" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-green-900">Pickup location set</p>
                  <p className="text-sm text-green-700 mt-0.5 break-words">
                    {selectedLocation.name || selectedLocation.address}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-green-600 hover:text-green-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Quick Select Areas - show when no location selected */}
          {!selectedLocation && !showPredictions && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Popular areas:</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_AREAS.map((area) => (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => handleQuickAreaSelect(area)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-full transition-colors"
                  >
                    {area.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          {!mapError ? (
            <div className="relative bg-slate-100 rounded-xl overflow-hidden h-[280px]">
              <div ref={mapRef} className="w-full h-full" />
              {!isMapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm text-slate-500">Loading map...</p>
                  </div>
                </div>
              )}
              {isMapLoaded && !selectedLocation && (
                <div className="absolute bottom-3 start-3 end-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
                  <p className="text-xs text-slate-600">
                    <Navigation className="inline-block me-1" size={12} />
                    Click on the map to select a location
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Phone className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-amber-900">Map unavailable</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Please type your hotel name or address above, or choose "I'll provide it later" and we'll contact you.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Back Button */}
          <button
            type="button"
            onClick={() => {
              setPickupOption(null);
              handleClear();
            }}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Choose different option
          </button>
        </div>
      )}
    </div>
  );
}
