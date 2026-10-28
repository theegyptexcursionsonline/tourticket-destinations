import { isMissingMainImage, MISSING_MAIN_IMAGE_PATH } from '@/lib/admin/tourMainImage';

describe('isMissingMainImage', () => {
  it('accepts a real image URL', () => {
    expect(isMissingMainImage('https://res.cloudinary.com/demo/image/upload/v1/tours/kom-ombo.webp')).toBe(false);
    expect(isMissingMainImage('/uploads/tours/kom-ombo.jpg')).toBe(false);
  });

  it('treats a blank or absent image as missing', () => {
    expect(isMissingMainImage('')).toBe(true);
    expect(isMissingMainImage('   ')).toBe(true);
    expect(isMissingMainImage(undefined)).toBe(true);
    expect(isMissingMainImage(null)).toBe(true);
  });

  it('treats the never-existing placeholder path as missing', () => {
    expect(isMissingMainImage(MISSING_MAIN_IMAGE_PATH)).toBe(true);
    expect(isMissingMainImage(` ${MISSING_MAIN_IMAGE_PATH} `)).toBe(true);
  });
});
