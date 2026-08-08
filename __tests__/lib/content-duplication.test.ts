import {
  buildDestinationDuplicate,
  buildPageDuplicate,
  buildTourDuplicate,
  createUniqueDuplicate,
} from '@/lib/admin/contentDuplication';

describe('safe content duplication', () => {
  it('creates an unpublished tour draft with a unique slug and fresh option identities', () => {
    const source = {
      title: 'Test Tour', slug: 'test-tour', tenantId: 'brand-a', isPublished: true,
      bookingOptions: [{ _id: 'embedded', id: 'old-option', label: 'Standard', price: 50 }],
    };
    const draft = buildTourDuplicate(source, { id: 'new-tour', tenantId: 'brand-a', attempt: 1 });
    expect(draft).toMatchObject({
      _id: 'new-tour', tenantId: 'brand-a', title: 'Test Tour (Copy)', slug: 'test-tour-copy',
      isPublished: false, isFeatured: false,
    });
    expect((draft.bookingOptions as Array<Record<string, unknown>>)[0]).toMatchObject({ id: 'copy-new-tour-1' });
    expect((draft.bookingOptions as Array<Record<string, unknown>>)[0]._id).toBeUndefined();
    expect(source).toMatchObject({ title: 'Test Tour', slug: 'test-tour', isPublished: true });
  });

  it('copies destinations and pages as drafts under the same tenant', () => {
    expect(buildDestinationDuplicate(
      { name: 'Test Destination', slug: 'test-destination', description: 'Safe' },
      { tenantId: 'brand-a', attempt: 1 },
    )).toMatchObject({ tenantId: 'brand-a', name: 'Test Destination (Copy)', slug: 'test-destination-copy', isPublished: false });
    expect(buildPageDuplicate(
      { title: 'Test Page', slug: 'test-page', description: 'Safe', pageType: 'attraction' },
      { id: 'new-page', tenantId: 'brand-a', attempt: 1 },
    )).toMatchObject({ _id: 'new-page', tenantId: 'brand-a', title: 'Test Page (Copy)', slug: 'test-page-copy', isPublished: false });
  });

  it('retries duplicate-key collisions with incremented copy identities', async () => {
    const create = jest.fn()
      .mockRejectedValueOnce({ code: 11000 })
      .mockResolvedValueOnce({ ok: true });
    await expect(createUniqueDuplicate({
      build: (attempt) => ({ slug: attempt === 1 ? 'item-copy' : 'item-copy-2' }),
      create,
    })).resolves.toEqual({ ok: true });
    expect(create).toHaveBeenCalledTimes(2);
  });
});
