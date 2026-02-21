import React from 'react';
import ImageCleaner from '@/components/admin/ImageCleaner';

export default function AdminToolsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Tools</h1>
        <p className="text-slate-600">Database maintenance and cleanup utilities</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ImageCleaner />
        {/* Add more admin tools here in the future */}
      </div>
    </div>
  );
}