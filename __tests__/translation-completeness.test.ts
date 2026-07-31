import fs from 'node:fs';
import path from 'node:path';
import { extractStructuredSpecContent } from '@/lib/i18n/structuredContent';
import { localizeStructuredEntries } from '@/lib/i18n/contentLocalization';
import {
  attractionPageStructuredFields,
  categoryStructuredFields,
  destinationStructuredFields,
  destinationTranslationFields,
  imageMetadataStructuredField,
  tourTranslationFields,
} from '@/lib/i18n/translationFields';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('complete translation workflow', () => {
  it('covers the client-reported tour and destination fields', () => {
    const tourKeys = tourTranslationFields.map((field) => field.key);
    for (const key of [
      'difficulty', 'keywords', 'whatToBring', 'whatToWear', 'notSuitableFor',
      'needToKnow', 'accessibilityInfo', 'healthSafety', 'culturalInfo',
      'localCustoms', 'physicalRequirements', 'transportationDetails',
      'mealInfo', 'weatherPolicy', 'photoPolicy', 'tipPolicy', 'seasonalVariations',
    ]) expect(tourKeys).toContain(key);

    const destinationKeys = destinationTranslationFields.map((field) => field.key);
    expect(destinationKeys).toEqual(expect.arrayContaining([
      'climate', 'weatherWarnings', 'summerTemperature', 'winterTemperature',
    ]));
  });

  it('extracts FAQs, tips, and image captions without losing image identity', () => {
    const extracted = extractStructuredSpecContent({
      faqs: [{ question: 'When?', answer: 'Today.' }],
      travelTips: [{ title: 'Water', content: 'Bring some.' }],
      imageMetadata: [{ url: 'hero.jpg', alt: 'Hero', title: 'Cairo' }],
    }, attractionPageStructuredFields);

    expect(extracted).toEqual({
      faqs: [{ question: 'When?', answer: 'Today.' }],
      travelTips: [{ title: 'Water', content: 'Bring some.' }],
      imageMetadata: [{ url: 'hero.jpg', alt: 'Hero', title: 'Cairo' }],
    });
    expect(destinationStructuredFields).toContainEqual(imageMetadataStructuredField);
    expect(categoryStructuredFields).toContainEqual(imageMetadataStructuredField);
  });

  it('matches translated image captions by URL after gallery reordering', () => {
    const localized = localizeStructuredEntries({
      imageMetadata: [
        { url: 'two.jpg', alt: 'Two' },
        { url: 'one.jpg', alt: 'One' },
      ],
      translations: {
        de: {
          imageMetadata: [
            { url: 'one.jpg', alt: 'Eins' },
            { url: 'two.jpg', alt: 'Zwei' },
          ],
        },
      },
    }, 'de', attractionPageStructuredFields);
    expect(localized.imageMetadata.map((item) => item.alt)).toEqual(['Zwei', 'Eins']);
  });

  it('includes structured destination/page content in manual translation', () => {
    const route = read('app/api/admin/translate/stream/route.ts');
    expect(route).toContain('extractStructuredSpecContent');
    expect(route).toContain('translateStructuredSpecContentForLocale');
    expect(route).toContain('destinationStructuredFields');
    expect(route).toContain('categoryStructuredFields');
    expect(route).toContain('attractionPageStructuredFields');
  });

  it('applies structured translations on destination and page storefronts', () => {
    expect(read('app/[locale]/destinations/[slug]/page.tsx')).toContain('localizeStructuredEntries');
    expect(read('app/[locale]/categories/[slug]/page.tsx')).toContain('localizeStructuredEntries');
    expect(read('app/[locale]/attraction/[slug]/page.tsx')).toContain('localizeStructuredEntries');
  });

  it('renders manual controls for structured page, category, destination, and tour content', () => {
    const editor = read('components/admin/ContentStructuredTranslationEditor.tsx');
    expect(editor).toContain('FAQs');
    expect(editor).toContain('Travel tips');
    expect(editor).toContain('Image alt text and titles');

    for (const file of [
      'components/admin/AttractionPageForm.tsx',
      'components/admin/CategoryForm.tsx',
      'app/admin/destinations/DestinationManager.tsx',
      'components/admin/TourStructuredTranslationEditor.tsx',
    ]) expect(read(file)).toContain('ContentStructuredTranslationEditor');
  });

  it('keeps the English page picker deduplicated and free of German legacy rows', () => {
    const route = read('app/api/admin/pages/options/route.ts');
    expect(route).toContain("localizeAndDedupeTours(tours as Array<Record<string, unknown>>, 'en')");
  });
});
