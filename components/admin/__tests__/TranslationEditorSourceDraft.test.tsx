/**
 * The shared editor is used by tours, destinations, categories and attraction
 * pages. These tests pin the one-click, all-language workflow and its safety
 * boundaries: sanitized source drafts, preserved manual text, isolated saves,
 * partial failure, and global failure.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

import TranslationEditor from '@/components/admin/TranslationEditor';
import {
  destinationTranslationFields,
  translatableLocales,
} from '@/lib/i18n/translationFields';

const streamResponse = (events: Array<{ event: string; data: Record<string, unknown> }>) => {
  const bytes = new TextEncoder().encode(
    events.map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join(''),
  );
  let sent = false;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => {
          if (sent) return { done: true, value: undefined };
          sent = true;
          return { done: false, value: bytes };
        },
      }),
    },
  };
};

const successResponse = (
  locale: string,
  translations: Record<string, unknown> = {},
  preservedExisting = false,
) => streamResponse([
  { event: 'translating', data: { locale } },
  { event: 'locale_done', data: { locale, translations, preservedExisting } },
  { event: 'done', data: { success: true, translatedLocales: [locale], failedLocales: [] } },
]);

const requestBodies = (fetchMock: jest.Mock) => fetchMock.mock.calls.map(([, init]) =>
  JSON.parse((init as RequestInit).body as string) as Record<string, unknown>
);

describe('TranslationEditor one-click translation', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { locale: string };
      return successResponse(body.locale);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  const renderEditor = (props: Record<string, unknown> = {}) =>
    render(
      <TranslationEditor
        fields={destinationTranslationFields}
        value={{}}
        onChange={jest.fn()}
        modelType="destination"
        entityId="dest-1"
        {...props}
      />
    );

  it('translates every supported language from one button click', async () => {
    renderEditor({
      sourceDraft: {
        name: 'Hurghada',
        imageMetadata: [
          { url: 'https://cdn/a.jpg', alt: 'Red Sea reef', title: 'Reef at dawn' },
        ],
      },
    });

    expect(screen.getByText('Translate every language with one click.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Translate & save all languages' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(translatableLocales.length));
    const bodies = requestBodies(fetchMock);

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/translate/stream', expect.any(Object));
    expect(bodies.map((body) => body.locale)).toEqual(translatableLocales);
    for (const body of bodies) {
      expect(body).toMatchObject({ modelType: 'destination', id: 'dest-1' });
      expect(body.sourceDraft).toEqual({
        name: 'Hurghada',
        imageMetadata: [
          { url: 'https://cdn/a.jpg', alt: 'Red Sea reef', title: 'Reef at dawn' },
        ],
      });
    }
    expect(mockToastSuccess).toHaveBeenCalledWith('All 5 languages translated and saved.');
  });

  it('strips non-translatable form state from every request', async () => {
    renderEditor({
      sourceDraft: {
        _id: 'someone-elses-document',
        tenantId: 'another-tenant',
        translations: { ar: { name: 'injected' } },
        isPublished: true,
        name: 'Hurghada',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Translate & save all languages' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(translatableLocales.length));
    for (const body of requestBodies(fetchMock)) {
      expect(body.sourceDraft).toEqual({ name: 'Hurghada' });
    }
  });

  it.each([
    ['an empty draft', {}],
    ['no draft', undefined],
  ])('omits sourceDraft for %s', async (_label, sourceDraft) => {
    renderEditor({ sourceDraft });

    fireEvent.click(screen.getByRole('button', { name: 'Translate & save all languages' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(translatableLocales.length));
    expect(requestBodies(fetchMock)).toEqual(translatableLocales.map((locale) => ({
      modelType: 'destination',
      id: 'dest-1',
      locale,
    })));
  });

  it('reports an unusable draft before making any request', async () => {
    renderEditor({
      sourceDraft: {
        imageMetadata: Array.from({ length: 250 }, (_, index) => ({
          url: `https://cdn/${index}.jpg`,
          alt: 'a'.repeat(2000),
        })),
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Translate & save all languages' }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(mockToastError.mock.calls[0][0]).toMatch(/too large/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('prevents a second translation run while the first request is active', async () => {
    let releaseFirstRequest: ((value: ReturnType<typeof successResponse>) => void) | undefined;
    fetchMock
      .mockImplementationOnce(() => new Promise((resolve) => {
        releaseFirstRequest = resolve;
      }))
      .mockImplementation(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(init.body as string) as { locale: string };
        return successResponse(body.locale);
      });

    renderEditor({
      value: { ar: { highlights: ['Manual highlight'] } },
      sourceDraft: { name: 'Hurghada' },
    });
    const button = screen.getByRole('button', { name: 'Translate & save all languages' });
    fireEvent.click(button);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(button).toBeDisabled();
    for (const field of screen.getAllByRole('textbox')) expect(field).toBeDisabled();
    for (const addButton of screen.getAllByRole('button', { name: 'Add' })) {
      expect(addButton).toBeDisabled();
    }
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    releaseFirstRequest?.(successResponse('ar'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(translatableLocales.length));
  });

  it('preserves each locale draft and adopts every server-merged result', async () => {
    const onChange = jest.fn();
    const generatedNames: Record<string, string> = {
      ar: 'اسم يدوي',
      es: 'Hurghada ES',
      fr: 'Hurghada FR',
      ru: 'Hurghada RU',
      de: 'Manuell',
    };
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { locale: string };
      return successResponse(
        body.locale,
        { name: generatedNames[body.locale], description: `${body.locale} description` },
        body.locale === 'ar' || body.locale === 'de',
      );
    });

    renderEditor({
      value: {
        ar: { name: 'اسم يدوي' },
        de: { name: 'Manuell' },
      },
      onChange,
      sourceDraft: { name: 'Hurghada', description: 'Red Sea resort' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Translate & save all languages' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(translatableLocales.length));
    const bodies = requestBodies(fetchMock);
    expect(bodies.find((body) => body.locale === 'ar')?.localeDraft).toEqual({ name: 'اسم يدوي' });
    expect(bodies.find((body) => body.locale === 'de')?.localeDraft).toEqual({ name: 'Manuell' });
    expect(bodies.find((body) => body.locale === 'fr')).not.toHaveProperty('localeDraft');
    expect(onChange).toHaveBeenLastCalledWith(Object.fromEntries(
      translatableLocales.map((locale) => [locale, {
        name: generatedNames[locale],
        description: `${locale} description`,
      }]),
    ));
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'All 5 languages translated and saved. Existing manual text was preserved.',
    );
  });

  it('keeps successful languages and continues after one locale fails', async () => {
    const onChange = jest.fn();
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { locale: string };
      if (body.locale === 'fr') {
        return streamResponse([
          { event: 'locale_error', data: { locale: 'fr', localeName: 'French', error: 'provider timeout' } },
          { event: 'done', data: { success: false, translatedLocales: [], failedLocales: ['fr'] } },
        ]);
      }
      return successResponse(body.locale, { name: `${body.locale} saved` });
    });

    renderEditor({ onChange, sourceDraft: { name: 'Hurghada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Translate & save all languages' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(translatableLocales.length));
    expect(onChange).toHaveBeenLastCalledWith({
      ar: { name: 'ar saved' },
      es: { name: 'es saved' },
      ru: { name: 'ru saved' },
      de: { name: 'de saved' },
    });
    expect(mockToastError).toHaveBeenCalledWith(
      'French was not saved. 4 languages were saved; retry to fill the rest.',
    );
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('stops safely when a global request error makes later saves impossible', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'You do not have permission to perform this action.' }),
    });

    renderEditor({ sourceDraft: { name: 'Hurghada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Translate & save all languages' }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(
      'You do not have permission to perform this action.',
    ));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});
