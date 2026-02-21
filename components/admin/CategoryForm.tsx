'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    Loader2, X, Plus, Check, Camera, Grid3x3, Info, Globe, 
    UploadCloud, Trash2, Eye, Tag, FileText, Sparkles, ArrowLeft, 
    Minus, HelpCircle, Palette
} from 'lucide-react';
import Image from 'next/image';

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  heroImage: string;
  images: string[];
  highlights: string[];
  features: string[];
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  color: string;
  icon: string;
  order: number;
  isPublished: boolean;
  featured: boolean;
}

interface CategoryFormProps {
  categoryId?: string;
}

const defaultFormData: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  longDescription: '',
  heroImage: '',
  images: [],
  highlights: [],
  features: [],
  metaTitle: '',
  metaDescription: '',
  keywords: [],
  color: '#3B82F6',
  icon: '',
  order: 0,
  isPublished: true,
  featured: false,
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

export default function CategoryForm({ categoryId }: CategoryFormProps) {
  const router = useRouter();
  const [isPanelOpen] = useState(true);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (categoryId) {
      fetchCategoryData();
    }
  }, [categoryId]);

  const fetchCategoryData = async () => {
    if (!categoryId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/categories/${categoryId}`);
      const data = await response.json();
      
      if (data.success) {
        const category = data.data;
        
        setFormData({
          name: category.name || '',
          slug: category.slug || '',
          description: category.description || '',
          longDescription: category.longDescription || '',
          heroImage: category.heroImage || '',
          images: Array.isArray(category.images) ? category.images : [],
          highlights: Array.isArray(category.highlights) ? category.highlights : [],
          features: Array.isArray(category.features) ? category.features : [],
          metaTitle: category.metaTitle || '',
          metaDescription: category.metaDescription || '',
          keywords: Array.isArray(category.keywords) ? category.keywords : [],
          color: category.color || '#3B82F6',
          icon: category.icon || '',
          order: category.order || 0,
          isPublished: category.isPublished !== false,
          featured: category.featured || false,
        });
        setIsSlugManuallyEdited(Boolean(category.slug));
      } else {
        setError(data.error || 'Failed to fetch category data');
        toast.error(data.error || 'Failed to load category');
      }
    } catch (_err) {
      setError('Network error');
      toast.error('Failed to load category');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
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
      setFormData(prev => ({ ...prev, [name]: target.checked }));
      return;
    }
    
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'name' && !isSlugManuallyEdited) {
      const newSlug = generateSlug(value);
      setFormData(prev => ({ ...prev, slug: newSlug }));
    }
    
    if (name === 'slug') {
      setIsSlugManuallyEdited(true);
    }
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
            setFormData(prev => ({ ...prev, heroImage: data.url }));
          } else {
            setFormData(prev => ({
              ...prev,
              images: [...(prev.images || []), data.url]
            }));
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
      const url = categoryId 
        ? `/api/categories/${categoryId}`
        : '/api/categories';
      
      const method = categoryId ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        highlights: Array.isArray(formData.highlights) ? formData.highlights.filter(item => item && item.trim() !== '') : [],
        features: Array.isArray(formData.features) ? formData.features.filter(item => item && item.trim() !== '') : [],
        images: Array.isArray(formData.images) ? formData.images.filter(item => item && item.trim() !== '') : [],
        keywords: Array.isArray(formData.keywords) ? formData.keywords.filter(item => item && item.trim() !== '') : [],
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Category ${categoryId ? 'updated' : 'created'} successfully!`);
        router.push('/admin/categories');
        router.refresh();
      } else {
        setError(data.error || 'Failed to save category');
        toast.error(data.error || 'Failed to save category');
      }
    } catch (err) {
      const errorMessage = 'Network error occurred while saving the category';
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
    { id: 'seo', label: 'SEO', icon: Globe },
    { id: 'settings', label: 'Settings', icon: Eye }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Loading category data</h3>
              <p className="text-slate-500 text-sm">Please wait while we fetch your category details...</p>
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
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => router.push('/admin/categories')}
              className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 group"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-indigo-600" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                  {categoryId ? 'Edit Category' : 'Create Category'}
                </h1>
                <div className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 rounded-full text-xs font-semibold text-indigo-700">
                  {categoryId ? 'EDITING' : 'CREATING'}
                </div>
              </div>
              <p className="text-slate-500 mt-2">
                {categoryId ? `Editing: ${formData.name || 'Category'}` : 'Fill out the form to create your category'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Panel */}
          <AnimatePresence>
            {isPanelOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
              >
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
                            <FormLabel icon={Tag} required>Category Name</FormLabel>
                            <input 
                              name="name" 
                              value={formData.name} 
                              onChange={handleChange} 
                              className={`${inputBase} text-lg font-medium`} 
                              placeholder="e.g., Adventure Tours" 
                              required 
                            />
                            <SmallHint>This will be the main name of your category</SmallHint>
                          </div>
                          <div className="space-y-3">
                            <FormLabel icon={Tag} required>URL Slug</FormLabel>
                            <input 
                              name="slug" 
                              value={formData.slug} 
                              onChange={handleChange} 
                              className={inputBase} 
                              placeholder="adventure-tours" 
                              required 
                            />
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                              <span className="text-xs font-medium text-slate-500">Preview:</span>
                              <span className="text-xs font-mono text-slate-700 bg-white px-2 py-1 rounded border">
                                /category/{formData.slug || 'your-slug'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <FormLabel icon={FileText}>Short Description</FormLabel>
                          <textarea 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            rows={3} 
                            className={`${textareaBase} resize-none`} 
                            placeholder="Brief description for category cards and listings" 
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
                            placeholder="Detailed description for the category page" 
                          />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <FormLabel icon={Palette}>Color</FormLabel>
                            <div className="flex items-center gap-3">
                              <input 
                                type="color" 
                                name="color" 
                                value={formData.color} 
                                onChange={handleChange} 
                                className="h-12 w-20 rounded-xl border border-slate-300 cursor-pointer"
                              />
                              <input 
                                type="text" 
                                value={formData.color} 
                                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                className={inputBase}
                                placeholder="#3B82F6"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <FormLabel icon={Grid3x3}>Display Order</FormLabel>
                            <input 
                              type="number" 
                              name="order" 
                              value={formData.order} 
                              onChange={handleChange} 
                              className={inputBase}
                              min="0"
                              placeholder="0"
                            />
                            <SmallHint>Lower numbers appear first</SmallHint>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Media Tab */}
                    {activeTab === 'media' && (
                      <div className="space-y-8">
                        {/* Hero Image */}
                        <div className="space-y-4">
                          <FormLabel icon={Camera}>Hero Image</FormLabel>
                          
                          {formData.heroImage ? (
                            <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-200">
                              <div className="relative w-full h-64">
                                <Image 
                                  src={formData.heroImage} 
                                  alt="Hero preview" 
                                  fill
                                  className="object-cover" 
                                />
                              </div>
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
                                  <div className="relative w-full h-32">
                                    <Image 
                                      src={img} 
                                      alt={`Gallery ${i}`} 
                                      fill
                                      className="object-cover rounded-xl border-2 border-slate-200 shadow-sm group-hover:shadow-md transition-all" 
                                    />
                                  </div>
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

                    {/* SEO Tab */}
                    {activeTab === 'seo' && (
                      <div className="space-y-6">
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

                        <div className="space-y-3">
                          <FormLabel icon={Tag}>Keywords</FormLabel>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              id="keyword-input"
                              placeholder="Add a keyword"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const value = (e.target as HTMLInputElement).value;
                                  if (value.trim()) {
                                    setFormData(prev => ({
                                      ...prev,
                                      keywords: [...prev.keywords, value.trim()]
                                    }));
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('keyword-input') as HTMLInputElement;
                                if (input?.value.trim()) {
                                  setFormData(prev => ({
                                    ...prev,
                                    keywords: [...prev.keywords, input.value.trim()]
                                  }));
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
                                  <p className="text-xs text-slate-500">Make this category visible to visitors</p>
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
                              { field: 'name', label: 'Category Name', value: formData.name },
                              { field: 'slug', label: 'URL Slug', value: formData.slug },
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
                        onClick={() => router.push('/admin/categories')}
                        className="flex-1 px-6 py-3 text-slate-700 font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={
                          saving || isUploading || 
                          !formData.name?.trim() || 
                          !formData.slug?.trim()
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
                            <span>{categoryId ? 'Update Category' : 'Create Category'}</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Validation Message */}
                    {(!formData.name?.trim() || !formData.slug?.trim()) && (
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