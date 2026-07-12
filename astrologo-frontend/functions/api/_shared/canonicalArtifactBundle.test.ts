import { describe, expect, it } from 'vitest';
import { loadCanonicalArtifactBundle, loadCanonicalPrimarySynastryViewV1 } from './canonicalArtifactBundle';
import { POSITIONAL_SCHEMA_ID, POSITIONAL_SCHEMA_VERSION } from './positionV2';
import type { D1DatabaseLike, D1Statement } from './requestSecurity';
import {
  SYNASTRY_ASPECT_PROFILE_V1,
  SYNASTRY_PLANET_BODY_IDS,
  SYNASTRY_RUN_SCHEMA_ID,
  SYNASTRY_RUN_SCHEMA_VERSION,
  SYNASTRY_TARGET_SET_ID,
  type SynastryRunV1,
} from './synastryRunV1';

const validRun = (primaryId: string, secondaryId: string): SynastryRunV1 => {
  const chart = (calculationId: string) => ({
    schemaId: POSITIONAL_SCHEMA_ID,
    schemaVersion: POSITIONAL_SCHEMA_VERSION,
    calculationId,
    calculatedAtUtc: '2026-07-12T15:00:00.000Z',
    birthInstantUtc: '1993-05-21T00:12:00.000Z',
  });
  const unavailable = {
    status: 'unavailable' as const,
    reasonCode: 'PLACIDUS_UNAVAILABLE' as const,
    basis: 'recipient-placidus-cusps-ecliptic-longitude' as const,
  };
  const overlays = (direction: 'A-to-B' | 'B-to-A') =>
    SYNASTRY_PLANET_BODY_IDS.map((sourceBodyId) => ({
      direction,
      sourceChartRef: direction === 'A-to-B' ? ('A' as const) : ('B' as const),
      sourceBodyId,
      targetChartRef: direction === 'A-to-B' ? ('B' as const) : ('A' as const),
      placement: unavailable,
    }));

  return {
    schemaId: SYNASTRY_RUN_SCHEMA_ID,
    schemaVersion: SYNASTRY_RUN_SCHEMA_VERSION,
    charts: { A: chart(primaryId), B: chart(secondaryId) },
    targetSet: {
      id: SYNASTRY_TARGET_SET_ID,
      version: '1.0.0',
      orderedBodyIds: SYNASTRY_PLANET_BODY_IDS,
    },
    presentationPolicy: {
      locale: 'pt-BR',
      timeZone: 'America/Sao_Paulo',
      timeZoneLabel: 'Hora oficial de Brasília',
      calendar: 'gregory',
      numberingSystem: 'latn',
      hourCycle: 'h23',
    },
    models: {
      aspects: SYNASTRY_ASPECT_PROFILE_V1,
      houseOverlays: {
        systemId: 'placidus',
        sourceCoordinate: 'geocentric-true-ecliptic-longitude-of-date',
        recipientBoundarySource: 'dados-posicionais-v2-cusps',
        intervalConvention: '[cusp,next-cusp)',
      },
    },
    aspects: [],
    houseOverlays: { aToB: overlays('A-to-B'), bToA: overlays('B-to-A') },
    diagnostics: [
      { severity: 'warning', code: 'CHART_A_PLACIDUS_UNAVAILABLE' },
      { severity: 'warning', code: 'CHART_B_PLACIDUS_UNAVAILABLE' },
    ],
  };
};

const dbReturning = (row: unknown, queries: string[]): D1DatabaseLike => ({
  prepare: <TFirst>(query: string) => {
    queries.push(query);
    const statement: D1Statement<TFirst> = {
      bind: () => statement,
      first: async () => row as TFirst,
      run: async () => ({ success: true }),
      all: async () => ({ results: [] }),
    };
    return statement;
  },
});

describe('bundle canônico autenticado', () => {
  it('reidrata somente a sinastria em que o mapa salvo é o gráfico primário A', async () => {
    const queries: string[] = [];
    const run = validRun('mapa-a', 'mapa-b');
    const result = await loadCanonicalPrimarySynastryViewV1(
      dbReturning(
        {
          payload_json: JSON.stringify(run),
          primary_name: 'Leonardo',
          secondary_name: 'João',
          secondary_mapa_id: 'mapa-b',
        },
        queries,
      ),
      'mapa-a',
    );

    expect(result).toEqual({
      run,
      names: { A: 'Leonardo', B: 'João' },
      secondaryMapId: 'mapa-b',
    });
    expect(queries[0]).toContain('run.primary_mapa_id = ?');
    expect(queries[0]).not.toContain('(run.primary_mapa_id = ? OR run.secondary_mapa_id = ?)');
  });

  it('falha fechado quando o payload declara outro mapa no papel A', async () => {
    const queries: string[] = [];
    const result = await loadCanonicalPrimarySynastryViewV1(
      dbReturning(
        {
          payload_json: JSON.stringify(validRun('outro-mapa', 'mapa-b')),
          primary_name: 'Outra pessoa',
          secondary_name: 'João',
          secondary_mapa_id: 'mapa-b',
        },
        queries,
      ),
      'mapa-a',
    );

    expect(result).toBeNull();
  });

  it('distingue ausência legítima, payload inválido e falha de infraestrutura', async () => {
    const absentDb = dbReturning(null, []);
    const absent = await loadCanonicalArtifactBundle(absentDb, 'mapa-a');
    expect(Object.values(absent)).toEqual([
      { status: 'absent' },
      { status: 'absent' },
      { status: 'absent' },
      { status: 'absent' },
    ]);

    const invalidDb: D1DatabaseLike = {
      prepare: <TFirst>(query: string) => {
        const statement: D1Statement<TFirst> = {
          bind: () => statement,
          first: async () =>
            (query.includes("artifact_type = 'natal_chart_analysis'")
              ? { payload_json: '{json-inválido' }
              : null) as TFirst,
          run: async () => ({ success: true }),
          all: async () => ({ results: [] }),
        };
        return statement;
      },
    };
    const invalid = await loadCanonicalArtifactBundle(invalidDb, 'mapa-a');
    expect(invalid.natalChartAnalysisV1).toEqual({ status: 'invalid', reasonCode: 'PAYLOAD_INVALID' });

    const errorDb: D1DatabaseLike = {
      prepare: <TFirst>(query: string) => {
        const statement: D1Statement<TFirst> = {
          bind: () => statement,
          first: async () => {
            if (query.includes('astrologo_locality_runs')) throw new Error('D1 indisponível');
            return null;
          },
          run: async () => ({ success: true }),
          all: async () => ({ results: [] }),
        };
        return statement;
      },
    };
    const failed = await loadCanonicalArtifactBundle(errorDb, 'mapa-a');
    expect(failed.localityMapV1).toEqual({ status: 'error', reasonCode: 'QUERY_FAILED' });
  });

  it('marca a sinastria válida como disponível e mantém os backlinks A e B', async () => {
    const run = validRun('mapa-a', 'mapa-b');
    const db: D1DatabaseLike = {
      prepare: <TFirst>(query: string) => {
        const statement: D1Statement<TFirst> = {
          bind: () => statement,
          first: async () =>
            (query.includes('astrologo_synastry_runs')
              ? {
                  payload_json: JSON.stringify(run),
                  primary_name: 'Leonardo',
                  secondary_name: 'João',
                  secondary_mapa_id: 'mapa-b',
                }
              : null) as TFirst,
          run: async () => ({ success: true }),
          all: async () => ({ results: [] }),
        };
        return statement;
      },
    };

    const bundle = await loadCanonicalArtifactBundle(db, 'mapa-a');
    expect(bundle.synastryResult).toEqual({
      status: 'available',
      value: { run, names: { A: 'Leonardo', B: 'João' }, secondaryMapId: 'mapa-b' },
    });
  });
});
