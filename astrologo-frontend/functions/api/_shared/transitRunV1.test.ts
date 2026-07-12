import { readFile } from 'node:fs/promises';
import { load, type SwissEph } from '@fusionstrings/swiss-eph';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { calculateDadosPosicionaisV2, type DadosPosicionaisV2 } from './positionV2';
import { angularSeparationDeg } from './synastryRunV1';
import {
  calculateTransitRunV1,
  resolveTransitAspect,
  TRANSIT_ASPECT_PROFILE_V1,
  TRANSIT_RUN_SCHEMA_ID,
  TRANSIT_RUN_SCHEMA_VERSION,
  type TransitExactSearchQueryV1,
  type TransitRunV1,
  type TransitSnapshotProviderV1,
  type TransitSnapshotV1,
} from './transitRunV1';
import { isTransitRunV1, validateTransitRunV1 } from './transitRunV1Schema';

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;

const REFERENCE_INSTANT = '2026-07-12T15:00:00Z';
const PROBE_INSTANT = '2026-07-12T16:00:00Z';
const EXACT_INSTANT = '2026-07-13T03:00:00Z';
const NATAL_SOURCE_SHA256 = 'a'.repeat(64);
const PROVIDER_SOURCE_SHA256 = 'b'.repeat(64);

let natal: DadosPosicionaisV2;

beforeAll(async () => {
  const bytes = new Uint8Array(
    await readFile(new URL('../../../node_modules/@fusionstrings/swiss-eph/wasm/swiss-eph-wasi.wasm', import.meta.url)),
  );
  const swiss: SwissEph = await load(bytes);
  natal = calculateDadosPosicionaisV2(
    {
      calculationId: '00000000-0000-4000-8000-0000000000c3',
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

const longitudeForNatalBody = (bodyId: string): number => {
  const position = natal.positions.find((candidate) => candidate.bodyId === bodyId);
  if (!position) throw new Error(`Fixture sem ${bodyId}.`);
  return position.coordinates.eclipticLongitudeDeg;
};

const snapshot = (instantUtc: string, offsets: Partial<Record<string, number>> = {}): TransitSnapshotV1 => ({
  instantUtc,
  positions: natal.targetSet.orderedIds.map((bodyId, index) => ({
    bodyId,
    eclipticLongitudeDeg: (longitudeForNatalBody(bodyId) + (offsets[bodyId] ?? 37 + index * 7) + 360) % 360,
    astronomicalReal: {
      status: 'available',
      coordinates: {
        rightAscensionHours: (index * 2 + 1) % 24,
        declinationDeg: index - 5,
        referenceFrame: 'equatorial-j2000',
      },
      constellation: { iauCode: 'Ari', latinName: 'Aries', namePtBr: 'Áries' },
      degreeWithinConstellation: {
        status: 'not-defined',
        reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS',
      },
    },
  })),
});

const createProvider = (
  options: {
    referenceOffsets?: Partial<Record<string, number>>;
    probeOffsets?: Partial<Record<string, number>>;
    exactOffsets?: Partial<Record<string, number>>;
    search?: (
      query: TransitExactSearchQueryV1,
    ) => ReturnType<NonNullable<TransitSnapshotProviderV1['searchExactAspect']>>;
    probeInstantUtc?: string;
    sourceSha256?: string;
  } = {},
): TransitSnapshotProviderV1 => {
  const reference = snapshot(REFERENCE_INSTANT, options.referenceOffsets);
  const probe = snapshot(options.probeInstantUtc ?? PROBE_INSTANT, options.probeOffsets);
  const exact = snapshot(EXACT_INSTANT, options.exactOffsets);
  return {
    provenance: {
      providerId: 'deterministic-transit-fixture',
      providerVersion: '1.0.0',
      engineId: 'fixture-engine',
      engineVersion: '1.0.0',
      sourceRef: 'fixture://transit-engine-v1',
      sourceSha256: options.sourceSha256 ?? PROVIDER_SOURCE_SHA256,
      observerOrigin: 'geocentric',
      apparentOrAstrometric: 'apparent',
      eclipticReference: 'true-ecliptic-of-date',
      equatorialReference: 'equator-j2000',
    },
    getSnapshot: vi.fn((instantUtc: string) => {
      if (instantUtc === REFERENCE_INSTANT) return structuredClone(reference);
      if (instantUtc === EXACT_INSTANT) return structuredClone(exact);
      throw new Error(`Snapshot inesperado: ${instantUtc}`);
    }),
    getPhaseProbeSnapshot: vi.fn(() => structuredClone(probe)),
    ...(options.search ? { searchExactAspect: vi.fn(options.search) } : {}),
  };
};

const calculate = (provider: TransitSnapshotProviderV1, horizonDays = 7): TransitRunV1 =>
  calculateTransitRunV1({
    natal,
    natalSourceRef: `bigdata://astrologo_mapas/${natal.calculationId}/dados_posicionais_v2`,
    natalSourceSha256: NATAL_SOURCE_SHA256,
    referenceInstantUtc: REFERENCE_INSTANT,
    horizonDays,
    provider,
  });

const findAspect = (run: TransitRunV1, transitBodyId: string, natalPointId: string) =>
  run.aspects.find(
    ({ transitPoint, natalPoint }) => transitPoint.bodyId === transitBodyId && natalPoint.pointId === natalPointId,
  );

describe('perfil próprio dos trânsitos', () => {
  it('publica somente cinco aspectos, orbe fixo inclusivo de 2° e nenhuma modificação por corpo', () => {
    expect(TRANSIT_ASPECT_PROFILE_V1).toMatchObject({
      profileId: 'astrologo-transit-major-v1',
      profileVersion: '1.0.0',
      orbPolicy: 'fixed-2deg-no-body-modifiers',
      orbBoundaryConvention: 'inclusive',
    });
    expect(TRANSIT_ASPECT_PROFILE_V1.aspectDefinitions.map(({ aspectId }) => aspectId)).toEqual([
      'conjunction',
      'sextile',
      'square',
      'trine',
      'opposition',
    ]);
    expect(TRANSIT_ASPECT_PROFILE_V1.aspectDefinitions.every(({ allowedOrbDeg }) => allowedOrbDeg === 2)).toBe(true);
  });

  it('inclui as duas fronteiras do orbe e rejeita o valor imediatamente exterior', () => {
    expect(resolveTransitAspect(58)).toMatchObject({ aspectId: 'sextile', orbDeg: 2 });
    expect(resolveTransitAspect(62)).toMatchObject({ aspectId: 'sextile', orbDeg: 2 });
    expect(resolveTransitAspect(57.999_999)).toBeNull();
    expect(resolveTransitAspect(62.000_001)).toBeNull();
  });
});

describe('TransitRunV1', () => {
  it('calcula dez posições contra dez planetas mais ASC/MC, casas natais e fases pelo probe posterior', () => {
    const provider = createProvider({
      referenceOffsets: { sun: 1.5, moon: 90, mercury: 1 },
      probeOffsets: { sun: 1, moon: 91, mercury: 1.5 },
      exactOffsets: { sun: 0 },
      search: (query) =>
        query.transitBodyId === 'sun' && query.natalPointId === 'sun'
          ? { status: 'found', exactAtUtc: EXACT_INSTANT }
          : { status: 'not-found', reasonCode: 'NO_EXACTITUDE_WITHIN_HORIZON' },
    });
    const run = calculate(provider);

    expect(run.schemaId).toBe(TRANSIT_RUN_SCHEMA_ID);
    expect(run.schemaVersion).toBe(TRANSIT_RUN_SCHEMA_VERSION);
    expect(run.positionsAtReference).toHaveLength(10);
    expect(run.targetSet).toMatchObject({ transitBodyCount: 10, natalPointCount: 12 });
    expect(
      run.positionsAtReference.every(({ natalHousePlacement }) => natalHousePlacement.status === 'available'),
    ).toBe(true);
    expect(findAspect(run, 'sun', 'sun')?.phase).toMatchObject({ status: 'available', phase: 'applying' });
    expect(findAspect(run, 'moon', 'moon')?.phase).toMatchObject({ status: 'available', phase: 'exact' });
    expect(findAspect(run, 'mercury', 'mercury')?.phase).toMatchObject({ status: 'available', phase: 'separating' });
    expect(findAspect(run, 'sun', 'sun')?.exactitude).toMatchObject({
      status: 'available',
      exactAtUtc: EXACT_INSTANT,
      proof: { method: 'provider-search-and-snapshot-verification' },
    });
    expect(findAspect(run, 'moon', 'moon')?.exactitude).toMatchObject({
      status: 'available',
      exactAtUtc: REFERENCE_INSTANT,
      proof: { method: 'reference-snapshot-verification' },
    });
    expect(findAspect(run, 'mercury', 'mercury')?.exactitude).toMatchObject({
      status: 'unavailable',
      reasonCode: 'NO_EXACTITUDE_WITHIN_HORIZON',
    });
    expect(run.source.natal.payloadSha256).toBe(NATAL_SOURCE_SHA256);
    expect(run.models.transitProvider.sourceSha256).toBe(PROVIDER_SOURCE_SHA256);
    expect(run.models.astronomicalReal).toMatchObject({
      methodId: 'iau-roman-1987-b1875-consensus-v1',
      classificationEpoch: 'B1875',
      boundaryGuardArcminutes: 20,
      coordinateInput: 'geocentric-apparent-equatorial-j2000',
    });
    expect(run.positionsAtReference[0]?.astronomicalReal).toMatchObject({
      status: 'available',
      constellation: { iauCode: 'Ari', namePtBr: 'Áries' },
      degreeWithinConstellation: { status: 'not-defined', reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS' },
    });
    expect(JSON.stringify(run.positionsAtReference)).not.toMatch(/degreeWithinConstellationDeg/);
    expect(run.presentationPolicy).toMatchObject({ locale: 'pt-BR', timeZone: 'America/Sao_Paulo' });
    expect(validateTransitRunV1(run)).toEqual({ valid: true, value: run });
  });

  it('preserva indisponibilidade junto à fronteira IAU e exige o diagnóstico correspondente', () => {
    const provider = createProvider();
    const originalGetSnapshot = provider.getSnapshot;
    const boundaryProvider: TransitSnapshotProviderV1 = {
      ...provider,
      getSnapshot: vi.fn((instantUtc: string) => {
        const value = structuredClone(originalGetSnapshot(instantUtc)) as Mutable<TransitSnapshotV1>;
        if (instantUtc === REFERENCE_INSTANT && value.positions[0]) {
          value.positions[0].astronomicalReal = {
            status: 'unavailable',
            reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN',
            coordinates: {
              rightAscensionHours: 1.762,
              declinationDeg: -30,
              referenceFrame: 'equatorial-j2000',
            },
            degreeWithinConstellation: {
              status: 'not-defined',
              reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS',
            },
          };
        }
        return value;
      }),
    };
    const run = calculate(boundaryProvider);
    expect(run.positionsAtReference[0]?.astronomicalReal).toMatchObject({
      status: 'unavailable',
      reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN',
    });
    expect(run.diagnostics).toContainEqual({
      severity: 'warning',
      code: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN',
    });
    expect(validateTransitRunV1(run)).toEqual({ valid: true, value: run });
  });

  it('trata o wrap 359°↔1° como conjunção exata na fronteira de 2°', () => {
    const separationDeg = angularSeparationDeg(359, 1);
    expect(separationDeg).toBe(2);
    expect(resolveTransitAspect(separationDeg)).toMatchObject({ aspectId: 'conjunction', orbDeg: 2 });
  });

  it('não consulta aperfeiçoamento com horizonte zero e nunca fabrica exactAtUtc', () => {
    const search = vi.fn(() => ({ status: 'found' as const, exactAtUtc: EXACT_INSTANT }));
    const provider = createProvider({
      referenceOffsets: { sun: 1 },
      probeOffsets: { sun: 0.5 },
      search,
    });
    const run = calculate(provider, 0);
    const aspect = findAspect(run, 'sun', 'sun');
    expect(search).not.toHaveBeenCalled();
    expect(aspect?.exactitude).toEqual({ status: 'unavailable', reasonCode: 'HORIZON_ZERO_NO_SEARCH' });
    expect(JSON.stringify(aspect)).not.toContain('exactAtUtc');
  });

  it('rejeita como não comprovados resultados fora do horizonte ou sem exatidão no snapshot', () => {
    const outsideProvider = createProvider({
      referenceOffsets: { sun: 1 },
      probeOffsets: { sun: 0.5 },
      search: () => ({ status: 'found', exactAtUtc: '2026-08-20T00:00:00Z' }),
    });
    expect(findAspect(calculate(outsideProvider, 1), 'sun', 'sun')?.exactitude).toEqual({
      status: 'unavailable',
      reasonCode: 'PROVIDER_RESULT_OUTSIDE_HORIZON',
    });

    const unprovenProvider = createProvider({
      referenceOffsets: { sun: 1 },
      probeOffsets: { sun: 0.5 },
      exactOffsets: { sun: 0.01 },
      search: () => ({ status: 'found', exactAtUtc: EXACT_INSTANT }),
    });
    expect(findAspect(calculate(unprovenProvider, 1), 'sun', 'sun')?.exactitude).toEqual({
      status: 'unavailable',
      reasonCode: 'PROVIDER_RESULT_NOT_EXACT',
    });
  });

  it('expõe indisponibilidade de busca e fase sem inventar resultados', () => {
    const provider = createProvider({
      referenceOffsets: { sun: 1 },
      probeOffsets: { sun: 1 },
    });
    const run = calculate(provider);
    expect(findAspect(run, 'sun', 'sun')?.phase).toEqual({
      status: 'unavailable',
      reasonCode: 'PHASE_UNDETERMINED_FROM_PROBE',
      probeInstantUtc: PROBE_INSTANT,
    });
    expect(findAspect(run, 'sun', 'sun')?.exactitude).toEqual({
      status: 'unavailable',
      reasonCode: 'EXACT_SEARCH_UNAVAILABLE',
    });
    expect(run.diagnostics).toEqual([
      { severity: 'warning', code: 'PHASE_UNDETERMINED_FROM_PROBE' },
      { severity: 'info', code: 'EXACT_SEARCH_UNAVAILABLE' },
    ]);
  });

  it('preserva os trânsitos e sinaliza todas as casas quando Placidus natal está indisponível', () => {
    const natalWithoutHouses = structuredClone(natal) as Mutable<DadosPosicionaisV2>;
    natalWithoutHouses.houses = { systemId: 'placidus', status: 'unavailable', reasonCode: 'PLACIDUS_UNAVAILABLE' };
    natalWithoutHouses.angles = [];
    for (const position of natalWithoutHouses.positions) {
      position.housePlacement = {
        status: 'unavailable',
        basis: 'swiss-swe-house-pos',
        reasonCode: 'PLACIDUS_UNAVAILABLE',
      };
    }
    const provider = createProvider();
    const run = calculateTransitRunV1({
      natal: natalWithoutHouses as DadosPosicionaisV2,
      natalSourceRef: 'fixture://natal-without-houses',
      natalSourceSha256: NATAL_SOURCE_SHA256,
      referenceInstantUtc: REFERENCE_INSTANT,
      horizonDays: 7,
      provider,
    });
    expect(run.positionsAtReference).toHaveLength(10);
    expect(
      run.positionsAtReference.every(({ natalHousePlacement }) => natalHousePlacement.status === 'unavailable'),
    ).toBe(true);
    expect(run.diagnostics).toContainEqual({ severity: 'warning', code: 'NATAL_PLACIDUS_UNAVAILABLE' });
  });

  it('valida horizonte, instantes, hashes e snapshot posterior antes do cálculo', () => {
    const provider = createProvider({ referenceOffsets: { sun: 1 }, probeOffsets: { sun: 0.5 } });
    expect(() => calculate(provider, -1)).toThrow(/horizonte/i);
    expect(() => calculate(provider, 31)).toThrow(/horizonte/i);
    expect(() =>
      calculateTransitRunV1({
        natal,
        natalSourceRef: 'fixture://natal',
        natalSourceSha256: 'não-é-sha',
        referenceInstantUtc: REFERENCE_INSTANT,
        horizonDays: 1,
        provider,
      }),
    ).toThrow(/sha-256/i);
    expect(() => calculate(createProvider({ probeInstantUtc: REFERENCE_INSTANT }))).toThrow(/posterior/i);
    expect(() => calculate(createProvider({ sourceSha256: 'c'.repeat(63) }))).toThrow(/sha-256/i);
  });

  it('é determinístico, não modifica entradas e o validador rejeita extras e invariantes adulterados', () => {
    const provider = createProvider({
      referenceOffsets: { sun: 1 },
      probeOffsets: { sun: 0.5 },
      search: () => ({ status: 'not-found', reasonCode: 'NO_EXACTITUDE_WITHIN_HORIZON' }),
    });
    const natalBefore = structuredClone(natal);
    const first = calculate(provider);
    const second = calculate(provider);
    expect(second).toEqual(first);
    expect(natal).toEqual(natalBefore);
    expect(isTransitRunV1({ ...first, extra: true })).toBe(false);

    const invalid = structuredClone(first) as unknown as Mutable<TransitRunV1>;
    invalid.aspects[0]!.orbDeg += 0.25;
    expect(validateTransitRunV1(invalid).valid).toBe(false);

    const duplicate = structuredClone(first) as unknown as Mutable<TransitRunV1>;
    duplicate.positionsAtReference[1] = structuredClone(duplicate.positionsAtReference[0]!);
    expect(validateTransitRunV1(duplicate).valid).toBe(false);

    const inventedConstellationDegree = structuredClone(first) as unknown as Mutable<TransitRunV1>;
    const astronomicalReal = inventedConstellationDegree.positionsAtReference[0]?.astronomicalReal as unknown as
      | Record<string, unknown>
      | undefined;
    if (!astronomicalReal) throw new Error('Fixture sem projeção astronômica.');
    astronomicalReal.degreeWithinConstellationDeg = 12.5;
    expect(validateTransitRunV1(inventedConstellationDegree).valid).toBe(false);

    const alteredIauModel = structuredClone(first) as unknown as Mutable<TransitRunV1>;
    (alteredIauModel.models.astronomicalReal as unknown as Record<string, unknown>).boundaryGuardArcminutes = 0;
    expect(validateTransitRunV1(alteredIauModel).valid).toBe(false);

    const missingAspect = structuredClone(first) as unknown as Mutable<TransitRunV1>;
    missingAspect.aspects.splice(0, 1);
    expect(validateTransitRunV1(missingAspect).valid).toBe(false);
  });
});
