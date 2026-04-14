'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Globe, Plus, Minus, Sparkles, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  TranslationFieldDef,
  translatableLocales,
  localeNames,
  isRTL,
} from '@/lib/i18n/translationFields';

const inputStyles =
  'block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700';

const textareaStyles = inputStyles + ' resize-vertical min-h-[100px]';

// ── Types ──

interface TranslationEditorProps {
  fields: TranslationFieldDef[];
  value: Record<string, Record<string, unknown>>;
  onChange: (translations: Record<string, Record<string, unknown>>) => void;
  /** Pass modelType and entityId to enable the "Auto Translate" button */
  modelType?: 'tour' | 'destination' | 'category';
  entityId?: string;
}

type LocaleStatus = 'pending' | 'translating' | 'done' | 'error';

// ── Helpers ──

/** Remove locales where every value is empty */
function stripEmptyLocales(
  translations: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  for (const [locale, fields] of Object.entries(translations)) {
    const hasContent = Object.values(fields).some((v) => {
      if (Array.isArray(v)) return v.some((item) => String(item).trim());
      return typeof v === 'string' && v.trim();
    });
    if (hasContent) result[locale] = fields;
  }
  return result;
}

// ── Component ──

export default function TranslationEditor({
  fields,
  value,
  onChange,
  modelType,
  entityId,
}: TranslationEditorProps) {
  const [activeLocale, setActiveLocale] = useState(translatableLocales[0]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [localeStatuses, setLocaleStatuses] = useState<Record<string, LocaleStatus>>({});
  const [currentLocale, setCurrentLocale] = useState('');
  const translationsRef = useRef<Record<string, Record<string, unknown>>>({});

  // Keep a stable ref to onChange so the streaming callback always uses the latest version
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const rtl = isRTL(activeLocale);
  const localeData = (value[activeLocale] || {}) as Record<string, unknown>;

  const canAutoTranslate = !!(modelType && entityId);

  // ── Field updaters ──

  const updateField = (fieldKey: string, fieldValue: unknown) => {
    const updated = { ...value };
    updated[activeLocale] = { ...localeData, [fieldKey]: fieldValue };
    onChange(stripEmptyLocales(updated));
  };

  const getStringValue = (fieldKey: string): string =>
    typeof localeData[fieldKey] === 'string' ? (localeData[fieldKey] as string) : '';

  const getArrayValue = (fieldKey: string): string[] =>
    Array.isArray(localeData[fieldKey])
      ? (localeData[fieldKey] as string[])
      : [];

  const addArrayItem = (fieldKey: string) => {
    const arr = [...getArrayValue(fieldKey), ''];
    updateField(fieldKey, arr);
  };

  const removeArrayItem = (fieldKey: string, index: number) => {
    const arr = getArrayValue(fieldKey).filter((_, i) => i !== index);
    updateField(fieldKey, arr);
  };

  const updateArrayItem = (fieldKey: string, index: number, val: string) => {
    const arr = [...getArrayValue(fieldKey)];
    arr[index] = val;
    updateField(fieldKey, arr);
  };

  // ── Count filled fields per locale ──

  const countFilledFields = (locale: string): number => {
    const data = value[locale];
    if (!data) return 0;
    return Object.values(data).filter((v) => {
      if (Array.isArray(v)) return v.some((item) => String(item).trim());
      return typeof v === 'string' && v.trim();
    }).length;
  };

  // ── Streaming Auto Translate ──

  const completedCount = Object.values(localeStatuses).filter((s) => s === 'done').length;
  const totalLocales = translatableLocales.length;
  const progressPercent = isTranslating ? Math.round((completedCount / totalLocales) * 100) : 0;

  const handleAutoTranslate = async () => {
    if (!canAutoTranslate) return;
    setIsTranslating(true);
    setCurrentLocale('');
    translationsRef.current = { ...value };

    // Initialize all locale statuses to pending
    const initialStatuses: Record<string, LocaleStatus> = {};
    translatableLocales.forEach((l) => { initialStatuses[l] = 'pending'; });
    setLocaleStatuses(initialStatuses);

    try {
      const res = await fetch('/api/admin/translate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelType, id: entityId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Translation failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Streaming not supported');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;

        buffer += decoder.decode(chunk, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = '';

        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6).trim();
          } else if (line === '' && eventType && eventData) {
            // Process complete event
            try {
              const data = JSON.parse(eventData);
              handleSSEEvent(eventType, data);
            } catch {
              // Incomplete JSON, skip
            }
            eventType = '';
            eventData = '';
          } else if (line !== '') {
            // Incomplete line, put back in buffer
            buffer += line + '\n';
          }
        }
      }

      toast.success('All translations generated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Auto-translate failed');
    } finally {
      setTimeout(() => {
        setIsTranslating(false);
        setLocaleStatuses({});
        setCurrentLocale('');
      }, 2000);
    }
  };

  const handleSSEEvent = useCallback((event: string, data: Record<string, unknown>) => {
    switch (event) {
      case 'translating': {
        const locale = data.locale as string;
        setCurrentLocale(locale);
        setLocaleStatuses((prev) => ({ ...prev, [locale]: 'translating' }));
        break;
      }
      case 'locale_done': {
        const locale = data.locale as string;
        const translations = data.translations as Record<string, unknown>;

        setLocaleStatuses((prev) => ({ ...prev, [locale]: 'done' }));

        // Update form with this locale's translations in real-time using the ref
        if (translations && Object.keys(translations).length > 0) {
          translationsRef.current = {
            ...translationsRef.current,
            [locale]: translations,
          };
          // Use ref to always call the latest onChange
          onChangeRef.current({ ...translationsRef.current });
        }

        // Auto-switch to the locale that just finished so user sees it
        setActiveLocale(locale as typeof activeLocale);
        break;
      }
      case 'error': {
        const locale = data.locale as string;
        if (locale) {
          setLocaleStatuses((prev) => ({ ...prev, [locale]: 'error' }));
        }
        break;
      }
    }
  }, []);

  // ── Render ──

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-bold text-slate-700">Translations</span>
          <span className="text-slate-400 text-sm">(optional)</span>
        </div>
        {canAutoTranslate && (
          <button
            type="button"
            onClick={handleAutoTranslate}
            disabled={isTranslating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-sm hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isTranslating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isTranslating ? 'Translating...' : 'Auto Translate'}
          </button>
        )}
      </div>

      {/* Real-time translation progress */}
      {isTranslating && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 space-y-4">
          {/* Overall progress bar */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-indigo-700">
              Translating {completedCount}/{totalLocales} languages...
            </span>
            <span className="text-indigo-500 font-semibold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Per-locale status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {translatableLocales.map((locale) => {
              const status = localeStatuses[locale] || 'pending';
              return (
                <div
                  key={locale}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                    status === 'done'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : status === 'translating'
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 animate-pulse'
                        : status === 'error'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-white text-slate-400 border border-slate-200'
                  }`}
                >
                  {status === 'done' ? (
                    <Check className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : status === 'translating' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-current flex-shrink-0" />
                  )}
                  <span className="font-medium truncate">{localeNames[locale]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locale tabs */}
      <div className="flex flex-wrap border-b border-slate-200 bg-slate-50 rounded-t-xl px-2">
        {translatableLocales.map((locale) => {
          const count = countFilledFields(locale);
          return (
            <button
              key={locale}
              type="button"
              onClick={() => setActiveLocale(locale)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                activeLocale === locale
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white rounded-t-lg'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {localeNames[locale] || locale}
              <span className="text-xs text-slate-400">({locale})</span>
              {count > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-600">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Fields for active locale */}
      <div className="space-y-5 pt-2" dir={rtl ? 'rtl' : 'ltr'}>
        {fields.map((field) => {
          if (field.type === 'array') {
            return (
              <ArrayField
                key={field.key}
                field={field}
                items={getArrayValue(field.key)}
                rtl={rtl}
                onAdd={() => addArrayItem(field.key)}
                onRemove={(i) => removeArrayItem(field.key, i)}
                onUpdate={(i, v) => updateArrayItem(field.key, i, v)}
              />
            );
          }

          const val = getStringValue(field.key);

          if (field.type === 'textarea') {
            return (
              <div key={field.key} className="space-y-1.5">
                <FieldLabel label={field.label} />
                <textarea
                  value={val}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  rows={field.rows || 3}
                  maxLength={field.maxLength}
                  className={`${textareaStyles}${rtl ? ' text-right' : ''}`}
                  placeholder={`${field.label} in ${localeNames[activeLocale] || activeLocale}`}
                />
                {field.maxLength && (
                  <CharCounter current={val.length} max={field.maxLength} />
                )}
              </div>
            );
          }

          // Default: input
          return (
            <div key={field.key} className="space-y-1.5">
              <FieldLabel label={field.label} />
              <input
                type="text"
                value={val}
                onChange={(e) => updateField(field.key, e.target.value)}
                maxLength={field.maxLength}
                className={`${inputStyles}${rtl ? ' text-right' : ''}`}
                placeholder={`${field.label} in ${localeNames[activeLocale] || activeLocale}`}
              />
              {field.maxLength && (
                <CharCounter current={val.length} max={field.maxLength} />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 pt-1">
        Only fill in fields you want to translate. Empty fields fall back to the English (default) value.
      </p>
    </div>
  );
}

// ── Sub-components ──

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="text-sm font-semibold text-slate-600">{label}</label>
  );
}

function CharCounter({ current, max }: { current: number; max: number }) {
  return (
    <div className="text-xs text-slate-400 text-right">
      {current}/{max}
    </div>
  );
}

function ArrayField({
  field,
  items,
  rtl,
  onAdd,
  onRemove,
  onUpdate,
}: {
  field: TranslationFieldDef;
  items: string[];
  rtl: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <FieldLabel label={field.label} />
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-slate-400 italic">No items yet. Click &quot;Add&quot; to start.</p>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(index, e.target.value)}
              maxLength={field.maxLength}
              className={`${inputStyles}${rtl ? ' text-right' : ''}`}
              placeholder={`${field.label} item ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="flex items-center justify-center w-10 h-10 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
