import { loadCurrentBookingOptions } from '../liveBookingOptions';

describe('loadCurrentBookingOptions', () => {
  it('prefers current options from the live endpoint', async () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 'live' }] });
    await expect(loadCurrentBookingOptions('tour-1', [{ id: 'stale' }], fetcher as typeof fetch)).resolves.toEqual([{ id: 'live' }]);
    expect(fetcher).toHaveBeenCalledWith('/api/tours/tour-1/options', { cache: 'no-store' });
  });

  it('keeps the embedded fallback when the endpoint fails', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(loadCurrentBookingOptions('tour-1', [{ id: 'fallback' }], fetcher as typeof fetch)).resolves.toEqual([{ id: 'fallback' }]);
  });
});
