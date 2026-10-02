import { confirmPaidCheckout } from '../confirmPaidCheckout';
const response = (status: number, payload: object) => ({ status, json: async () => payload }) as Response;
describe('paid confirmation processing', () => {
  it('retries the same owned submission until the canonical writer confirms it', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(response(202, { code: 'PAYMENT_CONFIRMATION_PROCESSING' })).mockResolvedValueOnce(response(200, { success: true, bookingId: 'recorded' }));
    const wait = jest.fn().mockResolvedValue(undefined);
    const result = await confirmPaidCheckout({ paymentDetails: { paymentIntentId: 'pi_owned' } }, fetcher, wait);
    expect(result.result.success).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]).toEqual(fetcher.mock.calls[1]);
    expect(wait).toHaveBeenCalledWith(2000);
  });
  it('bounds retries and keeps processing distinct from success', async () => {
    const fetcher = jest.fn().mockResolvedValue(response(202, { code: 'PAYMENT_CONFIRMATION_PROCESSING' }));
    const result = await confirmPaidCheckout({}, fetcher, jest.fn().mockResolvedValue(undefined));
    expect(fetcher).toHaveBeenCalledTimes(8);
    expect(result.response.status).toBe(202);
    expect(result.result.success).toBeUndefined();
  });
  it('does not retry denials or unavailable responses', async () => {
    for (const status of [401, 409, 503]) {
      const fetcher = jest.fn().mockResolvedValue(response(status, { message: 'Unavailable' }));
      await confirmPaidCheckout({}, fetcher, jest.fn());
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
});
