import { readFile } from 'node:fs/promises';
import { load, type SwissEph } from '@fusionstrings/swiss-eph';
import { beforeAll, describe, expect, it } from 'vitest';
import { calculateDadosPosicionaisV2, type DadosPosicionaisV2 } from './positionV2';
import {
  angularSeparationDeg,
  calculateSynastryRunV1,
  houseIndexForLongitude,
  resolveSynastryAspect,
  SYNASTRY_ASPECT_PROFILE_V1,
  SYNASTRY_RUN_SCHEMA_ID,
  SYNASTRY_RUN_SCHEMA_VERSION,
  type SynastryRunV1,
} from './synastryRunV1';
import { isSynastryRunV1, validateSynastryRunV1 } from './synastryRunV1Schema';

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;

let chartA: DadosPosicionaisV2;
let chartB: DadosPosicionaisV2;

const calculateFixture = (
  swiss: SwissEph,
  input: {
    calculationId: string;
    instantUtc: string;
    date: string;
    time: string;
    latitudeDeg: number;
    longitudeDeg: number;
    providerResultId: number;
    sourceLabel: string;
  },
): DadosPosicionaisV2 =>
  calculateDadosPosicionaisV2(
    {
      calculationId: input.calculationId,
      calculatedAtUtc: '2026-07-12T15:00:00Z',
      instantUtc: input.instantUtc,
      date: input.date,
      time: input.time,
      timeResolution: {
        status: 'resolved',
        timeZoneIana: 'America/Sao_Paulo',
        instantUtc: input.instantUtc,
        offsetAtBirth: '-03:00',
        disambiguation: 'exact',
        historicalConfidence: 'certified-1970-plus',
      },
      place: {
        sourceLabel: input.sourceLabel,
        latitudeDeg: input.latitudeDeg,
        longitudeDeg: input.longitudeDeg,
        elevationMeters: 5,
        providerResultId: input.providerResultId,
      },
    },
    swiss,
  );

beforeAll(async () => {
  const bytes = new Uint8Array(
    await readFile(new URL('../../../node_modules/@fusionstrings/swiss-eph/wasm/swiss-eph-wasi.wasm', import.meta.url)),
  );
  const swiss = await load(bytes);
  chartA = calculateFixture(swiss, {
    calculationId: '00000000-0000-4000-8000-0000000000a1',
    instantUtc: '1993-05-21T00:12:00Z',
    date: '1993-05-20',
    time: '21:12',
    latitudeDeg: -22.9068,
    longitudeDeg: -43.1729,
    providerResultId: 3451190,
    sourceLabel: 'Rio de Janeiro, Brasil',
  });
  chartB = calculateFixture(swiss, {
    calculationId: '00000000-0000-4000-8000-0000000000b2',
    instantUtc: '1979-03-26T19:45:00Z',
    date: '1979-03-26',
    time: '16:45',
    latitudeDeg: -22.4625,
    longitudeDeg: -42.6531,
    providerResultId: 3468425,
    sourceLabel: 'Cachoeiras de Macacu, Brasil',
  });
});

describe('perfil independente de aspectos da sinastria', () => {
  it('é explícito, versionado, inclusivo e não declara fase sem velocidades', () => {
    expect(SYNASTRY_ASPECT_PROFILE_V1).toMatchObject({
      profileId: 'astrologo-synastry-major-v1',
      profileVersion: '1.0.0',
      orbPolicy: 'fixed-by-aspect-no-body-modifiers',
      orbBoundaryConvention: 'inclusive',
      applyingSeparatingPolicy: 'not-calculated-without-longitudinal-velocities',
    });
  });

  it('inclui exatamente a fronteira do orbe e rejeita o primeiro valor exterior', () => {
    expect(resolveSynastryAspect(64)).toMatchObject({ aspectId: 'sextile', orbDeg: 4 });
    expect(resolveSynastryAspect(64.000_001)).toBeNull();
    expect(resolveSynastryAspect(98)).toMatchObject({ aspectId: 'square', orbDeg: 8 });
    expect(resolveSynastryAspect(98.000_001)).toBeNull();
  });

  it('aceita a conjunção através do wrap de 360 graus', () => {
    const separationDeg = angularSeparationDeg(359, 1);
    expect(separationDeg).toBe(2);
    expect(resolveSynastryAspect(separationDeg)).toMatchObject({ aspectId: 'conjunction', orbDeg: 2 });
  });
});

describe('sobreposição nas Casas Placidus do outro mapa', () => {
  const wrappedCusps = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320].map(
    (eclipticLongitudeDeg, index0) => ({ houseIndex1: index0 + 1, eclipticLongitudeDeg }),
  );

  it('usa intervalos semiabertos e atravessa corretamente 360°', () => {
    expect(houseIndexForLongitude(359, wrappedCusps)).toBe(1);
    expect(houseIndexForLongitude(0, wrappedCusps)).toBe(1);
    expect(houseIndexForLongitude(19.999_999, wrappedCusps)).toBe(1);
    expect(houseIndexForLongitude(20, wrappedCusps)).toBe(2);
    expect(houseIndexForLongitude(349.999_999, wrappedCusps)).toBe(12);
    expect(houseIndexForLongitude(350, wrappedCusps)).toBe(1);
  });

  it('rejeita cúspides fora da ordem canônica ou com propriedades extras', () => {
    expect(() => houseIndexForLongitude(10, [...wrappedCusps].reverse())).toThrow(/ordem/i);
    expect(() =>
      houseIndexForLongitude(10, [...wrappedCusps.slice(0, 11), { ...wrappedCusps[11]!, extra: true } as never]),
    ).toThrow(/propriedade/i);
  });
});

describe('SynastryRunV1', () => {
  it('produz referências A/B, somente os dez corpos e duas sobreposições ordenadas', () => {
    const result = calculateSynastryRunV1(chartA, chartB);

    expect(result.schemaId).toBe(SYNASTRY_RUN_SCHEMA_ID);
    expect(result.schemaVersion).toBe(SYNASTRY_RUN_SCHEMA_VERSION);
    expect(result.charts.A.calculationId).toBe(chartA.calculationId);
    expect(result.charts.B.calculationId).toBe(chartB.calculationId);
    expect(result.presentationPolicy).toMatchObject({ locale: 'pt-BR', timeZone: 'America/Sao_Paulo' });
    expect(result.houseOverlays.aToB).toHaveLength(10);
    expect(result.houseOverlays.bToA).toHaveLength(10);
    expect(result.houseOverlays.aToB.map(({ sourceBodyId }) => sourceBodyId)).toEqual(chartA.targetSet.orderedIds);
    expect(result.houseOverlays.bToA.map(({ sourceBodyId }) => sourceBodyId)).toEqual(chartB.targetSet.orderedIds);
    expect(result.aspects.every(({ pointA, pointB }) => pointA.chartRef === 'A' && pointB.chartRef === 'B')).toBe(true);
    expect(result.aspects.every((aspect) => !Object.hasOwn(aspect, 'phase'))).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/velocityDegPerDay|retrograde/i);
    expect(validateSynastryRunV1(result)).toEqual({ valid: true, value: result });
  });

  it('mantém separações e aspectos simétricos ao trocar A e B, com ordem determinística por papel', () => {
    const forward = calculateSynastryRunV1(chartA, chartB);
    const reverse = calculateSynastryRunV1(chartB, chartA);
    const mirrorKeys = (run: SynastryRunV1, reverseRoles: boolean) =>
      run.aspects
        .map(({ pointA, pointB, aspectId, separationDeg, orbDeg }) =>
          reverseRoles
            ? `${pointB.bodyId}|${pointA.bodyId}|${aspectId}|${separationDeg}|${orbDeg}`
            : `${pointA.bodyId}|${pointB.bodyId}|${aspectId}|${separationDeg}|${orbDeg}`,
        )
        .sort();

    expect(mirrorKeys(reverse, true)).toEqual(mirrorKeys(forward, false));
    expect(reverse.houseOverlays.bToA.map(({ sourceBodyId, placement }) => ({ sourceBodyId, placement }))).toEqual(
      forward.houseOverlays.aToB.map(({ sourceBodyId, placement }) => ({ sourceBodyId, placement })),
    );
  });

  it('não altera os mapas de origem', () => {
    const beforeA = structuredClone(chartA);
    const beforeB = structuredClone(chartB);
    calculateSynastryRunV1(Object.freeze(chartA), Object.freeze(chartB));
    expect(chartA).toEqual(beforeA);
    expect(chartB).toEqual(beforeB);
  });

  it('representa explicitamente a indisponibilidade das casas receptoras', () => {
    const withoutHouses = structuredClone(chartB) as Mutable<DadosPosicionaisV2>;
    withoutHouses.houses = { systemId: 'placidus', status: 'unavailable', reasonCode: 'PLACIDUS_UNAVAILABLE' };
    withoutHouses.angles = [];
    for (const position of withoutHouses.positions) {
      position.housePlacement = {
        status: 'unavailable',
        basis: 'swiss-swe-house-pos',
        reasonCode: 'PLACIDUS_UNAVAILABLE',
      };
    }

    const result = calculateSynastryRunV1(chartA, withoutHouses as DadosPosicionaisV2);
    expect(result.houseOverlays.aToB.every(({ placement }) => placement.status === 'unavailable')).toBe(true);
    expect(result.houseOverlays.bToA.some(({ placement }) => placement.status === 'available')).toBe(true);
    expect(result.diagnostics).toContainEqual({
      severity: 'warning',
      code: 'CHART_B_PLACIDUS_UNAVAILABLE',
    });
  });

  it('validador rejeita extras, duplicações, ordem trocada e invariantes numéricos falsos', () => {
    const valid = calculateSynastryRunV1(chartA, chartB);

    expect(isSynastryRunV1({ ...valid, extra: true })).toBe(false);

    const duplicatedOverlay = structuredClone(valid) as unknown as Mutable<SynastryRunV1>;
    duplicatedOverlay.houseOverlays.aToB[1] = structuredClone(duplicatedOverlay.houseOverlays.aToB[0]!);
    expect(validateSynastryRunV1(duplicatedOverlay).valid).toBe(false);

    if (valid.aspects.length > 0) {
      const inconsistentAspect = structuredClone(valid) as unknown as Mutable<SynastryRunV1>;
      inconsistentAspect.aspects[0]!.orbDeg += 0.5;
      expect(validateSynastryRunV1(inconsistentAspect).valid).toBe(false);

      const swappedOrder = structuredClone(valid) as unknown as Mutable<SynastryRunV1>;
      swappedOrder.aspects.reverse();
      expect(validateSynastryRunV1(swappedOrder).valid).toBe(false);
    }
  });
});
