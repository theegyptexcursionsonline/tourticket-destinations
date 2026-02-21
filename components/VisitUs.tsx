'use client';
import { useState } from 'react';
import { MapPin, Phone, Clock } from 'lucide-react';

// Data for locations and store details
const locations = [
    { city: 'ALL', count: 0 },
    { city: 'CAIRO', count: 1 },
    { city: 'GIZA', count: 1 },
    { city: 'LUXOR', count: 1 },
];

const storeLocations = {
    'ALL': [
        {
            name: 'Egypt Excursions Cairo Central',
            address: 'Tahrir Square, Downtown Cairo, Cairo Governorate',
            phone: '+20 2 2392 3456',
            hours: '8:00 AM - 10:00 PM',
            type: 'Main Office'
        },
        {
            name: 'Giza Pyramids Visitor Center',
            address: 'Al Haram, Giza Governorate, near Great Pyramid',
            phone: '+20 2 3377 2134',
            hours: '6:00 AM - 8:00 PM',
            type: 'Tour Center'
        },
        {
            name: 'Luxor Heritage Tours',
            address: 'Corniche An Nil, Luxor, Luxor Governorate',
            phone: '+20 95 237 1892',
            hours: '7:00 AM - 9:00 PM',
            type: 'Regional Office'
        }
    ],
    'CAIRO': [
        {
            name: 'Egypt Excursions Cairo Central',
            address: 'Tahrir Square, Downtown Cairo, Cairo Governorate',
            phone: '+20 2 2392 3456',
            hours: '8:00 AM - 10:00 PM',
            type: 'Main Office'
        }
    ],
    'GIZA': [
        {
            name: 'Giza Pyramids Visitor Center',
            address: 'Al Haram, Giza Governorate, near Great Pyramid',
            phone: '+20 2 3377 2134',
            hours: '6:00 AM - 8:00 PM',
            type: 'Tour Center'
        }
    ],
    'LUXOR': [
        {
            name: 'Luxor Heritage Tours',
            address: 'Corniche An Nil, Luxor, Luxor Governorate',
            phone: '+20 95 237 1892',
            hours: '7:00 AM - 9:00 PM',
            type: 'Regional Office'
        }
    ]
};

export default function VisitUs() {
    const [activeCity, setActiveCity] = useState('ALL');
    
    // The list of locations to display is determined by the active city filter
    const currentLocations = storeLocations[activeCity as keyof typeof storeLocations] || storeLocations.ALL;

    return (
        <section className="bg-slate-50 py-16 lg:py-20">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-800 mb-3">
                        VISIT US IN PERSON
                    </h2>
                    {/* The button to show the map has been removed and replaced with a subtitle */}
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Explore our office locations across Egypt. Use the filters to find an office in a specific city.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                    {/* Map Section - Now always visible */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-[500px] w-full">
                            {/* The map is now rendered directly without conditional logic */}
                            <div className="relative w-full h-full bg-gradient-to-b from-blue-50 to-amber-50">
                                {/* Egypt Map SVG Representation */}
                                <div className="absolute inset-0 p-6">
                                    <svg viewBox="0 0 500 400" className="w-full h-full">
                                        {/* Egypt outline (simplified) */}
                                        <path 
                                            d="M60 100 L220 75 L250 50 L280 55 L310 45 L340 50 L370 65 L400 85 L430 115 L450 145 L460 180 L465 215 L455 250 L445 275 L425 295 L405 310 L385 320 L365 325 L345 328 L325 330 L305 328 L285 325 L265 320 L245 315 L225 305 L205 290 L185 270 L165 245 L145 220 L125 195 L105 170 L85 145 L70 120 L65 110 Z" 
                                            fill="#f4f1e8" 
                                            stroke="#d4af37" 
                                            strokeWidth="3"
                                        />
                                        
                                        {/* Nile River */}
                                        <path 
                                            d="M250 50 Q240 100 230 150 Q225 200 220 250 Q215 300 210 330" 
                                            stroke="#4f9eff" 
                                            strokeWidth="4" 
                                            fill="none"
                                        />
                                        
                                        {/* Location Markers with animation */}
                                        <g className="location-marker">
                                            <circle cx="230" cy="150" r="10" fill="#ef4444" stroke="white" strokeWidth="3"/>
                                            <text x="245" y="145" fontSize="12" fill="#1f2937" fontWeight="bold">CAIRO</text>
                                        </g>
                                        <g className="location-marker">
                                            <circle cx="225" cy="155" r="8" fill="#f59e0b" stroke="white" strokeWidth="3"/>
                                            <text x="240" y="170" fontSize="12" fill="#1f2937" fontWeight="bold">GIZA</text>
                                        </g>
                                        <g className="location-marker">
                                            <circle cx="220" cy="225" r="10" fill="#10b981" stroke="white" strokeWidth="3"/>
                                            <text x="235" y="220" fontSize="12" fill="#1f2937" fontWeight="bold">LUXOR</text>
                                        </g>
                                        
                                        {/* Pyramids Symbol at Giza */}
                                        <g>
                                          <polygon points="220,150 228,150 224,142" fill="#d4af37" stroke="#92400e" strokeWidth="1"/>
                                          <polygon points="224,150 232,150 228,142" fill="#d4af37" stroke="#92400e" strokeWidth="1"/>
                                          <polygon points="228,150 236,150 232,142" fill="#d4af37" stroke="#92400e" strokeWidth="1"/>
                                        </g>
                                    </svg>
                                    
                                    {/* Map Legend */}
                                    <div className="absolute bottom-6 start-6 bg-white p-4 rounded-lg shadow-md">
                                        <h4 className="text-sm font-bold text-slate-800 mb-3">Our Locations</h4>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                                                <span>Main Office</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                                                <span>Tour Center</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                                                <span>Regional Office</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Locations List */}
                    <div className="lg:col-span-1">
                        {/* Filter Buttons */}
                        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-4">
                            {locations.map(location => (
                                <button
                                    key={location.city}
                                    onClick={() => setActiveCity(location.city)}
                                    className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
                                        activeCity === location.city
                                            ? 'bg-slate-800 text-white'
                                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                    }`}
                                >
                                    {location.city}
                                </button>
                            ))}
                        </div>

                        {/* Location Cards */}
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pe-2">
                            {currentLocations.map((location, index) => (
                                <div key={index} className="bg-white p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0">
                                            <MapPin className="w-6 h-6 text-red-500 mt-1" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-800 text-sm leading-tight">{location.name}</h4>
                                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full whitespace-nowrap ms-2">
                                                    {location.type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 mb-3 leading-relaxed">{location.address}</p>
                                            
                                            <div className="space-y-1 mb-3">
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Phone className="w-3 h-3 flex-shrink-0" />
                                                    <span>{location.phone}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Clock className="w-3 h-3 flex-shrink-0" />
                                                    <span>{location.hours}</span>
                                                </div>
                                            </div>
                                            
                                            <a href={`https://maps.google.com/?q=${encodeURIComponent(location.address)}`} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 font-semibold hover:underline">
                                                Get Directions
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Coming Soon */}
                        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                            <h4 className="font-semibold text-slate-800 mb-1">Expanding Soon</h4>
                            <p className="text-sm text-slate-600">New locations in Aswan, Alexandria, and Hurghada coming this year!</p>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.1);
                        opacity: 0.7;
                    }
                }
                .location-marker {
                    animation: pulse 2s infinite ease-in-out;
                }
            `}</style>
        </section>
    );
}