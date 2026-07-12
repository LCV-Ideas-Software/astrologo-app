import {
  ASTRONOMY_ENGINE_SOURCE_SHA256,
  type DadosPosicionaisV2,
  type PlanetBodyId,
  POSITIONAL_SCHEMA_ID,
  POSITIONAL_SCHEMA_VERSION,
  projectTropical,
} from './positionV2';
import { validateDadosPosicionaisV2 } from './positionV2Schema';
import { angularSeparationDeg, houseIndexForLongitude, SYNASTRY_PLANET_BODY_IDS } from './synastryRunV1';

export const TRANSIT_RUN_SCHEMA_ID = 'urn:astrologo:transit-run' as const;
export const TRANSIT_RUN_SCHEMA_VERSION = '1.0.0' as const;
export const TRANSIT_TARGET_SET_ID = 'hermetic-planets-10-to-natal-planets-10-plus-asc-mc-v1' as const;
export const TRANSIT_IAU_BOUNDARY_GUARD_ARCMINUTES = 20 as const;

export const TRANSIT_PLANET_BODY_IDS = SYNASTRY_PLANET_BODY_IDS;
export const TRANSIT_NATAL_POINT_IDS = [
  ...TRANSIT_PLANET_BODY_IDS,
  'ascendant',
  'midheaven',
] as const satisfies readonly (PlanetBodyId | 'ascendant' | 'midheaven')[];

export type TransitNatalAngleId = 'ascendant' | 'midheaven';
export type TransitNatalPointId = PlanetBodyId | TransitNatalAngleId;
export type TransitAspectId = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

export interface TransitAspectDefinitionV1 {
  readonly aspectId: TransitAspectId;
  readonly displayNamePtBr: string;
  readonly exactAngleDeg: number;
  readonly allowedOrbDeg: 2;
}

const TRANSIT_ASPECT_DEFINITIONS = [
  { aspectId: 'conjunction', displayNamePtBr: 'Conjunção', exactAngleDeg: 0, allowedOrbDeg: 2 },
  { aspectId: 'sextile', displayNamePtBr: 'Sextil', exactAngleDeg: 60, allowedOrbDeg: 2 },
  { aspectId: 'square', displayNamePtBr: 'Quadratura', exactAngleDeg: 90, allowedOrbDeg: 2 },
  { aspectId: 'trine', displayNamePtBr: 'Trígono', exactAngleDeg: 120, allowedOrbDeg: 2 },
  { aspectId: 'opposition', displayNamePtBr: 'Oposição', exactAngleDeg: 180, allowedOrbDeg: 2 },
] as const satisfies readonly TransitAspectDefinitionV1[];

export const TRANSIT_ASPECT_PROFILE_V1 = Object.freeze({
  profileId: 'astrologo-transit-major-v1' as const,
  profileVersion: '1.0.0' as const,
  orbPolicy: 'fixed-2deg-no-body-modifiers' as const,
  orbBoundaryConvention: 'inclusive' as const,
  separationMethod: 'smallest-angular-distance-0-to-180' as const,
  pairPolicy: 'transiting-planets-10-to-natal-planets-10-plus-asc-mc' as const,
  phaseMethod: 'explicit-later-snapshot-orb-comparison-v1' as const,
  exactSearchPolicy: 'provider-result-requires-snapshot-verification-within-horizon' as const,
  exactToleranceDeg: 1e-7 as const,
  aspectDefinitions: TRANSIT_ASPECT_DEFINITIONS,
});

export const TRANSIT_ASTRONOMICAL_REAL_MODEL_V1 = Object.freeze({
  methodId: 'iau-roman-1987-b1875-consensus-v1' as const,
  boundaryDatasetVersion: 'astronomy-engine-2.1.19' as const,
  boundaryDatasetSha256: ASTRONOMY_ENGINE_SOURCE_SHA256,
  classificationEpoch: 'B1875' as const,
  boundaryGuardArcminutes: TRANSIT_IAU_BOUNDARY_GUARD_ARCMINUTES,
  coordinateInput: 'geocentric-apparent-equatorial-j2000' as const,
  translationPolicy: 'curated-pt-br-editorial-v1' as const,
  degreeWithinConstellationPolicy: 'not-defined-iau-2d-areas' as const,
});

export interface ResolvedTransitAspectV1 extends TransitAspectDefinitionV1 {
  readonly orbDeg: number;
}

export interface TransitSnapshotPositionV1 {
  readonly bodyId: PlanetBodyId;
  readonly eclipticLongitudeDeg: number;
  readonly astronomicalReal: TransitAstronomicalRealProjectionV1;
}

export interface TransitEquatorialCoordinatesV1 {
  readonly rightAscensionHours: number;
  readonly declinationDeg: number;
  readonly referenceFrame: 'equatorial-j2000';
}

export type TransitAstronomicalRealProjectionV1 =
  | {
      readonly status: 'available';
      readonly coordinates: TransitEquatorialCoordinatesV1;
      readonly constellation: {
        readonly iauCode: string;
        readonly latinName: string;
        readonly namePtBr: string;
      };
      readonly degreeWithinConstellation: {
        readonly status: 'not-defined';
        readonly reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS';
      };
    }
  | {
      readonly status: 'unavailable';
      readonly reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN';
      readonly coordinates: TransitEquatorialCoordinatesV1;
      readonly degreeWithinConstellation: {
        readonly status: 'not-defined';
        readonly reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS';
      };
    };

export interface TransitSnapshotV1 {
  readonly instantUtc: string;
  readonly positions: readonly TransitSnapshotPositionV1[];
}

export interface TransitProviderProvenanceV1 {
  readonly providerId: string;
  readonly providerVersion: string;
  readonly engineId: string;
  readonly engineVersion: string;
  readonly sourceRef: string;
  readonly sourceSha256: string;
  readonly observerOrigin: 'geocentric';
  readonly apparentOrAstrometric: 'apparent';
  readonly eclipticReference: 'true-ecliptic-of-date';
  readonly equatorialReference: 'equator-j2000';
}

export interface TransitExactSearchQueryV1 {
  readonly startInstantUtc: string;
  readonly endInstantUtc: string;
  readonly transitBodyId: PlanetBodyId;
  readonly natalPointId: TransitNatalPointId;
  readonly natalLongitudeDeg: number;
  readonly aspectId: TransitAspectId;
  readonly exactAngleDeg: number;
}

export type TransitExactSearchResultV1 =
  | { readonly status: 'found'; readonly exactAtUtc: string }
  | { readonly status: 'not-found'; readonly reasonCode: 'NO_EXACTITUDE_WITHIN_HORIZON' };

export interface TransitSnapshotProviderV1 {
  readonly provenance: TransitProviderProvenanceV1;
  readonly getSnapshot: (instantUtc: string) => TransitSnapshotV1;
  readonly getPhaseProbeSnapshot: (referenceInstantUtc: string) => TransitSnapshotV1;
  readonly searchExactAspect?: (query: TransitExactSearchQueryV1) => TransitExactSearchResultV1;
}

export type TransitNatalHousePlacementV1 =
  | {
      readonly status: 'available';
      readonly houseIndex1: number;
      readonly basis: 'natal-placidus-cusps-ecliptic-longitude';
      readonly intervalConvention: '[cusp,next-cusp)';
    }
  | {
      readonly status: 'unavailable';
      readonly reasonCode: 'NATAL_PLACIDUS_UNAVAILABLE';
      readonly basis: 'natal-placidus-cusps-ecliptic-longitude';
    };

export interface TransitPositionAtReferenceV1 {
  readonly bodyId: PlanetBodyId;
  readonly displayNamePtBr: string;
  readonly symbol: string;
  readonly eclipticLongitudeDeg: number;
  readonly tropical: {
    readonly signId: string;
    readonly signNamePtBr: string;
    readonly degreeWithinSignDeg: number;
  };
  readonly astronomicalReal: TransitAstronomicalRealProjectionV1;
  readonly natalHousePlacement: TransitNatalHousePlacementV1;
}

export type TransitNatalTargetV1 =
  | {
      readonly status: 'available';
      readonly kind: 'planet' | 'angle';
      readonly pointId: TransitNatalPointId;
      readonly displayNamePtBr: string;
      readonly eclipticLongitudeDeg: number;
    }
  | {
      readonly status: 'unavailable';
      readonly kind: 'angle';
      readonly pointId: TransitNatalAngleId;
      readonly displayNamePtBr: string;
      readonly reasonCode: 'NATAL_ANGLE_UNAVAILABLE';
    };

export type TransitAspectPhaseV1 =
  | {
      readonly status: 'available';
      readonly phase: 'applying' | 'exact' | 'separating';
      readonly probeInstantUtc: string;
      readonly referenceOrbDeg: number;
      readonly probeOrbDeg: number;
      readonly basis: 'explicit-later-snapshot-orb-comparison';
    }
  | {
      readonly status: 'unavailable';
      readonly reasonCode: 'PHASE_UNDETERMINED_FROM_PROBE';
      readonly probeInstantUtc: string;
    };

export type TransitAspectExactitudeV1 =
  | {
      readonly status: 'available';
      readonly exactAtUtc: string;
      readonly proof: {
        readonly method: 'reference-snapshot-verification' | 'provider-search-and-snapshot-verification';
        readonly verifiedSeparationDeg: number;
        readonly toleranceDeg: number;
      };
    }
  | {
      readonly status: 'unavailable';
      readonly reasonCode:
        | 'HORIZON_ZERO_NO_SEARCH'
        | 'EXACT_SEARCH_UNAVAILABLE'
        | 'NO_EXACTITUDE_WITHIN_HORIZON'
        | 'PROVIDER_RESULT_INVALID_INSTANT'
        | 'PROVIDER_RESULT_OUTSIDE_HORIZON'
        | 'PROVIDER_RESULT_NOT_EXACT';
    };

export interface TransitToNatalAspectV1 {
  readonly recordId: string;
  readonly transitPoint: {
    readonly bodyId: PlanetBodyId;
    readonly eclipticLongitudeDeg: number;
  };
  readonly natalPoint: {
    readonly kind: 'planet' | 'angle';
    readonly pointId: TransitNatalPointId;
    readonly eclipticLongitudeDeg: number;
  };
  readonly aspectId: TransitAspectId;
  readonly displayNamePtBr: string;
  readonly separationDeg: number;
  readonly exactAngleDeg: number;
  readonly allowedOrbDeg: 2;
  readonly orbDeg: number;
  readonly phase: TransitAspectPhaseV1;
  readonly exactitude: TransitAspectExactitudeV1;
}

export interface TransitRunV1 {
  readonly schemaId: typeof TRANSIT_RUN_SCHEMA_ID;
  readonly schemaVersion: typeof TRANSIT_RUN_SCHEMA_VERSION;
  readonly source: {
    readonly natal: {
      readonly schemaId: typeof POSITIONAL_SCHEMA_ID;
      readonly schemaVersion: typeof POSITIONAL_SCHEMA_VERSION;
      readonly calculationId: string;
      readonly calculatedAtUtc: string;
      readonly sourceRef: string;
      readonly payloadSha256: string;
    };
  };
  readonly request: {
    readonly referenceInstantUtc: string;
    readonly phaseProbeInstantUtc: string;
    readonly horizonDays: number;
    readonly horizonEndInstantUtc: string;
  };
  readonly targetSet: {
    readonly id: typeof TRANSIT_TARGET_SET_ID;
    readonly version: '1.0.0';
    readonly orderedTransitBodyIds: typeof TRANSIT_PLANET_BODY_IDS;
    readonly orderedNatalPointIds: typeof TRANSIT_NATAL_POINT_IDS;
    readonly transitBodyCount: 10;
    readonly natalPointCount: 12;
  };
  readonly presentationPolicy: DadosPosicionaisV2['presentationPolicy'];
  readonly models: {
    readonly aspects: typeof TRANSIT_ASPECT_PROFILE_V1;
    readonly transitProvider: TransitProviderProvenanceV1;
    readonly astronomicalReal: typeof TRANSIT_ASTRONOMICAL_REAL_MODEL_V1;
    readonly houses: {
      readonly systemId: 'placidus';
      readonly boundarySource: 'natal-dados-posicionais-v2-cusps';
      readonly intervalConvention: '[cusp,next-cusp)';
    };
  };
  readonly positionsAtReference: readonly TransitPositionAtReferenceV1[];
  readonly natalTargets: readonly TransitNatalTargetV1[];
  readonly aspects: readonly TransitToNatalAspectV1[];
  readonly diagnostics: readonly {
    readonly severity: 'info' | 'warning';
    readonly code:
      | 'NATAL_PLACIDUS_UNAVAILABLE'
      | 'NATAL_ANGLES_UNAVAILABLE'
      | 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN'
      | 'PHASE_UNDETERMINED_FROM_PROBE'
      | 'HORIZON_ZERO_NO_SEARCH'
      | 'EXACT_SEARCH_UNAVAILABLE'
      | 'EXACT_SEARCH_RESULT_REJECTED';
  }[];
}

export interface CalculateTransitRunV1Input {
  readonly natal: DadosPosicionaisV2;
  readonly natalSourceRef: string;
  readonly natalSourceSha256: string;
  readonly referenceInstantUtc: string;
  readonly horizonDays: number;
  readonly provider: TransitSnapshotProviderV1;
}

const PLANET_PRESENTATION_PT_BR: Readonly<Record<PlanetBodyId, { readonly label: string; readonly symbol: string }>> =
  Object.freeze({
    sun: { label: 'Sol', symbol: '☉' },
    moon: { label: 'Lua', symbol: '☽' },
    mercury: { label: 'Mercúrio', symbol: '☿' },
    venus: { label: 'Vênus', symbol: '♀' },
    mars: { label: 'Marte', symbol: '♂' },
    jupiter: { label: 'Júpiter', symbol: '♃' },
    saturn: { label: 'Saturno', symbol: '♄' },
    uranus: { label: 'Urano', symbol: '♅' },
    neptune: { label: 'Netuno', symbol: '♆' },
    pluto: { label: 'Plutão', symbol: '♇' },
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertExactKeys = (value: Record<string, unknown>, allowed: readonly string[], context: string): void => {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected) throw new TypeError(`${context} contém a propriedade desconhecida ${unexpected}.`);
  const missing = allowed.find((key) => !Object.hasOwn(value, key));
  if (missing) throw new TypeError(`${context} não contém a propriedade obrigatória ${missing}.`);
};

const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const parseUtcInstant = (value: unknown, context: string): number => {
  if (typeof value !== 'string' || !ISO_UTC_PATTERN.test(value)) throw new TypeError(`${context} deve ser ISO UTC.`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new RangeError(`${context} deve representar um instante UTC real.`);
  return milliseconds;
};

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const validateSha256 = (value: unknown, context: string): string => {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    throw new TypeError(`${context} deve ser um SHA-256 hexadecimal minúsculo fornecido pelo chamador.`);
  }
  return value;
};

const SOURCE_REF_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/\S+$/i;
const validateSourceRef = (value: unknown, context: string): string => {
  if (typeof value !== 'string' || value.length > 512 || !SOURCE_REF_PATTERN.test(value)) {
    throw new TypeError(`${context} deve ser uma referência de origem explícita e válida.`);
  }
  return value;
};

const validateBoundedIdentifier = (value: unknown, context: string): string => {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > 128 ||
    [...value].some((character) => character.charCodeAt(0) <= 31)
  ) {
    throw new TypeError(`${context} deve ser um identificador não vazio e limitado.`);
  }
  return value;
};

const validateProviderProvenance = (value: unknown): TransitProviderProvenanceV1 => {
  if (!isRecord(value)) throw new TypeError('A proveniência do provedor deve ser um objeto.');
  assertExactKeys(
    value,
    [
      'providerId',
      'providerVersion',
      'engineId',
      'engineVersion',
      'sourceRef',
      'sourceSha256',
      'observerOrigin',
      'apparentOrAstrometric',
      'eclipticReference',
      'equatorialReference',
    ],
    'A proveniência do provedor',
  );
  if (value.observerOrigin !== 'geocentric') throw new TypeError('O provedor deve declarar origem geocêntrica.');
  if (value.apparentOrAstrometric !== 'apparent') throw new TypeError('O provedor deve declarar posições aparentes.');
  if (value.eclipticReference !== 'true-ecliptic-of-date') {
    throw new TypeError('O provedor deve declarar a eclíptica verdadeira da data.');
  }
  if (value.equatorialReference !== 'equator-j2000') {
    throw new TypeError('O provedor deve declarar o referencial equatorial J2000.');
  }
  return {
    providerId: validateBoundedIdentifier(value.providerId, 'providerId'),
    providerVersion: validateBoundedIdentifier(value.providerVersion, 'providerVersion'),
    engineId: validateBoundedIdentifier(value.engineId, 'engineId'),
    engineVersion: validateBoundedIdentifier(value.engineVersion, 'engineVersion'),
    sourceRef: validateSourceRef(value.sourceRef, 'sourceRef do provedor'),
    sourceSha256: validateSha256(value.sourceSha256, 'sourceSha256 do provedor'),
    observerOrigin: 'geocentric',
    apparentOrAstrometric: 'apparent',
    eclipticReference: 'true-ecliptic-of-date',
    equatorialReference: 'equator-j2000',
  };
};

const validateAstronomicalRealProjection = (value: unknown, context: string): TransitAstronomicalRealProjectionV1 => {
  if (!isRecord(value)) throw new TypeError(`${context} deve ser um objeto.`);
  const degreeWithinConstellation = {
    status: 'not-defined' as const,
    reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS' as const,
  };
  const validateDegreePolicy = (candidate: unknown): void => {
    if (!isRecord(candidate)) throw new TypeError(`${context}.degreeWithinConstellation deve ser um objeto.`);
    assertExactKeys(candidate, ['status', 'reasonCode'], `${context}.degreeWithinConstellation`);
    if (
      candidate.status !== degreeWithinConstellation.status ||
      candidate.reasonCode !== degreeWithinConstellation.reasonCode
    ) {
      throw new TypeError('Constelações IAU são áreas bidimensionais e não possuem grau interno definido.');
    }
  };
  const validateCoordinates = (candidate: unknown): TransitEquatorialCoordinatesV1 => {
    if (!isRecord(candidate)) throw new TypeError(`${context}.coordinates deve ser um objeto.`);
    assertExactKeys(candidate, ['rightAscensionHours', 'declinationDeg', 'referenceFrame'], `${context}.coordinates`);
    if (
      typeof candidate.rightAscensionHours !== 'number' ||
      !Number.isFinite(candidate.rightAscensionHours) ||
      candidate.rightAscensionHours < 0 ||
      candidate.rightAscensionHours >= 24
    ) {
      throw new RangeError('A ascensão reta transitante deve permanecer em [0, 24) horas.');
    }
    if (
      typeof candidate.declinationDeg !== 'number' ||
      !Number.isFinite(candidate.declinationDeg) ||
      candidate.declinationDeg < -90 ||
      candidate.declinationDeg > 90
    ) {
      throw new RangeError('A declinação transitante deve permanecer em [-90, 90] graus.');
    }
    if (candidate.referenceFrame !== 'equatorial-j2000') {
      throw new TypeError('As coordenadas equatoriais transitantes devem declarar J2000.');
    }
    return {
      rightAscensionHours: candidate.rightAscensionHours,
      declinationDeg: candidate.declinationDeg,
      referenceFrame: 'equatorial-j2000',
    };
  };

  if (value.status === 'available') {
    assertExactKeys(value, ['status', 'coordinates', 'constellation', 'degreeWithinConstellation'], context);
    const coordinates = validateCoordinates(value.coordinates);
    if (!isRecord(value.constellation)) throw new TypeError(`${context}.constellation deve ser um objeto.`);
    assertExactKeys(value.constellation, ['iauCode', 'latinName', 'namePtBr'], `${context}.constellation`);
    if (
      typeof value.constellation.iauCode !== 'string' ||
      !/^[A-Z][A-Za-z]{2}$/.test(value.constellation.iauCode) ||
      typeof value.constellation.latinName !== 'string' ||
      value.constellation.latinName.length === 0 ||
      typeof value.constellation.namePtBr !== 'string' ||
      value.constellation.namePtBr.length === 0
    ) {
      throw new TypeError('A constelação IAU transitante deve ter código e nomes válidos.');
    }
    validateDegreePolicy(value.degreeWithinConstellation);
    return {
      status: 'available',
      coordinates,
      constellation: {
        iauCode: value.constellation.iauCode,
        latinName: value.constellation.latinName,
        namePtBr: value.constellation.namePtBr,
      },
      degreeWithinConstellation,
    };
  }
  if (value.status === 'unavailable') {
    assertExactKeys(value, ['status', 'reasonCode', 'coordinates', 'degreeWithinConstellation'], context);
    if (value.reasonCode !== 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN') {
      throw new TypeError('A classificação IAU transitante indisponível possui motivo inválido.');
    }
    const coordinates = validateCoordinates(value.coordinates);
    validateDegreePolicy(value.degreeWithinConstellation);
    return {
      status: 'unavailable',
      reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN',
      coordinates,
      degreeWithinConstellation,
    };
  }
  throw new TypeError('A classificação IAU transitante possui status inválido.');
};

const validateSnapshot = (value: unknown, expectedInstantUtc?: string): TransitSnapshotV1 => {
  if (!isRecord(value)) throw new TypeError('O snapshot de trânsito deve ser um objeto.');
  assertExactKeys(value, ['instantUtc', 'positions'], 'O snapshot de trânsito');
  parseUtcInstant(value.instantUtc, 'instantUtc do snapshot');
  if (expectedInstantUtc !== undefined && value.instantUtc !== expectedInstantUtc) {
    throw new TypeError('O provedor devolveu um snapshot para um instante diferente do solicitado.');
  }
  if (!Array.isArray(value.positions) || value.positions.length !== TRANSIT_PLANET_BODY_IDS.length) {
    throw new TypeError('O snapshot deve conter exatamente os dez corpos transitantes.');
  }
  const positions = value.positions.map((position, index): TransitSnapshotPositionV1 => {
    if (!isRecord(position)) throw new TypeError('Cada posição transitante deve ser um objeto.');
    assertExactKeys(
      position,
      ['bodyId', 'eclipticLongitudeDeg', 'astronomicalReal'],
      `A posição transitante ${index + 1}`,
    );
    if (position.bodyId !== TRANSIT_PLANET_BODY_IDS[index]) {
      throw new TypeError('Os corpos transitantes devem permanecer completos, únicos e na ordem canônica.');
    }
    if (
      typeof position.eclipticLongitudeDeg !== 'number' ||
      !Number.isFinite(position.eclipticLongitudeDeg) ||
      position.eclipticLongitudeDeg < 0 ||
      position.eclipticLongitudeDeg >= 360
    ) {
      throw new RangeError('Cada longitude transitante deve permanecer em [0, 360).');
    }
    return {
      bodyId: TRANSIT_PLANET_BODY_IDS[index]!,
      eclipticLongitudeDeg: position.eclipticLongitudeDeg,
      astronomicalReal: validateAstronomicalRealProjection(
        position.astronomicalReal,
        `A posição transitante ${index + 1}.astronomicalReal`,
      ),
    };
  });
  return { instantUtc: value.instantUtc as string, positions };
};

export function resolveTransitAspect(separationDeg: number): ResolvedTransitAspectV1 | null {
  if (!Number.isFinite(separationDeg) || separationDeg < 0 || separationDeg > 180) {
    throw new RangeError('A separação angular deve permanecer entre 0° e 180°.');
  }
  for (const definition of TRANSIT_ASPECT_PROFILE_V1.aspectDefinitions) {
    const orbDeg = Math.abs(separationDeg - definition.exactAngleDeg);
    if (orbDeg <= definition.allowedOrbDeg + Number.EPSILON) return { ...definition, orbDeg };
  }
  return null;
}

const buildNatalTargets = (natal: DadosPosicionaisV2): readonly TransitNatalTargetV1[] => {
  const planets: TransitNatalTargetV1[] = natal.positions.map((position) => ({
    status: 'available',
    kind: 'planet',
    pointId: position.bodyId,
    displayNamePtBr: position.displayNamePtBr,
    eclipticLongitudeDeg: position.coordinates.eclipticLongitudeDeg,
  }));
  const angles: TransitNatalTargetV1[] = (['ascendant', 'midheaven'] as const).map((angleId) => {
    const angle = natal.angles.find((candidate) => candidate.angleId === angleId);
    return angle
      ? {
          status: 'available',
          kind: 'angle',
          pointId: angleId,
          displayNamePtBr: angle.displayNamePtBr,
          eclipticLongitudeDeg: angle.eclipticLongitudeDeg,
        }
      : {
          status: 'unavailable',
          kind: 'angle',
          pointId: angleId,
          displayNamePtBr: angleId === 'ascendant' ? 'Ascendente' : 'Meio do Céu',
          reasonCode: 'NATAL_ANGLE_UNAVAILABLE',
        };
  });
  return [...planets, ...angles];
};

const buildPositionsAtReference = (
  snapshot: TransitSnapshotV1,
  natal: DadosPosicionaisV2,
): readonly TransitPositionAtReferenceV1[] => {
  const cusps =
    natal.houses.status === 'available'
      ? natal.houses.cusps.map(({ houseIndex1, eclipticLongitudeDeg }) => ({ houseIndex1, eclipticLongitudeDeg }))
      : null;
  return snapshot.positions.map((position) => {
    const tropical = projectTropical(position.eclipticLongitudeDeg);
    const presentation = PLANET_PRESENTATION_PT_BR[position.bodyId];
    return {
      bodyId: position.bodyId,
      displayNamePtBr: presentation.label,
      symbol: presentation.symbol,
      eclipticLongitudeDeg: position.eclipticLongitudeDeg,
      tropical: {
        signId: tropical.sign.id,
        signNamePtBr: tropical.sign.namePtBr,
        degreeWithinSignDeg: tropical.degreeWithinSignDeg,
      },
      astronomicalReal: position.astronomicalReal,
      natalHousePlacement: cusps
        ? {
            status: 'available' as const,
            houseIndex1: houseIndexForLongitude(position.eclipticLongitudeDeg, cusps),
            basis: 'natal-placidus-cusps-ecliptic-longitude' as const,
            intervalConvention: '[cusp,next-cusp)' as const,
          }
        : {
            status: 'unavailable' as const,
            reasonCode: 'NATAL_PLACIDUS_UNAVAILABLE' as const,
            basis: 'natal-placidus-cusps-ecliptic-longitude' as const,
          },
    };
  });
};

const determinePhase = (
  referenceOrbDeg: number,
  exactAngleDeg: number,
  transitBodyId: PlanetBodyId,
  natalLongitudeDeg: number,
  probe: TransitSnapshotV1,
): TransitAspectPhaseV1 => {
  const probePosition = probe.positions.find(({ bodyId }) => bodyId === transitBodyId);
  if (!probePosition) throw new TypeError(`O probe não contém ${transitBodyId}.`);
  const probeSeparationDeg = angularSeparationDeg(probePosition.eclipticLongitudeDeg, natalLongitudeDeg);
  const probeOrbDeg = Math.abs(probeSeparationDeg - exactAngleDeg);
  if (referenceOrbDeg <= TRANSIT_ASPECT_PROFILE_V1.exactToleranceDeg) {
    return {
      status: 'available',
      phase: 'exact',
      probeInstantUtc: probe.instantUtc,
      referenceOrbDeg,
      probeOrbDeg,
      basis: 'explicit-later-snapshot-orb-comparison',
    };
  }
  if (Math.abs(probeOrbDeg - referenceOrbDeg) <= TRANSIT_ASPECT_PROFILE_V1.exactToleranceDeg) {
    return { status: 'unavailable', reasonCode: 'PHASE_UNDETERMINED_FROM_PROBE', probeInstantUtc: probe.instantUtc };
  }
  return {
    status: 'available',
    phase: probeOrbDeg < referenceOrbDeg ? 'applying' : 'separating',
    probeInstantUtc: probe.instantUtc,
    referenceOrbDeg,
    probeOrbDeg,
    basis: 'explicit-later-snapshot-orb-comparison',
  };
};

const validateSearchResult = (value: unknown): TransitExactSearchResultV1 => {
  if (!isRecord(value)) throw new TypeError('O resultado da busca de exatidão deve ser um objeto.');
  if (value.status === 'found') {
    assertExactKeys(value, ['status', 'exactAtUtc'], 'O resultado encontrado');
    return { status: 'found', exactAtUtc: String(value.exactAtUtc) };
  }
  if (value.status === 'not-found') {
    assertExactKeys(value, ['status', 'reasonCode'], 'O resultado não encontrado');
    if (value.reasonCode !== 'NO_EXACTITUDE_WITHIN_HORIZON') {
      throw new TypeError('O buscador devolveu um reasonCode não reconhecido.');
    }
    return { status: 'not-found', reasonCode: 'NO_EXACTITUDE_WITHIN_HORIZON' };
  }
  throw new TypeError('O buscador devolveu um status não reconhecido.');
};

const determineExactitude = (
  aspect: ResolvedTransitAspectV1,
  transitBodyId: PlanetBodyId,
  natalPointId: TransitNatalPointId,
  natalLongitudeDeg: number,
  referenceSeparationDeg: number,
  referenceInstantUtc: string,
  horizonDays: number,
  horizonEndInstantUtc: string,
  provider: TransitSnapshotProviderV1,
): TransitAspectExactitudeV1 => {
  if (aspect.orbDeg <= TRANSIT_ASPECT_PROFILE_V1.exactToleranceDeg) {
    return {
      status: 'available',
      exactAtUtc: referenceInstantUtc,
      proof: {
        method: 'reference-snapshot-verification',
        verifiedSeparationDeg: referenceSeparationDeg,
        toleranceDeg: TRANSIT_ASPECT_PROFILE_V1.exactToleranceDeg,
      },
    };
  }
  if (horizonDays === 0) return { status: 'unavailable', reasonCode: 'HORIZON_ZERO_NO_SEARCH' };
  if (!provider.searchExactAspect) return { status: 'unavailable', reasonCode: 'EXACT_SEARCH_UNAVAILABLE' };

  const searchResult = validateSearchResult(
    provider.searchExactAspect({
      startInstantUtc: referenceInstantUtc,
      endInstantUtc: horizonEndInstantUtc,
      transitBodyId,
      natalPointId,
      natalLongitudeDeg,
      aspectId: aspect.aspectId,
      exactAngleDeg: aspect.exactAngleDeg,
    }),
  );
  if (searchResult.status === 'not-found') return { status: 'unavailable', reasonCode: searchResult.reasonCode };

  let exactMilliseconds: number;
  try {
    exactMilliseconds = parseUtcInstant(searchResult.exactAtUtc, 'exactAtUtc do provedor');
  } catch {
    return { status: 'unavailable', reasonCode: 'PROVIDER_RESULT_INVALID_INSTANT' };
  }
  const referenceMilliseconds = parseUtcInstant(referenceInstantUtc, 'referenceInstantUtc');
  const endMilliseconds = parseUtcInstant(horizonEndInstantUtc, 'horizonEndInstantUtc');
  if (exactMilliseconds < referenceMilliseconds || exactMilliseconds > endMilliseconds) {
    return { status: 'unavailable', reasonCode: 'PROVIDER_RESULT_OUTSIDE_HORIZON' };
  }

  const exactSnapshot = validateSnapshot(provider.getSnapshot(searchResult.exactAtUtc), searchResult.exactAtUtc);
  const transitPosition = exactSnapshot.positions.find(({ bodyId }) => bodyId === transitBodyId);
  if (!transitPosition) throw new TypeError(`O snapshot de prova não contém ${transitBodyId}.`);
  const verifiedSeparationDeg = angularSeparationDeg(transitPosition.eclipticLongitudeDeg, natalLongitudeDeg);
  if (Math.abs(verifiedSeparationDeg - aspect.exactAngleDeg) > TRANSIT_ASPECT_PROFILE_V1.exactToleranceDeg) {
    return { status: 'unavailable', reasonCode: 'PROVIDER_RESULT_NOT_EXACT' };
  }
  return {
    status: 'available',
    exactAtUtc: searchResult.exactAtUtc,
    proof: {
      method: 'provider-search-and-snapshot-verification',
      verifiedSeparationDeg,
      toleranceDeg: TRANSIT_ASPECT_PROFILE_V1.exactToleranceDeg,
    },
  };
};

const calculateAspects = (
  reference: TransitSnapshotV1,
  probe: TransitSnapshotV1,
  natalTargets: readonly TransitNatalTargetV1[],
  referenceInstantUtc: string,
  horizonDays: number,
  horizonEndInstantUtc: string,
  provider: TransitSnapshotProviderV1,
): readonly TransitToNatalAspectV1[] => {
  const aspects: TransitToNatalAspectV1[] = [];
  for (const transitPosition of reference.positions) {
    for (const natalTarget of natalTargets) {
      if (natalTarget.status !== 'available') continue;
      const separationDeg = angularSeparationDeg(
        transitPosition.eclipticLongitudeDeg,
        natalTarget.eclipticLongitudeDeg,
      );
      const aspect = resolveTransitAspect(separationDeg);
      if (!aspect) continue;
      aspects.push({
        recordId: `transit:${transitPosition.bodyId}|natal:${natalTarget.pointId}|${aspect.aspectId}`,
        transitPoint: {
          bodyId: transitPosition.bodyId,
          eclipticLongitudeDeg: transitPosition.eclipticLongitudeDeg,
        },
        natalPoint: {
          kind: natalTarget.kind,
          pointId: natalTarget.pointId,
          eclipticLongitudeDeg: natalTarget.eclipticLongitudeDeg,
        },
        aspectId: aspect.aspectId,
        displayNamePtBr: aspect.displayNamePtBr,
        separationDeg,
        exactAngleDeg: aspect.exactAngleDeg,
        allowedOrbDeg: aspect.allowedOrbDeg,
        orbDeg: aspect.orbDeg,
        phase: determinePhase(
          aspect.orbDeg,
          aspect.exactAngleDeg,
          transitPosition.bodyId,
          natalTarget.eclipticLongitudeDeg,
          probe,
        ),
        exactitude: determineExactitude(
          aspect,
          transitPosition.bodyId,
          natalTarget.pointId,
          natalTarget.eclipticLongitudeDeg,
          separationDeg,
          referenceInstantUtc,
          horizonDays,
          horizonEndInstantUtc,
          provider,
        ),
      });
    }
  }
  return aspects;
};

const buildDiagnostics = (
  natal: DadosPosicionaisV2,
  positions: readonly TransitPositionAtReferenceV1[],
  aspects: readonly TransitToNatalAspectV1[],
  horizonDays: number,
): TransitRunV1['diagnostics'] => {
  const diagnostics: TransitRunV1['diagnostics'][number][] = [];
  if (natal.houses.status === 'unavailable') {
    diagnostics.push({ severity: 'warning', code: 'NATAL_PLACIDUS_UNAVAILABLE' });
  }
  if (natal.angles.length !== 2) diagnostics.push({ severity: 'warning', code: 'NATAL_ANGLES_UNAVAILABLE' });
  if (positions.some(({ astronomicalReal }) => astronomicalReal.status === 'unavailable')) {
    diagnostics.push({ severity: 'warning', code: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN' });
  }
  if (aspects.some(({ phase }) => phase.status === 'unavailable')) {
    diagnostics.push({ severity: 'warning', code: 'PHASE_UNDETERMINED_FROM_PROBE' });
  }
  if (horizonDays === 0 && aspects.some(({ exactitude }) => exactitude.status === 'unavailable')) {
    diagnostics.push({ severity: 'info', code: 'HORIZON_ZERO_NO_SEARCH' });
  }
  if (
    aspects.some(
      ({ exactitude }) => exactitude.status === 'unavailable' && exactitude.reasonCode === 'EXACT_SEARCH_UNAVAILABLE',
    )
  ) {
    diagnostics.push({ severity: 'info', code: 'EXACT_SEARCH_UNAVAILABLE' });
  }
  if (
    aspects.some(
      ({ exactitude }) =>
        exactitude.status === 'unavailable' &&
        ['PROVIDER_RESULT_INVALID_INSTANT', 'PROVIDER_RESULT_OUTSIDE_HORIZON', 'PROVIDER_RESULT_NOT_EXACT'].includes(
          exactitude.reasonCode,
        ),
    )
  ) {
    diagnostics.push({ severity: 'warning', code: 'EXACT_SEARCH_RESULT_REJECTED' });
  }
  return diagnostics;
};

export function calculateTransitRunV1(input: CalculateTransitRunV1Input): TransitRunV1 {
  if (!isRecord(input)) throw new TypeError('A entrada do trânsito deve ser um objeto.');
  assertExactKeys(
    input as unknown as Record<string, unknown>,
    ['natal', 'natalSourceRef', 'natalSourceSha256', 'referenceInstantUtc', 'horizonDays', 'provider'],
    'A entrada do trânsito',
  );
  const natalValidation = validateDadosPosicionaisV2(input.natal);
  if (!natalValidation.valid) throw new TypeError('O mapa natal não é um DadosPosicionaisV2 canônico válido.');
  const natalSourceRef = validateSourceRef(input.natalSourceRef, 'natalSourceRef');
  const natalSourceSha256 = validateSha256(input.natalSourceSha256, 'natalSourceSha256');
  const referenceMilliseconds = parseUtcInstant(input.referenceInstantUtc, 'referenceInstantUtc');
  if (!Number.isInteger(input.horizonDays) || input.horizonDays < 0 || input.horizonDays > 30) {
    throw new RangeError('O horizonte deve ser um número inteiro entre 0 e 30 dias.');
  }
  if (!input.provider || typeof input.provider.getSnapshot !== 'function') {
    throw new TypeError('O provedor de snapshots transitantes é obrigatório.');
  }
  if (typeof input.provider.getPhaseProbeSnapshot !== 'function') {
    throw new TypeError('O provedor deve fornecer um snapshot posterior explícito para a fase.');
  }
  const providerProvenance = validateProviderProvenance(input.provider.provenance);
  const reference = validateSnapshot(input.provider.getSnapshot(input.referenceInstantUtc), input.referenceInstantUtc);
  const probe = validateSnapshot(input.provider.getPhaseProbeSnapshot(input.referenceInstantUtc));
  if (parseUtcInstant(probe.instantUtc, 'phaseProbeInstantUtc') <= referenceMilliseconds) {
    throw new RangeError('O snapshot de fase deve ser estritamente posterior ao instante de referência.');
  }
  const horizonEndInstantUtc = new Date(referenceMilliseconds + input.horizonDays * 86_400_000).toISOString();
  const natalTargets = buildNatalTargets(input.natal);
  const aspects = calculateAspects(
    reference,
    probe,
    natalTargets,
    input.referenceInstantUtc,
    input.horizonDays,
    horizonEndInstantUtc,
    input.provider,
  );
  const positionsAtReference = buildPositionsAtReference(reference, input.natal);

  return {
    schemaId: TRANSIT_RUN_SCHEMA_ID,
    schemaVersion: TRANSIT_RUN_SCHEMA_VERSION,
    source: {
      natal: {
        schemaId: POSITIONAL_SCHEMA_ID,
        schemaVersion: POSITIONAL_SCHEMA_VERSION,
        calculationId: input.natal.calculationId,
        calculatedAtUtc: input.natal.calculatedAtUtc,
        sourceRef: natalSourceRef,
        payloadSha256: natalSourceSha256,
      },
    },
    request: {
      referenceInstantUtc: input.referenceInstantUtc,
      phaseProbeInstantUtc: probe.instantUtc,
      horizonDays: input.horizonDays,
      horizonEndInstantUtc,
    },
    targetSet: {
      id: TRANSIT_TARGET_SET_ID,
      version: '1.0.0',
      orderedTransitBodyIds: TRANSIT_PLANET_BODY_IDS,
      orderedNatalPointIds: TRANSIT_NATAL_POINT_IDS,
      transitBodyCount: 10,
      natalPointCount: 12,
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
      aspects: TRANSIT_ASPECT_PROFILE_V1,
      transitProvider: providerProvenance,
      astronomicalReal: TRANSIT_ASTRONOMICAL_REAL_MODEL_V1,
      houses: {
        systemId: 'placidus',
        boundarySource: 'natal-dados-posicionais-v2-cusps',
        intervalConvention: '[cusp,next-cusp)',
      },
    },
    positionsAtReference,
    natalTargets,
    aspects,
    diagnostics: buildDiagnostics(input.natal, positionsAtReference, aspects, input.horizonDays),
  };
}
