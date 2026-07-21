const MAX_UPLOAD_ATTEMPTS = 2;
const UPLOAD_TIMEOUT_MS = 30_000;

async function uploadImageFile(file: File): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    const body = new FormData();
    body.append('file', file);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const response = await fetch('/api/upload', { method: 'POST', body, signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success && typeof data.url === 'string') return data.url;
      const error = new Error(data.error || `Could not upload ${file.name}`);
      if (response.status < 500 || attempt === MAX_UPLOAD_ATTEMPTS) throw error;
      lastError = error;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`Could not upload ${file.name}`);
      if (attempt === MAX_UPLOAD_ATTEMPTS) throw lastError;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error(`Could not upload ${file.name}`);
}

export async function uploadImageFiles(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  return Promise.all(files.map(uploadImageFile));
}
