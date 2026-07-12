import {
  type DadosPosicionaisV2,
  normalizeLongitude,
  type PlanetBodyId,
  type POSITIONAL_SCHEMA_ID,
  type POSITIONAL_SCHEMA_VERSION,
  type SwissEphemerisLike,
} from './positionV2';
import { validateDadosPosicionaisV2 } from './positionV2Schema';

export const NATAL_CHART_ANALYSIS_SCHEMA_ID = 'urn:astrologo:natal-chart-analysis' as const;
export const NATAL_CHART_ANALYSIS_SCHEMA_VERSION = '1.0.0' as const;
export const NATAL_CHART_ANALYSIS_TARGET_SET_ID = 'hermetic-planets-10-plus-asc-mc-v1' as const;

const PLANET_BODY_IDS = [
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

const SWISS_BODY_IDS: Readonly<Record<PlanetBodyId, number>> = Object.freeze({
  sun: 0,
  moon: 1,
  mercury: 2,
  venus: 3,
  mars: 4,
  jupiter: 5,
  saturn: 6,
  uranus: 7,
  neptune: 8,
  pluto: 9,
});

const SWISS_ECLIPTIC_NUTATION_BODY_ID = -1;
const SWISS_FLAG_MOSHIER = 4;
const SWISS_FLAG_SPEED = 256;
const SWISS_HOUSE_SYSTEM_PLACIDUS = 'P'.charCodeAt(0);

export type NatalAngleId = 'ascendant' | 'midheaven';
export type NatalChartPointId = PlanetBodyId | NatalAngleId;
export type NatalAspectId = 'conjunction' | 'sextile' | 'square' | 'trine' | 'quincunx' | 'opposition';

export interface NatalAspectDefinition {
  readonly aspectId: NatalAspectId;
  readonly displayNamePtBr: string;
  readonly exactAngleDeg: number;
  readonly allowedOrbDeg: number;
}

export interface NatalChartAspectProfile {
  readonly profileId: 'astrologo-natal-major-v1';
  readonly profileVersion: '1.0.0';
  readonly orbPolicy: 'fixed-by-aspect-no-body-modifiers';
  readonly orbBoundaryConvention: 'inclusive';
  readonly separationMethod: 'smallest-angular-distance-0-to-180';
  readonly pairPolicy: 'planet-to-planet-and-planet-to-asc-mc';
  readonly intensityModel: 'linear-from-exact-to-orb-boundary-v1';
  readonly applyingSeparatingMethod: 'explicit-longitudinal-velocity-derivative-v1';
  readonly exactToleranceDeg: 1e-9;
  readonly aspectDefinitions: readonly NatalAspectDefinition[];
}

const ASPECT_DEFINITION_VALUES = [
  { aspectId: 'conjunction', displayNamePtBr: 'Conjunção', exactAngleDeg: 0, allowedOrbDeg: 8 },
  { aspectId: 'sextile', displayNamePtBr: 'Sextil', exactAngleDeg: 60, allowedOrbDeg: 4 },
  { aspectId: 'square', displayNamePtBr: 'Quadratura', exactAngleDeg: 90, allowedOrbDeg: 8 },
  { aspectId: 'trine', displayNamePtBr: 'Trígono', exactAngleDeg: 120, allowedOrbDeg: 8 },
  { aspectId: 'quincunx', displayNamePtBr: 'Quincúncio', exactAngleDeg: 150, allowedOrbDeg: 4 },
  { aspectId: 'opposition', displayNamePtBr: 'Oposição', exactAngleDeg: 180, allowedOrbDeg: 8 },
] as const satisfies readonly NatalAspectDefinition[];

const ASPECT_DEFINITIONS: readonly NatalAspectDefinition[] = Object.freeze(
  ASPECT_DEFINITION_VALUES.map((definition) => Object.freeze({ ...definition })),
);

export const NATAL_CHART_ASPECT_PROFILE: NatalChartAspectProfile = Object.freeze({
  profileId: 'astrologo-natal-major-v1' as const,
  profileVersion: '1.0.0' as const,
  orbPolicy: 'fixed-by-aspect-no-body-modifiers' as const,
  orbBoundaryConvention: 'inclusive' as const,
  separationMethod: 'smallest-angular-distance-0-to-180' as const,
  pairPolicy: 'planet-to-planet-and-planet-to-asc-mc' as const,
  intensityModel: 'linear-from-exact-to-orb-boundary-v1' as const,
  applyingSeparatingMethod: 'explicit-longitudinal-velocity-derivative-v1' as const,
  exactToleranceDeg: 1e-9 as const,
  aspectDefinitions: ASPECT_DEFINITIONS,
});

export interface NatalChartPoint {
  readonly kind: 'planet' | 'angle';
  readonly id: NatalChartPointId;
  readonly displayNamePtBr: string;
  readonly symbol: string;
  readonly eclipticLongitudeDeg: number;
}

export interface NatalChartPointReference {
  readonly kind: 'planet' | 'angle';
  readonly id: NatalChartPointId;
}

export type PlanetMovementV1 =
  | {
      readonly bodyId: PlanetBodyId;
      readonly status: 'available';
      readonly velocityDegPerDay: number;
      readonly direction: 'direct' | 'retrograde' | 'stationary';
      readonly basis: 'explicit-ecliptic-longitude-velocity';
    }
  | {
      readonly bodyId: PlanetBodyId;
      readonly status: 'unavailable';
      readonly reasonCode: 'LONGITUDINAL_VELOCITY_NOT_PROVIDED';
      readonly basis: 'explicit-ecliptic-longitude-velocity';
    };

export type AspectPhaseV1 =
  | {
      readonly status: 'available';
      readonly phase: 'applying' | 'exact' | 'separating';
      readonly basis: 'exact-angle-tolerance' | 'explicit-longitudinal-velocities';
    }
  | {
      readonly status: 'unavailable';
      readonly reasonCode:
        | 'LONGITUDINAL_VELOCITY_NOT_PROVIDED'
        | 'ANGLE_VELOCITY_NOT_PROVIDED'
        | 'RELATIVE_LONGITUDINAL_VELOCITY_ZERO';
      readonly basis: 'not-calculated';
    };

export interface NatalAspectV1 {
  readonly recordId: string;
  readonly pointA: NatalChartPointReference;
  readonly pointB: NatalChartPointReference;
  readonly aspectId: NatalAspectId;
  readonly displayNamePtBr: string;
  readonly separationDeg: number;
  readonly exactAngleDeg: number;
  readonly allowedOrbDeg: number;
  readonly orbDeg: number;
  readonly intensityPercent: number;
  readonly phase: AspectPhaseV1;
}

export interface HouseOccupancyV1 {
  readonly bodyId: PlanetBodyId;
  readonly occupancy:
    | {
        readonly status: 'available';
        readonly houseIndex1: number;
        readonly basis: 'dados-posicionais-v2-house-placement';
      }
    | {
        readonly status: 'unavailable';
        readonly reasonCode: 'PLACIDUS_UNAVAILABLE' | 'HOUSE_POSITION_UNAVAILABLE';
        readonly basis: 'dados-posicionais-v2-house-placement';
      };
  readonly mundaneDegreeWithinHouse:
    | {
        readonly status: 'available';
        readonly rawSwissHousePosition: number;
        readonly degreeWithinHouseDeg: number;
        readonly mundaneLongitudeDeg: number;
        readonly coordinateSystem: 'placidus-house-horoscope';
        readonly degreeSemantics: 'normalized-semiarc-house-degree';
        readonly basis: 'explicit-swiss-swe-house-pos';
      }
    | {
        readonly status: 'unavailable';
        readonly reasonCode:
          | 'POSITION_V2_0_DOES_NOT_EXPOSE_MUNDANE_DEGREE'
          | 'PLACIDUS_UNAVAILABLE'
          | 'HOUSE_POSITION_UNAVAILABLE';
        readonly basis: 'explicit-swiss-swe-house-pos';
      };
}

export interface NatalChartAnalysisV1 {
  readonly schemaId: typeof NATAL_CHART_ANALYSIS_SCHEMA_ID;
  readonly schemaVersion: typeof NATAL_CHART_ANALYSIS_SCHEMA_VERSION;
  readonly source: {
    readonly schemaId: typeof POSITIONAL_SCHEMA_ID;
    readonly schemaVersion: typeof POSITIONAL_SCHEMA_VERSION;
    readonly calculationId: string;
    readonly calculatedAtUtc: string;
  };
  readonly targetSet: {
    readonly id: typeof NATAL_CHART_ANALYSIS_TARGET_SET_ID;
    readonly version: '1.0.0';
  };
  readonly presentationPolicy: DadosPosicionaisV2['presentationPolicy'];
  readonly models: {
    readonly aspects: NatalChartAspectProfile;
    readonly houses: {
      readonly systemId: 'placidus';
      readonly occupancyBasis: 'dados-posicionais-v2-house-placement';
      readonly mundaneDegreeBasis: 'swiss-swe-house-pos-fraction-times-30';
    };
  };
  readonly points: readonly NatalChartPoint[];
  readonly movements: readonly PlanetMovementV1[];
  readonly aspects: readonly NatalAspectV1[];
  readonly houseOccupancies: readonly HouseOccupancyV1[];
  readonly diagnostics: readonly {
    readonly severity: 'info' | 'warning';
    readonly code:
      | 'LONGITUDINAL_VELOCITIES_NOT_PROVIDED'
      | 'LONGITUDINAL_VELOCITIES_PARTIAL'
      | 'RAW_SWISS_HOUSE_POSITIONS_NOT_PROVIDED'
      | 'RAW_SWISS_HOUSE_POSITIONS_PARTIAL'
      | 'PLACIDUS_UNAVAILABLE';
  }[];
}

export interface NatalChartAnalysisV1Supplement {
  readonly longitudinalVelocities?: readonly {
    readonly bodyId: PlanetBodyId;
    readonly velocityDegPerDay: number;
  }[];
  readonly rawSwissHousePositions?: readonly {
    readonly bodyId: PlanetBodyId;
    readonly rawSwissHousePosition: number;
  }[];
}

/**
 * Recupera somente dados que o contrato posicional 2.0.0 deliberadamente não
 * persiste. Nenhum valor é aproximado por arco entre cúspides: o grau mundano
 * nasce exclusivamente do hpos fracionário retornado por swe_house_pos.
 */
export function calculateNatalChartAnalysisSupplementV1(
  source: DadosPosicionaisV2,
  swiss: SwissEphemerisLike,
): NatalChartAnalysisV1Supplement {
  const sourceValidation = validateDadosPosicionaisV2(source);
  if (!sourceValidation.valid) throw new TypeError('O suplemento exige DadosPosicionaisV2 canônico válido.');
  if (swiss.swe_version() !== source.models.houses.engineVersion) {
    throw new Error(`Versão Swiss Ephemeris incompatível com o mapa: ${swiss.swe_version()}.`);
  }

  const instant = new Date(source.birthContext.timeResolution.instantUtc);
  if (Number.isNaN(instant.getTime())) throw new RangeError('O instante natal canônico é inválido.');
  const julianDayUt = instant.getTime() / 86_400_000 + 2_440_587.5;

  const longitudinalVelocities: NonNullable<NatalChartAnalysisV1Supplement['longitudinalVelocities']>[number][] = [];
  for (const bodyId of PLANET_BODY_IDS) {
    const result = swiss.swe_calc_ut(julianDayUt, SWISS_BODY_IDS[bodyId], SWISS_FLAG_MOSHIER | SWISS_FLAG_SPEED);
    const velocityDegPerDay = result.xx[3];
    if (result.returnCode >= 0 && Number.isFinite(velocityDegPerDay)) {
      longitudinalVelocities.push({ bodyId, velocityDegPerDay: velocityDegPerDay ?? 0 });
    }
  }

  const rawSwissHousePositions: NonNullable<NatalChartAnalysisV1Supplement['rawSwissHousePositions']>[number][] = [];
  if (source.houses.status === 'available') {
    const place = source.birthContext.place;
    const houseResult = swiss.swe_houses(
      julianDayUt,
      place.latitudeDeg,
      place.longitudeDeg,
      SWISS_HOUSE_SYSTEM_PLACIDUS,
    );
    const nutation = swiss.swe_calc_ut(julianDayUt, SWISS_ECLIPTIC_NUTATION_BODY_ID, SWISS_FLAG_MOSHIER);
    const armc = houseResult.ascmc[2];
    const obliquityDeg = nutation.xx[0];
    const canCalculateHousePositions =
      houseResult.returnCode >= 0 && nutation.returnCode >= 0 && Number.isFinite(armc) && Number.isFinite(obliquityDeg);

    if (canCalculateHousePositions) {
      for (const position of source.positions) {
        if (position.housePlacement.status !== 'available') continue;
        const result = swiss.swe_house_pos(
          armc ?? Number.NaN,
          place.latitudeDeg,
          obliquityDeg ?? Number.NaN,
          SWISS_HOUSE_SYSTEM_PLACIDUS,
          [position.coordinates.eclipticLongitudeDeg, position.coordinates.eclipticLatitudeDeg],
        );
        if (
          !result.error &&
          Number.isFinite(result.position) &&
          result.position >= 1 &&
          result.position < 13 &&
          Math.floor(result.position) === position.housePlacement.houseIndex1
        ) {
          rawSwissHousePositions.push({ bodyId: position.bodyId, rawSwissHousePosition: result.position });
        }
      }
    }
  }

  return { longitudinalVelocities, rawSwissHousePositions };
}

export interface ResolvedNatalMajorAspect extends NatalAspectDefinition {
  readonly orbDeg: number;
  readonly intensityPercent: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertExactKeys = (value: Record<string, unknown>, allowed: readonly string[], context: string): void => {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected) throw new TypeError(`${context} contém a propriedade desconhecida ${unexpected}.`);
};

const isPlanetBodyId = (value: unknown): value is PlanetBodyId =>
  typeof value === 'string' && (PLANET_BODY_IDS as readonly string[]).includes(value);

const makeSupplementMap = <Value>(
  entries: readonly unknown[] | undefined,
  valueKey: string,
  context: string,
  mapValue: (entry: Readonly<Record<string, unknown>>) => Value,
): Map<PlanetBodyId, Value> => {
  const result = new Map<PlanetBodyId, Value>();
  for (const entry of entries ?? []) {
    if (!isRecord(entry)) throw new TypeError(`${context} deve conter somente objetos.`);
    assertExactKeys(entry, ['bodyId', valueKey], context);
    if (!isPlanetBodyId(entry.bodyId)) throw new TypeError(`${context} contém um corpo desconhecido.`);
    if (result.has(entry.bodyId)) throw new TypeError(`${context} contém o corpo duplicado ${entry.bodyId}.`);
    result.set(entry.bodyId, mapValue(entry));
  }
  return result;
};

const validateSupplement = (
  source: DadosPosicionaisV2,
  supplement: NatalChartAnalysisV1Supplement | undefined,
): {
  velocities: ReadonlyMap<PlanetBodyId, number>;
  rawHousePositions: ReadonlyMap<PlanetBodyId, number>;
} => {
  if (supplement !== undefined) {
    if (typeof supplement !== 'object' || supplement === null || Array.isArray(supplement)) {
      throw new TypeError('O suplemento natal deve ser um objeto.');
    }
    assertExactKeys(
      supplement as unknown as Record<string, unknown>,
      ['longitudinalVelocities', 'rawSwissHousePositions'],
      'O suplemento natal',
    );
    if (supplement.longitudinalVelocities !== undefined && !Array.isArray(supplement.longitudinalVelocities)) {
      throw new TypeError('longitudinalVelocities deve ser uma lista.');
    }
    if (supplement.rawSwissHousePositions !== undefined && !Array.isArray(supplement.rawSwissHousePositions)) {
      throw new TypeError('rawSwissHousePositions deve ser uma lista.');
    }
  }

  const velocities = makeSupplementMap(
    supplement?.longitudinalVelocities,
    'velocityDegPerDay',
    'longitudinalVelocities',
    (entry) => {
      const velocity = entry.velocityDegPerDay;
      if (typeof velocity !== 'number' || !Number.isFinite(velocity)) {
        throw new RangeError('Cada velocidade longitudinal deve ser finita.');
      }
      return velocity;
    },
  );

  const sourcePositionByBody = new Map(source.positions.map((position) => [position.bodyId, position] as const));
  const rawHousePositions = makeSupplementMap(
    supplement?.rawSwissHousePositions,
    'rawSwissHousePosition',
    'rawSwissHousePositions',
    (entry) => {
      const raw = entry.rawSwissHousePosition;
      if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 1 || raw >= 13) {
        throw new RangeError('Cada rawSwissHousePosition deve ser finita e pertencer a [1, 13).');
      }
      const bodyId = entry.bodyId;
      if (!isPlanetBodyId(bodyId)) throw new TypeError('rawSwissHousePositions contém um corpo desconhecido.');
      if (source.houses.status !== 'available') {
        throw new RangeError('Uma posição Swiss de casa não pode ser usada quando Placidus está indisponível.');
      }
      const placement = sourcePositionByBody.get(bodyId)?.housePlacement;
      if (placement?.status !== 'available') {
        throw new RangeError(
          `A posição Swiss da casa de ${bodyId} não pode ser usada sem ocupação Placidus disponível.`,
        );
      }
      if (Math.floor(raw) !== placement.houseIndex1) {
        throw new RangeError(
          `A posição Swiss da casa de ${bodyId} é incoerente com a Casa ${placement.houseIndex1} canônica.`,
        );
      }
      return raw;
    },
  );

  return { velocities, rawHousePositions };
};

export function angularSeparationDeg(leftLongitudeDeg: number, rightLongitudeDeg: number): number {
  if (!Number.isFinite(leftLongitudeDeg) || !Number.isFinite(rightLongitudeDeg)) {
    throw new RangeError('As longitudes devem ser números finitos.');
  }
  const directedDifference = normalizeLongitude(rightLongitudeDeg - leftLongitudeDeg);
  return Math.min(directedDifference, 360 - directedDifference);
}

export function resolveNatalMajorAspect(separationDeg: number): ResolvedNatalMajorAspect | null {
  if (!Number.isFinite(separationDeg) || separationDeg < 0 || separationDeg > 180) {
    throw new RangeError('A separação angular deve pertencer a [0, 180].');
  }
  for (const definition of ASPECT_DEFINITIONS) {
    const orbDeg = Math.abs(separationDeg - definition.exactAngleDeg);
    if (orbDeg > definition.allowedOrbDeg) continue;
    const intensityPercent = Math.max(
      0,
      Math.min(100, ((definition.allowedOrbDeg - orbDeg) / definition.allowedOrbDeg) * 100),
    );
    return { ...definition, orbDeg, intensityPercent };
  }
  return null;
}

const pointReference = (point: NatalChartPoint): NatalChartPointReference => ({ kind: point.kind, id: point.id });

const pointKey = (point: NatalChartPointReference): string => `${point.kind}:${point.id}`;

const phaseForAspect = (
  pointA: NatalChartPoint,
  pointB: NatalChartPoint,
  aspect: ResolvedNatalMajorAspect,
  velocities: ReadonlyMap<PlanetBodyId, number>,
): AspectPhaseV1 => {
  if (aspect.orbDeg <= NATAL_CHART_ASPECT_PROFILE.exactToleranceDeg) {
    return { status: 'available', phase: 'exact', basis: 'exact-angle-tolerance' };
  }
  if (pointA.kind === 'angle' || pointB.kind === 'angle') {
    return { status: 'unavailable', reasonCode: 'ANGLE_VELOCITY_NOT_PROVIDED', basis: 'not-calculated' };
  }
  const velocityA = velocities.get(pointA.id as PlanetBodyId);
  const velocityB = velocities.get(pointB.id as PlanetBodyId);
  if (velocityA === undefined || velocityB === undefined) {
    return { status: 'unavailable', reasonCode: 'LONGITUDINAL_VELOCITY_NOT_PROVIDED', basis: 'not-calculated' };
  }

  const directedDifference = normalizeLongitude(pointB.eclipticLongitudeDeg - pointA.eclipticLongitudeDeg);
  const relativeVelocity = velocityB - velocityA;
  const separationDerivative = directedDifference < 180 ? relativeVelocity : -relativeVelocity;
  if (Math.abs(separationDerivative) <= Number.EPSILON) {
    return { status: 'unavailable', reasonCode: 'RELATIVE_LONGITUDINAL_VELOCITY_ZERO', basis: 'not-calculated' };
  }
  const deviationDerivative =
    Math.sign(aspect.exactAngleDeg - angularSeparationDeg(pointA.eclipticLongitudeDeg, pointB.eclipticLongitudeDeg)) *
    separationDerivative;
  return {
    status: 'available',
    phase: deviationDerivative > 0 ? 'applying' : 'separating',
    basis: 'explicit-longitudinal-velocities',
  };
};

const movementForBody = (bodyId: PlanetBodyId, velocities: ReadonlyMap<PlanetBodyId, number>): PlanetMovementV1 => {
  const velocityDegPerDay = velocities.get(bodyId);
  if (velocityDegPerDay === undefined) {
    return {
      bodyId,
      status: 'unavailable',
      reasonCode: 'LONGITUDINAL_VELOCITY_NOT_PROVIDED',
      basis: 'explicit-ecliptic-longitude-velocity',
    };
  }
  return {
    bodyId,
    status: 'available',
    velocityDegPerDay,
    direction: velocityDegPerDay > 0 ? 'direct' : velocityDegPerDay < 0 ? 'retrograde' : 'stationary',
    basis: 'explicit-ecliptic-longitude-velocity',
  };
};

const houseOccupancyForBody = (
  position: DadosPosicionaisV2['positions'][number],
  rawHousePositions: ReadonlyMap<PlanetBodyId, number>,
): HouseOccupancyV1 => {
  if (position.housePlacement.status === 'unavailable') {
    return {
      bodyId: position.bodyId,
      occupancy: {
        status: 'unavailable',
        reasonCode: position.housePlacement.reasonCode,
        basis: 'dados-posicionais-v2-house-placement',
      },
      mundaneDegreeWithinHouse: {
        status: 'unavailable',
        reasonCode: position.housePlacement.reasonCode,
        basis: 'explicit-swiss-swe-house-pos',
      },
    };
  }

  const rawSwissHousePosition = rawHousePositions.get(position.bodyId);
  return {
    bodyId: position.bodyId,
    occupancy: {
      status: 'available',
      houseIndex1: position.housePlacement.houseIndex1,
      basis: 'dados-posicionais-v2-house-placement',
    },
    mundaneDegreeWithinHouse:
      rawSwissHousePosition === undefined
        ? {
            status: 'unavailable',
            reasonCode: 'POSITION_V2_0_DOES_NOT_EXPOSE_MUNDANE_DEGREE',
            basis: 'explicit-swiss-swe-house-pos',
          }
        : {
            status: 'available',
            rawSwissHousePosition,
            degreeWithinHouseDeg: (rawSwissHousePosition - Math.floor(rawSwissHousePosition)) * 30,
            mundaneLongitudeDeg: (rawSwissHousePosition - 1) * 30,
            coordinateSystem: 'placidus-house-horoscope',
            degreeSemantics: 'normalized-semiarc-house-degree',
            basis: 'explicit-swiss-swe-house-pos',
          },
  };
};

export function calculateNatalChartAnalysisV1(
  source: DadosPosicionaisV2,
  supplement?: NatalChartAnalysisV1Supplement,
): NatalChartAnalysisV1 {
  const sourceValidation = validateDadosPosicionaisV2(source);
  if (!sourceValidation.valid) {
    const first = sourceValidation.errors[0];
    throw new TypeError(
      `DadosPosicionaisV2 inválido em ${first?.instancePath || '/'}: ${first?.message ?? 'erro desconhecido'}.`,
    );
  }
  const { velocities, rawHousePositions } = validateSupplement(source, supplement);

  const points: NatalChartPoint[] = source.positions.map((position) => ({
    kind: 'planet',
    id: position.bodyId,
    displayNamePtBr: position.displayNamePtBr,
    symbol: position.symbol,
    eclipticLongitudeDeg: position.coordinates.eclipticLongitudeDeg,
  }));
  for (const angleId of ['ascendant', 'midheaven'] as const) {
    const sourceAngle = source.angles.find((angle) => angle.angleId === angleId);
    if (!sourceAngle) continue;
    points.push({
      kind: 'angle',
      id: angleId,
      displayNamePtBr: sourceAngle.displayNamePtBr,
      symbol: angleId === 'ascendant' ? 'ASC' : 'MC',
      eclipticLongitudeDeg: sourceAngle.eclipticLongitudeDeg,
    });
  }

  const aspects: NatalAspectV1[] = [];
  for (let leftIndex = 0; leftIndex < points.length; leftIndex += 1) {
    const pointA = points[leftIndex];
    if (!pointA) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < points.length; rightIndex += 1) {
      const pointB = points[rightIndex];
      if (!pointB || (pointA.kind === 'angle' && pointB.kind === 'angle')) continue;
      const separationDeg = angularSeparationDeg(pointA.eclipticLongitudeDeg, pointB.eclipticLongitudeDeg);
      const aspect = resolveNatalMajorAspect(separationDeg);
      if (!aspect) continue;
      const pointARef = pointReference(pointA);
      const pointBRef = pointReference(pointB);
      aspects.push({
        recordId: `${pointKey(pointARef)}--${pointKey(pointBRef)}`,
        pointA: pointARef,
        pointB: pointBRef,
        aspectId: aspect.aspectId,
        displayNamePtBr: aspect.displayNamePtBr,
        separationDeg,
        exactAngleDeg: aspect.exactAngleDeg,
        allowedOrbDeg: aspect.allowedOrbDeg,
        orbDeg: aspect.orbDeg,
        intensityPercent: aspect.intensityPercent,
        phase: phaseForAspect(pointA, pointB, aspect, velocities),
      });
    }
  }

  const diagnostics: NatalChartAnalysisV1['diagnostics'][number][] = [];
  if (velocities.size === 0) {
    diagnostics.push({ severity: 'info', code: 'LONGITUDINAL_VELOCITIES_NOT_PROVIDED' });
  } else if (velocities.size < PLANET_BODY_IDS.length) {
    diagnostics.push({ severity: 'info', code: 'LONGITUDINAL_VELOCITIES_PARTIAL' });
  }
  if (source.houses.status === 'unavailable') {
    diagnostics.push({ severity: 'warning', code: 'PLACIDUS_UNAVAILABLE' });
  } else if (rawHousePositions.size === 0) {
    diagnostics.push({ severity: 'info', code: 'RAW_SWISS_HOUSE_POSITIONS_NOT_PROVIDED' });
  } else if (
    rawHousePositions.size <
    source.positions.filter(({ housePlacement }) => housePlacement.status === 'available').length
  ) {
    diagnostics.push({ severity: 'info', code: 'RAW_SWISS_HOUSE_POSITIONS_PARTIAL' });
  }

  return {
    schemaId: NATAL_CHART_ANALYSIS_SCHEMA_ID,
    schemaVersion: NATAL_CHART_ANALYSIS_SCHEMA_VERSION,
    source: {
      schemaId: source.schemaId,
      schemaVersion: source.schemaVersion,
      calculationId: source.calculationId,
      calculatedAtUtc: source.calculatedAtUtc,
    },
    targetSet: { id: NATAL_CHART_ANALYSIS_TARGET_SET_ID, version: '1.0.0' },
    presentationPolicy: { ...source.presentationPolicy },
    models: {
      aspects: {
        ...NATAL_CHART_ASPECT_PROFILE,
        aspectDefinitions: NATAL_CHART_ASPECT_PROFILE.aspectDefinitions.map((definition) => ({ ...definition })),
      },
      houses: {
        systemId: 'placidus',
        occupancyBasis: 'dados-posicionais-v2-house-placement',
        mundaneDegreeBasis: 'swiss-swe-house-pos-fraction-times-30',
      },
    },
    points,
    movements: PLANET_BODY_IDS.map((bodyId) => movementForBody(bodyId, velocities)),
    aspects,
    houseOccupancies: source.positions.map((position) => houseOccupancyForBody(position, rawHousePositions)),
    diagnostics,
  };
}
