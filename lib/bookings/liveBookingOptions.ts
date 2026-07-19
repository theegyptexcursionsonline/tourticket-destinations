export async function loadCurrentBookingOptions<T>(
  tourId: string,
  fallback: T[],
  fetcher: typeof fetch = fetch
): Promise<T[]> {
  try {
    const response = await fetcher(`/api/tours/${tourId}/options`, { cache: 'no-store' });
    if (!response.ok) return fallback;

    const liveOptions: unknown = await response.json();
    return Array.isArray(liveOptions) && liveOptions.length > 0
      ? liveOptions as T[]
      : fallback;
  } catch {
    return fallback;
  }
}
