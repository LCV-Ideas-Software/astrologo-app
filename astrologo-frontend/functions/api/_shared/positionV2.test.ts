import { readFile } from 'node:fs/promises';
import { load, type SwissEph } from '@fusionstrings/swiss-eph';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  angelForLongitude,
  calculateDadosPosicionaisV2,
  formatDegreePtBrTruncated,
  normalizeLongitude,
  projectTropical,
} from './positionV2';

let swiss: SwissEph;

beforeAll(async () => {
  const bytes = new Uint8Array(
    await readFile(new URL('../../../node_modules/@fusionstrings/swiss-eph/wasm/swiss-eph-wasi.wasm', import.meta.url)),
  );
  swiss = await load(bytes);
});

const calculateFixture = () =>
  calculateDadosPosicionaisV2(
    {
      calculationId: '00000000-0000-4000-8000-000000000001',
      calculatedAtUtc: '2026-07-11T03:04:05Z',
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

describe('motor posicional v2', () => {
  it('calcula os dez planetas, Placidus, IAU e uma correspondência angelical por planeta', () => {
    const result = calculateFixture();

    expect(result.positions.map(({ bodyId }) => bodyId)).toEqual([
      'sun',
      'moon',
      'mercury',
      'venus',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'pluto',
    ]);
    expect(result.houses.status).toBe('available');
    if (result.houses.status !== 'available') throw new Error('Placidus deveria estar disponível');
    expect(result.houses.cusps).toHaveLength(12);
    expect(result.houses.cusps[0]?.eclipticLongitudeDeg).toBeCloseTo(183.34746873206728, 9);
    expect(result.angles).toHaveLength(2);
    expect(result.angles[0]?.angleId).toBe('ascendant');
    expect(result.angles[0]?.eclipticLongitudeDeg).toBeCloseTo(183.34746873206728, 9);
    expect(result.angles[1]?.angleId).toBe('midheaven');
    expect(result.angles[1]?.eclipticLongitudeDeg).toBeCloseTo(92.30230048521658, 9);

    for (const position of result.positions) {
      expect(position.tropical.degreeWithinSignDeg).toBeGreaterThanOrEqual(0);
      expect(position.tropical.degreeWithinSignDeg).toBeLessThan(30);
      expect(position.angelicQuinary.basisSystem).toBe('tropical');
      expect(position.angelicQuinary.angel.id).toBeGreaterThanOrEqual(1);
      expect(position.angelicQuinary.angel.id).toBeLessThanOrEqual(72);
      expect(position.housePlacement.status).toBe('available');
      expect(position.astronomicalReal.degreeWithinConstellation).toEqual({
        status: 'not-defined',
        reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS',
      });
    }
  });

  it('forma uma falange sem eleger anjo principal ou dominante', () => {
    const result = calculateFixture();
    expect(result.aggregates.angelicFalange.reduce((sum, group) => sum + group.occurrenceCount, 0)).toBe(10);
    expect(JSON.stringify(result)).not.toMatch(/primaryAngel|regenteNatal|dominantAngel/i);
  });

  it('fixa proveniência dos motores e do catálogo', () => {
    const result = calculateFixture();
    expect(result.models.ephemeris).toMatchObject({ engineId: 'astronomy-engine', engineVersion: '2.1.19' });
    expect(result.models.houses).toEqual({
      engineId: 'swiss-ephemeris-wasm',
      engineVersion: '2.10.03',
      runtimeWasmSha256: '31d3406560fd39b91bc9dbfdff6c9111f170fde2db62ebe92581ae14e878744c',
      systemId: 'placidus',
    });
    expect(result.catalogs.angelic72.catalogSha256).toHaveLength(64);
  });

  it.each([
    ['1951-11-30', 'sun'],
    ['1978-09-09', 'moon'],
    ['1932-12-09', 'mercury'],
    ['1904-01-11', 'venus'],
    ['2019-02-06', 'uranus'],
  ] as const)('falha fechado em divergência empírica de fronteira IAU: %s/%s', (date, bodyId) => {
    const instantUtc = `${date}T00:00:00Z`;
    const result = calculateDadosPosicionaisV2(
      {
        calculationId: `boundary-${date}`,
        calculatedAtUtc: '2026-07-11T03:04:05Z',
        instantUtc,
        date,
        time: '00:00',
        timeResolution: {
          status: 'resolved',
          timeZoneIana: 'UTC',
          instantUtc,
          offsetAtBirth: '+00:00',
          disambiguation: 'exact',
          historicalConfidence: date < '1970' ? 'best-effort-1900-1969' : 'certified-1970-plus',
        },
        place: {
          sourceLabel: 'Greenwich',
          latitudeDeg: 0,
          longitudeDeg: 0,
          elevationMeters: 0,
          providerResultId: 1,
        },
      },
      swiss,
    );
    expect(result.positions.find((position) => position.bodyId === bodyId)?.astronomicalReal).toMatchObject({
      status: 'unavailable',
      reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN',
    });
  });

  it('não substitui Placidus silenciosamente por outro sistema em latitude polar', () => {
    const instantUtc = '2026-06-21T12:00:00Z';
    const result = calculateDadosPosicionaisV2(
      {
        calculationId: 'polar-placidus',
        calculatedAtUtc: '2026-07-11T03:04:05Z',
        instantUtc,
        date: '2026-06-21',
        time: '14:00',
        timeResolution: {
          status: 'resolved',
          timeZoneIana: 'Arctic/Longyearbyen',
          instantUtc,
          offsetAtBirth: '+02:00',
          disambiguation: 'exact',
          historicalConfidence: 'certified-1970-plus',
        },
        place: {
          sourceLabel: 'Longyearbyen, Svalbard',
          latitudeDeg: 78.2232,
          longitudeDeg: 15.6469,
          elevationMeters: 28,
          providerResultId: 1,
        },
      },
      swiss,
    );

    expect(result.houses).toEqual({
      systemId: 'placidus',
      status: 'unavailable',
      reasonCode: 'PLACIDUS_UNAVAILABLE',
    });
    expect(result.positions.every(({ housePlacement }) => housePlacement.status === 'unavailable')).toBe(true);
    expect(result.models.houses.systemId).toBe('placidus');
  });
});

describe('fronteiras matemáticas tropicais e angelicais', () => {
  it.each([
    [0, 1],
    [4.999999999, 1],
    [5, 2],
    [354.999999999, 71],
    [355, 72],
    [359.999999999, 72],
    [360, 1],
  ])('classifica %d° no anjo #%d usando intervalos [início,fim)', (longitude, expectedAngelId) => {
    expect(angelForLongitude(longitude).id).toBe(expectedAngelId);
  });

  it('normaliza longitudes e não arredonda cruzando uma fronteira', () => {
    expect(normalizeLongitude(-1)).toBe(359);
    expect(normalizeLongitude(360)).toBe(0);
    expect(projectTropical(29.999999).sign.namePtBr).toBe('Áries');
    expect(formatDegreePtBrTruncated(4.9999, 2)).toBe('4,99°');
  });
});
