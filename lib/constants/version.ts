// lib/constants/version.ts
// Application version configuration

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  type: 'major' | 'minor' | 'patch';
}

export const APP_VERSION = {
  version: '2.1.0',
  releaseDate: '2025-01-28',
  name: 'Multi-Tenant Admin',
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.1.0',
    date: '2025-01-28',
    type: 'minor',
    changes: [
      'Added per-brand website status management (Active, Coming Soon, Maintenance, Offline)',
      'Improved brand selector filtering across all admin pages',
      'Added Coming Soon, Maintenance, and Offline pages',
      'Enhanced booking filters with date ranges and pagination options',
      'Fixed duplicate menu items in sidebar',
      'Added tenant filtering to Dashboard, Bookings, Reviews, and Reports',
    ],
  },
  {
    version: '2.0.0',
    date: '2025-01-15',
    type: 'major',
    changes: [
      'Multi-tenant support with brand management',
      'Per-brand theming and branding',
      'Domain-based tenant detection',
      'Admin tenant selector for filtering',
      'Brand-specific settings and configurations',
    ],
  },
  {
    version: '1.5.0',
    date: '2024-12-01',
    type: 'minor',
    changes: [
      'Advanced booking management',
      'Tour management improvements',
      'Category and destination management',
      'Blog and content management',
    ],
  },
  {
    version: '1.0.0',
    date: '2024-10-01',
    type: 'major',
    changes: [
      'Initial release',
      'Tour booking system',
      'Admin dashboard',
      'User management',
      'Payment integration',
    ],
  },
];

// Helper to get current version string
export function getVersionString(): string {
  return `v${APP_VERSION.version}`;
}

// Helper to get formatted release date
export function getReleaseDateFormatted(): string {
  return new Date(APP_VERSION.releaseDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

