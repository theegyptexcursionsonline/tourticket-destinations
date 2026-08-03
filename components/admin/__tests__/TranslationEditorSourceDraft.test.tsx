/**
 * Auto Translate used to post only { modelType, id }, so the streaming route
 * reloaded the saved document and translated whatever image alt/title was last
 * persisted — usually nothing — while still reporting every locale as done.
 * These tests pin the request payload.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockToastError = jest.fn();
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: jest.fn(),
  },
}));

import TranslationEditor from '@/components/admin/TranslationEditor';
import { destinationTranslationFields } from '@/lib/i18n/translationFields';

/** A response whose stream closes immediately — we only assert on the request. */
const emptyStreamResponse = () => ({
  ok: true,
  body: {
    getReader: () => ({
      read: async () => ({ done: true, value: undefined }),
    }),
  },
});

const lastRequestBody = (fetchMock: jest.Mock) => {
  const [, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return JSON.parse((init as RequestInit).body as string);
};

describe('TranslationEditor Auto Translate payload', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn().mockResolvedValue(emptyStreamResponse());
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

  it('posts the unsaved image alt and title from the edit form', async () => {
    renderEditor({
      sourceDraft: {
        name: 'Hurghada',
        imageMetadata: [
          { url: 'https://cdn/a.jpg', alt: 'Red Sea reef', title: 'Reef at dawn' },
        ],
      },
    });

    fireEvent.click(screen.getByText('Auto Translate'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = lastRequestBody(fetchMock);

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/translate/stream', expect.any(Object));
    expect(body.modelType).toBe('destination');
    expect(body.id).toBe('dest-1');
    expect(body.sourceDraft.imageMetadata).toEqual([
      { url: 'https://cdn/a.jpg', alt: 'Red Sea reef', title: 'Reef at dawn' },
    ]);
    expect(body.sourceDraft.name).toBe('Hurghada');
  });

  it('strips non-translatable form state from the payload', async () => {
    renderEditor({
      sourceDraft: {
        _id: 'someone-elses-document',
        tenantId: 'another-tenant',
        translations: { ar: { name: 'injected' } },
        isPublished: true,
        name: 'Hurghada',
      },
    });

    fireEvent.click(screen.getByText('Auto Translate'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(lastRequestBody(fetchMock).sourceDraft).toEqual({ name: 'Hurghada' });
  });

  it('omits sourceDraft entirely when the form has no source content yet', async () => {
    renderEditor({ sourceDraft: {} });

    fireEvent.click(screen.getByText('Auto Translate'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(lastRequestBody(fetchMock)).toEqual({ modelType: 'destination', id: 'dest-1' });
  });

  it('still works for callers that pass no draft at all', async () => {
    renderEditor();

    fireEvent.click(screen.getByText('Auto Translate'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(lastRequestBody(fetchMock)).toEqual({ modelType: 'destination', id: 'dest-1' });
  });

  it('reports an unusable draft instead of quietly translating saved values', async () => {
    renderEditor({
      sourceDraft: {
        imageMetadata: Array.from({ length: 250 }, (_, index) => ({
          url: `https://cdn/${index}.jpg`,
          alt: 'a'.repeat(2000),
        })),
      },
    });

    fireEvent.click(screen.getByText('Auto Translate'));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(mockToastError.mock.calls[0][0]).toMatch(/too large/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
