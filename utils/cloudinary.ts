// utils/cloudinary.ts
export const getOptimizedImageUrl = (
  imageUrl: string, 
  options: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
    crop?: string;
  } = {}
) => {
  const {
    width = 400,
    height = 400,
    quality = 'auto',
    format = 'auto',
    crop = 'fill'
  } = options;

  // If it's already a Cloudinary URL, add transformations
  if (imageUrl?.includes('res.cloudinary.com')) {
    const urlParts = imageUrl.split('/upload/');
    if (urlParts.length === 2) {
      const transforms = `c_${crop},w_${width},h_${height},q_${quality},f_${format}`;
      return `${urlParts[0]}/upload/${transforms}/${urlParts[1]}`;
    }
  }
  
  // For non-Cloudinary URLs, return as is
  return imageUrl;
};

export const generateBlurDataURL = (width: number = 8, height: number = 8): string => {
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f1f5f9"/>
    </svg>`
  ).toString('base64')}`;
};

// Preload critical images
export const preloadImage = (src: string): void => {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  }
};
// Lightweight Cloudinary URL transformer for raw <img> tags (which bypass the
// next/image loader). Caps delivered resolution so full-size originals are not
// shipped to phones — full-res images decode to huge bitmaps and crash iOS
// Safari ("A problem repeatedly occurred"). Non-Cloudinary URLs pass through.
export const cdnImg = (url?: string | null, width = 600): string => {
  if (!url) return url || "";
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    const [base, rest] = url.split("/upload/");
    const firstSeg = rest.split("/")[0];
    if (/(^|,)(w|h|c|q|f|dpr|e|g|ar)_/.test(firstSeg)) return url;
    return `${base}/upload/f_auto,q_auto,c_limit,w_${width}/${rest}`;
  }
  return url;
};
