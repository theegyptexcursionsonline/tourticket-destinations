import {
  filterSearchHitsByTenant,
  searchHitBelongsToTenant,
} from '@/lib/tenantSearchHitFilter';

describe('tenantSearchHitFilter', () => {
  it('keeps hits assigned directly to the active tenant', () => {
    expect(searchHitBelongsToTenant({ tenantId: 'el-gouna' }, 'el-gouna')).toBe(true);
  });

  it('keeps hits assigned through tenantIds', () => {
    expect(searchHitBelongsToTenant({ tenantIds: ['hurghada', 'el-gouna'] }, 'el-gouna')).toBe(true);
  });

  it('removes hits from another tenant', () => {
    expect(searchHitBelongsToTenant({ tenantId: 'sharm-el-sheikh' }, 'el-gouna')).toBe(false);
  });

  it('keeps legacy untagged hits only on the default site', () => {
    expect(searchHitBelongsToTenant({ title: 'Legacy Tour' }, 'default')).toBe(true);
    expect(searchHitBelongsToTenant({ title: 'Legacy Tour' }, 'el-gouna')).toBe(false);
  });

  it('filters mixed result sets', () => {
    const hits = filterSearchHitsByTenant(
      [
        { title: 'El Gouna Marina', tenantId: 'el-gouna' },
        { title: 'Sharm Tour', tenantId: 'sharm-el-sheikh' },
        { title: 'Shared El Gouna Tour', tenantIds: ['el-gouna', 'hurghada'] },
      ],
      'el-gouna'
    );

    expect(hits).toHaveLength(2);
    expect(hits.map((hit) => hit.title)).toEqual(['El Gouna Marina', 'Shared El Gouna Tour']);
  });
});
