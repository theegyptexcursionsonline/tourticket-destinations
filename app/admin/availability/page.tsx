// app/admin/availability/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import withAuth from '@/components/admin/withAuth';
import { 
  Calendar, ChevronLeft, ChevronRight, X, Lock, Unlock, 
  AlertCircle, CheckCircle, Clock, Users, RefreshCw,
  Plus, Minus, Save, Loader2
} from 'lucide-react';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import toast from 'react-hot-toast';

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
  const [isSaving, setIsSaving] = useState(false);
  
  const { selectedTenantId, getSelectedTenant, isAllTenantsSelected } = useAdminTenant();
  const selectedTenant = getSelectedTenant();

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
    if (avail.stopSale) return 'blocked';
    
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
          tenantId: selectedTenantId || 'default',
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
    } catch (error) {
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

  // Status colors
  const statusColors: Record<string, string> = {
    default: 'bg-white hover:bg-slate-50 border-slate-200',
    available: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700',
    limited: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700',
    sold_out: 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700',
    blocked: 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-500',
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
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
        </div>
      </div>

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
          <div className="w-4 h-4 rounded bg-slate-200 border border-slate-300" />
          <span className="text-slate-600">Blocked</span>
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
            <div key={`empty-${i}`} className="h-24 border-b border-r border-slate-100 bg-slate-50/50" />
          ))}
          
          {/* Days of the month */}
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const dateStr = formatDate(year, month, day);
            const status = getDateStatus(dateStr);
            const avail = availability.get(dateStr);
            const isSelected = selectedDates.has(dateStr);
            const isPast = new Date(dateStr) < new Date(new Date().toDateString());
            
            return (
              <div
                key={day}
                className={`h-24 border-b border-r border-slate-100 p-2 cursor-pointer transition-all ${
                  statusColors[status]
                } ${isSelected ? 'ring-2 ring-indigo-500 ring-inset' : ''} ${
                  isPast ? 'opacity-50' : ''
                }`}
                onClick={() => !isPast && toggleDateSelection(dateStr)}
                onDoubleClick={() => !isPast && openSlotEditor(dateStr)}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-sm font-medium ${
                    status === 'blocked' ? 'text-slate-400' : ''
                  }`}>
                    {day}
                  </span>
                  {avail?.stopSale && (
                    <Lock className="w-3 h-3 text-slate-400" />
                  )}
                </div>
                
                {avail && !avail.stopSale && (
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
                
                {avail?.stopSale && (
                  <div className="mt-1 text-xs text-slate-400">
                    Blocked
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
          <li>• <strong>Click</strong> on a date to select it for bulk actions</li>
          <li>• <strong>Double-click</strong> on a date to edit slots</li>
          <li>• Select multiple dates, then use the action bar to block/unblock</li>
        </ul>
      </div>

      {/* Slot Editor Modal */}
      {showModal && modalDate && (
        <SlotEditorModal
          date={modalDate}
          tourId={selectedTour}
          tenantId={selectedTenantId || 'default'}
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
    </div>
  );
};

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
  const [stopSale, setStopSale] = useState(existingData?.stopSale || false);
  const [stopSaleReason, setStopSaleReason] = useState(existingData?.stopSaleReason || '');
  const [isSaving, setIsSaving] = useState(false);

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
    } catch (error) {
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
          {/* Stop Sale Toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={stopSale}
                onChange={(e) => setStopSale(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span className="font-medium text-slate-800">Stop Sale</span>
                <p className="text-sm text-slate-500">Block all bookings for this date</p>
              </div>
            </label>
            {stopSale && (
              <input
                type="text"
                value={stopSaleReason}
                onChange={(e) => setStopSaleReason(e.target.value)}
                placeholder="Reason for blocking..."
                className="mt-3 w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            )}
          </div>

          {/* Time Slots */}
          {!stopSale && (
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

