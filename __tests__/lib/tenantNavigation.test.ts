import {
  getTenantFooterDestinations,
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
});
