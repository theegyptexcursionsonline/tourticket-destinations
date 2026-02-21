// app/admin/availability/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import withAuth from '@/components/admin/withAuth';
import { 
  Calendar, ChevronLeft, ChevronRight, X, Lock, Unlock, 
  AlertCircle, Users, RefreshCw,
  Plus, Minus, Save, Loader2, History, Info
} from 'lucide-react';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import toast from 'react-hot-toast';
import StopSaleHistoryTable, { StopSaleLogEntry, StopSaleLogDetailModal } from '@/components/admin/StopSaleHistoryTable';

interface Slot {
  time: string;
  capacity: number;
  booked: number;
  blocked: boolean;
  blockReason?: string;
}

interface AvailabilityData {
  _id: string;
  tour: { _id: string; title: string };
  date: string;
  slots: Slot[];
  stopSale: boolean;
  stopSaleReason?: string;
  stopSaleStatus?: 'none' | 'partial' | 'full';
  stoppedOptionIds?: string[];
  stopSaleReasons?: Record<string, string>;
}

interface Tour {
  _id: string;
  title: string;
  tenantId: string;
}

// Calendar helper functions
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const formatDate = (year: number, month: number, day: number) => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

type TabType = 'calendar' | 'history';

const AvailabilityPage = () => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTour, setSelectedTour] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState<Map<string, AvailabilityData>>(new Map());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isToursLoading, setIsToursLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [showStopSaleRangeModal, setShowStopSaleRangeModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  
  // Stop sale log detail modal (when clicking calendar)
  const [selectedStopSaleLog, setSelectedStopSaleLog] = useState<StopSaleLogEntry | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  const { selectedTenantId, getSelectedTenant, isAllTenantsSelected } = useAdminTenant();
  const selectedTenant = getSelectedTenant();
  const effectiveTenantId =
    selectedTenantId && selectedTenantId !== 'all'
      ? selectedTenantId
      : tours.find((t) => t._id === selectedTour)?.tenantId || 'default';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Fetch tours
  useEffect(() => {
    const fetchTours = async () => {
      setIsToursLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedTenantId && selectedTenantId !== 'all') {
          params.set('tenantId', selectedTenantId);
        }
        const response = await fetch(`/api/admin/tours?${params.toString()}`);
        const data = await response.json();
        if (data.success) {
          setTours(data.data || []);
          if (data.data?.length > 0 && !selectedTour) {
            setSelectedTour(data.data[0]._id);
          }
        }
      } catch (error) {
        console.error('Error fetching tours:', error);
      } finally {
        setIsToursLoading(false);
      }
    };
    fetchTours();
  }, [selectedTenantId]);

  // Fetch availability for selected tour and month
  const fetchAvailability = useCallback(async () => {
    if (!selectedTour) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        tourId: selectedTour,
        month: String(month + 1),
        year: String(year),
      });
      if (selectedTenantId && selectedTenantId !== 'all') {
        params.set('tenantId', selectedTenantId);
      }
      
      const response = await fetch(`/api/admin/availability?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        const availMap = new Map<string, AvailabilityData>();
        data.data.forEach((item: AvailabilityData) => {
          const dateKey = new Date(item.date).toISOString().split('T')[0];
          availMap.set(dateKey, item);
        });
        setAvailability(availMap);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTour, month, year, selectedTenantId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Date selection handlers
  const toggleDateSelection = (dateStr: string) => {
    const newSelected = new Set(selectedDates);
    if (newSelected.has(dateStr)) {
      newSelected.delete(dateStr);
    } else {
      newSelected.add(dateStr);
    }
    setSelectedDates(newSelected);
  };

  const clearSelection = () => {
    setSelectedDates(new Set());
  };

  // Get status for a date
  const getDateStatus = (dateStr: string) => {
    const avail = availability.get(dateStr);
    if (!avail) return 'default';
    if (avail.stopSaleStatus === 'full' || avail.stopSale) return 'stopSaleFull';
    if (avail.stopSaleStatus === 'partial') return 'stopSalePartial';
    
    const totalCapacity = avail.slots.reduce((sum, s) => sum + s.capacity, 0);
    const totalBooked = avail.slots.reduce((sum, s) => sum + s.booked, 0);
    
    if (totalBooked >= totalCapacity) return 'sold_out';
    if (totalBooked >= totalCapacity * 0.8) return 'limited';
    return 'available';
  };

  // Bulk actions
  const handleBulkAction = async (action: 'block' | 'unblock') => {
    if (selectedDates.size === 0 || !selectedTour) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId: selectedTour,
          dates: Array.from(selectedDates),
          action,
          tenantId: effectiveTenantId,
          stopSaleReason: action === 'block' ? 'Manually blocked' : '',
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`${action === 'block' ? 'Blocked' : 'Unblocked'} ${selectedDates.size} dates`);
        fetchAvailability();
        clearSelection();
      } else {
        toast.error(data.error || 'Failed to update');
      }
    } catch {
      toast.error('Failed to update dates');
    } finally {
      setIsSaving(false);
    }
  };

  // Open slot editor modal
  const openSlotEditor = (dateStr: string) => {
    setModalDate(dateStr);
    setShowModal(true);
  };

  // Fetch stop sale logs for a specific date
  const fetchStopSaleLogsForDate = async (dateStr: string) => {
    if (!selectedTour) return;
    
    setIsLoadingLogs(true);
    try {
      // Use POST endpoint to fetch logs for specific date + tour
      const response = await fetch('/api/admin/stop-sale-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId: selectedTour,
          date: dateStr,
          tenantId: selectedTenantId !== 'all' ? selectedTenantId : undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // API returns array of logs for this date
        const logs = Array.isArray(data.data) ? data.data : [data.data];
        if (logs.length > 0) {
          // Show the first (most recent) log
          setSelectedStopSaleLog(logs[0]);
        } else {
          // No log found, just open the slot editor
          openSlotEditor(dateStr);
        }
      } else {
        openSlotEditor(dateStr);
      }
    } catch (error) {
      console.error('Error fetching stop sale logs:', error);
      openSlotEditor(dateStr);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Handle calendar date click
  const handleDateClick = (dateStr: string, hasStopSale: boolean) => {
    if (hasStopSale) {
      // Show stop sale log details
      fetchStopSaleLogsForDate(dateStr);
    } else {
      // Open slot editor
      openSlotEditor(dateStr);
    }
  };

  // Status colors
  const statusColors: Record<string, string> = {
    default: 'bg-white hover:bg-slate-50 border-slate-200',
    available: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700',
    limited: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700',
    sold_out: 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700',
    stopSaleFull: 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-800',
    stopSalePartial: 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800',
    blocked: 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-500', // legacy
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Availability Management</h1>
            <p className="text-sm text-slate-500">
              {isAllTenantsSelected() ? (
                'Manage tour availability across all brands'
              ) : (
                <>Managing for <span className="font-medium text-indigo-600">{selectedTenant?.name}</span></>
              )}
            </p>
          </div>
        </div>
        
        {/* Tour selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedTour}
            onChange={(e) => setSelectedTour(e.target.value)}
            disabled={isToursLoading}
            className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[250px]"
          >
            {isToursLoading ? (
              <option>Loading tours...</option>
            ) : tours.length === 0 ? (
              <option>No tours available</option>
            ) : (
              tours.map(tour => (
                <option key={tour._id} value={tour._id}>{tour.title}</option>
              ))
            )}
          </select>
          <button
            onClick={fetchAvailability}
            disabled={isLoading}
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowStopSaleRangeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors"
          >
            <Lock className="w-4 h-4" />
            Stop Sale
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'calendar'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendar View
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            Stop Sale History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'history' ? (
        <StopSaleHistoryTable tours={tours} initialTourId={selectedTour} />
      ) : (
        <>

      {/* Bulk Actions Bar */}
      {selectedDates.size > 0 && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium text-indigo-700">
              {selectedDates.size} date{selectedDates.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleBulkAction('block')}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              Block Dates
            </button>
            <button
              onClick={() => handleBulkAction('unblock')}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              Unblock Dates
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mb-6 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-200 border border-emerald-300" />
          <span className="text-slate-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-200 border border-amber-300" />
          <span className="text-slate-600">Limited</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-rose-200 border border-rose-300" />
          <span className="text-slate-600">Sold Out</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-rose-200 border border-rose-300" />
          <span className="text-slate-600">Stop-sale (All options)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-200 border border-amber-300" />
          <span className="text-slate-600">Stop-sale (Some options)</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">
              {monthName} {year}
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Today
            </button>
          </div>
          
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-slate-500 bg-slate-50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before month starts */}
          {[...Array(firstDay)].map((_, i) => (
            <div key={`empty-${i}`} className="h-24 border-b border-e border-slate-100 bg-slate-50/50" />
          ))}
          
          {/* Days of the month */}
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const dateStr = formatDate(year, month, day);
            const status = getDateStatus(dateStr);
            const avail = availability.get(dateStr);
            const isSelected = selectedDates.has(dateStr);
            const isPast = new Date(dateStr) < new Date(new Date().toDateString());
            const hasStopSale = status === 'stopSaleFull' || status === 'stopSalePartial' || avail?.stopSale;
            
            return (
              <div
                key={day}
                className={`h-24 border-b border-e border-slate-100 p-2 cursor-pointer transition-all ${
                  statusColors[status]
                } ${isSelected ? 'ring-2 ring-indigo-500 ring-inset' : ''} ${
                  isPast ? 'opacity-50' : ''
                }`}
                onClick={() => !isPast && handleDateClick(dateStr, !!hasStopSale)}
              >
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium">
                    {day}
                  </span>
                  <div className="flex items-center gap-2">
                    {!isPast && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDateSelection(dateStr)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        aria-label={`Select ${dateStr} for bulk actions`}
                      />
                    )}
                    {(avail?.stopSaleStatus === 'full' || avail?.stopSale) && (
                      <Lock className="w-3 h-3 text-rose-700" />
                    )}
                    {avail?.stopSaleStatus === 'partial' && (
                      <AlertCircle className="w-3 h-3 text-amber-700" />
                    )}
                  </div>
                </div>
                
                {avail && !avail.stopSale && avail.stopSaleStatus !== 'full' && (
                  <div className="mt-1 text-xs">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>
                        {avail.slots.reduce((s, slot) => s + slot.booked, 0)}/
                        {avail.slots.reduce((s, slot) => s + slot.capacity, 0)}
                      </span>
                    </div>
                  </div>
                )}
                
                {(avail?.stopSaleStatus === 'full' || avail?.stopSale) && (
                  <div className="mt-1 text-xs text-rose-800 flex items-center gap-1">
                    <span>Stop-sale</span>
                    <Info className="w-3 h-3 opacity-60" />
                  </div>
                )}
                {avail?.stopSaleStatus === 'partial' && (
                  <div className="mt-1 text-xs text-amber-800 flex items-center gap-1">
                    <span>Partial ({avail.stoppedOptionIds?.length || 0})</span>
                    <Info className="w-3 h-3 opacity-60" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <h3 className="font-semibold text-slate-700 mb-2">Quick Tips</h3>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• <strong>Click</strong> a date to manage option-level stop-sale & slots</li>
          <li>• <strong>Click</strong> a stop-sale date (red) to view who applied it and why</li>
          <li>• Use the <strong>checkbox</strong> in the corner to select dates for bulk actions</li>
          <li>• Select multiple dates, then use the action bar to block/unblock (all options)</li>
          <li>• View the <strong>Stop Sale History</strong> tab for a complete log of all stop-sale actions</li>
        </ul>
      </div>
      </>
      )}

      {/* Stop Sale Log Detail Modal (from calendar click) */}
      {selectedStopSaleLog && (
        <StopSaleLogDetailModal
          log={selectedStopSaleLog}
          onClose={() => setSelectedStopSaleLog(null)}
        />
      )}

      {/* Loading overlay for log fetch */}
      {isLoadingLogs && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <div className="bg-white p-4 rounded-xl shadow-lg flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            <span className="text-slate-700">Loading stop sale details...</span>
          </div>
        </div>
      )}

      {/* Slot Editor Modal */}
      {showModal && modalDate && (
        <SlotEditorModal
          date={modalDate}
          tourId={selectedTour}
          tenantId={effectiveTenantId}
          existingData={availability.get(modalDate)}
          onClose={() => {
            setShowModal(false);
            setModalDate(null);
          }}
          onSave={() => {
            fetchAvailability();
            setShowModal(false);
            setModalDate(null);
          }}
        />
      )}

      {showStopSaleRangeModal && (
        <StopSaleRangeModal
          tours={tours}
          initialTourId={selectedTour}
          tenantId={effectiveTenantId}
          onClose={() => setShowStopSaleRangeModal(false)}
          onApplied={() => {
            fetchAvailability();
            setShowStopSaleRangeModal(false);
          }}
        />
      )}
    </div>
  );
};

function StopSaleRangeModal({
  tours,
  initialTourId,
  tenantId,
  onClose,
  onApplied,
}: {
  tours: Tour[];
  initialTourId: string;
  tenantId: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [tourId, setTourId] = useState(initialTourId);
  const [options, setOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [allOptions, setAllOptions] = useState(true);
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!tourId) return;
      try {
        const res = await fetch(`/api/tours/${tourId}/options`);
        const data = await res.json();
        const opts = Array.isArray(data) ? data : [];
        setOptions(opts.map((o: any) => ({ id: o.id, title: o.title })));
      } catch {
        setOptions([]);
      }
    };
    load();
  }, [tourId]);

  const toggleOption = (id: string) => {
    const next = new Set(selectedOptionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedOptionIds(next);
  };

  const submit = async (method: 'PUT' | 'DELETE') => {
    if (!tourId) return;
    setIsWorking(true);
    try {
      const optionIds = allOptions ? [] : Array.from(selectedOptionIds);
      const res = await fetch('/api/availability/stop-sale', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          optionIds,
          startDate,
          endDate,
          reason,
          tenantId,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        toast.error(json?.error || 'Failed to update stop-sale');
        return;
      }
      toast.success(method === 'PUT' ? 'Stop-sale applied' : 'Stop-sale removed');
      onApplied();
    } catch {
      toast.error('Failed to update stop-sale');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Stop Sale</h3>
            <p className="text-sm text-slate-500">Apply stop-sale by option over a date range</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Tour</label>
            <select
              value={tourId}
              onChange={(e) => setTourId(e.target.value)}
              className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {tours.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Options</label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allOptions}
                  onChange={(e) => {
                    setAllOptions(e.target.checked);
                    if (e.target.checked) setSelectedOptionIds(new Set());
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-sm font-medium text-slate-800">All Options</span>
              </label>
              {!allOptions && (
                <div className="ps-7 space-y-2">
                  {options.map((opt) => (
                    <label key={opt.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedOptionIds.has(opt.id)}
                        onChange={() => toggleOption(opt.id)}
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm text-slate-700">{opt.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason…"
              className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={() => submit('DELETE')}
            disabled={isWorking}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50"
          >
            Remove
          </button>
          <button
            onClick={() => submit('PUT')}
            disabled={isWorking}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50"
          >
            {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// Slot Editor Modal Component
function SlotEditorModal({
  date,
  tourId,
  tenantId,
  existingData,
  onClose,
  onSave,
}: {
  date: string;
  tourId: string;
  tenantId: string;
  existingData?: AvailabilityData;
  onClose: () => void;
  onSave: () => void;
}) {
  const [slots, setSlots] = useState<Slot[]>(
    existingData?.slots || [{ time: '09:00', capacity: 10, booked: 0, blocked: false }]
  );
  const [stopSale, setStopSale] = useState(existingData?.stopSale || false); // full (all options) for this date
  const [stopSaleReason, setStopSaleReason] = useState(existingData?.stopSaleReason || '');
  const [isSaving, setIsSaving] = useState(false);

  const [isStopSaleLoading, setIsStopSaleLoading] = useState(false);
  const [stopSaleStatus, setStopSaleStatus] = useState<'none' | 'partial' | 'full'>(
    existingData?.stopSaleStatus || (existingData?.stopSale ? 'full' : 'none')
  );
  const [tourOptions, setTourOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [stoppedOptionIds, setStoppedOptionIds] = useState<Set<string>>(
    new Set(existingData?.stoppedOptionIds || [])
  );
  const [showOptions, setShowOptions] = useState(true);

  const refreshStopSaleInfo = useCallback(async () => {
    setIsStopSaleLoading(true);
    try {
      const params = new URLSearchParams({ date, tenantId });
      const res = await fetch(`/api/availability/${tourId}?${params.toString()}`);
      const json = await res.json();
      if (json?.success) {
        setTourOptions(json.data?.options || []);
        setStopSaleStatus(json.data?.stopSaleStatus || 'none');
        setStoppedOptionIds(new Set(json.data?.stoppedOptionIds || []));

        // Keep the legacy checkbox in sync with effective "full" status
        const full = json.data?.stopSaleStatus === 'full';
        setStopSale(full);
        if (full && typeof json.data?.reasons?.all === 'string' && !stopSaleReason) {
          setStopSaleReason(json.data.reasons.all);
        }
      }
    } catch {
      // silent; keep existing UI state
    } finally {
      setIsStopSaleLoading(false);
    }
  }, [date, tenantId, tourId, stopSaleReason]);

  useEffect(() => {
    refreshStopSaleInfo();
  }, [refreshStopSaleInfo]);

  const setAllOptionsStopSale = async (enabled: boolean) => {
    setIsStopSaleLoading(true);
    try {
      const method = enabled ? 'PUT' : 'DELETE';
      const res = await fetch('/api/availability/stop-sale', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          optionIds: [],
          startDate: date,
          endDate: date,
          reason: stopSaleReason || (enabled ? 'Blocked' : ''),
          tenantId,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        toast.error(json?.error || 'Failed to update stop-sale');
      } else {
        toast.success(enabled ? 'Stop-sale applied (all options)' : 'Stop-sale removed (all options)');
      }
      await refreshStopSaleInfo();
    } catch {
      toast.error('Failed to update stop-sale');
    } finally {
      setIsStopSaleLoading(false);
    }
  };

  const setOptionStopSale = async (optionId: string, enabled: boolean) => {
    setIsStopSaleLoading(true);
    try {
      const method = enabled ? 'PUT' : 'DELETE';
      const res = await fetch('/api/availability/stop-sale', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          optionIds: [optionId],
          startDate: date,
          endDate: date,
          reason: stopSaleReason || (enabled ? 'Blocked' : ''),
          tenantId,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        toast.error(json?.error || 'Failed to update stop-sale');
      } else {
        toast.success(enabled ? 'Option stop-sale applied' : 'Option stop-sale removed');
      }
      await refreshStopSaleInfo();
    } catch {
      toast.error('Failed to update stop-sale');
    } finally {
      setIsStopSaleLoading(false);
    }
  };

  const addSlot = () => {
    setSlots([...slots, { time: '12:00', capacity: 10, booked: 0, blocked: false }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof Slot, value: string | number | boolean) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          date,
          slots,
          stopSale,
          stopSaleReason,
          tenantId,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Availability saved');
        onSave();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (_error) {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit Availability</h3>
            <p className="text-sm text-slate-500">{new Date(date).toLocaleDateString('en-US', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {/* Stop-sale (option-level) */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={stopSaleStatus === 'full' || stopSale}
                disabled={isStopSaleLoading}
                onChange={(e) => setAllOptionsStopSale(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span className="font-medium text-slate-800">Stop Sale</span>
                <p className="text-sm text-slate-500">Block bookings for all options on this date</p>
              </div>
            </label>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowOptions((v) => !v)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                {showOptions ? 'Hide options' : 'Show options'}
              </button>
            </div>
            {(stopSaleStatus !== 'none' || showOptions) && (
              <input
                type="text"
                value={stopSaleReason}
                onChange={(e) => setStopSaleReason(e.target.value)}
                placeholder="Reason for blocking..."
                className="mt-3 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            )}
          </div>

          {showOptions && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-800">Options</h4>
                {isStopSaleLoading && <span className="text-xs text-slate-500">Updating…</span>}
              </div>
              <div className="space-y-2">
                {tourOptions.length === 0 ? (
                  <div className="text-sm text-slate-500">No options found for this tour.</div>
                ) : (
                  tourOptions.map((opt) => {
                    const isFull = stopSaleStatus === 'full' || stopSale;
                    const checked = isFull || stoppedOptionIds.has(opt.id);
                    return (
                      <label key={opt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isFull || isStopSaleLoading}
                          onChange={(e) => setOptionStopSale(opt.id, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-800">{opt.label}</div>
                          {stoppedOptionIds.has(opt.id) && stopSaleStatus === 'partial' && (
                            <div className="text-xs text-amber-700">Stopped</div>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Time Slots */}
          {!(stopSaleStatus === 'full' || stopSale) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-800">Time Slots</h4>
                <button
                  onClick={addSlot}
                  className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="w-4 h-4" />
                  Add Slot
                </button>
              </div>
              
              <div className="space-y-3">
                {slots.map((slot, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-slate-500">Time</label>
                        <input
                          type="time"
                          value={slot.time}
                          onChange={(e) => updateSlot(index, 'time', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-500">Capacity</label>
                        <input
                          type="number"
                          value={slot.capacity}
                          onChange={(e) => updateSlot(index, 'capacity', parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full px-2 py-1 border border-slate-300 rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-500">Booked</label>
                        <input
                          type="number"
                          value={slot.booked}
                          onChange={(e) => updateSlot(index, 'booked', parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full px-2 py-1 border border-slate-300 rounded"
                        />
                      </div>
                      {slots.length > 1 && (
                        <button
                          onClick={() => removeSlot(index)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded mt-4"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default withAuth(AvailabilityPage, { permissions: ['manageTours'] });

