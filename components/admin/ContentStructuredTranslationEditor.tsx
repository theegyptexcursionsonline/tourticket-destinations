'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageIcon, Lightbulb, MessageSquareQuote } from 'lucide-react';
import { isRTL, localeNames, translatableLocales } from '@/lib/i18n/translationFields';

type TranslationsMap = Record<string, Record<string, unknown>>;

interface FaqSource {
  question?: string;
  answer?: string;
}

interface TravelTipSource {
  title?: string;
  content?: string;
}

interface ImageMetadataSource {
  url?: string;
  alt?: string;
  title?: string;
}

interface Props {
  value: TranslationsMap;
  onChange: (translations: TranslationsMap) => void;
  faqs?: FaqSource[];
  travelTips?: TravelTipSource[];
  imageMetadata?: ImageMetadataSource[];
}

const inputStyles =
  'block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500';
const textareaStyles = `${inputStyles} min-h-[96px] resize-y`;

const hasDeepContent = (entry: unknown): boolean => {
  if (typeof entry === 'string') return entry.trim().length > 0;
  if (Array.isArray(entry)) return entry.some(hasDeepContent);
  return Boolean(entry && typeof entry === 'object' && Object.values(entry).some(hasDeepContent));
};

const stripEmptyLocales = (translations: TranslationsMap): TranslationsMap =>
  Object.fromEntries(Object.entries(translations).filter(([, fields]) => hasDeepContent(fields)));

const normalizedObjectArray = (entry: unknown, length: number): Record<string, unknown>[] => {
  const items = Array.isArray(entry)
    ? entry.map((item) => (item && typeof item === 'object' ? { ...item } : {}))
    : [];
  while (items.length < length) items.push({});
  return items;
};

const SourceText = ({ label, value }: { label: string; value?: string }) => {
  if (!value?.trim()) return null;
  return <p className="text-xs text-slate-500"><span className="font-semibold text-slate-600">{label}:</span> {value}</p>;
};

export default function ContentStructuredTranslationEditor({
  value,
  onChange,
  faqs = [],
  travelTips = [],
  imageMetadata = [],
}: Props) {
  const [activeLocale, setActiveLocale] = useState(translatableLocales[0]);
  const localeData = (value[activeLocale] || {}) as Record<string, unknown>;
  const rtl = isRTL(activeLocale);

  const updateItem = (
    section: 'faqs' | 'travelTips',
    sourceLength: number,
    index: number,
    patch: Record<string, unknown>,
  ) => {
    const next = { ...value };
    const nextLocale = { ...(next[activeLocale] || {}) } as Record<string, unknown>;
    const items = normalizedObjectArray(nextLocale[section], sourceLength);
    items[index] = { ...(items[index] || {}), ...patch };
    nextLocale[section] = items;
    next[activeLocale] = nextLocale;
    onChange(stripEmptyLocales(next));
  };

  const updateImageItem = (index: number, patch: Record<string, unknown>) => {
    const next = { ...value };
    const nextLocale = { ...(next[activeLocale] || {}) } as Record<string, unknown>;
    const existing = normalizedObjectArray(nextLocale.imageMetadata, imageMetadata.length);
    const byUrl = new Map(
      existing
        .filter((entry) => typeof entry.url === 'string' && entry.url)
        .map((entry) => [String(entry.url), entry]),
    );
    const items = imageMetadata.map((source, sourceIndex) => {
      const url = source.url || '';
      return { ...(url ? byUrl.get(url) : existing[sourceIndex]), url };
    });
    items[index] = { ...(items[index] || {}), ...patch };
    nextLocale.imageMetadata = items;
    next[activeLocale] = nextLocale;
    onChange(stripEmptyLocales(next));
  };

  const faqValues = normalizedObjectArray(localeData.faqs, faqs.length);
  const tipValues = normalizedObjectArray(localeData.travelTips, travelTips.length);
  const storedImageValues = normalizedObjectArray(localeData.imageMetadata, imageMetadata.length);
  const imageValuesByUrl = new Map(
    storedImageValues
      .filter((entry) => typeof entry.url === 'string' && entry.url)
      .map((entry) => [String(entry.url), entry]),
  );
  const imageValues = imageMetadata.map((source, index) =>
    (source.url ? imageValuesByUrl.get(source.url) : storedImageValues[index]) || {},
  );

  if (faqs.length === 0 && travelTips.length === 0 && imageMetadata.length === 0) return null;

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
      <div>
        <h3 className="text-base font-bold text-slate-800">Structured content translations</h3>
        <p className="mt-1 text-sm text-slate-500">Translate each FAQ, travel tip, and image label without changing its source record.</p>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Structured translation language">
        {translatableLocales.map((locale) => (
          <button
            key={locale}
            type="button"
            onClick={() => setActiveLocale(locale)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeLocale === locale
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
            }`}
          >
            {localeNames[locale] || locale}
          </button>
        ))}
      </div>

      <div className="space-y-6" dir={rtl ? 'rtl' : 'ltr'}>
        {faqs.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2"><MessageSquareQuote className="h-4 w-4 text-indigo-500" /><h4 className="font-semibold text-slate-800">FAQs</h4></div>
            {faqs.map((faq, index) => (
              <div key={`faq-${index}`} className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-sm font-bold text-slate-700">FAQ {index + 1}</p>
                <SourceText label="English question" value={faq.question} />
                <SourceText label="English answer" value={faq.answer} />
                <input
                  value={typeof faqValues[index]?.question === 'string' ? String(faqValues[index].question) : ''}
                  onChange={(event) => updateItem('faqs', faqs.length, index, { question: event.target.value })}
                  className={inputStyles}
                  placeholder={`Question in ${localeNames[activeLocale] || activeLocale}`}
                />
                <textarea
                  value={typeof faqValues[index]?.answer === 'string' ? String(faqValues[index].answer) : ''}
                  onChange={(event) => updateItem('faqs', faqs.length, index, { answer: event.target.value })}
                  className={textareaStyles}
                  placeholder={`Answer in ${localeNames[activeLocale] || activeLocale}`}
                />
              </div>
            ))}
          </div>
        )}

        {travelTips.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /><h4 className="font-semibold text-slate-800">Travel tips</h4></div>
            {travelTips.map((tip, index) => (
              <div key={`tip-${index}`} className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-sm font-bold text-slate-700">Tip {index + 1}</p>
                <SourceText label="English title" value={tip.title} />
                <SourceText label="English content" value={tip.content} />
                <input
                  value={typeof tipValues[index]?.title === 'string' ? String(tipValues[index].title) : ''}
                  onChange={(event) => updateItem('travelTips', travelTips.length, index, { title: event.target.value })}
                  className={inputStyles}
                  placeholder={`Title in ${localeNames[activeLocale] || activeLocale}`}
                />
                <textarea
                  value={typeof tipValues[index]?.content === 'string' ? String(tipValues[index].content) : ''}
                  onChange={(event) => updateItem('travelTips', travelTips.length, index, { content: event.target.value })}
                  className={textareaStyles}
                  placeholder={`Content in ${localeNames[activeLocale] || activeLocale}`}
                />
              </div>
            ))}
          </div>
        )}

        {imageMetadata.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-sky-500" /><h4 className="font-semibold text-slate-800">Image alt text and titles</h4></div>
            {imageMetadata.map((image, index) => {
              const stored = imageValues[index] || {};
              const url = image.url || '';
              return (
                <div key={url || `image-${index}`} className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-[88px_1fr]">
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-slate-200">
                    {url ? <Image src={url} alt={image.alt || `Source image ${index + 1}`} fill className="object-cover" /> : null}
                  </div>
                  <div className="space-y-3">
                    <SourceText label="English alt" value={image.alt} />
                    <SourceText label="English title" value={image.title} />
                    <input
                      value={typeof stored.alt === 'string' ? String(stored.alt) : ''}
                      onChange={(event) => updateImageItem(index, { url, alt: event.target.value })}
                      className={inputStyles}
                      placeholder={`Image alt text in ${localeNames[activeLocale] || activeLocale}`}
                    />
                    <input
                      value={typeof stored.title === 'string' ? String(stored.title) : ''}
                      onChange={(event) => updateImageItem(index, { url, title: event.target.value })}
                      className={inputStyles}
                      placeholder={`Image title in ${localeNames[activeLocale] || activeLocale}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

