import {
  getTenantFooterDestinations,
  getTenantCategoryHref,
  getTenantDestinationHref,
  hasTenantScopedNavigationContent,
  tenantMegaMenuCategories,
  tenantMegaMenuDestinations,
} from '@/lib/tenantNavigation';

describe('tenantNavigation', () => {
  it('provides city-specific menu fallbacks for el gouna', () => {
    expect(tenantMegaMenuDestinations['el-gouna']?.[0]?.name).toBe('Abu Tig Marina');
    expect(tenantMegaMenuCategories['el-gouna']?.[0]?.name).toBe('Kitesurfing & Watersports');
  });

  it('reuses the same fallback set for legacy and new tenant ids', () => {
    expect(tenantMegaMenuDestinations.hurghada?.[0]?.slug).toBe(
      tenantMegaMenuDestinations['hurghada-excursions-online']?.[0]?.slug
    );
    expect(tenantMegaMenuDestinations['makadi-ausfluege']?.[0]?.slug).toBe(
      tenantMegaMenuDestinations['makadi-bay']?.[0]?.slug
    );
    expect(tenantMegaMenuCategories.luxor?.[0]?.slug).toBe(
      tenantMegaMenuCategories['luxor-excursions']?.[0]?.slug
    );
    expect(tenantMegaMenuCategories['sharm-ausfluege']?.[0]?.slug).toBe(
      tenantMegaMenuCategories['sharm-excursions-online']?.[0]?.slug
    );
  });

  it('derives tenant footer destinations from the shared menu destinations', () => {
    const footerDestinations = getTenantFooterDestinations('el-gouna');

    expect(footerDestinations).toHaveLength(5);
    expect(footerDestinations?.[0]).toMatchObject({
      name: 'Abu Tig Marina',
      slug: 'abu-tig-marina',
    });
  });

  it('detects tenant-scoped content from either tenantId or tenantIds', () => {
    expect(
      hasTenantScopedNavigationContent(
        [{ tenantId: 'el-gouna' }, { tenantId: 'default' }],
        'el-gouna'
      )
    ).toBe(true);

    expect(
      hasTenantScopedNavigationContent(
        [{ tenantId: 'default' }, { tenantIds: ['el-gouna', 'makadi-bay'] }],
        'el-gouna'
      )
    ).toBe(true);

    expect(
      hasTenantScopedNavigationContent(
        [{ tenantId: 'default' }, { tenantIds: ['makadi-bay'] }],
        'el-gouna'
      )
    ).toBe(false);
  });

  it('sends generated tenant fallback links to search instead of dead detail pages', () => {
    expect(
      getTenantDestinationHref({
        _id: 'tenant-dest-0',
        name: 'Abu Tig Marina',
        slug: 'abu-tig-marina',
      })
    ).toBe('/search?q=Abu%20Tig%20Marina');

    expect(
      getTenantCategoryHref({
        _id: 'tenant-cat-0',
        name: 'Kitesurfing & Watersports',
        slug: 'kitesurfing-watersports',
      })
    ).toBe('/search?q=Kitesurfing%20%26%20Watersports');
  });

  it('keeps real tenant records linked to their detail pages', () => {
    expect(
      getTenantDestinationHref({
        _id: 'real-dest',
        name: 'Downtown El Gouna',
        slug: 'downtown-el-gouna',
      })
    ).toBe('/destinations/downtown-el-gouna');

    expect(
      getTenantCategoryHref({
        _id: 'real-cat',
        name: 'Day Trips',
        slug: 'day-trips',
      })
    ).toBe('/categories/day-trips');
  });
});
