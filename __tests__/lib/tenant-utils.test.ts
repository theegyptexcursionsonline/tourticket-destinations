/**
 * @jest-environment node
 *
 * Tests for pure utility functions from lib/tenant.ts
 * (No DB or Next.js header dependencies)
 */
import {
  withTenantFilter,
  buildTenantQuery,
  buildStrictTenantQuery,
  generateCSSVariables,
  generateBrandingStyles,
  generatePreviewUrl,
  generateResetPreviewUrl,
  getDefaultTenantConfig,
  clearTenantCache,
} from '@/lib/tenant';

// Mock DB and Next.js server imports that tenant.ts pulls in
jest.mock('next/headers', () => ({
  headers: jest.fn(),
  cookies: jest.fn(),
}));
jest.mock('@/lib/dbConnect', () => jest.fn(() => Promise.resolve()));
jest.mock('@/lib/models/Tenant', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), find: jest.fn() },
}));

describe('Tenant utility helpers', () => {
  describe('withTenantFilter', () => {
    it('should add tenantId to an existing query', () => {
      const query = { isPublished: true };
      const result = withTenantFilter(query, 'hurghada');
      expect(result).toEqual({ isPublished: true, tenantId: 'hurghada' });
    });

    it('should preserve all existing query fields', () => {
      const query = { status: 'active', category: 'tours' };
      const result = withTenantFilter(query, 'cairo');
      expect(result).toEqual({ status: 'active', category: 'tours', tenantId: 'cairo' });
    });
  });

  describe('buildTenantQuery', () => {
    it('should include default tenant by default', () => {
      const query = buildTenantQuery({ isPublished: true }, 'hurghada') as any;
      expect(query.$or).toBeDefined();
      expect(query.$or).toEqual(
        expect.arrayContaining([
          { tenantId: { $in: expect.arrayContaining(['hurghada', 'default']) } },
        ])
      );
    });

    it('should not duplicate default when tenantId IS default', () => {
      const query = buildTenantQuery({ isPublished: true }, 'default') as any;
      const tenantIds = query.$or?.[0]?.tenantId?.$in;
      expect(tenantIds).toEqual(['default']);
    });

    it('should include shared content when option is set', () => {
      const query = buildTenantQuery({ isPublished: true }, 'hurghada', { includeShared: true }) as any;
      const tenantIds = query.$or?.[0]?.tenantId?.$in;
      expect(tenantIds).toContain('shared');
      expect(tenantIds).toContain(null);
    });

    it('should do strict filter when includeDefault is false', () => {
      const query = buildTenantQuery({ isPublished: true }, 'hurghada', { includeDefault: false });
      expect(query.$or).toBeUndefined();
      expect(query.tenantId).toBe('hurghada');
    });

    it('should preserve base query fields', () => {
      const query = buildTenantQuery({ isPublished: true, category: 'tours' }, 'hurghada');
      expect(query.isPublished).toBe(true);
      expect(query.category).toBe('tours');
    });
  });

  describe('buildStrictTenantQuery', () => {
    it('should only include the specified tenant', () => {
      const query = buildStrictTenantQuery({ isPublished: true }, 'hurghada');
      expect(query).toEqual({ isPublished: true, tenantId: 'hurghada' });
    });

    it('should not include $or or default fallback', () => {
      const query = buildStrictTenantQuery({}, 'cairo');
      expect(query.$or).toBeUndefined();
      expect(query.tenantId).toBe('cairo');
    });
  });

  describe('generateCSSVariables', () => {
    const branding = {
      logo: '/logo.png',
      logoAlt: 'Test',
      favicon: '/favicon.ico',
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#F4A261',
      fontFamily: 'Inter',
    };

    it('should generate valid CSS with primary color', () => {
      const css = generateCSSVariables(branding);
      expect(css).toContain('--primary-color: #E63946');
    });

    it('should generate valid CSS with secondary color', () => {
      const css = generateCSSVariables(branding);
      expect(css).toContain('--secondary-color: #1D3557');
    });

    it('should use default background color when not provided', () => {
      const css = generateCSSVariables(branding);
      expect(css).toContain('--background-color: #FFFFFF');
    });

    it('should use custom background color when provided', () => {
      const css = generateCSSVariables({ ...branding, backgroundColor: '#000000' });
      expect(css).toContain('--background-color: #000000');
    });
  });

  describe('generateBrandingStyles', () => {
    it('should return a CSSProperties-compatible object', () => {
      const styles = generateBrandingStyles({
        logo: '/logo.png',
        logoAlt: 'Test',
        favicon: '/fav.ico',
        primaryColor: '#E63946',
        secondaryColor: '#1D3557',
        accentColor: '#F4A261',
        fontFamily: 'Inter',
      });

      const s = styles as Record<string, string>;
      expect(s['--primary-color']).toBe('#E63946');
      expect(s['--secondary-color']).toBe('#1D3557');
      expect(s['--accent-color']).toBe('#F4A261');
    });
  });

  describe('generatePreviewUrl', () => {
    it('should add tenant query parameter', () => {
      const url = generatePreviewUrl('hurghada', '/', 'https://example.com');
      expect(url).toContain('tenant=hurghada');
    });

    it('should use the provided path', () => {
      const url = generatePreviewUrl('hurghada', '/tours', 'https://example.com');
      expect(url).toContain('/tours');
    });

    it('should default to / path', () => {
      const url = generatePreviewUrl('hurghada', undefined, 'https://example.com');
      expect(url).toContain('https://example.com/');
    });
  });

  describe('generateResetPreviewUrl', () => {
    it('should add reset_tenant parameter', () => {
      const url = generateResetPreviewUrl('/', 'https://example.com');
      expect(url).toContain('reset_tenant=true');
    });
  });

  describe('getDefaultTenantConfig', () => {
    it('should generate a config with the correct tenantId', () => {
      const config = getDefaultTenantConfig('luxor', 'Luxor Tours');
      expect(config.tenantId).toBe('luxor');
      expect(config.name).toBe('Luxor Tours');
    });

    it('should generate a domain from tenantId', () => {
      const config = getDefaultTenantConfig('luxor', 'Luxor Tours');
      expect(config.domain).toBe('luxortours.com');
    });

    it('should have default branding colors', () => {
      const config = getDefaultTenantConfig('luxor', 'Luxor Tours');
      expect(config.branding?.primaryColor).toBe('#E63946');
    });

    it('should enable common features', () => {
      const config = getDefaultTenantConfig('luxor', 'Luxor Tours');
      expect(config.features?.enableBlog).toBe(true);
      expect(config.features?.enableReviews).toBe(true);
      expect(config.features?.enableWishlist).toBe(true);
    });

    it('should set isActive true and isDefault false', () => {
      const config = getDefaultTenantConfig('luxor', 'Luxor Tours');
      expect(config.isActive).toBe(true);
      expect(config.isDefault).toBe(false);
    });
  });

  describe('clearTenantCache', () => {
    it('should not throw when clearing all cache', () => {
      expect(() => clearTenantCache()).not.toThrow();
    });

    it('should not throw when clearing specific tenant cache', () => {
      expect(() => clearTenantCache('hurghada')).not.toThrow();
    });
  });
});
