'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Eye,
  Loader2,
  Image as ImageIcon,
  Grid,
  MapPin,
  Tag
} from 'lucide-react';

interface CleanResultItem {
  id: string;
  title: string;
  oldImage?: string;
  oldHeroImage?: string;
}

interface CleanResult {
  success: boolean;
  message: string;
  totalCleaned: number;
  results: {
    tours: { count: number; cleaned: CleanResultItem[] };
    categories: { count: number; cleaned: CleanResultItem[] };
    destinations: { count: number; cleaned: CleanResultItem[] };
  };
}

interface CheckResultItem {
  id: string;
  title: string;
  type: 'tour' | 'category' | 'destination';
  image?: string;
  heroImage?: string;
  images?: string[];
}

interface CheckResult {
  success: boolean;
  totalCount: number;
  results: {
    tours: { count: number; items: CheckResultItem[] };
    categories: { count: number; items: CheckResultItem[] };
    destinations: { count: number; items: CheckResultItem[] };
  };
  allItems: CheckResultItem[];
}

const ItemTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'tour':
      return <Grid className="h-4 w-4 text-blue-600" />;
    case 'category':
      return <Tag className="h-4 w-4 text-green-600" />;
    case 'destination':
      return <MapPin className="h-4 w-4 text-purple-600" />;
    default:
      return <ImageIcon className="h-4 w-4 text-gray-600" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'tour':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'category':
      return 'bg-green-50 text-green-800 border-green-200';
    case 'destination':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-50 text-gray-800 border-gray-200';
  }
};

export default function ImageCleaner() {
  const [isChecking, setIsChecking] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-check on component mount
  useEffect(() => {
    checkPlaceholderImages();
  }, []);

  const checkPlaceholderImages = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/tours/clean-images');
      const data = await response.json();
      
      if (data.success) {
        setCheckResult(data);
      } else {
        setError(data.error || 'Failed to check images');
      }
    } catch (_err) {
      setError('Network error while checking images');
    } finally {
      setIsChecking(false);
    }
  };

  const cleanPlaceholderImages = async () => {
    setIsCleaning(true);
    setError(null);
    setCleanResult(null);
    
    try {
      const response = await fetch('/api/admin/tours/clean-images', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setCleanResult(data);
        // Refresh the check after cleaning
        await checkPlaceholderImages();
      } else {
        setError(data.error || 'Failed to clean images');
      }
    } catch (_err) {
      setError('Network error while cleaning images');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg">
          <ImageIcon className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Image Cleaner</h2>
          <p className="text-sm text-slate-600">Remove placeholder and invalid image URLs from tours, categories, and destinations</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-800">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Check Results */}
      {checkResult && (
        <div className="mb-6">
          <div className={`p-4 rounded-lg border flex items-center gap-3 ${
            checkResult.totalCount > 0 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            {checkResult.totalCount > 0 ? (
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className={`font-semibold ${
                checkResult.totalCount > 0 ? 'text-yellow-800' : 'text-green-800'
              }`}>
                {checkResult.totalCount > 0 
                  ? `Found ${checkResult.totalCount} item${checkResult.totalCount !== 1 ? 's' : ''} with placeholder images`
                  : 'No placeholder images found'
                }
              </h3>
              {checkResult.totalCount > 0 && (
                <div className="text-yellow-700 text-sm mt-1">
                  <p>
                    Tours: {checkResult.results.tours.count} • 
                    Categories: {checkResult.results.categories.count} • 
                    Destinations: {checkResult.results.destinations.count}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Show items with placeholder images */}
          {checkResult.totalCount > 0 && checkResult.allItems.length > 0 && (
            <div className="mt-4 max-h-80 overflow-y-auto">
              <h4 className="font-semibold text-slate-800 mb-3">Items with placeholder images:</h4>
              <div className="space-y-3">
                {checkResult.allItems.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="bg-slate-50 p-4 rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <ItemTypeIcon type={item.type} />
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getTypeColor(item.type)}`}>
                            {item.type}
                          </span>
                          <span className="font-medium text-slate-900">{item.title}</span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600">
                          {item.image && (
                            <div className="truncate">
                              <span className="font-medium">Image:</span> {item.image}
                            </div>
                          )}
                          {item.heroImage && (
                            <div className="truncate">
                              <span className="font-medium">Hero Image:</span> {item.heroImage}
                            </div>
                          )}
                          {item.images && item.images.length > 0 && (
                            <div>
                              <span className="font-medium">Gallery:</span> {item.images.length} image{item.images.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clean Results */}
      {cleanResult && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Cleaning Complete</h3>
          </div>
          <p className="text-green-700 text-sm mb-3">{cleanResult.message}</p>
          
          {/* Summary by type */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-lg font-bold text-blue-600">{cleanResult.results.tours.count}</div>
              <div className="text-xs text-slate-600">Tours</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-lg font-bold text-green-600">{cleanResult.results.categories.count}</div>
              <div className="text-xs text-slate-600">Categories</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-lg font-bold text-purple-600">{cleanResult.results.destinations.count}</div>
              <div className="text-xs text-slate-600">Destinations</div>
            </div>
          </div>
          
          {cleanResult.totalCleaned > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-green-800 hover:text-green-900">
                View cleaned items ({cleanResult.totalCleaned})
              </summary>
              <div className="mt-3 space-y-3 max-h-60 overflow-y-auto">
                {/* Tours */}
                {cleanResult.results.tours.cleaned.map((item) => (
                  <div key={`tour-${item.id}`} className="bg-white p-3 rounded border">
                    <div className="flex items-center gap-2 mb-1">
                      <Grid className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm text-blue-800">Tour:</span>
                      <span className="text-sm">{item.title}</span>
                    </div>
                    {item.oldImage && (
                      <div className="text-xs text-slate-500 truncate">Removed: {item.oldImage}</div>
                    )}
                  </div>
                ))}
                
                {/* Categories */}
                {cleanResult.results.categories.cleaned.map((item) => (
                  <div key={`category-${item.id}`} className="bg-white p-3 rounded border">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm text-green-800">Category:</span>
                      <span className="text-sm">{item.title}</span>
                    </div>
                    {item.oldHeroImage && (
                      <div className="text-xs text-slate-500 truncate">Removed hero: {item.oldHeroImage}</div>
                    )}
                    {item.oldImage && (
                      <div className="text-xs text-slate-500 truncate">Removed image: {item.oldImage}</div>
                    )}
                  </div>
                ))}
                
                {/* Destinations */}
                {cleanResult.results.destinations.cleaned.map((item) => (
                  <div key={`destination-${item.id}`} className="bg-white p-3 rounded border">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-sm text-purple-800">Destination:</span>
                      <span className="text-sm">{item.title}</span>
                    </div>
                    {item.oldHeroImage && (
                      <div className="text-xs text-slate-500 truncate">Removed hero: {item.oldHeroImage}</div>
                    )}
                    {item.oldImage && (
                      <div className="text-xs text-slate-500 truncate">Removed image: {item.oldImage}</div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={checkPlaceholderImages}
          disabled={isChecking || isCleaning}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isChecking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {isChecking ? 'Checking...' : 'Check All Placeholder Images'}
        </button>

        <button
          onClick={cleanPlaceholderImages}
          disabled={isCleaning || isChecking || (checkResult && checkResult.totalCount === 0)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isCleaning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {isCleaning ? 'Cleaning...' : 'Clean All Placeholder Images'}
        </button>

        <button
          onClick={() => window.location.reload()}
          disabled={isChecking || isCleaning}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Page
        </button>
      </div>

      {/* Enhanced Instructions */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <h4 className="font-semibold text-slate-800 mb-2">What gets cleaned:</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
          <div>
            <div className="flex items-center gap-2 font-medium text-blue-800 mb-1">
              <Grid className="h-4 w-4" />
              Tours
            </div>
            <ul className="space-y-1 text-xs">
              <li>• Main image field</li>
              <li>• Image gallery arrays</li>
              <li>• Featured tour images</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 font-medium text-green-800 mb-1">
              <Tag className="h-4 w-4" />
              Categories
            </div>
            <ul className="space-y-1 text-xs">
              <li>• Hero images</li>
              <li>• Category thumbnails</li>
              <li>• Banner images</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 font-medium text-purple-800 mb-1">
              <MapPin className="h-4 w-4" />
              Destinations
            </div>
            <ul className="space-y-1 text-xs">
              <li>• Hero images</li>
              <li>• Destination thumbnails</li>
              <li>• Gallery images</li>
            </ul>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          <strong>Safe operation:</strong> Only removes URLs containing 'your-cdn.com', 'placeholder', or 'example.com'. Valid images are preserved.
        </div>
      </div>
    </div>
  );
}