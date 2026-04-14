// Author profile page — Issue #7.
//
// Before this route existed, the "More articles" link inside BlogPostClient
// pointed at /author/{slug} and returned a 404 because nothing handled the
// path (Next.js would fall through to the catch-all `/[slug]` tour route,
// which in turn 404'd). Now `/author` is a reserved path in middleware and
// this file renders a lightweight author profile with every published post
// the author has written.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getTenantFromRequest, getTenantPublicConfig, buildTenantQuery } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

type BlogSummary = {
  _id: string;
  slug?: string;
  title?: string;
  excerpt?: string;
  coverImage?: string;
  featuredImage?: string;
  publishedAt?: string | Date;
  createdAt?: string | Date;
};

type AuthorProfile = {
  name: string;
  slug: string;
  avatar?: string;
  bio?: string;
};

function decodeAuthorSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function slugifyAuthor(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function loadAuthorPosts(authorSlug: string, tenantId: string) {
  await dbConnect();

  // The Blog model stores the author as a plain string — there's no Author
  // collection — so we look up posts whose author (by display name OR
  // slugified name) matches the URL slug. Handles both "EEO", "eeo",
  // "Egypt Excursions Online" and "egypt-excursions-online" cleanly.
  const decoded = decodeAuthorSlug(authorSlug);
  const candidates = new Set<string>([
    decoded,
    decoded.toLowerCase(),
    decoded.replace(/-/g, ' '),
    decoded.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  ]);
  const regex = new RegExp(
    `^(${Array.from(candidates)
      .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')})$`,
    'i',
  );

  const query = buildTenantQuery(
    { status: 'published', author: { $regex: regex } },
    tenantId,
  );

  const posts = await Blog.find(query)
    .select('_id slug title excerpt coverImage featuredImage publishedAt createdAt author authorAvatar authorBio')
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(50)
    .lean();

  if (posts.length === 0) return null;

  const first = posts[0] as any;
  const authorName = first.author || decoded;

  const profile: AuthorProfile = {
    name: authorName,
    slug: slugifyAuthor(authorName),
    avatar: first.authorAvatar,
    bio: first.authorBio,
  };

  return { profile, posts: posts as unknown as BlogSummary[] };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenantId = await getTenantFromRequest();
  const tenantConfig = await getTenantPublicConfig(tenantId);
  const siteName = tenantConfig?.name || 'Egypt Excursions Online';
  const decoded = decodeAuthorSlug(slug);

  return {
    title: `${decoded} | ${siteName}`,
    description: `Articles and travel guides written by ${decoded} on ${siteName}.`,
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenantId = await getTenantFromRequest();
  const data = await loadAuthorPosts(slug, tenantId);
  if (!data) notFound();

  const { profile, posts } = data;

  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <header className="flex items-start gap-6 mb-10 pb-10 border-b border-slate-200">
            {profile.avatar ? (
              <Image
                src={profile.avatar}
                alt={profile.name}
                width={112}
                height={112}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm uppercase tracking-wide text-indigo-600 font-semibold mb-1">Author</p>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{profile.name}</h1>
              {profile.bio ? (
                <p className="text-slate-600 leading-relaxed">{profile.bio}</p>
              ) : (
                <p className="text-slate-600 leading-relaxed">
                  {profile.name} writes travel guides and tour tips for our readers.
                  Browse {posts.length} {posts.length === 1 ? 'article' : 'articles'} below.
                </p>
              )}
            </div>
          </header>

          <h2 className="text-2xl font-semibold text-slate-900 mb-6">
            All articles by {profile.name}
          </h2>

          <ul className="space-y-6">
            {posts.map((post) => {
              const cover = post.coverImage || post.featuredImage;
              const date = post.publishedAt || post.createdAt;
              return (
                <li
                  key={String(post._id)}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition"
                >
                  <Link href={`/blog/${post.slug}`} className="flex gap-4 p-4">
                    {cover && (
                      <div className="w-32 h-24 flex-shrink-0 relative rounded-lg overflow-hidden bg-slate-100">
                        <Image
                          src={cover}
                          alt={post.title || ''}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1 truncate">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="text-sm text-slate-600 line-clamp-2">{post.excerpt}</p>
                      )}
                      {date && (
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
