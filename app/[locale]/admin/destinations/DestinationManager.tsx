'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Loader2, 
  X, 
  UploadCloud, 
  Image as ImageIcon,
  MapPin,
  Globe,
  Camera,
  Sparkles,
  Check,
  AlertCircle,
  Star,
  Calendar,
  Thermometer,
  Users,
  Eye,
  EyeOff,
  Info,
  Plus,
  Minus
} from 'lucide-react';
import { IDestination } from '@/lib/models/Destination';
import { useAdminTenant } from '@/contexts/AdminTenantContext';

interface Tour {
  _id: string;
  title: string;
  slug: string;
}

interface FormData {
  name: string;
  slug: string;
  country: string;
  image: string;
  images: string[];
  description: string;
  longDescription: string;
  coordinates: {
    lat: string;
    lng: string;
  };
  currency: string;
  timezone: string;
  bestTimeToVisit: string;
  highlights: string[];
  thingsToDo: string[];
  localCustoms: string[];
  visaRequirements: string;
  languagesSpoken: string[];
  emergencyNumber: string;
  averageTemperature: {
    summer: string;
    winter: string;
  };
  climate: string;
  weatherWarnings: string[];
  featured: boolean;
  isPublished: boolean;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  linkedTours?: string[];
}

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export default function DestinationManager({ initialDestinations }: { initialDestinations: IDestination[] }) {
  const router = useRouter();
  const { selectedTenantId } = useAdminTenant();
  const [destinations, setDestinations] = useState<IDestination[]>(initialDestinations);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingDestination, setEditingDestination] = useState<IDestination | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  // Re-fetch destinations when selected brand changes
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedTenantId && selectedTenantId !== 'all') {
          params.set('tenantId', selectedTenantId);
        }
        const response = await fetch(`/api/admin/destinations?${params.toString()}`);
        const data = await response.json();
        if (data.success) {
          setDestinations(data.data);
        }
      } catch (error) {
        console.error('Error fetching destinations:', error);
      }
    };
    fetchDestinations();
  }, [selectedTenantId]);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    country: '',
    image: '',
    images: [],
    description: '',
    longDescription: '',
    coordinates: { lat: '', lng: '' },
    currency: '',
    timezone: '',
    bestTimeToVisit: '',
    highlights: [],
    thingsToDo: [],
    localCustoms: [],
    visaRequirements: '',
    languagesSpoken: [],
    emergencyNumber: '',
    averageTemperature: { summer: '', winter: '' },
    climate: '',
    weatherWarnings: [],
    featured: false,
    isPublished: true,
    metaTitle: '',
    metaDescription: '',
    tags: [],
    linkedTours: []
  });

  const [availableTours, setAvailableTours] = useState<Tour[]>([]);

  // Fetch available tours on component mount
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const response = await fetch('/api/admin/tours');
        const data = await response.json();
        if (data.success) {
          setAvailableTours(data.data.map((tour: any) => ({
            _id: tour._id,
            title: tour.title,
            slug: tour.slug
          })));
        }
      } catch (error) {
        console.error('Error fetching tours:', error);
      }
    };
    fetchTours();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      country: '',
      image: '',
      images: [],
      description: '',
      longDescription: '',
      coordinates: { lat: '', lng: '' },
      currency: '',
      timezone: '',
      bestTimeToVisit: '',
      highlights: [],
      thingsToDo: [],
      localCustoms: [],
      visaRequirements: '',
      languagesSpoken: [],
      emergencyNumber: '',
      averageTemperature: { summer: '', winter: '' },
      climate: '',
      weatherWarnings: [],
      featured: false,
      isPublished: true,
      metaTitle: '',
      metaDescription: '',
      tags: [],
      linkedTours: []
    });
  };

  const openPanelForCreate = () => {
    setEditingDestination(null);
    resetForm();
    setActiveTab('basic');
    setIsPanelOpen(true);
  };

  const openPanelForEdit = (dest: IDestination) => {
    if (!dest) {
      console.error('Destination object is undefined');
      return;
    }
    setEditingDestination(dest);
    setFormData({
      name: dest.name || '',
      slug: dest.slug || '',
      country: dest.country || '',
      image: dest.image || '',
      images: dest.images || [],
      description: dest.description || '',
      longDescription: dest.longDescription || '',
      coordinates: {
        lat: (dest.coordinates && typeof dest.coordinates.lat === 'number') ? dest.coordinates.lat.toString() : '',
        lng: (dest.coordinates && typeof dest.coordinates.lng === 'number') ? dest.coordinates.lng.toString() : ''
      },
      currency: dest.currency || '',
      timezone: dest.timezone || '',
      bestTimeToVisit: dest.bestTimeToVisit || '',
      highlights: dest.highlights || [],
      thingsToDo: dest.thingsToDo || [],
      localCustoms: dest.localCustoms || [],
      visaRequirements: dest.visaRequirements || '',
      languagesSpoken: dest.languagesSpoken || [],
      emergencyNumber: dest.emergencyNumber || '',
      averageTemperature: {
        summer: dest.averageTemperature?.summer || '',
        winter: dest.averageTemperature?.winter || ''
      },
      climate: dest.climate || '',
      weatherWarnings: dest.weatherWarnings || [],
      featured: dest.featured || false,
      isPublished: dest.isPublished ?? true,
      metaTitle: dest.metaTitle || '',
      metaDescription: dest.metaDescription || '',
      tags: dest.tags || [],
      linkedTours: []
    });

    // Fetch tours for this destination
    if (dest._id) {
      fetch(`/api/admin/tours`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // Find tours that have this destination
            const toursForThisDestination = data.data
              .filter((tour: any) => {
                const tourDestId = typeof tour.destination === 'string' ? tour.destination : tour.destination?._id;
                return tourDestId === (dest._id as any).toString();
              })
              .map((tour: any) => tour._id);

            setFormData(prev => ({ ...prev, linkedTours: toursForThisDestination }));
          }
        })
        .catch(err => console.error('Error fetching tours for destination:', err));
    }

    setActiveTab('basic');
    setIsPanelOpen(true);
  };

 // ✅ FIXED CODE
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  const target = e.target as HTMLInputElement;
  const type = target.type;
  
  if (name.includes('.')) {
    const [parent, child] = name.split('.');
    setFormData(prev => ({
      ...prev,
      [parent]: { ...(prev[parent as keyof FormData] as Record<string, any>), [child]: value }
    }));
  } else {
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? target.checked : value 
    }));
  }
  
  if (name === 'name') {
    setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
  }
};

  const handleTourSelection = (tourId: string) => {
    setFormData(prev => {
      const currentTours = prev.linkedTours || [];
      const isSelected = currentTours.includes(tourId);

      if (isSelected) {
        return { ...prev, linkedTours: currentTours.filter(id => id !== tourId) };
      } else {
        return { ...prev, linkedTours: [...currentTours, tourId] };
      }
    });
  };

const handleArrayChange = (field: keyof FormData, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: keyof FormData) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), '']
    }));
  };

  const removeArrayItem = (field: keyof FormData, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const promise = fetch('/api/upload', { method: 'POST', body: uploadFormData })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFormData(prev => ({ ...prev, image: data.url }));
          return 'Image uploaded successfully!';
        } else {
          throw new Error('Upload failed.');
        }
      });

    toast.promise(promise, {
      loading: 'Uploading image...',
      success: (message) => message as string,
      error: 'Upload failed. Please try again.',
    }).finally(() => {
        setIsUploading(false)
    });
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    // Only name and description are required
    if (!formData.name.trim()) errors.push('Name is required');
    if (!formData.description.trim()) errors.push('Description is required');
    
    return errors;
  };
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const errors = validateForm();
  if (errors.length > 0) {
    toast.error(`Please fix the following errors:\n${errors.join('\n')}`);
    return;
  }

  setIsSubmitting(true);

  try {
   const saveOperation = async () => {
  // Prepare data for submission
  const { linkedTours, ...destinationData } = formData;
  const submitData = {
    ...destinationData,
    // Only include coordinates if both lat and lng are provided
    ...(formData.coordinates.lat && formData.coordinates.lng ? {
      coordinates: {
        lat: parseFloat(formData.coordinates.lat),
        lng: parseFloat(formData.coordinates.lng)
      }
    } : {}),
    highlights: formData.highlights.filter(h => h.trim()),
    thingsToDo: formData.thingsToDo.filter(t => t.trim()),
    localCustoms: formData.localCustoms.filter(c => c.trim()),
    languagesSpoken: formData.languagesSpoken.filter(l => l.trim()),
    weatherWarnings: formData.weatherWarnings.filter(w => w.trim()),
    tags: formData.tags.filter(t => t.trim())
  };

  const apiEndpoint = editingDestination
    ? `/api/admin/destinations/${editingDestination._id}`
    : '/api/admin/tours/destinations';

  const method = editingDestination ? 'PUT' : 'POST';

  const response = await fetch(apiEndpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submitData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || errorData.message || `Server error: ${response.status}`;
    throw new Error(errorMessage);
  }

  const responseData = await response.json();
  const savedDestination = responseData.data;

  // Sync tour relationships in background (non-blocking)
  if (linkedTours && linkedTours.length > 0 && savedDestination?._id) {
    // Don't await - let this run in background
    Promise.all([
      // Update selected tours
      ...linkedTours.map(tourId =>
        fetch(`/api/admin/tours/${tourId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination: savedDestination._id })
        })
      ),
      // Update unselected tours if editing
      ...(editingDestination ? 
        availableTours
          .filter(t => !linkedTours.includes(t._id))
          .map(async (tour) => {
            const tourRes = await fetch(`/api/admin/tours/${tour._id}`);
            if (tourRes.ok) {
              const tourData = await tourRes.json();
              const tourDestId = typeof tourData.data.destination === 'string' 
                ? tourData.data.destination 
                : tourData.data.destination?._id;

              if (tourDestId === (editingDestination._id as any).toString()) {
                return fetch(`/api/admin/tours/${tour._id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ destination: null })
                });
              }
            }
          })
        : [])
    ]).catch(err => console.error('Error syncing tour relationships:', err));
  }

  return `Destination ${editingDestination ? 'updated' : 'created'} successfully!`;
};

const result = await saveOperation();

// Close panel and reset state IMMEDIATELY
setIsPanelOpen(false);
setIsSubmitting(false);
toast.success(result);

// Refresh in background (non-blocking)
setTimeout(() => router.refresh(), 0);
} catch (error: any) {
  setIsSubmitting(false);
  toast.error(error instanceof Error ? error.message : 'Failed to save destination');
}
};
  const handleDelete = (destId: string, destName: string) => {
    const promise = fetch(`/api/admin/destinations/${destId}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete.');
        return res.json();
      });

    toast.promise(promise, {
        loading: `Deleting ${destName}...`,
        success: () => {
            router.refresh();
            return `${destName} deleted successfully.`;
        },
        error: `Failed to delete ${destName}.`
    });
  };

  const inputStyles = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700";
  const textareaStyles = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700 resize-vertical min-h-[100px]";

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Info },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'content', label: 'Content', icon: Sparkles },
    { id: 'travel', label: 'Travel Info', icon: Globe },
    { id: 'seo', label: 'SEO', icon: Eye }
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Destination Manager
              </h1>
              <p className="text-slate-500 mt-1">
                Manage your tour destinations and locations
              </p>
            </div>
          </div>
          
          <button 
            onClick={openPanelForCreate} 
            className="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <PlusCircle className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            Add Destination
          </button>
        </div>

        {/* Stats */}
        <div className="mt-6 pt-6 border-t border-slate-200/60">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-indigo-500" />
            <span className="font-medium">{destinations.length}</span>
            <span>destination{destinations.length !== 1 ? 's' : ''} available</span>
          </div>
        </div>
      </div>

      {/* Destinations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {destinations.map((dest, index) => (
          <motion.div
            key={dest._id as string}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white border border-slate-200/60"
          >
            {/* Image Container */}
            <div className="relative h-56 overflow-hidden">
              {dest.image ? (
                <img 
                  src={dest.image} 
                  alt={dest.name} 
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-slate-400" />
                </div>
              )}
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
              
              {/* Action Buttons */}
              <div className="absolute top-3 end-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <button 
                  onClick={() => openPanelForEdit(dest)} 
                  className="flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl text-slate-700 hover:bg-white hover:text-indigo-600 shadow-lg transition-all duration-200 transform hover:scale-110"
                  title="Edit destination"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(dest._id as string, dest.name)} 
                  className="flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl text-slate-700 hover:bg-white hover:text-red-600 shadow-lg transition-all duration-200 transform hover:scale-110"
                  title="Delete destination"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Status Badges */}
              <div className="absolute top-3 start-3 flex flex-col gap-2">
                {dest.featured && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/90 backdrop-blur-sm rounded-full text-white text-xs font-semibold shadow-lg">
                    <Star className="w-3 h-3 fill-current" />
                    Featured
                  </div>
                )}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-sm rounded-full text-white text-xs font-semibold shadow-lg ${
                  dest.isPublished ? 'bg-green-500/90' : 'bg-red-500/90'
                }`}>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  {dest.isPublished ? 'Published' : 'Draft'}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors duration-200">
                    {dest.name}
                  </h3>
                  {dest.country && (
                    <p className="text-slate-500 text-sm mb-2">{dest.country}</p>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <p className="text-slate-500 text-sm font-mono truncate">/{dest.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <p className="text-slate-500 text-sm">{dest.tourCount || 0} tours</p>
                  </div>
                </div>
                
                {/* Visual Indicator */}
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
            </div>

            {/* Hover Effect Border */}
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-indigo-200 transition-all duration-300 pointer-events-none"></div>
          </motion.div>
        ))}

        {/* Empty State */}
        {destinations.length === 0 && (
          <div className="col-span-full">
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                <MapPin className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-3">No destinations yet</h3>
              <p className="text-slate-500 max-w-md mx-auto mb-6">
                Create your first destination to start organizing your tours by location.
              </p>
              <button 
                onClick={openPanelForCreate}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <PlusCircle className="h-5 w-5" />
                Add First Destination
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop Overlay */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsPanelOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Enhanced Slide Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 end-0 h-full w-full max-w-4xl bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
                  {editingDestination ? <Edit className="h-5 w-5 text-white" /> : <PlusCircle className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingDestination ? 'Edit Destination' : 'Add New Destination'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {editingDestination ? 'Update destination details' : 'Create a new travel destination'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsPanelOpen(false)} 
                className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-8">
                
                {/* Basic Info Tab */}
                {activeTab === 'basic' && (
                  <div className="space-y-6">
                    {/* Image Upload Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Camera className="h-5 w-5 text-indigo-500" />
                        <label className="text-sm font-bold text-slate-700">Destination Image</label>
                        <span className="text-slate-400 text-sm">(optional)</span>
                      </div>
                      
                      <div className="relative">
                        {formData.image ? (
                          <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-200">
                            <img 
                              src={formData.image} 
                              alt="Preview" 
                              className="w-full h-64 object-cover" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <button 
                                type="button" 
                                onClick={() => setFormData(p => ({...p, image: ''}))} 
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors duration-200"
                              >
                                <Trash2 size={16} />
                                Remove Image
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-200">
                            <div className="space-y-4">
                              <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl">
                                <UploadCloud className="h-8 w-8 text-indigo-600" />
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-center">
                                  <label 
                                    htmlFor="file-upload" 
                                    className="relative cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                                  >
                                    <span>Upload Image</span>
                                    <input 
                                      id="file-upload" 
                                      name="file-upload" 
                                      type="file" 
                                      className="sr-only" 
                                      onChange={handleImageUpload} 
                                      accept="image/*" 
                                      disabled={isUploading} 
                                    />
                                  </label>
                                </div>
                                <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
                                {isUploading && (
                                  <div className="flex items-center justify-center gap-2 text-indigo-600">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm font-medium">Uploading...</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name Field */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="name" className="text-sm font-bold text-slate-700">Destination Name</label>
                          <span className="text-red-500 text-sm">*</span>
                        </div>
                        <input 
                          type="text" 
                          name="name" 
                          id="name" 
                          value={formData.name} 
                          onChange={handleInputChange} 
                          placeholder="e.g., Egypt, Cairo, Tokyo"
                          required 
                          className={inputStyles} 
                        />
                      </div>

                      {/* Country Field */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="country" className="text-sm font-bold text-slate-700">Country</label>
                          <span className="text-slate-400 text-sm">(optional)</span>
                        </div>
                        <input 
                          type="text" 
                          name="country" 
                          id="country" 
                          value={formData.country} 
                          onChange={handleInputChange} 
                          placeholder="e.g., Netherlands, France, Japan"
                          className={inputStyles} 
                        />
                      </div>
                    </div>

                    {/* Slug Field */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-indigo-500" />
                        <label htmlFor="slug" className="text-sm font-bold text-slate-700">URL Slug</label>
                        <span className="text-slate-400 text-sm">(auto-generated)</span>
                      </div>
                      <div className="relative">
                        <input 
                          type="text" 
                          name="slug" 
                          id="slug" 
                          value={formData.slug} 
                          onChange={handleInputChange} 
                          placeholder="auto-generated-from-name"
                          className={`${inputStyles} pe-20`} 
                        />
                        <div className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200">
                          /{formData.slug || 'slug'}
                        </div>
                      </div>
                    </div>

                    {/* Description Fields */}
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="description" className="text-sm font-bold text-slate-700">Short Description</label>
                          <span className="text-red-500 text-sm">*</span>
                        </div>
                        <textarea 
                          name="description" 
                          id="description" 
                          value={formData.description} 
                          onChange={handleInputChange} 
                          placeholder="Brief description for cards and previews (max 500 characters)"
                          required 
                          maxLength={500}
                          className={textareaStyles}
                          rows={3}
                        />
                        <div className="text-xs text-slate-500 text-end">
                          {formData.description.length}/500 characters
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="longDescription" className="text-sm font-bold text-slate-700">Long Description</label>
                          <span className="text-slate-400 text-sm">(optional)</span>
                        </div>
                        <textarea 
                          name="longDescription" 
                          id="longDescription" 
                          value={formData.longDescription} 
                          onChange={handleInputChange} 
                          placeholder="Detailed description for destination pages (max 2000 characters)"
                          maxLength={2000}
                          className={textareaStyles}
                          rows={5}
                        />
                        <div className="text-xs text-slate-500 text-end">
                          {formData.longDescription.length}/2000 characters
                        </div>
                      </div>
                    </div>

                    {/* Status Toggles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="featured"
                          name="featured"
                          checked={formData.featured}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <label htmlFor="featured" className="text-sm font-medium text-slate-700">Featured Destination</label>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="isPublished"
                          name="isPublished"
                          checked={formData.isPublished}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex items-center gap-2">
                          {formData.isPublished ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-red-500" />}
                          <label htmlFor="isPublished" className="text-sm font-medium text-slate-700">Published</label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Location Tab */}
                {activeTab === 'location' && (
                  <div className="space-y-6">
                    {/* Coordinates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="coordinates.lat" className="text-sm font-bold text-slate-700">Latitude</label>
                          <span className="text-slate-400 text-sm">(optional)</span>
                        </div>
                        <input 
                          type="number" 
                          name="coordinates.lat" 
                          step="any"
                          value={formData.coordinates.lat} 
                          onChange={handleInputChange} 
                          placeholder="e.g., 52.3676"
                          className={inputStyles} 
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="coordinates.lng" className="text-sm font-bold text-slate-700">Longitude</label>
                          <span className="text-slate-400 text-sm">(optional)</span>
                        </div>
                        <input 
                          type="number" 
                          name="coordinates.lng" 
                          step="any"
                          value={formData.coordinates.lng} 
                          onChange={handleInputChange} 
                          placeholder="e.g., 4.9041"
                          className={inputStyles} 
                        />
                      </div>
                    </div>

                    {/* Currency and Timezone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="currency" className="text-sm font-bold text-slate-700">Currency</label>
                          <span className="text-slate-400 text-sm">(optional)</span>
                        </div>
                        <input 
                          type="text" 
                          name="currency" 
                          value={formData.currency} 
                          onChange={handleInputChange} 
                          placeholder="e.g., EUR, USD"
                          maxLength={3}
                          className={inputStyles} 
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="timezone" className="text-sm font-bold text-slate-700">Timezone</label>
                          <span className="text-slate-400 text-sm">(optional)</span>
                        </div>
                        <input 
                          type="text" 
                          name="timezone" 
                          value={formData.timezone} 
                          onChange={handleInputChange} 
                          placeholder="e.g., CET, America/New_York"
                          className={inputStyles} 
                        />
                      </div>
                    </div>

                    {/* Best Time to Visit */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-indigo-500" />
                        <label htmlFor="bestTimeToVisit" className="text-sm font-bold text-slate-700">Best Time to Visit</label>
                        <span className="text-slate-400 text-sm">(optional)</span>
                      </div>
                      <input 
                        type="text" 
                        name="bestTimeToVisit" 
                        value={formData.bestTimeToVisit} 
                        onChange={handleInputChange} 
                        placeholder="e.g., April to October, Year-round"
                        className={inputStyles} 
                      />
                    </div>

                    {/* Climate Section */}
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="climate" className="text-sm font-bold text-slate-700">Climate Description</label>
                          <span className="text-slate-400 text-sm">(optional)</span>
                        </div>
                        <textarea 
                          name="climate" 
                          value={formData.climate} 
                          onChange={handleInputChange} 
                          placeholder="General climate description"
                          className={textareaStyles}
                          rows={3}
                        />
                      </div>

                      {/* Average Temperature */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label htmlFor="averageTemperature.summer" className="text-sm font-bold text-slate-700">Summer Temperature</label>
                          <input 
                            type="text" 
                            name="averageTemperature.summer" 
                            value={formData.averageTemperature.summer} 
                            onChange={handleInputChange} 
                            placeholder="e.g., 20-25°C"
                            className={inputStyles} 
                          />
                        </div>

                        <div className="space-y-3">
                          <label htmlFor="averageTemperature.winter" className="text-sm font-bold text-slate-700">Winter Temperature</label>
                          <input 
                            type="text" 
                            name="averageTemperature.winter" 
                            value={formData.averageTemperature.winter} 
                            onChange={handleInputChange} 
                            placeholder="e.g., 0-5°C"
                            className={inputStyles} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Tab */}
                {activeTab === 'content' && (
                  <div className="space-y-8">
                    {/* Highlights Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-indigo-500" />
                          <label className="text-sm font-bold text-slate-700">Highlights</label>
                          <span className="text-slate-400 text-sm">(optional)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addArrayItem('highlights')}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      </div>
                      <div className="space-y-3">
                        {formData.highlights.map((highlight, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={highlight}
                              onChange={(e) => handleArrayChange('highlights', index, e.target.value)}
                              placeholder="Enter a highlight"
                              className={inputStyles}
                            />
                            <button
                              type="button"
                              onClick={() => removeArrayItem('highlights', index)}
                              className="flex items-center justify-center w-10 h-10 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {formData.highlights.length === 0 && (
                          <p className="text-sm text-slate-500 italic">No highlights added yet. Click "Add" to create the first one.</p>
                        )}
                      </div>
                    </div>

                    {/* Things to Do Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-indigo-500" />
                          <label className="text-sm font-bold text-slate-700">Things to Do</label>
                          <span className="text-slate-400 text-sm">(optional)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addArrayItem('thingsToDo')}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      </div>
                      <div className="space-y-3">
                        {formData.thingsToDo.map((thing, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={thing}
                              onChange={(e) => handleArrayChange('thingsToDo', index, e.target.value)}
                              placeholder="Enter an activity or attraction"
                              className={inputStyles}
                            />
                            <button
                              type="button"
                              onClick={() => removeArrayItem('thingsToDo', index)}
                              className="flex items-center justify-center w-10 h-10 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {formData.thingsToDo.length === 0 && (
                          <p className="text-sm text-slate-500 italic">No activities added yet. Click "Add" to create the first one.</p>
                        )}
                      </div>
                    </div>

                    {/* Local Customs Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-indigo-500" />
                          <label className="text-sm font-bold text-slate-700">Local Customs</label>
                          <span className="text-slate-400 text-sm">(optional)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addArrayItem('localCustoms')}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      </div>
                      <div className="space-y-3">
                        {formData.localCustoms.map((custom, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={custom}
                              onChange={(e) => handleArrayChange('localCustoms', index, e.target.value)}
                              placeholder="Enter a local custom or cultural tip"
                              className={inputStyles}
                            />
                            <button
                              type="button"
                              onClick={() => removeArrayItem('localCustoms', index)}
                              className="flex items-center justify-center w-10 h-10 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {formData.localCustoms.length === 0 && (
                          <p className="text-sm text-slate-500 italic">No customs added yet. Click "Add" to create the first one.</p>
                        )}
                      </div>
                    </div>

                    {/* Weather Warnings Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-indigo-500" />
                          <label className="text-sm font-bold text-slate-700">Weather Warnings</label>
                          <span className="text-slate-400 text-sm">(optional)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addArrayItem('weatherWarnings')}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      </div>
                      <div className="space-y-3">
                        {formData.weatherWarnings.map((warning, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={warning}
                              onChange={(e) => handleArrayChange('weatherWarnings', index, e.target.value)}
                              placeholder="Enter a weather warning or seasonal advice"
                              className={inputStyles}
                            />
                            <button
                              type="button"
                              onClick={() => removeArrayItem('weatherWarnings', index)}
                              className="flex items-center justify-center w-10 h-10 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {formData.weatherWarnings.length === 0 && (
                          <p className="text-sm text-slate-500 italic">No warnings added yet. Click "Add" to create the first one.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Travel Info Tab */}
                {activeTab === 'travel' && (
                  <div className="space-y-6">
                    {/* Visa Requirements */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-indigo-500" />
                        <label htmlFor="visaRequirements" className="text-sm font-bold text-slate-700">Visa Requirements</label>
                        <span className="text-slate-400 text-sm">(optional)</span>
                      </div>
                      <textarea 
                        name="visaRequirements" 
                        value={formData.visaRequirements} 
                        onChange={handleInputChange} 
                        placeholder="Describe visa requirements for visitors"
                        className={textareaStyles}
                        rows={3}
                      />
                    </div>

                    {/* Languages Spoken */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-indigo-500" />
                          <label className="text-sm font-bold text-slate-700">Languages Spoken</label>
                          <span className="text-slate-400 text-sm">(optional)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addArrayItem('languagesSpoken')}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      </div>
                      <div className="space-y-3">
                        {formData.languagesSpoken.map((language, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={language}
                              onChange={(e) => handleArrayChange('languagesSpoken', index, e.target.value)}
                              placeholder="Enter a language"
                              className={inputStyles}
                            />
                            <button
                              type="button"
                              onClick={() => removeArrayItem('languagesSpoken', index)}
                              className="flex items-center justify-center w-10 h-10 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {formData.languagesSpoken.length === 0 && (
                          <p className="text-sm text-slate-500 italic">No languages added yet. Click "Add" to create the first one.</p>
                        )}
                      </div>
                    </div>

                    {/* Emergency Number */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-indigo-500" />
                        <label htmlFor="emergencyNumber" className="text-sm font-bold text-slate-700">Emergency Number</label>
                        <span className="text-slate-400 text-sm">(optional)</span>
                      </div>
                      <input 
                        type="text" 
                        name="emergencyNumber" 
                        value={formData.emergencyNumber} 
                        onChange={handleInputChange} 
                        placeholder="e.g., 112, 911"
                        className={inputStyles} 
                      />
                    </div>
                  </div>
                )}

                {/* SEO Tab */}
                {activeTab === 'seo' && (
                  <div className="space-y-8">
                    {/* Linked Tours Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        <label className="text-sm font-bold text-slate-700">Linked Tours</label>
                        <span className="text-slate-400 text-sm">(optional)</span>
                      </div>
                      <div className="border border-slate-300 rounded-xl p-4 max-h-64 overflow-y-auto bg-white">
                        {availableTours.length === 0 ? (
                          <p className="text-sm text-slate-500">No tours available</p>
                        ) : (
                          <div className="space-y-2">
                            {availableTours.map((tour) => (
                              <label key={tour._id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                                <input
                                  type="checkbox"
                                  checked={(formData.linkedTours || []).includes(tour._id)}
                                  onChange={() => handleTourSelection(tour._id)}
                                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm text-slate-700">{tour.title}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Select tours that should be linked to this destination. When you save, these tours will be updated to reference this destination.
                      </p>
                    </div>

                {/* Original SEO Fields */}
                  <div className="space-y-6">
                    {/* Meta Title */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-indigo-500" />
                        <label htmlFor="metaTitle" className="text-sm font-bold text-slate-700">Meta Title</label>
                        <span className="text-slate-400 text-sm">(optional)</span>
                      </div>
                      <input 
                        type="text" 
                        name="metaTitle" 
                        value={formData.metaTitle} 
                        onChange={handleInputChange} 
                        placeholder="SEO title for search engines (max 60 characters)"
                        maxLength={60}
                        className={inputStyles} 
                      />
                      <div className="text-xs text-slate-500 text-end">
                        {formData.metaTitle.length}/60 characters
                      </div>
                    </div>

                    {/* Meta Description */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-indigo-500" />
                        <label htmlFor="metaDescription" className="text-sm font-bold text-slate-700">Meta Description</label>
                        <span className="text-slate-400 text-sm">(optional)</span>
                      </div>
                      <textarea 
                        name="metaDescription" 
                        value={formData.metaDescription} 
                        onChange={handleInputChange} 
                        placeholder="SEO description for search engines (max 160 characters)"
                        maxLength={160}
                        className={textareaStyles}
                        rows={3}
                      />
                      <div className="text-xs text-slate-500 text-end">
                        {formData.metaDescription.length}/160 characters
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-indigo-500" />
                          <label className="text-sm font-bold text-slate-700">SEO Tags</label>
                          <span className="text-slate-400 text-sm">(optional)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addArrayItem('tags')}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      </div>
                      <div className="space-y-3">
                        {formData.tags.map((tag, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={tag}
                              onChange={(e) => handleArrayChange('tags', index, e.target.value)}
                              placeholder="Enter a tag or keyword"
                              className={inputStyles}
                            />
                            <button
                              type="button"
                              onClick={() => removeArrayItem('tags', index)}
                              className="flex items-center justify-center w-10 h-10 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {formData.tags.length === 0 && (
                          <p className="text-sm text-slate-500 italic">No tags added yet. Click "Add" to create the first one.</p>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                )}
              </div>
            </form>

            {/* Panel Footer */}
            <div className="p-8 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  className="flex-1 px-6 py-3 text-slate-700 font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || isUploading || !formData.name || !formData.description} 
                  className="flex-1 inline-flex justify-center items-center gap-3 px-6 py-3 text-white font-bold bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      <span>Save Destination</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Validation Message */}
              {(!formData.name || !formData.description) && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <p className="text-xs text-amber-700">
                    Please fill in the required fields: name and description.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}