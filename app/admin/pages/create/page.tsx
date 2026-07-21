'use client';

// Unified create flow for the Pages section: pick a page type, get the full
// form for it. Attraction pages and category landings use AttractionPageForm;
// categories (tour collections with URL type + translations) use CategoryForm.

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Landmark, LayoutGrid, Tag } from 'lucide-react';
import AttractionPageForm from '@/components/admin/AttractionPageForm';
import CategoryForm from '@/components/admin/CategoryForm';

type CreateKind = 'attraction' | 'catalogue' | 'category';

function CreatePageChooser() {
  const searchParams = useSearchParams();
  const requestedType = searchParams.get('type');
  const initialKind: CreateKind = requestedType === 'category'
    ? 'catalogue'
    : requestedType === 'category-landing'
      ? 'category'
      : 'attraction';
  const [kind, setKind] = useState<CreateKind>(initialKind);

  return (
    <div>
      <div className="px-6 pt-6">
        <div className="max-w-3xl">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            What kind of page do you want to create?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
            {([
              { id: 'attraction', label: 'Attraction', description: 'A standalone attraction or interest page with curated tours.', icon: Landmark },
              { id: 'catalogue', label: 'Catalogue', description: 'A tour collection used in the tour Catalogue selector.', icon: LayoutGrid },
              { id: 'category', label: 'Category', description: 'A landing page linked to an existing catalogue.', icon: Tag },
            ] as const).map((option) => {
              const Icon = option.icon;
              const selected = kind === option.id;
              return (
                <button key={option.id} type="button" onClick={() => setKind(option.id)} className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${selected ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${selected ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>
                    <span className="block font-semibold text-slate-900">{option.label}</span>
                    <span className="block text-xs leading-relaxed text-slate-500 mt-1">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {kind === 'catalogue'
        ? <CategoryForm />
        : <AttractionPageForm initialPageType={kind === 'category' ? 'category' : 'attraction'} />}
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
