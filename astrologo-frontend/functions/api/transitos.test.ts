import { readFile } from 'node:fs/promises';
import { load, type SwissEph } from '@fusionstrings/swiss-eph';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { calculateDadosPosicionaisV2, type DadosPosicionaisV2 } from './_shared/positionV2';
import type { D1DatabaseLike, D1Statement } from './_shared/requestSecurity';

let natal: DadosPosicionaisV2;

beforeAll(async () => {
  const bytes = new Uint8Array(
    await readFile(new URL('../../node_modules/@fusionstrings/swiss-eph/wasm/swiss-eph-wasi.wasm', import.meta.url)),
  );
  const swiss: SwissEph = await load(bytes);
  natal = calculateDadosPosicionaisV2(
    {
      calculationId: 'mapa-natal-001',
      calculatedAtUtc: '2026-07-12T12:00:00Z',
      instantUtc: '1990-05-15T17:30:00Z',
      date: '1990-05-15',
      time: '14:30',
      timeResolution: {
        status: 'resolved',
        timeZoneIana: 'America/Sao_Paulo',
        instantUtc: '1990-05-15T17:30:00Z',
        offsetAtBirth: '-03:00',
        disambiguation: 'exact',
        historicalConfidence: 'certified-1970-plus',
      },
      place: {
        sourceLabel: 'Rio de Janeiro, Brasil',
        latitudeDeg: -22.9068,
        longitudeDeg: -43.1729,
        elevationMeters: 5,
        providerResultId: 3451190,
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
            return { enabled: 1, max_requests: 6, window_minutes: 15 } as TFirst;
          }
          if (query.includes('request_count')) return { request_count: 0 } as TFirst;
          if (query.includes('dados_posicionais_v2')) {
            return { dados_posicionais_v2: JSON.stringify(natal) } as TFirst;
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
  vi.useRealTimers();
});

describe('/api/transitos', () => {
  it('calcula no instante do servidor, persiste run+artefato e apresenta Brasília', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T15:00:00.000Z'));
    const { onRequestPost } = await import('./transitos');
    const { db, executed } = createDb();
    const response = await onRequestPost({
      request: new Request('https://mapa-astral.lcv.app.br/api/transitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
        body: JSON.stringify({ mapaId: 'mapa-natal-001', horizonDays: 7 }),
      }),
      env: { BIGDATA_DB: db },
    });
    const payload = (await response.json()) as {
      success: boolean;
      transitRunV1: {
        schemaId: string;
        request: { referenceInstantUtc: string; horizonDays: number };
        presentationPolicy: { timeZone: string };
        positionsAtReference: unknown[];
      };
    };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.transitRunV1).toMatchObject({
      schemaId: 'urn:astrologo:transit-run',
      request: { referenceInstantUtc: '2026-07-12T15:00:00.000Z', horizonDays: 7 },
      presentationPolicy: { timeZone: 'America/Sao_Paulo' },
    });
    expect(payload.transitRunV1.positionsAtReference).toHaveLength(10);
    expect(executed.some(({ query }) => query.includes('INSERT INTO astrologo_transit_runs'))).toBe(true);
    expect(executed.some(({ query }) => query.includes('INSERT INTO astrologo_artifacts'))).toBe(true);
    expect(executed.some(({ query }) => query.includes("status = 'ready'"))).toBe(true);
  });
});
