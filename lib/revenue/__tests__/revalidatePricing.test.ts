import { revalidatePath } from 'next/cache';
import { revalidatePricingPaths } from '@/lib/revenue/revalidatePricing';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

describe('pricing cache revalidation', () => {
  it('does not fail a durable write when cache invalidation throws', () => {
    jest.mocked(revalidatePath).mockImplementationOnce(() => { throw new Error('cache unavailable'); });
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(revalidatePricingPaths()).toBe(false);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
