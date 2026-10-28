// The tour form used to save this path whenever the main image was removed.
// The file has never existed on any site, so a tour saved with it shows no
// photo on its page, its cards or in search.
export const MISSING_MAIN_IMAGE_PATH = '/images/placeholder.png';

export const MAIN_IMAGE_REQUIRED_MESSAGE = 'Add a main image before saving. Upload one under Media.';

export function isMissingMainImage(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const image = value.trim();
  return !image || image === MISSING_MAIN_IMAGE_PATH;
}
