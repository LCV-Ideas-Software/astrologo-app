import {
  type DadosPosicionaisV2,
  normalizeLongitude,
  type PlanetBodyId,
  POSITIONAL_SCHEMA_ID,
  POSITIONAL_SCHEMA_VERSION,
} from './positionV2';
import { validateDadosPosicionaisV2 } from './positionV2Schema';

export const SYNASTRY_RUN_SCHEMA_ID = 'urn:astrologo:synastry-run' as const;
export const SYNASTRY_RUN_SCHEMA_VERSION = '1.0.0' as const;
export const SYNASTRY_TARGET_SET_ID = 'hermetic-planets-10-cross-chart-v1' as const;

export const SYNASTRY_PLANET_BODY_IDS = [
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
] as const satisfies readonly PlanetBodyId[];

export type SynastryChartRef = 'A' | 'B';
export type SynastryAspectId = 'conjunction' | 'sextile' | 'square' | 'trine' | 'quincunx' | 'opposition';

export interface SynastryAspectDefinitionV1 {
  readonly aspectId: SynastryAspectId;
  readonly displayNamePtBr: string;
  readonly exactAngleDeg: number;
  readonly allowedOrbDeg: number;
}

const SYNASTRY_ASPECT_DEFINITIONS = [
  { aspectId: 'conjunction', displayNamePtBr: 'Conjunção', exactAngleDeg: 0, allowedOrbDeg: 8 },
  { aspectId: 'sextile', displayNamePtBr: 'Sextil', exactAngleDeg: 60, allowedOrbDeg: 4 },
  { aspectId: 'square', displayNamePtBr: 'Quadratura', exactAngleDeg: 90, allowedOrbDeg: 8 },
  { aspectId: 'trine', displayNamePtBr: 'Trígono', exactAngleDeg: 120, allowedOrbDeg: 8 },
  { aspectId: 'quincunx', displayNamePtBr: 'Quincúncio', exactAngleDeg: 150, allowedOrbDeg: 4 },
  { aspectId: 'opposition', displayNamePtBr: 'Oposição', exactAngleDeg: 180, allowedOrbDeg: 8 },
] as const satisfies readonly SynastryAspectDefinitionV1[];

/**
 * This profile is intentionally independent from every natal/transit profile.
 * A future policy change must receive a new profileId/profileVersion instead of
 * silently changing a historical run.
 */
export const SYNASTRY_ASPECT_PROFILE_V1 = Object.freeze({
  profileId: 'astrologo-synastry-major-v1' as const,
  profileVersion: '1.0.0' as const,
  orbPolicy: 'fixed-by-aspect-no-body-modifiers' as const,
  orbBoundaryConvention: 'inclusive' as const,
  separationMethod: 'smallest-angular-distance-0-to-180' as const,
  pairPolicy: 'all-chart-a-planets-to-all-chart-b-planets' as const,
  applyingSeparatingPolicy: 'not-calculated-without-longitudinal-velocities' as const,
  exactToleranceDeg: 1e-9 as const,
  aspectDefinitions: SYNASTRY_ASPECT_DEFINITIONS,
});

export interface ResolvedSynastryAspectV1 extends SynastryAspectDefinitionV1 {
  readonly orbDeg: number;
}

export interface SynastryChartReferenceV1 {
  readonly schemaId: typeof POSITIONAL_SCHEMA_ID;
  readonly schemaVersion: typeof POSITIONAL_SCHEMA_VERSION;
  readonly calculationId: string;
  readonly calculatedAtUtc: string;
  readonly birthInstantUtc: string;
}

export interface SynastryPointReferenceV1 {
  readonly chartRef: SynastryChartRef;
  readonly bodyId: PlanetBodyId;
}

export interface SynastryInterchartAspectV1 {
  readonly recordId: string;
  readonly pointA: SynastryPointReferenceV1 & { readonly chartRef: 'A' };
  readonly pointB: SynastryPointReferenceV1 & { readonly chartRef: 'B' };
  readonly aspectId: SynastryAspectId;
  readonly displayNamePtBr: string;
  readonly separationDeg: number;
  readonly exactAngleDeg: number;
  readonly allowedOrbDeg: number;
  readonly orbDeg: number;
}

export type SynastryHousePlacementV1 =
  | {
      readonly status: 'available';
      readonly houseIndex1: number;
      readonly basis: 'recipient-placidus-cusps-ecliptic-longitude';
      readonly intervalConvention: '[cusp,next-cusp)';
    }
  | {
      readonly status: 'unavailable';
      readonly reasonCode: 'PLACIDUS_UNAVAILABLE';
      readonly basis: 'recipient-placidus-cusps-ecliptic-longitude';
    };

export interface SynastryHouseOverlayV1 {
  readonly direction: 'A-to-B' | 'B-to-A';
  readonly sourceChartRef: SynastryChartRef;
  readonly sourceBodyId: PlanetBodyId;
  readonly targetChartRef: SynastryChartRef;
  readonly placement: SynastryHousePlacementV1;
}

export interface SynastryRunV1 {
  readonly schemaId: typeof SYNASTRY_RUN_SCHEMA_ID;
  readonly schemaVersion: typeof SYNASTRY_RUN_SCHEMA_VERSION;
  readonly charts: {
    readonly A: SynastryChartReferenceV1;
    readonly B: SynastryChartReferenceV1;
  };
  readonly targetSet: {
    readonly id: typeof SYNASTRY_TARGET_SET_ID;
    readonly version: '1.0.0';
    readonly orderedBodyIds: typeof SYNASTRY_PLANET_BODY_IDS;
  };
  readonly presentationPolicy: {
    readonly locale: 'pt-BR';
    readonly timeZone: 'America/Sao_Paulo';
    readonly timeZoneLabel: 'Hora oficial de Brasília';
    readonly calendar: 'gregory';
    readonly numberingSystem: 'latn';
    readonly hourCycle: 'h23';
  };
  readonly models: {
    readonly aspects: typeof SYNASTRY_ASPECT_PROFILE_V1;
    readonly houseOverlays: {
      readonly systemId: 'placidus';
      readonly sourceCoordinate: 'geocentric-true-ecliptic-longitude-of-date';
      readonly recipientBoundarySource: 'dados-posicionais-v2-cusps';
      readonly intervalConvention: '[cusp,next-cusp)';
    };
  };
  readonly aspects: readonly SynastryInterchartAspectV1[];
  readonly houseOverlays: {
    readonly aToB: readonly SynastryHouseOverlayV1[];
    readonly bToA: readonly SynastryHouseOverlayV1[];
  };
  readonly diagnostics: readonly {
    readonly severity: 'warning';
    readonly code: 'CHART_A_PLACIDUS_UNAVAILABLE' | 'CHART_B_PLACIDUS_UNAVAILABLE';
  }[];
}

export interface HouseCuspLongitudeV1 {
  readonly houseIndex1: number;
  readonly eclipticLongitudeDeg: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertExactKeys = (value: Record<string, unknown>, allowed: readonly string[], context: string): void => {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected) throw new TypeError(`${context} contém a propriedade desconhecida ${unexpected}.`);
};

export function angularSeparationDeg(leftLongitudeDeg: number, rightLongitudeDeg: number): number {
  if (!Number.isFinite(leftLongitudeDeg) || !Number.isFinite(rightLongitudeDeg)) {
    throw new RangeError('As longitudes da sinastria devem ser finitas.');
  }
  const difference = Math.abs(normalizeLongitude(leftLongitudeDeg) - normalizeLongitude(rightLongitudeDeg));
  return Math.min(difference, 360 - difference);
}

export function resolveSynastryAspect(separationDeg: number): ResolvedSynastryAspectV1 | null {
  if (!Number.isFinite(separationDeg) || separationDeg < 0 || separationDeg > 180) {
    throw new RangeError('A separação angular da sinastria deve permanecer entre 0° e 180°.');
  }

  for (const definition of SYNASTRY_ASPECT_PROFILE_V1.aspectDefinitions) {
    const orbDeg = Math.abs(separationDeg - definition.exactAngleDeg);
    if (orbDeg <= definition.allowedOrbDeg + Number.EPSILON) return { ...definition, orbDeg };
  }
  return null;
}

const validateCanonicalCusps = (cusps: readonly unknown[]): readonly HouseCuspLongitudeV1[] => {
  if (cusps.length !== 12) throw new RangeError('As cúspides devem conter exatamente as 12 casas em ordem canônica.');

  const validated = cusps.map((candidate, index0): HouseCuspLongitudeV1 => {
    if (!isRecord(candidate)) throw new TypeError('Cada cúspide deve ser um objeto.');
    assertExactKeys(candidate, ['houseIndex1', 'eclipticLongitudeDeg'], `A cúspide ${index0 + 1}`);
    if (candidate.houseIndex1 !== index0 + 1) {
      throw new RangeError('As cúspides devem permanecer na ordem canônica das casas 1 a 12.');
    }
    if (
      typeof candidate.eclipticLongitudeDeg !== 'number' ||
      !Number.isFinite(candidate.eclipticLongitudeDeg) ||
      candidate.eclipticLongitudeDeg < 0 ||
      candidate.eclipticLongitudeDeg >= 360
    ) {
      throw new RangeError(`A longitude da cúspide ${index0 + 1} deve estar em [0, 360).`);
    }
    return {
      houseIndex1: index0 + 1,
      eclipticLongitudeDeg: candidate.eclipticLongitudeDeg,
    };
  });

  let accumulatedArcDeg = 0;
  for (let index = 1; index < validated.length; index += 1) {
    const previous = validated[index - 1]!.eclipticLongitudeDeg;
    const current = validated[index]!.eclipticLongitudeDeg;
    const forwardArcDeg = normalizeLongitude(current - previous);
    if (forwardArcDeg <= 0) throw new RangeError('As cúspides devem avançar em ordem zodiacal sem duplicações.');
    accumulatedArcDeg += forwardArcDeg;
    if (accumulatedArcDeg >= 360) {
      throw new RangeError('As cúspides não estão na ordem zodiacal canônica em uma única volta.');
    }
  }

  const closingArcDeg = normalizeLongitude(
    validated[0]!.eclipticLongitudeDeg - validated[validated.length - 1]!.eclipticLongitudeDeg,
  );
  if (closingArcDeg <= 0 || Math.abs(accumulatedArcDeg + closingArcDeg - 360) > 1e-8) {
    throw new RangeError('As cúspides não fecham uma única volta zodiacal em ordem canônica.');
  }
  return validated;
};

export function houseIndexForLongitude(longitudeDeg: number, cusps: readonly unknown[]): number {
  if (!Number.isFinite(longitudeDeg)) throw new RangeError('A longitude da sobreposição deve ser finita.');
  const normalized = normalizeLongitude(longitudeDeg);
  const canonicalCusps = validateCanonicalCusps(cusps);

  for (let index0 = 0; index0 < canonicalCusps.length; index0 += 1) {
    const start = canonicalCusps[index0]!.eclipticLongitudeDeg;
    const end = canonicalCusps[(index0 + 1) % canonicalCusps.length]!.eclipticLongitudeDeg;
    const contains = start < end ? normalized >= start && normalized < end : normalized >= start || normalized < end;
    if (contains) return index0 + 1;
  }
  throw new Error('A longitude não foi coberta pelas 12 Casas Placidus.');
}

const chartReference = (source: DadosPosicionaisV2): SynastryChartReferenceV1 => ({
  schemaId: POSITIONAL_SCHEMA_ID,
  schemaVersion: POSITIONAL_SCHEMA_VERSION,
  calculationId: source.calculationId,
  calculatedAtUtc: source.calculatedAtUtc,
  birthInstantUtc: source.birthContext.timeResolution.instantUtc,
});

const calculateInterchartAspects = (
  chartA: DadosPosicionaisV2,
  chartB: DadosPosicionaisV2,
): readonly SynastryInterchartAspectV1[] => {
  const aspects: SynastryInterchartAspectV1[] = [];
  for (const positionA of chartA.positions) {
    for (const positionB of chartB.positions) {
      const separationDeg = angularSeparationDeg(
        positionA.coordinates.eclipticLongitudeDeg,
        positionB.coordinates.eclipticLongitudeDeg,
      );
      const aspect = resolveSynastryAspect(separationDeg);
      if (!aspect) continue;
      aspects.push({
        recordId: `A:${positionA.bodyId}|B:${positionB.bodyId}|${aspect.aspectId}`,
        pointA: { chartRef: 'A', bodyId: positionA.bodyId },
        pointB: { chartRef: 'B', bodyId: positionB.bodyId },
        aspectId: aspect.aspectId,
        displayNamePtBr: aspect.displayNamePtBr,
        separationDeg,
        exactAngleDeg: aspect.exactAngleDeg,
        allowedOrbDeg: aspect.allowedOrbDeg,
        orbDeg: aspect.orbDeg,
      });
    }
  }
  return aspects;
};

const calculateHouseOverlay = (
  source: DadosPosicionaisV2,
  sourceChartRef: SynastryChartRef,
  target: DadosPosicionaisV2,
  targetChartRef: SynastryChartRef,
): readonly SynastryHouseOverlayV1[] => {
  const direction = sourceChartRef === 'A' ? 'A-to-B' : 'B-to-A';
  const targetCusps =
    target.houses.status === 'available'
      ? target.houses.cusps.map(({ houseIndex1, eclipticLongitudeDeg }) => ({ houseIndex1, eclipticLongitudeDeg }))
      : null;

  return source.positions.map(
    ({ bodyId, coordinates }): SynastryHouseOverlayV1 => ({
      direction,
      sourceChartRef,
      sourceBodyId: bodyId,
      targetChartRef,
      placement: targetCusps
        ? {
            status: 'available',
            houseIndex1: houseIndexForLongitude(coordinates.eclipticLongitudeDeg, targetCusps),
            basis: 'recipient-placidus-cusps-ecliptic-longitude',
            intervalConvention: '[cusp,next-cusp)',
          }
        : {
            status: 'unavailable',
            reasonCode: 'PLACIDUS_UNAVAILABLE',
            basis: 'recipient-placidus-cusps-ecliptic-longitude',
          },
    }),
  );
};

export function calculateSynastryRunV1(chartA: DadosPosicionaisV2, chartB: DadosPosicionaisV2): SynastryRunV1 {
  const validationA = validateDadosPosicionaisV2(chartA);
  if (!validationA.valid) throw new TypeError('O mapa A não é um DadosPosicionaisV2 canônico válido.');
  const validationB = validateDadosPosicionaisV2(chartB);
  if (!validationB.valid) throw new TypeError('O mapa B não é um DadosPosicionaisV2 canônico válido.');

  const aToB = calculateHouseOverlay(chartA, 'A', chartB, 'B');
  const bToA = calculateHouseOverlay(chartB, 'B', chartA, 'A');
  const diagnostics: SynastryRunV1['diagnostics'][number][] = [];
  if (chartA.houses.status === 'unavailable') {
    diagnostics.push({ severity: 'warning', code: 'CHART_A_PLACIDUS_UNAVAILABLE' });
  }
  if (chartB.houses.status === 'unavailable') {
    diagnostics.push({ severity: 'warning', code: 'CHART_B_PLACIDUS_UNAVAILABLE' });
  }

  return {
    schemaId: SYNASTRY_RUN_SCHEMA_ID,
    schemaVersion: SYNASTRY_RUN_SCHEMA_VERSION,
    charts: { A: chartReference(chartA), B: chartReference(chartB) },
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
    aspects: calculateInterchartAspects(chartA, chartB),
    houseOverlays: { aToB, bToA },
    diagnostics,
  };
}
