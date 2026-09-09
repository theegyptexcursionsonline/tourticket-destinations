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
import { sanitizeSourceDraft } from '@/lib/i18n/sourceDraft';

const inputStyles =
  'block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700';

const textareaStyles = inputStyles + ' resize-vertical min-h-[100px]';

// ── Types ──

interface TranslationEditorProps {
  fields: TranslationFieldDef[];
  value: Record<string, Record<string, unknown>>;
  onChange: (translations: Record<string, Record<string, unknown>>) => void;
  /** Pass modelType and entityId to enable the "Auto Translate" button */
  modelType?: 'tour' | 'destination' | 'category' | 'attraction-page';
  entityId?: string;
  /**
   * The English content currently in the edit form. Auto Translate posts it so
   * unsaved source text — image alt/title especially — is what gets translated
   * instead of the values last written to the database. Typed as `unknown`
   * because it is raw form state: sanitizeSourceDraft() decides what is sent.
   */
  sourceDraft?: unknown;
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
  sourceDraft,
}: TranslationEditorProps) {
  const [activeLocale, setActiveLocale] = useState(translatableLocales[0]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [localeStatuses, setLocaleStatuses] = useState<Record<string, LocaleStatus>>({});
  const translationsRef = useRef<Record<string, Record<string, unknown>>>({});
  const failedLocalesRef = useRef<string[]>([]);
  const fatalErrorRef = useRef('');
  const preservedExistingRef = useRef(false);
  const translatingRef = useRef(false);
  const settledLocalesRef = useRef<Set<string>>(new Set());

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

  const markLocaleFailed = useCallback((locale: string, name?: string) => {
    setLocaleStatuses((prev) => ({ ...prev, [locale]: 'error' }));
    settledLocalesRef.current.add(locale);
    const label = name || localeNames[locale] || locale;
    if (!failedLocalesRef.current.includes(label)) {
      failedLocalesRef.current = [...failedLocalesRef.current, label];
    }
  }, []);

  function handleSSEEvent(event: string, data: Record<string, unknown>) {
    switch (event) {
      case 'translating': {
        const locale = data.locale as string;
        setLocaleStatuses((prev) => ({ ...prev, [locale]: 'translating' }));
        break;
      }
      case 'locale_done': {
        const locale = data.locale as string;
        const translations = data.translations as Record<string, unknown>;
        preservedExistingRef.current = preservedExistingRef.current || Boolean(data.preservedExisting);
        settledLocalesRef.current.add(locale);

        setLocaleStatuses((prev) => ({ ...prev, [locale]: 'done' }));

        if (translations && Object.keys(translations).length > 0) {
          translationsRef.current = {
            ...translationsRef.current,
            [locale]: translations,
          };
          onChangeRef.current({ ...translationsRef.current });
        }

        // Keep the latest committed language visible for review.
        setActiveLocale(locale as typeof activeLocale);
        break;
      }
      case 'locale_error': {
        const locale = data.locale as string;
        markLocaleFailed(locale, data.localeName as string | undefined);
        break;
      }
      case 'error': {
        const locale = data.locale as string;
        if (locale) {
          markLocaleFailed(locale, data.localeName as string | undefined);
        } else if (data.error) {
          fatalErrorRef.current = String(data.error);
        }
        break;
      }
    }
  }

  const readTranslationStream = async (res: Response) => {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('Streaming not supported');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;

      buffer += decoder.decode(chunk, { stream: true });

      // SSE events are separated by a blank line. Keep the (possibly
      // incomplete) trailing event in the buffer so events split across
      // network chunks are never dropped.
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const rawEvent of events) {
        let eventType = '';
        let eventData = '';
        for (const line of rawEvent.split('\n')) {
          if (line.startsWith('event: ')) eventType = line.slice(7).trim();
          else if (line.startsWith('data: ')) eventData = line.slice(6).trim();
        }
        if (eventType && eventData) {
          try {
            handleSSEEvent(eventType, JSON.parse(eventData));
          } catch {
            // A malformed progress event does not invalidate a completed
            // server write. The terminal event still determines the result.
          }
        }
      }
    }
  };

  const handleAutoTranslate = async () => {
    if (!canAutoTranslate || !modelType || translatingRef.current) return;

    // Send the form's own English content, reduced to translatable fields. A
    // draft we cannot send safely is reported instead of dropped: falling back
    // to the saved document is exactly the bug this prop exists to fix.
    const draft = sanitizeSourceDraft(modelType, sourceDraft);
    if (!draft.ok) {
      toast.error(draft.error);
      return;
    }

    translatingRef.current = true;
    setIsTranslating(true);
    translationsRef.current = { ...value };
    preservedExistingRef.current = false;
    failedLocalesRef.current = [];
    fatalErrorRef.current = '';
    settledLocalesRef.current = new Set();

    // One user action runs every language through the existing per-locale API.
    // Each language keeps its own atomic save and compare-and-set boundary, so
    // a provider failure cannot discard languages that already succeeded.
    setLocaleStatuses(Object.fromEntries(
      translatableLocales.map((locale) => [locale, 'pending' as LocaleStatus]),
    ));

    try {
      for (const locale of translatableLocales) {
        setLocaleStatuses((prev) => ({ ...prev, [locale]: 'translating' }));
        const localeDraft = translationsRef.current[locale];
        const ownerDraft = localeDraft && Object.keys(localeDraft).length > 0
          ? { localeDraft }
          : {};

        let res: Response;
        try {
          res = await fetch('/api/admin/translate/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              Object.keys(draft.draft).length > 0
                ? { modelType, id: entityId, locale, sourceDraft: draft.draft, ...ownerDraft }
                : { modelType, id: entityId, locale, ...ownerDraft }
            ),
          });
        } catch (error) {
          fatalErrorRef.current = error instanceof Error ? error.message : 'Translation request failed';
          markLocaleFailed(locale);
          for (const remainingLocale of translatableLocales.slice(
            translatableLocales.indexOf(locale) + 1,
          )) {
            markLocaleFailed(remainingLocale);
          }
          break;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string };
          fatalErrorRef.current = errData.error || 'Translation failed';
          markLocaleFailed(locale);
          for (const remainingLocale of translatableLocales.slice(
            translatableLocales.indexOf(locale) + 1,
          )) {
            markLocaleFailed(remainingLocale);
          }
          break;
        }

        try {
          await readTranslationStream(res);
        } catch (error) {
          fatalErrorRef.current = error instanceof Error ? error.message : 'Translation stream failed';
        }
        if (fatalErrorRef.current) {
          markLocaleFailed(locale);
          for (const remainingLocale of translatableLocales.slice(
            translatableLocales.indexOf(locale) + 1,
          )) {
            markLocaleFailed(remainingLocale);
          }
          break;
        }
        if (!settledLocalesRef.current.has(locale)) {
          fatalErrorRef.current = `${localeNames[locale] || locale} did not return a final save status.`;
          markLocaleFailed(locale);
          for (const remainingLocale of translatableLocales.slice(
            translatableLocales.indexOf(locale) + 1,
          )) {
            markLocaleFailed(remainingLocale);
          }
          break;
        }
      }

      const failed = failedLocalesRef.current;
      if (failed.length > 0) {
        const successfulCount = totalLocales - failed.length;
        if (successfulCount > 0) {
          toast.error(
            `${failed.join(', ')} ${failed.length === 1 ? 'was' : 'were'} not saved. ` +
            `${successfulCount} ${successfulCount === 1 ? 'language was' : 'languages were'} saved; retry to fill the rest.`,
          );
        } else {
          toast.error(fatalErrorRef.current || 'No languages were saved. Please try again.');
        }
      } else {
        toast.success(
          preservedExistingRef.current
            ? `All ${totalLocales} languages translated and saved. Existing manual text was preserved.`
            : `All ${totalLocales} languages translated and saved.`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Auto-translate failed');
    } finally {
      setTimeout(() => {
        translatingRef.current = false;
        setIsTranslating(false);
        setLocaleStatuses({});
      }, 2000);
    }
  };

  // ── Render ──

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            {isTranslating
              ? `Translating ${completedCount}/${totalLocales}...`
              : 'Translate & save all languages'}
          </button>
        )}
      </div>

      {canAutoTranslate && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Translate every language with one click.</p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            All {totalLocales} languages are saved independently. Existing manual text is preserved and only empty fields are filled.
          </p>
        </div>
      )}

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
              disabled={isTranslating}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                activeLocale === locale
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white rounded-t-lg'
                  : 'text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
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
                disabled={isTranslating}
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
                  disabled={isTranslating}
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
                disabled={isTranslating}
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
  disabled,
  onAdd,
  onRemove,
  onUpdate,
}: {
  field: TranslationFieldDef;
  items: string[];
  rtl: boolean;
  disabled: boolean;
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
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
              disabled={disabled}
              className={`${inputStyles}${rtl ? ' text-right' : ''}`}
              placeholder={`${field.label} item ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={disabled}
              className="flex items-center justify-center w-10 h-10 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
