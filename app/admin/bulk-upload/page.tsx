'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { UploadCloud, Loader2, FileJson, Package, MapPin, Star, Image as ImageIcon, Check, Upload, Link as LinkIcon, AlertCircle } from 'lucide-react';
import withAuth from '@/components/admin/withAuth';

// Types for missing images
interface MissingImage {
    _id: string;
    name: string;
    imageField: string;
    modelType: string;
    uploadedUrl?: string;
}

interface UploadResults {
    destinations?: { created: number; updated: number; errors: string[] };
    categories?: { created: number; updated: number; errors: string[] };
    attractions?: { created: number; updated: number; errors: string[] };
    tours?: { created: number; updated: number; errors: string[] };
    missingImages?: MissingImage[];
}

// Image Upload Card Component
const ImageUploadCard = ({ 
    item, 
    onImageUpload 
}: { 
    item: MissingImage; 
    onImageUpload: (id: string, url: string) => void;
}) => {
    const [imageUrl, setImageUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
    const [previewUrl, setPreviewUrl] = useState('');

    const handleUrlSubmit = async () => {
        if (!imageUrl.trim()) {
            toast.error('Please enter a valid image URL');
            return;
        }

        setIsUploading(true);
        try {
            const response = await fetch('/api/admin/bulk-upload/link-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    docId: item._id,
                    modelType: item.modelType,
                    imageField: item.imageField,
                    imageUrl: imageUrl.trim()
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to link image');

            toast.success(`Image linked to ${item.name}`);
            onImageUpload(item._id, imageUrl.trim());
            setPreviewUrl(imageUrl.trim());
        } catch (error: any) {
            toast.error(`Failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('docId', item._id);
        formData.append('modelType', item.modelType);
        formData.append('imageField', item.imageField);

        try {
            const response = await fetch('/api/admin/bulk-upload/upload-image', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Upload failed');

            toast.success(`Image uploaded for ${item.name}`);
            onImageUpload(item._id, data.imageUrl);
            setPreviewUrl(data.imageUrl);
        } catch (error: any) {
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const getModelIcon = () => {
        switch (item.modelType) {
            case 'Tours': return <Star className="h-5 w-5 text-amber-500" />;
            case 'Destinations': return <MapPin className="h-5 w-5 text-green-500" />;
            case 'Attractions': return <Star className="h-5 w-5 text-purple-500" />;
            default: return <Package className="h-5 w-5 text-blue-500" />;
        }
    };

    return (
        <div className={`bg-white border-2 rounded-xl p-6 transition-all ${
            item.uploadedUrl ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-indigo-300'
        }`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                    {getModelIcon()}
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-800 mb-1">{item.name}</h4>
                        <div className="flex gap-2 text-xs">
                            <span className="px-2 py-1 bg-slate-100 rounded-full text-slate-600">
                                {item.modelType}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 rounded-full text-blue-600">
                                {item.imageField}
                            </span>
                        </div>
                    </div>
                </div>
                {item.uploadedUrl && (
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                        <Check className="h-5 w-5" />
                        <span className="text-sm">Uploaded</span>
                    </div>
                )}
            </div>

            {/* Upload Method Toggle */}
            {!item.uploadedUrl && (
                <>
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setUploadMethod('url')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                                uploadMethod === 'url'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <LinkIcon className="h-4 w-4 inline mr-2" />
                            Image URL
                        </button>
                        <button
                            onClick={() => setUploadMethod('file')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                                uploadMethod === 'file'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <Upload className="h-4 w-4 inline mr-2" />
                            Upload File
                        </button>
                    </div>

                    {/* URL Input Method */}
                    {uploadMethod === 'url' && (
                        <div className="space-y-3">
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                disabled={isUploading}
                            />
                            <button
                                onClick={handleUrlSubmit}
                                disabled={isUploading || !imageUrl.trim()}
                                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Linking...
                                    </>
                                ) : (
                                    <>
                                        <LinkIcon className="h-5 w-5" />
                                        Link Image URL
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* File Upload Method */}
                    {uploadMethod === 'file' && (
                        <div>
                            <label className="block">
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-slate-50 hover:bg-indigo-50">
                                    {isUploading ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
                                            <p className="text-slate-600 font-medium">Uploading...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <ImageIcon className="h-12 w-12 text-slate-400" />
                                            <div>
                                                <p className="text-slate-700 font-medium mb-1">
                                                    Click to upload or drag and drop
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    PNG, JPG, WEBP up to 5MB
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    disabled={isUploading}
                                />
                            </label>
                        </div>
                    )}
                </>
            )}

            {/* Preview */}
            {(previewUrl || item.uploadedUrl) && (
                <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Preview:</p>
                    <div className="relative rounded-lg overflow-hidden border border-slate-200">
                        <img
                            src={previewUrl || item.uploadedUrl}
                            alt={item.name}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// Result Display Component
const ResultDisplay = ({ results }: { results: UploadResults }) => {
    if (!results) return null;
    
    const renderSection = (title: string, data: any, icon: React.ReactNode) => {
        const totalProcessed = data.created + data.updated;
        if (totalProcessed === 0 && data.errors.length === 0) return null;

        return (
            <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                    {icon} {title}
                </h4>
                <div className="flex gap-4 text-sm">
                    <p><span className="font-semibold text-green-600">{data.created}</span> Created</p>
                    <p><span className="font-semibold text-blue-600">{data.updated}</span> Updated</p>
                    <p><span className="font-semibold text-red-600">{data.errors.length}</span> Errors</p>
                </div>
                {data.errors.length > 0 && (
                    <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-semibold text-red-700">Error Details:</span>
                        </div>
                        <ul className="text-xs text-red-700 list-disc list-inside space-y-1 max-h-48 overflow-y-auto bg-white p-3 rounded-md border border-red-200">
                            {data.errors.map((error: string, index: number) => (
                                <li key={index} className="break-words">{error}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mt-8 p-6 bg-white border border-slate-200 rounded-xl space-y-4">
            <h3 className="text-xl font-bold text-slate-800">Combined Upload Summary</h3>
            {results.destinations && renderSection('Destinations', results.destinations, <MapPin className="h-5 w-5 text-green-500" />)}
            {results.categories && renderSection('Categories', results.categories, <Package className="h-5 w-5 text-blue-500" />)}
            {results.attractions && renderSection('Attraction Pages', results.attractions, <Star className="h-5 w-5 text-purple-500" />)}
            {results.tours && renderSection('Tours', results.tours, <Star className="h-5 w-5 text-amber-500" />)}
        </div>
    );
};

// Main Component
function BulkUploadPage() {
    const [jsonInput, setJsonInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<UploadResults | null>(null);
    const [missingImages, setMissingImages] = useState<MissingImage[]>([]);
    const [uploadedImages, setUploadedImages] = useState<Set<string>>(new Set());

    const handleBulkUpload = async () => {
        setIsLoading(true);
        setResults(null);
        setMissingImages([]);
        setUploadedImages(new Set());
        let parsedData;

        try {
            parsedData = JSON.parse(jsonInput);
        } catch (error: any) {
            toast.error(`Invalid JSON: ${error.message}`);
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/admin/bulk-upload/combined', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsedData),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Something went wrong on the server.');

            toast.success('Bulk upload processed successfully!');
            setResults(data.results);
            
            // Collect all missing images from all entity types
            const allMissingImages: MissingImage[] = [];
            
            if (data.results.missingImages) {
                allMissingImages.push(...data.results.missingImages);
            }

            setMissingImages(allMissingImages);

            if (allMissingImages.length > 0) {
                toast(`${allMissingImages.length} items need images`, { duration: 5000, icon: 'ℹ️' });
            }

            // Show detailed summary
            const summary = [];
            if (data.results.destinations) {
                summary.push(`Destinations: ${data.results.destinations.created} created, ${data.results.destinations.updated} updated`);
            }
            if (data.results.categories) {
                summary.push(`Categories: ${data.results.categories.created} created`);
            }
            if (data.results.attractions) {
                summary.push(`Attractions: ${data.results.attractions.created} created, ${data.results.attractions.updated} updated`);
            }
            if (data.results.tours) {
                summary.push(`Tours: ${data.results.tours.created} created, ${data.results.tours.updated} updated`);
            }
            
            console.log('Upload Summary:', summary.join(' | '));

        } catch (error: any) {
            toast.error(`Upload failed: ${error.message}`);
            console.error('Upload error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = (id: string, url: string) => {
        setUploadedImages(prev => new Set(prev).add(id));
        setMissingImages(prev => 
            prev.map(item => 
                item._id === id ? { ...item, uploadedUrl: url } : item
            )
        );
    };

    const completedCount = uploadedImages.size;
    const totalCount = missingImages.length;
    const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-2">
                    Combined Bulk Uploader
                </h1>
                <p className="text-slate-600">
                    Create destinations, categories, attractions, and tours from a single JSON file.
                </p>
            </div>

            {/* JSON Input Section */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mb-8">
                <label htmlFor="json-input" className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-3">
                    <FileJson className="h-6 w-6 text-indigo-500" />
                    Paste Combined JSON Data
                </label>
                <textarea
                    id="json-input"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder={`{\n  "destinations": [...],\n  "categories": [...],\n  "attractions": [...],\n  "tours": [...]\n}`}
                    className="w-full h-96 p-4 font-mono text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 mb-4"
                    disabled={isLoading}
                />
                <button
                    onClick={handleBulkUpload}
                    disabled={isLoading || !jsonInput}
                    className="w-full inline-flex justify-center items-center gap-3 px-6 py-4 text-white font-bold bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <UploadCloud className="h-5 w-5" />
                            Process Combined File
                        </>
                    )}
                </button>
            </div>

            {/* Results */}
            {results && <ResultDisplay results={results} />}

            {/* Image Upload Section */}
            {missingImages.length > 0 && (
                <div className="mt-8">
                    {/* Progress Bar */}
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <ImageIcon className="h-6 w-6 text-indigo-600" />
                                Upload Missing Images
                            </h3>
                            <span className="text-sm font-semibold text-slate-600">
                                {completedCount} / {totalCount} completed
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full transition-all duration-500 rounded-full"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        {completedCount === totalCount && (
                            <p className="text-green-600 font-semibold mt-3 flex items-center gap-2">
                                <Check className="h-5 w-5" />
                                All images uploaded successfully!
                            </p>
                        )}
                    </div>

                    {/* Image Upload Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {missingImages.map((item) => (
                            <ImageUploadCard
                                key={item._id}
                                item={item}
                                onImageUpload={handleImageUpload}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default withAuth(BulkUploadPage, { permissions: ['manageTours'] });