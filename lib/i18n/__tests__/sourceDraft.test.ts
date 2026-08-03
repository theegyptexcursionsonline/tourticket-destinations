import {
  SOURCE_DRAFT_MAX_CHARS,
  applySourceDraft,
  sanitizeSourceDraft,
} from '@/lib/i18n/sourceDraft';

const draftOf = (modelType: Parameters<typeof sanitizeSourceDraft>[0], raw: unknown) => {
  const result = sanitizeSourceDraft(modelType, raw);
  if (!result.ok) throw new Error(`expected a valid draft, got: ${result.error}`);
  return result.draft;
};

describe('sanitizeSourceDraft', () => {
  it('keeps per-image alt and title typed into the form', () => {
    const draft = draftOf('destination', {
      name: 'Hurghada',
      imageMetadata: [
        { url: 'https://cdn/a.jpg', alt: 'Red Sea reef', title: 'Reef at dawn' },
        { url: 'https://cdn/b.jpg', alt: 'Marina walkway' },
      ],
    });

    expect(draft.imageMetadata).toEqual([
      { url: 'https://cdn/a.jpg', alt: 'Red Sea reef', title: 'Reef at dawn' },
      { url: 'https://cdn/b.jpg', alt: 'Marina walkway' },
    ]);
    expect(draft.name).toBe('Hurghada');
  });

  it('drops an image block that carries urls but no caption text', () => {
    // ensureImageMetadata() pads every gallery url with empty alt/title, so an
    // untouched form must fall back to the saved document instead of blanking it.
    const draft = draftOf('category', {
      imageMetadata: [
        { url: 'https://cdn/a.jpg', alt: '', title: '' },
        { url: 'https://cdn/b.jpg' },
      ],
    });

    expect(draft.imageMetadata).toBeUndefined();
  });

  it('maps the tour form faqs key onto the document faq key', () => {
    const draft = draftOf('tour', {
      title: 'Pyramids day trip',
      faqs: [{ question: 'Is lunch included?', answer: 'Yes' }],
      itinerary: [{ title: 'Giza', description: 'Plateau visit', includes: ['Guide', ''] }],
      addOns: [{ name: 'Camel ride', description: 'Twenty minutes' }],
      bookingOptions: [{ label: 'Private', description: 'Your group only', badge: 'Popular' }],
    });

    expect(draft.faq).toEqual([{ question: 'Is lunch included?', answer: 'Yes' }]);
    expect(draft.faqs).toBeUndefined();
    expect(draft.itinerary).toEqual([
      { title: 'Giza', description: 'Plateau visit', includes: ['Guide'] },
    ]);
    expect(draft.addOns).toEqual([{ name: 'Camel ride', description: 'Twenty minutes' }]);
    expect(draft.bookingOptions).toEqual([
      { label: 'Private', description: 'Your group only', badge: 'Popular' },
    ]);
  });

  it('reads the nested destination temperature the flat fields are derived from', () => {
    const draft = draftOf('destination', {
      averageTemperature: { summer: '35°C', winter: '20°C', extra: 'ignored' },
    });

    expect(draft.averageTemperature).toEqual({ summer: '35°C', winter: '20°C' });
  });

  it('refuses to carry identity, tenancy, or stored translations', () => {
    const draft = draftOf('destination', {
      _id: 'other-document',
      id: 'other-document',
      tenantId: 'another-tenant',
      tenant: 'another-tenant',
      slug: 'rewritten-slug',
      role: 'super_admin',
      permissions: ['manageUsers'],
      translations: { ar: { name: 'injected' } },
      name: 'Hurghada',
    });

    expect(draft).toEqual({ name: 'Hurghada' });
  });

  it('drops fields that are not translatable content', () => {
    const draft = draftOf('tour', {
      title: 'Pyramids day trip',
      price: 120,
      isPublished: true,
      destinationId: 'dest-1',
      images: ['https://cdn/a.jpg'],
    });

    expect(draft).toEqual({ title: 'Pyramids day trip' });
  });

  it('drops values whose type does not match the field definition', () => {
    const draft = draftOf('category', {
      name: { malicious: 'object' },
      highlights: 'not-an-array',
      description: 'Kept',
    });

    expect(draft).toEqual({ description: 'Kept' });
  });

  it('ignores prototype-polluting keys in structured entries', () => {
    const entry = JSON.parse('{"url":"https://cdn/a.jpg","alt":"Reef","__proto__":{"polluted":true}}');
    const draft = draftOf('destination', { imageMetadata: [entry] });

    expect(draft.imageMetadata).toEqual([{ url: 'https://cdn/a.jpg', alt: 'Reef' }]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('treats a missing draft as no draft at all', () => {
    expect(sanitizeSourceDraft('tour', undefined)).toEqual({ ok: true, draft: {} });
    expect(sanitizeSourceDraft('tour', null)).toEqual({ ok: true, draft: {} });
  });

  it('fails closed when the draft is not a plain object', () => {
    const malformed: unknown[] = [[{ name: 'Hurghada' }], 'name=Hurghada', 42, true];

    for (const raw of malformed) {
      const result = sanitizeSourceDraft('destination', raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/plain JSON object/i);
    }
  });

  it('fails closed on an oversized raw payload', () => {
    const result = sanitizeSourceDraft('destination', { junk: 'x'.repeat(1_000_001) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/too large/i);
  });

  it('fails closed when the sanitized draft exceeds the size ceiling', () => {
    const imageMetadata = Array.from({ length: 250 }, (_, index) => ({
      url: `https://cdn/${index}.jpg`,
      alt: 'a'.repeat(2000),
    }));

    const result = sanitizeSourceDraft('destination', { imageMetadata });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/too large/i);
    expect(JSON.stringify({ imageMetadata }).length).toBeGreaterThan(SOURCE_DRAFT_MAX_CHARS);
  });
});

describe('applySourceDraft', () => {
  it('overrides only the keys the draft supplies', () => {
    const doc = {
      _id: 'doc-1',
      tenantId: 'default',
      name: 'Saved name',
      description: 'Saved description',
      imageMetadata: [{ url: 'https://cdn/a.jpg', alt: '', title: '' }],
    };
    const draft = draftOf('destination', {
      name: 'Edited name',
      imageMetadata: [{ url: 'https://cdn/a.jpg', alt: 'Red Sea reef', title: 'Reef at dawn' }],
    });

    const merged = applySourceDraft(doc, draft);

    expect(merged.name).toBe('Edited name');
    expect(merged.description).toBe('Saved description');
    expect(merged.imageMetadata).toEqual([
      { url: 'https://cdn/a.jpg', alt: 'Red Sea reef', title: 'Reef at dawn' },
    ]);
    expect(merged._id).toBe('doc-1');
    expect(merged.tenantId).toBe('default');
  });

  it('returns the saved document untouched when the draft is empty', () => {
    const doc = { name: 'Saved name' };
    expect(applySourceDraft(doc, {})).toBe(doc);
    expect(applySourceDraft(doc, undefined)).toBe(doc);
  });
});
