'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    Loader2, X, Plus, Check, ChevronDown, Camera, Grid3x3, Info, Globe, 
    UploadCloud, Trash2, Eye, Tag, FileText, Sparkles, MapPin,
    ArrowLeft, Edit, PlusCircle, Minus, HelpCircle
} from 'lucide-react';
import { AttractionPageFormData, Category } from '@/types';

interface AttractionPageFormProps {
  pageId?: string;
}

interface Tour {
  _id: string;
  title: string;
  slug: string;
}

const defaultFormData: AttractionPageFormData = {
  title: '',
  slug: '',
  description: '',
  longDescription: '',
  pageType: 'attraction',
  categoryId: '',
  heroImage: '',
  images: [],
  highlights: [],
  features: [],
  gridTitle: '',
  gridSubtitle: '',
  showStats: true,
  itemsPerRow: 6,
  metaTitle: '',
  metaDescription: '',
  keywords: [],
  isPublished: false,
  featured: false,
  linkedTours: [],
};

// Helper Components
const FormLabel = ({ children, icon: Icon, required = false }: {
  children: React.ReactNode;
  icon?: any;
  required?: boolean;
}) => (
  <div className="flex items-center gap-2 mb-3">
    {Icon && <Icon className="h-4 w-4 text-indigo-500" />}
    <label className="text-sm font-semibold text-slate-700">
      {children}
      {required && <span className="text-red-500 text-xs ms-1">*</span>}
    </label>
  </div>
);

const SmallHint = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={`mt-2 text-xs text-slate-500 ${className}`}>{children}</p>
);

const inputBase = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700";
const textareaBase = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700 resize-vertical min-h-[100px]";

export default function AttractionPageForm({ pageId }: AttractionPageFormProps) {
  const router = useRouter();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  const [formData, setFormData] = useState<AttractionPageFormData>(defaultFormData);
  const [categories, setCategories] = useState<Category[]>([]);
  const [_availableTours, setAvailableTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchTours();
    if (pageId) {
      fetchPageData();
    } else {
      setIsPanelOpen(true); // Auto-open for new pages
    }
  }, [pageId]);

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
    } catch (err) {
      console.error('Error fetching tours:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchPageData = async () => {
    if (!pageId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/attraction-pages/${pageId}`);
      const data = await response.json();
      
      if (data.success) {
        const page = data.data;
        
        console.log('📄 Fetched page data:', page);
        console.log('📸 Page images:', page.images);
        
        setFormData({
          title: page.title || '',
          slug: page.slug || '',
          description: page.description || '',
          longDescription: page.longDescription || '',
          pageType: page.pageType || 'attraction',
          categoryId: typeof page.categoryId === 'object' ? page.categoryId._id : (page.categoryId || ''),
          heroImage: page.heroImage || '',
          images: Array.isArray(page.images) ? page.images : [], // FIX: Ensure it's always an array
          highlights: Array.isArray(page.highlights) ? page.highlights : [],
          features: Array.isArray(page.features) ? page.features : [],
          gridTitle: page.gridTitle || '',
          gridSubtitle: page.gridSubtitle || '',
          showStats: page.showStats !== undefined ? page.showStats : true,
          itemsPerRow: page.itemsPerRow || 6,
          metaTitle: page.metaTitle || '',
          metaDescription: page.metaDescription || '',
          keywords: Array.isArray(page.keywords) ? page.keywords : [],
          isPublished: page.isPublished || false,
          featured: page.featured || false,
        });
        setIsSlugManuallyEdited(Boolean(page.slug));
        
        console.log('✅ Form data set with images:', Array.isArray(page.images) ? page.images : []);
      } else {
        setError(data.error || 'Failed to fetch page data');
      }
    } catch (_err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (target as HTMLInputElement).checked }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'title' && !isSlugManuallyEdited) {
      const newSlug = generateSlug(value);
      setFormData(prev => ({ ...prev, slug: newSlug }));
    }
    
    if (name === 'slug') {
      setIsSlugManuallyEdited(true);
    }
  };

  const addToArray = (field: 'highlights' | 'features' | 'images' | 'keywords', value: string) => {
    if (!value || !value.trim()) return;
    
    console.log(`➕ Adding to ${field}:`, value);
    
    setFormData(prev => {
      const currentArray = prev[field] || [];
      const newArray = [...currentArray, value.trim()];
      console.log(`📋 New ${field} array:`, newArray);
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  const removeFromArray = (field: 'highlights' | 'features' | 'images' | 'keywords', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMainImage = true) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const promise = fetch('/api/upload', { method: 'POST', body: uploadFormData })
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        if (data.success && data.url) {
          if (isMainImage) {
            console.log('🖼️ Setting hero image:', data.url);
            setFormData(prev => ({ ...prev, heroImage: data.url }));
          } else {
            console.log('📸 Adding gallery image:', data.url);
            console.log('📸 Current images before:', formData.images);
            setFormData(prev => {
              const newImages = [...(prev.images || []), data.url];
              console.log('📸 New images array:', newImages);
              return { ...prev, images: newImages };
            });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = pageId 
        ? `/api/admin/attraction-pages/${pageId}`
        : '/api/admin/attraction-pages';
      
      const method = pageId ? 'PUT' : 'POST';

      // Clean up the form data before sending
      const cleanedData = { ...formData };
      
      // If pageType is 'attraction' or categoryId is empty, remove categoryId field entirely
      if (cleanedData.pageType === 'attraction' || !cleanedData.categoryId.trim()) {
        delete (cleanedData as any).categoryId;
      }
      
      // FIX: Ensure arrays are properly formatted WITHOUT aggressive filtering
      const payload = {
        ...cleanedData,
        highlights: Array.isArray(cleanedData.highlights) ? cleanedData.highlights.filter(item => item && item.trim() !== '') : [],
        features: Array.isArray(cleanedData.features) ? cleanedData.features.filter(item => item && item.trim() !== '') : [],
        images: Array.isArray(cleanedData.images) ? cleanedData.images.filter(item => item && item.trim() !== '') : [], // FIX: Check for truthy value first
        keywords: Array.isArray(cleanedData.keywords) ? cleanedData.keywords.filter(item => item && item.trim() !== '') : [],
      };

      // ADD DEBUGGING
      console.log('🔍 FRONTEND: Form data before submit:', formData);
      console.log('📸 FRONTEND: Images being sent:', payload.images);
      console.log('💾 FRONTEND: Full payload:', payload);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Page ${pageId ? 'updated' : 'created'} successfully!`);
        setIsPanelOpen(false);
        router.push('/admin/attraction-pages');
      } else {
        setError(data.error || 'Failed to save page');
        toast.error(data.error || 'Failed to save page');
      }
    } catch (err) {
      const errorMessage = 'Network error occurred while saving the page';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Submit error:', err);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Info },
    { id: 'media', label: 'Media', icon: Camera },
    { id: 'content', label: 'Content', icon: Sparkles },
    { id: 'grid', label: 'Grid Settings', icon: Grid3x3 },
    { id: 'seo', label: 'SEO', icon: Globe },
    { id: 'settings', label: 'Settings', icon: Eye }
  ];

  // Overview Component
  const PageOverview = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {pageId ? 'Edit Attraction Page' : 'Create Attraction Page'}
              </h1>
              <p className="text-slate-500 mt-1">
                {pageId ? `Editing: ${formData.title}` : 'Fill out the form to create your page'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsPanelOpen(true)}
            className="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            {pageId ? (
              <>
                <Edit className="h-5 w-5 group-hover:rotate-12 transition-transform duration-200" />
                Edit Page
              </>
            ) : (
              <>
                <PlusCircle className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
                Create Page
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Loading page data</h3>
              <p className="text-slate-500 text-sm">Please wait while we fetch your page details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 group"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-indigo-600" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                  Attraction Pages
                </h1>
                <div className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 rounded-full text-xs font-semibold text-indigo-700">
                  {pageId ? 'EDITING' : 'CREATING'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {!isPanelOpen && <PageOverview />}
          
          {/* Panel */}
          <AnimatePresence>
            {isPanelOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
              >
                {/* Panel Header */}
                <div className="flex items-center justify-between p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
                      {pageId ? <Edit className="h-5 w-5 text-white" /> : <PlusCircle className="h-5 w-5 text-white" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">
                        {pageId ? 'Edit Page' : 'Create New Page'}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {pageId ? `Editing: ${formData.title}` : 'Fill out the form to create your page'}
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
                <div className="flex border-b border-slate-200 bg-slate-50 px-8 overflow-x-auto">
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
                <form onSubmit={handleSubmit} className="flex-1">
                  <div className="p-8 space-y-8">
                    
                    {/* Basic Info Tab */}
                    {activeTab === 'basic' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <FormLabel icon={Sparkles} required>Title</FormLabel>
                            <input 
                              name="title" 
                              value={formData.title} 
                              onChange={handleChange} 
                              className={`${inputBase} text-lg font-medium`} 
                              placeholder="e.g., Best Attractions in Amsterdam" 
                              required 
                            />
                            <SmallHint>This will be the main heading of your page</SmallHint>
                          </div>
                          <div className="space-y-3">
                            <FormLabel icon={Tag} required>URL Slug</FormLabel>
                            <input 
                              name="slug" 
                              value={formData.slug} 
                              onChange={handleChange} 
                              className={inputBase} 
                              placeholder="auto-generated-from-title" 
                              required 
                            />
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                              <span className="text-xs font-medium text-slate-500">Preview:</span>
                              <span className="text-xs font-mono text-slate-700 bg-white px-2 py-1 rounded border">
                                /attraction/{formData.slug || 'your-slug'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <FormLabel icon={Grid3x3} required>Page Type</FormLabel>
                            <div className="relative">
                              <select 
                                name="pageType" 
                                value={formData.pageType} 
                                onChange={handleChange} 
                                className={`${inputBase} appearance-none cursor-pointer`}
                                required
                              >
                                <option value="attraction">Attraction</option>
                                <option value="category">Category</option>
                              </select>
                              <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          {formData.pageType === 'category' && (
                            <div className="space-y-3">
                              <FormLabel icon={MapPin}>Category</FormLabel>
                              <div className="relative">
                                <select 
                                  name="categoryId" 
                                  value={formData.categoryId} 
                                  onChange={handleChange} 
                                  className={`${inputBase} appearance-none cursor-pointer`}
                                >
                                  <option value="">Select a category</option>
                                  {categories.map((category) => (
                                    <option key={category._id} value={category._id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <FormLabel icon={FileText} required>Description</FormLabel>
                          <textarea 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            rows={3} 
                            className={`${textareaBase} resize-none`} 
                            placeholder="Brief description that appears in listings and search results" 
                            required
                          />
                        </div>

                        <div className="space-y-3">
                          <FormLabel icon={FileText}>Long Description</FormLabel>
                          <textarea 
                            name="longDescription" 
                            value={formData.longDescription} 
                            onChange={handleChange} 
                            rows={5} 
                            className={textareaBase} 
                            placeholder="Detailed description for the page content" 
                          />
                        </div>
                      </div>
                    )}

                    {/* Media Tab */}
                    {activeTab === 'media' && (
                      <div className="space-y-8">
                        {/* Hero Image */}
                        <div className="space-y-4">
                          <FormLabel icon={Camera} required>Hero Image</FormLabel>
                          
                          {formData.heroImage ? (
                            <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-200">
                              <img 
                                src={formData.heroImage} 
                                alt="Hero preview" 
                                className="w-full h-64 object-cover" 
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                <button 
                                  type="button" 
                                  onClick={() => setFormData(prev => ({ ...prev, heroImage: '' }))} 
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
                                      htmlFor="hero-image-upload" 
                                      className="relative cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                                    >
                                      <span>Upload Hero Image</span>
                                      <input 
                                        id="hero-image-upload" 
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
                              {formData.images.map((img, i) => (
                                <div key={i} className="relative group">
                                  <img 
                                    src={img} 
                                    alt={`Gallery ${i}`} 
                                    className="w-full h-32 object-cover rounded-xl border-2 border-slate-200 shadow-sm group-hover:shadow-md transition-all" 
                                  />
                                  <button 
                                    type="button" 
                                    onClick={() => removeFromArray('images', i)}
                                    className="absolute -top-2 -end-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover:opacity-100"
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
                        {/* Highlights */}
                        <div className="space-y-4">
                          <FormLabel icon={Sparkles}>Highlights</FormLabel>
                          <div className="space-y-3">
                            {formData.highlights.map((highlight, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <div className="flex-1">
                                  <input 
                                    value={highlight}
                                    onChange={(e) => {
                                      setFormData(prev => {
                                        const newHighlights = [...(prev.highlights || [])];
                                        newHighlights[i] = e.target.value;
                                        return { ...prev, highlights: newHighlights };
                                      });
                                    }}
                                    className={inputBase} 
                                    placeholder={`Highlight ${i + 1}`} 
                                  />
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => removeFromArray('highlights', i)}
                                  className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                                >
                                  <Minus className="w-5 h-5" />
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button" 
                              onClick={() => setFormData(prev => ({ ...prev, highlights: [...prev.highlights, ''] }))}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200"
                            >
                              <Plus className="w-4 h-4" /> Add Highlight
                            </button>
                          </div>
                        </div>

                        {/* Features */}
                        <div className="space-y-4">
                          <FormLabel icon={Check}>Features</FormLabel>
                          <div className="space-y-3">
                            {formData.features.map((feature, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <div className="flex-1">
                                  <textarea 
                                    value={feature}
                                    onChange={(e) => {
                                      setFormData(prev => {
                                        const newFeatures = [...(prev.features || [])];
                                        newFeatures[i] = e.target.value;
                                        return { ...prev, features: newFeatures };
                                      });
                                    }}
                                    className={`${textareaBase} resize-none`}
                                    rows={2}
                                    placeholder={`Feature ${i + 1}`} 
                                  />
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => removeFromArray('features', i)}
                                  className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                                >
                                  <Minus className="w-5 h-5" />
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button" 
                              onClick={() => setFormData(prev => ({ ...prev, features: [...prev.features, ''] }))}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200"
                            >
                              <Plus className="w-4 h-4" /> Add Feature
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Grid Settings Tab */}
                    {activeTab === 'grid' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <FormLabel icon={Grid3x3} required>Grid Title</FormLabel>
                            <input 
                              name="gridTitle" 
                              value={formData.gridTitle} 
                              onChange={handleChange} 
                              className={inputBase} 
                              placeholder="e.g., Top Amsterdam Attractions" 
                              required 
                            />
                          </div>
                          <div className="space-y-3">
                            <FormLabel icon={Grid3x3}>Items Per Row</FormLabel>
                            <select 
                              name="itemsPerRow" 
                              value={formData.itemsPerRow} 
                              onChange={handleChange} 
                              className={`${inputBase} appearance-none cursor-pointer`}
                            >
                              {[2, 3, 4, 5, 6, 7, 8].map(num => (
                                <option key={num} value={num}>{num}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <FormLabel icon={FileText}>Grid Subtitle</FormLabel>
                          <textarea 
                            name="gridSubtitle" 
                            value={formData.gridSubtitle} 
                            onChange={handleChange} 
                            rows={2} 
                            className={`${textareaBase} resize-none`} 
                            placeholder="Optional subtitle for the grid section" 
                          />
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                          <input
                            type="checkbox"
                            id="showStats"
                            name="showStats"
                            checked={formData.showStats}
                            onChange={handleChange}
                            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div>
                            <label htmlFor="showStats" className="text-sm font-semibold text-slate-700">Show Statistics</label>
                            <p className="text-xs text-slate-500">Display stats like number of items, ratings, etc.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SEO Tab */}
                    {activeTab === 'seo' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <FormLabel icon={Tag}>Meta Title</FormLabel>
                            <input 
                              name="metaTitle" 
                              value={formData.metaTitle} 
                              onChange={handleChange} 
                              maxLength={60} 
                              className={inputBase} 
                              placeholder="SEO title for search engines" 
                            />
                            <div className="text-xs text-gray-500">
                              {formData.metaTitle.length}/60 characters
                            </div>
                          </div>

                          <div className="space-y-3">
                            <FormLabel icon={Tag}>Keywords</FormLabel>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                placeholder="Add a keyword"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const value = (e.target as HTMLInputElement).value;
                                    if (value.trim()) {
                                      addToArray('keywords', value);
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.querySelector('input[placeholder="Add a keyword"]') as HTMLInputElement;
                                  if (input?.value.trim()) {
                                    addToArray('keywords', input.value);
                                    input.value = '';
                                  }
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {formData.keywords.map((keyword, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                                >
                                  {keyword}
                                  <button
                                    type="button"
                                    onClick={() => removeFromArray('keywords', index)}
                                    className="text-purple-600 hover:text-purple-800"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <FormLabel icon={FileText}>Meta Description</FormLabel>
                          <textarea 
                            name="metaDescription" 
                            value={formData.metaDescription} 
                            onChange={handleChange} 
                            rows={3} 
                            maxLength={160} 
                            className={textareaBase} 
                            placeholder="Brief description for search results" 
                          />
                          <div className="text-xs text-gray-500">
                            {formData.metaDescription.length}/160 characters
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                <Eye className="h-5 w-5 text-green-500" />
                                <div>
                                  <label htmlFor="isPublished" className="text-sm font-semibold text-slate-700">Published</label>
                                  <p className="text-xs text-slate-500">Make this page visible to visitors</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl">
                              <input
                                type="checkbox"
                                id="featured"
                                name="featured"
                                checked={formData.featured}
                                onChange={handleChange}
                                className="w-5 h-5 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500"
                              />
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-yellow-500" />
                                <div>
                                  <label htmlFor="featured" className="text-sm font-semibold text-slate-700">Featured</label>
                                  <p className="text-xs text-slate-500">Show in featured sections</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Form Validation */}
                        <div className="space-y-3">
                          <h5 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <HelpCircle className="h-4 w-4 text-indigo-500" />
                            Form Validation
                          </h5>
                          <div className="space-y-2">
                            {[
                              { field: 'title', label: 'Title', value: formData.title },
                              { field: 'description', label: 'Description', value: formData.description },
                              { field: 'heroImage', label: 'Hero Image', value: formData.heroImage },
                              { field: 'gridTitle', label: 'Grid Title', value: formData.gridTitle },
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
                  </div>

                  {/* Form Footer */}
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
                        disabled={
                          saving || isUploading || 
                          !formData.title?.trim() || 
                          !formData.description?.trim() || 
                          !formData.heroImage || 
                          !formData.gridTitle?.trim()
                        } 
                        className="flex-1 inline-flex justify-center items-center gap-3 px-6 py-3 text-white font-bold bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-5 w-5" />
                            <span>{pageId ? 'Update Page' : 'Create Page'}</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Validation Message */}
                    {(!formData.title?.trim() || !formData.description?.trim() || !formData.heroImage || !formData.gridTitle?.trim()) && (
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
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <div className="fixed bottom-4 end-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg shadow-lg z-50">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}