const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type SafeImageType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

export function detectImageType(buffer: Buffer): SafeImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return 'image/png';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return null;
}

export function validateImageUpload(file: File, buffer: Buffer): SafeImageType {
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES || file.size !== buffer.length) {
    throw new Error('Image must be between 1 byte and 5MB.');
  }
  const detected = detectImageType(buffer);
  if (!detected) throw new Error('File contents are not a supported image.');
  const normalizedDeclared = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  if (normalizedDeclared && normalizedDeclared !== detected) {
    throw new Error('File type does not match its contents.');
  }
  return detected;
}

export const extensionForImageType = (type: SafeImageType) => ({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
}[type]);
