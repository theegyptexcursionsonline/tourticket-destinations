// app/admin/tours/edit/[slug]/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import withAuth from '@/components/admin/withAuth';
import { Plus, Trash2, Calendar, Clock, Users, ArrowLeft, Loader2 } from 'lucide-react';
import 'react-day-picker/dist/style.css';
import TourForm from '@/components/TourForm';

// --- Helper: Availability Manager Component ---
const AvailabilityManager = ({ availability, setAvailability }: { availability: any, setAvailability: (data: any) => void }) => {
    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setAvailability({ ...availability, type: e.target.value });
    };

    const handleSlotChange = (index: number, field: string, value: string | number) => {
        const newSlots = [...availability.slots];
        newSlots[index] = { ...newSlots[index], [field]: value };
        setAvailability({ ...availability, slots: newSlots });
    };

    const addSlot = () => {
        const newSlots = [...availability.slots, { time: '12:00', capacity: 10 }];
        setAvailability({ ...availability, slots: newSlots });
    };

    const removeSlot = (index: number) => {
        const newSlots = availability.slots.filter((_: any, i: number) => i !== index);
        setAvailability({ ...availability, slots: newSlots });
    };

    const handleDayToggle = (dayIndex: number) => {
        const newAvailableDays = [...(availability.availableDays || [])];
        if (newAvailableDays.includes(dayIndex)) {
            setAvailability({ ...availability, availableDays: newAvailableDays.filter(d => d !== dayIndex) });
        } else {
            setAvailability({ ...availability, availableDays: [...newAvailableDays, dayIndex] });
        }
    };

    return (
        <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8 mt-8 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60">
            {/* Header Section */}
            <div className="flex items-center gap-3 mb-8">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                        Availability & Scheduling
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Configure when your tour is available</p>
                </div>
            </div>

            {/* Availability Type Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        Availability Type
                    </label>
                    <div className="relative">
                        <select 
                            value={availability?.type || 'daily'} 
                            onChange={handleTypeChange} 
                            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer text-slate-700 font-medium"
                        >
                            <option value="daily">🔄 Daily (Repeats Weekly)</option>
                            <option value="date_range">📅 Date Range</option>
                            <option value="specific_dates">📍 Specific Dates</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Available Days Selection */}
            {availability?.type === 'daily' && (
                <div className="mb-8">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
                        <Calendar className="h-4 w-4 text-indigo-500" />
                        Available Days
                    </label>
                    <div className="flex flex-wrap gap-3">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                            <button 
                                key={day} 
                                type="button" 
                                onClick={() => handleDayToggle(index)} 
                                className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                                    availability?.availableDays?.includes(index) 
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200' 
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'
                                }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Time Slots Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-slate-800">Time Slots & Capacity</h3>
                    </div>
                </div>

                <div className="space-y-4">
                    {(availability?.slots || []).map((slot: any, index: number) => (
                        <div 
                            key={index} 
                            className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-all duration-200 hover:shadow-md"
                        >
                            {/* Time Input */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="time" 
                                        value={slot.time || ''} 
                                        onChange={(e) => handleSlotChange(index, 'time', e.target.value)} 
                                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-slate-700 font-medium"
                                    />
                                </div>
                            </div>

                            {/* Capacity Input */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Capacity</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="number" 
                                        value={slot.capacity || 0} 
                                        onChange={(e) => handleSlotChange(index, 'capacity', Number(e.target.value))} 
                                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-slate-700 font-medium" 
                                        placeholder="Max guests"
                                        min="1"
                                    />
                                </div>
                            </div>

                            {/* Remove Button */}
                            <button 
                                type="button" 
                                onClick={() => removeSlot(index)} 
                                className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group-hover:opacity-100 opacity-70"
                            >
                                <Trash2 className="h-4 w-4"/>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add Time Slot Button */}
                <button 
                    type="button" 
                    onClick={addSlot} 
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200 group"
                >
                    <Plus className="h-5 w-5 group-hover:scale-110 transition-transform duration-200"/> 
                    Add Time Slot
                </button>
            </div>
        </div>
    );
};

const EditTourPage = () => {
    const [tourData, setTourData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    useEffect(() => {
        if (slug) {
            fetch(`/api/admin/tours/${slug}`)
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                })
                .then(data => {
                    if (data.success && data.data) {
                        const tour = data.data;
                        tour.availability = tour.availability || {
                            type: 'daily',
                            slots: [{ time: '10:00', capacity: 10 }],
                            availableDays: [0,1,2,3,4,5,6]
                        };

                        if (!tour.availability.slots || tour.availability.slots.length === 0) {
                            tour.availability.slots = [{ time: '10:00', capacity: 10 }];
                        }

                        if (!tour.availability.availableDays) {
                            tour.availability.availableDays = [0,1,2,3,4,5,6];
                        }
                        console.log('Tour data received from backend:', tour);
                        setTourData(tour);
                    } else {
                        throw new Error(data.message || 'Failed to load tour data');
                    }
                })
                .catch(err => {
                    console.error('Error loading tour:', err);
                    setError(`Failed to load tour data: ${err.message}`);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setError('No tour slug provided');
            setLoading(false);
        }
    }, [slug]);

    // Enhanced Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center">
                            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-slate-800">Loading tour data</h3>
                            <p className="text-slate-500 text-sm">Please wait while we fetch your tour details...</p>
                        </div>
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Enhanced Error State
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center space-y-6 p-8">
                        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-slate-800">Oops! Something went wrong</h3>
                            <p className="text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">{error}</p>
                        </div>
                        <button 
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-200 font-medium"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Tour Not Found State
    if (!tourData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center space-y-6 p-8">
                        <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mx-auto">
                            <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12a8 8 0 01-2.009-5.197m-13.982 0A7.962 7.962 0 006 12a8 8 0 002.009 5.197"></path>
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-slate-800">Tour not found</h3>
                            <p className="text-slate-500">The tour you're looking for doesn't exist or has been removed.</p>
                        </div>
                        <button 
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-200 font-medium"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Enhanced Header */}
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                        <button 
                            onClick={() => router.back()}
                            className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 group"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-indigo-600" />
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                                    Edit Tour
                                </h1>
                                <div className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 rounded-full text-xs font-semibold text-indigo-700">
                                    EDITING
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <p className="text-slate-600 font-medium">{tourData.title}</p>
                            </div>
                        </div>
                    </div>

                    {/* Status Bar */}
                    <div className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span>Last updated: {new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="w-px h-4 bg-slate-300"></div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-4 w-4" />
                            <span>Tour ID: {tourData._id?.slice(-8) || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Use the comprehensive TourForm component */}
                <TourForm tourToEdit={tourData} fullPage />
            </div>
        </div>
    );
};

export default withAuth(EditTourPage, { permissions: ['manageTours'] });