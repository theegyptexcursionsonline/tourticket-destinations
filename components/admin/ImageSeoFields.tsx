'use client';

import type { ImageMetadata } from '@/lib/content/imageMetadata';

export default function ImageSeoFields({
  url,
  value,
  onChange,
  compact = false,
}: {
  url: string;
  value?: ImageMetadata;
  onChange: (value: ImageMetadata) => void;
  compact?: boolean;
}) {
  const inputClass = compact
    ? 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'
    : 'block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className={`grid grid-cols-1 ${compact ? 'gap-2' : 'md:grid-cols-2 gap-3'}`}>
      <label className="space-y-1">
        <span className="text-xs font-semibold text-slate-600">Image alt text</span>
        <input
          value={value?.alt || ''}
          onChange={(event) => onChange({ url, alt: event.target.value, title: value?.title || '' })}
          className={inputClass}
          placeholder="Describe the image for accessibility and SEO"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-semibold text-slate-600">Image title</span>
        <input
          value={value?.title || ''}
          onChange={(event) => onChange({ url, alt: value?.alt || '', title: event.target.value })}
          className={inputClass}
          placeholder="Optional image title"
        />
      </label>
    </div>
  );
}
