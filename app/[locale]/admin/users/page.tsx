'use client';

import { useState, useEffect } from 'react';
import withAuth from '@/components/admin/withAuth';
import { Users, Mail, Calendar, BookOpen, TrendingUp, Activity, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface User {
  _id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  createdAt: string;
  bookingCount: number;
}

interface UserStats {
  totalUsers: number;
  totalBookings: number;
  activeThisMonth: number;
  averageBookingsPerUser: number;
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    totalBookings: 0,
    activeThisMonth: 0,
    averageBookingsPerUser: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAdminAuth();

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  const fetchUsers = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
      
      const totalUsers = data.length;
      const totalBookings = data.reduce((sum: number, user: User) => sum + user.bookingCount, 0);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const activeThisMonth = data.filter((user: User) => {
        const userDate = new Date(user.createdAt);
        return userDate.getMonth() === currentMonth && userDate.getFullYear() === currentYear;
      }).length;
      const averageBookingsPerUser = totalUsers > 0 ? Math.round((totalBookings / totalUsers) * 10) / 10 : 0;
      
      setStats({
        totalUsers,
        totalBookings,
        activeThisMonth,
        averageBookingsPerUser
      });
    } catch (err) {
      setError((err as Error).message);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserDisplayName = (user: User) => {
    if (user.name) return user.name;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return user.email.split('@')[0];
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const userName = users.find(u => u._id === userId);
    const displayName = userName ? getUserDisplayName(userName) : userEmail;
    
    const confirmMessage = `Are you sure you want to delete this user?\n\nName: ${displayName}\nEmail: ${userEmail}\n\nThis action cannot be undone and will also delete all associated bookings and data.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    const doubleConfirm = confirm('⚠️ FINAL WARNING: This will permanently delete the user and all their data. Are you absolutely sure?');
    
    if (!doubleConfirm) {
      return;
    }

    setDeletingUserId(userId);

    try {
      if (!token) {
        toast.error('Missing admin token');
        return;
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      if (data.success) {
        toast.success(`User "${displayName}" deleted successfully`);
        setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
        
        const updatedUsers = users.filter(user => user._id !== userId);
        const totalUsers = updatedUsers.length;
        const totalBookings = updatedUsers.reduce((sum, user) => sum + user.bookingCount, 0);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const activeThisMonth = updatedUsers.filter((user) => {
          const userDate = new Date(user.createdAt);
          return userDate.getMonth() === currentMonth && userDate.getFullYear() === currentYear;
        }).length;
        const averageBookingsPerUser = totalUsers > 0 ? Math.round((totalBookings / totalUsers) * 10) / 10 : 0;
        
        setStats({
          totalUsers,
          totalBookings,
          activeThisMonth,
          averageBookingsPerUser
        });
      } else {
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Delete user error:', err);
      toast.error((err as Error).message || 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="flex items-center mb-8">
          <div className="h-8 w-8 bg-slate-200 rounded me-3" />
          <div className="h-8 w-64 bg-slate-200 rounded" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-lg">
              <div className="h-12 w-12 bg-slate-200 rounded-lg mb-4" />
              <div className="h-6 w-16 bg-slate-200 rounded mb-2" />
              <div className="h-4 w-24 bg-slate-200 rounded" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4">
                <div className="h-10 w-10 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-48 bg-slate-200 rounded" />
                </div>
                <div className="h-4 w-20 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Users</div>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

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
        <div className={`p-3 rounded-lg ${color === 'red' ? 'bg-red-100' : 'bg-slate-100'}`}>
          <Icon className={`h-6 w-6 ${color === 'red' ? 'text-red-600' : 'text-slate-600'}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex items-center mb-8">
        <div className="p-2 bg-slate-100 rounded-lg me-4">
          <Users className="h-8 w-8 text-slate-600" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">User Management</h1>
          <p className="text-slate-500 mt-1">Manage and monitor your platform users</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Users}
          title="Total Users"
          value={stats.totalUsers}
          subtitle="Registered accounts"
        />
        <StatCard
          icon={BookOpen}
          title="Total Bookings"
          value={stats.totalBookings}
          subtitle="All-time bookings"
          color="red"
        />
        <StatCard
          icon={TrendingUp}
          title="New This Month"
          value={stats.activeThisMonth}
          subtitle="Monthly growth"
        />
        <StatCard
          icon={Activity}
          title="Avg. Bookings/User"
          value={stats.averageBookingsPerUser}
          subtitle="Per user metric"
        />
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">All Users</h2>
          <p className="text-slate-500 text-sm">Complete list of registered users</p>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No Users Yet</h3>
            <p className="text-slate-400">No users have registered on your platform yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-end text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {users.map((user) => {
                  const displayName = getUserDisplayName(user);
                  const initial = displayName.charAt(0).toUpperCase();
                  
                  return (
                    <tr key={user._id} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white font-semibold text-sm me-3 flex-shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">
                              {displayName}
                            </div>
                            <div className="text-xs text-slate-500">ID: {user._id.slice(-6)}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-slate-600">
                          <Mail className="h-4 w-4 me-2 text-slate-400 flex-shrink-0" />
                          <span className="text-sm truncate">{user.email}</span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-slate-600">
                          <Calendar className="h-4 w-4 me-2 text-slate-400 flex-shrink-0" />
                          <span className="text-sm">
                            {new Date(user.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100">
                          <BookOpen className="h-4 w-4 me-1 text-slate-500" />
                          <span className="text-sm font-semibold text-slate-700">
                            {user.bookingCount}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-end">
                        <button
                          onClick={() => handleDeleteUser(user._id, user.email)}
                          disabled={deletingUserId === user._id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete User"
                        >
                          {deletingUserId === user._id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              <span>Delete</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default withAuth(UsersPage, { permissions: ['manageUsers'] });