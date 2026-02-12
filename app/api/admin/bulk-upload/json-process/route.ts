import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';

export async function POST(req: NextRequest) {
    const auth = await requireAdminAuth(req);
    if (auth instanceof NextResponse) return auth;

    await dbConnect();

    try {
        const { type, data } = await req.json();

        if (!data || !Array.isArray(data)) {
            return NextResponse.json({ success: false, error: 'Invalid data format. An array is expected.' }, { status: 400 });
        }

        const results = { created: 0, updated: 0, errors: [] as string[] };
        const missingImages = [] as any[];

        switch (type) {
            case 'tours':
                for (const item of data) {
                    try {
                        if (!item.slug || !item.destinationName || !item.categoryName) {
                            results.errors.push(`Skipping tour: Missing slug, destinationName, or categoryName for "${item.title || 'Untitled'}"`);
                            continue;
                        }
                        const destination = await Destination.findOne({ name: item.destinationName }).lean();
                        const category = await Category.findOne({ name: item.categoryName }).lean();

                        if (!destination) {
                            results.errors.push(`Destination not found for tour "${item.title}": ${item.destinationName}`);
                            continue;
                        }
                        if (!category) {
                            results.errors.push(`Category not found for tour "${item.title}": ${item.categoryName}`);
                            continue;
                        }

                        const doc = { ...item, destination: (destination as any)._id, category: (category as any)._id };
                        delete doc.destinationName;
                        delete doc.categoryName;
                        
                        const existing = await Tour.findOne({ slug: item.slug });
                        await Tour.updateOne({ slug: item.slug }, doc, { upsert: true, runValidators: true });
                        
                        if (existing) {
                            results.updated++;
                        } else {
                            results.created++;
                            const newDoc = await Tour.findOne({ slug: item.slug }); // Refetch to get _id
                            if (newDoc && !newDoc.image) {
                                missingImages.push({ _id: newDoc._id, name: newDoc.title, imageField: 'image' });
                            }
                        }
                    } catch (e: any) { results.errors.push(`Tour "${item.title}": ${e.message}`); }
                }
                break;
                
            case 'destinations':
                for (const item of data) {
                    try {
                        if (!item.name || !item.description) {
                            results.errors.push(`Skipping destination: Missing name or description.`);
                            continue;
                        }
                        const existing = await Destination.findOne({ slug: item.slug });
                        await Destination.updateOne({ slug: item.slug }, item, { upsert: true, runValidators: true });
                        
                        if (existing) {
                            results.updated++;
                        } else {
                            results.created++;
                            const newDoc = await Destination.findOne({ slug: item.slug });
                            if (newDoc && !newDoc.image) {
                                missingImages.push({ _id: newDoc._id, name: newDoc.name, imageField: 'image' });
                            }
                        }
                    } catch (e: any) { results.errors.push(`Destination "${item.name}": ${e.message}`); }
                }
                break;

            case 'attractions':
                 for (const item of data) {
                    try {
                        if (!item.title || !item.pageType) {
                            results.errors.push(`Skipping page: Missing title or pageType.`);
                            continue;
                        }
                        if (item.pageType === 'category' && !item.categoryName) {
                            results.errors.push(`Skipping category page "${item.title}": Missing categoryName.`);
                            continue;
                        }

                        let doc = { ...item };
                        if (item.pageType === 'category') {
                             const category = await Category.findOne({ name: item.categoryName }).lean();
                             if (!category) {
                                results.errors.push(`Category not found for page "${item.title}": ${item.categoryName}`);
                                continue;
                             }
                             doc.categoryId = (category as any)._id;
                             delete doc.categoryName;
                        }

                        const existing = await AttractionPage.findOne({ slug: item.slug });
                        await AttractionPage.updateOne({ slug: item.slug }, doc, { upsert: true, runValidators: true });
                        
                        if (existing) {
                            results.updated++;
                        } else {
                            results.created++;
                            const newDoc = await AttractionPage.findOne({ slug: item.slug });
                            if (newDoc && !newDoc.heroImage) {
                                missingImages.push({ _id: newDoc._id, name: newDoc.title, imageField: 'heroImage' });
                            }
                        }
                    } catch (e: any) { results.errors.push(`Attraction Page "${item.title}": ${e.message}`); }
                }
                break;

            default:
                return NextResponse.json({ success: false, error: 'Invalid upload type specified.' }, { status: 400 });
        }

        return NextResponse.json({ success: true, results, missingImages });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
    }
}