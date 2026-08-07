import { localizeEntityFields, localizeStructuredEntries } from '@/lib/i18n/contentLocalization';
import {
  destinationStructuredFields,
  destinationTranslationFields,
} from '@/lib/i18n/translationFields';

export function localizeDestinationRecord<T extends Record<string, unknown>>(
  destination: T,
  locale: string,
): T {
  return localizeStructuredEntries(
    localizeEntityFields(
      destination,
      locale,
      destinationTranslationFields.map((field) => field.key),
    ),
    locale,
    destinationStructuredFields,
  );
}
