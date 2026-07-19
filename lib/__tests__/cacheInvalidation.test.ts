import { cacheIfAvailable, invalidateMemoryCacheTags } from '@/lib/cache';

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));

describe('warm-instance cache invalidation', () => {
  it('reloads a cached value after its tag is invalidated', async () => {
    let value = 1;
    const loader = jest.fn(async () => value);
    const cached = cacheIfAvailable(loader, ['cache-invalidation-test'], {
      revalidate: 60,
      tags: ['homepage-reload-test'],
    });

    await expect(cached()).resolves.toBe(1);
    value = 2;
    await expect(cached()).resolves.toBe(1);

    expect(invalidateMemoryCacheTags(['homepage-reload-test'])).toBe(1);
    await expect(cached()).resolves.toBe(2);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('does not restore an in-flight value that was invalidated', async () => {
    let resolveFirst!: (value: number) => void;
    const loader = jest
      .fn<Promise<number>, []>()
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveFirst = resolve;
      }))
      .mockResolvedValueOnce(2);
    const cached = cacheIfAvailable(loader, ['cache-invalidation-race-test'], {
      revalidate: 60,
      tags: ['homepage-race-test'],
    });

    const firstRequest = cached();
    expect(invalidateMemoryCacheTags(['homepage-race-test'])).toBe(1);
    resolveFirst(1);
    await expect(firstRequest).resolves.toBe(1);

    await expect(cached()).resolves.toBe(2);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
