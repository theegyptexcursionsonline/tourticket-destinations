import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';

const findByName = async (Model: any, name: string) => {
    return Model.findOne({ name: new RegExp(`^${name}$`, 'i') }).lean();
};

export async function POST(req: NextRequest) {
    const auth = await requireAdminAuth(req);
    if (auth instanceof NextResponse) return auth;

    await dbConnect();

    try {
        const body = await req.json();
        const { destinations = [], categories = [], attractions = [], tours = [] } = body;

        const results = {
            destinations: { created: 0, updated: 0, errors: [] as string[] },
            categories: { created: 0, updated: 0, errors: [] as string[] },
            attractions: { created: 0, updated: 0, errors: [] as string[] },
            tours: { created: 0, updated: 0, errors: [] as string[] },
            missingImages: [] as any[]
        };

        // STEP 1: Process Destinations
        if (destinations.length > 0) {
            for (const item of destinations) {
                try {
                    const existing = await Destination.findOne({ slug: item.slug });
                    await Destination.updateOne({ slug: item.slug }, item, { upsert: true, runValidators: true });
                    
                    if (existing) {
                        results.destinations.updated++;
                    } else {
                        results.destinations.created++;
                        // Check if image is missing
                        const newDoc = await Destination.findOne({ slug: item.slug }).lean() as any;
                        if (newDoc && !newDoc.image) {
                            results.missingImages.push({
                                _id: newDoc._id.toString(),
                                name: newDoc.name,
                                imageField: 'image',
                                modelType: 'Destinations'
                            });
                        }
                    }
                } catch (e: any) {
                    results.destinations.errors.push(`Destination "${item.name}": ${e.message}`);
                }
            }
        }

        // STEP 2: Process Categories
        if (categories.length > 0) {
            for (const item of categories) {
                try {
                    const existing = await Category.findOne({ slug: item.slug });
                    await Category.updateOne({ slug: item.slug }, item, { upsert: true, runValidators: true });
                    existing ? results.categories.updated++ : results.categories.created++;
                } catch (e: any) {
                    results.categories.errors.push(`Category "${item.name}": ${e.message}`);
                }
            }
        }
        
        // STEP 3: Process Attraction Pages
        if (attractions.length > 0) {
            for (const item of attractions) {
                try {
                    // Build document without heroImage initially
                    let doc: any = { 
                        ...item,
                        // Set defaults for required fields if missing
                        gridTitle: item.gridTitle || item.title || 'Browse Tours',
                        gridSubtitle: item.gridSubtitle || item.description || '',
                        itemsPerRow: item.itemsPerRow || 4,
                        showStats: item.showStats !== undefined ? item.showStats : true,
                        isPublished: item.isPublished !== undefined ? item.isPublished : true,
                        featured: item.featured !== undefined ? item.featured : false,
                        highlights: item.highlights || [],
                        features: item.features || [],
                        images: item.images || [],
                        keywords: item.keywords || [],
                    };

                    // Remove heroImage if it's empty or undefined (don't include in doc)
                    if (!item.heroImage) {
                        delete doc.heroImage;
                    }

                    // Handle category reference for category-type pages
                    if (item.pageType === 'category' && item.categoryName) {
                        const categoryDoc = await findByName(Category, item.categoryName);
                        if (!categoryDoc) {
                           results.attractions.errors.push(
                               `Category "${item.categoryName}" not found for Attraction Page "${item.title}". ` +
                               `Please ensure the category exists first.`
                           );
                           continue;
                        }
                        doc.categoryId = categoryDoc._id;
                        delete doc.categoryName;
                    } else if (item.pageType === 'category' && !item.categoryName) {
                        results.attractions.errors.push(
                            `Attraction Page "${item.title}" is pageType 'category' but missing categoryName.`
                        );
                        continue;
                    }

                    // Remove categoryName from doc if pageType is not category
                    if (item.pageType !== 'category') {
                        delete doc.categoryName;
                        delete doc.categoryId;
                    }
                    
                    const existing = await AttractionPage.findOne({ slug: item.slug });
                    
                    // Use upsert with validation
                    await AttractionPage.updateOne(
                        { slug: item.slug }, 
                        doc, 
                        { 
                            upsert: true, 
                            runValidators: true,
                            setDefaultsOnInsert: true 
                        }
                    );
                    
                    if (existing) {
                        results.attractions.updated++;
                    } else {
                        results.attractions.created++;
                        
                        // Get the newly created document
                        const newDoc = await AttractionPage.findOne({ slug: item.slug }).lean();
                        
                        // Add to missing images if heroImage is not provided
                        if (newDoc && !newDoc.heroImage) {
                            results.missingImages.push({
                                _id: newDoc._id.toString(),
                                name: newDoc.title,
                                imageField: 'heroImage',
                                modelType: 'Attractions'
                            });
                        }
                    }
                } catch (e: any) {
                    // Enhanced error message with validation details
                    let errorMsg = `Attraction Page "${item.title}": ${e.message}`;
                    
                    if (e.name === 'ValidationError') {
                        const validationErrors = Object.values(e.errors)
                            .map((err: any) => err.message)
                            .join(', ');
                        errorMsg += ` | Validation: ${validationErrors}`;
                    }
                    
                    results.attractions.errors.push(errorMsg);
                    console.error('Attraction upload error:', errorMsg, 'Data:', item);
                }
            }
        }

        // STEP 4: Process Tours
        if (tours.length > 0) {
            for (const item of tours) {
                try {
                    if (!item.slug || !item.destinationName || !item.categoryName) {
                        results.tours.errors.push(
                            `Skipping tour: Missing slug, destinationName, or categoryName for "${item.title || 'Untitled'}"`
                        );
                        continue;
                    }

                    const destinationDoc = await findByName(Destination, item.destinationName);
                    const categoryDoc = await findByName(Category, item.categoryName);

                    if (!destinationDoc) {
                        results.tours.errors.push(`Destination "${item.destinationName}" not found for tour "${item.title}".`);
                        continue;
                    }
                    if (!categoryDoc) {
                        results.tours.errors.push(`Category "${item.categoryName}" not found for tour "${item.title}".`);
                        continue;
                    }

                    const doc = { ...item, destination: destinationDoc._id, category: categoryDoc._id };
                    delete doc.destinationName;
                    delete doc.categoryName;
                    
                    const existing = await Tour.findOne({ slug: item.slug });
                    await Tour.updateOne({ slug: item.slug }, doc, { upsert: true, runValidators: true });
                    
                    if (existing) {
                        results.tours.updated++;
                    } else {
                        results.tours.created++;
                        const newDoc = await Tour.findOne({ slug: item.slug }).lean();
                        if (newDoc && !newDoc.image) {
                            results.missingImages.push({
                                _id: newDoc._id.toString(),
                                name: newDoc.title,
                                imageField: 'image',
                                modelType: 'Tours'
                            });
                        }
                    }
                } catch (e: any) {
                    results.tours.errors.push(`Tour "${item.title}": ${e.message}`);
                }
            }
        }

        // Log summary to console
        console.log('Bulk Upload Summary:', {
            destinations: `${results.destinations.created} created, ${results.destinations.updated} updated, ${results.destinations.errors.length} errors`,
            categories: `${results.categories.created} created, ${results.categories.updated} updated, ${results.categories.errors.length} errors`,
            attractions: `${results.attractions.created} created, ${results.attractions.updated} updated, ${results.attractions.errors.length} errors`,
            tours: `${results.tours.created} created, ${results.tours.updated} updated, ${results.tours.errors.length} errors`,
            missingImages: results.missingImages.length
        });

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('Bulk upload error:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'An unexpected error occurred.', 
            details: error.message 
        }, { status: 500 });
    }
}