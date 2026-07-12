import { afterEach, describe, expect, it, vi } from 'vitest';
import type { D1DatabaseLike, D1Statement } from './_shared/requestSecurity';

const gemini = vi.hoisted(() => ({
  fullTokenCount: 120_001,
  countTokensCalls: 0,
  generateContentCalls: 0,
  finishReason: 'STOP',
  contents: [] as string[],
  fragmentHtml: [] as string[],
  fragmentHtmlOverride: null as string | null,
  forceHierarchy: false,
  reductionCalls: 0,
  occupiedRowBytes: 1_000,
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    readonly models = {
      get: async () => ({ inputTokenLimit: 1_000_000, outputTokenLimit: 65_536 }),
      countTokens: async (request: { contents?: unknown }) => {
        gemini.countTokensCalls += 1;
        if (gemini.countTokensCalls === 1) return { totalTokens: gemini.fullTokenCount };
        const contents = String(request.contents ?? '');
        if (gemini.forceHierarchy) {
          const sourceCount = (contents.match(/"sourceId"/gu) ?? []).length;
          if (
            contents.includes('DADOS_DA_ETAPA_DE_ANALISE_LONGA') &&
            (contents.match(/"evidenceId"/gu) ?? []).length > 1
          ) {
            return { totalTokens: 97_000 };
          }
          if (contents.includes('DADOS_DA_SINTESE_DE_ANALISE_LONGA') && sourceCount > 1) {
            return { totalTokens: 999_000 };
          }
          if (contents.includes('DADOS_DA_REDUCAO_DE_ANALISE_LONGA') && sourceCount > 2) {
            return { totalTokens: 999_000 };
          }
        }
        return { totalTokens: 1_000 };
      },
      generateContent: async (request: {
        contents: unknown;
        config?: { responseJsonSchema?: { properties?: Record<string, { enum?: unknown[] }> } };
      }) => {
        gemini.generateContentCalls += 1;
        gemini.contents.push(String(request.contents));
        const properties = request.config?.responseJsonSchema?.properties;
        const schemaId = properties?.schemaId?.enum?.[0];
        let text = '<p>Análise completa.</p>';
        if (schemaId === 'urn:astrologo:ai-analysis-fragment') {
          const coveredEvidenceIds = (properties?.coveredEvidenceIds as { items?: { enum?: string[] } } | undefined)
            ?.items?.enum ?? ['evidence'];
          const fragmentId = String(properties?.fragmentId?.enum?.[0]);
          const html = gemini.fragmentHtmlOverride ?? `<p>Parte validada ${fragmentId}.</p>`;
          gemini.fragmentHtml.push(html);
          text = JSON.stringify({
            schemaId,
            schemaVersion: properties?.schemaVersion?.enum?.[0],
            rootInputHash: properties?.rootInputHash?.enum?.[0],
            promptVersion: properties?.promptVersion?.enum?.[0],
            fragmentId,
            ordinal: properties?.ordinal?.enum?.[0],
            domain: properties?.domain?.enum?.[0],
            inputHash: properties?.inputHash?.enum?.[0],
            coveredEvidenceIds,
            html,
            synthesisNotes: [{ textPtBr: `Integração de ${fragmentId}.`, evidenceIds: coveredEvidenceIds }],
            warnings: [],
          });
        } else if (schemaId === 'urn:astrologo:ai-analysis-reduction') {
          gemini.reductionCalls += 1;
          const fragmentIds =
            (properties?.fragmentIds as { items?: { enum?: string[] } } | undefined)?.items?.enum ?? [];
          const coveredEvidenceIds =
            (properties?.coveredEvidenceIds as { items?: { enum?: string[] } } | undefined)?.items?.enum ?? [];
          text = JSON.stringify({
            schemaId,
            schemaVersion: properties?.schemaVersion?.enum?.[0],
            rootInputHash: properties?.rootInputHash?.enum?.[0],
            promptVersion: properties?.promptVersion?.enum?.[0],
            reductionId: properties?.reductionId?.enum?.[0],
            level: properties?.level?.enum?.[0],
            ordinal: properties?.ordinal?.enum?.[0],
            fragmentIds,
            coveredEvidenceIds,
            synthesisNotes: [{ textPtBr: 'Notas reduzidas com cobertura integral.', evidenceIds: coveredEvidenceIds }],
            warnings: [],
          });
        } else if (schemaId === 'urn:astrologo:ai-analysis-synthesis') {
          const fragmentIds =
            (properties?.fragmentIds as { items?: { enum?: string[] } } | undefined)?.items?.enum ?? [];
          const coveredEvidenceIds =
            (properties?.coveredEvidenceIds as { items?: { enum?: string[] } } | undefined)?.items?.enum ?? [];
          text = JSON.stringify({
            schemaId,
            schemaVersion: properties?.schemaVersion?.enum?.[0],
            rootInputHash: properties?.rootInputHash?.enum?.[0],
            promptVersion: properties?.promptVersion?.enum?.[0],
            fragmentIds,
            coveredEvidenceIds,
            html: '<p><strong>Síntese integrada validada.</strong></p>',
            warnings: [],
          });
        }
        return {
          text,
          candidates: [{ finishReason: gemini.finishReason }],
          usageMetadata: { promptTokenCount: 1_000, candidatesTokenCount: 100 },
        };
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

vi.mock('./_shared/tatwaPrompt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./_shared/tatwaPrompt')>();
  return {
    ...actual,
    loadCanonicalTatwa: async () => ({
      schemaVersion: 'legacy',
      calculationMode: 'legacy-rulingFirst',
      selected: { principal: 'Akasha (Éter)', sub: 'Vayu (Ar)' },
      provenanceAvailable: false,
    }),
  };
});

const createDb = (queries: string[] = []): D1DatabaseLike => {
  return {
    prepare: (query: string) => {
      queries.push(query);
      const statement: D1Statement<Record<string, unknown>> = {
        bind: () => statement,
        first: async () => (query.includes('AS occupied_bytes') ? { occupied_bytes: gemini.occupiedRowBytes } : null),
        run: async () => ({ success: true }),
        all: async () => ({ results: [] }),
      };
      return statement;
    },
  } as unknown as D1DatabaseLike;
};

afterEach(() => {
  gemini.countTokensCalls = 0;
  gemini.generateContentCalls = 0;
  gemini.fullTokenCount = 120_001;
  gemini.finishReason = 'STOP';
  gemini.contents = [];
  gemini.fragmentHtml = [];
  gemini.fragmentHtmlOverride = null;
  gemini.forceHierarchy = false;
  gemini.reductionCalls = 0;
  gemini.occupiedRowBytes = 1_000;
  vi.clearAllMocks();
});

describe('/api/analisar — planejamento para contexto extenso', () => {
  it('interrompe a retirada de novos lotes após a primeira falha e aguarda os trabalhos já iniciados', async () => {
    const { mapWithConcurrency } = await import('./analisar');
    const started: number[] = [];
    await expect(
      mapWithConcurrency([0, 1, 2, 3], 2, async (value) => {
        started.push(value);
        if (value === 0) throw new Error('falha controlada');
        await Promise.resolve();
        return value;
      }),
    ).rejects.toThrow(/falha controlada/iu);
    expect(started).toEqual([0, 1]);
  });

  it('não rejeita com 413 um mapa acima do antigo corte local de 120 mil tokens', async () => {
    const { onRequestPost } = await import('./analisar');
    const response = await onRequestPost({
      request: new Request('https://mapa-astral.lcv.app.br/api/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
        body: JSON.stringify({
          id: 'mapa-contexto-extenso',
          dadosTropical: { astrologia: [{ planeta: 'Sol', signo: 'Touro' }] },
          dadosAstronomica: { astrologia: [{ planeta: 'Sol', constelacao: 'Touro' }] },
          dadosGlobais: { numerologia: { expressao: 7 } },
          query: { nome: 'Consulente' },
        }),
      }),
      env: { GEMINI_API_KEY: 'test', BIGDATA_DB: createDb() },
    });

    expect(response.status).toBe(200);
    expect(gemini.generateContentCalls).toBeGreaterThan(0);
    const payload = (await response.json()) as { analise: string };
    for (const html of gemini.fragmentHtml) expect(payload.analise).toContain(html);
    expect(payload.analise).toContain('Síntese integrada validada.');
  });

  it('preserva o caminho monolítico vigente para prompts pequenos', async () => {
    gemini.fullTokenCount = 100;
    const { onRequestPost } = await import('./analisar');
    const response = await onRequestPost({
      request: new Request('https://mapa-astral.lcv.app.br/api/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
        body: JSON.stringify({
          id: 'mapa-contexto-pequeno',
          dadosTropical: { astrologia: [] },
          dadosAstronomica: { astrologia: [] },
          dadosGlobais: { numerologia: { expressao: 7 } },
          query: { nome: 'Consulente' },
        }),
      }),
      env: { GEMINI_API_KEY: 'test', BIGDATA_DB: createDb() },
    });

    expect(response.status).toBe(200);
    expect(gemini.generateContentCalls).toBe(1);
    expect(gemini.contents[0]).toContain('ADENDO — TATWAS E PERSPECTIVAS DE CÁLCULO');
    expect(gemini.contents[0]).not.toContain('ADENDO OPERACIONAL INTERNO');
  });

  it('nunca persiste uma resposta encerrada por MAX_TOKENS', async () => {
    gemini.fullTokenCount = 100;
    gemini.finishReason = 'MAX_TOKENS';
    const queries: string[] = [];
    const { onRequestPost } = await import('./analisar');
    const response = await onRequestPost({
      request: new Request('https://mapa-astral.lcv.app.br/api/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
        body: JSON.stringify({
          id: 'mapa-resposta-truncada',
          dadosTropical: { astrologia: [] },
          dadosAstronomica: { astrologia: [] },
          dadosGlobais: { numerologia: { expressao: 7 } },
          query: { nome: 'Consulente' },
        }),
      }),
      env: { GEMINI_API_KEY: 'test', BIGDATA_DB: createDb(queries) },
    });

    expect(response.status).toBe(504);
    expect(gemini.generateContentCalls).toBe(3);
    expect(queries.some((query) => /UPDATE\s+astrologo_mapas\s+SET\s+analise_ia/iu.test(query))).toBe(false);
  });

  it('falha fechado quando a sanitização esvazia o HTML de um fragmento', async () => {
    gemini.fragmentHtmlOverride = '<script></script>';
    const queries: string[] = [];
    const { onRequestPost } = await import('./analisar');
    const response = await onRequestPost({
      request: new Request('https://mapa-astral.lcv.app.br/api/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
        body: JSON.stringify({
          id: 'mapa-html-esvaziado',
          dadosTropical: { astrologia: [{ planeta: 'Sol', signo: 'Touro' }] },
          dadosAstronomica: { astrologia: [{ planeta: 'Sol', constelacao: 'Touro' }] },
          dadosGlobais: { numerologia: { expressao: 7 } },
          query: { nome: 'Consulente' },
        }),
      }),
      env: { GEMINI_API_KEY: 'test', BIGDATA_DB: createDb(queries) },
    });

    expect(response.status).toBe(504);
    expect(queries.some((query) => /UPDATE\s+astrologo_mapas\s+SET\s+analise_ia/iu.test(query))).toBe(false);
  });

  it('reduz as notas hierarquicamente até a síntese caber sem perder a cobertura', async () => {
    gemini.forceHierarchy = true;
    const { onRequestPost } = await import('./analisar');
    const response = await onRequestPost({
      request: new Request('https://mapa-astral.lcv.app.br/api/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
        body: JSON.stringify({
          id: 'mapa-reducao-hierarquica',
          dadosTropical: { astrologia: [{ planeta: 'Sol', signo: 'Touro' }] },
          dadosAstronomica: { astrologia: [{ planeta: 'Sol', constelacao: 'Touro' }] },
          dadosGlobais: { numerologia: { expressao: 7 } },
          query: { nome: 'Consulente' },
        }),
      }),
      env: { GEMINI_API_KEY: 'test', BIGDATA_DB: createDb() },
    });

    expect(response.status).toBe(200);
    expect(gemini.reductionCalls).toBeGreaterThan(0);
    expect(gemini.countTokensCalls).toBeLessThan(50);
    const payload = (await response.json()) as { analise: string };
    expect(payload.analise).toContain('Síntese integrada validada.');
    for (const html of gemini.fragmentHtml) expect(payload.analise).toContain(html);
  });

  it('falha antes do UPDATE quando os demais campos já consomem o orçamento da linha D1', async () => {
    gemini.fullTokenCount = 100;
    gemini.occupiedRowBytes = 1_900_000;
    const queries: string[] = [];
    const { onRequestPost } = await import('./analisar');
    const response = await onRequestPost({
      request: new Request('https://mapa-astral.lcv.app.br/api/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
        body: JSON.stringify({
          id: 'mapa-sem-orcamento-d1',
          dadosTropical: { astrologia: [] },
          dadosAstronomica: { astrologia: [] },
          dadosGlobais: { numerologia: { expressao: 7 } },
          query: { nome: 'Consulente' },
        }),
      }),
      env: { GEMINI_API_KEY: 'test', BIGDATA_DB: createDb(queries) },
    });

    expect(response.status).toBe(504);
    expect(queries.some((query) => query.includes('AS occupied_bytes'))).toBe(true);
    expect(queries.some((query) => /UPDATE\s+astrologo_mapas\s+SET\s+analise_ia/iu.test(query))).toBe(false);
  });
});
