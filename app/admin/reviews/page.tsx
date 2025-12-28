// app/admin/reviews/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import withAuth from '@/components/admin/withAuth';
import { Star, MessageSquare, User, Map, Trash2, CheckCircle, ShieldCheck, Clock, TrendingUp, Users, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminTenant } from '@/contexts/AdminTenantContext';

// --- Type Definitions ---
interface Review {
  _id: string;
  user: {
    name: string;
  };
  tour: {
    title: string;
  };
  rating: number;
  comment: string;
  verified: boolean;
  createdAt: string;
}

interface ReviewStats {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  averageRating: number;
}

// --- Star Rating Component ---
const StarRating = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`${size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'} ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-slate-300'
        }`}
      />
    ))}
    <span className={`ml-2 ${size === 'lg' ? 'text-lg' : 'text-sm'} font-semibold text-slate-700`}>
      {rating}/5
    </span>
  </div>
);

const ReviewsPage = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    pendingReviews: 0,
    approvedReviews: 0,
    averageRating: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get tenant filter from context
  const { selectedTenantId, getSelectedTenant, isAllTenantsSelected } = useAdminTenant();
  const selectedTenant = getSelectedTenant();

  // --- Calculate stats from reviews ---
  const calculateStats = (reviewsData: Review[]): ReviewStats => {
    const totalReviews = reviewsData.length;
    const pendingReviews = reviewsData.filter((r: Review) => !r.verified).length;
    const approvedReviews = reviewsData.filter((r: Review) => r.verified).length;
    const averageRating = totalReviews > 0
      ? Math.round((reviewsData.reduce((sum: number, r: Review) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

    return { totalReviews, pendingReviews, approvedReviews, averageRating };
  };

  // --- Fetch reviews with tenant filter ---
  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build query params with tenant filter
      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.set('tenantId', selectedTenantId);
      }
      const queryString = params.toString();
      const url = `/api/admin/reviews${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      setReviews(data);
      setStats(calculateStats(data));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTenantId]);

  // Fetch reviews when tenant changes
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // --- Recalculate stats whenever reviews change ---
  useEffect(() => {
    setStats(calculateStats(reviews));
  }, [reviews]);

  // Filter reviews based on active filter
  useEffect(() => {
    switch (activeFilter) {
      case 'pending':
        setFilteredReviews(reviews.filter(r => !r.verified));
        break;
      case 'approved':
        setFilteredReviews(reviews.filter(r => r.verified));
        break;
      default:
        setFilteredReviews(reviews);
    }
  }, [reviews, activeFilter]);

  // --- Approve a Review ---
  const handleApprove = async (id: string) => {
    const loadingToast = toast.loading('Approving review...');
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: true }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve review');
      }
      const updatedReview = await response.json();

      // Update the review in the local state
      setReviews(reviews.map(r => r._id === id ? updatedReview : r));
      toast.success('Review approved successfully!', { id: loadingToast });
    } catch (err) {
      toast.error(`Error: ${(err as Error).message}`, { id: loadingToast });
    }
  };

  // --- Delete a Review ---
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;
    const loadingToast = toast.loading('Deleting review...');
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete review');
      }

      // Remove the review from the local state
      setReviews(reviews.filter(r => r._id !== id));
      toast.success('Review deleted successfully!', { id: loadingToast });
    } catch (err) {
      toast.error(`Error: ${(err as Error).message}`, { id: loadingToast });
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "slate" }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
  }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          {subtitle && <p className="text-slate-400 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color === 'red' ? 'bg-red-100' : color === 'yellow' ? 'bg-yellow-100' : 'bg-slate-100'}`}>
          <Icon className={`h-6 w-6 ${color === 'red' ? 'text-red-600' : color === 'yellow' ? 'text-yellow-600' : 'text-slate-600'}`} />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen animate-pulse">
        <div className="flex items-center mb-8">
          <div className="h-8 w-8 bg-slate-200 rounded mr-3" />
          <div className="h-8 w-64 bg-slate-200 rounded" />
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-lg">
              <div className="h-12 w-12 bg-slate-200 rounded-lg mb-4" />
              <div className="h-6 w-16 bg-slate-200 rounded mb-2" />
              <div className="h-4 w-24 bg-slate-200 rounded" />
            </div>
          ))}
        </div>

        {/* Reviews Skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-lg">
              <div className="space-y-4">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-16 w-full bg-slate-200 rounded" />
                <div className="h-4 w-48 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Reviews</div>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex items-center mb-8">
        <div className="p-2 bg-slate-100 rounded-lg mr-4">
          <MessageSquare className="h-8 w-8 text-slate-600" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">Review Management</h1>
          <p className="text-slate-500 mt-1">
            {isAllTenantsSelected() ? (
              <>Showing reviews from <span className="font-semibold text-slate-700">all brands</span>.</>
            ) : (
              <>Showing reviews for <span className="font-semibold text-indigo-600">{selectedTenant?.name || selectedTenantId}</span>.</>
            )}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={MessageSquare}
          title="Total Reviews"
          value={stats.totalReviews}
          subtitle="All customer reviews"
        />
        <StatCard
          icon={Clock}
          title="Pending Review"
          value={stats.pendingReviews}
          subtitle="Awaiting approval"
          color="yellow"
        />
        <StatCard
          icon={CheckCircle}
          title="Approved"
          value={stats.approvedReviews}
          subtitle="Live on website"
          color="red"
        />
        <StatCard
          icon={Star}
          title="Average Rating"
          value={stats.averageRating}
          subtitle="Overall satisfaction"
          color="yellow"
        />
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {[
            { key: 'all', label: 'All Reviews', count: stats.totalReviews },
            { key: 'pending', label: 'Pending', count: stats.pendingReviews },
            { key: 'approved', label: 'Approved', count: stats.approvedReviews }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key as any)}
              className={`px-6 py-4 font-semibold transition-colors flex items-center space-x-2 ${
                activeFilter === tab.key
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                activeFilter === tab.key ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className="space-y-6">
          {filteredReviews.map(review => (
            <div key={review._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <StarRating rating={review.rating} size="lg" />
                      <div className="flex items-center space-x-3">
                        {!review.verified && (
                          <button
                            onClick={() => handleApprove(review._id)}
                            className="inline-flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium text-sm"
                          >
                            <ShieldCheck className="h-4 w-4 mr-2"/>
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(review._id)}
                          className="inline-flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
                        >
                          <Trash2 className="h-4 w-4 mr-2"/>
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
                      review.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {review.verified ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Approval
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Review Comment */}
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <p className="text-slate-700 italic leading-relaxed">
                    "{review.comment}"
                  </p>
                </div>

                {/* Review Metadata */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-slate-500 pt-4 border-t border-slate-200">
                  <div className="flex flex-wrap items-center gap-4 mb-2 sm:mb-0">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white font-semibold text-xs mr-2">
                        {review.user?.name?.charAt(0)?.toUpperCase() || review.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium">{review.user?.name || 'Unknown User'}</span>
                    </div>
                    <div className="flex items-center">
                      <Map className="h-4 w-4 mr-2 text-slate-400" />
                      <span className="font-semibold text-slate-700">{review.tour?.title || 'Unknown Tour'}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-slate-400">
                    <span>{new Date(review.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-16 text-center">
          <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <MessageSquare className="h-12 w-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-600 mb-2">
            {activeFilter === 'pending' ? 'No Pending Reviews' :
             activeFilter === 'approved' ? 'No Approved Reviews' : 'No Reviews Yet'}
          </h3>
          <p className="text-slate-400">
            {activeFilter === 'pending' ? 'All reviews have been processed.' :
             activeFilter === 'approved' ? 'No reviews have been approved yet.' :
             'No customer reviews have been submitted yet.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default withAuth(ReviewsPage, { permissions: ['manageContent'] });