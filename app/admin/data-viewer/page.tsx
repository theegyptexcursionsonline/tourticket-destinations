'use client';

import React, { useState, useEffect } from 'react';
import {
  Package, MapPin, Folder, Image,
  ChevronDown, ChevronRight, Search,
  FileText, Calendar, Globe, Tag,
  DollarSign, Clock, Users, Star,
  CheckCircle, XCircle, Loader2
} from 'lucide-react';

interface DataViewerState {
  summary: any;
  tours: any[];
  destinations: any[];
  categories: any[];
  attractions: any[];
}

export default function DataViewerPage() {
  const [data, setData] = useState<DataViewerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    summary: true,
    tours: false,
    destinations: false,
    categories: false,
    attractions: false,
  });
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'tours' | 'destinations' | 'categories' | 'attractions'>('all');
  const [showFullJSON, setShowFullJSON] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/data-viewer');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleItem = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filterData = (items: any[], searchTerm: string) => {
    if (!searchTerm) return items;
    return items.filter(item =>
      JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-800 text-center">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const filteredTours = filterData(data.tours, searchTerm);
  const filteredDestinations = filterData(data.destinations, searchTerm);
  const filteredCategories = filterData(data.categories, searchTerm);
  const filteredAttractions = filterData(data.attractions, searchTerm);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Database Viewer</h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search all data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Tabs and Actions */}
          <div className="flex items-center justify-between gap-4 mt-4">
            <div className="flex gap-2 overflow-x-auto">
              {[
                { id: 'all', label: 'All Data', count: data.summary.totalTours + data.summary.totalDestinations + data.summary.totalCategories + data.summary.totalAttractions },
                { id: 'tours', label: 'Tours', count: data.summary.totalTours },
                { id: 'destinations', label: 'Destinations', count: data.summary.totalDestinations },
                { id: 'categories', label: 'Categories', count: data.summary.totalCategories },
                { id: 'attractions', label: 'Attractions', count: data.summary.totalAttractions },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFullJSON(!showFullJSON)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap font-medium"
            >
              <FileText className="w-4 h-4" />
              {showFullJSON ? 'Hide' : 'Show'} Full JSON
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Full JSON View */}
        {showFullJSON && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">Complete Database JSON</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const jsonString = JSON.stringify(data, null, 2);
                    navigator.clipboard.writeText(jsonString);
                    alert('JSON copied to clipboard!');
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Copy JSON
                </button>
                <button
                  onClick={() => {
                    const jsonString = JSON.stringify(data, null, 2);
                    const blob = new Blob([jsonString], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `database-export-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Download JSON
                </button>
              </div>
            </div>
            <div className="p-6">
              <pre className="text-xs bg-gray-900 text-green-400 p-6 rounded overflow-x-auto max-h-[600px] overflow-y-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Summary Section */}
        {(activeTab === 'all') && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <button
              onClick={() => toggleSection('summary')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Summary</h2>
              </div>
              {expandedSections.summary ? <ChevronDown /> : <ChevronRight />}
            </button>

            {expandedSections.summary && (
              <div className="px-6 pb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <SummaryCard label="Total Tours" value={data.summary.totalTours} icon={<Package className="w-5 h-5" />} color="blue" />
                <SummaryCard label="Published" value={data.summary.publishedTours} icon={<CheckCircle className="w-5 h-5" />} color="green" />
                <SummaryCard label="Featured" value={data.summary.featuredTours} icon={<Star className="w-5 h-5" />} color="yellow" />
                <SummaryCard label="Destinations" value={data.summary.totalDestinations} icon={<MapPin className="w-5 h-5" />} color="purple" />
                <SummaryCard label="Categories" value={data.summary.totalCategories} icon={<Folder className="w-5 h-5" />} color="orange" />
                <SummaryCard label="Attractions" value={data.summary.totalAttractions} icon={<Image className="w-5 h-5" />} color="pink" />
              </div>
            )}
          </div>
        )}

        {/* Tours Section */}
        {(activeTab === 'all' || activeTab === 'tours') && (
          <DataSection
            title="Tours"
            icon={<Package className="w-6 h-6 text-red-600" />}
            items={filteredTours}
            expanded={expandedSections.tours}
            onToggle={() => toggleSection('tours')}
            expandedItems={expandedItems}
            onToggleItem={toggleItem}
            renderItem={(tour: any) => (
              <TourCard tour={tour} />
            )}
          />
        )}

        {/* Destinations Section */}
        {(activeTab === 'all' || activeTab === 'destinations') && (
          <DataSection
            title="Destinations"
            icon={<MapPin className="w-6 h-6 text-green-600" />}
            items={filteredDestinations}
            expanded={expandedSections.destinations}
            onToggle={() => toggleSection('destinations')}
            expandedItems={expandedItems}
            onToggleItem={toggleItem}
            renderItem={(dest: any) => (
              <DestinationCard destination={dest} />
            )}
          />
        )}

        {/* Categories Section */}
        {(activeTab === 'all' || activeTab === 'categories') && (
          <DataSection
            title="Categories"
            icon={<Folder className="w-6 h-6 text-orange-600" />}
            items={filteredCategories}
            expanded={expandedSections.categories}
            onToggle={() => toggleSection('categories')}
            expandedItems={expandedItems}
            onToggleItem={toggleItem}
            renderItem={(cat: any) => (
              <CategoryCard category={cat} />
            )}
          />
        )}

        {/* Attractions Section */}
        {(activeTab === 'all' || activeTab === 'attractions') && (
          <DataSection
            title="Attraction Pages"
            icon={<Image className="w-6 h-6 text-purple-600" />}
            items={filteredAttractions}
            expanded={expandedSections.attractions}
            onToggle={() => toggleSection('attractions')}
            expandedItems={expandedItems}
            onToggleItem={toggleItem}
            renderItem={(attr: any) => (
              <AttractionCard attraction={attr} />
            )}
          />
        )}
      </div>
    </div>
  );
}

const SummaryCard = ({ label, value, icon, color }: any) => {
  const colorClasses: any = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
    pink: 'bg-pink-50 text-pink-700',
  };

  return (
    <div className={`${colorClasses[color]} p-4 rounded-lg`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
};

const DataSection = ({ title, icon, items, expanded, onToggle, expandedItems, onToggleItem, renderItem }: any) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
    >
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="text-xl font-bold text-gray-900">{title} ({items.length})</h2>
      </div>
      {expanded ? <ChevronDown /> : <ChevronRight />}
    </button>

    {expanded && (
      <div className="px-6 pb-6 space-y-4">
        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No {title.toLowerCase()} found</p>
        ) : (
          items.map((item: any) => (
            <div key={item._id} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => onToggleItem(item._id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <span className="font-medium text-left">{item.title || item.name}</span>
                {expandedItems[item._id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
              {expandedItems[item._id] && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  {renderItem(item)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    )}
  </div>
);

const TourCard = ({ tour }: any) => (
  <div className="space-y-4 pt-4">
    <InfoGrid>
      <InfoItem label="ID" value={tour._id} />
      <InfoItem label="Slug" value={tour.slug} />
      <InfoItem label="Price" value={`$${tour.price}`} icon={<DollarSign className="w-4 h-4" />} />
      {tour.originalPrice && <InfoItem label="Original Price" value={`$${tour.originalPrice}`} />}
      <InfoItem label="Duration" value={tour.duration} icon={<Clock className="w-4 h-4" />} />
      <InfoItem label="Difficulty" value={tour.difficulty} />
      <InfoItem label="Max Group" value={tour.maxGroupSize} icon={<Users className="w-4 h-4" />} />
      <InfoItem label="Published" value={tour.isPublished ? 'Yes' : 'No'} badge={tour.isPublished ? 'green' : 'red'} />
      <InfoItem label="Featured" value={tour.isFeatured ? 'Yes' : 'No'} badge={tour.isFeatured ? 'yellow' : 'gray'} />
    </InfoGrid>

    {tour.destination && (
      <div className="bg-blue-50 p-3 rounded">
        <strong className="text-blue-900">Destination:</strong> {tour.destination.name}
      </div>
    )}

    {tour.category && (
      <div className="bg-purple-50 p-3 rounded">
        <strong className="text-purple-900">Categories:</strong>{' '}
        {Array.isArray(tour.category)
          ? tour.category.map((cat: any) => cat.name || cat).join(', ')
          : (typeof tour.category === 'object' ? tour.category.name : tour.category)}
      </div>
    )}

    <ExpandableSection title="Description">
      <p className="text-gray-700">{tour.description}</p>
      {tour.longDescription && (
        <p className="text-gray-600 mt-2 text-sm">{tour.longDescription}</p>
      )}
    </ExpandableSection>

    {tour.highlights?.length > 0 && (
      <ExpandableSection title={`Highlights (${tour.highlights.length})`}>
        <ul className="list-disc list-inside space-y-1">
          {tour.highlights.map((h: string, i: number) => (
            <li key={i} className="text-gray-700">{h}</li>
          ))}
        </ul>
      </ExpandableSection>
    )}

    {tour.bookingOptions?.length > 0 && (
      <ExpandableSection title={`Booking Options (${tour.bookingOptions.length})`}>
        {tour.bookingOptions.map((opt: any, i: number) => (
          <div key={i} className="bg-gray-50 p-3 rounded mb-2">
            <div className="font-medium">{opt.label}</div>
            <div className="text-sm text-gray-600">Type: {opt.type} | Price: ${opt.price}</div>
            {opt.originalPrice && <div className="text-sm text-gray-600">Original: ${opt.originalPrice}</div>}
            {opt.description && <div className="text-sm mt-1">{opt.description}</div>}
          </div>
        ))}
      </ExpandableSection>
    )}

    {tour.itinerary?.length > 0 && (
      <ExpandableSection title={`Itinerary (${tour.itinerary.length} items)`}>
        {tour.itinerary.map((item: any, i: number) => (
          <div key={i} className="bg-gray-50 p-3 rounded mb-2">
            <div className="font-medium">{item.time} - {item.title}</div>
            <div className="text-sm text-gray-600">{item.description}</div>
            {item.duration && <div className="text-xs text-gray-500 mt-1">Duration: {item.duration}</div>}
          </div>
        ))}
      </ExpandableSection>
    )}

    <JSONView data={tour} />
  </div>
);

const DestinationCard = ({ destination }: any) => (
  <div className="space-y-4 pt-4">
    <InfoGrid>
      <InfoItem label="ID" value={destination._id} />
      <InfoItem label="Slug" value={destination.slug} />
      {destination.country && <InfoItem label="Country" value={destination.country} icon={<Globe className="w-4 h-4" />} />}
      {destination.tourCount && <InfoItem label="Tours" value={destination.tourCount} />}
      <InfoItem label="Published" value={destination.isPublished ? 'Yes' : 'No'} badge={destination.isPublished ? 'green' : 'red'} />
      <InfoItem label="Featured" value={destination.featured ? 'Yes' : 'No'} badge={destination.featured ? 'yellow' : 'gray'} />
    </InfoGrid>

    <ExpandableSection title="Description">
      <p className="text-gray-700">{destination.description}</p>
    </ExpandableSection>

    <JSONView data={destination} />
  </div>
);

const CategoryCard = ({ category }: any) => (
  <div className="space-y-4 pt-4">
    <InfoGrid>
      <InfoItem label="ID" value={category._id} />
      <InfoItem label="Slug" value={category.slug} />
      <InfoItem label="Featured" value={category.featured ? 'Yes' : 'No'} badge={category.featured ? 'yellow' : 'gray'} />
    </InfoGrid>

    <JSONView data={category} />
  </div>
);

const AttractionCard = ({ attraction }: any) => (
  <div className="space-y-4 pt-4">
    <InfoGrid>
      <InfoItem label="ID" value={attraction._id} />
      <InfoItem label="Slug" value={attraction.slug} />
      <InfoItem label="Type" value={attraction.pageType} />
      <InfoItem label="Published" value={attraction.isPublished ? 'Yes' : 'No'} badge={attraction.isPublished ? 'green' : 'red'} />
    </InfoGrid>

    <JSONView data={attraction} />
  </div>
);

const InfoGrid = ({ children }: any) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {children}
  </div>
);

const InfoItem = ({ label, value, icon, badge }: any) => {
  const badgeColors: any = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="bg-gray-50 p-2 rounded">
      <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
        {icon}
        {label}
      </div>
      {badge ? (
        <span className={`text-xs px-2 py-1 rounded ${badgeColors[badge]}`}>
          {value}
        </span>
      ) : (
        <div className="text-sm font-medium text-gray-900 truncate">{value}</div>
      )}
    </div>
  );
};

const ExpandableSection = ({ title, children }: any) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50"
      >
        <span className="font-medium text-sm">{title}</span>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

const JSONView = ({ data }: any) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50"
      >
        <span className="font-medium text-sm text-gray-700">View Full JSON Data</span>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-x-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
