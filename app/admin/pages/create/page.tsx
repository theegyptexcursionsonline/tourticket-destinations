'use client';

// Unified create flow for the Pages section: pick a page type, get the full
// form for it. Attraction pages and category landings use AttractionPageForm;
// categories (tour collections with URL type + translations) use CategoryForm.

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Layout, Tag, ChevronRight } from 'lucide-react';
import AttractionPageForm from '@/components/admin/AttractionPageForm';
import CategoryForm from '@/components/admin/CategoryForm';

type CreateKind = 'page' | 'category';

function CreatePageChooser() {
  const searchParams = useSearchParams();
  const initialKind: CreateKind = searchParams.get('type') === 'category' ? 'category' : 'page';
  const [kind, setKind] = useState<CreateKind>(initialKind);

  return (
    <div>
      <div className="px-6 pt-6">
        <div className="max-w-3xl">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            What kind of page do you want to create?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <button
              type="button"
              onClick={() => setKind('page')}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                kind === 'page'
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <Layout className={`w-5 h-5 mt-0.5 ${kind === 'page' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>
                <span className="block font-semibold text-slate-900">Page</span>
                <span className="block text-sm text-slate-500 mt-1">
                  Attraction page or category landing — hero, content, curated tour &amp; page listings, translations, URL type
                </span>
              </span>
              {kind === 'page' && <ChevronRight className="w-4 h-4 text-indigo-500 ml-auto mt-1" />}
            </button>
            <button
              type="button"
              onClick={() => setKind('category')}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                kind === 'category'
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <Tag className={`w-5 h-5 mt-0.5 ${kind === 'category' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>
                <span className="block font-semibold text-slate-900">Category</span>
                <span className="block text-sm text-slate-500 mt-1">
                  Tour collection — tours are assigned to it and listed automatically, with full translation controls
                </span>
              </span>
              {kind === 'category' && <ChevronRight className="w-4 h-4 text-indigo-500 ml-auto mt-1" />}
            </button>
          </div>
        </div>
      </div>

      {kind === 'page' ? <AttractionPageForm /> : <CategoryForm />}
    </div>
  );
}

export default function CreateUnifiedPage() {
  return (
    <Suspense>
      <CreatePageChooser />
    </Suspense>
  );
}
