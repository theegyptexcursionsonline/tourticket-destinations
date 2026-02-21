'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  FileText,
  Calendar,
  User,
  Eye,
  Star,
  Clock,
  Tag,
  Plus,
  Minus,
  Save,
  Send,
  AlertCircle,
  Search,
  Heart,
  BarChart3
} from 'lucide-react';
import { IBlog } from '@/lib/models/Blog';
import { useAdminTenant } from '@/contexts/AdminTenantContext';

interface FormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string; // HTML from editor
  featuredImage: string;
  images: string[];
  category: string;
  tags: string[];
  author: string;
  authorAvatar: string;
  authorBio: string;
  metaTitle: string;
  metaDescription: string;
  readTime: number;
  status: 'draft' | 'published' | 'scheduled';
  scheduledFor: string;
  featured: boolean;
  allowComments: boolean;
  relatedDestinations: string[];
  relatedTours: string[];
}

const categories = [
  { value: 'travel-tips', label: 'Travel Tips' },
  { value: 'destination-guides', label: 'Destination Guides' },
  { value: 'food-culture', label: 'Food & Culture' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'budget-travel', label: 'Budget Travel' },
  { value: 'luxury-travel', label: 'Luxury Travel' },
  { value: 'solo-travel', label: 'Solo Travel' },
  { value: 'family-travel', label: 'Family Travel' },
  { value: 'photography', label: 'Photography' },
  { value: 'local-insights', label: 'Local Insights' },
  { value: 'seasonal-travel', label: 'Seasonal Travel' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'news-updates', label: 'News & Updates' },
];

const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

/* -------------------- RichTextEditor (small, dependency-free) -------------------- */
/**
 * Props:
 * - value (HTML)
 * - onChange(html)
 * - onUpload(file) => Promise<string> returns uploaded URL (we'll forward to your /api/upload)
 */
function RichTextEditor({
  value,
  onChange,
  onUpload,
  placeholder = 'Write your blog content here...'
}: {
  value: string;
  onChange: (html: string) => void;
  onUpload: (file: File) => Promise<string>;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
     
  }, [value]);

  // Generic exec for most formatting
  const exec = (command: string, valueParam?: string) => {
    document.execCommand(command, false, valueParam);
    emitChange();
    editorRef.current?.focus();
  };

  const formatBlock = (tag: 'H1' | 'H2' | 'P' | 'BLOCKQUOTE' | 'PRE') => {
    document.execCommand('formatBlock', false, tag);
    emitChange();
    editorRef.current?.focus();
  };

  const insertHTML = (html: string) => {
    // insertHTML execCommand falls back well
    document.execCommand('insertHTML', false, html);
    emitChange();
    editorRef.current?.focus();
  };

  const emitChange = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // allow paste but strip scripts - simple approach: paste as text then reformat
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const safeText = text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r\n|\r|\n/g, '<br/>');
    insertHTML(safeText);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await onUpload(file);
      // Insert responsive image with figure wrapper
      const html = `<figure class="editor-image"><img src="${url}" alt="Image" /><figcaption contenteditable="true">Caption (optional)</figcaption></figure><p><br/></p>`;
      insertHTML(html);
      toast.success('Image inserted');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      toast.error('Image upload failed');
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Enter URL (https://...)');
    if (!url) return;
    exec('createLink', url);
  };

  const handleClearFormat = () => {
    exec('removeFormat');
    // additional cleanup for lists/headings: wrap selection in <p>
    emitChange();
  };

  return (
    <div className="space-y-3">
      {/* toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" onClick={() => formatBlock('H1')} className="px-2 py-1 rounded-md border text-sm">H1</button>
        <button type="button" onClick={() => formatBlock('H2')} className="px-2 py-1 rounded-md border text-sm">H2</button>
        <button type="button" onClick={() => exec('bold')} className="px-2 py-1 rounded-md border text-sm">B</button>
        <button type="button" onClick={() => exec('italic')} className="px-2 py-1 rounded-md border text-sm">I</button>
        <button type="button" onClick={() => exec('underline')} className="px-2 py-1 rounded-md border text-sm">U</button>
        <button type="button" onClick={() => exec('insertUnorderedList')} className="px-2 py-1 rounded-md border text-sm">• List</button>
        <button type="button" onClick={() => exec('insertOrderedList')} className="px-2 py-1 rounded-md border text-sm">1. List</button>
        <button type="button" onClick={() => formatBlock('BLOCKQUOTE')} className="px-2 py-1 rounded-md border text-sm">Quote</button>
        <button type="button" onClick={() => formatBlock('PRE')} className="px-2 py-1 rounded-md border text-sm">Code</button>
        <button type="button" onClick={handleInsertLink} className="px-2 py-1 rounded-md border text-sm">Link</button>
        <label className="cursor-pointer px-2 py-1 rounded-md border text-sm flex items-center gap-2">
          Insert Image
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        </label>
        <button type="button" onClick={handleClearFormat} className="px-2 py-1 rounded-md border text-sm">Clear</button>
      </div>

      {/* editable area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={handlePaste}
        suppressContentEditableWarning
        className="min-h-[300px] p-4 border border-slate-300 rounded-xl bg-white prose prose-slate max-w-none focus:outline-none"
        data-placeholder={placeholder}
        style={{ whiteSpace: 'pre-wrap' }}
        // initial content set via useEffect
      />
      {/* small helper */}
      <div className="text-xs text-slate-500">Tip: Use the toolbar to add headings, lists, images and links. Content is saved as HTML.</div>
    </div>
  );
}

/* -------------------- Main BlogManager (full file) -------------------- */
export default function BlogManager({ initialBlogs }: { initialBlogs: IBlog[] }) {
  const router = useRouter();
  const { selectedTenantId } = useAdminTenant();
  const [blogs, setBlogs] = useState<IBlog[]>(initialBlogs);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingBlog, setEditingBlog] = useState<IBlog | null>(null);
  const [activeTab, setActiveTab] = useState('content');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Re-fetch blogs when selected brand changes
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedTenantId && selectedTenantId !== 'all') {
          params.set('tenantId', selectedTenantId);
        }
        const response = await fetch(`/api/admin/blog?${params.toString()}`);
        const data = await response.json();
        if (data.success) {
          setBlogs(data.data);
        }
      } catch (error) {
        console.error('Error fetching blogs:', error);
      }
    };
    fetchBlogs();
  }, [selectedTenantId]);
  const [filterStatus, setFilterStatus] = useState('');

  const [formData, setFormData] = useState<FormData>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featuredImage: '',
    images: [],
    category: 'travel-tips',
    tags: [],
    author: '',
    authorAvatar: '',
    authorBio: '',
    metaTitle: '',
    metaDescription: '',
    readTime: 5,
    status: 'draft',
    scheduledFor: '',
    featured: false,
    allowComments: true,
    relatedDestinations: [],
    relatedTours: []
  });

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      featuredImage: '',
      images: [],
      category: 'travel-tips',
      tags: [],
      author: '',
      authorAvatar: '',
      authorBio: '',
      metaTitle: '',
      metaDescription: '',
      readTime: 5,
      status: 'draft',
      scheduledFor: '',
      featured: false,
      allowComments: true,
      relatedDestinations: [],
      relatedTours: []
    });
  };

  const openPanelForCreate = () => {
    setEditingBlog(null);
    resetForm();
    setActiveTab('content');
    setIsPanelOpen(true);
  };

  const openPanelForEdit = (blog: IBlog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title || '',
      slug: blog.slug || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      featuredImage: blog.featuredImage || '',
      images: blog.images || [],
      category: blog.category || 'travel-tips',
      tags: blog.tags || [],
      author: blog.author || '',
      authorAvatar: blog.authorAvatar || '',
      authorBio: blog.authorBio || '',
      metaTitle: blog.metaTitle || '',
      metaDescription: blog.metaDescription || '',
      readTime: blog.readTime || 5,
      status: blog.status || 'draft',
      scheduledFor: blog.scheduledFor ? new Date(blog.scheduledFor).toISOString().slice(0, 16) : '',
      featured: blog.featured || false,
      allowComments: blog.allowComments ?? true,
      relatedDestinations: blog.relatedDestinations?.map((d:any) => d.toString()) || [],
      relatedTours: blog.relatedTours?.map((t:any) => t.toString()) || []
    });
    setActiveTab('content');
    setIsPanelOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    if (name === 'title') {
      setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
    }

    // Auto-calculate read time when content changes via textarea/normal input (editor handles separately)
    if (name === 'content') {
      const wordCount = value.split(/\s+/).filter(word => word.length > 0).length;
      const readTime = Math.max(1, Math.ceil(wordCount / 200));
      setFormData(prev => ({ ...prev, readTime }));
    }
  };

  // handle content HTML change from rich editor
  const handleEditorChange = (html: string) => {
    setFormData(prev => ({ ...prev, content: html }));
    // crude read-time: strip tags then count
    const textOnly = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = textOnly ? textOnly.split(' ').length : 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));
    setFormData(prev => ({ ...prev, readTime }));
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

  // keep for non-editor uploads (featured image + additional images)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'featuredImage' | 'images') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const promise = fetch('/api/upload', { method: 'POST', body: uploadFormData })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (field === 'featuredImage') {
            setFormData(prev => ({ ...prev, featuredImage: data.url }));
          } else {
            setFormData(prev => ({ ...prev, images: [...prev.images, data.url] }));
          }
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

  // a small helper used by RichTextEditor to upload and return url
  const uploadImageAndReturnUrl = async (file: File) => {
    setIsUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: uploadFormData });
      const data = await res.json();
      if (!data.success) throw new Error('Upload failed');
      return data.url as string;
    } finally {
      setIsUploading(false);
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.title.trim()) errors.push('Title is required');
    if (!formData.excerpt.trim()) errors.push('Excerpt is required');
    if (!formData.content.trim()) errors.push('Content is required');
    if (!formData.featuredImage.trim()) errors.push('Featured image is required');
    if (!formData.author.trim()) errors.push('Author is required');

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent, action: 'save' | 'publish' = 'save') => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(`Please fix the following errors:\n${errors.join('\n')}`);
      return;
    }

    setIsSubmitting(true);

    // Prepare data for submission
    const submitData = {
      ...formData,
      status: action === 'publish' ? 'published' : formData.status,
      tags: formData.tags.filter(t => t.trim()),
      images: formData.images.filter(img => img.trim()),
      relatedDestinations: formData.relatedDestinations.filter(d => d.trim()),
      relatedTours: formData.relatedTours.filter(t => t.trim()),
      scheduledFor: formData.scheduledFor ? new Date(formData.scheduledFor) : undefined
    };

    const apiEndpoint = editingBlog
      ? `/api/admin/blog/${editingBlog._id}`
      : '/api/admin/blog';

    const method = editingBlog ? 'PUT' : 'POST';

    const promise = fetch(apiEndpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitData)
    })
      .then(async res => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to save.');
        }
        return res.json();
      });

    toast.promise(promise, {
      loading: action === 'publish' ? 'Publishing blog post...' : 'Saving blog post...',
      success: () => {
        setIsPanelOpen(false);
        router.refresh();
        return action === 'publish' ? 'Blog post published successfully!' : 'Blog post saved successfully!';
      },
      error: (err) => (err as any).message || 'Failed to save blog post.',
    }).finally(() => {
      setIsSubmitting(false)
    });
  };

  const handleDelete = (blogId: string, blogTitle: string) => {
    const promise = fetch(`/api/admin/blog/${blogId}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete.');
        return res.json();
      });

    toast.promise(promise, {
      loading: `Deleting ${blogTitle}...`,
      success: () => {
        router.refresh();
        return `${blogTitle} deleted successfully.`;
      },
      error: `Failed to delete ${blogTitle}.`
    });
  };

  // Filter blogs
  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || blog.category === filterCategory;
    const matchesStatus = !filterStatus || blog.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const inputStyles = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700";
  const textareaStyles = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700 resize-vertical min-h-[100px]";

  const tabs = [
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'settings', label: 'Settings', icon: Eye },
    { id: 'seo', label: 'SEO', icon: BarChart3 }
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Blog Manager
              </h1>
              <p className="text-slate-500 mt-1">
                Create and manage your travel blog content
              </p>
            </div>
          </div>

          <button
            onClick={openPanelForCreate}
            className="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <PlusCircle className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            Create Post
          </button>
        </div>

        {/* Stats & Filters */}
        <div className="mt-6 pt-6 border-t border-slate-200/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FileText className="h-4 w-4 text-indigo-500" />
              <span className="font-medium">{filteredBlogs.length}</span>
              <span>blog post{filteredBlogs.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="ps-10 pe-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBlogs.map((blog, index) => (
          <motion.div
            key={blog._id as any}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white border border-slate-200/60"
          >
            {/* Image Container */}
            <div className="relative h-48 overflow-hidden">
              <img
                src={blog.featuredImage}
                alt={blog.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

              {/* Action Buttons */}
              <div className="absolute top-3 end-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <button
                  onClick={() => openPanelForEdit(blog)}
                  className="flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl text-slate-700 hover:bg-white hover:text-indigo-600 shadow-lg transition-all duration-200 transform hover:scale-110"
                  title="Edit blog post"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(blog._id as any, blog.title)}
                  className="flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl text-slate-700 hover:bg-white hover:text-red-600 shadow-lg transition-all duration-200 transform hover:scale-110"
                  title="Delete blog post"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Status Badges */}
              <div className="absolute top-3 start-3 flex flex-col gap-2">
                {blog.featured && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/90 backdrop-blur-sm rounded-full text-white text-xs font-semibold shadow-lg">
                    <Star className="w-3 h-3 fill-current" />
                    Featured
                  </div>
                )}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-sm rounded-full text-white text-xs font-semibold shadow-lg ${
                  blog.status === 'published' ? 'bg-green-500/90' :
                  blog.status === 'scheduled' ? 'bg-blue-500/90' : 'bg-gray-500/90'
                }`}>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  {blog.status.charAt(0).toUpperCase() + blog.status.slice(1)}
                </div>
              </div>

              {/* Category Badge */}
              <div className="absolute bottom-3 start-3">
                <div className="px-3 py-1.5 bg-indigo-500/90 backdrop-blur-sm rounded-full text-white text-xs font-semibold">
                  {categories.find(c => c.value === blog.category)?.label || blog.category}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors duration-200 line-clamp-2">
                  {blog.title}
                </h3>

                <p className="text-slate-600 text-sm line-clamp-2">
                  {blog.excerpt}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span>{blog.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{blog.readTime} min read</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{blog.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span>{blog.likes}</span>
                    </div>
                  </div>
                  {blog.publishedAt && (
                    <span>{new Date(blog.publishedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Hover Effect Border */}
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-indigo-200 transition-all duration-300 pointer-events-none"></div>
          </motion.div>
        ))}

        {/* Empty State */}
        {filteredBlogs.length === 0 && (
          <div className="col-span-full">
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-3">No blog posts yet</h3>
              <p className="text-slate-500 max-w-md mx-auto mb-6">
                Start creating engaging content for your travel blog.
              </p>
              <button
                onClick={openPanelForCreate}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <PlusCircle className="h-5 w-5" />
                Create First Post
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
            className="fixed top-0 end-0 h-full w-full max-w-5xl bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
                  {editingBlog ? <Edit className="h-5 w-5 text-white" /> : <PlusCircle className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingBlog ? 'Edit Blog Post' : 'Create New Blog Post'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {editingBlog ? 'Update your blog post' : 'Write and publish your travel story'}
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
            <form onSubmit={(e) => handleSubmit(e, 'save')} className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-8">

                {/* Content Tab */}
                {activeTab === 'content' && (
                  <div className="space-y-6">
                    {/* Title and Slug */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="title" className="text-sm font-bold text-slate-700">Title</label>
                          <span className="text-red-500 text-sm">*</span>
                        </div>
                        <input
                          type="text"
                          name="title"
                          id="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          placeholder="Enter an engaging blog title"
                          required
                          className={inputStyles}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="slug" className="text-sm font-bold text-slate-700">URL Slug</label>
                          <span className="text-red-500 text-sm">*</span>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            name="slug"
                            id="slug"
                            value={formData.slug}
                            onChange={handleInputChange}
                            placeholder="auto-generated-from-title"
                            required
                            className={`${inputStyles} pe-20`}
                          />
                          <div className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200">
                            /{formData.slug || 'slug'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Excerpt */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        <label htmlFor="excerpt" className="text-sm font-bold text-slate-700">Excerpt</label>
                        <span className="text-red-500 text-sm">*</span>
                      </div>
                      <textarea
                        name="excerpt"
                        id="excerpt"
                        value={formData.excerpt}
                        onChange={handleInputChange}
                        placeholder="Brief summary for blog cards and previews (max 300 characters)"
                        required
                        maxLength={300}
                        className={textareaStyles}
                        rows={3}
                      />
                      <div className="text-xs text-slate-500 text-end">
                        {formData.excerpt.length}/300 characters
                      </div>
                    </div>

                    {/* Rich Content Editor */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        <label className="text-sm font-bold text-slate-700">Content</label>
                        <span className="text-red-500 text-sm">*</span>
                      </div>

                      <RichTextEditor
                        value={formData.content}
                        onChange={handleEditorChange}
                        onUpload={uploadImageAndReturnUrl}
                        placeholder="Write your blog content here — use toolbar to add headings, bullets, images..."
                      />

                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{(formData.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean)).length} words</span>
                        <span>Estimated read time: {formData.readTime} minutes</span>
                      </div>
                    </div>

                    {/* Category and Tags */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="category" className="text-sm font-bold text-slate-700">Category</label>
                          <span className="text-red-500 text-sm">*</span>
                        </div>
                        <select
                          name="category"
                          id="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          required
                          className={inputStyles}
                        >
                          {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="readTime" className="text-sm font-bold text-slate-700">Read Time (minutes)</label>
                        </div>
                        <input
                          type="number"
                          name="readTime"
                          id="readTime"
                          min="1"
                          max="60"
                          value={formData.readTime}
                          onChange={handleInputChange}
                          className={inputStyles}
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-indigo-500" />
                          <label className="text-sm font-bold text-slate-700">Tags</label>
                        </div>
                        <button
                          type="button"
                          onClick={() => addArrayItem('tags')}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add Tag
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {formData.tags.map((tag, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={tag}
                              onChange={(e) => handleArrayChange('tags', index, e.target.value)}
                              placeholder="Enter a tag"
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
                          <p className="text-sm text-slate-500 italic col-span-2">No tags added yet. Click "Add Tag" to create the first one.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Media Tab */}
                {activeTab === 'media' && (
                  <div className="space-y-8">
                    {/* Featured Image */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-indigo-500" />
                        <label className="text-sm font-bold text-slate-700">Featured Image</label>
                        <span className="text-red-500 text-sm">*</span>
                      </div>

                      <div className="relative">
                        {formData.featuredImage ? (
                          <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-200">
                            <img
                              src={formData.featuredImage}
                              alt="Featured image preview"
                              className="w-full h-64 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, featuredImage: '' }))}
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
                                    htmlFor="featured-image-upload"
                                    className="relative cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                                  >
                                    <span>Upload Featured Image</span>
                                    <input
                                      id="featured-image-upload"
                                      name="featured-image-upload"
                                      type="file"
                                      className="sr-only"
                                      onChange={(e) => handleImageUpload(e, 'featuredImage')}
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

                    {/* Additional Images */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-indigo-500" />
                          <label className="text-sm font-bold text-slate-700">Additional Images</label>
                        </div>
                        <label
                          htmlFor="additional-images-upload"
                          className="cursor-pointer flex items-center gap-1 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add Image
                          <input
                            id="additional-images-upload"
                            name="additional-images-upload"
                            type="file"
                            className="sr-only"
                            onChange={(e) => handleImageUpload(e, 'images')}
                            accept="image/*"
                            disabled={isUploading}
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {formData.images.map((image, index) => (
                          <div key={index} className="group relative overflow-hidden rounded-xl border-2 border-slate-200">
                            <img
                              src={image}
                              alt={`Additional image ${index + 1}`}
                              className="w-full h-32 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => removeArrayItem('images', index)}
                                className="flex items-center justify-center w-8 h-8 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {formData.images.length === 0 && (
                          <p className="text-sm text-slate-500 italic col-span-full text-center py-8">No additional images added yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="space-y-8">
                    {/* Author Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                        Author Information
                      </h3>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-indigo-500" />
                            <label htmlFor="author" className="text-sm font-bold text-slate-700">Author Name</label>
                            <span className="text-red-500 text-sm">*</span>
                          </div>
                          <input
                            type="text"
                            name="author"
                            id="author"
                            value={formData.author}
                            onChange={handleInputChange}
                            placeholder="Enter author name"
                            required
                            className={inputStyles}
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-indigo-500" />
                            <label htmlFor="authorAvatar" className="text-sm font-bold text-slate-700">Author Avatar URL</label>
                          </div>
                          <input
                            type="url"
                            name="authorAvatar"
                            id="authorAvatar"
                            value={formData.authorAvatar}
                            onChange={handleInputChange}
                            placeholder="https://example.com/avatar.jpg"
                            className={inputStyles}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-indigo-500" />
                          <label htmlFor="authorBio" className="text-sm font-bold text-slate-700">Author Bio</label>
                        </div>
                        <textarea
                          name="authorBio"
                          id="authorBio"
                          value={formData.authorBio}
                          onChange={handleInputChange}
                          placeholder="Brief author biography (max 500 characters)"
                          maxLength={500}
                          className={textareaStyles}
                          rows={3}
                        />
                        <div className="text-xs text-slate-500 text-end">
                          {formData.authorBio.length}/500 characters
                        </div>
                      </div>
                    </div>

                    {/* Publishing Settings */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                        Publishing Settings
                      </h3>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-indigo-500" />
                            <label htmlFor="status" className="text-sm font-bold text-slate-700">Status</label>
                          </div>
                          <select
                            name="status"
                            id="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className={inputStyles}
                          >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="scheduled">Scheduled</option>
                          </select>
                        </div>

                        {formData.status === 'scheduled' && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-indigo-500" />
                              <label htmlFor="scheduledFor" className="text-sm font-bold text-slate-700">Schedule For</label>
                            </div>
                            <input
                              type="datetime-local"
                              name="scheduledFor"
                              id="scheduledFor"
                              value={formData.scheduledFor}
                              onChange={handleInputChange}
                              className={inputStyles}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            <label htmlFor="featured" className="text-sm font-medium text-slate-700">Featured Post</label>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="allowComments"
                            name="allowComments"
                            checked={formData.allowComments}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <label htmlFor="allowComments" className="text-sm font-medium text-slate-700">Allow Comments</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SEO Tab */}
                {activeTab === 'seo' && (
                  <div className="space-y-6">
                    {/* Meta Title */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-indigo-500" />
                        <label htmlFor="metaTitle" className="text-sm font-bold text-slate-700">Meta Title</label>
                      </div>
                      <input
                        type="text"
                        name="metaTitle"
                        id="metaTitle"
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
                        <BarChart3 className="h-4 w-4 text-indigo-500" />
                        <label htmlFor="metaDescription" className="text-sm font-bold text-slate-700">Meta Description</label>
                      </div>
                      <textarea
                        name="metaDescription"
                        id="metaDescription"
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

                    {/* SEO Preview */}
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
                      <h4 className="text-sm font-bold text-slate-700 mb-4">Search Engine Preview</h4>
                      <div className="space-y-2">
                        <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
                          {formData.metaTitle || formData.title || 'Your Blog Post Title'}
                        </div>
                        <div className="text-green-700 text-sm">
                          https://yoursite.com/blog/{formData.slug || 'your-post-slug'}
                        </div>
                        <div className="text-slate-600 text-sm">
                          {formData.metaDescription || formData.excerpt || 'Your meta description will appear here...'}
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
                  className="px-6 py-3 text-slate-700 font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSubmit(e as any, 'save')}
                  disabled={isSubmitting || isUploading}
                  className="inline-flex items-center gap-3 px-6 py-3 text-white font-bold bg-slate-600 rounded-xl hover:bg-slate-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Save Draft</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSubmit(e as any, 'publish')}
                  disabled={isSubmitting || isUploading || !formData.title || !formData.content || !formData.featuredImage || !formData.author}
                  className="flex-1 inline-flex justify-center items-center gap-3 px-6 py-3 text-white font-bold bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      <span>Publish Post</span>
                    </>
                  )}
                </button>
              </div>

              {/* Validation Message */}
              {(!formData.title || !formData.content || !formData.featuredImage || !formData.author) && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <p className="text-xs text-amber-700">
                    Please fill in all required fields: Title, Content, Featured Image, and Author.
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
