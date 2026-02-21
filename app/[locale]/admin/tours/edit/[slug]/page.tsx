// app/admin/tours/edit/[slug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import withAuth from '@/components/admin/withAuth';
import { Calendar, ArrowLeft, Loader2 } from 'lucide-react';
import 'react-day-picker/dist/style.css';
import TourForm from '@/components/TourForm';

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