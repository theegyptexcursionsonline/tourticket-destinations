// app/admin/categories/CategoryManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  PlusCircle, Edit, Trash2, Loader2, X, Tag, Image as ImageIcon,
  Save, Upload, Sparkles
} from 'lucide-react';
import { ICategory } from '@/lib/models/Category';
import Image from 'next/image';

// Helper function to generate a URL-safe slug
const generateSlug = (name: string) => 
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

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
  isPublished: boolean;
  featured: boolean;
  order: number;
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
  isPublished: true,
  featured: false,
  order: 0,
};

export default function CategoryManager({ initialCategories }: { initialCategories: ICategory[] }) {
    const router = useRouter();
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<ICategory | null>(null);
    const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
    const [categories, setCategories] = useState(initialCategories);
    const [currentTab, setCurrentTab] = useState<'basic' | 'content' | 'seo'>('basic');

    useEffect(() => {
        setCategories(initialCategories);
    }, [initialCategories]);

    const openPanelForCreate = () => {
        setEditingCategory(null);
        setFormData(defaultFormData);
        setCurrentTab('basic');
        setIsPanelOpen(true);
    };

    const openPanelForEdit = (cat: ICategory) => {
        setEditingCategory(cat);
        setFormData({
            name: cat.name || '',
            slug: cat.slug || '',
            description: cat.description || '',
            longDescription: cat.longDescription || '',
            heroImage: cat.heroImage || '',
            images: cat.images || [],
            highlights: cat.highlights || [],
            features: cat.features || [],
            metaTitle: cat.metaTitle || '',
            metaDescription: cat.metaDescription || '',
            keywords: cat.keywords || [],
            color: cat.color || '#3B82F6',
            icon: cat.icon || '',
            isPublished: cat.isPublished !== false,
            featured: cat.featured || false,
            order: cat.order || 0,
        });
        setCurrentTab('basic');
        setIsPanelOpen(true);
    };

    const closePanel = () => {
        setIsPanelOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
            if (name === 'name' && !editingCategory) {
                setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
            }
        }
    };

    const handleArrayInputChange = (field: keyof CategoryFormData, value: string) => {
        const items = value.split('\n').filter(item => item.trim());
        setFormData(prev => ({ ...prev, [field]: items }));
    };

    const handleImageAdd = (type: 'heroImage' | 'images') => {
        const url = prompt(`Enter ${type === 'heroImage' ? 'hero' : 'gallery'} image URL:`);
        if (url && url.trim()) {
            if (type === 'heroImage') {
                setFormData(prev => ({ ...prev, heroImage: url.trim() }));
            } else {
                setFormData(prev => ({ 
                    ...prev, 
                    images: [...prev.images, url.trim()] 
                }));
            }
        }
    };

    const handleImageRemove = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Client-side validation
        if (!formData.name.trim() || !formData.slug.trim()) {
            toast.error('Category name and slug are required.');
            setIsSubmitting(false);
            return;
        }

        const apiEndpoint = editingCategory
            ? `/api/categories/${editingCategory._id}`
            : '/api/categories';
        
        const method = editingCategory ? 'PUT' : 'POST';

        try {
            const res = await fetch(apiEndpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'An unknown server error occurred.' }));
                throw new Error(errorData.error || 'Failed to save category.');
            }

            const message = editingCategory ? 'Category updated successfully!' : 'Category added successfully!';
            toast.success(message);
            closePanel();
            router.refresh();
            
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (catId: string, catName: string) => {
        if (!confirm(`Are you sure you want to delete "${catName}"? This action cannot be undone.`)) {
            return;
        }

        setIsDeleting(catId);
        const toastId = toast.loading(`Deleting "${catName}"...`);

        try {
            const res = await fetch(`/api/categories/${catId}`, { method: 'DELETE' });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'An unknown server error occurred.' }));
                throw new Error(errorData.error || 'Failed to delete category.');
            }
            
            toast.success(`"${catName}" deleted.`, { id: toastId });
            router.refresh();
        } catch (err) {
            toast.error((err as Error).message, { id: toastId });
        } finally {
            setIsDeleting(null);
        }
    };

    const inputStyles = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all duration-200 font-medium text-slate-700 disabled:bg-slate-50";
    const textareaStyles = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all duration-200 font-medium text-slate-700 resize-none min-h-[100px]";

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                        Manage Categories
                    </h1>
                    <p className="text-slate-500 mt-1">Add, edit, or delete tour categories with rich content.</p>
                </div>
                <button 
                    onClick={openPanelForCreate} 
                    className="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                    <PlusCircle className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
                    Add Category
                </button>
            </div>

            <div className="bg-white shadow-md rounded-2xl overflow-hidden border border-slate-200/60">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Slug
                                </th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Tours
                                </th>
                                <th className="px-6 py-3 text-end text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {categories.length > 0 ? (
                                categories.map(cat => (
                                    <motion.tr 
                                        key={cat._id as any} 
                                        className="hover:bg-slate-50 transition-colors duration-150"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {cat.heroImage ? (
                                                    <div className="relative h-12 w-12 rounded-lg overflow-hidden me-3">
                                                        <Image
                                                            src={cat.heroImage}
                                                            alt={cat.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center me-3">
                                                        <Tag className="h-6 w-6 text-slate-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-lg text-slate-800">{cat.name}</p>
                                                    {cat.description && (
                                                        <p className="text-sm text-slate-500 line-clamp-1 max-w-md">{cat.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-sm text-slate-500 font-mono">/{cat.slug}</p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex gap-2">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    cat.isPublished !== false
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {cat.isPublished !== false ? 'Published' : 'Draft'}
                                                </span>
                                                {cat.featured && (
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                                        Featured
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-slate-600 font-medium">
                                                {cat.tourCount || 0} tours
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-end">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => openPanelForEdit(cat)} 
                                                    className="p-2 text-slate-500 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                                                    aria-label={`Edit ${cat.name}`}
                                                >
                                                    <Edit size={20} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(cat._id as any, cat.name)} 
                                                    disabled={isDeleting === cat._id}
                                                    className="p-2 text-slate-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    aria-label={`Delete ${cat.name}`}
                                                >
                                                    {isDeleting === cat._id ? (
                                                        <Loader2 size={20} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={20} />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No categories found. Click 'Add Category' to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sliding Panel */}
            <AnimatePresence>
                {isPanelOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                            onClick={closePanel}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="fixed top-0 end-0 h-full w-full max-w-3xl bg-white z-50 shadow-2xl flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
                                        {editingCategory ? <Edit className="h-5 w-5 text-white" /> : <PlusCircle className="h-5 w-5 text-white" />}
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800">
                                        {editingCategory ? 'Edit Category' : 'Add New Category'}
                                    </h2>
                                </div>
                                <button 
                                    onClick={closePanel} 
                                    className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-slate-200 bg-slate-50 px-6">
                                {[
                                    { id: 'basic', label: 'Basic Info', icon: Tag },
                                    { id: 'content', label: 'Content', icon: ImageIcon },
                                    { id: 'seo', label: 'SEO', icon: Sparkles },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setCurrentTab(tab.id as any)}
                                        className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                                            currentTab === tab.id
                                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <tab.icon size={16} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Form */}
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Basic Info Tab */}
                                {currentTab === 'basic' && (
                                    <div className="space-y-6">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Category Name *
                                            </label>
                                            <input 
                                                type="text" 
                                                name="name" 
                                                id="name" 
                                                value={formData.name} 
                                                onChange={handleInputChange} 
                                                required 
                                                className={inputStyles} 
                                                placeholder="e.g., Adventure Tours"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="slug" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                URL Slug *
                                            </label>
                                            <input 
                                                type="text" 
                                                name="slug" 
                                                id="slug" 
                                                value={formData.slug} 
                                                onChange={handleInputChange} 
                                                required 
                                                className={`${inputStyles} bg-slate-50`} 
                                                placeholder="adventure-tours"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Short Description
                                            </label>
                                            <textarea 
                                                name="description" 
                                                id="description" 
                                                value={formData.description} 
                                                onChange={handleInputChange} 
                                                className={textareaStyles}
                                                placeholder="Brief description for category cards..."
                                                rows={3}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="longDescription" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Long Description
                                            </label>
                                            <textarea 
                                                name="longDescription" 
                                                id="longDescription" 
                                                value={formData.longDescription} 
                                                onChange={handleInputChange} 
                                                className={textareaStyles}
                                                placeholder="Detailed description for category page..."
                                                rows={5}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="color" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                    Color
                                                </label>
                                                <input 
                                                    type="color" 
                                                    name="color" 
                                                    id="color" 
                                                    value={formData.color} 
                                                    onChange={handleInputChange} 
                                                    className="h-12 w-full rounded-xl border border-slate-300 cursor-pointer"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="order" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                    Display Order
                                                </label>
                                                <input 
                                                    type="number" 
                                                    name="order" 
                                                    id="order" 
                                                    value={formData.order} 
                                                    onChange={handleInputChange} 
                                                    className={inputStyles}
                                                    min="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    name="isPublished" 
                                                    checked={formData.isPublished} 
                                                    onChange={handleInputChange} 
                                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm font-medium text-slate-700">Published</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    name="featured" 
                                                    checked={formData.featured} 
                                                    onChange={handleInputChange} 
                                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm font-medium text-slate-700">Featured</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Content Tab */}
                                {currentTab === 'content' && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Hero Image
                                            </label>
                                            {formData.heroImage ? (
                                                <div className="relative w-full h-48 rounded-xl overflow-hidden mb-2">
                                                    <Image
                                                        src={formData.heroImage}
                                                        alt="Hero"
                                                        fill
                                                        className="object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, heroImage: '' }))}
                                                        className="absolute top-2 end-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleImageAdd('heroImage')}
                                                    className="w-full h-48 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 transition-colors flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-indigo-600"
                                                >
                                                    <Upload size={32} />
                                                    <span className="text-sm font-medium">Click to add hero image</span>
                                                </button>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Gallery Images
                                            </label>
                                            <div className="grid grid-cols-3 gap-4 mb-2">
                                                {formData.images.map((img, index) => (
                                                    <div key={index} className="relative aspect-video rounded-lg overflow-hidden">
                                                        <Image
                                                            src={img}
                                                            alt={`Gallery ${index + 1}`}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleImageRemove(index)}
                                                            className="absolute top-1 end-1 p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleImageAdd('images')}
                                                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 transition-colors text-sm font-medium text-slate-500 hover:text-indigo-600"
                                            >
                                                + Add Gallery Image
                                            </button>
                                        </div>

                                        <div>
                                            <label htmlFor="highlights" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Highlights (one per line)
                                            </label>
                                            <textarea 
                                                name="highlights" 
                                                id="highlights" 
                                                value={formData.highlights.join('\n')} 
                                                onChange={(e) => handleArrayInputChange('highlights', e.target.value)} 
                                                className={textareaStyles}
                                                placeholder="Professional guides&#10;Small group sizes&#10;Flexible cancellation"
                                                rows={5}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="features" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Features (one per line)
                                            </label>
                                            <textarea 
                                                name="features" 
                                                id="features" 
                                                value={formData.features.join('\n')} 
                                                onChange={(e) => handleArrayInputChange('features', e.target.value)} 
                                                className={textareaStyles}
                                                placeholder="Expert local guides&#10;Premium equipment included&#10;Comprehensive insurance"
                                                rows={5}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* SEO Tab */}
                                {currentTab === 'seo' && (
                                    <div className="space-y-6">
                                        <div>
                                            <label htmlFor="metaTitle" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Meta Title
                                            </label>
                                            <input 
                                                type="text" 
                                                name="metaTitle" 
                                                id="metaTitle" 
                                                value={formData.metaTitle} 
                                                onChange={handleInputChange} 
                                                className={inputStyles}
                                                placeholder="SEO-optimized title (max 60 characters)"
                                                maxLength={60}
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                {formData.metaTitle.length}/60 characters
                                            </p>
                                        </div>

                                        <div>
                                            <label htmlFor="metaDescription" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Meta Description
                                            </label>
                                            <textarea 
                                                name="metaDescription" 
                                                id="metaDescription" 
                                                value={formData.metaDescription} 
                                                onChange={handleInputChange} 
                                                className={textareaStyles}
                                                placeholder="SEO-optimized description (max 160 characters)"
                                                maxLength={160}
                                                rows={3}
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                {formData.metaDescription.length}/160 characters
                                            </p>
                                        </div>

                                        <div>
                                            <label htmlFor="keywords" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Keywords (one per line)
                                            </label>
                                            <textarea 
                                                name="keywords" 
                                                id="keywords" 
                                                value={formData.keywords.join('\n')} 
                                                onChange={(e) => handleArrayInputChange('keywords', e.target.value)} 
                                                className={textareaStyles}
                                                placeholder="adventure tours&#10;outdoor activities&#10;Egypt tours"
                                                rows={5}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="mt-8 p-6 border-t border-slate-200 -mx-6 -mb-6 bg-slate-50">
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting} 
                                        className="w-full inline-flex justify-center items-center gap-3 px-6 py-3 text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-5 w-5" />
                                                <span>Save Category</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}