jest.mock('algoliasearch', () => ({ algoliasearch: jest.fn() }));

import {
  ALGOLIA_TENANT_FILTER_ATTRIBUTES,
  ALGOLIA_TENANT_RETRIEVE_ATTRIBUTES,
  formatTourForAlgolia,
} from '@/lib/algolia';

describe('Algolia tenant ownership contract', () => {
  it('keeps tenant ownership filterable and retrievable', () => {
    expect(ALGOLIA_TENANT_FILTER_ATTRIBUTES).toEqual([
      'filterOnly(tenantId)',
      'filterOnly(tenantIds)',
    ]);
    expect(ALGOLIA_TENANT_RETRIEVE_ATTRIBUTES).toEqual(['tenantId', 'tenantIds']);
  });

  it('stamps every tour with its owning tenant fields', () => {
    expect(formatTourForAlgolia({
      _id: 'tour-1',
      tenantId: 'cairo-excursions-online',
      tenantIds: ['cairo-excursions-online', 'hurghada-excursions-online'],
    })).toEqual(expect.objectContaining({
      tenantId: 'cairo-excursions-online',
      tenantIds: ['cairo-excursions-online', 'hurghada-excursions-online'],
    }));
  });
});
