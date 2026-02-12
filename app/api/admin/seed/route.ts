// app/api/admin/seed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';
import AttractionPage from '@/lib/models/AttractionPage';

// Utility function to generate URL-friendly slugs
const generateSlug = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// Interface definitions for better type safety
interface SeedDestination {
  name: string;
  slug?: string;
  country?: string;
  image?: string;
  images?: string[];
  description: string;
  longDescription?: string;
  coordinates?: { lat: number; lng: number };
  currency?: string;
  timezone?: string;
  bestTimeToVisit?: string;
  highlights?: string[];
  thingsToDo?: string[];
  localCustoms?: string[];
  visaRequirements?: string;
  languagesSpoken?: string[];
  emergencyNumber?: string;
  averageTemperature?: { summer: string; winter: string };
  climate?: string;
  weatherWarnings?: string[];
  featured?: boolean;
  isPublished?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  tags?: string[];
}

interface SeedCategory {
  name: string;
  slug?: string;
  description?: string;
  longDescription?: string;
  heroImage?: string;
  images?: string[];
  highlights?: string[];
  features?: string[];
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  color?: string;
  icon?: string;
  order?: number;
  isPublished?: boolean;
  featured?: boolean;
}

interface SeedAttractionPage {
  title: string;
  slug?: string;
  description: string;
  longDescription?: string;
  pageType: 'attraction' | 'category';
  categoryName?: string; // Will be resolved to categoryId
  heroImage?: string;
  images?: string[];
  highlights?: string[];
  features?: string[];
  gridTitle: string;
  gridSubtitle?: string;
  showStats?: boolean;
  itemsPerRow?: number;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  isPublished?: boolean;
  featured?: boolean;
}

interface SeedTour {
  // Basic information
  title: string;
  slug?: string;
  description: string;
  longDescription?: string;
  price: number;
  discountPrice?: number;
  duration: string;
  maxGroupSize: number;
  destinationName: string;
  categoryNames: string[];

  // Basic tour details
  location?: string;
  meetingPoint?: string;
  languages?: string[];
  ageRestriction?: string;
  cancellationPolicy?: string;
  operatedBy?: string;

  // Status
  featured?: boolean;
  isFeatured?: boolean;
  isPublished?: boolean;
  difficulty?: string;

  // Media
  image: string;
  images?: string[];

  // Lists
  highlights?: string[];
  includes?: string[];
  whatsIncluded?: string[];
  whatsNotIncluded?: string[];
  tags?: string[];

  // Practical information
  whatToBring?: string[];
  whatToWear?: string[];
  physicalRequirements?: string;
  accessibilityInfo?: string[];
  groupSize?: { min: number; max: number };
  transportationDetails?: string;
  mealInfo?: string;
  weatherPolicy?: string;
  photoPolicy?: string;
  tipPolicy?: string;
  healthSafety?: string[];
  culturalInfo?: string[];
  seasonalVariations?: string;
  localCustoms?: string[];

  // SEO
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];

  // Complex objects with full support
  itinerary?: Array<{
    day?: number;
    time?: string;
    title: string;
    description: string;
    duration?: string;
    location?: string;
    includes?: string[];
    icon?: string;
  }>;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  bookingOptions?: Array<{
    type: string;
    label: string;
    price: number;
    originalPrice?: number;
    description?: string;
    duration?: string;
    languages?: string[];
    highlights?: string[];
    groupSize?: string;
    difficulty?: string;
    badge?: string;
    discount?: number;
    isRecommended?: boolean;
  }>;
  addOns?: Array<{
    name: string;
    description: string;
    price: number;
    category?: string;
  }>;
}

interface SeedData {
  destinations?: SeedDestination[];
  categories?: SeedCategory[];
  attractionPages?: SeedAttractionPage[];
  tours?: SeedTour[];
  wipeData?: boolean;
  updateMode?: 'insert' | 'upsert' | 'replace';
}

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

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (auth instanceof NextResponse) return auth;

  console.log('\n🚀 ============================================');
  console.log('   DATA IMPORT PROCESS STARTED');
  console.log('============================================\n');
  await dbConnect();

  try {
    const seedData: SeedData = await request.json();
    const { destinations, categories, attractionPages, tours, wipeData, updateMode = 'upsert' } = seedData;

    console.log('📦 Received data summary:');
    console.log(`   Destinations: ${destinations?.length || 0}`);
    console.log(`   Categories: ${categories?.length || 0}`);
    console.log(`   Attraction Pages: ${attractionPages?.length || 0}`);
    console.log(`   Tours: ${tours?.length || 0}`);
    console.log(`   Wipe data: ${wipeData ? 'YES' : 'NO'}`);
    console.log(`   Update mode: ${updateMode.toUpperCase()}\n`);

    const report: ImportReport = {
      wipedData: false,
      destinationsCreated: 0,
      categoriesCreated: 0,
      attractionPagesCreated: 0,
      toursCreated: 0,
      destinationsUpdated: 0,
      categoriesUpdated: 0,
      attractionPagesUpdated: 0,
      toursUpdated: 0,
      errors: [],
      warnings: [],
    };

    // Step 1: Conditionally wipe existing data
    if (wipeData) {
      console.log('🗑️  WIPING EXISTING DATA...');
      try {
        await Promise.all([
          Tour.deleteMany({}),
          Category.deleteMany({}),
          Destination.deleteMany({}),
        ]);
        report.wipedData = true;
        console.log('   ✅ Successfully wiped existing data\n');
      } catch (wipeError: any) {
        console.error('   ❌ Error wiping data:', wipeError.message);
        console.error('   Stack:', wipeError.stack);
        report.errors.push(`Error wiping existing data: ${wipeError.message}`);
      }
    }

    // Step 2: Process destinations with upsert logic
    if (destinations && destinations.length > 0) {
      console.log(`📍 PROCESSING ${destinations.length} DESTINATIONS (${updateMode} mode)...\n`);
      
      let destinationsCreated = 0;
      let destinationsUpdated = 0;

      for (const destData of destinations) {
        try {
          if (!destData.name?.trim()) {
            report.warnings.push('Skipped destination with missing name');
            continue;
          }

          const destinationDoc = {
            name: destData.name.trim(),
            slug: destData.slug?.trim() || generateSlug(destData.name),
            country: destData.country?.trim(),
            image: destData.image || '/placeholder-destination.jpg',
            images: destData.images,
            description: destData.description?.trim() || '',
            longDescription: destData.longDescription?.trim(),
            coordinates: destData.coordinates,
            currency: destData.currency?.trim(),
            timezone: destData.timezone?.trim(),
            bestTimeToVisit: destData.bestTimeToVisit?.trim(),
            highlights: destData.highlights,
            thingsToDo: destData.thingsToDo,
            localCustoms: destData.localCustoms,
            visaRequirements: destData.visaRequirements?.trim(),
            languagesSpoken: destData.languagesSpoken,
            emergencyNumber: destData.emergencyNumber?.trim(),
            averageTemperature: destData.averageTemperature,
            climate: destData.climate?.trim(),
            weatherWarnings: destData.weatherWarnings,
            featured: destData.featured ?? false,
            isPublished: destData.isPublished ?? true,
            metaTitle: destData.metaTitle?.trim(),
            metaDescription: destData.metaDescription?.trim(),
            keywords: destData.keywords,
            tags: destData.tags,
            updatedAt: new Date(),
          };

          const existingDestination = await Destination.findOne({
            $or: [
              { slug: destinationDoc.slug },
              { name: destinationDoc.name }
            ]
          });

          if (existingDestination && (updateMode === 'upsert' || updateMode === 'replace')) {
            // Update existing destination
            await Destination.findByIdAndUpdate(
              existingDestination._id,
              { $set: destinationDoc },
              { runValidators: true }
            );
            destinationsUpdated++;
            console.log(`Updated destination: ${destinationDoc.name}`);
          } else if (!existingDestination || updateMode === 'insert') {
            // Create new destination
            await Destination.create({
              ...destinationDoc,
              createdAt: new Date()
            });
            destinationsCreated++;
            console.log(`Created destination: ${destinationDoc.name}`);
          } else {
            report.warnings.push(`Destination "${destData.name}" already exists (skipped)`);
          }
        } catch (destError: any) {
          console.error(`\n❌ ERROR processing destination "${destData.name}":`, {
            name: destError.name,
            message: destError.message,
            code: destError.code,
            stack: destError.stack
          });
          if (destError.code === 11000) {
            const duplicateField = Object.keys(destError.keyPattern || {})[0] || 'field';
            report.warnings.push(`Destination "${destData.name}" already exists (duplicate ${duplicateField})`);
          } else if (destError.name === 'ValidationError') {
            const validationErrors = Object.entries(destError.errors || {})
              .map(([field, err]: [string, any]) => `${field}: ${err.message}`)
              .join('; ');
            report.errors.push(`Destination "${destData.name}" validation failed: ${validationErrors}`);
          } else {
            report.errors.push(`Destination "${destData.name}": ${destError.message}`);
          }
        }
      }

      report.destinationsCreated = destinationsCreated;
      report.destinationsUpdated = destinationsUpdated;
      console.log(`\n   ✅ Destinations complete: ${destinationsCreated} created, ${destinationsUpdated} updated\n`);
    }

    // Step 3: Process categories with upsert logic
    if (categories && categories.length > 0) {
      console.log(`📂 PROCESSING ${categories.length} CATEGORIES (${updateMode} mode)...\n`);
      
      let categoriesCreated = 0;
      let categoriesUpdated = 0;

      for (const catData of categories) {
        try {
          if (!catData.name?.trim()) {
            report.warnings.push('Skipped category with missing name');
            continue;
          }

          const categoryDoc = {
            name: catData.name.trim(),
            slug: catData.slug?.trim() || generateSlug(catData.name),
            description: catData.description?.trim(),
            longDescription: catData.longDescription?.trim(),
            heroImage: catData.heroImage?.trim(),
            images: catData.images,
            highlights: catData.highlights,
            features: catData.features,
            metaTitle: catData.metaTitle?.trim(),
            metaDescription: catData.metaDescription?.trim(),
            keywords: catData.keywords,
            color: catData.color?.trim(),
            icon: catData.icon?.trim(),
            order: catData.order,
            isPublished: catData.isPublished ?? true,
            featured: catData.featured ?? false,
            updatedAt: new Date(),
          };

          const existingCategory = await Category.findOne({
            $or: [
              { slug: categoryDoc.slug },
              { name: categoryDoc.name }
            ]
          });

          if (existingCategory && (updateMode === 'upsert' || updateMode === 'replace')) {
            // Update existing category
            await Category.findByIdAndUpdate(
              existingCategory._id,
              { $set: categoryDoc },
              { runValidators: true }
            );
            categoriesUpdated++;
            console.log(`Updated category: ${categoryDoc.name}`);
          } else if (!existingCategory || updateMode === 'insert') {
            // Create new category
            await Category.create({
              ...categoryDoc,
              createdAt: new Date()
            });
            categoriesCreated++;
            console.log(`Created category: ${categoryDoc.name}`);
          } else {
            report.warnings.push(`Category "${catData.name}" already exists (skipped)`);
          }
        } catch (catError: any) {
          console.error(`\n❌ ERROR processing category "${catData.name}":`, {
            name: catError.name,
            message: catError.message,
            code: catError.code,
            stack: catError.stack
          });
          if (catError.code === 11000) {
            const duplicateField = Object.keys(catError.keyPattern || {})[0] || 'field';
            report.warnings.push(`Category "${catData.name}" already exists (duplicate ${duplicateField})`);
          } else if (catError.name === 'ValidationError') {
            const validationErrors = Object.entries(catError.errors || {})
              .map(([field, err]: [string, any]) => `${field}: ${err.message}`)
              .join('; ');
            report.errors.push(`Category "${catData.name}" validation failed: ${validationErrors}`);
          } else {
            report.errors.push(`Category "${catData.name}": ${catError.message}`);
          }
        }
      }

      report.categoriesCreated = categoriesCreated;
      report.categoriesUpdated = categoriesUpdated;
      console.log(`\n   ✅ Categories complete: ${categoriesCreated} created, ${categoriesUpdated} updated\n`);
    }

    // Step 3.5: Process attraction pages with upsert logic
    if (attractionPages && attractionPages.length > 0) {
      console.log(`🎨 PROCESSING ${attractionPages.length} ATTRACTION PAGES (${updateMode} mode)...\n`);

      let attractionPagesCreated = 0;
      let attractionPagesUpdated = 0;

      // Load categories for reference mapping
      const allCategories = await Category.find({});
      const categoryMap = new Map(allCategories.map(cat => [cat.name.toLowerCase(), cat._id]));

      for (const pageData of attractionPages) {
        try {
          if (!pageData.title?.trim()) {
            report.warnings.push('Skipped attraction page with missing title');
            continue;
          }

          if (!pageData.description?.trim()) {
            report.warnings.push(`Skipped attraction page "${pageData.title}" with missing description`);
            continue;
          }

          if (!pageData.gridTitle?.trim()) {
            report.warnings.push(`Skipped attraction page "${pageData.title}" with missing gridTitle`);
            continue;
          }

          // Resolve categoryId if pageType is 'category'
          let categoryId = undefined;
          if (pageData.pageType === 'category' && pageData.categoryName) {
            const categoryNameLower = pageData.categoryName.toLowerCase();
            categoryId = categoryMap.get(categoryNameLower);

            if (!categoryId) {
              report.errors.push(`Attraction page "${pageData.title}": Category "${pageData.categoryName}" not found`);
              continue;
            }
          }

          const attractionPageDoc = {
            title: pageData.title.trim(),
            slug: pageData.slug?.trim() || generateSlug(pageData.title),
            description: pageData.description.trim(),
            longDescription: pageData.longDescription?.trim(),
            pageType: pageData.pageType,
            categoryId: categoryId,
            heroImage: pageData.heroImage?.trim(),
            images: pageData.images,
            highlights: pageData.highlights,
            features: pageData.features,
            gridTitle: pageData.gridTitle.trim(),
            gridSubtitle: pageData.gridSubtitle?.trim(),
            showStats: pageData.showStats ?? true,
            itemsPerRow: pageData.itemsPerRow ?? 4,
            metaTitle: pageData.metaTitle?.trim(),
            metaDescription: pageData.metaDescription?.trim(),
            keywords: pageData.keywords,
            isPublished: pageData.isPublished ?? false,
            featured: pageData.featured ?? false,
            updatedAt: new Date(),
          };

          const existingPage = await AttractionPage.findOne({
            $or: [
              { slug: attractionPageDoc.slug },
              { title: attractionPageDoc.title }
            ]
          });

          if (existingPage && (updateMode === 'upsert' || updateMode === 'replace')) {
            // Update existing page
            await AttractionPage.findByIdAndUpdate(
              existingPage._id,
              { $set: attractionPageDoc },
              { runValidators: true }
            );
            attractionPagesUpdated++;
            console.log(`   ✅ Updated attraction page: ${attractionPageDoc.title}`);
          } else if (!existingPage || updateMode === 'insert') {
            // Create new page
            await AttractionPage.create({
              ...attractionPageDoc,
              createdAt: new Date()
            });
            attractionPagesCreated++;
            console.log(`   ✅ Created attraction page: ${attractionPageDoc.title}`);
          } else {
            report.warnings.push(`Attraction page "${pageData.title}" already exists (skipped)`);
          }
        } catch (pageError: any) {
          console.error(`\n❌ ERROR processing attraction page "${pageData.title}":`, {
            name: pageError.name,
            message: pageError.message,
            code: pageError.code,
            stack: pageError.stack
          });
          if (pageError.code === 11000) {
            const duplicateField = Object.keys(pageError.keyPattern || {})[0] || 'field';
            report.warnings.push(`Attraction page "${pageData.title}" already exists (duplicate ${duplicateField})`);
          } else if (pageError.name === 'ValidationError') {
            const validationErrors = Object.entries(pageError.errors || {})
              .map(([field, err]: [string, any]) => `${field}: ${err.message}`)
              .join('; ');
            report.errors.push(`Attraction page "${pageData.title}" validation failed: ${validationErrors}`);
          } else {
            report.errors.push(`Attraction page "${pageData.title}": ${pageError.message}`);
          }
        }
      }

      report.attractionPagesCreated = attractionPagesCreated;
      report.attractionPagesUpdated = attractionPagesUpdated;
      console.log(`\n   ✅ Attraction pages complete: ${attractionPagesCreated} created, ${attractionPagesUpdated} updated\n`);
    }

    // Step 4: Process tours with upsert logic
    if (tours && tours.length > 0) {
      console.log(`🎫 PROCESSING ${tours.length} TOURS (${updateMode} mode)...\n`);
      
      try {
        // Fetch all destinations and categories for reference mapping
        const [allDestinations, allCategories] = await Promise.all([
          Destination.find({}),
          Category.find({}),
        ]);

        console.log(`   📚 Reference data loaded:`);
        console.log(`      Destinations: ${allDestinations.length}`);
        console.log(`      Categories: ${allCategories.length}\n`);

        // Create lookup maps
        const destinationMap = new Map(
          allDestinations.map((dest) => [dest.name.toLowerCase().trim(), dest._id])
        );
        const categoryMap = new Map(
          allCategories.map((cat) => [cat.name.toLowerCase().trim(), cat._id])
        );

        let toursCreated = 0;
        let toursUpdated = 0;

        for (const tourData of tours) {
          const { destinationName, categoryNames, featured, isFeatured, ...restOfTourData } = tourData;

          // Validate required fields with detailed logging
          console.log(`\n📋 Validating tour: "${tourData.title || 'UNTITLED'}"`);
          console.log(`   📄 Tour data keys:`, Object.keys(tourData).join(', '));

          if (!tourData.title?.trim()) {
            console.error('❌ Missing required field: title');
            report.errors.push('Skipped tour with missing title');
            continue;
          }

          // Check if destinationName exists
          if (!destinationName || destinationName === 'undefined') {
            console.error(`❌ Tour "${tourData.title}": Missing or invalid "destinationName" field`);
            console.error(`   💡 Your JSON has these fields: ${Object.keys(tourData).join(', ')}`);
            console.error(`   💡 Required format: "destinationName": "Hurghada" (not "destination": {...})`);
            report.errors.push(`Tour "${tourData.title}": Missing "destinationName" field. Found keys: ${Object.keys(tourData).join(', ')}`);
            continue;
          }

          if (!tourData.duration?.trim()) {
            console.error(`❌ Tour "${tourData.title}": Missing required field: duration`);
            report.errors.push(`Tour "${tourData.title}": Missing duration`);
            continue;
          }

          if (tourData.discountPrice === undefined && tourData.price === undefined) {
            console.error(`❌ Tour "${tourData.title}": Missing required field: price/discountPrice`);
            report.errors.push(`Tour "${tourData.title}": Missing price information`);
            continue;
          }

          // Find destination with detailed logging
          console.log(`   🔍 Looking for destination: "${destinationName}"`);
          const destinationId = destinationMap.get(destinationName?.toLowerCase().trim());
          if (!destinationId) {
            console.error(`   ❌ Destination NOT FOUND: "${destinationName}"`);
            console.error(`   📍 Available destinations:`, Array.from(destinationMap.keys()));
            report.errors.push(`Tour "${tourData.title}": Destination "${destinationName}" not found`);
            continue;
          }
          console.log(`   ✓ Destination found: ${destinationId}`);

          // Find categories with detailed logging
          console.log(`   🔍 Looking for categories:`, categoryNames);
          if (!categoryNames || categoryNames.length === 0) {
            console.error(`   ❌ No categories specified`);
            report.errors.push(`Tour "${tourData.title}": No categories specified`);
            continue;
          }

          const categoryIds = categoryNames
            .map((name: string) => categoryMap.get(name.toLowerCase().trim()))
            .filter(Boolean);

          if (categoryIds.length === 0) {
            console.error(`   ❌ NONE of the categories were found: ${categoryNames.join(', ')}`);
            console.error(`   📂 Available categories:`, Array.from(categoryMap.keys()));
            report.errors.push(`Tour "${tourData.title}": None of the specified categories were found: ${categoryNames.join(', ')}`);
            continue;
          }

          if (categoryIds.length !== categoryNames.length) {
            const foundCategories = categoryNames.filter((name: string) =>
              categoryMap.has(name.toLowerCase().trim())
            );
            const missingCategories = categoryNames.filter(name => !categoryMap.has(name.toLowerCase().trim()));
            console.warn(`   ⚠️ Some categories missing. Found: ${foundCategories.join(', ')}. Missing: ${missingCategories.join(', ')}`);
            report.warnings.push(
              `Tour "${tourData.title}": Only found categories: ${foundCategories.join(', ')}. Missing: ${missingCategories.join(', ')}`
            );
          }
          console.log(`   ✓ Categories found:`, categoryIds.length);

          // Prepare tour document with ALL fields
          const tourDoc = {
            // Basic info
            title: restOfTourData.title.trim(),
            slug: restOfTourData.slug?.trim() || generateSlug(restOfTourData.title),
            description: restOfTourData.description?.trim() || '',
            longDescription: restOfTourData.longDescription?.trim() || restOfTourData.description?.trim() || '',

            // Pricing
            price: restOfTourData.discountPrice || restOfTourData.price || 0,
            discountPrice: restOfTourData.discountPrice || restOfTourData.price || 0,
            originalPrice: restOfTourData.price && restOfTourData.discountPrice ? restOfTourData.price : undefined,

            // Duration and capacity
            duration: restOfTourData.duration.trim(),
            maxGroupSize: restOfTourData.maxGroupSize || 10,
            difficulty: restOfTourData.difficulty || 'Easy',

            // Basic tour details
            location: restOfTourData.location?.trim() || undefined,
            meetingPoint: restOfTourData.meetingPoint?.trim() || undefined,
            languages: Array.isArray(restOfTourData.languages) ? restOfTourData.languages.filter(Boolean) : undefined,
            ageRestriction: restOfTourData.ageRestriction?.trim() || undefined,
            cancellationPolicy: restOfTourData.cancellationPolicy?.trim() || undefined,
            operatedBy: restOfTourData.operatedBy?.trim() || undefined,

            // Relations
            destination: destinationId,
            category: categoryIds[0], // Use first category (schema expects singular)

            // Media
            image: restOfTourData.image || '/placeholder-tour.jpg',
            images: Array.isArray(restOfTourData.images) ? restOfTourData.images : [],

            // Lists
            highlights: Array.isArray(restOfTourData.highlights) ? restOfTourData.highlights.filter(Boolean) : [],
            includes: Array.isArray(restOfTourData.includes) ? restOfTourData.includes.filter(Boolean) : [],
            whatsIncluded: Array.isArray(restOfTourData.whatsIncluded) ? restOfTourData.whatsIncluded.filter(Boolean) : [],
            whatsNotIncluded: Array.isArray(restOfTourData.whatsNotIncluded) ? restOfTourData.whatsNotIncluded.filter(Boolean) : [],
            tags: Array.isArray(restOfTourData.tags) ? restOfTourData.tags : [],

            // Practical information
            whatToBring: Array.isArray(restOfTourData.whatToBring) ? restOfTourData.whatToBring.filter(Boolean) : undefined,
            whatToWear: Array.isArray(restOfTourData.whatToWear) ? restOfTourData.whatToWear.filter(Boolean) : undefined,
            physicalRequirements: restOfTourData.physicalRequirements?.trim() || undefined,
            accessibilityInfo: Array.isArray(restOfTourData.accessibilityInfo) ? restOfTourData.accessibilityInfo.filter(Boolean) : undefined,
            groupSize: restOfTourData.groupSize && typeof restOfTourData.groupSize === 'object' && restOfTourData.groupSize.min && restOfTourData.groupSize.max
              ? { min: Number(restOfTourData.groupSize.min), max: Number(restOfTourData.groupSize.max) }
              : undefined,
            transportationDetails: restOfTourData.transportationDetails?.trim() || undefined,
            mealInfo: restOfTourData.mealInfo?.trim() || undefined,
            weatherPolicy: restOfTourData.weatherPolicy?.trim() || undefined,
            photoPolicy: restOfTourData.photoPolicy?.trim() || undefined,
            tipPolicy: restOfTourData.tipPolicy?.trim() || undefined,
            healthSafety: Array.isArray(restOfTourData.healthSafety) ? restOfTourData.healthSafety.filter(Boolean) : undefined,
            culturalInfo: Array.isArray(restOfTourData.culturalInfo) ? restOfTourData.culturalInfo.filter(Boolean) : undefined,
            seasonalVariations: restOfTourData.seasonalVariations?.trim() || undefined,
            localCustoms: Array.isArray(restOfTourData.localCustoms) ? restOfTourData.localCustoms.filter(Boolean) : undefined,

            // SEO fields
            metaTitle: restOfTourData.metaTitle?.trim() || undefined,
            metaDescription: restOfTourData.metaDescription?.trim() || undefined,
            keywords: Array.isArray(restOfTourData.keywords) ? restOfTourData.keywords.filter(Boolean) : undefined,

            // Complex objects with full field support
            itinerary: Array.isArray(restOfTourData.itinerary)
              ? restOfTourData.itinerary.map((item: any) => ({
                  day: item.day || undefined,
                  time: item.time?.trim() || undefined,
                  title: item.title?.trim() || '',
                  description: item.description?.trim() || '',
                  duration: item.duration?.trim() || undefined,
                  location: item.location?.trim() || undefined,
                  includes: Array.isArray(item.includes) ? item.includes.filter(Boolean) : undefined,
                  icon: item.icon?.trim() || 'location',
                }))
              : [],
            faq: Array.isArray(restOfTourData.faqs) ? restOfTourData.faqs : [],
            bookingOptions: Array.isArray(restOfTourData.bookingOptions)
              ? restOfTourData.bookingOptions.map((option: any) => ({
                  type: option.type || 'Per Person',
                  label: option.label?.trim() || '',
                  price: Number(option.price) || 0,
                  originalPrice: option.originalPrice ? Number(option.originalPrice) : undefined,
                  description: option.description?.trim() || undefined,
                  duration: option.duration?.trim() || undefined,
                  languages: Array.isArray(option.languages) ? option.languages.filter(Boolean) : undefined,
                  highlights: Array.isArray(option.highlights) ? option.highlights.filter(Boolean) : undefined,
                  groupSize: option.groupSize?.trim() || undefined,
                  difficulty: option.difficulty?.trim() || undefined,
                  badge: option.badge?.trim() || undefined,
                  discount: option.discount !== undefined ? Number(option.discount) : undefined,
                  isRecommended: Boolean(option.isRecommended),
                }))
              : [],
            addOns: Array.isArray(restOfTourData.addOns)
              ? restOfTourData.addOns.map((addon: any) => ({
                  name: addon.name?.trim() || '',
                  description: addon.description?.trim() || '',
                  price: Number(addon.price) || 0,
                  category: addon.category?.trim() || undefined,
                }))
              : [],

            // Status and tags
            isFeatured: featured || isFeatured || false,
            isPublished: restOfTourData.isPublished !== false, // Default to true unless explicitly false

            // Availability with proper structure
            availability: {
              type: 'daily',
              availableDays: [0, 1, 2, 3, 4, 5, 6],
              slots: [{ time: '10:00', capacity: restOfTourData.maxGroupSize || 10 }],
              blockedDates: [],
            },

            // Timestamp
            updatedAt: new Date(),
          };

          try {
            // UPSERT LOGIC: Update if exists, create if new
            const existingTour = await Tour.findOne({
              $or: [
                { slug: tourDoc.slug },
                { title: tourDoc.title }
              ]
            });

            console.log(`   🔍 Tour lookup: ${existingTour ? '✓ FOUND (will update)' : '➕ NOT FOUND (will create)'}`);

            if (existingTour && (updateMode === 'upsert' || updateMode === 'replace')) {
              // UPDATE existing tour
              console.log(`   🔄 Updating tour ID: ${existingTour._id}`);
              console.log(`   📝 Fields being updated:`, Object.keys(tourDoc).length);

              const updatedTour = await Tour.findByIdAndUpdate(
                existingTour._id,
                { $set: tourDoc },
                {
                  new: true,
                  runValidators: true,
                  populate: [
                    { path: 'category', select: 'name slug' },
                    { path: 'destination', select: 'name slug' }
                  ]
                }
              );

              if (updatedTour) {
                toursUpdated++;
                console.log(`   ✅ Successfully updated tour: ${updatedTour.title}`);
              } else {
                console.error(`   ❌ Update returned null for tour: ${tourData.title}`);
                report.errors.push(`Tour "${tourData.title}": Update failed - returned null`);
              }

            } else if (!existingTour || updateMode === 'insert') {
              // CREATE new tour
              console.log(`   ➕ Creating new tour...`);
              const newTour = await Tour.create({
                ...tourDoc,
                createdAt: new Date()
              });

              if (newTour) {
                toursCreated++;
                console.log(`   ✅ Created tour: ${newTour.title} (ID: ${newTour._id})`);
              }
            } else {
              // Skip if exists and mode is insert-only
              console.warn(`   ⚠️ Tour exists - skipped (insert-only mode)`);
              report.warnings.push(`Tour "${tourData.title}" already exists (skipped due to insert-only mode)`);
            }

          } catch (tourError: any) {
            console.error(`\n❌ ERROR processing tour "${tourData.title}":`, {
              errorName: tourError.name,
              errorMessage: tourError.message,
              errorCode: tourError.code,
              keyPattern: tourError.keyPattern,
              keyValue: tourError.keyValue,
            });

            // Log validation errors with field details
            if (tourError.errors) {
              console.error(`   📋 Validation errors by field:`);
              Object.entries(tourError.errors).forEach(([field, err]: [string, any]) => {
                console.error(`      • ${field}: ${err.message} (${err.kind})`);
              });
            }

            // Log full stack trace for debugging
            if (process.env.NODE_ENV === 'development') {
              console.error(`   📚 Stack trace:`, tourError.stack);
            }

            if (tourError.code === 11000) {
              const duplicateField = Object.keys(tourError.keyPattern || {})[0] || 'field';
              const duplicateValue = tourError.keyValue ? tourError.keyValue[duplicateField] : 'unknown';
              report.warnings.push(`Tour "${tourData.title}" already exists (duplicate ${duplicateField}: "${duplicateValue}")`);
            } else if (tourError.name === 'ValidationError') {
              const validationErrors = Object.entries(tourError.errors || {})
                .map(([field, err]: [string, any]) => `${field}: ${err.message}`)
                .join('; ');
              report.errors.push(`Tour "${tourData.title}" validation failed: ${validationErrors}`);
            } else {
              report.errors.push(`Tour "${tourData.title}": ${tourError.message}`);
            }
          }
        }

        report.toursCreated = toursCreated;
        report.toursUpdated = toursUpdated;
        console.log(`\n   ✅ Tours complete: ${toursCreated} created, ${toursUpdated} updated\n`);

      } catch (tourError: any) {
        console.error('\n❌ CRITICAL ERROR in tour processing:', {
          name: tourError.name,
          message: tourError.message,
          stack: tourError.stack
        });
        report.errors.push(`Error in tour processing: ${tourError.message}`);
      }
    }

    // Summary logging
    console.log('\n📊 ============================================');
    console.log('   IMPORT SUMMARY');
    console.log('============================================');
    console.log(`\n   Created:`);
    console.log(`      Destinations: ${report.destinationsCreated}`);
    console.log(`      Categories: ${report.categoriesCreated}`);
    console.log(`      Attraction Pages: ${report.attractionPagesCreated}`);
    console.log(`      Tours: ${report.toursCreated}`);
    console.log(`\n   Updated:`);
    console.log(`      Destinations: ${report.destinationsUpdated}`);
    console.log(`      Categories: ${report.categoriesUpdated}`);
    console.log(`      Attraction Pages: ${report.attractionPagesUpdated}`);
    console.log(`      Tours: ${report.toursUpdated}`);
    console.log(`\n   Issues:`);
    console.log(`      Errors: ${report.errors.length}`);
    console.log(`      Warnings: ${report.warnings.length}`);

    if (report.errors.length > 0) {
      console.log(`\n   ❌ ERRORS:`);
      report.errors.forEach((err, i) => console.log(`      ${i + 1}. ${err}`));
    }

    if (report.warnings.length > 0) {
      console.log(`\n   ⚠️  WARNINGS:`);
      report.warnings.forEach((warn, i) => console.log(`      ${i + 1}. ${warn}`));
    }

    console.log('\n============================================\n');

    // Determine success based on whether any items were processed
    const _totalProcessed = report.destinationsCreated + report.destinationsUpdated +
                          report.categoriesCreated + report.categoriesUpdated +
                          report.attractionPagesCreated + report.attractionPagesUpdated +
                          report.toursCreated + report.toursUpdated;

    // Calculate totals
    const created = report.destinationsCreated + report.categoriesCreated + report.attractionPagesCreated + report.toursCreated;
    const updated = report.destinationsUpdated + report.categoriesUpdated + report.attractionPagesUpdated + report.toursUpdated;
    const hasErrors = report.errors.length > 0;
    const hasWarnings = report.warnings.length > 0;

    return NextResponse.json({
      success: !hasErrors, // Only success if no errors
      report,
      summary: {
        created: {
          destinations: report.destinationsCreated,
          categories: report.categoriesCreated,
          attractionPages: report.attractionPagesCreated,
          tours: report.toursCreated,
          total: created
        },
        updated: {
          destinations: report.destinationsUpdated,
          categories: report.categoriesUpdated,
          attractionPages: report.attractionPagesUpdated,
          tours: report.toursUpdated,
          total: updated
        },
        errors: report.errors.length,
        warnings: report.warnings.length,
      },
      message: hasErrors
        ? `Import failed: ${report.errors.length} error(s), ${report.warnings.length} warning(s)`
        : created + updated === 0
          ? 'No data was imported or updated. Check if destinations/categories exist for tours.'
          : `Successfully processed: ${created} created, ${updated} updated${hasWarnings ? ` (${report.warnings.length} warnings)` : ''}`,
    }, { status: hasErrors ? 400 : 200 });

  } catch (error: any) {
    console.error('\n💥 ============================================');
    console.error('   FATAL SEEDING ERROR');
    console.error('============================================');
    console.error(`\n   Error Name: ${error.name}`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   Error Code: ${error.code || 'N/A'}`);

    if (error.stack) {
      console.error(`\n   📚 Stack Trace:\n${error.stack}`);
    }

    console.error('\n============================================\n');

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || 'unknown field';
      const duplicateValue = error.keyValue ? error.keyValue[duplicateField] : 'unknown';
      console.error(`   ❌ Duplicate key error on field: ${duplicateField} = "${duplicateValue}"`);
      return NextResponse.json({
        success: false,
        error: `Duplicate ${duplicateField} detected: "${duplicateValue}". Consider using "updateMode: upsert" to update existing items.`,
        details: error.message,
      }, { status: 409 });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.entries(error.errors || {})
        .map(([field, err]: [string, any]) => `${field}: ${err.message} (${err.kind})`)
        .join('; ');
      console.error(`   ❌ Validation errors: ${validationErrors}`);
      return NextResponse.json({
        success: false,
        error: `Data validation failed: ${validationErrors}`,
      }, { status: 400 });
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      console.error(`   ❌ JSON parsing error at position ${error.message}`);
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON format in request body',
        details: error.message,
      }, { status: 400 });
    }

    // Generic server error
    console.error(`   ❌ Unexpected error: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: 'An unexpected server error occurred during import',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}