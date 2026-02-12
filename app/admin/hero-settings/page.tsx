// app/admin/hero-settings/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Image as ImageIcon, Upload, Trash2, Check, 
  Eye, EyeOff, Plus, Save, X, Monitor, Smartphone,
  Palette, Type, Users, RefreshCw,
  Hash, Search, Play, Pause, Globe, Timer, Sparkles
} from 'lucide-react';
import Image from 'next/image';
import withAuth from '@/components/admin/withAuth';
import { useAdminTenant } from '@/contexts/AdminTenantContext';

interface HeroSettings {
  _id?: string;
  backgroundImages: {
    desktop: string;
    mobile?: string;
    alt: string;
    isActive: boolean;
  }[];
  currentActiveImage: string;
  title: {
    main: string;
    highlight: string;
  };
  searchSuggestions: string[];
  floatingTags: {
    isEnabled: boolean;
    tags: string[];
    animationSpeed: number;
    tagCount: {
      desktop: number;
      mobile: number;
    };
  };
  trustIndicators: {
    travelers: string;
    rating: string;
    ratingText: string;
    isVisible: boolean;
  };
  overlaySettings: {
    opacity: number;
    gradientType: 'dark' | 'light' | 'custom';
    customGradient?: string;
  };
  animationSettings: {
    slideshowSpeed: number;
    fadeSpeed: number;
    enableAutoplay: boolean;
  };
  metaTitle?: string;
  metaDescription?: string;
  isActive: boolean;
}

const HeroSettingsPage = () => {
  const [settings, setSettings] = useState<HeroSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'images' | 'content' | 'tags' | 'styling'>('images');
  const [editingSettings, setEditingSettings] = useState<HeroSettings | null>(null);
  const [newImage, setNewImage] = useState({
    desktop: '',
    mobile: '',
    alt: '',
    isActive: false
  });
  const [newTag, setNewTag] = useState('');
  const [newSuggestion, setNewSuggestion] = useState('');
  const { selectedTenantId } = useAdminTenant();

  const tenantQuery = selectedTenantId && selectedTenantId !== 'all' ? `?tenantId=${encodeURIComponent(selectedTenantId)}` : '';

  useEffect(() => {
    fetchHeroSettings();
  }, [selectedTenantId]);

const fetchHeroSettings = async () => {
  try {
    setIsLoading(true);
    const response = await fetch(`/api/admin/hero-settings${tenantQuery}`);
    const result = await response.json();
    
    if (result.success) {
      setSettings(result.data);
      setEditingSettings({ ...result.data });
    } else {
      throw new Error(result.error || 'Failed to fetch hero settings');
    }
  } catch (error) {
    console.error('Error fetching hero settings:', error);
    toast.error('Failed to load hero settings');
  } finally {
    setIsLoading(false);
  }
};

const handleAddBackgroundImage = async () => {
  if (!newImage.desktop || !newImage.alt) {
    toast.error('Please provide desktop image and alt text');
    return;
  }

  try {
    const response = await fetch(`/api/admin/hero-settings/images${tenantQuery}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageData: newImage }),
    });

    const result = await response.json();
    
    if (result.success) {
      setSettings(result.data);
      setEditingSettings({ ...result.data });
      setNewImage({ desktop: '', mobile: '', alt: '', isActive: false });
      toast.success('Background image added successfully!');
    } else {
      throw new Error(result.error || 'Failed to add image');
    }
  } catch (error) {
    console.error('Error adding background image:', error);
    toast.error('Failed to add background image');
  }
};

const handleDeleteImage = async (imageIndex: number) => {
  if (!confirm('Are you sure you want to delete this background image?')) return;

  try {
    const response = await fetch(`/api/admin/hero-settings/images/${imageIndex}${tenantQuery}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    
    if (result.success) {
      setSettings(result.data);
      setEditingSettings({ ...result.data });
      toast.success('Background image deleted successfully!');
    } else {
      throw new Error(result.error || 'Failed to delete image');
    }
  } catch (error) {
    console.error('Error deleting background image:', error);
    toast.error('Failed to delete background image');
  }
};

const handleSetActiveImage = async (imageIndex: number) => {
  try {
    const response = await fetch(`/api/admin/hero-settings/images/${imageIndex}/activate${tenantQuery}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json'
      },
    });

    const result = await response.json();
    
    if (result.success) {
      setSettings(result.data);
      setEditingSettings({ ...result.data });
      toast.success('Active image updated successfully!');
    } else {
      throw new Error(result.error || 'Failed to set active image');
    }
  } catch (error) {
    console.error('Error setting active image:', error);
    toast.error('Failed to set active image');
  }
};

const handleSaveSettings = async () => {
  if (!editingSettings) return;

  try {
    setIsSaving(true);
    const response = await fetch(`/api/admin/hero-settings${tenantQuery}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editingSettings),
    });

    const result = await response.json();
    
    if (result.success) {
      setSettings(result.data);
      setEditingSettings({ ...result.data });
      toast.success('Hero settings saved successfully!');
    } else {
      throw new Error(result.error || 'Failed to save settings');
    }
  } catch (error) {
    console.error('Error saving hero settings:', error);
    toast.error('Failed to save hero settings');
  } finally {
    setIsSaving(false);
  }
};

const handleImageUpload = async (file: File, type: 'desktop' | 'mobile') => {
  if (!file) return '';

  setIsUploading(true);
  const uploadFormData = new FormData();
  uploadFormData.append('file', file);

  try {
    const response = await fetch('/api/uploadhero', {
      method: 'POST',
      body: uploadFormData,
    });

    const data = await response.json();

    if (data.success && data.url) {
      toast.success(`${type} image uploaded successfully!`);
      return data.url;
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    toast.error('Upload failed. Please try again.');
    return '';
  } finally {
    setIsUploading(false);
  }
};

  const handleResetSettings = () => {
    if (settings) {
      setEditingSettings({ ...settings });
      toast.success('Settings reset to last saved version');
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim() || !editingSettings) return;
    
    const trimmedTag = newTag.trim().toUpperCase();
    if (editingSettings.floatingTags.tags.includes(trimmedTag)) {
      toast.error('Tag already exists');
      return;
    }

    setEditingSettings({
      ...editingSettings,
      floatingTags: {
        ...editingSettings.floatingTags,
        tags: [...editingSettings.floatingTags.tags, trimmedTag]
      }
    });
    setNewTag('');
    toast.success('Tag added');
  };

  const handleRemoveTag = (tagIndex: number) => {
    if (!editingSettings) return;
    
    const newTags = editingSettings.floatingTags.tags.filter((_, index) => index !== tagIndex);
    setEditingSettings({
      ...editingSettings,
      floatingTags: {
        ...editingSettings.floatingTags,
        tags: newTags
      }
    });
    toast.success('Tag removed');
  };

  const handleAddSuggestion = () => {
    if (!newSuggestion.trim() || !editingSettings) return;
    
    const trimmedSuggestion = newSuggestion.trim();
    if (editingSettings.searchSuggestions.includes(trimmedSuggestion)) {
      toast.error('Suggestion already exists');
      return;
    }

    setEditingSettings({
      ...editingSettings,
      searchSuggestions: [...editingSettings.searchSuggestions, trimmedSuggestion]
    });
    setNewSuggestion('');
    toast.success('Search suggestion added');
  };

  const handleRemoveSuggestion = (suggestionIndex: number) => {
    if (!editingSettings) return;
    
    const newSuggestions = editingSettings.searchSuggestions.filter((_, index) => index !== suggestionIndex);
    setEditingSettings({
      ...editingSettings,
      searchSuggestions: newSuggestions
    });
    toast.success('Search suggestion removed');
  };

  const tabs = [
    { id: 'images', label: 'Background Images', icon: ImageIcon },
    { id: 'content', label: 'Content & Text', icon: Type },
    { id: 'tags', label: 'Floating Tags', icon: Hash },
    { id: 'styling', label: 'Styling & Animation', icon: Palette }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Hero Section Settings
          </h1>
          <p className="text-slate-600 text-lg mt-2">
            Customize your homepage hero section appearance and content
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={handleResetSettings}
            className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        
        {/* Background Images Tab */}
        {activeTab === 'images' && (
          <div className="p-8 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Background Images</h2>
              <p className="text-slate-600">Manage hero section background images. Images are stored locally for faster loading.</p>
            </div>

            {/* Current Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {editingSettings?.backgroundImages.map((image, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`relative group rounded-2xl overflow-hidden border-4 transition-all duration-200 ${
                    image.isActive 
                      ? 'border-green-500 shadow-lg shadow-green-500/25' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="aspect-video relative bg-slate-100">
                    <Image
                      src={image.desktop}
                      alt={image.alt}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== '/image.png') {
                          target.src = '/image.png';
                        }
                      }}
                    />
                    
                    {/* Active Badge */}
                    {image.isActive && (
                      <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        Active
                      </div>
                    )}

                    {/* Actions Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="flex items-center gap-3">
                        {!image.isActive && (
                          <button
                            onClick={() => handleSetActiveImage(index)}
                            className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                          >
                            <Check className="h-4 w-4" />
                            Set Active
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteImage(index)}
                          disabled={editingSettings.backgroundImages.length === 1}
                          className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Image Details */}
                  <div className="p-4 bg-white">
                    <p className="text-sm text-slate-600 line-clamp-2">{image.alt}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        Desktop
                      </div>
                      {image.mobile && (
                        <div className="flex items-center gap-1">
                          <Smartphone className="h-3 w-3" />
                          Mobile
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Add New Image */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-4">
                    <Plus className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Add New Background Image</h3>
                  <p className="text-slate-600">Upload images to your local server for faster loading</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Desktop Image */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700">
                      Desktop Image (Required) *
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                      <Monitor className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <label 
                        htmlFor="desktop-upload" 
                        className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        {isUploading ? 'Uploading...' : 'Click to upload desktop image'}
                        <input 
                          id="desktop-upload" 
                          type="file" 
                          className="sr-only" 
                          accept="image/*"
                          disabled={isUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await handleImageUpload(file, 'desktop');
                              if (url) {
                                setNewImage(prev => ({ ...prev, desktop: url }));
                              }
                            }
                          }} 
                        />
                      </label>
                      <p className="text-xs text-slate-500 mt-1">Recommended: 1920x1080px, Max: 5MB</p>
                      {newImage.desktop && (
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs text-green-700 truncate">{newImage.desktop}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile Image */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700">
                      Mobile Image (Optional)
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                      <Smartphone className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <label 
                        htmlFor="mobile-upload" 
                        className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        {isUploading ? 'Uploading...' : 'Click to upload mobile image'}
                        <input 
                          id="mobile-upload" 
                          type="file" 
                          className="sr-only" 
                          accept="image/*"
                          disabled={isUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await handleImageUpload(file, 'mobile');
                              if (url) {
                                setNewImage(prev => ({ ...prev, mobile: url }));
                              }
                            }
                          }} 
                        />
                      </label>
                      <p className="text-xs text-slate-500 mt-1">Recommended: 768x1024px, Max: 5MB</p>
                      {newImage.mobile && (
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs text-green-700 truncate">{newImage.mobile}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alt Text and Actions */}
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Alt Text (Required) *
                    </label>
                    <input
                      type="text"
                      value={newImage.alt}
                      onChange={(e) => setNewImage(prev => ({ ...prev, alt: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Describe the image for accessibility"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="set-active"
                      checked={newImage.isActive}
                      onChange={(e) => setNewImage(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="set-active" className="text-sm text-slate-700">
                      Set as active image immediately
                    </label>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={handleAddBackgroundImage}
                      disabled={!newImage.desktop || !newImage.alt || isUploading}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5" />
                          Add Background Image
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content & Text Tab */}
        {activeTab === 'content' && editingSettings && (
          <div className="p-8 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Content & Text</h2>
              <p className="text-slate-600">Customize the text content, search suggestions, and trust indicators in your hero section.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Hero Title */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Hero Title
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Main Title
                    </label>
                    <input
                      type="text"
                      value={editingSettings.title.main}
                      onChange={(e) => setEditingSettings({
                        ...editingSettings,
                        title: { ...editingSettings.title, main: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., Explore Egypt's Pyramids & Nile"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Highlight Word (Colored)
                    </label>
                    <input
                      type="text"
                      value={editingSettings.title.highlight}
                      onChange={(e) => setEditingSettings({
                        ...editingSettings,
                        title: { ...editingSettings.title, highlight: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., Incredible"
                    />
                  </div>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Trust Indicators
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="trust-visible"
                      checked={editingSettings.trustIndicators.isVisible}
                      onChange={(e) => setEditingSettings({
                        ...editingSettings,
                        trustIndicators: { ...editingSettings.trustIndicators, isVisible: e.target.checked }
                      })}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="trust-visible" className="text-sm font-medium text-slate-700">
                      Show trust indicators
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Travelers Text
                    </label>
                    <input
                      type="text"
                      value={editingSettings.trustIndicators.travelers}
                      onChange={(e) => setEditingSettings({
                        ...editingSettings,
                        trustIndicators: { ...editingSettings.trustIndicators, travelers: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., 2M+ travelers"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Rating Text
                    </label>
                    <input
                      type="text"
                      value={editingSettings.trustIndicators.rating}
                      onChange={(e) => setEditingSettings({
                        ...editingSettings,
                        trustIndicators: { ...editingSettings.trustIndicators, rating: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., 4.9/5 rating"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Stars Display
                    </label>
                    <input
                      type="text"
                      value={editingSettings.trustIndicators.ratingText}
                      onChange={(e) => setEditingSettings({
                        ...editingSettings,
                        trustIndicators: { ...editingSettings.trustIndicators, ratingText: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., ★★★★★"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Search Suggestions */}
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-6">
                <Search className="h-5 w-5" />
                Search Suggestions
              </h3>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  These suggestions will rotate in the search bar to encourage user interaction.
                </p>
                
                {/* Current Suggestions */}
                <div className="space-y-2">
                  {editingSettings.searchSuggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Search className="h-4 w-4 text-slate-400" />
                      <span className="flex-1 text-slate-700">{suggestion}</span>
                      <button
                        onClick={() => handleRemoveSuggestion(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Add New Suggestion */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newSuggestion}
                    onChange={(e) => setNewSuggestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSuggestion()}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Add new search suggestion..."
                  />
                  <button
                    onClick={handleAddSuggestion}
                    disabled={!newSuggestion.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* SEO Settings */}
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-6">
                <Globe className="h-5 w-5" />
                SEO Settings
              </h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={editingSettings.metaTitle || ''}
                    onChange={(e) => setEditingSettings({
                      ...editingSettings,
                      metaTitle: e.target.value
                    })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="SEO title for the homepage (max 60 characters)"
                    maxLength={60}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {(editingSettings.metaTitle || '').length}/60 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={editingSettings.metaDescription || ''}
                    onChange={(e) => setEditingSettings({
                      ...editingSettings,
                      metaDescription: e.target.value
                    })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    placeholder="SEO description for the homepage (max 160 characters)"
                    maxLength={160}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {(editingSettings.metaDescription || '').length}/160 characters
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Tags Tab */}
        {activeTab === 'tags' && editingSettings && (
          <div className="p-8 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Floating Tags</h2>
              <p className="text-slate-600">Manage the animated floating tags that appear over the hero background.</p>
            </div>

            {/* Tag Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Tag Controls */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="tags-enabled"
                    checked={editingSettings.floatingTags.isEnabled}
                    onChange={(e) => setEditingSettings({
                      ...editingSettings,
                      floatingTags: { ...editingSettings.floatingTags, isEnabled: e.target.checked }
                    })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="tags-enabled" className="text-lg font-semibold text-slate-900">
                    Enable Floating Tags
                  </label>
                </div>

                {editingSettings.floatingTags.isEnabled && (
                  <>
                    {/* Animation Speed */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Animation Speed: {editingSettings.floatingTags.animationSpeed} seconds
                      </label>
                      <input
                        type="range"
                        min="2"
                        max="20"
                        step="1"
                        value={editingSettings.floatingTags.animationSpeed}
                        onChange={(e) => setEditingSettings({
                          ...editingSettings,
                          floatingTags: { 
                            ...editingSettings.floatingTags, 
                            animationSpeed: parseInt(e.target.value)
                          }
                        })}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Fast (2s)</span>
                        <span>Slow (20s)</span>
                      </div>
                    </div>

                    {/* Tag Count */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Desktop Tags: {editingSettings.floatingTags.tagCount.desktop}
                        </label>
                        <input
                          type="range"
                          min="3"
                          max="15"
                          step="1"
                          value={editingSettings.floatingTags.tagCount.desktop}
                          onChange={(e) => setEditingSettings({
                            ...editingSettings,
                            floatingTags: { 
                              ...editingSettings.floatingTags, 
                              tagCount: {
                                ...editingSettings.floatingTags.tagCount,
                                desktop: parseInt(e.target.value)
                              }
                            }
                          })}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Mobile Tags: {editingSettings.floatingTags.tagCount.mobile}
                        </label>
                        <input
                          type="range"
                          min="2"
                          max="8"
                          step="1"
                          value={editingSettings.floatingTags.tagCount.mobile}
                          onChange={(e) => setEditingSettings({
                            ...editingSettings,
                            floatingTags: { 
                              ...editingSettings.floatingTags, 
                              tagCount: {
                                ...editingSettings.floatingTags.tagCount,
                                mobile: parseInt(e.target.value)
                              }
                            }
                          })}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Preview */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Tag Preview
                </h3>
                
                <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden border border-slate-200">
                  {editingSettings.floatingTags.isEnabled && (
                    <>
                      {editingSettings.floatingTags.tags.slice(0, 6).map((tag, index) => (
                        <div
                          key={index}
                          className={`absolute px-3 py-1 text-xs font-semibold rounded-full shadow-lg transition-all duration-300 ${
                            index === 0 ? "bg-red-500 text-white scale-110 -rotate-3" : "bg-white/90 text-slate-800"
                          }`}
                          style={{
                            top: `${15 + (index * 12)}%`,
                            left: `${10 + (index % 3 * 25)}%`,
                            animationDelay: `${index * 0.2}s`
                          }}
                        >
                          {tag}
                        </div>
                      ))}
                    </>
                  )}
                  
                  {!editingSettings.floatingTags.isEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                      <div className="text-center">
                        <EyeOff className="h-12 w-12 mx-auto mb-2" />
                        <p>Tags disabled</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tag Management */}
            {editingSettings.floatingTags.isEnabled && (
              <div className="border-t border-slate-200 pt-8">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-6">
                  <Hash className="h-5 w-5" />
                  Manage Tags ({editingSettings.floatingTags.tags.length} tags)
                </h3>
                
                {/* Add New Tag */}
                <div className="flex gap-3 mb-6">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Add new tag (will be converted to UPPERCASE)..."
                    maxLength={50}
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    Add Tag
                  </button>
                </div>
                
                {/* Current Tags */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {editingSettings.floatingTags.tags.map((tag, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors">
                      <Hash className="h-4 w-4 text-slate-400" />
                      <span className="flex-1 text-sm font-medium text-slate-700">{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(index)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                {editingSettings.floatingTags.tags.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Hash className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>No tags added yet. Add some tags to get started!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Styling & Animation Tab */}
        {activeTab === 'styling' && editingSettings && (
          <div className="p-8 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Styling & Animation</h2>
              <p className="text-slate-600">Customize the visual appearance, overlay settings, and animation speeds of your hero section.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Overlay Settings */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Overlay Settings
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Overlay Opacity: {Math.round(editingSettings.overlaySettings.opacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={editingSettings.overlaySettings.opacity}
                      onChange={(e) => setEditingSettings({
                        ...editingSettings,
                        overlaySettings: { 
                          ...editingSettings.overlaySettings, 
                          opacity: parseFloat(e.target.value) 
                        }
                      })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Gradient Type
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['dark', 'light', 'custom'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setEditingSettings({
                            ...editingSettings,
                            overlaySettings: { 
                              ...editingSettings.overlaySettings, 
                              gradientType: type as any 
                            }
                          })}
                          className={`p-3 rounded-lg border-2 transition-all capitalize ${
                            editingSettings.overlaySettings.gradientType === type
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {editingSettings.overlaySettings.gradientType === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Custom Gradient CSS
                      </label>
                      <textarea
                        value={editingSettings.overlaySettings.customGradient || ''}
                        onChange={(e) => setEditingSettings({
                          ...editingSettings,
                          overlaySettings: { 
                            ...editingSettings.overlaySettings, 
                            customGradient: e.target.value 
                          }
                        })}
                        rows={3}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        placeholder="e.g., linear-gradient(45deg, rgba(0,0,0,0.7), rgba(0,0,0,0.3))"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Animation Settings */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Animation Settings
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="autoplay-enabled"
                      checked={editingSettings.animationSettings.enableAutoplay}
                      onChange={(e) => setEditingSettings({
                        ...editingSettings,
                        animationSettings: { 
                          ...editingSettings.animationSettings, 
                          enableAutoplay: e.target.checked 
                        }
                      })}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="autoplay-enabled" className="text-sm font-medium text-slate-700">
                      Enable slideshow autoplay
                    </label>
                  </div>

                  {editingSettings.animationSettings.enableAutoplay && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Slideshow Speed: {editingSettings.animationSettings.slideshowSpeed} seconds
                        </label>
                        <input
                          type="range"
                          min="2"
                          max="30"
                          step="1"
                          value={editingSettings.animationSettings.slideshowSpeed}
                          onChange={(e) => setEditingSettings({
                            ...editingSettings,
                            animationSettings: { 
                              ...editingSettings.animationSettings, 
                              slideshowSpeed: parseInt(e.target.value) 
                            }
                          })}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>Fast (2s)</span>
                          <span>Slow (30s)</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Fade Speed: {editingSettings.animationSettings.fadeSpeed}ms
                        </label>
                        <input
                          type="range"
                          min="200"
                          max="3000"
                          step="100"
                          value={editingSettings.animationSettings.fadeSpeed}
                          onChange={(e) => setEditingSettings({
                            ...editingSettings,
                            animationSettings: { 
                              ...editingSettings.animationSettings, 
                              fadeSpeed: parseInt(e.target.value) 
                            }
                          })}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>Fast (200ms)</span>
                          <span>Slow (3000ms)</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-6">
                <Eye className="h-5 w-5" />
                Live Preview
              </h3>
              
              <div className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                {editingSettings.currentActiveImage && (
                  <Image
                    src={editingSettings.currentActiveImage}
                    alt="Hero preview"
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== '/image.png') {
                        target.src = '/image.png';
                      }
                    }}
                  />
                )}
                
                {/* Overlay Preview */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: editingSettings.overlaySettings.gradientType === 'custom' 
                      ? editingSettings.overlaySettings.customGradient
                      : editingSettings.overlaySettings.gradientType === 'dark'
                        ? `linear-gradient(to br, rgba(0,0,0,${editingSettings.overlaySettings.opacity}), rgba(0,0,0,${editingSettings.overlaySettings.opacity * 0.7}))`
                        : `linear-gradient(to br, rgba(255,255,255,${editingSettings.overlaySettings.opacity}), rgba(255,255,255,${editingSettings.overlaySettings.opacity * 0.7}))`
                  }}
                />
                
                {/* Content Preview */}
                <div className="absolute inset-0 flex items-center justify-center text-white p-6">
                  <div className="text-center">
                    <h1 className="text-2xl md:text-4xl font-bold mb-4">
                      {editingSettings.title.main}
                      {editingSettings.title.highlight && (
                        <>
                          {' '}
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                            {editingSettings.title.highlight}
                          </span>
                        </>
                      )}
                    </h1>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                      <div className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm border border-white/20">
                        <Search className="h-4 w-4 inline mr-2" />
                        {editingSettings.searchSuggestions[0] || "Search suggestions..."}
                      </div>
                    </div>
                    
                    {editingSettings.trustIndicators.isVisible && (
                      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-white/70">
                        <span>{editingSettings.trustIndicators.travelers}</span>
                        <span>{editingSettings.trustIndicators.ratingText}</span>
                        <span>{editingSettings.trustIndicators.rating}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Animation Indicator */}
                <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                  {editingSettings.animationSettings.enableAutoplay ? (
                    <>
                      <Play className="h-3 w-3" />
                      Auto {editingSettings.animationSettings.slideshowSpeed}s
                    </>
                  ) : (
                    <>
                      <Pause className="h-3 w-3" />
                      Static
                    </>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                    <Sparkles className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Live Preview</p>
                    <p className="text-xs text-blue-700 mt-1">
                      This preview shows how your hero section will look with current settings. Images are served from your local server for optimal performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default withAuth(HeroSettingsPage, { permissions: ['manageContent'] });