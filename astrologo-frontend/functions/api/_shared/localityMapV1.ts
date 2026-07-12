import { EquatorFromVector, RotateVector, Rotation_EQJ_EQD, Spherical, VectorFromSphere } from 'astronomy-engine';
import type { DadosPosicionaisV2, PlanetBodyId, POSITIONAL_SCHEMA_ID, POSITIONAL_SCHEMA_VERSION } from './positionV2';
import { validateDadosPosicionaisV2 } from './positionV2Schema';

export const LOCALITY_MAP_SCHEMA_ID = 'urn:astrologo:locality-map' as const;
export const LOCALITY_MAP_SCHEMA_VERSION = '1.0.0' as const;
export const LOCALITY_MAP_TARGET_SET_ID = 'hermetic-planets-10-angles-4-v1' as const;

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

const ANGLE_DEFINITIONS = [
  { angleId: 'mc', displayNamePtBr: 'Meio do Céu' },
  { angleId: 'ic', displayNamePtBr: 'Fundo do Céu' },
  { angleId: 'ascendant', displayNamePtBr: 'Ascendente' },
  { angleId: 'descendant', displayNamePtBr: 'Descendente' },
] as const;

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const HORIZON_TOLERANCE = 1e-12;

export type LocalityAngleId = (typeof ANGLE_DEFINITIONS)[number]['angleId'];
export type LocalityCoordinate = readonly [longitudeDeg: number, latitudeDeg: number];
export type HorizonUnavailabilityReason =
  | 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED'
  | 'CIRCUMPOLAR_NO_GEOMETRIC_HORIZON_CROSSING'
  | 'TANGENT_HORIZON_NO_CROSSING'
  | 'CELESTIAL_POLE_NO_UNIQUE_HORIZON_CROSSING';

export interface LocalityMapV1Input {
  readonly sourceHashSha256: string;
  readonly greenwichApparentSiderealTime: {
    readonly kind: 'greenwich-apparent-sidereal-time';
    readonly hours: number;
    readonly provenance: {
      readonly engineId: string;
      readonly engineVersion: string;
      readonly methodId: string;
      readonly engineSourceSha256: string;
      readonly calculatedForInstantUtc: string;
    };
  };
  readonly latitudeResolutionDeg: number;
}

export interface LocalityBodyV1 {
  readonly bodyId: PlanetBodyId;
  readonly displayNamePtBr: string;
  readonly symbol: string;
  readonly sourceEquatorialEqj: {
    readonly frameId: 'geocentric-apparent-eqj-j2000';
    readonly rightAscensionHours: number;
    readonly declinationDeg: number;
  };
  readonly workingEquatorialEqd: {
    readonly frameId: 'geocentric-apparent-true-equator-of-date-eqd';
    readonly rightAscensionHours: number;
    readonly declinationDeg: number;
  };
}

export type LocalityLineAvailability =
  | {
      readonly status: 'available';
      readonly sampledLatitudeCount: number;
      readonly solvedLatitudeCount: number;
    }
  | {
      readonly status: 'partial';
      readonly sampledLatitudeCount: number;
      readonly solvedLatitudeCount: number;
    }
  | {
      readonly status: 'unavailable';
      readonly sampledLatitudeCount: number;
      readonly solvedLatitudeCount: 0;
      readonly reasonCode: 'NO_GEOMETRIC_HORIZON_CROSSING_ON_SAMPLING_GRID';
    };

export interface LocalityLineV1 {
  readonly recordId: string;
  readonly bodyId: PlanetBodyId;
  readonly bodyDisplayNamePtBr: string;
  readonly bodySymbol: string;
  readonly angleId: LocalityAngleId;
  readonly angleDisplayNamePtBr: string;
  readonly availability: LocalityLineAvailability;
  readonly geometry: {
    readonly type: 'MultiLineString';
    readonly coordinates: readonly (readonly LocalityCoordinate[])[];
  };
}

export type LocalityDiagnosticV1 =
  | {
      readonly severity: 'info';
      readonly code: 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED';
      readonly latitudeDeg: -90 | 90;
    }
  | {
      readonly severity: 'info';
      readonly code:
        | 'CIRCUMPOLAR_NO_GEOMETRIC_HORIZON_CROSSING'
        | 'TANGENT_HORIZON_NO_CROSSING'
        | 'CELESTIAL_POLE_NO_UNIQUE_HORIZON_CROSSING';
      readonly bodyId: PlanetBodyId;
      readonly sampledLatitudeRange: {
        readonly startLatitudeDeg: number;
        readonly endLatitudeDeg: number;
      };
    };

export interface LocalityMapV1 {
  readonly schemaId: typeof LOCALITY_MAP_SCHEMA_ID;
  readonly schemaVersion: typeof LOCALITY_MAP_SCHEMA_VERSION;
  readonly source: {
    readonly schemaId: typeof POSITIONAL_SCHEMA_ID;
    readonly schemaVersion: typeof POSITIONAL_SCHEMA_VERSION;
    readonly calculationId: string;
    readonly calculatedAtUtc: string;
    readonly birthInstantUtc: string;
    readonly sourceHashAlgorithm: 'sha256';
    readonly sourceHashSha256: string;
    readonly sourceHashVerification: 'caller-supplied-format-validated';
  };
  readonly targetSet: {
    readonly id: typeof LOCALITY_MAP_TARGET_SET_ID;
    readonly version: '1.0.0';
    readonly orderedBodyIds: readonly PlanetBodyId[];
    readonly orderedAngleIds: readonly LocalityAngleId[];
  };
  readonly presentationPolicy: DadosPosicionaisV2['presentationPolicy'];
  readonly models: {
    readonly sourceCoordinates: {
      readonly sourceContract: 'DadosPosicionaisV2';
      readonly sourceContractVersion: '2.0.0';
      readonly sourceFrame: 'geocentric-apparent-eqj-j2000';
      readonly sourceProducerMethod: 'astronomy-engine-GeoVector-aberration-true-plus-EquatorFromVector';
      readonly engineId: 'astronomy-engine';
      readonly engineVersion: '2.1.19';
      readonly engineSourceSha256: string;
      readonly workingFrame: 'geocentric-apparent-true-equator-of-date-eqd';
      readonly transformation: {
        readonly methodId: 'astronomy-engine-Rotation_EQJ_EQD-v1';
        readonly precessionApplied: true;
        readonly nutationApplied: true;
        readonly calculatedForInstantUtc: string;
      };
    };
    readonly siderealTime: {
      readonly kind: 'greenwich-apparent-sidereal-time';
      readonly hours: number;
      readonly provenance: LocalityMapV1Input['greenwichApparentSiderealTime']['provenance'];
    };
    readonly geometry: {
      readonly modelId: 'astrocartography-geometric-horizon-v1';
      readonly modelVersion: '1.0.0';
      readonly altitudeReferenceDeg: 0;
      readonly refractionModel: 'none';
      readonly observerElevationModel: 'not-applied';
      readonly longitudeConvention: 'east-positive-[-180,180]';
      readonly coordinateOrder: 'longitude-latitude';
      readonly ascendantHourAngleSign: 'negative';
      readonly descendantHourAngleSign: 'positive';
      readonly antimeridianPolicy: 'split-and-interpolate-boundary-v1';
    };
    readonly sampling: {
      readonly latitudeResolutionDeg: number;
      readonly latitudeDomain: '(-90,90)';
      readonly equatorIncluded: true;
      readonly sampledLatitudeCount: number;
    };
  };
  readonly bodies: readonly LocalityBodyV1[];
  readonly lines: readonly LocalityLineV1[];
  readonly diagnostics: readonly LocalityDiagnosticV1[];
}

export type GeometricHorizonHourAngles =
  | {
      readonly status: 'available';
      readonly risingHourAngleDeg: number;
      readonly settingHourAngleDeg: number;
    }
  | { readonly status: 'unavailable'; readonly reasonCode: HorizonUnavailabilityReason };

interface SampledHorizon {
  readonly latitudeDeg: number;
  readonly solution: GeometricHorizonHourAngles;
}

interface UnavailableLatitudeSample {
  readonly latitudeDeg: number;
  readonly reasonCode: Exclude<HorizonUnavailabilityReason, 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED'>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertExactKeys = (value: Record<string, unknown>, allowed: readonly string[], context: string): void => {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected) throw new TypeError(`${context} contém a propriedade desconhecida ${unexpected}.`);
};

function assertNonEmptyString(value: unknown, context: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new TypeError(`${context} deve ser uma string não vazia.`);
}

function assertSha256(value: unknown, context: string): asserts value is string {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    throw new TypeError(`${context} deve ser um SHA-256 hexadecimal em minúsculas.`);
  }
}

const validateInput = (source: DadosPosicionaisV2, input: LocalityMapV1Input): void => {
  if (!isRecord(input)) throw new TypeError('A entrada do mapa de localidade deve ser um objeto.');
  assertExactKeys(
    input,
    ['sourceHashSha256', 'greenwichApparentSiderealTime', 'latitudeResolutionDeg'],
    'A entrada do mapa de localidade',
  );
  assertSha256(input.sourceHashSha256, 'sourceHashSha256');
  if (
    !Number.isFinite(input.latitudeResolutionDeg) ||
    input.latitudeResolutionDeg < 0.25 ||
    input.latitudeResolutionDeg > 5
  ) {
    throw new RangeError('A resolução latitudinal deve pertencer ao intervalo de 0,25° a 5° sem valor implícito.');
  }

  const sidereal = input.greenwichApparentSiderealTime;
  if (!isRecord(sidereal)) throw new TypeError('greenwichApparentSiderealTime deve ser um objeto.');
  assertExactKeys(sidereal, ['kind', 'hours', 'provenance'], 'greenwichApparentSiderealTime');
  if (sidereal.kind !== 'greenwich-apparent-sidereal-time') {
    throw new TypeError('greenwichApparentSiderealTime deve declarar explicitamente o tipo aparente.');
  }
  if (!Number.isFinite(sidereal.hours) || sidereal.hours < 0 || sidereal.hours >= 24) {
    throw new RangeError('O GAST deve pertencer a [0, 24) horas.');
  }

  const provenance = sidereal.provenance;
  if (!isRecord(provenance)) throw new TypeError('A proveniência do GAST deve ser um objeto.');
  assertExactKeys(
    provenance,
    ['engineId', 'engineVersion', 'methodId', 'engineSourceSha256', 'calculatedForInstantUtc'],
    'A proveniência do GAST',
  );
  assertNonEmptyString(provenance.engineId, 'engineId do GAST');
  assertNonEmptyString(provenance.engineVersion, 'engineVersion do GAST');
  assertNonEmptyString(provenance.methodId, 'methodId do GAST');
  assertSha256(provenance.engineSourceSha256, 'engineSourceSha256 do GAST');
  assertNonEmptyString(provenance.calculatedForInstantUtc, 'calculatedForInstantUtc do GAST');
  if (provenance.calculatedForInstantUtc !== source.birthContext.timeResolution.instantUtc) {
    throw new RangeError('A proveniência do GAST deve apontar exatamente para o instante natal canônico.');
  }
};

export function normalizeLongitude180(longitudeDeg: number): number {
  if (!Number.isFinite(longitudeDeg)) throw new RangeError('A longitude deve ser finita.');
  return ((((longitudeDeg + 180) % 360) + 360) % 360) - 180;
}

export function calculateMcIcLongitudes(
  rightAscensionHours: number,
  greenwichApparentSiderealTimeHours: number,
): { readonly mcLongitudeDeg: number; readonly icLongitudeDeg: number } {
  if (!Number.isFinite(rightAscensionHours) || rightAscensionHours < 0 || rightAscensionHours >= 24) {
    throw new RangeError('A ascensão reta deve pertencer a [0, 24) horas.');
  }
  if (
    !Number.isFinite(greenwichApparentSiderealTimeHours) ||
    greenwichApparentSiderealTimeHours < 0 ||
    greenwichApparentSiderealTimeHours >= 24
  ) {
    throw new RangeError('O GAST deve pertencer a [0, 24) horas.');
  }
  return {
    mcLongitudeDeg: normalizeLongitude180((rightAscensionHours - greenwichApparentSiderealTimeHours) * 15),
    icLongitudeDeg: normalizeLongitude180((rightAscensionHours + 12 - greenwichApparentSiderealTimeHours) * 15),
  };
}

export function solveGeometricHorizonHourAngles(
  latitudeDeg: number,
  declinationDeg: number,
): GeometricHorizonHourAngles {
  if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) {
    throw new RangeError('A latitude deve pertencer a [-90, 90].');
  }
  if (!Number.isFinite(declinationDeg) || declinationDeg < -90 || declinationDeg > 90) {
    throw new RangeError('A declinação deve pertencer a [-90, 90].');
  }
  if (Math.abs(latitudeDeg) === 90) {
    return { status: 'unavailable', reasonCode: 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED' };
  }
  if (Math.abs(declinationDeg) === 90) {
    return { status: 'unavailable', reasonCode: 'CELESTIAL_POLE_NO_UNIQUE_HORIZON_CROSSING' };
  }

  const latitudeRad = (latitudeDeg * Math.PI) / 180;
  const declinationRad = (declinationDeg * Math.PI) / 180;
  const cosineHourAngle = -Math.tan(latitudeRad) * Math.tan(declinationRad);
  if (!Number.isFinite(cosineHourAngle) || Math.abs(cosineHourAngle) > 1 + HORIZON_TOLERANCE) {
    return { status: 'unavailable', reasonCode: 'CIRCUMPOLAR_NO_GEOMETRIC_HORIZON_CROSSING' };
  }
  const clampedCosine = Math.max(-1, Math.min(1, cosineHourAngle));
  if (Math.abs(Math.abs(clampedCosine) - 1) <= HORIZON_TOLERANCE) {
    return { status: 'unavailable', reasonCode: 'TANGENT_HORIZON_NO_CROSSING' };
  }
  const absoluteHourAngleDeg = (Math.acos(clampedCosine) * 180) / Math.PI;
  return {
    status: 'available',
    risingHourAngleDeg: -absoluteHourAngleDeg,
    settingHourAngleDeg: absoluteHourAngleDeg,
  };
}

export function calculateHourAngleLongitudeDeg(
  rightAscensionHours: number,
  greenwichApparentSiderealTimeHours: number,
  hourAngleDeg: number,
): number {
  if (!Number.isFinite(rightAscensionHours) || rightAscensionHours < 0 || rightAscensionHours >= 24) {
    throw new RangeError('A ascensão reta deve pertencer a [0, 24) horas.');
  }
  if (
    !Number.isFinite(greenwichApparentSiderealTimeHours) ||
    greenwichApparentSiderealTimeHours < 0 ||
    greenwichApparentSiderealTimeHours >= 24
  ) {
    throw new RangeError('O GAST deve pertencer a [0, 24) horas.');
  }
  if (!Number.isFinite(hourAngleDeg)) throw new RangeError('O ângulo horário deve ser finito.');
  return normalizeLongitude180((rightAscensionHours - greenwichApparentSiderealTimeHours) * 15 + hourAngleDeg);
}

export function buildLatitudeSamplingGrid(latitudeResolutionDeg: number): readonly number[] {
  if (!Number.isFinite(latitudeResolutionDeg) || latitudeResolutionDeg < 0.25 || latitudeResolutionDeg > 5) {
    throw new RangeError('A resolução latitudinal deve pertencer ao intervalo de 0,25° a 5° sem valor implícito.');
  }
  const maximumIndex = Math.ceil(90 / latitudeResolutionDeg) - 1;
  const positive = Array.from({ length: maximumIndex }, (_, index0) =>
    Number(((index0 + 1) * latitudeResolutionDeg).toPrecision(15)),
  ).filter((latitudeDeg) => latitudeDeg < 90);
  const negative = [...positive].reverse().map((latitudeDeg) => -latitudeDeg);
  return [...negative, 0, ...positive];
}

export function splitAntimeridianSegments(
  coordinates: readonly LocalityCoordinate[],
): readonly (readonly LocalityCoordinate[])[] {
  if (coordinates.length === 0) return [];
  for (const coordinate of coordinates) {
    if (
      !Array.isArray(coordinate) ||
      coordinate.length !== 2 ||
      !Number.isFinite(coordinate[0]) ||
      coordinate[0] < -180 ||
      coordinate[0] > 180 ||
      !Number.isFinite(coordinate[1]) ||
      coordinate[1] < -90 ||
      coordinate[1] > 90
    ) {
      throw new RangeError('Cada coordenada deve ser [longitude, latitude] dentro dos intervalos geográficos.');
    }
  }

  const first = coordinates[0];
  if (!first) return [];
  const segments: LocalityCoordinate[][] = [];
  let current: LocalityCoordinate[] = [[first[0], first[1]]];
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const coordinate = coordinates[index];
    if (!previous || !coordinate) continue;
    const longitudeJump = coordinate[0] - previous[0];
    if (Math.abs(longitudeJump) <= 180) {
      current.push([coordinate[0], coordinate[1]]);
      continue;
    }

    const crossesEastward = previous[0] > 0 && coordinate[0] < 0;
    const unwrappedNextLongitude = crossesEastward ? coordinate[0] + 360 : coordinate[0] - 360;
    const boundaryLongitude = crossesEastward ? 180 : -180;
    const mirroredBoundaryLongitude = crossesEastward ? -180 : 180;
    const interpolationRatio = (boundaryLongitude - previous[0]) / (unwrappedNextLongitude - previous[0]);
    const boundaryLatitude = previous[1] + (coordinate[1] - previous[1]) * interpolationRatio;
    current.push([boundaryLongitude, boundaryLatitude]);
    segments.push(current);
    current = [
      [mirroredBoundaryLongitude, boundaryLatitude],
      [coordinate[0], coordinate[1]],
    ];
  }
  segments.push(current);
  return segments;
}

const segmentsFromNullableCoordinates = (
  coordinates: readonly (LocalityCoordinate | null)[],
): readonly (readonly LocalityCoordinate[])[] => {
  const segments: LocalityCoordinate[][] = [];
  let contiguous: LocalityCoordinate[] = [];
  const flush = (): void => {
    if (contiguous.length > 0) segments.push(...splitAntimeridianSegments(contiguous).map((segment) => [...segment]));
    contiguous = [];
  };
  for (const coordinate of coordinates) {
    if (coordinate) contiguous.push(coordinate);
    else flush();
  }
  flush();
  return segments;
};

const availabilityForCounts = (sampledLatitudeCount: number, solvedLatitudeCount: number): LocalityLineAvailability => {
  if (solvedLatitudeCount === 0) {
    return {
      status: 'unavailable',
      sampledLatitudeCount,
      solvedLatitudeCount: 0,
      reasonCode: 'NO_GEOMETRIC_HORIZON_CROSSING_ON_SAMPLING_GRID',
    };
  }
  if (solvedLatitudeCount < sampledLatitudeCount) {
    return { status: 'partial', sampledLatitudeCount, solvedLatitudeCount };
  }
  return { status: 'available', sampledLatitudeCount, solvedLatitudeCount };
};

const createLine = (
  body: LocalityBodyV1,
  angleId: LocalityAngleId,
  coordinates: readonly (readonly LocalityCoordinate[])[],
  sampledLatitudeCount: number,
  solvedLatitudeCount: number,
): LocalityLineV1 => {
  const definition = ANGLE_DEFINITIONS.find((candidate) => candidate.angleId === angleId);
  if (!definition) throw new RangeError(`Ângulo de localidade desconhecido: ${angleId}.`);
  return {
    recordId: `${body.bodyId}:${angleId}`,
    bodyId: body.bodyId,
    bodyDisplayNamePtBr: body.displayNamePtBr,
    bodySymbol: body.symbol,
    angleId,
    angleDisplayNamePtBr: definition.displayNamePtBr,
    availability: availabilityForCounts(sampledLatitudeCount, solvedLatitudeCount),
    geometry: { type: 'MultiLineString', coordinates },
  };
};

const groupUnavailableLatitudeSamples = (
  bodyId: PlanetBodyId,
  samples: readonly UnavailableLatitudeSample[],
  latitudeResolutionDeg: number,
): readonly LocalityDiagnosticV1[] => {
  const diagnostics: LocalityDiagnosticV1[] = [];
  let start: UnavailableLatitudeSample | undefined;
  let previous: UnavailableLatitudeSample | undefined;
  const flush = (): void => {
    if (!start || !previous) return;
    diagnostics.push({
      severity: 'info',
      code: start.reasonCode,
      bodyId,
      sampledLatitudeRange: {
        startLatitudeDeg: start.latitudeDeg,
        endLatitudeDeg: previous.latitudeDeg,
      },
    });
  };
  for (const sample of samples) {
    if (
      !start ||
      !previous ||
      sample.reasonCode !== previous.reasonCode ||
      sample.latitudeDeg - previous.latitudeDeg > latitudeResolutionDeg + HORIZON_TOLERANCE
    ) {
      flush();
      start = sample;
    }
    previous = sample;
  }
  flush();
  return diagnostics;
};

export function calculateLocalityMapV1(source: DadosPosicionaisV2, input: LocalityMapV1Input): LocalityMapV1 {
  const sourceValidation = validateDadosPosicionaisV2(source);
  if (!sourceValidation.valid) {
    const first = sourceValidation.errors[0];
    throw new TypeError(
      `DadosPosicionaisV2 inválido em ${first?.instancePath || '/'}: ${first?.message ?? 'erro desconhecido'}.`,
    );
  }
  validateInput(source, input);

  const latitudeSamples = buildLatitudeSamplingGrid(input.latitudeResolutionDeg);
  const birthInstant = new Date(source.birthContext.timeResolution.instantUtc);
  if (Number.isNaN(birthInstant.getTime()))
    throw new RangeError('O instante natal canônico deve ser um ISO UTC válido.');
  // DadosPosicionaisV2 v2.0.0 obtains RA/Dec from GeoVector + EquatorFromVector,
  // whose Astronomy Engine contract is EQJ/J2000. GAST is true-of-date, so EQJ
  // must never feed the hour-angle equations directly: precession and nutation
  // are applied first by the documented EQJ -> EQD rotation.
  const eqjToEqd = Rotation_EQJ_EQD(birthInstant);
  const bodies: LocalityBodyV1[] = source.positions.map((position) => {
    const sourceEquatorialEqj = {
      frameId: 'geocentric-apparent-eqj-j2000' as const,
      rightAscensionHours: position.coordinates.rightAscensionHours,
      declinationDeg: position.coordinates.declinationDeg,
    };
    const sourceVector = VectorFromSphere(
      new Spherical(sourceEquatorialEqj.declinationDeg, sourceEquatorialEqj.rightAscensionHours * 15, 1),
      birthInstant,
    );
    const transformed = EquatorFromVector(RotateVector(eqjToEqd, sourceVector));
    if (
      !Number.isFinite(transformed.ra) ||
      transformed.ra < 0 ||
      transformed.ra >= 24 ||
      !Number.isFinite(transformed.dec) ||
      transformed.dec < -90 ||
      transformed.dec > 90
    ) {
      throw new RangeError(`A transformação EQJ→EQD de ${position.bodyId} produziu coordenadas inválidas.`);
    }
    return {
      bodyId: position.bodyId,
      displayNamePtBr: position.displayNamePtBr,
      symbol: position.symbol,
      sourceEquatorialEqj,
      workingEquatorialEqd: {
        frameId: 'geocentric-apparent-true-equator-of-date-eqd',
        rightAscensionHours: transformed.ra,
        declinationDeg: transformed.dec,
      },
    };
  });
  const lines: LocalityLineV1[] = [];
  const diagnostics: LocalityDiagnosticV1[] = [
    { severity: 'info', code: 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED', latitudeDeg: -90 },
    { severity: 'info', code: 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED', latitudeDeg: 90 },
  ];

  for (const body of bodies) {
    const meridians = calculateMcIcLongitudes(
      body.workingEquatorialEqd.rightAscensionHours,
      input.greenwichApparentSiderealTime.hours,
    );
    const mcCoordinates = latitudeSamples.map(
      (latitudeDeg): LocalityCoordinate => [meridians.mcLongitudeDeg, latitudeDeg],
    );
    const icCoordinates = latitudeSamples.map(
      (latitudeDeg): LocalityCoordinate => [meridians.icLongitudeDeg, latitudeDeg],
    );
    lines.push(
      createLine(body, 'mc', [mcCoordinates], latitudeSamples.length, latitudeSamples.length),
      createLine(body, 'ic', [icCoordinates], latitudeSamples.length, latitudeSamples.length),
    );

    const horizonSamples: SampledHorizon[] = latitudeSamples.map((latitudeDeg) => ({
      latitudeDeg,
      solution: solveGeometricHorizonHourAngles(latitudeDeg, body.workingEquatorialEqd.declinationDeg),
    }));
    const ascendantCoordinates = horizonSamples.map(({ latitudeDeg, solution }): LocalityCoordinate | null =>
      solution.status === 'available'
        ? [
            calculateHourAngleLongitudeDeg(
              body.workingEquatorialEqd.rightAscensionHours,
              input.greenwichApparentSiderealTime.hours,
              solution.risingHourAngleDeg,
            ),
            latitudeDeg,
          ]
        : null,
    );
    const descendantCoordinates = horizonSamples.map(({ latitudeDeg, solution }): LocalityCoordinate | null =>
      solution.status === 'available'
        ? [
            calculateHourAngleLongitudeDeg(
              body.workingEquatorialEqd.rightAscensionHours,
              input.greenwichApparentSiderealTime.hours,
              solution.settingHourAngleDeg,
            ),
            latitudeDeg,
          ]
        : null,
    );
    const solvedLatitudeCount = horizonSamples.filter(({ solution }) => solution.status === 'available').length;
    lines.push(
      createLine(
        body,
        'ascendant',
        segmentsFromNullableCoordinates(ascendantCoordinates),
        latitudeSamples.length,
        solvedLatitudeCount,
      ),
      createLine(
        body,
        'descendant',
        segmentsFromNullableCoordinates(descendantCoordinates),
        latitudeSamples.length,
        solvedLatitudeCount,
      ),
    );

    const unavailable = horizonSamples.flatMap(({ latitudeDeg, solution }): UnavailableLatitudeSample[] =>
      solution.status === 'unavailable' && solution.reasonCode !== 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED'
        ? [{ latitudeDeg, reasonCode: solution.reasonCode }]
        : [],
    );
    diagnostics.push(...groupUnavailableLatitudeSamples(body.bodyId, unavailable, input.latitudeResolutionDeg));
  }

  return {
    schemaId: LOCALITY_MAP_SCHEMA_ID,
    schemaVersion: LOCALITY_MAP_SCHEMA_VERSION,
    source: {
      schemaId: source.schemaId,
      schemaVersion: source.schemaVersion,
      calculationId: source.calculationId,
      calculatedAtUtc: source.calculatedAtUtc,
      birthInstantUtc: source.birthContext.timeResolution.instantUtc,
      sourceHashAlgorithm: 'sha256',
      sourceHashSha256: input.sourceHashSha256,
      sourceHashVerification: 'caller-supplied-format-validated',
    },
    targetSet: {
      id: LOCALITY_MAP_TARGET_SET_ID,
      version: '1.0.0',
      orderedBodyIds: PLANET_BODY_IDS,
      orderedAngleIds: ANGLE_DEFINITIONS.map(({ angleId }) => angleId),
    },
    presentationPolicy: { ...source.presentationPolicy },
    models: {
      sourceCoordinates: {
        sourceContract: 'DadosPosicionaisV2',
        sourceContractVersion: source.schemaVersion,
        sourceFrame: 'geocentric-apparent-eqj-j2000',
        sourceProducerMethod: 'astronomy-engine-GeoVector-aberration-true-plus-EquatorFromVector',
        engineId: source.models.ephemeris.engineId,
        engineVersion: source.models.ephemeris.engineVersion,
        engineSourceSha256: source.models.ephemeris.sourceSha256,
        workingFrame: 'geocentric-apparent-true-equator-of-date-eqd',
        transformation: {
          methodId: 'astronomy-engine-Rotation_EQJ_EQD-v1',
          precessionApplied: true,
          nutationApplied: true,
          calculatedForInstantUtc: source.birthContext.timeResolution.instantUtc,
        },
      },
      siderealTime: {
        kind: 'greenwich-apparent-sidereal-time',
        hours: input.greenwichApparentSiderealTime.hours,
        provenance: { ...input.greenwichApparentSiderealTime.provenance },
      },
      geometry: {
        modelId: 'astrocartography-geometric-horizon-v1',
        modelVersion: '1.0.0',
        altitudeReferenceDeg: 0,
        refractionModel: 'none',
        observerElevationModel: 'not-applied',
        longitudeConvention: 'east-positive-[-180,180]',
        coordinateOrder: 'longitude-latitude',
        ascendantHourAngleSign: 'negative',
        descendantHourAngleSign: 'positive',
        antimeridianPolicy: 'split-and-interpolate-boundary-v1',
      },
      sampling: {
        latitudeResolutionDeg: input.latitudeResolutionDeg,
        latitudeDomain: '(-90,90)',
        equatorIncluded: true,
        sampledLatitudeCount: latitudeSamples.length,
      },
    },
    bodies,
    lines,
    diagnostics,
  };
}
