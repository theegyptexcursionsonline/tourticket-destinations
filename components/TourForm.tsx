'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useSettings } from '@/hooks/useSettings';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import {
    Loader2,
    XCircle,
    ChevronDown,
    X,
    Plus,
    Image as ImageIcon,
    Check,
    Calendar,
    Clock,
    HelpCircle,
    Settings,
    MapPin,
    Tag,
    Star,
    Euro,
    DollarSign,
    Users,
    Timer,
    Mountain,
    Eye,
    FileText,
    Sparkles,
    Camera,
    Grid3x3,
    Info,
    Globe,
    UploadCloud,
    Trash2,
    CreditCard,
    Zap,
    Map,
    Edit,
    PlusCircle,
    Minus,
    Building2
} from 'lucide-react';

// --- Interface Definitions ---
interface Category {
    _id: string;
    name: string;
}

interface Destination {
    _id: string;
    name: string;
}

interface AttractionInterest {
    _id: string;
    title: string;
    slug: string;
    pageType: 'attraction' | 'category';
}

interface TimeSlot {
    time: string;
    capacity: number;
}

interface Availability {
    type: string;
    slots?: TimeSlot[];
    availableDays?: number[];
}

interface BookingOption {
    id?: string; // Stable id used for option-level stop-sale
    type: string;
    label: string;
    price: number;
    originalPrice?: number;
    description?: string;
    duration?: string;
    languages?: string[];
    highlights?: string[];
    groupSize?: string;
    difficulty?: string;
    badge?: string;
    discount?: number;
    isRecommended?: boolean;
}

interface ItineraryItem {
    day: number;
    title: string;
    description: string;
    icon?: string;
}

interface FAQ {
    question: string;
    answer: string;
}

interface AddOn {
    name: string;
    description: string;
    price: number;
    category?: string;
}

interface TourFormData {
    tenantId: string;
    title: string;
    slug: string;
    description: string;
    longDescription: string;
    duration: string;
    discountPrice: string | number;
    originalPrice: string | number;
    destination: string;
    category: string[];
    image: string;
    images: string[];
    highlights: string[];
    includes: string[];
    tags: string;
    isFeatured: boolean;
    whatsIncluded: string[];
    whatsNotIncluded: string[];
    itinerary: ItineraryItem[];
    faqs: FAQ[];
    bookingOptions: BookingOption[];
    availability: Availability;
    addOns: AddOn[];
    attractions?: string[];
    interests?: string[];
    isPublished?: boolean;
    difficulty?: string;
    maxGroupSize?: number | string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string;
}

interface Tour extends Partial<TourFormData> {
    _id?: string;
    tenantId?: string;
    faq?: FAQ[];
    price?: number | string;
}

// --- Helper Components ---
const FormLabel = ({ children, icon: Icon, required = false }: {
    children: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    required?: boolean;
}) => (
    <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="h-4 w-4 text-indigo-500" />}
        <label className="text-sm font-semibold text-slate-700">
            {children}
            {required && <span className="text-red-500 text-xs ml-1">*</span>}
        </label>
    </div>
);

const SmallHint = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <p className={`mt-2 text-xs text-slate-500 ${className}`}>{children}</p>
);

const inputBase = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700";
const textareaBase = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700 resize-vertical min-h-[100px]";

const generateBookingOptionId = () =>
    (globalThis.crypto as any)?.randomUUID?.() || `opt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// --- Availability Manager Sub-Component ---
const AvailabilityManager = ({ availability, setAvailability }: { availability: Availability, setAvailability: (data: Availability) => void }) => {
    
    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setAvailability({ ...availability, type: e.target.value });
    };

    const handleSlotChange = (index: number, field: string, value: string | number) => {
        const newSlots = [...(availability.slots || [])];
        newSlots[index] = { ...newSlots[index], [field]: value };
        setAvailability({ ...availability, slots: newSlots });
    };

    const addSlot = () => {
        const newSlots = [...(availability.slots || []), { time: '12:00', capacity: 10 }];
        setAvailability({ ...availability, slots: newSlots });
    };

    const removeSlot = (index: number) => {
        const newSlots = availability.slots?.filter((_, i: number) => i !== index) || [];
        setAvailability({ ...availability, slots: newSlots });
    };

    const handleDayToggle = (dayIndex: number) => {
        const currentDays = availability.availableDays || [];
        const newAvailableDays = [...currentDays];
        if (newAvailableDays.includes(dayIndex)) {
            setAvailability({ ...availability, availableDays: newAvailableDays.filter(d => d !== dayIndex) });
        } else {
            setAvailability({ ...availability, availableDays: [...newAvailableDays, dayIndex] });
        }
    };

    return (
        <div className="space-y-6">
            {/* Availability Type Selection */}
            <div className="space-y-3">
                <FormLabel icon={Clock}>Availability Type</FormLabel>
                <div className="relative">
                    <select 
                        value={availability?.type || 'daily'} 
                        onChange={handleTypeChange} 
                        className={`${inputBase} appearance-none cursor-pointer`}
                    >
                        <option value="daily">🔄 Daily (Repeats Weekly)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                    </div>
                </div>
            </div>

            {/* Available Days Selection */}
            {availability?.type === 'daily' && (
                <div>
                    <FormLabel icon={Calendar}>Available Days</FormLabel>
                    <div className="flex flex-wrap gap-3">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                            <button 
                                key={day} 
                                type="button" 
                                onClick={() => handleDayToggle(index)} 
                                className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                                    availability?.availableDays?.includes(index) 
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200' 
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'
                                }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Time Slots Section */}
            <div className="space-y-6">
                <FormLabel icon={Users}>Time Slots & Capacity</FormLabel>
                
                <div className="space-y-4">
                    {(availability?.slots || []).map((slot: TimeSlot, index: number) => (
                        <div 
                            key={index} 
                            className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-all duration-200 hover:shadow-md"
                        >
                            {/* Time Input */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="time" 
                                        value={slot.time || ''} 
                                        onChange={(e) => handleSlotChange(index, 'time', e.target.value)} 
                                        className={`${inputBase} pl-10`}
                                    />
                                </div>
                            </div>

                            {/* Capacity Input */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Capacity</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="number" 
                                        value={slot.capacity || 0} 
                                        onChange={(e) => handleSlotChange(index, 'capacity', Number(e.target.value))} 
                                        className={`${inputBase} pl-10`}
                                        placeholder="Max guests"
                                        min="1"
                                    />
                                </div>
                            </div>

                            {/* Remove Button */}
                            <button 
                                type="button" 
                                onClick={() => removeSlot(index)} 
                                className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group-hover:opacity-100 opacity-70"
                            >
                                <XCircle className="h-4 w-4"/>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add Time Slot Button */}
                <button 
                    type="button" 
                    onClick={addSlot} 
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200 group"
                >
                    <Plus className="h-5 w-5 group-hover:scale-110 transition-transform duration-200"/> 
                    Add Time Slot
                </button>
            </div>
        </div>
    );
};

// --- Main Tour Form Component ---
export default function TourForm({ tourToEdit, onSave, fullPage = false }: { tourToEdit?: Tour, onSave?: () => void, fullPage?: boolean }) {
    const router = useRouter();
    const { selectedCurrency } = useSettings();
    const { tenants, selectedTenantId, isAllTenantsSelected } = useAdminTenant();
    const CurrencyIcon = selectedCurrency.code === 'USD' ? DollarSign : Euro;
    
    const [isPanelOpen, setIsPanelOpen] = useState(fullPage);
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    // Add state for managing collapsible items
    const [expandedOptionIndex, setExpandedOptionIndex] = useState<number | null>(0);
    const [expandedItineraryIndex, setExpandedItineraryIndex] = useState<number | null>(0);
    const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

    // Determine default tenantId: use selected tenant if specific one is selected, otherwise 'default'
    const getDefaultTenantId = () => {
        if (!isAllTenantsSelected() && selectedTenantId) {
            return selectedTenantId;
        }
        // Fall back to default tenant or first available tenant
        const defaultTenant = tenants.find(t => t.isDefault);
        return defaultTenant?.tenantId || tenants[0]?.tenantId || 'default';
    };

    const [formData, setFormData] = useState<TourFormData>({
        tenantId: getDefaultTenantId(),
        title: '',
        slug: '',
        description: '',
        longDescription: '',
        duration: '',
        discountPrice: '',
        originalPrice: '',
        destination: '',
        category: [],
        image: '',
        images: [],
        highlights: [''],
        includes: [''],
        tags: '',
        isFeatured: false,
        whatsIncluded: [''],
        whatsNotIncluded: [''],
        itinerary: [],
        faqs: [],
        bookingOptions: [],
        addOns: [],
        isPublished: false,
        difficulty: '',
        maxGroupSize: 10,
        availability: {
            type: 'daily',
            availableDays: [0, 1, 2, 3, 4, 5, 6],
            slots: [{ time: '10:00', capacity: 10 }]
        },
        attractions: [],
        interests: [],
    });

    // Update default tenantId when tenants are loaded and formData is empty
    useEffect(() => {
        if (!tourToEdit && tenants.length > 0 && !formData.tenantId) {
            setFormData(prev => ({ ...prev, tenantId: getDefaultTenantId() }));
        }
    }, [tenants, selectedTenantId]);

    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [attractions, setAttractions] = useState<AttractionInterest[]>([]);
    const [interests, setInterests] = useState<AttractionInterest[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (tourToEdit) {
            setIsSlugManuallyEdited(Boolean(tourToEdit.slug));

            const initialData: Partial<TourFormData> = {
                tenantId: tourToEdit.tenantId || getDefaultTenantId(),
                title: tourToEdit.title || '',
                slug: tourToEdit.slug || '',
                description: tourToEdit.description || '',
                longDescription: tourToEdit.longDescription || '',
                duration: tourToEdit.duration || '',
                discountPrice: tourToEdit.discountPrice || tourToEdit.price || '',
                originalPrice: tourToEdit.originalPrice || '',
                destination: (tourToEdit.destination as any)?._id?.toString() || tourToEdit.destination || '',
                category: Array.isArray(tourToEdit.category)
                    ? tourToEdit.category.map((cat: any) => cat?._id?.toString() || cat?.toString() || cat)
                    : ((tourToEdit.category as any)?._id?.toString() || tourToEdit.category ? [(tourToEdit.category as any)?._id?.toString() || tourToEdit.category] : []),
                image: tourToEdit.image || '', 
                images: tourToEdit.images || [],
                highlights: (tourToEdit.highlights?.length ?? 0) > 0 ? tourToEdit.highlights : [''],
                includes: (tourToEdit.includes?.length ?? 0) > 0 ? tourToEdit.includes : [''],
                tags: Array.isArray(tourToEdit.tags) ? tourToEdit.tags.join(', ') : (tourToEdit.tags || ''),
                isFeatured: tourToEdit.isFeatured || false,
                whatsIncluded: (tourToEdit.whatsIncluded?.length ?? 0) > 0 ? tourToEdit.whatsIncluded : [''],
                whatsNotIncluded: (tourToEdit.whatsNotIncluded?.length ?? 0) > 0 ? tourToEdit.whatsNotIncluded : [''],
                itinerary: (tourToEdit.itinerary?.length ?? 0) > 0 ? tourToEdit.itinerary : [{ day: 1, title: '', description: '' }],
                faqs: ((tourToEdit.faq || tourToEdit.faqs)?.length ?? 0) > 0 ? (tourToEdit.faq || tourToEdit.faqs) : [{ question: '', answer: '' }],
                bookingOptions: (tourToEdit.bookingOptions?.length ?? 0) > 0
                    ? tourToEdit.bookingOptions!.map((option: BookingOption) => ({
                        id: (option as any).id || generateBookingOptionId(),
                        type: option.type || 'Per Person',
                        label: option.label || '',
                        price: option.price || 0,
                        description: option.description || '',
                        originalPrice: option.originalPrice || undefined,
                        duration: option.duration || '',
                        languages: option.languages || [],
                        highlights: option.highlights || [],
                        groupSize: option.groupSize || '',
                        difficulty: option.difficulty || '',
                        badge: option.badge || '',
                        discount: option.discount || 0,
                        isRecommended: option.isRecommended || false
                    }))
                    : [{ 
                        id: generateBookingOptionId(),
                        type: 'Per Person', 
                        label: '', 
                        price: 0, 
                        description: '',
                        originalPrice: undefined,
                        duration: '',
                        languages: [],
                        highlights: [],
                        groupSize: '',
                        difficulty: '',
                        badge: '',
                        discount: 0,
                        isRecommended: false
                    }],
                addOns: (tourToEdit.addOns?.length ?? 0) > 0 ? tourToEdit.addOns : [],
             isPublished: tourToEdit.isPublished || false,
                difficulty: tourToEdit.difficulty || '',
                maxGroupSize: tourToEdit.maxGroupSize || 10,
                metaTitle: tourToEdit.metaTitle || '',
                metaDescription: tourToEdit.metaDescription || '',
                keywords: Array.isArray(tourToEdit.keywords) ? tourToEdit.keywords.join(', ') : (tourToEdit.keywords || ''),
            };
            
            if (tourToEdit.availability && tourToEdit.availability.slots) {
                initialData.availability = {
                    type: tourToEdit.availability.type || 'daily',
                    availableDays: tourToEdit.availability.availableDays || [0, 1, 2, 3, 4, 5, 6],
                    slots: tourToEdit.availability.slots?.length > 0 ? tourToEdit.availability.slots : [{ time: '10:00', capacity: 10 }]
                };
            } else {
                initialData.availability = {
                    type: 'daily',
                    availableDays: [0, 1, 2, 3, 4, 5, 6],
                    slots: [{ time: '10:00', capacity: 10 }]
                };
            }

            // Handle attractions and interests - extract IDs if they're populated objects
            const attractionIds = Array.isArray(tourToEdit.attractions)
                ? tourToEdit.attractions.map((a: any) => {
                    const id = typeof a === 'string' ? a : (a._id || a);
                    return typeof id === 'string' ? id : String(id);
                  })
                : [];
            const interestIds = Array.isArray(tourToEdit.interests)
                ? tourToEdit.interests.map((i: any) => {
                    const id = typeof i === 'string' ? i : (i._id || i);
                    return typeof id === 'string' ? id : String(id);
                  })
                : [];

            initialData.attractions = attractionIds;
            initialData.interests = interestIds;

            console.log('Loading tour with attractions:', attractionIds);
            console.log('Loading tour with interests:', interestIds);
            console.log('Attraction IDs types:', attractionIds.map(id => typeof id));

            setFormData(initialData as TourFormData);
            
            // On edit, expand the first item in each collapsible section if they exist
            if (initialData.bookingOptions?.length && initialData.bookingOptions.length > 0) setExpandedOptionIndex(0);
            if (initialData.itinerary?.length && initialData.itinerary.length > 0) setExpandedItineraryIndex(0);
            if (initialData.faqs?.length && initialData.faqs.length > 0) setExpandedFaqIndex(0);
        }

        const fetchData = async () => {
            try {
                const [destRes, catRes, attractionsRes] = await Promise.all([
                    fetch('/api/admin/tours/destinations'),
                    fetch('/api/categories'),
                    fetch('/api/attractions-interests')
                ]);

                if (!destRes.ok) throw new Error(`Failed to fetch destinations: ${destRes.statusText}`);
                if (!catRes.ok) throw new Error(`Failed to fetch categories: ${catRes.statusText}`);

                const destData = await destRes.json();
                const catData = await catRes.json();
                const attractionsData = await attractionsRes.json();

                if (destData?.success) setDestinations(destData.data);
                if (catData?.success) setCategories(catData.data);
                if (attractionsData?.success) {
                    setAttractions(attractionsData.data.attractions || []);
                    setInterests(attractionsData.data.interests || []);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
                toast.error('Failed to load form data.');
            }
        };
        fetchData();
    }, [tourToEdit]);

    // Debug logging for attractions/interests
    useEffect(() => {
        console.log('FormData changed - Attractions:', formData.attractions);
        console.log('FormData changed - Interests:', formData.interests);
        console.log('Available attractions:', attractions.map(a => ({ id: a._id, title: a.title })));
        console.log('Available interests:', interests.map(i => ({ id: i._id, title: i.title })));
    }, [formData.attractions, formData.interests, attractions, interests]);

    const resetForm = () => {
        setFormData({
            tenantId: formData.tenantId || '',
            title: '',
            slug: '',
            description: '',
            longDescription: '',
            duration: '',
            discountPrice: '',
            originalPrice: '',
            destination: '',
            category: [],
            image: '',
            images: [],
            highlights: [''],
            includes: [''],
            tags: '',
            isFeatured: false,
            whatsIncluded: [''],
            whatsNotIncluded: [''],
            itinerary: [{ day: 1, title: '', description: '' }],
            faqs: [{ question: '', answer: '' }],
            bookingOptions: [{ id: generateBookingOptionId(), type: 'Per Person', label: '', price: 0 }],
           addOns: [],
        isPublished: false,
        difficulty: '',
        maxGroupSize: 10,
        availability: {
            type: 'daily',
            availableDays: [0, 1, 2, 3, 4, 5, 6],
            slots: [{ time: '10:00', capacity: 10 }]
        },
        attractions: [],
        interests: [],
        metaTitle: '',
        metaDescription: '',
        keywords: '',
    });
    };

    const openPanelForCreate = () => {
        resetForm();
        setActiveTab('basic');
        setIsPanelOpen(true);
    };

    const openPanelForEdit = () => {
        setActiveTab('basic');
        setIsPanelOpen(true);
    };

    const setAvailability = (availabilityData: Availability) => {
        setFormData((prev) => ({ ...prev, availability: availabilityData }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target;

        if (type === 'checkbox') {
            setFormData((p) => ({ ...p, [name]: (target as HTMLInputElement).checked }));
            return;
        }

        setFormData((p) => ({ ...p, [name]: value }));

        if (name === 'title' && !isSlugManuallyEdited) {
            const newSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            setFormData((p) => ({ ...p, slug: newSlug }));
        }

        if (name === 'slug') {
            setIsSlugManuallyEdited(true);
        }
    };

    const handleMultiSelectChange = (fieldName: 'attractions' | 'interests' | 'category', selectedId: string) => {
        setFormData((prev) => {
            const currentValues = prev[fieldName] || [];
            const isSelected = currentValues.includes(selectedId);

            if (isSelected) {
                // Remove if already selected
                return { ...prev, [fieldName]: currentValues.filter(id => id !== selectedId) };
            } else {
                // Add if not selected
                return { ...prev, [fieldName]: [...currentValues, selectedId] };
            }
        });
    };

    const handleTextAreaArrayChange = (fieldName: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const arrayValue = value.split('\n');
        setFormData((p) => ({ ...p, [fieldName]: arrayValue }));
    };

    const toggleItineraryItem = (index: number) => {
        setExpandedItineraryIndex(expandedItineraryIndex === index ? null : index);
    };

   // Make sure the itinerary icon handling is correct in the form
const handleItineraryChange = (index: number, field: string, value: string | number) => {
  const updatedItinerary = [...formData.itinerary];
  updatedItinerary[index] = { ...updatedItinerary[index], [field]: value };
  setFormData((p) => ({ ...p, itinerary: updatedItinerary }));
};

// Ensure icon is properly saved when adding new items
const addItineraryItem = () => {
  const newDay = formData.itinerary.length + 1;
  setFormData((p) => ({ 
    ...p, 
    itinerary: [...p.itinerary, { 
      day: newDay, 
      title: '', 
      description: '', 
      icon: 'location' // Default icon
    }] 
  }));
  setExpandedItineraryIndex(formData.itinerary.length);
};

    const removeItineraryItem = (index: number) => {
        if (formData.itinerary.length <= 1) return;
        const updatedItinerary = formData.itinerary.filter((_, i: number) => i !== index);
        updatedItinerary.forEach((item, i: number) => {
            item.day = i + 1;
        });
        setFormData((p) => ({ ...p, itinerary: updatedItinerary }));
        setExpandedItineraryIndex(null);
    };

    const toggleFaqItem = (index: number) => {
        setExpandedFaqIndex(expandedFaqIndex === index ? null : index);
    };

    const handleFAQChange = (index: number, field: string, value: string) => {
        const updatedFAQs = [...formData.faqs];
        updatedFAQs[index] = { ...updatedFAQs[index], [field]: value };
        setFormData((p) => ({ ...p, faqs: updatedFAQs }));
    };

    const addFAQ = () => {
        setFormData((p) => ({
            ...p,
            faqs: [...p.faqs, { question: '', answer: '' }]
        }));
        setExpandedFaqIndex(formData.faqs.length);
    };

    const removeFAQ = (index: number) => {
        if (formData.faqs.length <= 1) return;
        const updatedFAQs = formData.faqs.filter((_, i: number) => i !== index);
        setFormData((p) => ({ ...p, faqs: updatedFAQs }));
        setExpandedFaqIndex(null);
    };

    const toggleBookingOption = (index: number) => {
        setExpandedOptionIndex(expandedOptionIndex === index ? null : index);
    };

    const handleBookingOptionChange = (index: number, field: string, value: string | number | boolean | string[]) => {
        const updatedOptions = [...formData.bookingOptions];
        updatedOptions[index] = { ...updatedOptions[index], [field]: value };
        setFormData((p) => ({ ...p, bookingOptions: updatedOptions }));
    };

    const addBookingOption = () => {
        setFormData((p) => ({ 
            ...p, 
            bookingOptions: [...p.bookingOptions, { id: generateBookingOptionId(), type: 'Per Person', label: '', price: 0 }] 
        }));
        setExpandedOptionIndex(formData.bookingOptions.length);
    };

    const removeBookingOption = (index: number) => {
        if (formData.bookingOptions.length <= 1) return;
        const updatedOptions = formData.bookingOptions.filter((_, i: number) => i !== index);
        setFormData((p) => ({ ...p, bookingOptions: updatedOptions }));
        setExpandedOptionIndex(null);
    };

    const saveIndividualBookingOption = async (index: number) => {
        if (!tourToEdit?._id) {
            toast.error('Please save the tour first before updating individual options');
            return;
        }

        const option = formData.bookingOptions[index];
        if (!option.label?.trim()) {
            toast.error('Option name is required');
            return;
        }

        try {
            const response = await fetch(`/api/tours/${tourToEdit._id}/booking-options`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    index, 
                    option: {
                        ...option,
                        price: parseFloat(String(option.price)) || 0,
                        originalPrice: option.originalPrice ? parseFloat(String(option.originalPrice)) : undefined,
                    }
                }),
            });

            if (response.ok) {
                toast.success('Booking option saved successfully!');
            } else {
                const errorData = await response.json();
                toast.error(`Failed to save option: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Save option error:', error);
            toast.error('Failed to save booking option');
        }
    };

    const handleAddOnChange = (index: number, field: string, value: string | number) => {
        const updatedAddOns = [...formData.addOns];
        updatedAddOns[index] = { ...updatedAddOns[index], [field]: value };
        setFormData((p) => ({ ...p, addOns: updatedAddOns }));
    };

    const addAddOn = () => {
        setFormData((p) => ({ 
            ...p, 
            addOns: [...p.addOns, { name: '', description: '', price: 0 }] 
        }));
    };

    const removeAddOn = (index: number) => {
        if (formData.addOns.length <= 1) return;
        const updatedAddOns = formData.addOns.filter((_, i: number) => i !== index);
        setFormData((p) => ({ ...p, addOns: updatedAddOns }));
    };

    const handleListChange = (index: number, value: string, field: 'highlights' | 'includes') => {
        const updated = [...formData[field]];
        updated[index] = value;
        setFormData((p) => ({ ...p, [field]: updated }));
    };

    const addListItem = (field: 'highlights' | 'includes') => {
        setFormData((p) => ({ ...p, [field]: [...p[field], ''] }));
    };

    const removeListItem = (index: number, field: 'highlights' | 'includes') => {
        if (formData[field].length <= 1) return;
        setFormData((p) => ({ ...p, [field]: p[field].filter((_, i: number) => i !== index) }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMainImage = true) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        const promise = fetch('/api/upload', { method: 'POST', body: uploadFormData })
            .then(res => {
                if (!res.ok) {
                    throw new Error('Network response was not ok');
                }
                return res.json();
            })
            .then(data => {
                if (data.success && data.url) {
                    if (isMainImage) {
                        setFormData((prevData) => ({ ...prevData, image: data.url }));
                    } else {
                        setFormData((prevData) => ({ ...prevData, images: [...prevData.images, data.url] }));
                    }
                    return 'Image uploaded successfully!';
                } else {
                    throw new Error(data.error || 'Upload failed: Invalid response from server.');
                }
            });

        toast.promise(promise, {
            loading: 'Uploading image...',
            success: (message) => message as string,
            error: (err) => err.message || 'Upload failed. Please try again.',
        }).finally(() => {
            setIsUploading(false);
        });
    };

    const removeGalleryImage = (imageUrl: string) => {
        setFormData((p) => ({ ...p, images: p.images.filter((u: string) => u !== imageUrl) }));
    };

   const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Enhanced validation
        if (
            !formData.title?.trim() ||
            !formData.description?.trim() ||
            !formData.duration?.trim() ||
            !formData.discountPrice ||
            !formData.destination ||
            !formData.category?.length
        ) {
            toast.error('Please fill all required fields: Title, Description, Duration, Discount Price, Destination, and at least one Category.');
            setIsSubmitting(false);
            return;
        }

        try {
            const cleanedData = { ...formData };

            // Ensure tenantId is set
            if (!cleanedData.tenantId) {
                toast.error('Please select a brand for this tour.');
                setIsSubmitting(false);
                return;
            }

            const payload = {
                tenantId: cleanedData.tenantId,
                title: cleanedData.title.trim(),
                slug: cleanedData.slug.trim(),
                description: cleanedData.description.trim(),
                duration: cleanedData.duration.trim(),
                price: parseFloat(String(cleanedData.discountPrice)) || 0,
                discountPrice: parseFloat(String(cleanedData.discountPrice)) || 0,
                longDescription: cleanedData.longDescription?.trim() || cleanedData.description.trim(),
                originalPrice: cleanedData.originalPrice ? parseFloat(String(cleanedData.originalPrice)) : undefined,
                destination: cleanedData.destination,
                category: cleanedData.category,
                difficulty: cleanedData.difficulty || 'Easy',
                maxGroupSize: parseInt(String(cleanedData.maxGroupSize)) || 10,
                isPublished: Boolean(cleanedData.isPublished),
                isFeatured: Boolean(cleanedData.isFeatured),
                image: cleanedData.image || '/images/placeholder.png', // Provide fallback
                images: Array.isArray(cleanedData.images) ? cleanedData.images : [],
                highlights: Array.isArray(cleanedData.highlights) ? cleanedData.highlights.filter((item: string) => item.trim() !== '') : [],
                includes: Array.isArray(cleanedData.includes) ? cleanedData.includes.filter((item: string) => item.trim() !== '') : [],
                whatsIncluded: Array.isArray(cleanedData.whatsIncluded) ? cleanedData.whatsIncluded.filter((item: string) => item.trim() !== '') : [],
                whatsNotIncluded: Array.isArray(cleanedData.whatsNotIncluded) ? cleanedData.whatsNotIncluded.filter((item: string) => item.trim() !== '') : [],
                itinerary: Array.isArray(cleanedData.itinerary) ? cleanedData.itinerary.filter((item: ItineraryItem) => item.title?.trim() && item.description?.trim()) : [],
                faq: Array.isArray(cleanedData.faqs) ? cleanedData.faqs.filter((faq: FAQ) => faq.question?.trim() && faq.answer?.trim()) : [],
                bookingOptions: Array.isArray(cleanedData.bookingOptions) ? cleanedData.bookingOptions.filter((option: BookingOption) => option.label?.trim()) : [],
                addOns: Array.isArray(cleanedData.addOns) ? cleanedData.addOns.filter((addon: AddOn) => addon.name?.trim()) : [],
                tags: typeof cleanedData.tags === 'string'
                    ? cleanedData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                    : Array.isArray(cleanedData.tags) ? cleanedData.tags : [],
             availability: cleanedData.availability || {
                    type: 'daily',
                    availableDays: [0, 1, 2, 3, 4, 5, 6],
                    slots: [{ time: '10:00', capacity: 10 }]
                },
                metaTitle: cleanedData.metaTitle?.trim() || '',
                metaDescription: cleanedData.metaDescription?.trim() || '',
                keywords: typeof cleanedData.keywords === 'string'
                    ? cleanedData.keywords.split(',').map((t: string) => t.trim()).filter(Boolean)
                    : Array.isArray(cleanedData.keywords) ? cleanedData.keywords : [],
                attractions: Array.isArray(cleanedData.attractions) ? cleanedData.attractions.filter(Boolean) : [],
                interests: Array.isArray(cleanedData.interests) ? cleanedData.interests.filter(Boolean) : [],
            };

            console.log('Payload being sent:', payload);
            console.log('Attractions:', payload.attractions);
            console.log('Interests:', payload.interests);

            const apiEndpoint = tourToEdit ? `/api/admin/tours/${tourToEdit._id}` : '/api/admin/tours';
            const method = tourToEdit ? 'PUT' : 'POST';

            const response = await fetch(apiEndpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();
            console.log('API Response:', responseData);

            if (response.ok) {
                toast.success(`Tour ${tourToEdit ? 'updated' : 'created'} successfully!`);
                setIsPanelOpen(false);
                if (onSave) onSave();
                if (fullPage) {
                    router.push('/admin/tours');
                } else {
                    router.refresh();
                }
            } else {
                const errorMessage = responseData?.error || responseData?.message || `HTTP ${response.status}: ${response.statusText}`;
                console.error('API Error:', errorMessage, responseData);
                toast.error(`Failed to save tour: ${errorMessage}`);
            }

        } catch (error) {
            console.error('Submit error:', error);
            toast.error('An unexpected error occurred while saving the tour.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: Info },
        { id: 'pricing', label: 'Pricing & Details', icon: CreditCard },
        { id: 'media', label: 'Media', icon: Camera },
        { id: 'content', label: 'Content', icon: Sparkles },
        { id: 'itinerary', label: 'Itinerary', icon: Map },
        { id: 'booking', label: 'Booking Options', icon: Settings },
        { id: 'addons', label: 'Add-ons', icon: Zap },
     { id: 'availability', label: 'Availability', icon: Calendar },
        { id: 'settings', label: 'Settings', icon: Eye },
        { id: 'seo', label: 'SEO', icon: Globe }
    ];

    // Component for tour to show when no panel is open
    const TourOverview = () => (
        <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                            <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                {tourToEdit ? 'Edit Tour' : 'Create New Tour'}
                            </h1>
                            <p className="text-slate-500 mt-1">
                                {tourToEdit ? `Editing: ${tourToEdit.title}` : 'Fill out the form to create your tour'}
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={tourToEdit ? openPanelForEdit : openPanelForCreate}
                        className="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                    >
                        {tourToEdit ? (
                            <>
                                <Edit className="h-5 w-5 group-hover:rotate-12 transition-transform duration-200" />
                                Edit Tour
                            </>
                        ) : (
                            <>
                                <PlusCircle className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
                                Create Tour
                            </>
                        )}
                    </button>
                </div>

                {tourToEdit && (
                    <div className="mt-6 pt-6 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-4 w-4 text-indigo-500" />
                            <span className="font-medium">{tourToEdit.duration || 'No duration'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <CurrencyIcon className="h-4 w-4 text-green-500" />
                            <span className="font-medium">{selectedCurrency.symbol}{tourToEdit.discountPrice || tourToEdit.price || '0'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Max {tourToEdit.maxGroupSize || 10}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            {tourToEdit.isPublished ? (
                                <Eye className="h-4 w-4 text-green-500" />
                            ) : (
                                <X className="h-4 w-4 text-red-500" />
                            )}
                            <span className="font-medium">{tourToEdit.isPublished ? 'Published' : 'Draft'}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className={fullPage ? '' : 'space-y-8'}>
            {!fullPage && !isPanelOpen && <TourOverview />}
            
            {/* Backdrop Overlay - hidden in full-page mode */}
            {!fullPage && (
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
            )}

            {/* Form Panel - full-page inline or slide-out panel */}
            <AnimatePresence>
                {isPanelOpen && (
                    <motion.div
                        initial={fullPage ? false : { x: '100%' }}
                        animate={fullPage ? {} : { x: 0 }}
                        exit={fullPage ? {} : { x: '100%' }}
                        transition={fullPage ? {} : { type: 'spring', stiffness: 300, damping: 30 }}
                        className={fullPage
                            ? 'bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col'
                            : 'fixed top-0 right-0 h-full w-full max-w-5xl bg-white z-50 shadow-2xl flex flex-col'
                        }
                    >
                        {/* Panel Header - hidden in full-page mode (page has its own header) */}
                        {!fullPage && (
                            <div className="flex items-center justify-between p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
                                        {tourToEdit ? <Edit className="h-5 w-5 text-white" /> : <PlusCircle className="h-5 w-5 text-white" />}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">
                                            {tourToEdit ? 'Edit Tour' : 'Create New Tour'}
                                        </h2>
                                        <p className="text-sm text-slate-500">
                                            {tourToEdit ? `Editing: ${tourToEdit.title}` : 'Fill out the form to create your tour'}
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
                        )}

                        {/* Tab Navigation */}
                        <div className={`flex border-b border-slate-200 bg-slate-50 px-8 overflow-x-auto ${fullPage ? 'rounded-t-2xl' : ''}`}>
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
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
                        <form onSubmit={handleSubmit} className={fullPage ? 'flex-1' : 'flex-1 overflow-y-auto'}>
                            <div className="p-8 space-y-8">
                                
                                {/* Basic Info Tab */}
                                {activeTab === 'basic' && (
                                    <div className="space-y-6">
                                        {/* Tenant/Brand Selector */}
                                        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
                                            <FormLabel icon={Building2} required>Assign to Brand</FormLabel>
                                            <div className="relative">
                                                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-indigo-500" />
                                                <select
                                                    name="tenantId"
                                                    value={formData.tenantId || ''}
                                                    onChange={handleChange}
                                                    className={`${inputBase} pl-10 appearance-none cursor-pointer border-indigo-200 focus:ring-indigo-500`}
                                                    required
                                                >
                                                    <option value="">Select a brand...</option>
                                                    {tenants.map(t => (
                                                        <option key={t.tenantId} value={t.tenantId}>
                                                            {t.name} ({t.domain})
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                            </div>
                                            <SmallHint className="text-indigo-600">
                                                This tour will only appear on the selected brand's website.
                                            </SmallHint>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <FormLabel icon={Sparkles} required>Title</FormLabel>
                                                <input 
                                                    name="title" 
                                                    value={formData.title || ''} 
                                                    onChange={handleChange} 
                                                    className={`${inputBase} text-lg font-medium`} 
                                                    placeholder="e.g., 1-Hour Amsterdam Canal Cruise" 
                                                    required 
                                                />
                                                <SmallHint>Make the title descriptive — it will appear on listing pages and search results.</SmallHint>
                                            </div>
                                            <div className="space-y-3">
                                                <FormLabel icon={Tag} required>URL Slug</FormLabel>
                                                <input 
                                                    name="slug" 
                                                    value={formData.slug || ''} 
                                                    onChange={handleChange} 
                                                    className={inputBase} 
                                                    placeholder="auto-generated-from-title" 
                                                    required 
                                                />
                                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                                                    <span className="text-xs font-medium text-slate-500">Preview:</span>
                                                    <span className="text-xs font-mono text-slate-700 bg-white px-2 py-1 rounded border">
                                                        /{formData.slug || 'your-slug'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <FormLabel icon={FileText} required>Short Description</FormLabel>
                                            <textarea 
                                                name="description" 
                                                value={formData.description || ''} 
                                                onChange={handleChange} 
                                                rows={3} 
                                                className={`${textareaBase} resize-none`} 
                                                placeholder="Short summary that appears on the listing" 
                                                required
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <FormLabel icon={FileText}>Long Description</FormLabel>
                                            <textarea 
                                                name="longDescription" 
                                                value={formData.longDescription || ''} 
                                                onChange={handleChange} 
                                                rows={5} 
                                                className={textareaBase} 
                                                placeholder="Full description shown on the tour detail page" 
                                            />
                                        </div>

                                        {/* Location & Category */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <FormLabel icon={MapPin} required>Destination</FormLabel>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <select 
                                                        name="destination" 
                                                        value={formData.destination} 
                                                        onChange={handleChange} 
                                                        className={`${inputBase} pl-10 appearance-none cursor-pointer`}
                                                        required
                                                    >
                                                        <option value="">Select a Destination</option>
                                                        {destinations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <FormLabel icon={Grid3x3} required>Categories</FormLabel>
                                                <div className="border border-slate-300 rounded-xl p-4 max-h-48 overflow-y-auto bg-white">
                                                    {categories.length === 0 ? (
                                                        <p className="text-sm text-slate-500">No categories available</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {categories.map((cat) => {
                                                                const formCategories = formData.category || [];
                                                                const catId = String(cat._id);
                                                                const isChecked = formCategories.some(id => String(id) === catId);
                                                                return (
                                                                    <label key={cat._id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={() => handleMultiSelectChange('category', cat._id)}
                                                                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                                        />
                                                                        <span className="text-sm text-slate-700">{cat.name}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                <SmallHint>Select one or more categories for this tour</SmallHint>
                                            </div>
                                        </div>

                                        {/* Attractions & Interests Multi-Select */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Attractions */}
                                            <div className="space-y-3">
                                                <FormLabel icon={MapPin}>Attractions</FormLabel>
                                                <div className="border border-slate-300 rounded-xl p-4 max-h-48 overflow-y-auto bg-white">
                                                    {attractions.length === 0 ? (
                                                        <p className="text-sm text-slate-500">No attractions available</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {attractions.map((attr) => {
                                                                const formAttractions = formData.attractions || [];
                                                                const attrId = String(attr._id);
                                                                const isChecked = formAttractions.some(id => String(id) === attrId);

                                                                if (formAttractions.length > 0 && attr === attractions[0]) {
                                                                    console.log('First attraction comparison:', {
                                                                        attrId,
                                                                        attrIdType: typeof attr._id,
                                                                        formAttractions,
                                                                        formTypes: formAttractions.map(id => typeof id),
                                                                        isChecked
                                                                    });
                                                                }

                                                                return (
                                                                <label key={attr._id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => handleMultiSelectChange('attractions', attr._id)}
                                                                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                                    />
                                                                    <span className="text-sm text-slate-700">{attr.title}</span>
                                                                </label>
                                                            )})}
                                                        </div>
                                                    )}
                                                </div>
                                                <SmallHint>Select attractions related to this tour</SmallHint>
                                            </div>

                                            {/* Interests */}
                                            <div className="space-y-3">
                                                <FormLabel icon={Star}>Interests</FormLabel>
                                                <div className="border border-slate-300 rounded-xl p-4 max-h-48 overflow-y-auto bg-white">
                                                    {interests.length === 0 ? (
                                                        <p className="text-sm text-slate-500">No interests available</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {interests.map((interest) => {
                                                                const formInterests = formData.interests || [];
                                                                const interestId = String(interest._id);
                                                                const isChecked = formInterests.some(id => String(id) === interestId);
                                                                return (
                                                                <label key={interest._id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => handleMultiSelectChange('interests', interest._id)}
                                                                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                                    />
                                                                    <span className="text-sm text-slate-700">{interest.title}</span>
                                                                </label>
                                                            )})}
                                                        </div>
                                                    )}
                                                </div>
                                                <SmallHint>Select interest categories for this tour</SmallHint>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Pricing & Details Tab */}
                                {activeTab === 'pricing' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-3">
                                                <FormLabel icon={CurrencyIcon} required>Discount Price ({selectedCurrency.symbol})</FormLabel>
                                                <div className="relative">
                                                    <CurrencyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <input 
                                                        name="discountPrice" 
                                                        type="number" 
                                                        step="0.01" 
                                                        value={formData.discountPrice} 
                                                        onChange={handleChange} 
                                                        className={`${inputBase} pl-10`} 
                                                        placeholder="15.50" 
                                                        required 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <FormLabel icon={CurrencyIcon}>Original Price ({selectedCurrency.symbol})</FormLabel>
                                                <div className="relative">
                                                    <CurrencyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <input 
                                                        name="originalPrice" 
                                                        type="number" 
                                                        step="0.01" 
                                                        value={formData.originalPrice || ''} 
                                                        onChange={handleChange} 
                                                        className={`${inputBase} pl-10`} 
                                                        placeholder="20.00" 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <FormLabel icon={Tag}>Tags (comma separated)</FormLabel>
                                                <input 
                                                    name="tags" 
                                                    value={formData.tags} 
                                                    onChange={handleChange} 
                                                    className={inputBase} 
                                                    placeholder="e.g., Staff Favourite, -25%, New" 
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="space-y-3">
                                                <FormLabel icon={Timer} required>Duration</FormLabel>
                                                <input 
                                                    name="duration" 
                                                    value={formData.duration} 
                                                    onChange={handleChange} 
                                                    className={inputBase} 
                                                    placeholder="e.g., 6 hours" 
                                                    required 
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <FormLabel icon={Mountain}>Difficulty</FormLabel>
                                                <input 
                                                    name="difficulty" 
                                                    value={formData.difficulty} 
                                                    onChange={handleChange} 
                                                    className={inputBase} 
                                                    placeholder="e.g., Easy, Moderate" 
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <FormLabel icon={Users}>Max Group Size</FormLabel>
                                                <input 
                                                    name="maxGroupSize" 
                                                    type="number" 
                                                    value={formData.maxGroupSize} 
                                                    onChange={handleChange} 
                                                    className={inputBase} 
                                                    placeholder="10" 
                                                />
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input 
                                                        id="isPublished" 
                                                        name="isPublished" 
                                                        type="checkbox" 
                                                        checked={formData.isPublished} 
                                                        onChange={handleChange} 
                                                        className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2" 
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <Eye className="h-4 w-4 text-slate-500" />
                                                        <span className="text-sm font-semibold text-slate-700">Published</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Media Tab */}
                                {activeTab === 'media' && (
                                    <div className="space-y-8">
                                        {/* Main Image */}
                                        <div className="space-y-4">
                                            <FormLabel icon={ImageIcon}>Main Image</FormLabel>
                                            
                                            {formData.image ? (
                                                <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-200">
                                                    <img 
                                                        src={formData.image} 
                                                        alt="Main tour preview" 
                                                        className="w-full h-64 object-cover" 
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setFormData((p) => ({ ...p, image: '' }))} 
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
                                                                    htmlFor="main-image-upload" 
                                                                    className="relative cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                                                                >
                                                                    <span>Upload Main Image</span>
                                                                    <input 
                                                                        id="main-image-upload" 
                                                                        name="main-image-upload" 
                                                                        type="file" 
                                                                        className="sr-only" 
                                                                        onChange={(e) => handleImageUpload(e, true)} 
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

                                        {/* Gallery Images */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <FormLabel icon={Grid3x3}>Gallery Images</FormLabel>
                                                <label 
                                                    htmlFor="gallery-upload" 
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Add Image
                                                    <input 
                                                        id="gallery-upload" 
                                                        type="file" 
                                                        accept="image/*" 
                                                        onChange={(e) => handleImageUpload(e, false)} 
                                                        className="sr-only"
                                                        disabled={isUploading}
                                                    />
                                                </label>
                                            </div>
                                            
                                            {formData.images.length > 0 ? (
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                    {formData.images.map((img: string, i: number) => (
                                                        <div key={i} className="relative group">
                                                            <img 
                                                                src={img} 
                                                                alt={`Gallery ${i}`} 
                                                                className="w-full h-32 object-cover rounded-xl border-2 border-slate-200 shadow-sm group-hover:shadow-md transition-all" 
                                                            />
                                                            <button 
                                                                type="button" 
                                                                onClick={() => removeGalleryImage(img)}
                                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-slate-500">
                                                    <Grid3x3 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                                    <p>No gallery images yet. Click "Add Image" to upload photos.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Content Tab */}
                                {activeTab === 'content' && (
                                    <div className="space-y-8">
                                        {/* Highlights & Includes */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <FormLabel icon={Star}>Highlights</FormLabel>
                                                <div className="space-y-3">
                                                    {formData.highlights.map((h: string, i: number) => (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <div className="flex-1 relative">
                                                                <input 
                                                                    value={h} 
                                                                    onChange={(e) => handleListChange(i, e.target.value, 'highlights')} 
                                                                    className={inputBase} 
                                                                    placeholder={`Highlight ${i + 1}`} 
                                                                />
                                                            </div>
                                                            <button 
                                                                type="button" 
                                                                disabled={formData.highlights.length <= 1} 
                                                                onClick={() => removeListItem(i, 'highlights')} 
                                                                className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-30"
                                                            >
                                                                <Minus className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => addListItem('highlights')} 
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200"
                                                    >
                                                        <Plus className="w-4 h-4" /> Add Highlight
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <FormLabel icon={Check}>What's Included</FormLabel>
                                                <div className="space-y-3">
                                                    {formData.includes.map((it: string, i: number) => (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <div className="flex-1">
                                                                <input 
                                                                    value={it} 
                                                                    onChange={(e) => handleListChange(i, e.target.value, 'includes')} 
                                                                    className={inputBase} 
                                                                    placeholder={`Included item ${i + 1}`} 
                                                                />
                                                            </div>
                                                            <button 
                                                                type="button" 
                                                                disabled={formData.includes.length <= 1} 
                                                                onClick={() => removeListItem(i, 'includes')} 
                                                                className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-30"
                                                            >
                                                                <Minus className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => addListItem('includes')} 
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200"
                                                    >
                                                        <Plus className="w-4 h-4" /> Add Item
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Detailed Inclusions */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <FormLabel icon={Check}>What's Included (List)</FormLabel>
                                                <textarea 
                                                    value={formData.whatsIncluded.join('\n')} 
                                                    onChange={(e) => handleTextAreaArrayChange('whatsIncluded', e)}
                                                    rows={6} 
                                                    className={textareaBase} 
                                                    placeholder="Enter each item on a new line"
                                                />
                                                <SmallHint>Each line will be a separate item in the list.</SmallHint>
                                            </div>
                                            <div className="space-y-3">
                                                <FormLabel icon={X}>What's Not Included (List)</FormLabel>
                                                <textarea 
                                                    value={formData.whatsNotIncluded.join('\n')} 
                                                    onChange={(e) => handleTextAreaArrayChange('whatsNotIncluded', e)}
                                                    rows={6} 
                                                    className={textareaBase} 
                                                    placeholder="Enter each item on a new line"
                                                />
                                                <SmallHint>Each line will be a separate item in the list.</SmallHint>
                                            </div>
                                        </div>

                                        {/* FAQs */}
                                        <div className="space-y-6">
                                            <FormLabel icon={HelpCircle}>Frequently Asked Questions</FormLabel>
                                            {formData.faqs.map((faq: FAQ, i: number) => (
                                                <div 
                                                    key={i} 
                                                    className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${
                                                        expandedFaqIndex === i ? 'border-purple-500 shadow-lg' : 'border-slate-200 hover:border-indigo-300'
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleFaqItem(i)}
                                                        className="bg-slate-50 w-full text-left px-6 py-4 border-b border-slate-200 flex items-center justify-between transition-colors hover:bg-slate-100"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-lg font-bold text-sm">
                                                                {i + 1}
                                                            </div>
                                                            <h4 className="font-semibold text-slate-900">FAQ {i + 1}</h4>
                                                        </div>
                                                        <ChevronDown className={`h-5 w-5 text-slate-500 transform transition-transform duration-200 ${expandedFaqIndex === i ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    <div className={`overflow-hidden transition-all duration-300 ${expandedFaqIndex === i ? 'max-h-[1000px] opacity-100 p-6' : 'max-h-0 opacity-0 p-0'}`}>
                                                        <div className="space-y-4">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium text-slate-500">Question</label>
                                                                <input 
                                                                    value={faq.question} 
                                                                    onChange={(e) => handleFAQChange(i, 'question', e.target.value)}
                                                                    className={inputBase} 
                                                                    placeholder="Question" 
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium text-slate-500">Answer</label>
                                                                <textarea 
                                                                    value={faq.answer} 
                                                                    onChange={(e) => handleFAQChange(i, 'answer', e.target.value)}
                                                                    className={`${textareaBase} resize-none`} 
                                                                    rows={3}
                                                                    placeholder="Answer" 
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 text-right">
                                                            <button
                                                                type="button"
                                                                disabled={formData.faqs.length <= 1}
                                                                onClick={() => removeFAQ(i)}
                                                                className="inline-flex items-center gap-2 text-red-600 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                            >
                                                                <XCircle className="w-5 h-5" />
                                                                <span>Remove FAQ</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                type="button" 
                                                onClick={addFAQ} 
                                                className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200"
                                            >
                                                <Plus className="w-4 h-4" /> Add FAQ
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Itinerary Tab */}
                                {activeTab === 'itinerary' && (
                                    <div className="space-y-6">
                                        <FormLabel icon={Map}>Day-by-day Itinerary</FormLabel>
                                        {formData.itinerary.map((day: ItineraryItem, i: number) => (
                                            <div 
                                                key={i} 
                                                className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${
                                                    expandedItineraryIndex === i ? 'border-indigo-500 shadow-lg' : 'border-slate-200 hover:border-indigo-300'
                                                }`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => toggleItineraryItem(i)}
                                                    className="bg-slate-50 w-full text-left px-6 py-4 border-b border-slate-200 flex items-center justify-between transition-colors hover:bg-slate-100"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg font-bold text-sm">
                                                            {day.day}
                                                        </div>
                                                        <h4 className="font-semibold text-slate-900">Day {day.day}</h4>
                                                    </div>
                                                    <ChevronDown className={`h-5 w-5 text-slate-500 transform transition-transform duration-200 ${expandedItineraryIndex === i ? 'rotate-180' : ''}`} />
                                                </button>
                                                <div className={`overflow-hidden transition-all duration-300 ${expandedItineraryIndex === i ? 'max-h-[1000px] opacity-100 p-6' : 'max-h-0 opacity-0 p-0'}`}>
                                                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <div className="space-y-2">
    <label className="text-xs font-medium text-slate-500">Day Title</label>
    <input 
      value={day.title} 
      onChange={(e) => handleItineraryChange(i, 'title', e.target.value)}
      className={inputBase} 
      placeholder="Day title" 
    />
  </div>
  <div className="space-y-2">
    <label className="text-xs font-medium text-slate-500">Icon</label>
    <select 
      value={day.icon || 'location'} 
      onChange={(e) => handleItineraryChange(i, 'icon', e.target.value)}
      className={`${inputBase} appearance-none cursor-pointer`}
    >
      <option value="location">Location</option>
      <option value="transport">Transport</option>
      <option value="monument">Monument</option>
      <option value="camera">Photo Stop</option>
      <option value="food">Food</option>
      <option value="time">Time</option>
    </select>
  </div>
  <div className="space-y-2">
    <label className="text-xs font-medium text-slate-500">Description</label>
    <textarea 
      value={day.description} 
      onChange={(e) => handleItineraryChange(i, 'description', e.target.value)}
      className={`${textareaBase} resize-none`} 
      rows={2}
      placeholder="Day description" 
    />
  </div>
</div>
                                                    <div className="mt-4 text-right">
                                                        <button
                                                            type="button"
                                                            disabled={formData.itinerary.length <= 1}
                                                            onClick={() => removeItineraryItem(i)}
                                                            className="inline-flex items-center gap-2 text-red-600 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                            <span>Remove Day</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={addItineraryItem} 
                                            className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200"
                                        >
                                            <Plus className="w-4 h-4" /> Add Day
                                        </button>
                                    </div>
                                )}

                                {/* Booking Options Tab */}
                                {activeTab === 'booking' && (
                                    <div className="space-y-6">
                                        <FormLabel icon={Settings}>Booking Options</FormLabel>
                                        
                                        {/* Booking Options Preview */}
                                        {formData.bookingOptions.length > 0 && (
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                                                <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                                    <Eye className="h-5 w-5 text-blue-500" />
                                                    Preview - How customers see booking options
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {formData.bookingOptions.map((option: BookingOption, index: number) => (
                                                        <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-all duration-200">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div className="flex-1">
                                                                    <h5 className="font-semibold text-slate-900 mb-1">
                                                                        {option.label || `Option ${index + 1}`}
                                                                    </h5>
                                                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                                                        <Users className="h-4 w-4" />
                                                                        <span>{option.type}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-lg font-bold text-slate-900">
                                                                        {selectedCurrency.symbol}{option.price?.toFixed(2) || '0.00'}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500">
                                                                        {option.type === 'Per Person' ? 'per person' : 'per group'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="pt-2 border-t border-slate-100">
                                                                <div className="flex items-center justify-center w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium">
                                                                    Select Option
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Booking Options Editor */}
                                        <div className="space-y-4">
                                            {formData.bookingOptions.map((option: BookingOption, index: number) => (
                                                <div 
                                                    key={index} 
                                                    className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${
                                                        expandedOptionIndex === index ? 'border-indigo-500 shadow-lg' : 'border-slate-200 hover:border-indigo-300'
                                                    }`}
                                                >
                                                    {/* Option Header */}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => toggleBookingOption(index)} 
                                                        className="bg-slate-50 w-full text-left px-6 py-4 border-b border-slate-200 flex items-center justify-between transition-colors hover:bg-slate-100"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg font-bold text-sm">
                                                                {index + 1}
                                                            </div>
                                                            <div>
                                                                <h5 className="font-semibold text-slate-900">
                                                                    {option.label || `Booking Option ${index + 1}`}
                                                                </h5>
                                                                <p className="text-sm text-slate-500">
                                                                    {option.type} - {selectedCurrency.symbol}{option.price?.toFixed(2) || '0.00'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ChevronDown className={`h-5 w-5 text-slate-500 transform transition-transform duration-200 ${expandedOptionIndex === index ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    
                                                    {/* Option Configuration */}
                                                    <div className={`overflow-hidden transition-all duration-300 ${expandedOptionIndex === index ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                        <div className="p-6 space-y-6">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                <div className="space-y-2">
                                                                    <label className="block text-sm font-medium text-slate-700">Option Name *</label>
                                                                    <input 
                                                                        value={option.label || ''} 
                                                                        onChange={(e) => handleBookingOptionChange(index, 'label', e.target.value)}
                                                                        className={inputBase}
                                                                        placeholder="e.g., Standard Tour"
                                                                        required
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <label className="block text-sm font-medium text-slate-700">Pricing Type *</label>
                                                                    <div className="relative">
                                                                        <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                                        <select 
                                                                            value={option.type || 'Per Person'} 
                                                                            onChange={(e) => handleBookingOptionChange(index, 'type', e.target.value)}
                                                                            className={`${inputBase} pl-10 appearance-none cursor-pointer`}
                                                                        >
                                                                            <option value="Per Person">Per Person</option>
                                                                            <option value="Per Group">Per Group</option>
                                                                            <option value="Per Couple">Per Couple</option>
                                                                            <option value="Per Family">Per Family (up to 4)</option>
                                                                        </select>
                                                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <label className="block text-sm font-medium text-slate-700">Price ({selectedCurrency.symbol}) *</label>
                                                                    <div className="relative">
                                                                        <CurrencyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                                        <input 
                                                                            type="number" 
                                                                            step="0.01"
                                                                            value={option.price || ''} 
                                                                            onChange={(e) => handleBookingOptionChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                                            className={`${inputBase} pl-10`}
                                                                            placeholder="0.00"
                                                                            min="0"
                                                                            required
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="block text-sm font-medium text-slate-700">Description</label>
                                                                <textarea
                                                                    value={option.description || ''}
                                                                    onChange={(e) => handleBookingOptionChange(index, 'description', e.target.value)}
                                                                    rows={3}
                                                                    className={textareaBase}
                                                                    placeholder="Describe what's included in this option..."
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className={`p-4 border-t border-slate-200 flex items-center justify-between ${expandedOptionIndex !== index ? 'hidden' : ''}`}>
                                                        <button
                                                            type="button"
                                                            onClick={() => saveIndividualBookingOption(index)}
                                                            className="inline-flex items-center gap-2 text-indigo-600 font-medium px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                                                        >
                                                            <Check className="h-5 w-5" />
                                                            <span>Save Option</span>
                                                        </button>
                                                        
                                                        <button
                                                            type="button"
                                                            disabled={formData.bookingOptions.length <= 1}
                                                            onClick={() => removeBookingOption(index)}
                                                            className="inline-flex items-center gap-2 text-red-600 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <XCircle className="h-5 w-5" />
                                                            <span>Remove Option</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button 
                                            type="button" 
                                            onClick={addBookingOption} 
                                            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200"
                                        >
                                            <Plus className="h-5 w-5" /> 
                                            Add Booking Option
                                        </button>
                                    </div>
                                )}

                                {/* Add-ons Tab */}
                                {activeTab === 'addons' && (
                                    <div className="space-y-6">
                                        <FormLabel icon={Zap}>Tour Add-ons</FormLabel>
                                        
                                        {formData.addOns.length > 0 && (
                                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                                                <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                                    <Eye className="h-5 w-5 text-green-500" />
                                                    Preview - How customers see add-ons
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {formData.addOns.map((addon: AddOn, index: number) => (
                                                        <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 hover:border-green-300 transition-all duration-200">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div className="flex-1">
                                                                    <h5 className="font-semibold text-slate-900 mb-1">
                                                                        {addon.name || `Add-on ${index + 1}`}
                                                                    </h5>
                                                                    <p className="text-sm text-slate-600 line-clamp-2">
                                                                        {addon.description || 'No description provided'}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-lg font-bold text-slate-900">
                                                                        {selectedCurrency.symbol}{addon.price?.toFixed(2) || '0.00'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="pt-2 border-t border-slate-100">
                                                                <div className="flex items-center justify-center w-full py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium">
                                                                    Add to Tour
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {formData.addOns.map((addon: AddOn, index: number) => (
                                                <div key={index} className="bg-white border border-slate-200 rounded-xl p-6 hover:border-green-300 transition-all duration-200">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-lg font-bold text-sm">
                                                                {index + 1}
                                                            </div>
                                                            <h5 className="font-semibold text-slate-900">Add-on {index + 1}</h5>
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeAddOn(index)} 
                                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-200"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        <div className="space-y-2">
                                                            <label className="block text-sm font-medium text-slate-700">Add-on Name *</label>
                                                            <input 
                                                                value={addon.name || ''} 
                                                                onChange={(e) => handleAddOnChange(index, 'name', e.target.value)}
                                                                className={inputBase} 
                                                                placeholder="e.g., Professional Photography" 
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="block text-sm font-medium text-slate-700">Price ({selectedCurrency.symbol}) *</label>
                                                            <div className="relative">
                                                                <CurrencyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                                <input 
                                                                    type="number" 
                                                                    step="0.01"
                                                                    value={addon.price || ''} 
                                                                    onChange={(e) => handleAddOnChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                                    className={`${inputBase} pl-10`}placeholder="0.00"
                                                                    min="0"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="block text-sm font-medium text-slate-700">Category</label>
                                                            <select 
                                                                value={addon.category || 'Experience'} 
                                                                onChange={(e) => handleAddOnChange(index, 'category', e.target.value)}
                                                                className={`${inputBase} appearance-none cursor-pointer`}
                                                            >
                                                                <option value="Experience">Experience</option>
                                                                <option value="Photography">Photography</option>
                                                                <option value="Transport">Transport</option>
                                                                <option value="Food">Food & Drink</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="mt-6 space-y-2">
                                                        <label className="block text-sm font-medium text-slate-700">Description *</label>
                                                        <textarea 
                                                            value={addon.description || ''} 
                                                            onChange={(e) => handleAddOnChange(index, 'description', e.target.value)}
                                                            className={textareaBase} 
                                                            rows={3}
                                                            placeholder="Describe what this add-on includes and why customers would want it..."
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button 
                                            type="button" 
                                            onClick={addAddOn} 
                                            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-sm font-semibold text-green-600 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-dashed border-green-300 rounded-xl hover:from-green-100 hover:to-emerald-100 hover:border-green-400 transition-all duration-200"
                                        >
                                            <Plus className="h-5 w-5" /> 
                                            Add Tour Enhancement
                                        </button>

                                        {formData.addOns.length === 0 && (
                                            <div className="text-center py-8 text-slate-500">
                                                <Zap className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                                <p>No add-ons yet. Click "Add Tour Enhancement" to create optional extras.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Availability Tab */}
                                {activeTab === 'availability' && (
                                    <div className="space-y-6">
                                        <FormLabel icon={Calendar}>Availability & Scheduling</FormLabel>
                                        {formData.availability && (
                                            <AvailabilityManager
                                                availability={formData.availability}
                                                setAvailability={setAvailability}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Settings Tab */}
                                {activeTab === 'settings' && (
                                    <div className="space-y-6">
                                        <FormLabel icon={Settings}>Tour Settings</FormLabel>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl">
                                                    <input
                                                        type="checkbox"
                                                        id="isFeatured"
                                                        name="isFeatured"
                                                        checked={formData.isFeatured}
                                                        onChange={handleChange}
                                                        className="w-5 h-5 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <Star className="h-5 w-5 text-yellow-500" />
                                                        <div>
                                                            <label htmlFor="isFeatured" className="text-sm font-semibold text-slate-700">Featured Tour</label>
                                                            <p className="text-xs text-slate-500">Show this tour in homepage featured carousel</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                                                    <input
                                                        type="checkbox"
                                                        id="isPublished"
                                                        name="isPublished"
                                                        checked={formData.isPublished}
                                                        onChange={handleChange}
                                                        className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        {formData.isPublished ? (
                                                            <Eye className="h-5 w-5 text-green-500" />
                                                        ) : (
                                                            <Eye className="h-5 w-5 text-red-500" />
                                                        )}
                                                        <div>
                                                            <label htmlFor="isPublished" className="text-sm font-semibold text-slate-700">Published</label>
                                                            <p className="text-xs text-slate-500">Make this tour visible to customers</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tour Status Summary */}
                                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-xl border border-slate-200">
                                            <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                                <Info className="h-5 w-5 text-slate-500" />
                                                Tour Summary
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-indigo-500" />
                                                    <span className="text-slate-600">Duration:</span>
                                                    <span className="font-medium text-slate-900">{formData.duration || 'Not set'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <CurrencyIcon className="h-4 w-4 text-green-500" />
                                                    <span className="text-slate-600">Price:</span>
                                                    <span className="font-medium text-slate-900">
                                                        {selectedCurrency.symbol}{formData.discountPrice || '0.00'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-blue-500" />
                                                    <span className="text-slate-600">Max Group:</span>
                                                    <span className="font-medium text-slate-900">{formData.maxGroupSize || 10}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Camera className="h-4 w-4 text-purple-500" />
                                                    <span className="text-slate-600">Images:</span>
                                                    <span className="font-medium text-slate-900">
                                                        {(formData.image ? 1 : 0) + (formData.images?.length || 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Validation Status */}
                                        <div className="space-y-3">
                                            <h5 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                <HelpCircle className="h-4 w-4 text-indigo-500" />
                                                Form Validation
                                            </h5>
                                            <div className="space-y-2">
                                                {[
                                                    { field: 'title', label: 'Title', value: formData.title },
                                                    { field: 'description', label: 'Description', value: formData.description },
                                                    { field: 'duration', label: 'Duration', value: formData.duration },
                                                    { field: 'discountPrice', label: 'Price', value: formData.discountPrice },
                                                    { field: 'destination', label: 'Destination', value: formData.destination },
                                                    { field: 'category', label: 'Category', value: formData.category?.length },
                                                ].map((item) => (
                                                    <div key={item.field} className="flex items-center gap-2 text-sm">
                                                        {item.value ? (
                                                            <Check className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                            <X className="h-4 w-4 text-red-500" />
                                                        )}
                                                        <span className={`${item.value ? 'text-slate-600' : 'text-red-600'}`}>
                                                            {item.label} {item.value ? '✓' : '(required)'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                    </div>
                                    </div>
                                )}

                                {/* SEO Tab */}
                                {activeTab === 'seo' && (
                                    <div className="space-y-6">
                                        <FormLabel icon={Globe}>SEO Settings</FormLabel>
                                        <div className="space-y-3">
                                            <FormLabel icon={Tag}>Meta Title</FormLabel>
                                            <input 
                                                name="metaTitle" 
                                                value={formData.metaTitle} 
                                                onChange={handleChange} 
                                                className={inputBase} 
                                                placeholder="e.g., Unforgettable Amsterdam Canal Cruise | Book Now" 
                                            />
                                            <SmallHint>The meta title is crucial for SEO and appears in browser tabs and search results.</SmallHint>
                                        </div>
                                        <div className="space-y-3">
                                            <FormLabel icon={FileText}>Meta Description</FormLabel>
                                            <textarea 
                                                name="metaDescription" 
                                                value={formData.metaDescription} 
                                                onChange={handleChange} 
                                                rows={3} 
                                                className={textareaBase} 
                                                placeholder="Briefly describe your tour for search engines." 
                                            />
                                            <SmallHint>A well-written meta description can significantly improve click-through rates from search results.</SmallHint>
                                        </div>
                                        <div className="space-y-3">
                                            <FormLabel icon={Tag}>Keywords (comma separated)</FormLabel>
                                            <input 
                                                name="keywords" 
                                                value={formData.keywords} 
                                                onChange={handleChange} 
                                                className={inputBase} 
                                                placeholder="e.g., amsterdam, canal cruise, sightseeing" 
                                            />
                                            <SmallHint>Keywords help search engines understand what your tour is about.</SmallHint>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </form>

                        {/* Panel Footer */}
                        <div className={`p-8 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white ${fullPage ? 'rounded-b-2xl' : ''}`}>
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => fullPage ? router.push('/admin/tours') : setIsPanelOpen(false)}
                                    className="flex-1 px-6 py-3 text-slate-700 font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    onClick={handleSubmit} 
                                    disabled={
                                        isSubmitting || 
                                        isUploading || 
                                        !formData.title?.trim() ||
                                        !formData.description?.trim() ||
                                        !formData.duration?.trim() ||
                                        !formData.discountPrice ||
                                        !formData.destination ||
                                        !formData.category?.length
                                    }
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
                                            <span>{tourToEdit ? 'Update Tour' : 'Create Tour'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            
                            {/* Validation Message */}
                            {(!formData.title?.trim() || !formData.description?.trim() || !formData.duration?.trim() || !formData.discountPrice || !formData.destination || !formData.category?.length) && (
                                <div className="flex items-start gap-2 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                    <HelpCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-amber-700 font-medium">Missing required fields:</p>
                                        <p className="text-xs text-amber-600 mt-1">
                                            Please fill in all required fields marked with (*) before saving.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Save Progress Indicator */}
                            {tourToEdit && (
                                <div className="mt-4 text-center text-xs text-slate-500">
                                    Changes are automatically saved when you click "Update Tour"
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}