'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Grid,
  List,
  Filter,
  ArrowUpDown,
  Eye,
  Calendar,
  MapPin,
  Star,
  Euro,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  Edit3,
  Archive,
  ChevronDown,
} from 'lucide-react';
import Image from 'next/image';
import { TourActions } from './TourActions';
import Link from 'next/link';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import toast from 'react-hot-toast';
import { storefrontPreviewUrl } from '@/lib/admin/storefrontPreviewUrl';
import { matchesTourAdminSearch } from '@/lib/admin/tourOptionIdentifiers';
import { filterToursByOwnership, tourRelationship, type TourOwnership } from '@/lib/admin/tourOwnership';

type CategoryRef = { name?: string; title?: string } | null;

type TourType = {
  _id: string;
  title?: string;
  name?: string;
  slug?: string;
  image?: string;
  images?: string[];
  destination?: { name?: string } | null;
  category?: CategoryRef | CategoryRef[];
  price?: number;
  discountPrice?: number;
  duration?: string | number;
  createdAt?: string;
  updatedAt?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  tenantId?: string;
  tenantIds?: string[];
  optionIds?: string[];
  // UI-only field set by ToursPageClient when "All Brands" is selected.
  // Lists every tenantId that has a copy of this slug (German translations + originals).
  tenantCopies?: string[];
  archivedAt?: string | null;
  createdBy?: { id?: string; name?: string; email?: string } | null;
  updatedBy?: { id?: string; name?: string; email?: string } | null;
};

const editorLabel = (tour: TourType) =>
  tour.updatedBy?.name || tour.updatedBy?.email || tour.createdBy?.name || tour.createdBy?.email || '';

// Archived is derived, not stored as a status: adding an enum would have meant
// migrating every tour and rewriting each isPublished query.
const isArchived = (tour: TourType) => Boolean(tour.archivedAt);

export function getCategoryList(tour: TourType): string[] {
  const categories = Array.isArray(tour.category)
    ? tour.category
    : tour.category
      ? [tour.category]
      : [];
  return categories.map((category) => category?.name || category?.title).filter(Boolean) as string[];
}

function getCategoryNames(tour: TourType): string {
  return getCategoryList(tour).join(', ');
}

export function CategoryCell({ tour }: { tour: TourType }) {
  const names = getCategoryList(tour);
  if (names.length === 0) return <span className="text-sm font-medium text-slate-700">N/A</span>;
  if (names.length === 1) {
    return (
      <span className="inline-block max-w-full break-words rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-medium leading-5 text-slate-700">
        {names[0]}
      </span>
    );
  }

  return (
    <details className="group max-w-full" title={names.join(', ')}>
      <summary
        aria-label={`Show ${names.length} selected categories`}
        className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-semibold text-indigo-700 marker:content-none [&::-webkit-details-marker]:hidden"
      >
        <span>{names.length} categories</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-2 flex max-w-72 flex-wrap gap-1.5" aria-label="Selected categories">
        {names.map((name) => (
          <span key={name} className="max-w-full break-words rounded-md bg-slate-100 px-2 py-1 text-xs font-medium leading-4 text-slate-700">
            {name}
          </span>
        ))}
      </div>
    </details>
  );
}

function Badge({ children, className = '', icon: Icon }: { 
  children: React.ReactNode; 
  className?: string;
  icon?: any;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${className}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

type TabFilter = 'all' | 'published' | 'draft' | 'featured' | 'archived';

export function ToursListClient({
  tours,
  countExplanation,
}: {
  tours: TourType[];
  countExplanation?: string;
}) {
  const { selectedCurrency } = useSettings();
  const CurrencyIcon = selectedCurrency.code === 'USD' ? DollarSign : Euro;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenants, selectedTenantId } = useAdminTenant();

  // Empty trash is irreversible, so it previews first, confirms, then reports
  // exactly what was removed and what was kept because a booking still
  // references it. Tours are purged within the selected site; the all-sites
  // view is reserved for a super administrator by the API.
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  const trashScope = selectedTenantId && selectedTenantId !== 'all' ? `&tenantId=${encodeURIComponent(selectedTenantId)}` : '';
  const handleEmptyTrash = async () => {
    const preview = await fetch(`/api/admin/trash?kind=tour${trashScope}`)
      .then((res) => res.json())
      .catch(() => null);
    if (!preview?.success) {
      toast.error(preview?.error || 'Could not read the trash. Try again.');
      return;
    }
    const removable = preview.inspected - preview.blocked.length;
    if (removable <= 0) {
      toast.error(
        preview.blocked.length > 0
          ? `Nothing can be deleted yet — ${preview.blocked.length} tour${preview.blocked.length === 1 ? ' has' : 's have'} bookings on record.`
          : 'The trash is already empty.',
      );
      return;
    }
    const confirmed = window.confirm(
      `Permanently delete ${removable} tour${removable === 1 ? '' : 's'}? This cannot be undone.`
      + (preview.blocked.length > 0 ? `\n\n${preview.blocked.length} will be kept because they have bookings.` : ''),
    );
    if (!confirmed) return;

    setIsEmptyingTrash(true);
    const promise = fetch(`/api/admin/trash?kind=tour${trashScope}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to empty the trash.');
      return data;
    });
    toast.promise(promise, {
      loading: 'Deleting trashed tours...',
      success: (data: { deleted: string[]; blocked: Array<{ title: string; blockedReason?: string }> }) => {
        router.refresh();
        const kept = data.blocked.length > 0 ? ` ${data.blocked.length} kept (have bookings).` : '';
        return `Deleted ${data.deleted.length} tour${data.deleted.length === 1 ? '' : 's'}.${kept}`;
      },
      error: (error: Error) => error.message || 'Failed to empty the trash.',
    });
    promise.finally(() => setIsEmptyingTrash(false));
  };

  // Get initial tab and page from URL or defaults
  const initialTab = (searchParams.get('status') as TabFilter) || 'all';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [activeTab, setActiveTab] = useState<TabFilter>(initialTab);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [sortBy, setSortBy] = useState<'newest' | 'updated' | 'price-asc' | 'price-desc'>('newest');
  const [editorFilter, setEditorFilter] = useState<string>(searchParams.get('editor') || '');
  const [ownershipFilter, setOwnershipFilter] = useState<TourOwnership>('all');
  const [perPage, setPerPage] = useState(12);
  const [page, setPage] = useState(initialPage);

  // Update URL when tab or page changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Handle status parameter
    if (activeTab === 'all') {
      params.delete('status');
    } else {
      params.set('status', activeTab);
    }

    if (editorFilter) {
      params.set('editor', editorFilter);
    } else {
      params.delete('editor');
    }

    // Handle page parameter
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', page.toString());
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/admin/tours${newUrl}`, { scroll: false });
  }, [activeTab, page, editorFilter, router, searchParams]);

  const formatPrice = (p?: number) => {
    if (p === undefined || p === null) return '—';
    return `${selectedCurrency.symbol}${Number(p).toFixed(2)}`;
  };

  // Helper function to build edit URL with preserved state
  const getEditUrl = (tourId: string) => {
    const params = new URLSearchParams();
    if (activeTab !== 'all') params.set('status', activeTab);
    if (page !== 1) params.set('page', page.toString());
    const queryString = params.toString();
    return `/admin/tours/edit/${tourId}${queryString ? `?returnTo=${encodeURIComponent(`/admin/tours?${queryString}`)}` : ''}`;
  };

  const getPreviewUrl = (tour: TourType) => storefrontPreviewUrl(`/${tour.slug || ''}`, {
    tenantDomain: tenants.find((tenant) => tenant.tenantId === tour.tenantId)?.domain,
    configuredBaseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    adminOrigin: typeof window !== 'undefined' ? window.location.origin : null,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = filterToursByOwnership(
      [...tours],
      ownershipFilter,
      selectedTenantId,
      tenants.map((tenant) => tenant.tenantId)
    );

    // Archived is derived from archivedAt rather than stored as a status, so
    // every existing isPublished query stays correct and nothing needs migrating.
    // Archived tours are kept out of the other tabs — the point of archiving is
    // that they stop cluttering Drafts.
    if (activeTab === 'archived') {
      list = list.filter((t) => isArchived(t));
    } else {
      list = list.filter((t) => !isArchived(t));
      if (activeTab === 'published') {
        list = list.filter((t) => t.isPublished === true);
      } else if (activeTab === 'draft') {
        list = list.filter((t) => t.isPublished === false);
      } else if (activeTab === 'featured') {
        list = list.filter((t) => t.isFeatured === true);
      }
    }

    if (editorFilter) {
      list = list.filter((tour) => editorLabel(tour) === editorFilter);
    }

    // Apply search filter
    if (q) {
      list = list.filter((tour) => matchesTourAdminSearch(tour, q));
    }

    // Apply sorting
    if (sortBy === 'newest')
      list.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    // Last modified: editors asked to find what they touched most recently.
    if (sortBy === 'updated')
      list.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
    if (sortBy === 'price-asc')
      list.sort(
        (a, b) => (a.discountPrice || a.price || 0) - (b.discountPrice || b.price || 0)
      );
    if (sortBy === 'price-desc')
      list.sort(
        (a, b) => (b.discountPrice || b.price || 0) - (a.discountPrice || a.price || 0)
      );

    return list;
  }, [tours, query, sortBy, activeTab, editorFilter, ownershipFilter, selectedTenantId, tenants]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, sortBy, activeTab, editorFilter, ownershipFilter]);

  // Calculate counts for each tab
  const tabCounts = useMemo(() => {
    const live = tours.filter((t) => !isArchived(t));
    return {
      all: live.length,
      published: live.filter((t) => t.isPublished === true).length,
      draft: live.filter((t) => t.isPublished === false).length,
      featured: live.filter((t) => t.isFeatured === true).length,
      archived: tours.filter((t) => isArchived(t)).length,
    };
  }, [tours]);

  // Who has touched these tours — built from the loaded set so the list only
  // ever offers names that will actually match something.
  const editorOptions = useMemo(() => {
    const names = new Set<string>();
    for (const tour of tours) {
      const label = editorLabel(tour);
      if (label) names.add(label);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [tours]);

  const tabs = [
    { id: 'all' as TabFilter, label: 'All Tours', icon: FileText, count: tabCounts.all },
    { id: 'published' as TabFilter, label: 'Published', icon: CheckCircle, count: tabCounts.published },
    { id: 'draft' as TabFilter, label: 'Draft', icon: Edit3, count: tabCounts.draft },
    { id: 'featured' as TabFilter, label: 'Featured', icon: Star, count: tabCounts.featured },
    { id: 'archived' as TabFilter, label: 'Trash', icon: Archive, count: tabCounts.archived },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm" role="group" aria-label="Filter tours by ownership">
        {(['all', 'owned', 'assigned'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={ownershipFilter === option}
            onClick={() => setOwnershipFilter(option)}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
              ownershipFilter === option
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {option === 'all' ? 'All' : option === 'owned' ? 'Owned' : 'Assigned'}
          </button>
        ))}
      </div>
      {/* Tabs Section */}
      <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-6">
        {countExplanation && (
          <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-900">
            {countExplanation}
          </div>
        )}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        {activeTab === 'archived' && tabCounts.archived > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-sm text-rose-900">
            <span>
              Tours in the Trash stay off the storefront. Empty the trash to remove them permanently — tours with bookings are always kept.
            </span>
            <button
              type="button"
              onClick={handleEmptyTrash}
              disabled={isEmptyingTrash}
              data-testid="empty-trash"
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
            >
              <Archive className="h-4 w-4" />
              {isEmptyingTrash ? 'Emptying…' : 'Empty trash'}
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Header Controls */}
      <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Search and Filter Section */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1 max-w-2xl">
            {/* Enhanced Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tours, destinations, Tour ID or Option ID..."
                className="w-full ps-12 pe-4 py-3.5 bg-white border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-slate-700 font-medium"
              />
            </div>

            {/* Filter by the person who created or last edited a tour */}
            {editorOptions.length > 0 && (
              <div className="relative sm:w-56">
                <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-slate-400" />
                </div>
                <select
                  value={editorFilter}
                  onChange={(e) => setEditorFilter(e.target.value)}
                  className="w-full ps-11 pe-4 py-3.5 bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer text-slate-700 font-medium"
                >
                  <option value="">👤 Any editor</option>
                  {editorOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 end-0 flex items-center px-3 pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}

            {/* Enhanced Sort Dropdown */}
            <div className="relative sm:w-56">
              <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                <ArrowUpDown className="h-4 w-4 text-slate-400" />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full ps-11 pe-4 py-3.5 bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer text-slate-700 font-medium"
              >
                <option value="newest">📅 Newest First</option>
                <option value="updated">🕒 Last Modified</option>
                <option value="price-asc">💰 Price: Low to High</option>
                <option value="price-desc">💰 Price: High to Low</option>
              </select>
              <div className="absolute inset-y-0 end-0 flex items-center px-3 pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* View Toggle Buttons */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setView('cards')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                view === 'cards' 
                  ? 'bg-white text-indigo-600 shadow-sm border border-indigo-200/60' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                view === 'table' 
                  ? 'bg-white text-indigo-600 shadow-sm border border-indigo-200/60' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200/60">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Eye className="h-4 w-4" />
              <span className="font-medium">{total}</span>
              <span>tour{total !== 1 ? 's' : ''} found</span>
              {query && (
                <>
                  <span>for</span>
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-semibold">"{query}"</span>
                </>
              )}
            </div>
          </div>
          
          {/* Per Page Selector */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
            <span>Show</span>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="px-3 py-1 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={50}>50</option>
            </select>
            <span>per page</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'table' ? (
        // Enhanced Table View
        <div className="bg-gradient-to-br from-white to-slate-50/50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed">
              <colgroup>
                <col className="w-[40%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200/60">
                <tr>
                  <th className="px-6 py-4 text-start text-xs font-bold text-slate-600 uppercase tracking-wider">Tour</th>
                  <th className="px-6 py-4 text-start text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Destination
                    </div>
                  </th>
                  <th className="px-6 py-4 text-start text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      Category
                    </div>
                  </th>
                  <th className="px-6 py-4 text-start text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <CurrencyIcon className="h-3 w-3" />
                      Price
                    </div>
                  </th>
                  <th className="px-6 py-4 text-end text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((t, index) => (
                  <tr 
                    key={t._id} 
                    className={`group hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/30 transition-all duration-200 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {t.image && (
                          <div className="h-16 w-28 rounded-xl overflow-hidden bg-slate-100 shrink-0 shadow-sm group-hover:shadow-md transition-all duration-200">
                            <Image
                              src={t.image}
                              alt={t.title || t.name || 'tour'}
                              width={112}
                              height={64}
                              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-2">
                          <Link
                            href={getEditUrl(t._id)}
                            className="block whitespace-normal break-words text-sm font-semibold leading-5 text-slate-900 transition-colors hover:text-indigo-600 group-hover:text-indigo-600"
                            title={t.title || t.name}
                          >
                            {t.title || t.name}
                          </Link>
                          <Badge className={tourRelationship(t, selectedTenantId, tenants.map((tenant) => tenant.tenantId)) === 'owned'
                            ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                            : 'border border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200'}>
                            {tourRelationship(t, selectedTenantId, tenants.map((tenant) => tenant.tenantId)) === 'owned' ? 'Owned' : 'Assigned'}
                          </Badge>
                          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                            <Calendar className="h-3 w-3" />
                            <span>{t.duration}</span>
                            {t.isFeatured && (
                              <Badge
                                className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300"
                                icon={Star}
                              >
                                Featured
                              </Badge>
                            )}
                            {t.tenantCopies && t.tenantCopies.length > 1 && (
                              <Badge
                                className="bg-indigo-50 text-indigo-700 border border-indigo-200"
                                icon={Eye}
                              >
                                {t.tenantCopies.length} brands
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700">{t.destination?.name || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <CategoryCell tour={t} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900">{formatPrice(t.discountPrice ?? t.price)}</span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        {t.slug && (
                          <a
                            href={getPreviewUrl(t)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                            title="Open public tour"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                          </a>
                        )}
                        <Link
                          href={getEditUrl(t._id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span>Edit</span>
                        </Link>
                        <TourActions tourId={t._id} isArchived={isArchived(t)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paginated.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No tours found</h3>
              <p className="text-slate-500">
                {query ? 'Try adjusting your search criteria.' : 'Create your first tour to get started.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        // Enhanced Cards View
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginated.map((t) => (
            <div
              key={t._id}
              data-testid="tour-card"
              className="group bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* Card Image */}
              {t.image && (
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                  <Image 
                    src={t.image} 
                    alt={t.title || t.name || 'tour'} 
                    fill 
                    style={{ objectFit: 'cover' }} 
                    className="w-full h-full group-hover:scale-110 transition-transform duration-300" 
                  />
                  
                  {/* Badges Overlay */}
                  <div className="absolute top-3 start-3 flex flex-col gap-2">
                    {t.isFeatured && (
                      <Badge
                        className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg"
                        icon={Star}
                      >
                        Featured
                      </Badge>
                    )}
                    {t.tenantCopies && t.tenantCopies.length > 1 && (
                      <Badge
                        className="bg-white/95 backdrop-blur-sm text-indigo-700 border border-indigo-200 shadow-lg"
                        icon={Eye}
                      >
                        {t.tenantCopies.length} brands
                      </Badge>
                    )}
                  </div>

                  {/* Price Overlay */}
                  <div className="absolute bottom-3 end-3">
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-white/60">
                      <div className="text-lg font-bold text-slate-900">{formatPrice(t.discountPrice ?? t.price)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Content */}
              <div className="p-6 space-y-4">
                {/* Title and Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div
                      className="block text-lg font-bold text-slate-900 truncate mb-2"
                      title={t.title || t.name}
                    >
                      {t.title || t.name}
                    </div>
                    <Badge className={tourRelationship(t, selectedTenantId, tenants.map((tenant) => tenant.tenantId)) === 'owned'
                      ? 'mb-2 border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'mb-2 border border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200'}>
                      {tourRelationship(t, selectedTenantId, tenants.map((tenant) => tenant.tenantId)) === 'owned' ? 'Owned' : 'Assigned'}
                    </Badge>
                    
                    {/* Location and Category */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{t.destination?.name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{getCategoryNames(t) || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <TourActions tourId={t._id} isArchived={isArchived(t)} />
                  </div>
                </div>

                {t.slug && (
                  <a
                    href={getPreviewUrl(t)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View public tour</span>
                  </a>
                )}

                {/* Primary action */}
                <Link
                  href={getEditUrl(t._id)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit tour</span>
                </Link>

                {/* Duration and Date */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="h-4 w-4" />
                    <span>{t.duration}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>

                {/* Show price for tours without images */}
                {!t.image && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-lg font-bold text-slate-900">{formatPrice(t.discountPrice ?? t.price)}</div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Empty State for Cards */}
          {paginated.length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-3">No tours found</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                {query ? 'Try adjusting your search criteria or browse all tours.' : 'Create your first tour to get started.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Results Info */}
            <div className="text-sm text-slate-600 font-medium">
              Showing <span className="font-bold text-slate-900">{((page - 1) * perPage) + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(page * perPage, total)}</span> of{' '}
              <span className="font-bold text-slate-900">{total}</span> tours
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage((p) => Math.max(1, p - 1))} 
                disabled={page === 1} 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium text-slate-700 hover:text-slate-900 shadow-sm disabled:shadow-none"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        page === pageNum
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages} 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium text-slate-700 hover:text-slate-900 shadow-sm disabled:shadow-none"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
