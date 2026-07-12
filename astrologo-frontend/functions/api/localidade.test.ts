import { readFile } from 'node:fs/promises';
import { load, type SwissEph } from '@fusionstrings/swiss-eph';
import { beforeAll, describe, expect, it } from 'vitest';
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
      calculationId: 'mapa-localidade-001',
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
            return { enabled: 1, max_requests: 4, window_minutes: 30 } as TFirst;
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

describe('/api/localidade', () => {
  it('calcula 40 linhas no frame EQD correto e persiste run+artefato', async () => {
    const { onRequestPost } = await import('./localidade');
    const { db, executed } = createDb();
    const response = await onRequestPost({
      request: new Request('https://mapa-astral.lcv.app.br/api/localidade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
        body: JSON.stringify({ mapaId: 'mapa-localidade-001', resolutionDeg: 1 }),
      }),
      env: { BIGDATA_DB: db },
    });
    const payload = (await response.json()) as {
      success: boolean;
      localityMapV1: {
        schemaId: string;
        models: {
          sourceCoordinates: { sourceFrame: string; workingFrame: string; transformation: { methodId: string } };
          siderealTime: { kind: string; hours: number };
          sampling: { latitudeResolutionDeg: number };
        };
        lines: unknown[];
      };
    };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.localityMapV1).toMatchObject({
      schemaId: 'urn:astrologo:locality-map',
      models: {
        sourceCoordinates: {
          sourceFrame: 'geocentric-apparent-eqj-j2000',
          workingFrame: 'geocentric-apparent-true-equator-of-date-eqd',
          transformation: { methodId: 'astronomy-engine-Rotation_EQJ_EQD-v1' },
        },
        siderealTime: { kind: 'greenwich-apparent-sidereal-time' },
        sampling: { latitudeResolutionDeg: 1 },
      },
    });
    expect(payload.localityMapV1.models.siderealTime.hours).toBeGreaterThanOrEqual(0);
    expect(payload.localityMapV1.models.siderealTime.hours).toBeLessThan(24);
    expect(payload.localityMapV1.lines).toHaveLength(40);
    expect(executed.some(({ query }) => query.includes('INSERT INTO astrologo_locality_runs'))).toBe(true);
    expect(executed.some(({ query }) => query.includes("'locality_map'"))).toBe(true);
    expect(executed.some(({ query }) => query.includes("status = 'ready'"))).toBe(true);
  });
});
