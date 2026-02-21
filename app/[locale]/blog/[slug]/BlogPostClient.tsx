'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import {
  Calendar,
  Clock,
  User,
  Tag,
  Eye,
  Heart,
  Share2,
  Facebook,
  Twitter,
  Copy,
  ChevronLeft,
  ArrowRight,
  Phone,
  MapPin,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';

type IBlog = any;
type ITour = any;
type IDestination = any;

interface Props {
  blog: IBlog;
  relatedPosts: IBlog[];
}

/**
 * BlogPostClient.tsx
 * Full file including AuthorCard and CommentsSection integrated.
 *
 * NOTES:
 * - Keep server-side sanitization for blog.content.
 * - Ensure next.config.js includes allowed image domains for featuredImage / avatars.
 */

function formatDate(date?: string | Date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ReadTimeText(blog: IBlog) {
  if (blog.readTimeText) return blog.readTimeText;
  if (blog.readTime) return `${blog.readTime} min read`;
  return '5 min read';
}

/* ---------- Share & Like (kept lightweight) ---------- */
function ShareAndLike({ blog }: { blog: IBlog }) {
  const [open, setOpen] = useState(false);
  const [likes, setLikes] = useState(blog?.likes ?? 0);
  const [liked, setLiked] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setUrl(window.location.href);
  }, []);

  const handleShare = (type: 'facebook' | 'twitter' | 'copy') => {
    if (!url) return;
    if (type === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener');
    } else if (type === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(blog.title)}`, '_blank', 'noopener');
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard'));
    }
    setOpen(false);
  };

  const handleLike = async () => {
    if (liked) return;
    try {
      await fetch(`/api/blog/${encodeURIComponent(blog.slug)}/like`, { method: 'POST' });
      setLikes((s: any) => s + 1);
      setLiked(true);
      toast.success('Thanks for liking!');
    } catch {
      toast.error('Unable to like right now');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleLike}
        aria-pressed={liked}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
          liked ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700 hover:bg-red-50'
        }`}
      >
        <Heart className="h-4 w-4" />
        <span>{likes}</span>
      </button>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-slate-100 hover:bg-indigo-50 transition"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>

        {open && (
          <div className="absolute end-0 z-40 mt-2 w-44 bg-white border rounded-lg shadow-lg p-2">
            <button onClick={() => handleShare('facebook')} className="w-full text-start px-2 py-2 rounded hover:bg-slate-50 flex items-center gap-2">
              <Facebook className="h-4 w-4 text-blue-600" /> Facebook
            </button>
            <button onClick={() => handleShare('twitter')} className="w-full text-start px-2 py-2 rounded hover:bg-slate-50 flex items-center gap-2">
              <Twitter className="h-4 w-4 text-sky-500" /> Twitter
            </button>
            <button onClick={() => handleShare('copy')} className="w-full text-start px-2 py-2 rounded hover:bg-slate-50 flex items-center gap-2">
              <Copy className="h-4 w-4" /> Copy link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Small Tour Card used in sidebar CTA ---------- */
function MiniTourCard({ tour }: { tour: ITour }) {
  return (
    <Link href={tour?.slug ? `/tour/${tour.slug}` : '#'} className="flex gap-3 items-center p-3 rounded-lg border hover:shadow-md transition bg-white">
      <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
        {tour?.image ? (
          <Image src={tour.image} alt={tour.title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-slate-100" />
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-slate-900 line-clamp-2">{tour?.title}</div>
        <div className="text-xs text-slate-500 mt-1">{tour?.duration || 'Half day'}</div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm font-medium text-indigo-600">{tour?.discountPrice ? `$${tour.discountPrice}` : tour?.price ? `$${tour.price}` : 'From $49'}</div>
          <div className="text-xs text-slate-500">per person</div>
        </div>
      </div>
    </Link>
  );
}

/* ---------- Author Card ---------- */
function AuthorCard({ author }: { author: any }) {
  if (!author) return null;

  const avatar = author.avatar || `/api/avatars/${encodeURIComponent(author.name || 'author')}`;

  return (
    <div className="bg-white rounded-2xl shadow p-6 flex gap-4 items-start">
      <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
        <Image src={avatar} alt={author.name} width={80} height={80} className="object-cover" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">{author.name}</h4>
            {author.role && <div className="text-xs text-slate-500 mt-1">{author.role}</div>}
          </div>
          <div className="text-xs text-slate-400">{author.postsCount ? `${author.postsCount} posts` : ''}</div>
        </div>

        {author.bio && <p className="mt-3 text-sm text-slate-600 leading-relaxed">{author.bio}</p>}

        <div className="mt-4 flex items-center gap-3">
          {author.twitter && (
            <a href={author.twitter} target="_blank" rel="noreferrer" className="text-sm font-medium text-sky-600 hover:underline inline-flex items-center gap-2">
              <Twitter className="h-4 w-4" /> Twitter
            </a>
          )}
          {author.facebook && (
            <a href={author.facebook} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline inline-flex items-center gap-2">
              <Facebook className="h-4 w-4" /> Facebook
            </a>
          )}
          {author.website && (
            <a href={author.website} target="_blank" rel="noreferrer" className="ms-auto text-sm text-indigo-600 font-medium hover:underline inline-flex items-center gap-2">
              Visit site <ArrowRight className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <Link href={`/author/${encodeURIComponent(author.slug || author.name)}`} className="px-3 py-2 border rounded-lg text-sm text-slate-700 hover:bg-slate-50">More articles</Link>
          <a href={`mailto:${author.email || ''}`} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Contact author</a>
        </div>
      </div>
    </div>
  );
}

/* ---------- Comments Section ---------- */
function CommentsSection({ slug }: { slug: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchComments = async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/comments`);
      if (!res.ok) throw new Error('Failed to load comments');
      const data = await res.json();
      setComments(Array.isArray(data) ? data : data.comments || []);
    } catch (e) {
      console.error(e);
      toast.error('Unable to load comments');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      toast.error('Please write a comment');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setLoading(true);

    const newComment = {
      _id: `tmp-${Date.now()}`,
      name,
      email,
      body,
      createdAt: new Date().toISOString(),
      avatar: `/api/avatars/${encodeURIComponent(name)}`,
      pending: true,
    };

    // optimistic add
    setComments((s) => [newComment, ...s]);
    setBody('');

    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, body }),
      });

      if (!res.ok) throw new Error('Failed to post comment');

      const saved = await res.json();
      // replace optimistic comment with server response (if provided)
      setComments((s) => s.map(c => c._id === newComment._id ? (saved.comment || saved || c) : c));
      toast.success('Comment submitted — will appear after moderation');
      setName(''); setEmail('');
    } catch (err) {
      // remove optimistic comment on error
      setComments((s) => s.filter(c => c._id !== newComment._id));
      toast.error('Unable to post comment right now');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Comments</h3>
        <div className="text-sm text-slate-500">{comments.length} discussion{comments.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name*" className="w-full px-3 py-2 rounded border text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="w-full px-3 py-2 rounded border text-sm" />
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your comment..." rows={4} className="w-full px-3 py-2 rounded border text-sm" />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
            {loading ? 'Posting...' : 'Post comment'}
          </button>
          <button type="button" onClick={() => { setBody(''); setName(''); setEmail(''); }} className="px-3 py-2 text-sm rounded border hover:bg-slate-50">Clear</button>
          <button type="button" onClick={fetchComments} disabled={refreshing} className="ms-auto px-3 py-2 text-sm rounded border hover:bg-slate-50">
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="text-xs text-slate-400">By posting you agree to our comment policy. Comments may be moderated.</div>
      </form>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 && <div className="text-sm text-slate-500">No comments yet — start the conversation.</div>}
        {comments.map((c) => (
          <div key={c._id} className={`flex gap-3 p-3 rounded-lg ${c.pending ? 'opacity-80 bg-slate-50' : 'bg-white'} border`}>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
              <Image src={c.avatar || `/api/avatars/${encodeURIComponent(c.name || 'guest')}`} alt={c.name} width={40} height={40} className="object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-slate-900">{c.name}</div>
                <div className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleString()}</div>
                {c.pending && <div className="ms-2 text-xs text-amber-600">Pending</div>}
              </div>
              <div className="text-sm text-slate-700 mt-2">{c.body}</div>

              {/* simple reply / actions */}
              <div className="mt-3 flex items-center gap-3 text-xs">
                <button className="text-slate-500 hover:text-slate-700">Like</button>
                <button className="text-slate-500 hover:text-slate-700">Reply</button>
                <button className="text-slate-500 hover:text-slate-700">Report</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Structured Sidebar component (travel-focused) ---------- */
function Sidebar({ blog }: { blog: IBlog }) {
  // prepare lists from blog.relatedTours / relatedDestinations
  const relatedTours: ITour[] = blog.relatedTours || [];
  const relatedDestinations: IDestination[] = blog.relatedDestinations || [];
  const popularDestinations: IDestination[] = blog.popularDestinations || relatedDestinations.slice(0, 4);

  return (
    <aside className="lg:col-span-1">
      <div className="space-y-6 sticky top-6">
        {/* Book a tour CTA */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h4 className="text-lg font-bold mb-3">Book a Tour</h4>
          <p className="text-sm text-slate-600 mb-4">Want to experience this? Book one of our recommended tours below, or contact our travel team to build a custom itinerary.</p>

          {relatedTours.length > 0 ? (
            <div className="space-y-3 mb-4">
              {relatedTours.slice(0, 2).map((t) => <MiniTourCard key={t._id || t.slug} tour={t} />)}
            </div>
          ) : (
            <div className="text-sm text-slate-500 mb-4">No direct tours linked — browse all tours <Link href="/tours" className="text-indigo-600 font-medium">here</Link>.</div>
          )}

          <Link href="/tours" className="block text-center w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
            Browse All Tours
          </Link>

          <div className="mt-3 text-xs text-slate-500">Need urgent help? <a className="text-indigo-600" href="tel:+201142255624"><Phone className="inline h-3 w-3 me-1" /> +20 11 42255624</a></div>
        </div>

        {/* Popular Destinations */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h4 className="font-semibold mb-3">Popular Destinations</h4>
          <div className="grid grid-cols-2 gap-3">
            {popularDestinations.length ? popularDestinations.map((d: any) => (
              <Link key={d._id || d.slug} href={`/destinations/${d.slug}`} className="flex flex-col items-center gap-2 p-2 rounded hover:bg-slate-50 transition">
                <div className="w-full h-20 rounded-lg overflow-hidden bg-slate-100">
                  {d.image ? <Image src={d.image} alt={d.name} width={300} height={200} className="object-cover" /> : <div className="w-full h-full bg-slate-100" />}
                </div>
                <div className="text-sm text-center font-medium text-slate-800">{d.name}</div>
              </Link>
            )) : (
              <div className="text-sm text-slate-500">No destinations available</div>
            )}
          </div>
        </div>

        {/* Travel Essentials */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h4 className="font-semibold mb-3">Travel Essentials</h4>
          <ul className="text-sm text-slate-600 space-y-2">
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 text-indigo-500 mt-1" /> Passport & visa check</li>
            <li className="flex items-start gap-2"><Star className="h-4 w-4 text-indigo-500 mt-1" /> Comfortable walking shoes</li>
            <li className="flex items-start gap-2"><Clock className="h-4 w-4 text-indigo-500 mt-1" /> Plan mornings & evenings</li>
          </ul>
        </div>

        {/* Newsletter */}
        <div className="bg-white rounded-2xl shadow p-6 text-center">
          <h4 className="font-semibold mb-2">Get Trip Ideas</h4>
          <p className="text-sm text-slate-600 mb-3">Subscribe for the best Egypt tours & insider tips.</p>
          <form onSubmit={(e) => { e.preventDefault(); toast.success('Subscribed'); }}>
            <input type="email" required placeholder="Your email" className="w-full px-3 py-2 rounded border mb-3 text-sm" />
            <button className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Subscribe</button>
          </form>
        </div>

      </div>
    </aside>
  );
}

/* ---------- Main component ---------- */
export default function BlogPostClient({ blog, relatedPosts }: Props) {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Back / breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-3">
          <Link href="/blog" className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600">
            <ChevronLeft className="h-4 w-4" /> Back to articles
          </Link>
        </div>
      </div>

      {/* Hero */}
      <header className="relative h-96 md:h-[420px]">
        {blog.featuredImage ? (
          <Image src={blog.featuredImage} alt={blog.title} fill className="object-cover" priority />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-emerald-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/10"></div>

        <div className="absolute start-0 end-0 bottom-0 p-6 md:p-12 container mx-auto max-w-4xl text-white">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-indigo-600/90 text-xs font-semibold">{blog.categoryDisplay || blog.category}</span>
            {blog.featured && <span className="px-3 py-1 rounded-full bg-yellow-500/90 text-xs font-semibold">Featured</span>}
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold leading-tight mb-4">{blog.title}</h1>

          <div className="flex items-center gap-4 text-sm text-slate-200">
            <div className="flex items-center gap-2"><User className="h-4 w-4" /> <span>{blog.author}</span></div>
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> <span>{formatDate(blog.publishedAt)}</span></div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> <span>{ReadTimeText(blog)}</span></div>
            <div className="flex items-center gap-2"><Eye className="h-4 w-4" /> <span>{blog.views ?? 0} views</span></div>
          </div>
        </div>
      </header>

      {/* Content + Sidebar */}
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <article className="lg:col-span-3 space-y-6">
            {/* Excerpt & actions */}
            <div className="bg-white rounded-2xl shadow p-6 flex items-start justify-between gap-4">
              <div className="prose prose-slate max-w-none">
                <p className="text-lg text-slate-700 font-medium">{blog.excerpt}</p>
              </div>
              <div>
                <ShareAndLike blog={blog} />
              </div>
            </div>

            {/* ---
              FIX #1: Applied prose classes AND content HTML to the SAME element.
              This is the correct way to apply Tailwind's typography styles.
              ---
            */}
            <div
              className="bg-white rounded-2xl shadow p-6 md:p-8 lg:p-10 prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />

            {/* Tags */}
            {Array.isArray(blog.tags) && blog.tags.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Tag className="h-4 w-4 text-indigo-600" /> Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map((t: string) => (
                    <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="px-3 py-1 bg-slate-100 rounded-full text-sm hover:bg-indigo-50">
                      #{t}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Author */}
            <div className="bg-white rounded-2xl shadow p-6">
              <AuthorCard author={blog.authorObject ?? {
                name: blog.author || 'Author',
                role: blog.authorRole,
                bio: blog.authorBio,
                avatar: blog.authorAvatar,
                twitter: blog.authorTwitter,
                facebook: blog.authorFacebook,
                website: blog.authorWebsite,
                slug: blog.authorSlug,
                postsCount: blog.authorPostsCount
              }} />
            </div>

            {/* Comments */}
            <div className="mt-6">
              <CommentsSection slug={blog.slug ?? blog._id ?? blog.id} />
            </div>

            {/* Related posts (inline) */}
            {relatedPosts && relatedPosts.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="font-semibold mb-4">Related Articles</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {relatedPosts.map((p) => (
                    <Link key={p._id} href={`/blog/${p.slug}`} className="block p-3 rounded-lg border hover:shadow-md transition bg-white">
                      <div className="text-sm font-semibold">{p.title}</div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2">{p.excerpt}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <Sidebar blog={blog} />
        </div>
      </main>

      {/* ---
        FIX #2: Added global styles to enhance the ".prose" classes.
        This provides the "perfect markdown blog" look you wanted,
        styling headings, code, blockquotes, and lists.
        ---
      */}
      <style jsx global>{`
        /* Enhance Tailwind Prose for a "Perfect" Markdown Blog */
        
        .prose h2 {
          font-size: 1.875rem; /* 3xl */
          font-weight: 700;
          letter-spacing: -0.025em;
          margin-top: 2em;
          margin-bottom: 1em;
          padding-bottom: 0.5em;
          border-bottom: 1px solid #e5e7eb; /* slate-200 */
        }
        .prose h3 {
          font-size: 1.5rem; /* 2xl */
          font-weight: 600;
          margin-top: 1.6em;
          margin-bottom: 0.8em;
        }
        .prose h4 {
          font-size: 1.25rem; /* xl */
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .prose p {
          line-height: 1.75;
          margin-top: 1.25em;
          margin-bottom: 1.25em;
        }
        .prose a {
          color: #4f46e5; /* indigo-600 */
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .prose a:hover {
          text-decoration: underline;
          color: #3730a3; /* indigo-800 */
        }
        .prose blockquote {
          border-left-width: 4px;
          border-left-color: #6366f1; /* indigo-500 */
          padding-left: 1.25rem;
          margin-top: 1.6em;
          margin-bottom: 1.6em;
          font-style: italic;
          color: #475569; /* slate-600 */
        }
        .prose blockquote p {
          margin: 0;
        }
        .prose ul,
        .prose ol {
          margin-top: 1.25em;
          margin-bottom: 1.25em;
          padding-left: 1.75rem;
        }
        .prose li {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        .prose ul > li::marker {
          color: #6366f1; /* indigo-500 */
        }
        .prose ol > li::marker {
          color: #6366f1; /* indigo-500 */
        }
        .prose code:not(pre > code) {
          background-color: #f1f5f9; /* slate-100 */
          color: #e11d48; /* rose-600 */
          padding: 0.25em 0.5em;
          border-radius: 0.375rem; /* rounded-md */
          font-size: 0.9em;
          font-weight: 500;
        }
        .prose pre {
          background-color: #111827; /* gray-900 */
          color: #e5e7eb; /* gray-200 */
          border-radius: 0.75rem; /* rounded-xl */
          padding: 1.25rem;
          margin-top: 1.6em;
          margin-bottom: 1.6em;
          overflow-x: auto;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        }
        .prose pre code {
          background-color: transparent;
          color: inherit;
          padding: 0;
          font-size: 0.875rem; /* text-sm */
          line-height: 1.7;
        }
        .prose img {
          border-radius: 0.75rem; /* rounded-xl */
          margin-top: 2em;
          margin-bottom: 2em;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
        }
        .prose hr {
          border-color: #e5e7eb; /* slate-200 */
          margin-top: 3em;
          margin-bottom: 3em;
        }
      `}</style>

    </div>
  );
}