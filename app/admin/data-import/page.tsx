// app/admin/data-import/page.tsx
"use client";

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, Trash2, Image as ImageIcon, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import withAuth from '@/components/admin/withAuth';

interface ImportReport {
  wipedData: boolean;
  destinationsCreated: number;
  categoriesCreated: number;
  attractionPagesCreated: number;
  toursCreated: number;
  destinationsUpdated: number;
  categoriesUpdated: number;
  attractionPagesUpdated: number;
  toursUpdated: number;
  errors: string[];
  warnings: string[];
}

interface ImportResult {
  success: boolean;
  report?: ImportReport;
  summary?: {
    created: {
      destinations: number;
      categories: number;
      attractionPages: number;
      tours: number;
      total: number;
    };
    updated: {
      destinations: number;
      categories: number;
      attractionPages: number;
      tours: number;
      total: number;
    };
    errors: number;
    warnings: number;
  };
  message?: string;
  error?: string;
}

interface ParsedItem {
  id: string;
  type: 'destination' | 'tour';
  title: string;
  description: string;
  currentImage?: string;
  uploadedImage?: string;
  isUploading?: boolean;
}

function DataImportPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [jsonData, setJsonData] = useState<string>('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Sample JSON template with ALL supported fields
  const sampleTemplate = {
    "wipeData": false,
    "updateMode": "upsert",
    "destinations": [
      {
        "name": "Cairo",
        "slug": "cairo",
        "country": "Egypt",
        "image": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a",
        "images": [
          "https://images.unsplash.com/photo-1568322445389-f64ac2515020",
          "https://images.unsplash.com/photo-1539768942893-daf53e448371"
        ],
        "description": "Egypt's bustling capital city with ancient wonders",
        "longDescription": "Cairo, Egypt's sprawling capital, is set on the Nile River. At its heart is Tahrir Square and the vast Egyptian Museum, a trove of antiquities including royal mummies and gilded King Tutankhamun artifacts. Nearby, Giza is the site of the iconic pyramids and Great Sphinx, dating to the 26th century BC.",
        "coordinates": { "lat": 30.0444, "lng": 31.2357 },
        "currency": "Egyptian Pound (EGP)",
        "timezone": "EET (UTC+2)",
        "bestTimeToVisit": "October to April for pleasant weather",
        "highlights": [
          "Pyramids of Giza",
          "Egyptian Museum",
          "Khan el-Khalili Bazaar",
          "Citadel of Saladin"
        ],
        "thingsToDo": [
          "Explore the Pyramids of Giza",
          "Visit the Egyptian Museum",
          "Shop at Khan el-Khalili",
          "Cruise the Nile River"
        ],
        "localCustoms": [
          "Dress modestly when visiting religious sites",
          "Remove shoes before entering mosques",
          "Haggling is expected in markets"
        ],
        "visaRequirements": "Most nationalities can obtain visa on arrival for $25 USD",
        "languagesSpoken": ["Arabic", "English", "French"],
        "emergencyNumber": "122 (Police), 123 (Ambulance)",
        "averageTemperature": { "summer": "35°C", "winter": "20°C" },
        "climate": "Hot desert climate with mild winters",
        "weatherWarnings": ["Very hot summers", "Sandstorms possible in spring"],
        "featured": true,
        "isPublished": true,
        "metaTitle": "Cairo Tours & Activities - Explore Ancient Egypt",
        "metaDescription": "Discover the best tours and activities in Cairo. Visit the Pyramids, Egyptian Museum, and experience authentic Egyptian culture.",
        "keywords": ["cairo tours", "egypt travel", "pyramids", "egyptian museum"],
        "tags": ["ancient-egypt", "history", "culture", "middle-east"]
      }
    ],
    "categories": [
      {
        "name": "Historical Tours",
        "slug": "historical-tours",
        "description": "Explore ancient civilizations and historical landmarks",
        "longDescription": "Journey through time with our carefully curated historical tours. Experience the grandeur of ancient civilizations, walk through centuries-old monuments, and learn fascinating stories from expert guides.",
        "heroImage": "https://images.unsplash.com/photo-1503756234508-e32369269deb",
        "images": [
          "https://images.unsplash.com/photo-1513581166391-887a96ddeafd",
          "https://images.unsplash.com/photo-1549144511-f099e773c147"
        ],
        "highlights": [
          "Expert Egyptologist guides",
          "Skip-the-line access",
          "Small group sizes",
          "UNESCO World Heritage Sites"
        ],
        "features": [
          "Professional photography opportunities",
          "Air-conditioned transportation",
          "Comprehensive historical context",
          "Authentic local experiences"
        ],
        "metaTitle": "Historical Tours - Ancient Sites & Archaeological Wonders",
        "metaDescription": "Explore world-famous historical sites with expert guides. From ancient pyramids to medieval castles, discover the stories that shaped our world.",
        "keywords": ["historical tours", "ancient sites", "archaeology", "cultural heritage"],
        "color": "#8B4513",
        "icon": "monument",
        "order": 1,
        "isPublished": true,
        "featured": true
      }
    ],
    "tours": [
      {
        "title": "Pyramids of Giza Private Tour",
        "slug": "pyramids-giza-private-tour",
        "description": "Explore the last standing wonder of the ancient world",
        "longDescription": "Experience the majesty of the Pyramids of Giza on this comprehensive private tour...",
        "price": 89,
        "discountPrice": 69,
        "duration": "4 hours",
        "maxGroupSize": 8,
        "difficulty": "Easy",
        "destinationName": "Cairo",
        "categoryNames": ["Historical Tours"],
        "featured": true,
        "isPublished": true,
        "image": "",
        "images": [],
        "highlights": [
          "Visit the Great Pyramid of Khufu",
          "See the Sphinx up close",
          "Professional Egyptologist guide"
        ],
        "includes": ["Hotel pickup", "Entry fees", "Guide"],
        "whatsIncluded": ["Private tour guide", "Air-conditioned vehicle", "All entrance fees"],
        "whatsNotIncluded": ["Lunch", "Gratuities", "Personal expenses"],
        "tags": ["history", "pyramids", "ancient-egypt"],
        "location": "Giza Plateau, Cairo",
        "meetingPoint": "Hotel lobby (Cairo hotels only)",
        "languages": ["English", "Arabic", "Spanish"],
        "ageRestriction": "All ages welcome",
        "cancellationPolicy": "Free cancellation up to 24 hours before the tour",
        "operatedBy": "Egypt Tours Company",
        "whatToBring": [
          "Camera for photos",
          "Comfortable walking shoes",
          "Sun protection",
          "Water bottle"
        ],
        "whatToWear": [
          "Comfortable clothing",
          "Walking shoes",
          "Hat and sunglasses"
        ],
        "physicalRequirements": "Moderate walking required. Some climbing of stairs.",
        "accessibilityInfo": [
          "Limited wheelchair accessibility",
          "Please contact us for special requirements"
        ],
        "groupSize": { "min": 1, "max": 8 },
        "transportationDetails": "Air-conditioned vehicle with pickup from Cairo hotels",
        "mealInfo": "Lunch not included. Restaurant recommendations available.",
        "weatherPolicy": "Tours operate rain or shine. Refund available for extreme weather.",
        "photoPolicy": "Photography allowed. Flash not permitted inside tombs.",
        "tipPolicy": "Gratuities appreciated but not required.",
        "healthSafety": [
          "Hand sanitizer available",
          "First aid trained guides",
          "Enhanced cleaning protocols"
        ],
        "culturalInfo": [
          "Learn about ancient Egyptian civilization",
          "Discover pyramid construction techniques",
          "Understand pharaonic burial customs"
        ],
        "seasonalVariations": "Summer visits can be very hot. Winter offers cooler temperatures.",
        "localCustoms": [
          "Respect local customs and traditions",
          "Dress modestly when appropriate",
          "Follow guide instructions"
        ],
        "metaTitle": "Pyramids of Giza Private Tour - Best Egypt Tours",
        "metaDescription": "Explore the Pyramids of Giza with a private Egyptologist guide. Includes hotel pickup and all entrance fees. Book now!",
        "keywords": ["pyramids", "giza", "egypt tours", "private tour"],
        "itinerary": [
          {
            "day": 1,
            "time": "08:00",
            "title": "Hotel Pickup",
            "description": "Your guide will pick you up from your Cairo hotel",
            "duration": "30 mins",
            "location": "Cairo Hotel",
            "includes": ["Air-conditioned vehicle"],
            "icon": "transport"
          },
          {
            "day": 1,
            "time": "09:00",
            "title": "Visit the Great Pyramid",
            "description": "Explore the Great Pyramid of Khufu, the last remaining wonder of the ancient world",
            "duration": "1.5 hours",
            "location": "Giza Plateau",
            "includes": ["Entry ticket", "Guide commentary"],
            "icon": "monument"
          },
          {
            "day": 1,
            "time": "11:00",
            "title": "Sphinx and Valley Temple",
            "description": "See the mysterious Sphinx and explore the Valley Temple",
            "duration": "1 hour",
            "location": "Giza Complex",
            "icon": "camera"
          }
        ],
        "faqs": [
          {
            "question": "Is lunch included?",
            "answer": "Lunch is not included, but we can recommend excellent local restaurants."
          },
          {
            "question": "Can I enter the pyramids?",
            "answer": "Yes, pyramid entry is included. Some areas may require additional tickets."
          }
        ],
        "bookingOptions": [
          {
            "type": "Per Person",
            "label": "Standard Tour",
            "price": 69,
            "originalPrice": 89,
            "description": "Private tour with Egyptologist guide",
            "duration": "4 hours",
            "languages": ["English", "Arabic"],
            "highlights": ["Great Pyramid", "Sphinx", "Valley Temple"],
            "groupSize": "1-8 people",
            "difficulty": "Easy",
            "badge": "Popular",
            "discount": 22,
            "isRecommended": true
          }
        ],
        "addOns": [
          {
            "name": "Camel Ride",
            "description": "30-minute camel ride around the pyramids",
            "price": 15,
            "category": "Experience"
          },
          {
            "name": "Professional Photos",
            "description": "Professional photographer for your tour",
            "price": 50,
            "category": "Photography"
          }
        ]
      }
    ]
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonData(content);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));
    
    if (jsonFile) {
      handleFileUpload(jsonFile);
    } else {
      alert('Please drop a valid JSON file');
    }
  };

  const validateJson = (): boolean => {
    try {
      JSON.parse(jsonData);
      return true;
    } catch {
      return false;
    }
  };

  const parseJsonAndContinue = () => {
    if (!jsonData.trim()) {
      alert('Please provide JSON data');
      return;
    }

    if (!validateJson()) {
      alert('Invalid JSON format');
      return;
    }

    try {
      const data = JSON.parse(jsonData);
      setParsedData(data);
      
      // Extract items that need images
      const items: ParsedItem[] = [];
      
      // Add destinations
      if (data.destinations) {
        data.destinations.forEach((dest: any, index: number) => {
          items.push({
            id: `dest-${index}`,
            type: 'destination',
            title: dest.name,
            description: dest.description || '',
            currentImage: dest.image || '',
          });
        });
      }

      // Add tours
      if (data.tours) {
        data.tours.forEach((tour: any, index: number) => {
          items.push({
            id: `tour-${index}`,
            type: 'tour',
            title: tour.title,
            description: tour.description || '',
            currentImage: tour.image || '',
          });
        });
      }

      setParsedItems(items);
      setCurrentStep(2);
    } catch {
      alert('Error parsing JSON data');
    }
  };

  const handleImageUpload = async (itemId: string, file: File) => {
    // Set uploading state
    setParsedItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, isUploading: true } : item
      )
    );

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        // Update item with uploaded image URL
        setParsedItems(prev => 
          prev.map(item => 
            item.id === itemId 
              ? { ...item, uploadedImage: data.url, isUploading: false }
              : item
          )
        );
      } else {
        console.error('Upload failed');
        alert('Image upload failed');
        setParsedItems(prev => 
          prev.map(item => 
            item.id === itemId ? { ...item, isUploading: false } : item
          )
        );
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
      setParsedItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, isUploading: false } : item
        )
      );
    }
  };

  const handleFinalImport = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      // Create updated JSON with uploaded images
      const updatedData = { ...parsedData };
      
      // Update destinations with uploaded images
      if (updatedData.destinations) {
        updatedData.destinations = updatedData.destinations.map((dest: any, index: number) => {
          const item = parsedItems.find(item => item.id === `dest-${index}`);
          return {
            ...dest,
            image: item?.uploadedImage || item?.currentImage || dest.image || ''
          };
        });
      }

      // Update tours with uploaded images
      if (updatedData.tours) {
        updatedData.tours = updatedData.tours.map((tour: any, index: number) => {
          const item = parsedItems.find(item => item.id === `tour-${index}`);
          return {
            ...tour,
            image: item?.uploadedImage || item?.currentImage || tour.image || ''
          };
        });
      }

      const response = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      const data: ImportResult = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSample = () => {
    const dataStr = JSON.stringify(sampleTemplate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'sample-tour-data.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const loadSampleData = () => {
    setJsonData(JSON.stringify(sampleTemplate, null, 2));
    setResult(null);
  };

  const clearData = () => {
    setJsonData('');
    setResult(null);
    setParsedData(null);
    setParsedItems([]);
    setCurrentStep(1);
  };

  const goBackToStep1 = () => {
    setCurrentStep(1);
    setResult(null);
  };

  if (currentStep === 2) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={goBackToStep1}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Step 1
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Step 2: Upload Images</h1>
              <p className="text-gray-600">Upload images for your destinations and tours</p>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                ✓
              </div>
              <span className="text-green-600 font-medium">JSON Data</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <span className="text-blue-600 font-medium">Upload Images</span>
            </div>
          </div>
        </div>

        {/* Items to upload images for */}
        <div className="space-y-6">
          {parsedItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.type === 'destination' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.type === 'destination' ? 'Destination' : 'Tour'}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  </div>
                  {item.description && (
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current/Default Image */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Current Image</h4>
                  {item.currentImage ? (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <img 
                        src={item.currentImage} 
                        alt={item.title}
                        className="w-full h-32 object-cover rounded mb-2"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <p className="text-xs text-gray-500 truncate">{item.currentImage}</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 border-dashed rounded-lg p-8 text-center">
                      <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No current image</p>
                    </div>
                  )}
                </div>

                {/* Upload New Image */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Upload New Image {item.uploadedImage && <span className="text-green-600">(✓ Uploaded)</span>}
                  </h4>
                  
                  {item.uploadedImage ? (
                    <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                      <img 
                        src={item.uploadedImage} 
                        alt={`Uploaded ${item.title}`}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                      <p className="text-xs text-green-700 truncate">{item.uploadedImage}</p>
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleImageUpload(item.id, file);
                          };
                          input.click();
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        Replace image
                      </button>
                    </div>
                  ) : (
                    <div className="border border-gray-200 border-dashed rounded-lg p-8 text-center">
                      {item.isUploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                          <p className="text-sm text-blue-600">Uploading...</p>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(item.id, file);
                            }}
                            className="hidden"
                            id={`image-${item.id}`}
                          />
                          <label
                            htmlFor={`image-${item.id}`}
                            className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            <Upload className="w-4 h-4" />
                            Upload Image
                          </label>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Final Import Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleFinalImport}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Importing Data...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Complete Import
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-8 bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden">
            {/* Header */}
            <div className={`p-6 border-b ${
              result.success
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {result.success ? (
                  <>
                    <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-green-900">Import Successful!</h3>
                      <p className="text-green-700 text-sm mt-1">{result.message || 'Data imported successfully'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-shrink-0 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                      <XCircle className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-red-900">Import Failed</h3>
                      <p className="text-red-700 text-sm mt-1">{result.message || 'There were errors during import'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Summary Stats */}
            {result.summary && (
              <div className="p-6 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Created */}
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{result.summary.created.total}</div>
                    <div className="text-sm text-gray-600 mt-1">Created</div>
                    <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                      <div>Destinations: {result.summary.created.destinations}</div>
                      <div>Categories: {result.summary.created.categories}</div>
                      <div>Attraction Pages: {result.summary.created.attractionPages}</div>
                      <div>Tours: {result.summary.created.tours}</div>
                    </div>
                  </div>

                  {/* Updated */}
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{result.summary.updated.total}</div>
                    <div className="text-sm text-gray-600 mt-1">Updated</div>
                    <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                      <div>Destinations: {result.summary.updated.destinations}</div>
                      <div>Categories: {result.summary.updated.categories}</div>
                      <div>Attraction Pages: {result.summary.updated.attractionPages}</div>
                      <div>Tours: {result.summary.updated.tours}</div>
                    </div>
                  </div>

                  {/* Errors */}
                  <div className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{result.summary.errors}</div>
                    <div className="text-sm text-gray-600 mt-1">Errors</div>
                    {result.summary.errors > 0 && (
                      <div className="text-xs text-red-600 mt-2">See details below</div>
                    )}
                  </div>

                  {/* Warnings */}
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600">{result.summary.warnings}</div>
                    <div className="text-sm text-gray-600 mt-1">Warnings</div>
                    {result.summary.warnings > 0 && (
                      <div className="text-xs text-orange-600 mt-2">See details below</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Errors Section */}
            {result.report?.errors && result.report.errors.length > 0 && (
              <div className="p-6 border-t border-red-200 bg-red-50">
                <h4 className="flex items-center gap-2 text-lg font-bold text-red-900 mb-4">
                  <XCircle className="w-5 h-5" />
                  Errors ({result.report.errors.length})
                </h4>
                <div className="space-y-3">
                  {result.report.errors.map((error, index) => (
                    <div key={index} className="bg-white rounded-lg border border-red-300 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-red-800 font-medium">{error}</p>
                          {error.includes('destinationName') && (
                            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                              <p className="text-sm text-blue-900 font-semibold mb-2">💡 How to fix:</p>
                              <p className="text-sm text-blue-800">Make sure your JSON uses <code className="bg-blue-100 px-1 rounded">"destinationName": "City Name"</code></p>
                              <p className="text-sm text-blue-800 mt-1">NOT <code className="bg-red-100 px-1 rounded">"destination": &#123;...&#125;</code></p>
                            </div>
                          )}
                          {error.includes('categoryNames') && (
                            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                              <p className="text-sm text-blue-900 font-semibold mb-2">💡 How to fix:</p>
                              <p className="text-sm text-blue-800">Make sure your JSON uses <code className="bg-blue-100 px-1 rounded">"categoryNames": ["Category 1", "Category 2"]</code></p>
                              <p className="text-sm text-blue-800 mt-1">NOT <code className="bg-red-100 px-1 rounded">"category": &#123;...&#125;</code></p>
                            </div>
                          )}
                          {error.includes('not found') && error.includes('Destination') && (
                            <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                              <p className="text-sm text-yellow-900 font-semibold mb-2">💡 Suggestion:</p>
                              <p className="text-sm text-yellow-800">The destination doesn't exist in the database. Either:</p>
                              <ul className="text-sm text-yellow-800 mt-1 ml-4 list-disc">
                                <li>Add it to the "destinations" array in your JSON first</li>
                                <li>Check the spelling matches exactly (case-sensitive)</li>
                              </ul>
                            </div>
                          )}
                          {error.includes('not found') && error.includes('categor') && (
                            <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                              <p className="text-sm text-yellow-900 font-semibold mb-2">💡 Suggestion:</p>
                              <p className="text-sm text-yellow-800">The category doesn't exist in the database. Either:</p>
                              <ul className="text-sm text-yellow-800 mt-1 ml-4 list-disc">
                                <li>Add it to the "categories" array in your JSON first</li>
                                <li>Check the spelling matches exactly (case-sensitive)</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings Section */}
            {result.report?.warnings && result.report.warnings.length > 0 && (
              <div className="p-6 border-t border-orange-200 bg-orange-50">
                <h4 className="flex items-center gap-2 text-lg font-bold text-orange-900 mb-4">
                  <AlertCircle className="w-5 h-5" />
                  Warnings ({result.report.warnings.length})
                </h4>
                <div className="space-y-2">
                  {result.report.warnings.map((warning, index) => (
                    <div key={index} className="bg-white rounded-lg border border-orange-300 p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <p className="text-orange-800 text-sm flex-1">{warning}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success details */}
            {result.success && result.report?.wipedData && (
              <div className="p-4 bg-yellow-50 border-t border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Note: Previous data was wiped before import</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Step 1 UI
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Step 1: Upload JSON Data</h1>
        <p className="text-gray-600">Upload or paste your JSON data to get started</p>
        
        {/* Progress indicator */}
        <div className="flex items-center gap-4 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              1
            </div>
            <span className="text-blue-600 font-medium">JSON Data</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center text-sm font-semibold">
              2
            </div>
            <span className="text-gray-500">Upload Images</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* File Upload Area */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload JSON File
            </h2>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Drag and drop a JSON file here, or click to select
              </p>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select File
              </label>
            </div>
          </div>

          {/* Sample Data Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadSample}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Download Sample
              </button>
              <button
                onClick={loadSampleData}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <FileText className="w-4 h-4" />
                Load Sample Data
              </button>
              <button
                onClick={clearData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={parseJsonAndContinue}
            disabled={!jsonData.trim() || !validateJson()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Continue to Images
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Right Column - JSON Editor */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">JSON Data</h3>
            <textarea
              value={jsonData}
              onChange={(e) => {
                setJsonData(e.target.value);
                setResult(null);
              }}
              placeholder="Paste your JSON data here or upload a file..."
              className="w-full h-80 p-3 border rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-2 flex items-center gap-2">
              {jsonData && (
                validateJson() ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Valid JSON
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600 text-sm">
                    <XCircle className="w-4 h-4" />
                    Invalid JSON
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Documentation */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          How It Works
        </h3>
        <div className="text-blue-800 space-y-2 text-sm">
          <p><strong>Step 1:</strong> Upload or paste your JSON data with destinations, categories, and tours</p>
          <p><strong>Step 2:</strong> Upload specific images for each destination and tour from your JSON</p>
          <p><strong>Step 3:</strong> Complete the import with properly mapped images</p>
          <p className="mt-3"><strong>Note:</strong> You can leave image fields empty in your JSON - you'll assign them in Step 2</p>
        </div>
      </div>
    </div>
  );
}

export default withAuth(DataImportPage, { permissions: ['manageTours'] });