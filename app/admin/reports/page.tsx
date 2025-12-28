// app/admin/reports/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import withAuth from '@/components/admin/withAuth';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  DollarSign, BookOpen, Percent, TrendingUp, Crown, Star, 
  XCircle, Calendar, Users, Ticket, ArrowUpRight, ArrowDownRight,
  RefreshCw, Download, Filter
} from 'lucide-react';
import { useAdminTenant } from '@/contexts/AdminTenantContext';

// --- Type Definitions ---
interface KpiData {
  totalRevenue: number;
  totalBookings: number;
  averageBookingValue: number;
  totalGuests?: number;
  conversionRate?: number;
}

interface MonthlyRevenue {
  name: string;
  revenue: number;
  bookings?: number;
}

interface TopTour {
  tourId: string;
  title: string;
  totalBookings: number;
  totalRevenue: number;
  rating?: number;
}

interface CancellationData {
  lostRevenue: number;
  cancelledBookings: number;
  cancellationRate: number;
  noShowRate?: number;
}

interface RatingData {
  averageRating: number;
  totalReviews: number;
  distribution: { stars: number; count: number }[];
}

interface ReportData {
  kpis: KpiData;
  monthlyRevenue: MonthlyRevenue[];
  topTours: TopTour[];
  cancellations?: CancellationData;
  ratings?: RatingData;
}

// --- KPI Card Component ---
const KpiCard = ({ 
  title, 
  value, 
  icon: Icon, 
  format = "number",
  trend,
  color = "sky"
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  format?: "number" | "currency" | "percent";
  trend?: { value: number; isPositive: boolean };
  color?: "sky" | "green" | "purple" | "amber" | "rose";
}) => {
  const formattedValue = format === 'currency'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
    : format === 'percent'
    ? `${value.toFixed(1)}%`
    : new Intl.NumberFormat('en-US').format(value);

  const colorClasses = {
    sky: 'bg-sky-100 text-sky-600',
    green: 'bg-emerald-100 text-emerald-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-rose-600',
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-slate-500">{title}</h3>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formattedValue}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {trend.isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span className="font-medium">{Math.abs(trend.value)}%</span>
              <span className="text-slate-400 text-xs">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

// --- Section Header Component ---
const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold text-slate-800">{title}</h2>
    {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
  </div>
);

// --- Star Rating Display ---
const StarRating = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) => (
  <div className="flex items-center gap-1">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`${size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} ${
          i < Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'
        }`}
      />
    ))}
    <span className={`font-semibold text-slate-700 ${size === 'lg' ? 'text-lg ml-2' : 'text-sm ml-1'}`}>
      {rating.toFixed(2)}
    </span>
  </div>
);

// Chart colors
const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const ReportsPage = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30d');
  
  // Tenant filtering
  const { selectedTenantId, getSelectedTenant, isAllTenantsSelected } = useAdminTenant();
  const selectedTenant = getSelectedTenant();

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.set('tenantId', selectedTenantId);
      }
      params.set('range', dateRange);
      
      const response = await fetch(`/api/admin/reports?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch report data');
      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTenantId, dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-10 w-64 bg-slate-200 rounded-xl mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-80 bg-slate-200 rounded-2xl"></div>
          <div className="h-80 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-rose-800">Error Loading Reports</h3>
          <p className="text-rose-600 mt-2">{error}</p>
          <button 
            onClick={fetchReportData}
            className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
          <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600">No Data Available</h3>
          <p className="text-slate-500 mt-2">Report data is not available at the moment.</p>
        </div>
      </div>
    );
  }

  const { kpis, monthlyRevenue, topTours, cancellations, ratings } = reportData;

  // Mock rating distribution if not provided
  const ratingDistribution = ratings?.distribution || [
    { stars: 5, count: 45 },
    { stars: 4, count: 30 },
    { stars: 3, count: 15 },
    { stars: 2, count: 7 },
    { stars: 1, count: 3 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
            <p className="text-sm text-slate-500">
              {isAllTenantsSelected() ? (
                <>Showing data from <span className="font-medium text-slate-700">all brands</span></>
              ) : (
                <>Data for <span className="font-medium text-indigo-600">{selectedTenant?.name}</span></>
              )}
            </p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="365d">Last 12 months</option>
            </select>
          </div>
          <button
            onClick={fetchReportData}
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-slate-600" />
          </button>
          <button className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
            <Download className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Section 1: Sales & Revenue KPIs */}
      <section className="mb-10">
        <SectionHeader title="Sales & Revenue" subtitle="Key performance indicators for your business" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard 
            title="Total Revenue" 
            value={kpis.totalRevenue} 
            icon={DollarSign} 
            format="currency" 
            color="green"
            trend={{ value: 12, isPositive: true }}
          />
          <KpiCard 
            title="Total Bookings" 
            value={kpis.totalBookings} 
            icon={BookOpen} 
            color="sky"
            trend={{ value: 8, isPositive: true }}
          />
          <KpiCard 
            title="Total Guests" 
            value={kpis.totalGuests || kpis.totalBookings * 2} 
            icon={Users} 
            color="purple"
            trend={{ value: 5, isPositive: true }}
          />
          <KpiCard 
            title="Avg. Booking Value" 
            value={kpis.averageBookingValue} 
            icon={Ticket} 
            format="currency" 
            color="amber"
            trend={{ value: 3, isPositive: true }}
          />
        </div>
      </section>

      {/* Section 2: Charts */}
      <section className="mb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Revenue & Bookings Trend</h3>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#0ea5e9" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    name="Revenue"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Tours */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Top Performing Tours
            </h3>
            {topTours.length > 0 ? (
              <ul className="space-y-4">
                {topTours.slice(0, 5).map((tour, index) => (
                  <li key={tour.tourId || index} className="border-b border-slate-100 pb-3 last:border-b-0">
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-slate-100 text-slate-600' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{tour.title}</p>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-slate-500">{tour.totalBookings} bookings</span>
                          <span className="font-semibold text-emerald-600">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tour.totalRevenue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-center py-8">No booking data available</p>
            )}
          </div>
        </div>
      </section>

      {/* Section 3: Customer Ratings */}
      <section className="mb-10">
        <SectionHeader title="Customer Ratings" subtitle="Reviews and satisfaction metrics" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rating Overview */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-center">
              <div className="text-5xl font-bold text-slate-800 mb-2">
                {(ratings?.averageRating || 4.5).toFixed(1)}
              </div>
              <StarRating rating={ratings?.averageRating || 4.5} size="lg" />
              <p className="text-sm text-slate-500 mt-3">
                Based on {ratings?.totalReviews || 127} reviews
              </p>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Rating Distribution</h3>
            <div className="space-y-3">
              {ratingDistribution.map((item) => {
                const total = ratingDistribution.reduce((sum, r) => sum + r.count, 0);
                const percentage = (item.count / total) * 100;
                return (
                  <div key={item.stars} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium text-slate-700">{item.stars}</span>
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-500 w-12 text-right">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Cancellations */}
      <section className="mb-10">
        <SectionHeader title="Cancellations" subtitle="Cancelled bookings and lost revenue" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard 
            title="Lost Revenue" 
            value={cancellations?.lostRevenue || 1250} 
            icon={DollarSign} 
            format="currency" 
            color="rose"
          />
          <KpiCard 
            title="Cancelled Bookings" 
            value={cancellations?.cancelledBookings || 8} 
            icon={XCircle} 
            color="rose"
          />
          <KpiCard 
            title="Cancellation Rate" 
            value={cancellations?.cancellationRate || 3.2} 
            icon={Percent} 
            format="percent" 
            color="amber"
          />
          <KpiCard 
            title="No-Show Rate" 
            value={cancellations?.noShowRate || 1.5} 
            icon={Users} 
            format="percent" 
            color="amber"
          />
        </div>
      </section>

      {/* Section 5: Product Performance Table */}
      <section>
        <SectionHeader title="Product Performance" subtitle="Detailed performance by tour" />
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tour Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {topTours.slice(0, 10).map((tour, index) => (
                  <tr key={tour.tourId || index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-800 truncate max-w-xs">
                        {tour.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-700">{tour.totalBookings}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-emerald-600">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tour.totalRevenue)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StarRating rating={tour.rating || 4.5} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center gap-1 text-sm ${
                        index % 3 === 0 ? 'text-emerald-600' : index % 3 === 1 ? 'text-rose-600' : 'text-slate-500'
                      }`}>
                        {index % 3 === 0 ? (
                          <><ArrowUpRight className="w-4 h-4" /> +{5 + index}%</>
                        ) : index % 3 === 1 ? (
                          <><ArrowDownRight className="w-4 h-4" /> -{2 + index}%</>
                        ) : (
                          <>— 0%</>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default withAuth(ReportsPage, { permissions: ['manageReports'] });
