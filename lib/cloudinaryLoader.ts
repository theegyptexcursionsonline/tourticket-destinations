// lib/cloudinaryLoader.ts
//
// Custom next/image loader. The storefront is deployed on Netlify, where Next's
// built-in image optimizer isn't used — images were previously served with
// `images.unoptimized = true`, i.e. full-resolution originals. That shipped
// multi-MB Cloudinary photos straight to phones: a single homepage pulled
// ~25 MB of images, which exhausts iOS Safari's per-tab memory limit and
// triggers the "A problem repeatedly occurred" tab crash (mobile-only, because
// desktop browsers have far more headroom).
//
// This loader rewrites image URLs so they are resized/compressed at the CDN:
//   - Cloudinary → inject f_auto,q_auto,c_limit,w_<width>,dpr_auto transforms
//   - Unsplash   → use its query-string resizing (?w=&q=&auto=format)
//   - everything else (S3, wikimedia, local, data URLs) → returned unchanged
//
// Combined with next/image's responsive srcSet (deviceSizes/imageSizes), phones
// now download appropriately small images instead of full-resolution originals.

interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

export default function cloudinaryLoader({src, width, quality}: LoaderArgs): string {
  // Cloudinary delivery URLs look like: .../image/upload/<transforms?>/<public_id>
  if (src.includes('res.cloudinary.com') && src.includes('/upload/')) {
    const [base, rest] = src.split('/upload/');
    // Don't double-transform if the URL already carries a transform segment.
    const firstSegment = rest.split('/')[0];
    const alreadyTransformed = /(^|,)(w|h|c|q|f|dpr|e|g|ar)_/.test(firstSegment);
    if (alreadyTransformed) return src;
    const transforms = [
      'f_auto',
      quality ? `q_${quality}` : 'q_auto',
      'c_limit',
      `w_${width}`,
      'dpr_auto',
    ].join(',');
    return `${base}/upload/${transforms}/${rest}`;
  }

  // Unsplash supports on-the-fly resizing via query params.
  if (src.includes('images.unsplash.com')) {
    try {
      const url = new URL(src);
      url.searchParams.set('w', String(width));
      url.searchParams.set('q', String(quality ?? 75));
      url.searchParams.set('auto', 'format');
      return url.toString();
    } catch {
      return src;
    }
  }

  // Unknown hosts / local / data URLs: leave untouched.
  return src;
}
