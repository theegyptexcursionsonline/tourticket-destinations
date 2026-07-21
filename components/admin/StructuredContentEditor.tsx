'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { ContentFaq, ContentTravelTip } from '@/types';

const inputClass = 'block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500';

export function FaqEditor({ value, onChange }: { value: ContentFaq[]; onChange: (value: ContentFaq[]) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Page FAQs</h3>
          <p className="mt-1 text-xs text-slate-500">Only these FAQs appear on this page.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...value, { question: '', answer: '' }])}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          <Plus className="h-4 w-4" /> Add FAQ
        </button>
      </div>
      {value.map((item, index) => (
        <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">FAQ {index + 1}</span>
            <button type="button" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500 hover:text-red-700" aria-label={`Remove FAQ ${index + 1}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input
            value={item.question}
            onChange={(event) => onChange(value.map((entry, itemIndex) => itemIndex === index ? { ...entry, question: event.target.value } : entry))}
            className={inputClass}
            placeholder="Question"
          />
          <textarea
            value={item.answer}
            onChange={(event) => onChange(value.map((entry, itemIndex) => itemIndex === index ? { ...entry, answer: event.target.value } : entry))}
            className={`${inputClass} min-h-24 resize-y`}
            placeholder="Answer"
          />
        </div>
      ))}
      {value.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No page-specific FAQs yet.</p>}
    </div>
  );
}

export function TravelTipsEditor({ value, onChange }: { value: ContentTravelTip[]; onChange: (value: ContentTravelTip[]) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Travel Tips</h3>
          <p className="mt-1 text-xs text-slate-500">Add advice specific to this destination or page.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...value, { title: '', content: '' }])}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          <Plus className="h-4 w-4" /> Add Tip
        </button>
      </div>
      {value.map((item, index) => (
        <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tip {index + 1}</span>
            <button type="button" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500 hover:text-red-700" aria-label={`Remove travel tip ${index + 1}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input
            value={item.title}
            onChange={(event) => onChange(value.map((entry, itemIndex) => itemIndex === index ? { ...entry, title: event.target.value } : entry))}
            className={inputClass}
            placeholder="Tip title"
          />
          <textarea
            value={item.content}
            onChange={(event) => onChange(value.map((entry, itemIndex) => itemIndex === index ? { ...entry, content: event.target.value } : entry))}
            className={`${inputClass} min-h-24 resize-y`}
            placeholder="Tip details"
          />
        </div>
      ))}
      {value.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No page-specific travel tips yet.</p>}
    </div>
  );
}
