export async function fetchJsonWithRetry<T>(input: RequestInfo | URL, init: RequestInit, fetcher: typeof fetch = fetch): Promise<{ response: Response; data: T }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetcher(input, init);
      const data = await response.json() as T;
      if (response.status < 500 || attempt === 1) return { response, data };
    } catch (error) {
      if (init.signal?.aborted) throw error;
      lastError = error;
      if (attempt === 1) throw error;
    }
  }
  throw lastError || new Error('Request failed');
}
