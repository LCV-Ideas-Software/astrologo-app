import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout } from './externalFetch';

afterEach(() => {
  vi.useRealTimers();
});

describe('fetch externo com prazo máximo', () => {
  it('aborta uma subrequisição que não conclui dentro do prazo', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(
      (_resource, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) throw new Error('AbortSignal ausente.');
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
    );

    const pending = fetchWithTimeout('https://example.invalid/never', {}, fetchImpl, 50);
    const rejected = expect(pending).rejects.toBeInstanceOf(DOMException);
    await vi.advanceTimersByTimeAsync(50);
    await rejected;
  });
});
