import { localizeTour } from '@/lib/translation/getLocalizedField';
import {
  localizeAndDedupeTours,
  selectLocalizedTourCandidate,
} from '@/lib/translation/localizeTourCollection';

describe('tour localization helpers', () => {
  it('prefers translations.en over a foreign raw title on English pages', () => {
    const localized = localizeTour(
      {
        title: 'Luxor-Tagesausflug: Tal der Konige & Karnak-Tempel',
        duration: '16 Stunden',
        translations: {
          en: {
            fields: {
              title: 'Luxor Day Trip: Valley of Kings & Karnak Temple',
              duration: '16 hours',
            },
          },
        },
      },
      'en'
    );

    expect(localized.title).toBe('Luxor Day Trip: Valley of Kings & Karnak Temple');
    expect(localized.duration).toBe('16 hours');
  });

  it('dedupes same-slug tours after localization', () => {
    const tours = localizeAndDedupeTours(
      [
        {
          _id: 'en-1',
          slug: 'luxor-day-trip',
          title: 'Luxor Day Trip: Valley of Kings & Karnak Temple',
          duration: '16 hours',
          rating: 4.6,
        },
        {
          _id: 'de-1',
          slug: 'luxor-day-trip',
          title: 'Luxor-Tagesausflug: Tal der Konige & Karnak-Tempel',
          duration: '16 Stunden',
          rating: 4.6,
          translations: {
            en: {
              fields: {
                title: 'Luxor Day Trip: Valley of Kings & Karnak Temple',
                duration: '16 hours',
              },
            },
          },
        },
      ],
      'en'
    );

    expect(tours).toHaveLength(1);
    expect(tours[0].title).toBe('Luxor Day Trip: Valley of Kings & Karnak Temple');
    expect(tours[0].slug).toBe('luxor-day-trip');
  });

  it('selects the best localized candidate for a duplicated slug', () => {
    const selected = selectLocalizedTourCandidate(
      [
        {
          _id: 'de-1',
          slug: 'horse-riding-tour',
          title: 'Strand- und Wustenausritt',
          description: 'Erleben Sie die Magie von Sharm el-Sheikh vom Pferderucken aus.',
          translations: {
            en: {
              fields: {
                title: 'Beach and Desert Horse Riding Tour',
                description: 'Experience the magic of Sharm el-Sheikh from horseback.',
              },
            },
          },
        },
        {
          _id: 'en-1',
          slug: 'horse-riding-tour',
          title: 'Beach and Desert Horse Riding Tour',
          description: 'Experience the magic of Sharm el-Sheikh from horseback.',
        },
      ],
      'en'
    );

    expect(selected?.title).toBe('Beach and Desert Horse Riding Tour');
  });
});
