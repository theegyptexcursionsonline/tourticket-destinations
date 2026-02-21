// components/admin/StopSaleHistoryTable.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  History,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Clock,
  User,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAdminTenant } from '@/contexts/AdminTenantContext';

interface Tour {
  _id: string;
  title: string;
}

interface StopSaleLogEntry {
  _id: string;
  tourId: {
    _id: string;
    title: string;
    slug: string;
  };
  optionId: string | null;
  optionTitle: string;
  dateFrom: string;
  dateTo: string;
  reason: string;
  appliedBy: {
    _id: string;
    name?: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  appliedByName: string;
  appliedAt: string;
  removedBy: {
    _id: string;
    name?: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
  removedByName: string | null;
  removedAt: string | null;
  status: 'active' | 'removed';
  tenantId: string;
}

interface StopSaleHistoryTableProps {
  tours: Tour[];
  initialTourId?: string;
  onViewDetails?: (log: StopSaleLogEntry) => void;
}

export default function StopSaleHistoryTable({
  tours,
  initialTourId,
  onViewDetails,
}: StopSaleHistoryTableProps) {
  const { selectedTenantId } = useAdminTenant();
  const [logs, setLogs] = useState<StopSaleLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [tourFilter, setTourFilter] = useState(initialTourId || 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'removed'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // Selected log for detail view
  const [selectedLog, setSelectedLog] = useState<StopSaleLogEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.set('tenantId', selectedTenantId);
      }
      if (tourFilter && tourFilter !== 'all') {
        params.set('tourId', tourFilter);
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (startDate) {
        params.set('startDate', startDate);
      }
      if (endDate) {
        params.set('endDate', endDate);
      }
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('sortBy', 'appliedAt');
      params.set('sortOrder', 'desc');

      const response = await fetch(`/api/admin/stop-sale-logs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      } else {
        setError(data.error || 'Failed to fetch logs');
      }
    } catch (err) {
      setError('Failed to fetch stop sale history');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTenantId, tourFilter, statusFilter, startDate, endDate, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [tourFilter, statusFilter, startDate, endDate]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDateRange = (from: string, to: string) => {
    const fromDate = formatDate(from);
    const toDate = formatDate(to);
    if (fromDate === toDate) {
      return fromDate;
    }
    return `${fromDate} → ${toDate}`;
  };

  const clearFilters = () => {
    setTourFilter('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = tourFilter !== 'all' || statusFilter !== 'all' || startDate || endDate;

  const handleRowClick = (log: StopSaleLogEntry) => {
    if (onViewDetails) {
      onViewDetails(log);
    } else {
      setSelectedLog(log);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <History className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Stop Sale History</h2>
              <p className="text-sm text-slate-500">
                {total} record{total !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Tour filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tour</label>
            <div className="relative">
              <select
                value={tourFilter}
                onChange={(e) => setTourFilter(e.target.value)}
                className="w-full h-9 ps-3 pe-8 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
              >
                <option value="all">All Tours</option>
                {tours.map((tour) => (
                  <option key={tour._id} value={tour._id}>
                    {tour.title}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center px-2">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'removed')}
                className="w-full h-9 ps-3 pe-8 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="removed">Removed</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center px-2">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Applied From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Applied To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Clear filters */}
          <div className="flex items-end">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="h-9 px-3 text-sm font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <AlertCircle className="w-8 h-8 mb-2 text-rose-500" />
            <p>{error}</p>
            <button onClick={fetchLogs} className="mt-2 text-indigo-600 hover:underline">
              Try again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <History className="w-8 h-8 mb-2 text-slate-400" />
            <p>No stop sale history found</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-2 text-indigo-600 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Tour
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Option
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Date Range
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Reason
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Applied By
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Applied At
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr
                  key={log._id}
                  onClick={() => handleRowClick(log)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 text-sm">
                      {log.tourId?.title || 'Unknown Tour'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        log.optionId
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {log.optionId ? log.optionTitle : 'All options'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDateRange(log.dateFrom, log.dateTo)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-600 max-w-[200px] truncate">
                      {log.reason || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {log.appliedByName}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatDateTime(log.appliedAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        log.status === 'active'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {log.status === 'active' ? (
                        <>
                          <Lock className="w-3 h-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3" />
                          Removed
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <StopSaleLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

interface StopSaleLogDetailModalProps {
  log: StopSaleLogEntry;
  onClose: () => void;
}

function StopSaleLogDetailModal({ log, onClose }: StopSaleLogDetailModalProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                log.status === 'active' ? 'bg-rose-100' : 'bg-emerald-100'
              }`}
            >
              {log.status === 'active' ? (
                <Lock className="h-5 w-5 text-rose-600" />
              ) : (
                <Unlock className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Stop Sale Log Entry</h3>
              <p className="text-sm text-slate-500">
                {log.status === 'active' ? 'Currently active' : 'Removed'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Tour info */}
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-xs font-medium text-slate-500 mb-1">Tour</div>
            <div className="font-semibold text-slate-800">{log.tourId?.title || 'Unknown Tour'}</div>
          </div>

          {/* Option */}
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-xs font-medium text-slate-500 mb-1">Option</div>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium ${
                log.optionId ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {log.optionId ? log.optionTitle : 'All options'}
            </span>
          </div>

          {/* Date range */}
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-xs font-medium text-slate-500 mb-1">Blocked Dates</div>
            <div className="flex items-center gap-2 text-slate-800">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{formatDate(log.dateFrom)}</span>
              {log.dateFrom !== log.dateTo && (
                <>
                  <span className="text-slate-400">→</span>
                  <span>{formatDate(log.dateTo)}</span>
                </>
              )}
            </div>
          </div>

          {/* Reason */}
          {log.reason && (
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-xs font-medium text-slate-500 mb-1">Reason</div>
              <div className="text-slate-800">{log.reason}</div>
            </div>
          )}

          {/* Applied info */}
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="text-xs font-medium text-indigo-600 mb-2">Applied</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-800">{log.appliedByName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-600">{formatDateTime(log.appliedAt)}</span>
              </div>
            </div>
          </div>

          {/* Removed info */}
          {log.status === 'removed' && log.removedAt && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-xs font-medium text-emerald-600 mb-2">Removed</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-800">{log.removedByName || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-600">{formatDateTime(log.removedAt)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Export the detail modal separately for use from calendar
export { StopSaleLogDetailModal };
export type { StopSaleLogEntry };
