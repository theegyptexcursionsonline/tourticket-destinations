'use client';

import { useState } from 'react';
import { Layers3, ListChecks, MessageSquareQuote, PackagePlus, Globe2 } from 'lucide-react';
import {
  translatableLocales,
  localeNames,
  isRTL,
} from '@/lib/i18n/translationFields';

type TranslationsMap = Record<string, Record<string, unknown>>;

interface ItineraryItemSource {
  title?: string;
  description?: string;
  location?: string;
  includes?: string[];
}

interface FAQSource {
  question?: string;
  answer?: string;
}

interface BookingOptionSource {
  label?: string;
  description?: string;
  badge?: string;
}

interface AddOnSource {
  name?: string;
  description?: string;
}

interface Props {
  value: TranslationsMap;
  onChange: (translations: TranslationsMap) => void;
  itinerary?: ItineraryItemSource[];
  faqs?: FAQSource[];
  bookingOptions?: BookingOptionSource[];
  addOns?: AddOnSource[];
}

const inputStyles =
  'block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all duration-200 font-medium text-slate-700';

const textareaStyles = inputStyles + ' resize-vertical min-h-[100px]';

const hasDeepContent = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => hasDeepContent(item));
  if (value && typeof value === 'object') return Object.values(value).some((item) => hasDeepContent(item));
  return false;
};

const stripEmptyLocales = (translations: TranslationsMap): TranslationsMap => {
  const result: TranslationsMap = {};
  for (const [locale, fields] of Object.entries(translations)) {
    if (hasDeepContent(fields)) {
      result[locale] = fields;
    }
  }
  return result;
};

const getObjectArray = (value: unknown, length: number) => {
  const current = Array.isArray(value) ? [...value] : [];
  while (current.length < length) current.push({});
  return current as Record<string, unknown>[];
};

const SourcePreview = ({ label, value }: { label: string; value?: string | string[] }) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const preview = Array.isArray(value) ? value.filter(Boolean).join(', ') : value;
  if (!preview?.trim()) return null;

  return (
    <p className="text-xs text-slate-500 mt-1">
      <span className="font-semibold text-slate-600">{label}:</span> {preview}
    </p>
  );
};

export default function TourStructuredTranslationEditor({
  value,
  onChange,
  itinerary = [],
  faqs = [],
  bookingOptions = [],
  addOns = [],
}: Props) {
  const [activeLocale, setActiveLocale] = useState(translatableLocales[0]);
  const localeData = (value[activeLocale] || {}) as Record<string, unknown>;
  const rtl = isRTL(activeLocale);

  const updateSectionItem = (
    section: 'itinerary' | 'faq' | 'bookingOptions' | 'addOns',
    sourceLength: number,
    index: number,
    patch: Record<string, unknown>
  ) => {
    const updated = { ...value };
    const updatedLocale = { ...(updated[activeLocale] || {}) } as Record<string, unknown>;
    const items = getObjectArray(updatedLocale[section], sourceLength);
    items[index] = { ...(items[index] || {}), ...patch };
    updatedLocale[section] = items;
    updated[activeLocale] = updatedLocale;
    onChange(stripEmptyLocales(updated));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-4">
          <Globe2 className="h-4 w-4 text-indigo-500" />
          <p className="text-sm font-semibold text-slate-800">Structured Tour Content</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {translatableLocales.map((locale) => {
            const active = activeLocale === locale;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => setActiveLocale(locale)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {localeNames[locale] || locale}
              </button>
            );
          })}
        </div>
      </div>

      <div dir={rtl ? 'rtl' : 'ltr'} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800">Itinerary</h3>
          </div>
          {itinerary.length === 0 ? (
            <p className="text-sm text-slate-500">No itinerary items to translate yet.</p>
          ) : (
            itinerary.map((item, index) => {
              const translated = getObjectArray(localeData.itinerary, itinerary.length)[index] || {};
              return (
                <div key={`itinerary-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Step {index + 1}</p>
                  <SourcePreview label="English title" value={item.title} />
                  <SourcePreview label="English description" value={item.description} />
                  <SourcePreview label="English location" value={item.location} />
                  <SourcePreview label="English includes" value={item.includes} />
                  <input
                    value={typeof translated.title === 'string' ? translated.title : ''}
                    onChange={(e) => updateSectionItem('itinerary', itinerary.length, index, { title: e.target.value })}
                    className={inputStyles}
                    placeholder={`Title in ${localeNames[activeLocale] || activeLocale}`}
                  />
                  <textarea
                    value={typeof translated.description === 'string' ? translated.description : ''}
                    onChange={(e) => updateSectionItem('itinerary', itinerary.length, index, { description: e.target.value })}
                    className={textareaStyles}
                    placeholder={`Description in ${localeNames[activeLocale] || activeLocale}`}
                    rows={4}
                  />
                  <input
                    value={typeof translated.location === 'string' ? translated.location : ''}
                    onChange={(e) => updateSectionItem('itinerary', itinerary.length, index, { location: e.target.value })}
                    className={inputStyles}
                    placeholder={`Location in ${localeNames[activeLocale] || activeLocale}`}
                  />
                  <textarea
                    value={Array.isArray(translated.includes) ? translated.includes.join('\n') : ''}
                    onChange={(e) =>
                      updateSectionItem('itinerary', itinerary.length, index, {
                        includes: e.target.value.split('\n').map((line) => line.trim()).filter(Boolean),
                      })
                    }
                    className={textareaStyles}
                    placeholder={`Included points in ${localeNames[activeLocale] || activeLocale}, one per line`}
                    rows={3}
                  />
                </div>
              );
            })
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800">FAQ</h3>
          </div>
          {faqs.length === 0 ? (
            <p className="text-sm text-slate-500">No FAQs to translate yet.</p>
          ) : (
            faqs.map((item, index) => {
              const translated = getObjectArray(localeData.faq, faqs.length)[index] || {};
              return (
                <div key={`faq-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Question {index + 1}</p>
                  <SourcePreview label="English question" value={item.question} />
                  <SourcePreview label="English answer" value={item.answer} />
                  <input
                    value={typeof translated.question === 'string' ? translated.question : ''}
                    onChange={(e) => updateSectionItem('faq', faqs.length, index, { question: e.target.value })}
                    className={inputStyles}
                    placeholder={`Question in ${localeNames[activeLocale] || activeLocale}`}
                  />
                  <textarea
                    value={typeof translated.answer === 'string' ? translated.answer : ''}
                    onChange={(e) => updateSectionItem('faq', faqs.length, index, { answer: e.target.value })}
                    className={textareaStyles}
                    placeholder={`Answer in ${localeNames[activeLocale] || activeLocale}`}
                    rows={4}
                  />
                </div>
              );
            })
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800">Booking Options</h3>
          </div>
          {bookingOptions.length === 0 ? (
            <p className="text-sm text-slate-500">No booking options to translate yet.</p>
          ) : (
            bookingOptions.map((item, index) => {
              const translated = getObjectArray(localeData.bookingOptions, bookingOptions.length)[index] || {};
              return (
                <div key={`booking-option-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Option {index + 1}</p>
                  <SourcePreview label="English label" value={item.label} />
                  <SourcePreview label="English description" value={item.description} />
                  <SourcePreview label="English badge" value={item.badge} />
                  <input
                    value={typeof translated.label === 'string' ? translated.label : ''}
                    onChange={(e) => updateSectionItem('bookingOptions', bookingOptions.length, index, { label: e.target.value })}
                    className={inputStyles}
                    placeholder={`Option label in ${localeNames[activeLocale] || activeLocale}`}
                  />
                  <textarea
                    value={typeof translated.description === 'string' ? translated.description : ''}
                    onChange={(e) => updateSectionItem('bookingOptions', bookingOptions.length, index, { description: e.target.value })}
                    className={textareaStyles}
                    placeholder={`Option description in ${localeNames[activeLocale] || activeLocale}`}
                    rows={3}
                  />
                  <input
                    value={typeof translated.badge === 'string' ? translated.badge : ''}
                    onChange={(e) => updateSectionItem('bookingOptions', bookingOptions.length, index, { badge: e.target.value })}
                    className={inputStyles}
                    placeholder={`Badge in ${localeNames[activeLocale] || activeLocale}`}
                  />
                </div>
              );
            })
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800">Add-ons</h3>
          </div>
          {addOns.length === 0 ? (
            <p className="text-sm text-slate-500">No add-ons to translate yet.</p>
          ) : (
            addOns.map((item, index) => {
              const translated = getObjectArray(localeData.addOns, addOns.length)[index] || {};
              return (
                <div key={`add-on-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Add-on {index + 1}</p>
                  <SourcePreview label="English name" value={item.name} />
                  <SourcePreview label="English description" value={item.description} />
                  <input
                    value={typeof translated.name === 'string' ? translated.name : ''}
                    onChange={(e) => updateSectionItem('addOns', addOns.length, index, { name: e.target.value })}
                    className={inputStyles}
                    placeholder={`Add-on name in ${localeNames[activeLocale] || activeLocale}`}
                  />
                  <textarea
                    value={typeof translated.description === 'string' ? translated.description : ''}
                    onChange={(e) => updateSectionItem('addOns', addOns.length, index, { description: e.target.value })}
                    className={textareaStyles}
                    placeholder={`Add-on description in ${localeNames[activeLocale] || activeLocale}`}
                    rows={3}
                  />
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
