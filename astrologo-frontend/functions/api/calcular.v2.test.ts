import { readFile } from 'node:fs/promises';
import { load, type SwissEph } from '@fusionstrings/swiss-eph';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { DadosPosicionaisV2 } from './_shared/positionV2';
import type { D1DatabaseLike, D1Statement } from './_shared/requestSecurity';

let swiss: SwissEph;

beforeAll(async () => {
  const bytes = new Uint8Array(
    await readFile(new URL('../../node_modules/@fusionstrings/swiss-eph/wasm/swiss-eph-wasi.wasm', import.meta.url)),
  );
  swiss = await load(bytes);
});

interface ExecutedStatement {
  query: string;
  bindings: unknown[];
}

interface CalculationResponse {
  readonly success: boolean;
  readonly dadosGlobais: {
    readonly tatwa: {
      readonly schemaVersion: string;
      readonly calculationMode: string;
      readonly principal: string;
      readonly sub: string;
      readonly variants: Record<string, { principal: string; sub: string }>;
      readonly anchor: { readonly solarModel: { readonly engineId: string } };
    };
  };
  readonly dadosTropical: {
    readonly astrologia: readonly { readonly astro: string }[];
    readonly umbanda: readonly unknown[];
  };
  readonly dadosAstronomica: {
    readonly astrologia: readonly unknown[];
    readonly umbanda: readonly unknown[];
  };
  readonly dadosPosicionaisV2: DadosPosicionaisV2;
}

const createDb = () => {
  const executed: ExecutedStatement[] = [];
  const db: D1DatabaseLike = {
    prepare: <TFirst>(query: string): D1Statement<TFirst> => {
      let bindings: unknown[] = [];
      const statement: D1Statement<TFirst> = {
        bind: (...args: unknown[]) => {
          bindings = args;
          return statement;
        },
        first: async () => null,
        run: async () => {
          executed.push({ query, bindings });
          return { success: true };
        },
        all: async () => ({ results: [] }),
      };
      return statement;
    },
  };
  return { db, executed };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('./_shared/swissRuntime');
  vi.resetModules();
});

describe('/api/calcular v2', () => {
  it('preserva os arrays legados e persiste o irmão posicional v2 canônico', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (request) => {
      const url = new URL(request instanceof URL ? request.href : typeof request === 'string' ? request : request.url);
      if (url.hostname === 'geocoding-api.open-meteo.com') {
        return new Response(
          JSON.stringify({
            id: 3451190,
            name: 'Rio de Janeiro',
            latitude: -22.90642,
            longitude: -43.18223,
            elevation: 12,
            timezone: 'America/Sao_Paulo',
            country_code: 'BR',
            country: 'Brasil',
            admin1: 'Rio de Janeiro',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Requisição externa inesperada: ${url.href}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.doMock('./_shared/swissRuntime', () => ({ swissEphemeris: swiss }));
    const { onRequestPost } = await import('./calcular');
    const { db, executed } = createDb();
    const response = await onRequestPost({
      request: new Request('https://mapa-astral.lcv.app.br/api/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
        body: JSON.stringify({
          nome: 'Consulente Teste',
          dataNascimento: '1990-05-15',
          horaNascimento: '14:30',
          localNascimento: 'Rio de Janeiro, Brasil',
          localNascimentoId: 3451190,
        }),
      }),
      env: { GEMINI_API_KEY: 'test', BIGDATA_DB: db },
    });
    const payload = (await response.json()) as CalculationResponse;

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.dadosTropical.astrologia.map(({ astro }: { astro: string }) => astro)).toEqual([
      'Sol',
      'Ascendente',
      'Lua',
      'Meio do Céu',
    ]);
    expect(payload.dadosTropical.umbanda).toHaveLength(6);
    expect(payload.dadosAstronomica.astrologia).toHaveLength(4);
    expect(payload.dadosAstronomica.umbanda).toHaveLength(6);
    expect(payload.dadosPosicionaisV2.positions).toHaveLength(10);
    expect(payload.dadosPosicionaisV2.birthContext.timeResolution.timeZoneIana).toBe('America/Sao_Paulo');
    expect(payload.dadosGlobais.tatwa).toMatchObject({
      schemaVersion: '2.0.0',
      calculationMode: 'fixed',
      anchor: {
        birthCivilLocal: '1990-05-15T14:30:00',
        birthOffset: '-03:00',
        birthTimeDisambiguation: 'exact',
        inputTimePrecision: 'minute',
        epochQuantization: 'floor-each-instant-to-whole-second',
        sunriseRelation: 'same-civil-date',
        placeProviderResultId: 3451190,
        solarModel: { engineId: 'astronomy-engine' },
      },
    });
    expect(payload.dadosGlobais.tatwa).not.toHaveProperty('method');
    expect(payload.dadosGlobais.tatwa).not.toHaveProperty('subOrder');
    expect(payload.dadosGlobais.tatwa.variants.fixed).toMatchObject({
      principal: payload.dadosGlobais.tatwa.principal,
      sub: payload.dadosGlobais.tatwa.sub,
    });
    expect(payload.dadosGlobais.tatwa.variants['legacy-rulingFirst']).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init).toEqual(expect.objectContaining({ signal: expect.any(AbortSignal) }));
    }

    const insert = executed.find(({ query }) => query.includes('INSERT INTO astrologo_mapas'));
    expect(insert?.query).toContain('dados_posicionais_v2');
    expect(insert?.bindings).toHaveLength(9);
    expect(JSON.parse(String(insert?.bindings[7]))).toEqual(payload.dadosGlobais);
    expect(JSON.parse(String(insert?.bindings[8]))).toEqual(payload.dadosPosicionaisV2);
  });
});
