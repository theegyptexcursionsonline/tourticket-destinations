// app/admin/dashboard/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import withAuth from '@/components/admin/withAuth';

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Just now';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  if (diff < 0 || isNaN(diff)) return 'Just now';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
import { Link } from '@/i18n/navigation';
import dynamic from 'next/dynamic';
import { 
  Plus, 
  List, 
  PenSquare, 
  BarChart2, 
  DollarSign, 
  BookOpen, 
  Users,
  TrendingUp,
  Activity,
  Sparkles,
  ArrowUpRight,
  Calendar,
  Zap
} from 'lucide-react';
import { useAdminTenant } from '@/contexts/AdminTenantContext';

// Lazy load charts for better initial load performance
const AreaChart = dynamic(
  () => import('recharts').then(mod => mod.AreaChart),
  { ssr: false, loading: () => <div className="h-80 bg-slate-100 rounded-2xl animate-pulse" /> }
);
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  totalTours: number;
  totalUsers: number;
  recentBookingsCount: number;
  recentActivities: { id: string; text: string; createdAt?: string }[];
}

interface MonthlyRevenue {
  name: string;
  revenue: number;
}

interface ReportData {
  monthlyRevenue: MonthlyRevenue[];
}

const DashboardSkeleton = () => (
  <div className="p-6 lg:p-8 animate-pulse">
    {/* Header Skeleton */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
      <div>
        <div className="h-10 w-64 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl mb-2"></div>
        <div className="h-5 w-80 bg-slate-200 rounded-full"></div>
      </div>
      <div className="h-12 w-40 bg-gradient-to-r from-blue-200 to-purple-200 rounded-2xl mt-4 sm:mt-0"></div>
    </div>

    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-4 w-24 bg-slate-200 rounded-full"></div>
              <div className="h-8 w-16 bg-slate-300 rounded-xl"></div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl"></div>
          </div>
        </div>
      ))}
    </div>

    {/* Charts Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="h-6 w-48 bg-slate-200 rounded-full mb-6"></div>
        <div className="h-80 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl"></div>
      </div>
      <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="h-6 w-36 bg-slate-200 rounded-full mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-2xl"></div>
              <div className="h-4 w-full bg-slate-200 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const StatCard = React.memo(({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  trend 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  color?: string;
  trend?: { value: number; isPositive: boolean };
}) => {
  const colorClasses = useMemo(() => ({
    blue: "from-blue-500 to-blue-600 shadow-blue-500/25",
    green: "from-emerald-500 to-emerald-600 shadow-emerald-500/25",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/25",
    orange: "from-orange-500 to-orange-600 shadow-orange-500/25",
  }[color]), [color]);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
            {value}
          </p>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              trend.isPositive ? 'text-emerald-600' : 'text-red-500'
            }`}>
              <TrendingUp className={`h-3 w-3 ${!trend.isPositive && 'rotate-180'}`} />
              {Math.abs(trend.value)}% vs last month
            </div>
          )}
        </div>
        <div className={`bg-gradient-to-br ${colorClasses} p-4 rounded-2xl shadow-lg text-white transform group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
});
StatCard.displayName = 'StatCard';

const QuickActionCard = React.memo(({ 
  href, 
  icon: Icon, 
  title, 
  description, 
  color = "blue",
  badge,
  disabled = false 
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color?: string;
  badge?: string;
  disabled?: boolean;
}) => {
  const colorClasses = useMemo(() => ({
    blue: "from-blue-50 to-blue-100 text-blue-600 border-blue-200",
    green: "from-emerald-50 to-emerald-100 text-emerald-600 border-emerald-200",
    purple: "from-purple-50 to-purple-100 text-purple-600 border-purple-200",
    gray: "from-slate-50 to-slate-100 text-slate-400 border-slate-200",
  }[disabled ? 'gray' : color]), [disabled, color]);

  const Component = disabled ? 'div' : Link;

  return (
    <Component 
      href={disabled ? '#' : href}
      className={`relative bg-white rounded-3xl p-6 shadow-sm border border-slate-100 transition-all duration-300 group ${
        disabled 
          ? 'cursor-not-allowed' 
          : 'hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1'
      }`}
    >
      {badge && (
        <div className="absolute -top-2 -end-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
          {badge}
        </div>
      )}
      
      <div className="flex items-start gap-4">
        <div className={`bg-gradient-to-br ${colorClasses} border p-4 rounded-2xl transition-transform duration-300 ${
          !disabled && 'group-hover:scale-110'
        }`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-lg mb-2 ${disabled ? 'text-slate-400' : 'text-slate-800'}`}>
            {title}
          </h3>
          <p className={`text-sm leading-relaxed ${disabled ? 'text-slate-400' : 'text-slate-600'}`}>
            {description}
          </p>
          {!disabled && (
            <div className="flex items-center gap-1 mt-3 text-blue-600 font-medium text-sm group-hover:gap-2 transition-all">
              Get started <ArrowUpRight className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
    </Component>
  );
});
QuickActionCard.displayName = 'QuickActionCard';

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get tenant filter from context
  const { selectedTenantId, getSelectedTenant, isAllTenantsSelected } = useAdminTenant();
  const selectedTenant = getSelectedTenant();

  // Memoized fetch function with retry logic
  const fetchDashboardData = useCallback(async (retryCount = 0) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('admin-auth-token');
      if (!token) {
        setError('Authentication required. Please log in.');
        setIsLoading(false);
        return;
      }

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      };

      // Build query params with tenant filter
      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.set('tenantId', selectedTenantId);
      }
      const queryString = params.toString();
      const dashboardUrl = `/api/admin/dashboard${queryString ? `?${queryString}` : ''}`;
      const reportsUrl = `/api/admin/reports${queryString ? `?${queryString}` : ''}`;

      // Add timeout to fetch requests (10 seconds)
      const fetchWithTimeout = async (url: string, options: RequestInit) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal
          });
          clearTimeout(timeout);
          return response;
        } catch (error: any) {
          clearTimeout(timeout);
          if (error.name === 'AbortError') {
            throw new Error('Request timeout - server is taking too long to respond');
          }
          throw error;
        }
      };

      // Parallel fetching with timeout
      const [dashboardRes, reportRes] = await Promise.all([
        fetchWithTimeout(dashboardUrl, { headers }),
        fetchWithTimeout(reportsUrl, { headers })
      ]);

      if (!dashboardRes.ok) {
        if (dashboardRes.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(`Dashboard API error: ${dashboardRes.status}`);
      }
      if (!reportRes.ok && retryCount < 2) {
        // Retry reports API once (it's less critical)
        console.warn('Reports API failed, will retry...');
      }

      const [dashboardData, reportData] = await Promise.all([
        dashboardRes.json(),
        reportRes.json()
      ]);

      // Handle dashboard data with fallback
      if (dashboardData.success) {
        setStats(dashboardData.data);
      } else if (dashboardData.data) {
        // Even if not successful, use partial data if available
        console.warn('Dashboard returned partial data:', dashboardData.error);
        setStats(dashboardData.data);
      } else {
        throw new Error(dashboardData.error || 'Failed to fetch dashboard data');
      }

      // Handle report data with fallback
      if (reportData && reportData.monthlyRevenue) {
        setReportData(reportData);
      } else {
        console.warn('Report data unavailable, using fallback');
        // Use fallback empty data instead of failing
        setReportData({ monthlyRevenue: [] });
      }

    } catch (err) {
      console.error('Dashboard fetch error:', err);
      const errorMessage = (err as Error).message;
      
      // Retry once for transient errors (except auth errors)
      if (retryCount === 0 && !errorMessage.includes('Authentication') && !errorMessage.includes('Session expired')) {
        console.log('Retrying dashboard fetch...');
        setTimeout(() => fetchDashboardData(1), 1000);
        return;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTenantId]);

  // Fetch data when tenant changes
  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Dashboard</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-600 mb-2">No Data Available</h3>
          <p className="text-slate-500">Dashboard data is not available at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-slate-50/30 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-emerald-700">Live</span>
            </div>
          </div>
          <p className="text-slate-600 text-lg">
            {isAllTenantsSelected() ? (
              <>Welcome back! Showing data from <span className="font-semibold text-slate-700">all brands</span>.</>
            ) : (
              <>Showing data for <span className="font-semibold text-indigo-600">{selectedTenant?.name || selectedTenantId}</span>.</>
            )}
          </p>
        </div>
        <Link 
          href="/admin/tours/new" 
          className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 font-semibold"
        >
          <Plus className="h-5 w-5" />
          Create New Tour
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Bookings" 
          value={stats.totalBookings.toLocaleString()} 
          icon={BookOpen} 
          color="blue"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard 
          title="Total Revenue" 
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalRevenue)} 
          icon={DollarSign} 
          color="green"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard 
          title="Active Tours" 
          value={stats.totalTours.toLocaleString()} 
          icon={List} 
          color="purple"
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard 
          title="Total Users" 
          value={stats.totalUsers.toLocaleString()} 
          icon={Users} 
          color="orange"
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickActionCard
            href="/admin/bookings"
            icon={Calendar}
            title="Manage Bookings"
            description="View, edit, and track all tour bookings and customer reservations."
            color="blue"
          />
          <QuickActionCard
            href="/admin/tours"
            icon={List}
            title="Manage Tours"
            description="Create, edit, and organize your tour offerings and itineraries."
            color="green"
          />
         <QuickActionCard
  href="/admin/blog"
  icon={PenSquare}
  title="Manage Blog"
  description="Create engaging content and manage your travel blog posts."
  color="purple"
/>


        </div>
      </div>

      {/* Charts and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Revenue Analytics</h2>
              <p className="text-slate-600">Sales performance over the last 6 months</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
              <BarChart2 className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="h-80">
            {reportData?.monthlyRevenue ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData.monthlyRevenue} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [
                      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value)),
                      'Revenue'
                    ]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '16px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <BarChart2 className="h-16 w-16 mb-4 opacity-50"/>
                <p className="text-lg font-medium">Chart data unavailable</p>
                <p className="text-sm">Revenue analytics will appear here when data is available</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Recent Activities</h2>
              <p className="text-slate-600 text-sm">Latest updates and actions</p>
            </div>
          </div>
          
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-4 w-4 text-blue-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 leading-relaxed">{activity.text}</p>
                    <p className="text-xs text-slate-500 mt-1">{timeAgo(activity.createdAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">No recent activities</p>
                <p className="text-slate-400 text-sm">Activities will appear here as they happen</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default withAuth(AdminDashboard, { permissions: ['manageDashboard'] });