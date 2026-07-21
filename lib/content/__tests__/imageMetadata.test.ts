import { ensureImageMetadata, imageMetadataFor, normalizeImageMetadata } from '@/lib/content/imageMetadata';

describe('image metadata', () => {
  it('normalizes valid entries and removes duplicates or orphaned values', () => {
    expect(normalizeImageMetadata([
      { url: ' /hero.jpg ', alt: ' Hero alt ', title: ' Hero title ' },
      { url: '/hero.jpg', alt: 'duplicate' },
      { url: '', alt: 'orphan' },
      null,
    ])).toEqual([{ url: '/hero.jpg', alt: 'Hero alt', title: 'Hero title' }]);
  });

  it('keeps metadata only for images that are still attached', () => {
    expect(ensureImageMetadata([
      { url: '/hero.jpg', alt: 'Hero' },
      { url: '/removed.jpg', alt: 'Removed' },
    ], ['/hero.jpg', '/gallery.jpg'])).toEqual([
      { url: '/hero.jpg', alt: 'Hero', title: '' },
      { url: '/gallery.jpg', alt: '', title: '' },
    ]);
  });

  it('falls back to readable alt and title text', () => {
    expect(imageMetadataFor('/gallery.jpg', [], 'Luxor gallery')).toEqual({
      alt: 'Luxor gallery',
      title: 'Luxor gallery',
    });
  });
});
