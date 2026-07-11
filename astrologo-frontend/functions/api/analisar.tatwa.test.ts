import { afterEach, describe, expect, it, vi } from 'vitest';
import type { D1DatabaseLike, D1Statement } from './_shared/requestSecurity';

const captured = vi.hoisted(() => ({ prompt: '' }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    readonly models = {
      countTokens: async () => ({ totalTokens: 100 }),
      generateContent: async (request: { contents: unknown }) => {
        captured.prompt = String(request.contents);
        return { text: '<p>Análise segura.</p>', usageMetadata: {} };
      },
    };
  },
  HarmBlockThreshold: { BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH' },
  HarmCategory: {
    HARM_CATEGORY_DANGEROUS_CONTENT: 'DANGEROUS_CONTENT',
    HARM_CATEGORY_HARASSMENT: 'HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'SEXUALLY_EXPLICIT',
    HARM_CATEGORY_CIVIC_INTEGRITY: 'CIVIC_INTEGRITY',
  },
}));

const createEmptyDb = (): D1DatabaseLike => {
  const statement: D1Statement<Record<string, unknown>> = {
    bind: () => statement,
    first: async () => null,
    run: async () => ({ success: true }),
    all: async () => ({ results: [] }),
  };
  return { prepare: () => statement } as unknown as D1DatabaseLike;
};

afterEach(() => {
  captured.prompt = '';
  vi.clearAllMocks();
});

describe('/api/analisar — autoridade do Tatwa', () => {
  it('falha fechado sem chamar o modelo quando o D1 não fornece Tatwa canônico', async () => {
    const { onRequestPost } = await import('./analisar');
    const response = await onRequestPost({
      request: new Request('https://mapa-astral.lcv.app.br/api/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
        body: JSON.stringify({
          id: 'mapa-ausente',
          dadosTropical: { astrologia: [] },
          dadosAstronomica: { astrologia: [] },
          dadosGlobais: {
            tatwa: { principal: 'Akasha (Éter)', sub: 'Vayu (Ar)' },
            numerologia: { expressao: 7 },
          },
          query: { nome: 'Consulente' },
        }),
      }),
      env: { GEMINI_API_KEY: 'test', BIGDATA_DB: createEmptyDb() },
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ success: false, code: 'CANONICAL_TATWA_UNAVAILABLE' });
    expect(captured.prompt).toBe('');
  });
});
