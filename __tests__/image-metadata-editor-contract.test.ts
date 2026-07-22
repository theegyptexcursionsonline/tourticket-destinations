import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

function galleryEditorBlock(source: string): string {
  const start = source.indexOf('{formData.images.map');
  expect(start).toBeGreaterThanOrEqual(0);

  const emptyState = source.indexOf(') : (', start);
  expect(emptyState).toBeGreaterThan(start);

  return source.slice(start, emptyState);
}

describe('per-image SEO metadata editor contracts', () => {
  it.each([
    'components/TourForm.tsx',
    'components/admin/CategoryForm.tsx',
  ])('renders independent metadata controls inside every gallery item in %s', (file) => {
    const gallery = galleryEditorBlock(read(file));

    expect(gallery).toContain('<ImageSeoFields');
    expect(gallery).toContain('url={img}');
    expect(gallery).toContain('item.url === img');
    expect(gallery).toContain('onChange={updateImageMetadata}');
    expect(gallery).not.toContain('alt={`Gallery ${i}`}');
  });

  it('keeps separate metadata for featured, gallery, and inline blog images', () => {
    const source = read('app/admin/blog/BlogManager.tsx');
    const galleryStart = source.indexOf('{formData.images.map');
    const galleryEnd = source.indexOf('{formData.images.length === 0', galleryStart);
    const gallery = source.slice(galleryStart, galleryEnd);

    expect(source).toContain('value={formData.imageMetadata.find((item) => item.url === formData.featuredImage)}');
    expect(gallery).toContain('<ImageSeoFields');
    expect(gallery).toContain('url={image}');
    expect(gallery).toContain('item.url === image');
    expect(gallery).not.toContain('alt={`Additional image ${index + 1}`}');
    expect(source).toContain('aria-label="Inline image details"');
    expect(source).toContain('Image alt text *');
    expect(source).toContain('Image title');
    expect(source).toContain('alt="${safeAlt}"${safeTitle}');
  });

  it.each([
    ['components/admin/AttractionPageForm.tsx', 'img'],
    ['app/admin/destinations/DestinationManager.tsx', 'image'],
  ])('keeps per-image controls in the remaining gallery editor %s', (file, variable) => {
    const source = read(file);
    expect(source).toContain('<ImageSeoFields');
    expect(source).toContain(`url={${variable}}`);
    expect(source).toContain(`item.url === ${variable}`);
    expect(source).toContain('onChange={updateImageMetadata}');
  });

  it('lets every existing hero slide edit its own alt text', () => {
    const source = read('app/admin/hero-settings/page.tsx');
    const start = source.indexOf('backgroundImages.map((image, index)');
    const end = source.indexOf('{/* Add New Image */}', start);
    const cards = source.slice(start, end);

    expect(cards).toContain('value={image.alt}');
    expect(cards).toContain('required');
    expect(cards).toContain('imageIndex === index');
    expect(cards).toContain("? { ...item, alt: event.target.value }");
    expect(source).toContain('backgroundImages.some((image) => !image.alt?.trim())');
    expect(source).toContain('Add alt text for every hero image before saving.');
  });
});
