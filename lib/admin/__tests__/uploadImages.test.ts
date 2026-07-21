import { uploadImageFiles } from '@/lib/admin/uploadImages';

describe('uploadImageFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('uploads every selected file and preserves selection order', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, url: '/one.jpg' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, url: '/two.jpg' }) } as Response);

    const urls = await uploadImageFiles([
      new File(['one'], 'one.jpg', { type: 'image/jpeg' }),
      new File(['two'], 'two.jpg', { type: 'image/jpeg' }),
    ]);

    expect(urls).toEqual(['/one.jpg', '/two.jpg']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces the server error instead of silently dropping a failed upload', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Network storage unavailable' }),
    } as Response);

    await expect(uploadImageFiles([new File(['one'], 'one.jpg')])).rejects.toThrow('Network storage unavailable');
  });

  it('retries one transient network failure before succeeding', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, url: '/recovered.jpg' }) } as Response);

    await expect(uploadImageFiles([new File(['one'], 'one.jpg')])).resolves.toEqual(['/recovered.jpg']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
