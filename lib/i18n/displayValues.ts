/**
 * Values the operator types once in English — a duration ("Duration 8 hours",
 * "8 hours", "30 minutes") and guide languages ("English", "Arabic") — written
 * in the visitor's language. Printed as typed, the Arabic site showed
 * "Duration 8 hours" and "English". Anything this cannot read with certainty is
 * shown as entered (without a doubled "Duration" label), never guessed.
 */
type Unit = 'hour' | 'minute' | 'day';
type Forms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const LABEL_PREFIX = /^\s*duration\s*[:\-–]?\s*/i;
const UNIT_PATTERN = /^\s*(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|days?|stunden?|std\.?|minuten?|tage?)\s*$/i;

const FORMS: Record<string, Record<Unit, Forms>> = {
  en: {
    hour: { one: '{n} hour', other: '{n} hours' },
    minute: { one: '{n} minute', other: '{n} minutes' },
    day: { one: '{n} day', other: '{n} days' },
  },
  ar: {
    hour: { one: '{n} ساعة', two: 'ساعتان', few: '{n} ساعات', many: '{n} ساعة', other: '{n} ساعة' },
    minute: { one: '{n} دقيقة', two: 'دقيقتان', few: '{n} دقائق', many: '{n} دقيقة', other: '{n} دقيقة' },
    day: { one: '{n} يوم', two: 'يومان', few: '{n} أيام', many: '{n} يوماً', other: '{n} يوم' },
  },
  de: {
    hour: { one: '{n} Stunde', other: '{n} Stunden' },
    minute: { one: '{n} Minute', other: '{n} Minuten' },
    day: { one: '{n} Tag', other: '{n} Tage' },
  },
  fr: {
    hour: { one: '{n} heure', other: '{n} heures' },
    minute: { one: '{n} minute', other: '{n} minutes' },
    day: { one: '{n} jour', other: '{n} jours' },
  },
  es: {
    hour: { one: '{n} hora', other: '{n} horas' },
    minute: { one: '{n} minuto', other: '{n} minutos' },
    day: { one: '{n} día', other: '{n} días' },
  },
  ru: {
    hour: { one: '{n} час', few: '{n} часа', many: '{n} часов', other: '{n} часа' },
    minute: { one: '{n} минута', few: '{n} минуты', many: '{n} минут', other: '{n} минуты' },
    day: { one: '{n} день', few: '{n} дня', many: '{n} дней', other: '{n} дня' },
  },
};

export function formatDuration(raw: string | null | undefined, locale: string): string {
  if (!raw) return '';
  const unlabelled = raw.replace(LABEL_PREFIX, '');
  const match = UNIT_PATTERN.exec(unlabelled);
  if (!match) return unlabelled;
  const amount = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return unlabelled;
  const token = match[2].toLowerCase();
  const unit: Unit = /^(h|st)/.test(token) ? 'hour' : token.startsWith('m') ? 'minute' : 'day';
  const forms = (FORMS[locale] ?? FORMS.en)[unit];
  const number = new Intl.NumberFormat(locale === 'ar' ? 'en' : locale, { maximumFractionDigits: 2 }).format(amount);
  const category = new Intl.PluralRules(locale).select(amount);
  return (forms[category] ?? forms.other).replace('{n}', number);
}

// Guide languages are stored by their English name.
const LANGUAGE_CODES: Record<string, string> = {
  english: 'en', arabic: 'ar', german: 'de', french: 'fr', spanish: 'es', italian: 'it', russian: 'ru',
  chinese: 'zh', mandarin: 'zh', japanese: 'ja', portuguese: 'pt', dutch: 'nl', polish: 'pl', czech: 'cs',
  turkish: 'tr', korean: 'ko', hindi: 'hi', greek: 'el', swedish: 'sv', ukrainian: 'uk', hebrew: 'he',
};

export function formatLanguageName(name: string | null | undefined, locale: string): string {
  if (!name) return '';
  const code = LANGUAGE_CODES[name.trim().toLowerCase()];
  if (!code) return name;
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(code) || name;
  } catch {
    return name;
  }
}

export function formatLanguageList(names: string[] | null | undefined, locale: string): string {
  const separator = locale === 'ar' ? '، ' : ', ';
  return (names || []).map((name) => formatLanguageName(name, locale)).join(separator);
}
