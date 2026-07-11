import { detectImageType, validateImageUpload } from '@/lib/security/imageUpload';

describe('image upload validation', () => {
  it('detects supported formats from bytes rather than filenames', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe('image/jpeg');
    expect(detectImageType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('image/png');
    expect(detectImageType(Buffer.from('RIFF0000WEBP'))).toBe('image/webp');
    expect(detectImageType(Buffer.from('0000ftypavif'))).toBe('image/avif');
  });

  it('rejects executable content disguised with an image MIME type', () => {
    const buffer = Buffer.from('<script>alert(1)</script>');
    const file = { size: buffer.length, type: 'image/png' } as File;
    expect(() => validateImageUpload(file, buffer)).toThrow('not a supported image');
  });

  it('rejects a MIME and content mismatch', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    const file = { size: buffer.length, type: 'image/png' } as File;
    expect(() => validateImageUpload(file, buffer)).toThrow('does not match');
  });
});
