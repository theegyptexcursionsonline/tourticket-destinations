import React from 'react';
import BlogManager from './BlogManager';

/**
 * The manager loads posts from /api/admin/blog, which enforces the admin's
 * session and brand scope. This page used to run Blog.find({}) itself while
 * rendering, so every brand's posts — drafts included — were streamed to
 * anyone who requested it, signed in or not.
 */
export default function AdminBlogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Blog Posts</h1>
        <p className="text-slate-600 mt-1">
          Create and manage your travel blog content.
        </p>
      </div>

      <BlogManager />
    </div>
  );
}
