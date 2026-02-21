import React from 'react';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import { IBlog } from '@/lib/models/Blog';
import BlogManager from './BlogManager';

async function getBlogs(): Promise<IBlog[]> {
  try {
    await dbConnect();
    const blogs = await Blog.find({})
      .sort({ createdAt: -1 })
      .populate('relatedDestinations', 'name slug')
      .populate('relatedTours', 'title slug')
      .lean();
    return JSON.parse(JSON.stringify(blogs));
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return [];
  }
}

export default async function AdminBlogPage() {
  const blogs = await getBlogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Blog Posts</h1>
        <p className="text-slate-600 mt-1">
          Create and manage your travel blog content.
        </p>
      </div>
      
      <BlogManager initialBlogs={blogs} />
    </div>
  );
}