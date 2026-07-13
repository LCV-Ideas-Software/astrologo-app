import { describe, expect, it } from 'vitest';
import {
  appendAdvancedAnalysisPrompt,
  buildLocalityAnalysisPromptAddendum,
  buildNatalAnalysisPromptAddendum,
  buildSynastryAnalysisPromptAddendum,
  buildTransitAnalysisPromptAddendum,
  loadCanonicalLocalityMapV1,
  loadCanonicalNatalAnalysisV1,
  loadCanonicalSynastryRunV1,
  loadCanonicalTransitRunV1,
} from './advancedAnalysisPrompt';
import type { LocalityMapV1 } from './localityMapV1';
import type { NatalChartAnalysisV1 } from './natalChartAnalysisV1';
import type { D1DatabaseLike, D1Statement } from './requestSecurity';
import type { SynastryRunV1 } from './synastryRunV1';
import type { TransitRunV1 } from './transitRunV1';

const natal = {
  schemaId: 'urn:astrologo:natal-chart-analysis',
  schemaVersion: '1.0.0',
  source: {
    schemaId: 'urn:astrologo:dados-posicionais',
    schemaVersion: '2.0.0',
    calculationId: 'mapa-1',
    calculatedAtUtc: '2026-07-12T15:00:00Z',
  },
  models: {
    aspects: { profileId: 'astrologo-natal-major-v1', profileVersion: '1.0.0' },
    houses: { systemId: 'placidus' },
  },
  points: [
    { kind: 'planet', id: 'sun', displayNamePtBr: 'Sol', symbol: '☉', eclipticLongitudeDeg: 10 },
    { kind: 'planet', id: 'moon', displayNamePtBr: 'Lua', symbol: '☽', eclipticLongitudeDeg: 70 },
  ],
  movements: [{ bodyId: 'sun', status: 'available', velocityDegPerDay: 0.98, direction: 'direct' }],
  aspects: [
    {
      recordId: 'sun-moon',
      pointA: { kind: 'planet', id: 'sun' },
      pointB: { kind: 'planet', id: 'moon' },
      aspectId: 'sextile',
      displayNamePtBr: 'Sextil',
      separationDeg: 60,
      exactAngleDeg: 60,
      allowedOrbDeg: 4,
      orbDeg: 0,
      intensityPercent: 100,
      phase: { status: 'available', phase: 'exact' },
    },
  ],
  houseOccupancies: [
    {
      bodyId: 'sun',
      occupancy: { status: 'available', houseIndex1: 5 },
      mundaneDegreeWithinHouse: { status: 'available', rawSwissHousePosition: 5.4, degreeWithinHouseDeg: 12 },
    },
  ],
  diagnostics: [],
} as unknown as NatalChartAnalysisV1;

const transit = {
  schemaId: 'urn:astrologo:transit-run',
  schemaVersion: '1.0.0',
  request: { referenceInstantUtc: '2026-07-12T15:00:00.000Z', horizonDays: 7 },
  models: { aspects: { profileId: 'astrologo-transit-major-v1', profileVersion: '1.0.0' } },
  positionsAtReference: [{ bodyId: 'sun', displayNamePtBr: 'Sol' }],
  natalTargets: [{ status: 'available', pointId: 'moon', displayNamePtBr: 'Lua' }],
  aspects: [
    {
      transitPoint: { bodyId: 'sun' },
      natalPoint: { pointId: 'moon' },
      aspectId: 'square',
      phase: { status: 'available', phase: 'applying' },
      exactitude: { status: 'unavailable', reasonCode: 'NO_EXACTITUDE_WITHIN_HORIZON' },
    },
  ],
  diagnostics: [],
} as unknown as TransitRunV1;

const synastry = {
  schemaId: 'urn:astrologo:synastry-run',
  schemaVersion: '1.0.0',
  models: { aspects: { profileId: 'astrologo-synastry-major-v1', profileVersion: '1.0.0' } },
  aspects: [{ pointA: { bodyId: 'sun' }, pointB: { bodyId: 'moon' }, aspectId: 'trine' }],
  houseOverlays: {
    aToB: [{ sourceBodyId: 'sun', placement: { status: 'available', houseIndex1: 5 } }],
    bToA: [{ sourceBodyId: 'moon', placement: { status: 'available', houseIndex1: 7 } }],
  },
  diagnostics: [],
} as unknown as SynastryRunV1;

const locality = {
  schemaId: 'urn:astrologo:locality-map',
  schemaVersion: '1.0.0',
  source: { birthInstantUtc: '1979-03-26T19:45:00.000Z' },
  models: {
    sourceCoordinates: {
      sourceFrame: 'geocentric-apparent-eqj-j2000',
      workingFrame: 'geocentric-apparent-true-equator-of-date-eqd',
      transformation: { methodId: 'astronomy-engine-Rotation_EQJ_EQD-v1' },
    },
    siderealTime: { kind: 'greenwich-apparent-sidereal-time', hours: 7.5 },
    geometry: { altitudeReferenceDeg: 0, refractionModel: 'none' },
    sampling: { latitudeResolutionDeg: 1 },
  },
  lines: [
    {
      recordId: 'sun:mc',
      bodyId: 'sun',
      angleId: 'mc',
      availability: { status: 'available' },
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [
            [-43, -89],
            [-43, 89],
          ],
        ],
      },
    },
  ],
  diagnostics: [],
} as unknown as LocalityMapV1;

describe('adendos acumulativos das análises avançadas', () => {
  it('preserva literalmente o prompt vigente e acrescenta todos os fatos natais canônicos', () => {
    const base = 'PROMPT VIGENTE, SEM ALTERAÇÃO.';
    const expanded = appendAdvancedAnalysisPrompt(base, { natal });

    expect(expanded.startsWith(base)).toBe(true);
    expect(expanded.slice(0, base.length)).toBe(base);
    expect(expanded).toContain('Este adendo fornece fatos natais adicionais');
    expect(expanded).toContain('astrologo-natal-major-v1');
    expect(expanded).toContain('"aspectId":"sextile"');
    expect(expanded).toContain('"degreeWithinHouseDeg":12');
    expect(expanded).toContain('não invente fase');
    expect(expanded).toContain('Priorize os aspectos de menor orbe');
    expect(expanded).toContain('Integre planeta, aspecto e casa');
    expect(expanded).not.toContain('Explique para uma pessoa leiga o que significam');
    expect(expanded).toContain('DADOS_NATAIS_AVANCADOS_V1 — INÍCIO');
  });

  it('não cria texto avançado quando nenhum contrato foi reidratado', () => {
    expect(appendAdvancedAnalysisPrompt('base', {})).toBe('base');
    expect(buildNatalAnalysisPromptAddendum(null)).toBe('');
  });

  it('acrescenta trânsitos sem reduzir o adendo natal nem inventar previsões', () => {
    const withNatal = appendAdvancedAnalysisPrompt('base', { natal });
    const expanded = appendAdvancedAnalysisPrompt('base', { natal, transit });
    expect(expanded.startsWith(withNatal)).toBe(true);
    expect(expanded).toContain('DADOS_TRANSITOS_V1 — INÍCIO');
    expect(expanded).toContain('astrologo-transit-major-v1');
    expect(expanded).toContain('Hora oficial de Brasília');
    expect(expanded).toContain('não invente data nem afirme que o aspecto ficará exato');
    expect(expanded).toContain('constelações fornecidas');
    expect(expanded).toContain('Não invente grau constelacional');
    expect(buildTransitAnalysisPromptAddendum(null)).toBe('');
  });

  it('acrescenta sinastria em duas direções sem produzir sentença relacional', () => {
    const beforeSynastry = appendAdvancedAnalysisPrompt('base', { natal, transit });
    const expanded = appendAdvancedAnalysisPrompt('base', { natal, transit, synastry });
    expect(expanded.startsWith(beforeSynastry)).toBe(true);
    expect(expanded).toContain('DADOS_SINASTRIA_V1 — INÍCIO');
    expect(expanded).toContain('astrologo-synastry-major-v1');
    expect(expanded).toContain('A nas Casas de B');
    expect(expanded).toContain('B nas Casas de A');
    expect(expanded).toContain('reciprocidades e assimetrias');
    expect(expanded).toContain('comunicação, afetividade, desejo, apoio, tensão, limites e crescimento');
    expect(expanded).toContain('Não atribua porcentagem de compatibilidade');
    expect(buildSynastryAnalysisPromptAddendum(null)).toBe('');
  });

  it('acrescenta a cartografia por último sem inventar destino ou recomendar mudança', () => {
    const beforeLocality = appendAdvancedAnalysisPrompt('base', { natal, transit, synastry });
    const expanded = appendAdvancedAnalysisPrompt('base', { natal, transit, synastry, locality });
    expect(expanded.startsWith(beforeLocality)).toBe(true);
    expect(expanded).toContain('DADOS_LOCALIDADE_V1 — INÍCIO');
    expect(expanded).not.toContain('EQJ/J2000');
    expect(expanded).not.toContain('EQD verdadeiro da data');
    expect(expanded).toContain('Interprete as linhas mais relevantes');
    expect(expanded).toContain('sem reexplicar a geometria');
    expect(expanded).toContain('Não recomende mudança');
    expect(expanded).toContain('raio de influência');
    expect(buildLocalityAnalysisPromptAddendum(null)).toBe('');
  });

  it('falha fechado ao reidratar payload adulterado do D1', async () => {
    const statement: D1Statement<{ payload_json?: string }> = {
      bind: () => statement,
      first: async () => ({ payload_json: JSON.stringify({ ...natal, schemaVersion: '9.9.9' }) }),
      run: async () => ({ success: true }),
      all: async () => ({ results: [] }),
    };
    const db = { prepare: () => statement } as unknown as D1DatabaseLike;
    await expect(loadCanonicalNatalAnalysisV1(db, 'mapa-1')).resolves.toBeNull();
  });

  it('não aceita um artefato de trânsito com versão adulterada', async () => {
    const statement: D1Statement<{ payload_json?: string }> = {
      bind: () => statement,
      first: async () => ({ payload_json: JSON.stringify({ ...transit, schemaVersion: '9.9.9' }) }),
      run: async () => ({ success: true }),
      all: async () => ({ results: [] }),
    };
    const db = { prepare: () => statement } as unknown as D1DatabaseLike;
    await expect(loadCanonicalTransitRunV1(db, 'mapa-1')).resolves.toBeNull();
  });

  it('não aceita um artefato de sinastria adulterado', async () => {
    const statement: D1Statement<{ payload_json?: string }> = {
      bind: () => statement,
      first: async () => ({ payload_json: JSON.stringify({ ...synastry, schemaVersion: '9.9.9' }) }),
      run: async () => ({ success: true }),
      all: async () => ({ results: [] }),
    };
    const db = { prepare: () => statement } as unknown as D1DatabaseLike;
    await expect(loadCanonicalSynastryRunV1(db, 'mapa-1')).resolves.toBeNull();
  });

  it('não aceita um artefato de localidade adulterado', async () => {
    const statement: D1Statement<{ payload_json?: string }> = {
      bind: () => statement,
      first: async () => ({ payload_json: JSON.stringify({ ...locality, schemaVersion: '9.9.9' }) }),
      run: async () => ({ success: true }),
      all: async () => ({ results: [] }),
    };
    const db = { prepare: () => statement } as unknown as D1DatabaseLike;
    await expect(loadCanonicalLocalityMapV1(db, 'mapa-1')).resolves.toBeNull();
  });
});
