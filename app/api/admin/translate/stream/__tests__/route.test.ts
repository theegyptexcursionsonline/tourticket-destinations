/**
 * The streaming translate route reloaded the saved document, so English image
 * alt/title typed into the edit form but not yet saved was never translated —
 * and the UI still reported every locale as successful. It now accepts the
 * form's draft, but only as translatable content: tenant scope and identity
 * still come from the authenticated request and the saved document.
 */

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    _body: unknown;
    constructor(body: unknown, init?: { status?: number }) {
      this._body = body;
      this.status = init?.status || 200;
    }
    async json() { return this._body; }
    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }
  return { NextResponse: MockNextResponse };
});

const mockRequireAdminAuth = jest.fn();
const mockCanAccessTenant = jest.fn();
jest.mock('@/lib/auth/adminAuth', () => {
  const { NextResponse } = jest.requireMock('next/server');
  return {
    requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
    canAccessTenant: (...args: unknown[]) => mockCanAccessTenant(...args),
    tenantForbiddenResponse: () =>
      NextResponse.json({ success: false, error: 'You do not have access to this tenant.' }, { status: 403 }),
  };
});

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/openai', () => ({ getOpenAIClient: () => null }));
const mockRevalidateStorefront = jest.fn();
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({
  revalidateStorefrontContent: (...args: unknown[]) => mockRevalidateStorefront(...args),
  revalidateTourStorefront: jest.fn(),
}));

const mockDestinationTenantLookup = jest.fn();
const mockDestinationFindOne = jest.fn();
const mockDestinationUpdate = jest.fn();
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => ({ select: () => ({ lean: () => mockDestinationTenantLookup(...args) }) }),
    findOne: (...args: unknown[]) => ({ lean: () => mockDestinationFindOne(...args) }),
    findOneAndUpdate: (...args: unknown[]) => mockDestinationUpdate(...args),
  },
}));

const mockTourTenantLookup = jest.fn();
const mockTourFindOne = jest.fn();
const mockTourUpdate = jest.fn();
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => ({ select: () => ({ lean: () => mockTourTenantLookup(...args) }) }),
    findOne: (...args: unknown[]) => ({ lean: () => mockTourFindOne(...args) }),
    findOneAndUpdate: (...args: unknown[]) => mockTourUpdate(...args),
  },
}));

const mockCategoryTenantLookup = jest.fn();
const mockCategoryFindOne = jest.fn();
const mockCategoryUpdate = jest.fn();
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => ({ select: () => ({ lean: () => mockCategoryTenantLookup(...args) }) }),
    findOne: (...args: unknown[]) => ({ lean: () => mockCategoryFindOne(...args) }),
    findOneAndUpdate: (...args: unknown[]) => mockCategoryUpdate(...args),
  },
}));

const mockAttractionPageTenantLookup = jest.fn();
const mockAttractionPageFindOne = jest.fn();
const mockAttractionPageUpdate = jest.fn();
jest.mock('@/lib/models/AttractionPage', () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => ({ select: () => ({ lean: () => mockAttractionPageTenantLookup(...args) }) }),
    findOne: (...args: unknown[]) => ({ lean: () => mockAttractionPageFindOne(...args) }),
    findOneAndUpdate: (...args: unknown[]) => mockAttractionPageUpdate(...args),
  },
}));

// Keep the real extractors — they are what the draft has to reach — and stub
// only the calls that would hit OpenAI.
const mockTranslateFlat = jest.fn();
const mockTranslateStructuredSpec = jest.fn();
const mockTranslateTour = jest.fn();
jest.mock('@/lib/i18n/autoTranslate', () => {
  const actual = jest.requireActual('@/lib/i18n/autoTranslate');
  return {
    ...actual,
    translateEntityFieldsForLocale: (...args: unknown[]) => mockTranslateFlat(...args),
    translateStructuredSpecContentForLocale: (...args: unknown[]) => mockTranslateStructuredSpec(...args),
    translateTourContentForLocale: (...args: unknown[]) => mockTranslateTour(...args),
  };
});

const { NextResponse } = jest.requireMock('next/server');

import { POST } from '../route';

// ── SSE capture ──

interface SseEvent { event: string; data: Record<string, unknown> }

let sseEvents: SseEvent[] = [];
let streamFinished: Promise<unknown> = Promise.resolve();

class CapturingReadableStream {
  constructor(source: { start: (controller: unknown) => unknown }) {
    sseEvents = [];
    const decoder = new TextDecoder();
    let buffer = '';
    const flush = () => {
      for (const raw of buffer.split('\n\n')) {
        if (!raw.trim()) continue;
        let event = '';
        let data = '';
        for (const line of raw.split('\n')) {
          if (line.startsWith('event: ')) event = line.slice(7).trim();
          else if (line.startsWith('data: ')) data = line.slice(6).trim();
        }
        if (event) sseEvents.push({ event, data: data ? JSON.parse(data) : {} });
      }
      buffer = '';
    };
    const controller = {
      enqueue: (chunk: Uint8Array) => { buffer += decoder.decode(chunk); },
      close: () => flush(),
    };
    streamFinished = Promise.resolve(source.start(controller));
  }
}

class PassthroughResponse {
  body: unknown;
  status: number;
  constructor(body: unknown, init?: { status?: number }) {
    this.body = body;
    this.status = init?.status || 200;
  }
}

(global as unknown as { ReadableStream: unknown }).ReadableStream = CapturingReadableStream;
(global as unknown as { Response: unknown }).Response = PassthroughResponse;

const makeRequest = (body: unknown) => ({ json: async () => body }) as never;

/** Run the route and wait for the SSE producer to finish. */
async function post(body: unknown) {
  const response = await POST(makeRequest(body));
  await streamFinished;
  return response;
}

const postLocale = (body: Record<string, unknown>, locale = 'ar') =>
  post({ ...body, locale });

const eventsOfType = (type: string) => sseEvents.filter((event) => event.event === type);

const SAVED_DESTINATION = {
  _id: 'dest-1',
  tenantId: 'hurghada',
  name: 'Hurghada',
  description: 'Red Sea resort town',
  // Saved with captions never filled in — the state that made the bug invisible.
  imageMetadata: [
    { url: 'https://cdn/a.jpg', alt: '', title: '' },
    { url: 'https://cdn/b.jpg', alt: '', title: '' },
  ],
};

const DRAFT_WITH_CAPTIONS = {
  name: 'Hurghada',
  description: 'Red Sea resort town',
  imageMetadata: [
    { url: 'https://cdn/a.jpg', alt: 'Red Sea reef', title: 'Reef at dawn' },
    { url: 'https://cdn/b.jpg', alt: 'Marina walkway', title: 'Evening marina' },
  ],
};

describe('POST /api/admin/translate/stream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sseEvents = [];
    mockRequireAdminAuth.mockResolvedValue({
      userId: 'admin-1',
      role: 'admin',
      permissions: ['manageTours', 'manageContent'],
      tenantIds: ['hurghada'],
    });
    mockCanAccessTenant.mockReturnValue(true);
    mockDestinationTenantLookup.mockResolvedValue({ tenantId: 'hurghada' });
    mockDestinationFindOne.mockResolvedValue({ ...SAVED_DESTINATION });
    mockDestinationUpdate.mockResolvedValue({});
    mockTourTenantLookup.mockResolvedValue({ tenantId: 'hurghada' });
    mockTourFindOne.mockResolvedValue(null);
    mockCategoryTenantLookup.mockResolvedValue({ tenantId: 'hurghada' });
    mockCategoryFindOne.mockResolvedValue(null);
    mockAttractionPageTenantLookup.mockResolvedValue({ tenantId: 'hurghada' });
    mockAttractionPageFindOne.mockResolvedValue(null);
    mockTranslateFlat.mockImplementation(async (_fields, _defs, _label, locale) => ({
      name: `name-${locale}`,
    }));
    mockTranslateStructuredSpec.mockImplementation(async (content: Record<string, unknown>, _label, locale) => {
      const images = (content.imageMetadata || []) as Array<Record<string, string>>;
      return {
        imageMetadata: images.map((image) => ({
          url: image.url,
          alt: image.alt ? `${image.alt}-${locale}` : undefined,
          title: image.title ? `${image.title}-${locale}` : undefined,
        })),
      };
    });
    mockTranslateTour.mockResolvedValue({ title: 'translated' });
  });

  it('rejects an unauthenticated request before touching the database', async () => {
    mockRequireAdminAuth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    const response = await POST(makeRequest({ modelType: 'destination', id: 'dest-1' }));

    expect(response.status).toBe(401);
    expect(mockDestinationFindOne).not.toHaveBeenCalled();
  });

  it('refuses a document outside the admin tenant scope, draft or not', async () => {
    mockDestinationTenantLookup.mockResolvedValue({ tenantId: 'cairo' });
    mockCanAccessTenant.mockReturnValue(false);

    const response = await POST(
      makeRequest({ modelType: 'destination', id: 'dest-1', locale: 'ar', sourceDraft: DRAFT_WITH_CAPTIONS })
    );

    expect(response.status).toBe(403);
    expect(mockCanAccessTenant).toHaveBeenCalledWith(expect.anything(), 'cairo');
    expect(mockDestinationFindOne).not.toHaveBeenCalled();
    expect(mockDestinationUpdate).not.toHaveBeenCalled();
  });

  it('translates draft image alt/title that the saved document does not have', async () => {
    await postLocale({ modelType: 'destination', id: 'dest-1', sourceDraft: DRAFT_WITH_CAPTIONS });

    expect(mockTranslateStructuredSpec).toHaveBeenCalled();
    const [sentContent] = mockTranslateStructuredSpec.mock.calls[0];
    expect(sentContent.imageMetadata).toEqual([
      { url: 'https://cdn/a.jpg', alt: 'Red Sea reef', title: 'Reef at dawn' },
      { url: 'https://cdn/b.jpg', alt: 'Marina walkway', title: 'Evening marina' },
    ]);

    const done = eventsOfType('locale_done');
    expect(done).toHaveLength(1);
    const arabic = done[0];
    expect((arabic?.data.translations as Record<string, unknown>).imageMetadata).toEqual([
      { url: 'https://cdn/a.jpg', alt: 'Red Sea reef-ar', title: 'Reef at dawn-ar' },
      { url: 'https://cdn/b.jpg', alt: 'Marina walkway-ar', title: 'Evening marina-ar' },
    ]);
  });

  it('falls back to the saved document when no draft is posted', async () => {
    await postLocale({ modelType: 'destination', id: 'dest-1' });

    // The saved captions are empty, so only the join key survives extraction —
    // the exact state that used to be reported as a successful translation.
    const [sentContent] = mockTranslateStructuredSpec.mock.calls[0];
    expect(sentContent.imageMetadata).toEqual([
      { url: 'https://cdn/a.jpg' },
      { url: 'https://cdn/b.jpg' },
    ]);
  });

  it('persists only the explicitly requested locale under the document tenant', async () => {
    await postLocale(
      { modelType: 'destination', id: 'dest-1', sourceDraft: DRAFT_WITH_CAPTIONS },
      'de',
    );

    expect(mockDestinationUpdate).toHaveBeenCalledTimes(1);
    const [filter, update] = mockDestinationUpdate.mock.calls[0];
    expect(filter).toEqual({
      _id: 'dest-1',
      tenantId: 'hurghada',
      'translations.de': { $exists: false },
    });
    expect(Object.keys(update.$set)).toEqual(['translations.de']);
    expect(mockTranslateFlat).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'destination', 'de');
    expect(mockTranslateStructuredSpec).toHaveBeenCalledWith(expect.anything(), 'destination', 'de', expect.anything());
  });

  it('ignores draft attempts to redirect tenant, identity, or stored translations', async () => {
    await postLocale({
      modelType: 'destination',
      id: 'dest-1',
      sourceDraft: {
        ...DRAFT_WITH_CAPTIONS,
        _id: 'someone-elses-destination',
        tenantId: 'cairo',
        translations: { ar: { name: 'injected' } },
      },
    });

    expect(mockDestinationFindOne).toHaveBeenCalledWith({ _id: 'dest-1', tenantId: 'hurghada' });
    for (const [filter, update] of mockDestinationUpdate.mock.calls) {
      expect(filter).toEqual({
        _id: 'dest-1',
        tenantId: 'hurghada',
        'translations.ar': { $exists: false },
      });
      expect(update.$set.translations).toBeUndefined();
    }
  });

  it('keeps a failed locale from being reported as translated', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockTranslateStructuredSpec.mockImplementation(async (_content, _label, locale) => {
      if (locale === 'ar') throw new Error('Rate limited');
      return {};
    });

    try {
      await postLocale({ modelType: 'destination', id: 'dest-1', sourceDraft: DRAFT_WITH_CAPTIONS });

      const failed = eventsOfType('locale_error');
      expect(failed).toHaveLength(1);
      expect(failed[0].data.locale).toBe('ar');

      const done = eventsOfType('done');
      expect(done[0].data.success).toBe(false);
      expect(done[0].data.translatedLocales).not.toContain('ar');
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('rejects a malformed draft instead of translating saved values', async () => {
    const response = await POST(
      makeRequest({ modelType: 'destination', id: 'dest-1', locale: 'ar', sourceDraft: [{ name: 'Hurghada' }] })
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/plain JSON object/i);
    expect(mockDestinationFindOne).not.toHaveBeenCalled();
  });

  it('rejects an oversized draft', async () => {
    const response = await POST(
      makeRequest({
        modelType: 'destination',
        id: 'dest-1',
        locale: 'ar',
        sourceDraft: {
          imageMetadata: Array.from({ length: 250 }, (_, index) => ({
            url: `https://cdn/${index}.jpg`,
            alt: 'a'.repeat(2000),
          })),
        },
      })
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/too large/i);
    expect(mockDestinationFindOne).not.toHaveBeenCalled();
  });

  it('rejects a body that is not an object', async () => {
    const response = await POST(makeRequest(null));
    expect(response.status).toBe(400);
    expect(mockDestinationFindOne).not.toHaveBeenCalled();
  });

  it('still validates modelType and id', async () => {
    expect((await POST(makeRequest({ modelType: 'blog', id: 'x' }))).status).toBe(400);
    expect((await POST(makeRequest({ modelType: 'destination' }))).status).toBe(400);
  });

  it('requires one supported locale and never falls back to a bulk run', async () => {
    expect((await POST(makeRequest({ modelType: 'destination', id: 'dest-1' }))).status).toBe(400);
    expect((await POST(makeRequest({ modelType: 'destination', id: 'dest-1', locale: 'en' }))).status).toBe(400);
    expect(mockDestinationFindOne).not.toHaveBeenCalled();
    expect(mockDestinationUpdate).not.toHaveBeenCalled();
  });

  it('requires manageTours for tours and does not accept manageContent as a substitute', async () => {
    mockRequireAdminAuth.mockResolvedValue({
      userId: 'content-admin',
      role: 'editor',
      permissions: ['manageContent'],
      tenantIds: ['hurghada'],
    });

    const response = await POST(makeRequest({ modelType: 'tour', id: 'tour-1', locale: 'ar' }));

    expect(response.status).toBe(403);
    expect(mockTourTenantLookup).not.toHaveBeenCalled();
    expect(mockTourUpdate).not.toHaveBeenCalled();
  });

  it('requires manageContent for destinations and does not accept manageTours as a substitute', async () => {
    mockRequireAdminAuth.mockResolvedValue({
      userId: 'tour-admin',
      role: 'editor',
      permissions: ['manageTours'],
      tenantIds: ['hurghada'],
    });

    const response = await POST(makeRequest({ modelType: 'destination', id: 'dest-1', locale: 'ar' }));

    expect(response.status).toBe(403);
    expect(mockDestinationTenantLookup).not.toHaveBeenCalled();
    expect(mockDestinationUpdate).not.toHaveBeenCalled();
  });

  it('preserves non-empty manual flat and structured values while filling gaps', async () => {
    const existingArabic = {
      name: 'اسم يدوي',
      description: '',
      imageMetadata: [
        { url: 'https://cdn/b.jpg', alt: 'وصف ب يدوي', title: '' },
        { url: 'https://cdn/a.jpg', alt: 'وصف أ يدوي', title: '' },
      ],
    };
    mockDestinationFindOne.mockResolvedValue({
      ...SAVED_DESTINATION,
      translations: { ar: existingArabic, de: { name: 'Manuell' } },
    });
    mockTranslateFlat.mockResolvedValue({ name: 'مولد', description: 'وصف مولد' });

    await postLocale({ modelType: 'destination', id: 'dest-1', sourceDraft: DRAFT_WITH_CAPTIONS });

    expect(mockDestinationUpdate).toHaveBeenCalledTimes(1);
    const [filter, update] = mockDestinationUpdate.mock.calls[0];
    expect(filter['translations.ar']).toEqual(existingArabic);
    expect(update.$set['translations.ar']).toEqual({
      name: 'اسم يدوي',
      description: 'وصف مولد',
      imageMetadata: [
        { url: 'https://cdn/a.jpg', alt: 'وصف أ يدوي', title: 'Reef at dawn-ar' },
        { url: 'https://cdn/b.jpg', alt: 'وصف ب يدوي', title: 'Evening marina-ar' },
      ],
    });
    expect(update.$set).not.toHaveProperty('translations.de');
    expect(eventsOfType('locale_done')[0].data.preservedExisting).toBe(true);
  });

  it('commits the selected locale draft without trusting identity or other locale fields', async () => {
    const storedArabic = { name: 'اسم مخزن', description: '' };
    mockDestinationFindOne.mockResolvedValue({
      ...SAVED_DESTINATION,
      translations: { ar: storedArabic, de: { name: 'Manuell' } },
    });
    mockTranslateFlat.mockResolvedValue({ name: 'اسم مولد', description: 'وصف مولد' });

    await postLocale({
      modelType: 'destination',
      id: 'dest-1',
      sourceDraft: DRAFT_WITH_CAPTIONS,
      localeDraft: {
        name: 'اسم كتب الآن',
        description: 'وصف كتب الآن',
        tenantId: 'cairo',
        translations: { de: { name: 'Injected' } },
      },
    });

    const [filter, update] = mockDestinationUpdate.mock.calls[0];
    expect(filter['translations.ar']).toEqual(storedArabic);
    expect(update.$set['translations.ar']).toMatchObject({
      name: 'اسم كتب الآن',
      description: 'وصف كتب الآن',
    });
    expect(update.$set['translations.ar']).not.toHaveProperty('tenantId');
    expect(update.$set['translations.ar']).not.toHaveProperty('translations');
    expect(update.$set).not.toHaveProperty('translations.de');
  });

  it('rejects malformed and oversized locale drafts before touching content', async () => {
    const malformed = await POST(makeRequest({
      modelType: 'destination',
      id: 'dest-1',
      locale: 'ar',
      localeDraft: ['not-an-object'],
    }));
    const oversized = await POST(makeRequest({
      modelType: 'destination',
      id: 'dest-1',
      locale: 'ar',
      localeDraft: { unknown: 'x'.repeat(200_001) },
    }));

    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(mockDestinationTenantLookup).not.toHaveBeenCalled();
    expect(mockDestinationUpdate).not.toHaveBeenCalled();
  });

  it('fails closed when the locale changes during translation', async () => {
    mockDestinationUpdate.mockResolvedValue(null);

    await postLocale({ modelType: 'destination', id: 'dest-1', sourceDraft: DRAFT_WITH_CAPTIONS });

    expect(eventsOfType('locale_error')[0].data.code).toBe('TRANSLATION_CONFLICT');
    expect(eventsOfType('done')[0].data.success).toBe(false);
    expect(mockRevalidateStorefront).not.toHaveBeenCalled();
  });

  it('normalizes Map-backed translation buckets before preserving manual text', async () => {
    mockAttractionPageFindOne.mockResolvedValue({
      _id: 'page-1',
      tenantId: 'hurghada',
      title: 'Karnak Temple',
      translations: new Map([['ar', { title: 'عنوان يدوي' }]]),
    });
    mockTranslateFlat.mockResolvedValue({ title: 'عنوان مولد' });

    await postLocale({ modelType: 'attraction-page', id: 'page-1' });

    const [filter, update] = mockAttractionPageUpdate.mock.calls[0];
    expect(filter['translations.ar']).toEqual({ title: 'عنوان يدوي' });
    expect(update.$set['translations.ar']).toEqual({ title: 'عنوان يدوي' });
  });

  it('covers every tour text block while preserving manual fields and rejecting model extras', async () => {
    const existingArabic = {
      title: 'عنوان الجولة اليدوي',
      itinerary: [{ title: 'خطوة يدوية', description: '' }],
    };
    mockTourFindOne.mockResolvedValue({
      _id: 'tour-1',
      tenantId: 'hurghada',
      title: 'Pyramids day trip',
      description: 'Explore Giza',
      itinerary: [{ title: 'Hotel pickup', description: 'Meet your guide', location: 'Hotel', includes: ['Transfer'] }],
      faq: [{ question: 'When?', answer: 'At eight.' }],
      bookingOptions: [{ label: 'Shared', description: 'Small group', badge: 'Popular' }],
      addOns: [{ name: 'Lunch', description: 'Egyptian meal' }],
      imageMetadata: [{ url: 'https://cdn/e.jpg', alt: 'Great Pyramid', title: 'Giza plateau' }],
      translations: { ar: existingArabic, de: { title: 'Pyramiden' } },
    });
    mockTranslateTour.mockResolvedValue({
      title: 'عنوان مولد',
      description: 'وصف مولد',
      itinerary: [{ title: 'خطوة مولدة', description: 'وصف الخطوة', location: 'الفندق', includes: ['النقل'] }],
      faq: [{ question: 'متى؟', answer: 'الثامنة.' }],
      bookingOptions: [{ label: 'مشترك', description: 'مجموعة صغيرة', badge: 'شائع' }],
      addOns: [{ name: 'الغداء', description: 'وجبة مصرية' }],
      imageMetadata: [{ url: 'https://cdn/e.jpg', alt: 'الهرم الأكبر', title: 'هضبة الجيزة' }],
      tenantId: 'injected-tenant',
      price: '0',
    });

    await postLocale({ modelType: 'tour', id: 'tour-1' });

    const [filter, update] = mockTourUpdate.mock.calls[0];
    expect(filter).toEqual({
      _id: 'tour-1',
      tenantId: 'hurghada',
      'translations.ar': existingArabic,
    });
    expect(update.$set).not.toHaveProperty('translations.de');
    expect(update.$set['translations.ar']).toEqual({
      title: 'عنوان الجولة اليدوي',
      description: 'وصف مولد',
      itinerary: [{ title: 'خطوة يدوية', description: 'وصف الخطوة', location: 'الفندق', includes: ['النقل'] }],
      faq: [{ question: 'متى؟', answer: 'الثامنة.' }],
      bookingOptions: [{ label: 'مشترك', description: 'مجموعة صغيرة', badge: 'شائع' }],
      addOns: [{ name: 'الغداء', description: 'وجبة مصرية' }],
      imageMetadata: [{ url: 'https://cdn/e.jpg', alt: 'الهرم الأكبر', title: 'هضبة الجيزة' }],
    });
    expect(update.$set['translations.ar']).not.toHaveProperty('tenantId');
    expect(update.$set['translations.ar']).not.toHaveProperty('price');
  });

  it('carries a category draft through to the translator', async () => {
    mockCategoryFindOne.mockResolvedValue({
      _id: 'cat-1',
      tenantId: 'hurghada',
      name: 'Day trips',
      imageMetadata: [{ url: 'https://cdn/c.jpg', alt: '', title: '' }],
    });

    await postLocale({
      modelType: 'category',
      id: 'cat-1',
      sourceDraft: {
        name: 'Day trips',
        imageMetadata: [{ url: 'https://cdn/c.jpg', alt: 'Nile felucca', title: 'Felucca' }],
      },
    });

    const [sentContent] = mockTranslateStructuredSpec.mock.calls[0];
    expect(sentContent.imageMetadata).toEqual([
      { url: 'https://cdn/c.jpg', alt: 'Nile felucca', title: 'Felucca' },
    ]);
  });

  it('carries an attraction-page draft through to the translator', async () => {
    mockAttractionPageFindOne.mockResolvedValue({
      _id: 'page-1',
      tenantId: 'hurghada',
      title: 'Karnak Temple',
      imageMetadata: [{ url: 'https://cdn/d.jpg', alt: '', title: '' }],
    });

    await postLocale({
      modelType: 'attraction-page',
      id: 'page-1',
      sourceDraft: {
        title: 'Karnak Temple',
        imageMetadata: [{ url: 'https://cdn/d.jpg', alt: 'Hypostyle hall', title: 'Columns' }],
      },
    });

    const [sentContent] = mockTranslateStructuredSpec.mock.calls[0];
    expect(sentContent.imageMetadata).toEqual([
      { url: 'https://cdn/d.jpg', alt: 'Hypostyle hall', title: 'Columns' },
    ]);
  });

  it('carries a tour draft image caption into the structured tour content', async () => {
    mockTourFindOne.mockResolvedValue({
      _id: 'tour-1',
      tenantId: 'hurghada',
      title: 'Pyramids day trip',
      imageMetadata: [{ url: 'https://cdn/e.jpg', alt: '', title: '' }],
    });

    await postLocale({
      modelType: 'tour',
      id: 'tour-1',
      sourceDraft: {
        title: 'Pyramids day trip',
        imageMetadata: [{ url: 'https://cdn/e.jpg', alt: 'Great Pyramid', title: 'Giza plateau' }],
      },
    });

    const [, structured] = mockTranslateTour.mock.calls[0];
    expect(structured.imageMetadata).toEqual([
      { url: 'https://cdn/e.jpg', alt: 'Great Pyramid', title: 'Giza plateau' },
    ]);
  });
});
