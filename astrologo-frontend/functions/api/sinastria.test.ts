import { readFile } from 'node:fs/promises';
import { load, type SwissEph } from '@fusionstrings/swiss-eph';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { calculateDadosPosicionaisV2, type DadosPosicionaisV2 } from './_shared/positionV2';
import type { D1DatabaseLike, D1Statement } from './_shared/requestSecurity';

let swiss: SwissEph;
let primary: DadosPosicionaisV2;

beforeAll(async () => {
  const bytes = new Uint8Array(
    await readFile(new URL('../../node_modules/@fusionstrings/swiss-eph/wasm/swiss-eph-wasi.wasm', import.meta.url)),
  );
  swiss = await load(bytes);
  primary = calculateDadosPosicionaisV2(
    {
      calculationId: 'mapa-primario-001',
      calculatedAtUtc: '2026-07-12T12:00:00Z',
      instantUtc: '1979-03-26T19:45:00Z',
      date: '1979-03-26',
      time: '16:45',
      timeResolution: {
        status: 'resolved',
        timeZoneIana: 'America/Sao_Paulo',
        instantUtc: '1979-03-26T19:45:00Z',
        offsetAtBirth: '-03:00',
        disambiguation: 'exact',
        historicalConfidence: 'certified-1970-plus',
      },
      place: {
        sourceLabel: 'Cachoeiras de Macacu, Rio de Janeiro, Brasil',
        latitudeDeg: -22.4625,
        longitudeDeg: -42.6531,
        elevationMeters: 57,
        providerResultId: 3468425,
      },
    },
    swiss,
  );
});

const createDb = () => {
  const executed: { query: string; bindings: unknown[] }[] = [];
  const db: D1DatabaseLike = {
    prepare: <TFirst>(query: string) => {
      let bindings: unknown[] = [];
      const statement: D1Statement<TFirst> = {
        bind: (...values) => {
          bindings = values;
          return statement;
        },
        first: async () => {
          if (query.includes('astrologo_rate_limit_policies')) {
            return { enabled: 1, max_requests: 4, window_minutes: 15 } as TFirst;
          }
          if (query.includes('request_count')) return { request_count: 0 } as TFirst;
          if (query.includes('dados_posicionais_v2')) {
            return { nome: 'Pessoa A', dados_posicionais_v2: JSON.stringify(primary) } as TFirst;
          }
          return null;
        },
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
  vi.useRealTimers();
  vi.doUnmock('./_shared/swissRuntime');
  vi.resetModules();
});

describe('/api/sinastria', () => {
  it('exige consentimento explícito antes de tratar os dados da Pessoa B', async () => {
    vi.doMock('./_shared/swissRuntime', () => ({ swissEphemeris: swiss }));
    const { onRequestPost } = await import('./sinastria');
    const { db } = createDb();
    const response = await onRequestPost({
      request: new Request('https://mapa-astral.lcv.app.br/api/sinastria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
        body: JSON.stringify({ primaryMapId: 'mapa-primario-001', consentRecorded: false }),
      }),
      env: { BIGDATA_DB: db },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false, code: 'SYNASTRY_CONSENT_REQUIRED' });
  });

  it('calcula dois mapas completos, persiste a relação e mantém a UI em Brasília', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T15:00:00.000Z'));
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
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
          ),
      ),
    );
    vi.doMock('./_shared/swissRuntime', () => ({ swissEphemeris: swiss }));
    const { onRequestPost } = await import('./sinastria');
    const { db, executed } = createDb();
    const response = await onRequestPost({
      request: new Request('https://mapa-astral.lcv.app.br/api/sinastria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
        body: JSON.stringify({
          primaryMapId: 'mapa-primario-001',
          consentRecorded: true,
          subjectB: {
            nome: 'Pessoa B',
            dataNascimento: '1993-05-20',
            horaNascimento: '21:12',
            localNascimento: 'Rio de Janeiro, Brasil',
            localNascimentoId: 3451190,
          },
        }),
      }),
      env: { BIGDATA_DB: db },
    });
    const payload = (await response.json()) as {
      success: boolean;
      secondaryMapId: string;
      secondaryDadosPosicionaisV2: DadosPosicionaisV2;
      synastryRunV1: {
        schemaId: string;
        charts: { A: { calculationId: string }; B: { calculationId: string } };
        presentationPolicy: { timeZone: string };
        aspects: unknown[];
        houseOverlays: { aToB: unknown[]; bToA: unknown[] };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.secondaryMapId).not.toBe('mapa-primario-001');
    expect(payload.synastryRunV1).toMatchObject({
      schemaId: 'urn:astrologo:synastry-run',
      charts: {
        A: { calculationId: 'mapa-primario-001' },
        B: { calculationId: payload.secondaryMapId },
      },
      presentationPolicy: { timeZone: 'America/Sao_Paulo' },
    });
    expect(payload.secondaryDadosPosicionaisV2.positions).toHaveLength(10);
    expect(payload.synastryRunV1.houseOverlays.aToB).toHaveLength(10);
    expect(payload.synastryRunV1.houseOverlays.bToA).toHaveLength(10);
    expect(executed.some(({ query }) => query.includes('INSERT INTO astrologo_synastry_runs'))).toBe(true);
    expect(executed.some(({ query }) => query.includes("'synastry_result'"))).toBe(true);
    expect(executed.some(({ query }) => query.includes("status = 'ready'"))).toBe(true);
  });
});
