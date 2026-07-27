type JsonResponse = Pick<Response, 'ok' | 'status' | 'text'>;

/**
 * Reads an API JSON response without leaking browser JSON parser errors to the
 * user when an upstream platform returns an empty or HTML error response.
 */
export async function readJsonResponse<T>(
  response: JsonResponse,
  fallbackMessage: string,
): Promise<T> {
  let rawBody = '';

  try {
    rawBody = await response.text();
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!rawBody.trim()) {
    throw new Error(
      response.ok
        ? 'The server returned an empty response. Please try again.'
        : fallbackMessage,
    );
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new Error(
      response.ok
        ? 'The server returned an invalid response. Please try again.'
        : fallbackMessage,
    );
  }
}
