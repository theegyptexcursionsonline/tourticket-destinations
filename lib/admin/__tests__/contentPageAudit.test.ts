import {
  contentPageAuditAttemptDetail,
  contentPageAuditDetail,
} from '@/lib/admin/contentPageAudit';

describe('content page audit detail', () => {
  it('names the exact page and reports only effective field changes', () => {
    const detail = contentPageAuditDetail({
      kind: 'attraction page',
      operation: 'update',
      before: {
        _id: 'page-1',
        tenantId: 'default',
        title: 'Old Cairo',
        slug: 'old-cairo',
        description: 'Before',
        isPublished: false,
        images: ['one.jpg'],
      },
      after: {
        _id: 'page-1',
        tenantId: 'default',
        title: 'Historic Cairo',
        slug: 'historic-cairo',
        description: 'After',
        isPublished: true,
        images: ['one.jpg'],
      },
    });

    expect(detail).toEqual(expect.objectContaining({
      action: 'update',
      resourceType: 'pages',
      resourceId: 'page-1',
      resourceLabel: 'Historic Cairo',
      tenantIds: ['default'],
      changedFields: ['title', 'slug', 'description', 'isPublished'],
      summary: 'Updated attraction page “Historic Cairo”: title, URL slug, description, published state',
    }));
    expect(detail.changes).toEqual([
      { field: 'title', before: 'Old Cairo', after: 'Historic Cairo' },
      { field: 'slug', before: 'old-cairo', after: 'historic-cairo' },
      { field: 'isPublished', before: false, after: true },
    ]);
  });

  it('describes archive and restore as their real business actions', () => {
    const archived = contentPageAuditDetail({
      kind: 'category page',
      operation: 'update',
      before: { _id: 'category-1', name: 'Boat Trips', archivedAt: null },
      after: { _id: 'category-1', name: 'Boat Trips', archivedAt: new Date('2026-08-05T12:00:00Z') },
    });
    expect(archived).toEqual(expect.objectContaining({
      action: 'execute',
      resourceLabel: 'Boat Trips',
      summary: 'Archived category page “Boat Trips”',
      changedFields: ['archivedAt'],
    }));

    const restored = contentPageAuditDetail({
      kind: 'category page',
      operation: 'update',
      before: { _id: 'category-1', name: 'Boat Trips', archivedAt: '2026-08-05T12:00:00.000Z' },
      after: { _id: 'category-1', name: 'Boat Trips', archivedAt: null },
    });
    expect(restored.summary).toBe('Restored category page “Boat Trips”');
  });

  it('states when a save produced no effective content change', () => {
    const record = { _id: 'page-2', title: 'Luxor Highlights', slug: 'luxor-highlights' };
    expect(contentPageAuditDetail({
      kind: 'attraction page',
      operation: 'update',
      before: record,
      after: { ...record },
    })).toEqual(expect.objectContaining({
      resourceLabel: 'Luxor Highlights',
      changedFields: [],
      summary: 'Updated attraction page “Luxor Highlights”: no effective content change',
    }));
  });

  it('keeps rejected attempts attributable to the page without retaining page content', () => {
    expect(contentPageAuditAttemptDetail({
      kind: 'attraction page',
      operation: 'update',
      resourceId: 'page-3',
      record: {
        title: 'Red Sea Adventures',
        tenantId: 'default',
        description: 'Long public content that is not copied into the audit detail',
      },
    })).toEqual({
      action: 'update',
      resourceType: 'pages',
      resourceId: 'page-3',
      resourceLabel: 'Red Sea Adventures',
      summary: 'Attempted to update attraction page “Red Sea Adventures”',
      tenantIds: ['default'],
    });
  });
});
