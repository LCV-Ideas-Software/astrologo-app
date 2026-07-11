export const EXTERNAL_FETCH_TIMEOUT_MS = 8_000;

export async function fetchWithTimeout(
  resource: RequestInfo | URL,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
  timeoutMs = EXTERNAL_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(resource, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
