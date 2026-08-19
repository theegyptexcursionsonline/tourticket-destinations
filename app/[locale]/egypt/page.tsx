// app/egypt/page.tsx
import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CheckCircle } from 'lucide-react';
import { Tour, Category } from '@/types';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import AttractionPageModel from '@/lib/models/AttractionPage';
import EgyptHeroClient from './EgyptHeroClient';
import EgyptToursClient from './EgyptToursClient';
import { buildTenantQuery, getTenantFromRequest } from '@/lib/tenant';
import { attractionPagePath, contentPath } from '@/lib/content/contentUrl';

export const dynamic = 'force-dynamic';

/* ---------- Page Data ---------- */
const FEATURES = [
  'Sunset Nile cruises & private felucca rides',
  'Guided pyramid tours with expert Egyptologists',
  'Authentic cultural experiences & local cuisine',
  'Luxury & boutique accommodation options',
  'Private photography sessions at sunrise',
  'VIP concierge & customizable itineraries'
];

const GALLERY = [
  { src: '/pyramid.png', alt: 'Pyramids at sunrise' },
  { src: '/pyramid3.png', alt: 'Traditional felucca on the Nile' },
  { src: '/pyramid2.png', alt: 'Temple silhouette at twilight' },
  { src: '/image.png', alt: 'Local market and cultural scene' }
];

const FAQS = [
  { q: 'How long are the experiences?', a: 'Typical experiences are 1–3 days depending on the package; custom itineraries can be arranged.' },
  { q: 'Are pickups included?', a: 'Some plans include transfers — check the package details or contact our concierge for tailored transport.' },
  { q: 'Is this family friendly?', a: 'Yes — we offer family-friendly packages with activities suitable for children and seniors.' }
];

/* ---------- Server-side Data Fetching ---------- */
async function fetchTours(tenantId: string): Promise<Tour[]> {
  try {
    await dbConnect(tenantId);

    const tours = await TourModel.find(buildTenantQuery({ isPublished: true, archivedAt: null }, tenantId))
      .sort({ createdAt: -1 })
      .limit(12)
      .lean()
      .exec();

    // Convert MongoDB documents to plain objects
    return JSON.parse(JSON.stringify(tours));
  } catch (error) {
    console.error('Failed to fetch tours:', error);
    return [];
  }
}

async function fetchCategories(tenantId: string): Promise<Category[]> {
  try {
    await dbConnect(tenantId);

    const categoryQuery = buildTenantQuery({ isPublished: true, archivedAt: null, heroImage: { $exists: true, $ne: '' } }, tenantId);
    const tourQuery = buildTenantQuery({ isPublished: true, archivedAt: null }, tenantId);

    const [categories, categoryCounts] = await Promise.all([
      CategoryModel.find(categoryQuery)
        .sort({ order: 1, name: 1 })
        .lean()
        .exec(),
      TourModel.aggregate([
        { $match: tourQuery },
        { $unwind: '$category' },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map(
      categoryCounts.map((item: { _id: unknown; count: number }) => [
        String(item._id),
        Number(item.count) || 0,
      ])
    );

    const categoriesWithCounts = categories.map((category) => ({
      ...category,
      tourCount: countMap.get(String(category._id)) || 0,
    }));

    // Filter published categories with tours
    const publishedCategories = categoriesWithCounts.filter(
      (c: any) => (c.tourCount || 0) > 0
    );

    // Convert MongoDB documents to plain objects
    return JSON.parse(JSON.stringify(publishedCategories.slice(0, 8)));
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}

async function fetchAttractions(tenantId: string) {
  try {
    await dbConnect(tenantId);
    const attractions = await AttractionPageModel.find(buildTenantQuery({
      pageType: 'attraction',
      isPublished: true,
      archivedAt: null,
      heroImage: { $exists: true, $ne: '' },
    }, tenantId)).sort({ featured: -1, createdAt: -1 }).limit(8).lean().exec();
    return JSON.parse(JSON.stringify(attractions));
  } catch (error) {
    console.error('Failed to fetch attractions:', error);
    return [];
  }
}

/* ---------- Server Component (Main Page) ---------- */
export default async function AboutEgyptLanding() {
  const tenantId = await getTenantFromRequest();

  // Fetch data in parallel on the server
  const [tours, categories, attractions] = await Promise.all([
    fetchTours(tenantId),
    fetchCategories(tenantId),
    fetchAttractions(tenantId),
  ]);

  return (
    <>
      <Header />

      <main className="bg-white text-gray-800">
        {/* Hero - Client Component for interactivity */}
        <EgyptHeroClient />

        {/* Vision */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Vision</h2>
              <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                We craft travel experiences that combine the grandeur of Egypt's ancient wonders with modern comforts and curated local encounters.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                From private Nile cruises to exclusive after-hours temple access, our team builds tailored journeys that become lifelong memories.
              </p>
            </div>

            <div className="w-full h-80 relative rounded-2xl overflow-hidden shadow-xl">
              <Image src="/hero2.jpg" alt="Felucca on Nile" fill className="object-cover" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What to Expect</h2>
              <p className="text-lg text-gray-600">Experiences designed for curious travelers and discerning guests.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-md"
                >
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle className="h-7 w-7 text-[var(--primary-color)]" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-800">{f}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Step Inside</h2>
              <p className="text-gray-600">Moments from curated experiences — sunrise, sunset and in-between.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {GALLERY.map((img, idx) => (
                <div
                  key={idx}
                  className="w-full h-64 relative rounded-xl overflow-hidden shadow-lg"
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Explore by Category</h2>
              <p className="text-gray-600 text-lg">Find the perfect experience tailored to your interests.</p>
            </div>

            {categories.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((category) => (
                  <Link
                    key={category._id}
                    href={contentPath('category', category.slug, (category as any).urlType, null, (category as any).parentPage?.slug)}
                    className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                  >
                    <div className="relative h-36 w-full bg-gray-100">
                      <Image src={(category as any).heroImage} alt={category.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    </div>
                    <div className="p-5 text-center">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[var(--primary-color)] transition-colors duration-300">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {category.tourCount || 0} {category.tourCount === 1 ? 'tour' : 'tours'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No categories available at the moment.</p>
              </div>
            )}
          </div>
        </section>

        {attractions.length > 0 && (
          <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Discover Top Attractions</h2>
                <p className="text-gray-600 text-lg">Explore published highlights selected for this destination.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {attractions.map((attraction: any) => (
                  <Link key={attraction._id} href={attractionPagePath(attraction.slug, attraction.pageType, attraction.urlType, null, attraction.parentPage?.slug)} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl">
                    <div className="relative h-44"><Image src={attraction.heroImage} alt={attraction.title} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-105" /></div>
                    <div className="p-5"><h3 className="font-bold text-gray-900 group-hover:text-[var(--primary-color)]">{attraction.title}</h3></div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Tour Listings Section */}
        <section id="tours" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Featured Tours & Experiences</h2>
              <p className="text-gray-600 text-lg">Discover authentic Egyptian experiences curated for you.</p>
            </div>

            {/* Client Component for Tours with Booking Interaction */}
            <EgyptToursClient tours={tours} />
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">FAQ</h2>
              <p className="text-gray-600">Common questions answered</p>
            </div>

            <div className="space-y-4">
              {FAQS.map((f, i) => (
                <details key={i} className="bg-white rounded-xl p-5 shadow-md">
                  <summary className="cursor-pointer text-lg font-medium text-gray-800 list-none">
                    {f.q}
                  </summary>
                  <div className="mt-3 text-gray-600">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-950 py-20">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-4xl">
              Ready for a Timeless Adventure?
            </h2>
            <p className="mb-8 text-slate-200">
              Book now to secure your dates. Our team will tailor an experience to your wishes.
            </p>
            <div>
              <Link
                href="/tours"
                className="inline-block rounded-full bg-[var(--primary-color)] px-10 py-4 text-lg font-bold text-white shadow-xl transition-opacity hover:opacity-90"
              >
                Book Your Experience
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
