// app/admin/manifests/page.tsx
'use client';

import { useState, useEffect } from 'react';
import withAuth from '@/components/admin/withAuth';
import {
  ListPlus,
  Printer,
  User,
  Mail,
  Users,
  Clock,
  Download,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';
import { parseLocalDate, toDateOnlyString } from '@/utils/date';

// --- Type Definitions ---
interface Tour {
  _id: string;
  title: string;
}

interface ManifestBooking {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  time: string;
  guests: number;
}

interface ManifestData {
  tour: {
    title: string;
  };
  date: string;
  bookings: ManifestBooking[];
}

const formatManifestDate = (dateString: string): string => {
  const date = parseLocalDate(dateString);
  if (!date || isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const ManifestsPage = () => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTour, setSelectedTour] = useState('');
  const [selectedDate, setSelectedDate] = useState(toDateOnlyString(new Date()));
  const [manifestData, setManifestData] = useState<ManifestData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all tours for the dropdown selector
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const response = await fetch('/api/admin/tours');
        if (!response.ok) throw new Error('Failed to fetch tours');
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          setTours(data.data);
          if (data.data.length > 0) {
            setSelectedTour(data.data[0]._id);
          }
        } else {
          throw new Error('Fetched data for tours is not in the expected format.');
        }
      } catch (err) {
        console.error("Error fetching tours:", err);
      }
    };
    fetchTours();
  }, []);

  const handleGenerateManifest = async () => {
    if (!selectedTour || !selectedDate) {
      setError('Please select a tour and a date.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setManifestData(null);

    try {
      const response = await fetch(`/api/admin/manifests?tourId=${selectedTour}&date=${selectedDate}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate manifest');
      }
      const data = await response.json();
      setManifestData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const totalGuests = manifestData?.bookings.reduce((sum, booking) => sum + booking.guests, 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <ListPlus className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Tour Manifests
              </h1>
              <p className="text-slate-500 mt-1">
                Generate and manage passenger manifests for your tours
              </p>
            </div>
          </div>
        </div>

        {/* Filter Section with Modern Design */}
        <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Generate Manifest
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* Tour Selection */}
            <div className="space-y-2">
              <label htmlFor="tour-select" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MapPin className="h-4 w-4 text-blue-500" />
                Select Tour
              </label>
              <div className="relative">
                <select
                  id="tour-select"
                  value={selectedTour}
                  onChange={(e) => setSelectedTour(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer font-medium text-slate-700 bg-white"
                >
                  {tours.map(tour => (
                    <option key={tour._id} value={tour._id}>{tour.title}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <label htmlFor="date-select" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Calendar className="h-4 w-4 text-blue-500" />
                Select Date
              </label>
              <input
                type="date"
                id="date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-medium text-slate-700"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateManifest}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-3 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span>Generate Manifest</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Manifest Display Section */}
        {manifestData && (
          <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden">
            {/* Manifest Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {manifestData.tour.title}
                  </h2>
                  <p className="text-blue-100 font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatManifestDate(manifestData.date)}
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-lg"
                >
                  <Printer className="h-5 w-5" />
                  <span>Print Manifest</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="p-8 bg-gradient-to-r from-slate-50 to-blue-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-200/60 shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 font-medium">Total Guests</div>
                      <div className="text-3xl font-bold text-slate-900">{totalGuests}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-200/60 shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 font-medium">Total Bookings</div>
                      <div className="text-3xl font-bold text-slate-900">{manifestData.bookings.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Passenger List Table */}
            <div className="p-8">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                Passenger List
              </h3>

              {manifestData.bookings.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                    <Users className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-700 mb-3">No Bookings Found</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    There are no bookings for this tour on the selected date.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-100 to-slate-50">
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Lead Guest
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Contact Email
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Guests
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Check-in
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {manifestData.bookings.map((booking, index) => (
                        <tr
                          key={booking._id}
                          className={`group hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                              <span className="text-sm font-semibold text-slate-900">
                                {booking.user.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-600">
                                {booking.user.email}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="text-sm font-medium text-slate-700">
                                {booking.time}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <Users className="h-4 w-4" />
                              <span className="text-sm font-bold">{booking.guests}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex justify-center">
                              <div className="w-20 h-10 border-2 border-dashed border-slate-300 rounded-lg"></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .bg-gradient-to-br,
          .bg-gradient-to-r {
            background: white !important;
          }
          ${manifestData ? `
            .print\\:visible,
            .print\\:visible * {
              visibility: visible;
            }
          ` : ''}
        }
      `}</style>
    </div>
  );
};

export default withAuth(ManifestsPage, { permissions: ['manageBookings'] });
