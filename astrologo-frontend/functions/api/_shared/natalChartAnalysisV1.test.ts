import { readFile } from 'node:fs/promises';
import { load, type SwissEph } from '@fusionstrings/swiss-eph';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  angularSeparationDeg,
  calculateNatalChartAnalysisSupplementV1,
  calculateNatalChartAnalysisV1,
  NATAL_CHART_ANALYSIS_SCHEMA_ID,
  NATAL_CHART_ANALYSIS_SCHEMA_VERSION,
  NATAL_CHART_ASPECT_PROFILE,
  type NatalChartAnalysisV1,
  resolveNatalMajorAspect,
} from './natalChartAnalysisV1';
import {
  isNatalChartAnalysisV1,
  NATAL_CHART_ANALYSIS_V1_JSON_SCHEMA,
  validateNatalChartAnalysisV1,
} from './natalChartAnalysisV1Schema';
import { calculateDadosPosicionaisV2, type DadosPosicionaisV2, projectTropical } from './positionV2';

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;

let sourceFixture: DadosPosicionaisV2;
let swiss: SwissEph;

beforeAll(async () => {
  const bytes = new Uint8Array(
    await readFile(new URL('../../../node_modules/@fusionstrings/swiss-eph/wasm/swiss-eph-wasi.wasm', import.meta.url)),
  );
  swiss = await load(bytes);
  sourceFixture = calculateDadosPosicionaisV2(
    {
      calculationId: '00000000-0000-4000-8000-000000000001',
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

describe('suplemento natal obtido diretamente do Swiss Ephemeris', () => {
  it('preserva velocidades e hpos fracionário sem estimar o grau mundano por cúspides', () => {
    const supplement = calculateNatalChartAnalysisSupplementV1(sourceFixture, swiss);
    const analysis = calculateNatalChartAnalysisV1(sourceFixture, supplement);

    expect(supplement.longitudinalVelocities).toHaveLength(10);
    expect(supplement.rawSwissHousePositions).toHaveLength(10);
    expect(analysis.movements.every(({ status }) => status === 'available')).toBe(true);
    expect(
      analysis.houseOccupancies.every(
        ({ occupancy, mundaneDegreeWithinHouse }) =>
          occupancy.status !== 'available' || mundaneDegreeWithinHouse.status === 'available',
      ),
    ).toBe(true);
    expect(analysis.diagnostics).not.toContainEqual({
      severity: 'info',
      code: 'RAW_SWISS_HOUSE_POSITIONS_NOT_PROVIDED',
    });
  });
});

const sourceWithLongitudes = (longitudes: Partial<Record<string, number>>): DadosPosicionaisV2 => {
  const source = structuredClone(sourceFixture) as Mutable<DadosPosicionaisV2>;
  for (const position of source.positions) {
    const longitude = longitudes[position.bodyId];
    if (longitude === undefined) continue;
    position.coordinates.eclipticLongitudeDeg = longitude;
    position.tropical = projectTropical(longitude) as Mutable<typeof position.tropical>;
    position.angelicQuinary.basisLongitudeDeg = longitude;
  }
  return source as DadosPosicionaisV2;
};

const findAspect = (analysis: NatalChartAnalysisV1, pointAId: string, pointBId: string) =>
  analysis.aspects.find(
    ({ pointA, pointB }) =>
      (pointA.id === pointAId && pointB.id === pointBId) || (pointA.id === pointBId && pointB.id === pointAId),
  );

describe('matemática e política versionada dos aspectos natais', () => {
  it('usa a menor separação angular inclusive ao cruzar 0°', () => {
    expect(angularSeparationDeg(359, 1)).toBe(2);
    expect(angularSeparationDeg(1, 359)).toBe(2);
    expect(angularSeparationDeg(10, 190)).toBe(180);
  });

  it.each([
    [0, 'conjunction', 8],
    [60, 'sextile', 4],
    [90, 'square', 8],
    [120, 'trine', 8],
    [150, 'quincunx', 4],
    [180, 'opposition', 8],
  ] as const)('fixa %d° como %s com orbe explícito de %d°', (separationDeg, aspectId, allowedOrbDeg) => {
    expect(resolveNatalMajorAspect(separationDeg)).toMatchObject({ aspectId, allowedOrbDeg, orbDeg: 0 });
  });

  it('inclui a fronteira do orbe e rejeita o valor imediatamente exterior', () => {
    expect(resolveNatalMajorAspect(64)).toMatchObject({ aspectId: 'sextile', orbDeg: 4, intensityPercent: 0 });
    expect(resolveNatalMajorAspect(64.000_001)).toBeNull();
    expect(resolveNatalMajorAspect(82)).toMatchObject({ aspectId: 'square', orbDeg: 8, intensityPercent: 0 });
    expect(resolveNatalMajorAspect(82.000_001)?.intensityPercent).toBeGreaterThan(0);
  });

  it('publica o perfil sem modificadores implícitos por planeta', () => {
    expect(NATAL_CHART_ASPECT_PROFILE).toMatchObject({
      profileId: 'astrologo-natal-major-v1',
      profileVersion: '1.0.0',
      orbPolicy: 'fixed-by-aspect-no-body-modifiers',
      orbBoundaryConvention: 'inclusive',
    });
  });
});

describe('NatalChartAnalysisV1', () => {
  it('deriva um contrato irmão sem modificar DadosPosicionaisV2', () => {
    const source = structuredClone(sourceFixture);
    const snapshot = structuredClone(source);
    Object.freeze(source);

    const result = calculateNatalChartAnalysisV1(source);

    expect(source).toEqual(snapshot);
    expect(result.schemaId).toBe(NATAL_CHART_ANALYSIS_SCHEMA_ID);
    expect(result.schemaVersion).toBe(NATAL_CHART_ANALYSIS_SCHEMA_VERSION);
    expect(result.source).toEqual({
      schemaId: source.schemaId,
      schemaVersion: source.schemaVersion,
      calculationId: source.calculationId,
      calculatedAtUtc: source.calculatedAtUtc,
    });
    expect(result.aspects.every(({ pointA, pointB }) => pointA.kind === 'planet' || pointB.kind === 'planet')).toBe(
      true,
    );
    expect(JSON.stringify(result)).not.toMatch(/angel|constellation|iau/i);
    expect(validateNatalChartAnalysisV1(result)).toEqual({ valid: true, value: result });
  });

  it('calcula aspectos planeta-planeta e planeta-ângulo sem duplicar pares', () => {
    const ascendant = sourceFixture.angles.find(({ angleId }) => angleId === 'ascendant');
    if (!ascendant) throw new Error('Fixture sem Ascendente.');
    const source = sourceWithLongitudes({ sun: 10, moon: 70, mercury: ascendant.eclipticLongitudeDeg + 90 });
    const result = calculateNatalChartAnalysisV1(source);

    expect(findAspect(result, 'sun', 'moon')).toMatchObject({
      aspectId: 'sextile',
      separationDeg: 60,
      exactAngleDeg: 60,
      allowedOrbDeg: 4,
      orbDeg: 0,
      intensityPercent: 100,
    });
    expect(findAspect(result, 'mercury', 'ascendant')).toMatchObject({
      aspectId: 'square',
      separationDeg: 90,
      exactAngleDeg: 90,
      orbDeg: 0,
    });
    const pairKeys = result.aspects.map(
      ({ pointA, pointB }) => `${pointA.kind}:${pointA.id}|${pointB.kind}:${pointB.id}`,
    );
    expect(new Set(pairKeys).size).toBe(pairKeys.length);
  });

  it('não inventa movimento nem fase aplicativo/separativo sem velocidades explícitas', () => {
    const result = calculateNatalChartAnalysisV1(sourceFixture);

    expect(result.movements.every(({ status }) => status === 'unavailable')).toBe(true);
    expect(result.movements[0]).toMatchObject({
      status: 'unavailable',
      reasonCode: 'LONGITUDINAL_VELOCITY_NOT_PROVIDED',
    });
    expect(
      result.aspects
        .filter(({ phase }) => phase.status === 'unavailable')
        .every(({ phase }) => phase.status === 'unavailable' && phase.reasonCode.includes('VELOCITY')),
    ).toBe(true);
  });

  it('classifica movimento e fases somente a partir de velocidades fornecidas', () => {
    const source = sourceWithLongitudes({ sun: 0, moon: 58, mercury: 62, venus: 120 });
    const result = calculateNatalChartAnalysisV1(source, {
      longitudinalVelocities: [
        { bodyId: 'sun', velocityDegPerDay: 0 },
        { bodyId: 'moon', velocityDegPerDay: 1 },
        { bodyId: 'mercury', velocityDegPerDay: 1 },
        { bodyId: 'venus', velocityDegPerDay: -0.5 },
      ],
    });

    expect(result.movements.find(({ bodyId }) => bodyId === 'sun')).toMatchObject({
      status: 'available',
      direction: 'stationary',
    });
    expect(result.movements.find(({ bodyId }) => bodyId === 'moon')).toMatchObject({
      status: 'available',
      direction: 'direct',
    });
    expect(result.movements.find(({ bodyId }) => bodyId === 'venus')).toMatchObject({
      status: 'available',
      direction: 'retrograde',
    });
    expect(findAspect(result, 'sun', 'moon')?.phase).toMatchObject({ status: 'available', phase: 'applying' });
    expect(findAspect(result, 'sun', 'mercury')?.phase).toMatchObject({ status: 'available', phase: 'separating' });
    expect(findAspect(result, 'sun', 'venus')?.phase).toMatchObject({ status: 'available', phase: 'exact' });
    expect(
      result.aspects.find(({ pointA, pointB }) => pointA.kind === 'angle' || pointB.kind === 'angle')?.phase,
    ).toMatchObject({
      status: 'unavailable',
      reasonCode: 'ANGLE_VELOCITY_NOT_PROVIDED',
    });
    expect(validateNatalChartAnalysisV1(result)).toEqual({ valid: true, value: result });
  });

  it('preserva a ocupação Placidus e só calcula grau mundano quando recebe o hpos bruto', () => {
    const sun = sourceFixture.positions.find(({ bodyId }) => bodyId === 'sun');
    if (sun?.housePlacement.status !== 'available') throw new Error('Fixture sem casa solar.');
    const rawSwissHousePosition = sun.housePlacement.houseIndex1 + 0.4;

    const withoutSupplement = calculateNatalChartAnalysisV1(sourceFixture);
    expect(withoutSupplement.houseOccupancies.find(({ bodyId }) => bodyId === 'sun')).toMatchObject({
      occupancy: { status: 'available', houseIndex1: sun.housePlacement.houseIndex1 },
      mundaneDegreeWithinHouse: {
        status: 'unavailable',
        reasonCode: 'POSITION_V2_0_DOES_NOT_EXPOSE_MUNDANE_DEGREE',
      },
    });

    const withSupplement = calculateNatalChartAnalysisV1(sourceFixture, {
      rawSwissHousePositions: [{ bodyId: 'sun', rawSwissHousePosition }],
    });
    expect(withSupplement.houseOccupancies.find(({ bodyId }) => bodyId === 'sun')).toMatchObject({
      occupancy: { status: 'available', houseIndex1: sun.housePlacement.houseIndex1 },
      mundaneDegreeWithinHouse: {
        status: 'available',
        rawSwissHousePosition,
        mundaneLongitudeDeg: (rawSwissHousePosition - 1) * 30,
        coordinateSystem: 'placidus-house-horoscope',
        degreeSemantics: 'normalized-semiarc-house-degree',
      },
    });
    const mundane = withSupplement.houseOccupancies.find(({ bodyId }) => bodyId === 'sun')?.mundaneDegreeWithinHouse;
    expect(mundane?.status).toBe('available');
    if (mundane?.status !== 'available') throw new Error('Grau mundano solar indisponível.');
    expect(mundane.rawSwissHousePosition).toBe(rawSwissHousePosition);
    expect(mundane.degreeWithinHouseDeg).toBeCloseTo(12, 12);
    expect(validateNatalChartAnalysisV1(withSupplement)).toEqual({ valid: true, value: withSupplement });
  });

  it('rejeita suplemento mundano incoerente com a casa canônica', () => {
    const sun = sourceFixture.positions.find(({ bodyId }) => bodyId === 'sun');
    if (sun?.housePlacement.status !== 'available') throw new Error('Fixture sem casa solar.');
    const conflictingHouse = (sun.housePlacement.houseIndex1 % 12) + 1;

    expect(() =>
      calculateNatalChartAnalysisV1(sourceFixture, {
        rawSwissHousePositions: [{ bodyId: 'sun', rawSwissHousePosition: conflictingHouse + 0.25 }],
      }),
    ).toThrow(/incoerente/i);
  });

  it('mantém ocupação e grau mundano indisponíveis quando Placidus está indisponível', () => {
    const source = structuredClone(sourceFixture) as Mutable<DadosPosicionaisV2>;
    source.houses = { systemId: 'placidus', status: 'unavailable', reasonCode: 'PLACIDUS_UNAVAILABLE' };
    source.angles = [];
    for (const position of source.positions) {
      position.housePlacement = {
        status: 'unavailable',
        basis: 'swiss-swe-house-pos',
        reasonCode: 'PLACIDUS_UNAVAILABLE',
      };
    }

    const result = calculateNatalChartAnalysisV1(source as DadosPosicionaisV2);

    expect(result.houseOccupancies.every(({ occupancy }) => occupancy.status === 'unavailable')).toBe(true);
    expect(
      result.houseOccupancies.every(
        ({ mundaneDegreeWithinHouse }) => mundaneDegreeWithinHouse.status === 'unavailable',
      ),
    ).toBe(true);
    expect(result.diagnostics).toContainEqual({ severity: 'warning', code: 'PLACIDUS_UNAVAILABLE' });
  });
});

describe('schema estrito de NatalChartAnalysisV1', () => {
  it('publica JSON Schema 2020-12 sem objetos abertos', () => {
    expect(NATAL_CHART_ANALYSIS_V1_JSON_SCHEMA.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) return void node.forEach(visit);
      if (typeof node !== 'object' || node === null) return;
      const record = node as Record<string, unknown>;
      if (record.type === 'object') expect(record.additionalProperties).toBe(false);
      Object.values(record).forEach(visit);
    };
    visit(NATAL_CHART_ANALYSIS_V1_JSON_SCHEMA);
  });

  it('rejeita propriedades extras e invariantes matemáticas adulteradas', () => {
    const valid = calculateNatalChartAnalysisV1(sourceFixture);
    expect(isNatalChartAnalysisV1(valid)).toBe(true);

    const extra = Object.assign(structuredClone(valid), { intruder: true });
    expect(validateNatalChartAnalysisV1(extra)).toMatchObject({ valid: false });

    const inconsistent = structuredClone(valid) as unknown as Mutable<NatalChartAnalysisV1>;
    const firstAspect = inconsistent.aspects[0];
    if (!firstAspect) throw new Error('Fixture sem aspecto para adulterar.');
    firstAspect.orbDeg += 1;
    const result = validateNatalChartAnalysisV1(inconsistent);
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error('Contrato adulterado deveria ser inválido.');
    expect(result.errors.some(({ keyword }) => keyword === 'aspectGeometryConsistency')).toBe(true);
  });

  it('rejeita fase adulterada contra as velocidades explícitas', () => {
    const source = sourceWithLongitudes({ sun: 0, moon: 58 });
    const valid = calculateNatalChartAnalysisV1(source, {
      longitudinalVelocities: [
        { bodyId: 'sun', velocityDegPerDay: 0 },
        { bodyId: 'moon', velocityDegPerDay: 1 },
      ],
    });
    const inconsistent = structuredClone(valid) as unknown as Mutable<NatalChartAnalysisV1>;
    const aspect = inconsistent.aspects.find(
      ({ pointA, pointB }) =>
        (pointA.id === 'sun' && pointB.id === 'moon') || (pointA.id === 'moon' && pointB.id === 'sun'),
    );
    if (!aspect) throw new Error('Fixture sem aspecto Sol–Lua.');
    aspect.phase = { status: 'available', phase: 'separating', basis: 'explicit-longitudinal-velocities' };

    const result = validateNatalChartAnalysisV1(inconsistent);
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error('Fase adulterada deveria ser inválida.');
    expect(result.errors.some(({ keyword }) => keyword === 'aspectPhaseConsistency')).toBe(true);
  });

  it('rejeita suplemento desconhecido, duplicado, não finito ou fora de [1,13)', () => {
    expect(() =>
      calculateNatalChartAnalysisV1(sourceFixture, {
        longitudinalVelocities: [
          { bodyId: 'sun', velocityDegPerDay: 1 },
          { bodyId: 'sun', velocityDegPerDay: 2 },
        ],
      }),
    ).toThrow(/duplicado/i);
    expect(() =>
      calculateNatalChartAnalysisV1(sourceFixture, {
        longitudinalVelocities: [{ bodyId: 'sun', velocityDegPerDay: Number.NaN }],
      }),
    ).toThrow(/finita/i);
    expect(() =>
      calculateNatalChartAnalysisV1(sourceFixture, {
        rawSwissHousePositions: [{ bodyId: 'sun', rawSwissHousePosition: 13 }],
      }),
    ).toThrow(/\[1, 13\)/i);
    expect(() =>
      calculateNatalChartAnalysisV1(sourceFixture, {
        longitudinalVelocities: [{ bodyId: 'ceres' as 'sun', velocityDegPerDay: 1 }],
      }),
    ).toThrow(/desconhecido/i);
  });
});
