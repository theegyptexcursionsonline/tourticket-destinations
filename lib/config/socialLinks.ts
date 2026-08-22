/**
 * The network's official social profiles — the fallback every storefront
 * uses when a tenant has not configured its own. One source so a wrong
 * handle cannot survive in one template after being corrected in another
 * (the footer and the contact page had drifted to different YouTube links).
 */
export const OFFICIAL_SOCIAL_LINKS = {
  facebook: 'https://web.facebook.com/EGexcursionsonline/?_rdc=1&_rdr#',
  instagram: 'https://www.instagram.com/egyptexcursionsonline/',
  youtube: 'https://www.youtube.com/@egyptexcursionsonline',
  twitter: 'https://x.com/excursiononline',
} as const;
