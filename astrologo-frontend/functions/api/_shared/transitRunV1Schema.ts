import { POSITIONAL_SCHEMA_ID, POSITIONAL_SCHEMA_VERSION, projectTropical } from './positionV2';
import { angularSeparationDeg } from './synastryRunV1';
import {
  resolveTransitAspect,
  TRANSIT_ASPECT_PROFILE_V1,
  TRANSIT_ASTRONOMICAL_REAL_MODEL_V1,
  TRANSIT_NATAL_POINT_IDS,
  TRANSIT_PLANET_BODY_IDS,
  TRANSIT_RUN_SCHEMA_ID,
  TRANSIT_RUN_SCHEMA_VERSION,
  TRANSIT_TARGET_SET_ID,
  type TransitRunV1,
} from './transitRunV1';

export interface TransitRunV1ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type TransitRunV1ValidationResult =
  | { readonly valid: true; readonly value: TransitRunV1 }
  | { readonly valid: false; readonly errors: readonly TransitRunV1ValidationIssue[] };

const ROOT_KEYS = [
  'schemaId',
  'schemaVersion',
  'source',
  'request',
  'targetSet',
  'presentationPolicy',
  'models',
  'positionsAtReference',
  'natalTargets',
  'aspects',
  'diagnostics',
] as const;

const PLANET_PRESENTATION_PT_BR = {
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
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const addIssue = (errors: TransitRunV1ValidationIssue[], path: string, message: string): void => {
  errors.push({ path, message });
};

const exactKeys = (
  value: unknown,
  allowed: readonly string[],
  path: string,
  errors: TransitRunV1ValidationIssue[],
): value is Record<string, unknown> => {
  if (!isRecord(value)) {
    addIssue(errors, path, 'deve ser um objeto');
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) addIssue(errors, `${path}/${key}`, 'propriedade extra não permitida');
  }
  for (const key of allowed) {
    if (!Object.hasOwn(value, key)) addIssue(errors, `${path}/${key}`, 'propriedade obrigatória ausente');
  }
  return true;
};

const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const instantMilliseconds = (value: unknown): number | null => {
  if (typeof value !== 'string' || !ISO_UTC_PATTERN.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isSha256 = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isSourceRef = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 512 && /^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(value);
const sameNumber = (left: unknown, right: number, tolerance = 1e-9): boolean =>
  typeof left === 'number' && Number.isFinite(left) && Math.abs(left - right) <= tolerance;
const finiteInRange = (value: unknown, minimum: number, maximumExclusive: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= minimum && value < maximumExclusive;
const bodyRank = (value: unknown): number =>
  typeof value === 'string' ? (TRANSIT_PLANET_BODY_IDS as readonly string[]).indexOf(value) : -1;
const natalPointRank = (value: unknown): number =>
  typeof value === 'string' ? (TRANSIT_NATAL_POINT_IDS as readonly string[]).indexOf(value) : -1;

const validateSource = (value: unknown, errors: TransitRunV1ValidationIssue[]): void => {
  if (!exactKeys(value, ['natal'], '/source', errors)) return;
  if (
    !exactKeys(
      value.natal,
      ['schemaId', 'schemaVersion', 'calculationId', 'calculatedAtUtc', 'sourceRef', 'payloadSha256'],
      '/source/natal',
      errors,
    )
  ) {
    return;
  }
  if (value.natal.schemaId !== POSITIONAL_SCHEMA_ID) addIssue(errors, '/source/natal/schemaId', 'schemaId inválido');
  if (value.natal.schemaVersion !== POSITIONAL_SCHEMA_VERSION) {
    addIssue(errors, '/source/natal/schemaVersion', 'schemaVersion inválida');
  }
  if (
    typeof value.natal.calculationId !== 'string' ||
    value.natal.calculationId.length < 1 ||
    value.natal.calculationId.length > 128
  ) {
    addIssue(errors, '/source/natal/calculationId', 'calculationId inválido');
  }
  if (instantMilliseconds(value.natal.calculatedAtUtc) === null) {
    addIssue(errors, '/source/natal/calculatedAtUtc', 'instante ISO UTC inválido');
  }
  if (!isSourceRef(value.natal.sourceRef)) addIssue(errors, '/source/natal/sourceRef', 'referência inválida');
  if (!isSha256(value.natal.payloadSha256)) addIssue(errors, '/source/natal/payloadSha256', 'SHA-256 inválido');
};

interface ValidatedRequest {
  readonly referenceMs: number | null;
  readonly probeMs: number | null;
  readonly endMs: number | null;
  readonly horizonDays: number | null;
}

const validateRequest = (value: unknown, errors: TransitRunV1ValidationIssue[]): ValidatedRequest => {
  const empty = { referenceMs: null, probeMs: null, endMs: null, horizonDays: null };
  if (
    !exactKeys(
      value,
      ['referenceInstantUtc', 'phaseProbeInstantUtc', 'horizonDays', 'horizonEndInstantUtc'],
      '/request',
      errors,
    )
  ) {
    return empty;
  }
  const referenceMs = instantMilliseconds(value.referenceInstantUtc);
  const probeMs = instantMilliseconds(value.phaseProbeInstantUtc);
  const endMs = instantMilliseconds(value.horizonEndInstantUtc);
  const horizonDays = Number.isInteger(value.horizonDays) ? Number(value.horizonDays) : null;
  if (referenceMs === null) addIssue(errors, '/request/referenceInstantUtc', 'instante ISO UTC inválido');
  if (probeMs === null) addIssue(errors, '/request/phaseProbeInstantUtc', 'instante ISO UTC inválido');
  if (endMs === null) addIssue(errors, '/request/horizonEndInstantUtc', 'instante ISO UTC inválido');
  if (horizonDays === null || horizonDays < 0 || horizonDays > 30) {
    addIssue(errors, '/request/horizonDays', 'horizonte deve ser inteiro entre 0 e 30');
  }
  if (referenceMs !== null && probeMs !== null && probeMs <= referenceMs) {
    addIssue(errors, '/request/phaseProbeInstantUtc', 'probe deve ser posterior à referência');
  }
  if (referenceMs !== null && endMs !== null && horizonDays !== null) {
    const expectedEnd = referenceMs + horizonDays * 86_400_000;
    if (endMs !== expectedEnd) addIssue(errors, '/request/horizonEndInstantUtc', 'fim incoerente com o horizonte');
  }
  return { referenceMs, probeMs, endMs, horizonDays };
};

const validateTargetSet = (value: unknown, errors: TransitRunV1ValidationIssue[]): void => {
  if (
    !exactKeys(
      value,
      ['id', 'version', 'orderedTransitBodyIds', 'orderedNatalPointIds', 'transitBodyCount', 'natalPointCount'],
      '/targetSet',
      errors,
    )
  ) {
    return;
  }
  if (value.id !== TRANSIT_TARGET_SET_ID) addIssue(errors, '/targetSet/id', 'target set inválido');
  if (value.version !== '1.0.0') addIssue(errors, '/targetSet/version', 'versão inválida');
  if (
    !Array.isArray(value.orderedTransitBodyIds) ||
    value.orderedTransitBodyIds.length !== TRANSIT_PLANET_BODY_IDS.length ||
    value.orderedTransitBodyIds.some((bodyId, index) => bodyId !== TRANSIT_PLANET_BODY_IDS[index])
  ) {
    addIssue(errors, '/targetSet/orderedTransitBodyIds', 'corpos transitantes inválidos ou fora da ordem');
  }
  if (
    !Array.isArray(value.orderedNatalPointIds) ||
    value.orderedNatalPointIds.length !== TRANSIT_NATAL_POINT_IDS.length ||
    value.orderedNatalPointIds.some((pointId, index) => pointId !== TRANSIT_NATAL_POINT_IDS[index])
  ) {
    addIssue(errors, '/targetSet/orderedNatalPointIds', 'pontos natais inválidos ou fora da ordem');
  }
  if (value.transitBodyCount !== 10) addIssue(errors, '/targetSet/transitBodyCount', 'contagem deve ser 10');
  if (value.natalPointCount !== 12) addIssue(errors, '/targetSet/natalPointCount', 'contagem deve ser 12');
};

const validatePresentationPolicy = (value: unknown, errors: TransitRunV1ValidationIssue[]): void => {
  const expected = {
    locale: 'pt-BR',
    timeZone: 'America/Sao_Paulo',
    timeZoneLabel: 'Hora oficial de Brasília',
    calendar: 'gregory',
    numberingSystem: 'latn',
    hourCycle: 'h23',
  };
  if (
    exactKeys(
      value,
      ['locale', 'timeZone', 'timeZoneLabel', 'calendar', 'numberingSystem', 'hourCycle'],
      '/presentationPolicy',
      errors,
    ) &&
    JSON.stringify(value) !== JSON.stringify(expected)
  ) {
    addIssue(errors, '/presentationPolicy', 'política pública inválida');
  }
};

const validateProviderProvenance = (value: unknown, path: string, errors: TransitRunV1ValidationIssue[]): void => {
  if (
    !exactKeys(
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
      path,
      errors,
    )
  ) {
    return;
  }
  for (const key of ['providerId', 'providerVersion', 'engineId', 'engineVersion'] as const) {
    if (
      typeof value[key] !== 'string' ||
      value[key].length < 1 ||
      value[key].length > 128 ||
      [...value[key]].some((character) => character.charCodeAt(0) <= 31)
    ) {
      addIssue(errors, `${path}/${key}`, 'identificador inválido');
    }
  }
  if (!isSourceRef(value.sourceRef)) addIssue(errors, `${path}/sourceRef`, 'referência inválida');
  if (!isSha256(value.sourceSha256)) addIssue(errors, `${path}/sourceSha256`, 'SHA-256 inválido');
  if (value.observerOrigin !== 'geocentric') addIssue(errors, `${path}/observerOrigin`, 'origem inválida');
  if (value.apparentOrAstrometric !== 'apparent') {
    addIssue(errors, `${path}/apparentOrAstrometric`, 'referência aparente inválida');
  }
  if (value.eclipticReference !== 'true-ecliptic-of-date') {
    addIssue(errors, `${path}/eclipticReference`, 'referência eclíptica inválida');
  }
  if (value.equatorialReference !== 'equator-j2000') {
    addIssue(errors, `${path}/equatorialReference`, 'referência equatorial inválida');
  }
};

const validateModels = (value: unknown, errors: TransitRunV1ValidationIssue[]): void => {
  if (!exactKeys(value, ['aspects', 'transitProvider', 'astronomicalReal', 'houses'], '/models', errors)) return;
  if (JSON.stringify(value.aspects) !== JSON.stringify(TRANSIT_ASPECT_PROFILE_V1)) {
    addIssue(errors, '/models/aspects', 'perfil de aspectos adulterado');
  }
  validateProviderProvenance(value.transitProvider, '/models/transitProvider', errors);
  if (JSON.stringify(value.astronomicalReal) !== JSON.stringify(TRANSIT_ASTRONOMICAL_REAL_MODEL_V1)) {
    addIssue(errors, '/models/astronomicalReal', 'modelo de classificação IAU adulterado');
  }
  const expectedHouses = {
    systemId: 'placidus',
    boundarySource: 'natal-dados-posicionais-v2-cusps',
    intervalConvention: '[cusp,next-cusp)',
  };
  if (
    !exactKeys(value.houses, ['systemId', 'boundarySource', 'intervalConvention'], '/models/houses', errors) ||
    JSON.stringify(value.houses) !== JSON.stringify(expectedHouses)
  ) {
    addIssue(errors, '/models/houses', 'modelo de casas inválido');
  }
};

const validateHousePlacement = (
  value: unknown,
  path: string,
  errors: TransitRunV1ValidationIssue[],
): 'available' | 'unavailable' | null => {
  if (!isRecord(value)) {
    addIssue(errors, path, 'deve ser um objeto');
    return null;
  }
  if (value.status === 'available') {
    exactKeys(value, ['status', 'houseIndex1', 'basis', 'intervalConvention'], path, errors);
    if (!Number.isInteger(value.houseIndex1) || Number(value.houseIndex1) < 1 || Number(value.houseIndex1) > 12) {
      addIssue(errors, `${path}/houseIndex1`, 'casa inválida');
    }
    if (value.intervalConvention !== '[cusp,next-cusp)') {
      addIssue(errors, `${path}/intervalConvention`, 'convenção inválida');
    }
  } else if (value.status === 'unavailable') {
    exactKeys(value, ['status', 'reasonCode', 'basis'], path, errors);
    if (value.reasonCode !== 'NATAL_PLACIDUS_UNAVAILABLE') {
      addIssue(errors, `${path}/reasonCode`, 'motivo inválido');
    }
  } else {
    addIssue(errors, `${path}/status`, 'status inválido');
    return null;
  }
  if (value.basis !== 'natal-placidus-cusps-ecliptic-longitude') {
    addIssue(errors, `${path}/basis`, 'base inválida');
  }
  return value.status;
};

interface PositionIndex {
  readonly byBodyId: ReadonlyMap<string, { readonly longitudeDeg: number }>;
  readonly houseStatus: 'available' | 'unavailable' | 'mixed' | null;
  readonly iauUnavailable: boolean;
}

const validateAstronomicalReal = (
  value: unknown,
  path: string,
  errors: TransitRunV1ValidationIssue[],
): 'available' | 'unavailable' | null => {
  if (!isRecord(value)) {
    addIssue(errors, path, 'deve ser um objeto');
    return null;
  }
  const validateCoordinates = (candidate: unknown): void => {
    const coordinatePath = `${path}/coordinates`;
    if (!exactKeys(candidate, ['rightAscensionHours', 'declinationDeg', 'referenceFrame'], coordinatePath, errors)) {
      return;
    }
    if (!finiteInRange(candidate.rightAscensionHours, 0, 24)) {
      addIssue(errors, `${coordinatePath}/rightAscensionHours`, 'ascensão reta deve permanecer em [0, 24)');
    }
    if (
      typeof candidate.declinationDeg !== 'number' ||
      !Number.isFinite(candidate.declinationDeg) ||
      candidate.declinationDeg < -90 ||
      candidate.declinationDeg > 90
    ) {
      addIssue(errors, `${coordinatePath}/declinationDeg`, 'declinação deve permanecer em [-90, 90]');
    }
    if (candidate.referenceFrame !== 'equatorial-j2000') {
      addIssue(errors, `${coordinatePath}/referenceFrame`, 'referencial deve ser equatorial J2000');
    }
  };
  const validateDegreePolicy = (candidate: unknown): void => {
    const degreePath = `${path}/degreeWithinConstellation`;
    if (!exactKeys(candidate, ['status', 'reasonCode'], degreePath, errors)) return;
    if (candidate.status !== 'not-defined' || candidate.reasonCode !== 'IAU_CONSTELLATIONS_ARE_2D_AREAS') {
      addIssue(errors, degreePath, 'constelações IAU são áreas 2D sem grau interno definido');
    }
  };

  if (value.status === 'available') {
    exactKeys(value, ['status', 'coordinates', 'constellation', 'degreeWithinConstellation'], path, errors);
    validateCoordinates(value.coordinates);
    if (
      exactKeys(value.constellation, ['iauCode', 'latinName', 'namePtBr'], `${path}/constellation`, errors) &&
      (typeof value.constellation.iauCode !== 'string' ||
        !/^[A-Z][A-Za-z]{2}$/.test(value.constellation.iauCode) ||
        typeof value.constellation.latinName !== 'string' ||
        value.constellation.latinName.length === 0 ||
        typeof value.constellation.namePtBr !== 'string' ||
        value.constellation.namePtBr.length === 0)
    ) {
      addIssue(errors, `${path}/constellation`, 'identificação IAU inválida');
    }
    validateDegreePolicy(value.degreeWithinConstellation);
    return 'available';
  }
  if (value.status === 'unavailable') {
    exactKeys(value, ['status', 'reasonCode', 'coordinates', 'degreeWithinConstellation'], path, errors);
    if (value.reasonCode !== 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN') {
      addIssue(errors, `${path}/reasonCode`, 'motivo de indisponibilidade IAU inválido');
    }
    validateCoordinates(value.coordinates);
    validateDegreePolicy(value.degreeWithinConstellation);
    return 'unavailable';
  }
  addIssue(errors, `${path}/status`, 'status IAU inválido');
  return null;
};

const validatePositions = (value: unknown, errors: TransitRunV1ValidationIssue[]): PositionIndex => {
  const byBodyId = new Map<string, { longitudeDeg: number }>();
  if (!Array.isArray(value)) {
    addIssue(errors, '/positionsAtReference', 'deve ser uma lista');
    return { byBodyId, houseStatus: null, iauUnavailable: false };
  }
  if (value.length !== TRANSIT_PLANET_BODY_IDS.length) {
    addIssue(errors, '/positionsAtReference', 'deve conter os dez corpos');
  }
  const houseStatuses = new Set<'available' | 'unavailable'>();
  value.forEach((position, index) => {
    const path = `/positionsAtReference/${index}`;
    if (
      !exactKeys(
        position,
        [
          'bodyId',
          'displayNamePtBr',
          'symbol',
          'eclipticLongitudeDeg',
          'tropical',
          'astronomicalReal',
          'natalHousePlacement',
        ],
        path,
        errors,
      )
    ) {
      return;
    }
    const expectedBodyId = TRANSIT_PLANET_BODY_IDS[index];
    if (position.bodyId !== expectedBodyId)
      addIssue(errors, `${path}/bodyId`, 'corpo duplicado, ausente ou fora da ordem');
    if (!expectedBodyId) return;
    const expectedPresentation = PLANET_PRESENTATION_PT_BR[expectedBodyId];
    if (position.displayNamePtBr !== expectedPresentation.label) {
      addIssue(errors, `${path}/displayNamePtBr`, 'nome público inválido');
    }
    if (position.symbol !== expectedPresentation.symbol) addIssue(errors, `${path}/symbol`, 'símbolo inválido');
    if (!finiteInRange(position.eclipticLongitudeDeg, 0, 360)) {
      addIssue(errors, `${path}/eclipticLongitudeDeg`, 'longitude inválida');
      return;
    }
    byBodyId.set(expectedBodyId, { longitudeDeg: position.eclipticLongitudeDeg });
    const projected = projectTropical(position.eclipticLongitudeDeg);
    if (
      !exactKeys(position.tropical, ['signId', 'signNamePtBr', 'degreeWithinSignDeg'], `${path}/tropical`, errors) ||
      position.tropical.signId !== projected.sign.id ||
      position.tropical.signNamePtBr !== projected.sign.namePtBr ||
      !sameNumber(position.tropical.degreeWithinSignDeg, projected.degreeWithinSignDeg)
    ) {
      addIssue(errors, `${path}/tropical`, 'projeção tropical incoerente');
    }
    const houseStatus = validateHousePlacement(position.natalHousePlacement, `${path}/natalHousePlacement`, errors);
    if (houseStatus) houseStatuses.add(houseStatus);
    validateAstronomicalReal(position.astronomicalReal, `${path}/astronomicalReal`, errors);
  });
  const houseStatus = houseStatuses.size > 1 ? 'mixed' : (houseStatuses.values().next().value ?? null);
  if (houseStatus === 'mixed') {
    addIssue(errors, '/positionsAtReference', 'disponibilidade de Placidus deve ser uniforme');
  }
  return {
    byBodyId,
    houseStatus,
    iauUnavailable: value.some(
      (position) =>
        isRecord(position) && isRecord(position.astronomicalReal) && position.astronomicalReal.status === 'unavailable',
    ),
  };
};

interface NatalTargetIndex {
  readonly byPointId: ReadonlyMap<string, { readonly kind: 'planet' | 'angle'; readonly longitudeDeg: number }>;
  readonly anglesAvailable: boolean;
}

const validateNatalTargets = (value: unknown, errors: TransitRunV1ValidationIssue[]): NatalTargetIndex => {
  const byPointId = new Map<string, { kind: 'planet' | 'angle'; longitudeDeg: number }>();
  if (!Array.isArray(value)) {
    addIssue(errors, '/natalTargets', 'deve ser uma lista');
    return { byPointId, anglesAvailable: false };
  }
  if (value.length !== TRANSIT_NATAL_POINT_IDS.length) addIssue(errors, '/natalTargets', 'deve conter os 12 pontos');
  let anglesAvailable = true;
  value.forEach((target, index) => {
    const path = `/natalTargets/${index}`;
    if (!isRecord(target)) {
      addIssue(errors, path, 'deve ser um objeto');
      return;
    }
    const expectedPointId = TRANSIT_NATAL_POINT_IDS[index];
    const expectedKind = index < TRANSIT_PLANET_BODY_IDS.length ? 'planet' : 'angle';
    if (target.status === 'available') {
      exactKeys(target, ['status', 'kind', 'pointId', 'displayNamePtBr', 'eclipticLongitudeDeg'], path, errors);
      if (target.kind !== expectedKind) addIssue(errors, `${path}/kind`, 'tipo de ponto inválido');
      if (target.pointId !== expectedPointId)
        addIssue(errors, `${path}/pointId`, 'ponto ausente, duplicado ou fora da ordem');
      const expectedDisplayName =
        expectedKind === 'planet' && expectedPointId && expectedPointId in PLANET_PRESENTATION_PT_BR
          ? PLANET_PRESENTATION_PT_BR[expectedPointId as keyof typeof PLANET_PRESENTATION_PT_BR].label
          : expectedPointId === 'ascendant'
            ? 'Ascendente'
            : 'Meio do Céu';
      if (target.displayNamePtBr !== expectedDisplayName) {
        addIssue(errors, `${path}/displayNamePtBr`, 'nome público inválido');
      }
      if (!finiteInRange(target.eclipticLongitudeDeg, 0, 360)) {
        addIssue(errors, `${path}/eclipticLongitudeDeg`, 'longitude inválida');
      } else if (expectedPointId) {
        byPointId.set(expectedPointId, { kind: expectedKind, longitudeDeg: target.eclipticLongitudeDeg });
      }
    } else if (target.status === 'unavailable') {
      exactKeys(target, ['status', 'kind', 'pointId', 'displayNamePtBr', 'reasonCode'], path, errors);
      if (expectedKind !== 'angle' || target.kind !== 'angle')
        addIssue(errors, `${path}/kind`, 'somente ângulo pode faltar');
      if (target.pointId !== expectedPointId) addIssue(errors, `${path}/pointId`, 'ângulo fora da ordem');
      const expectedDisplayName = expectedPointId === 'ascendant' ? 'Ascendente' : 'Meio do Céu';
      if (target.displayNamePtBr !== expectedDisplayName) {
        addIssue(errors, `${path}/displayNamePtBr`, 'nome público inválido');
      }
      if (target.reasonCode !== 'NATAL_ANGLE_UNAVAILABLE') addIssue(errors, `${path}/reasonCode`, 'motivo inválido');
      anglesAvailable = false;
    } else {
      addIssue(errors, `${path}/status`, 'status inválido');
    }
  });
  return { byPointId, anglesAvailable };
};

const validatePhase = (
  value: unknown,
  aspectOrbDeg: number,
  request: ValidatedRequest,
  path: string,
  errors: TransitRunV1ValidationIssue[],
): 'available' | 'unavailable' | null => {
  if (!isRecord(value)) {
    addIssue(errors, path, 'deve ser um objeto');
    return null;
  }
  if (value.status === 'available') {
    exactKeys(value, ['status', 'phase', 'probeInstantUtc', 'referenceOrbDeg', 'probeOrbDeg', 'basis'], path, errors);
    if (!['applying', 'exact', 'separating'].includes(String(value.phase))) {
      addIssue(errors, `${path}/phase`, 'fase inválida');
    }
    if (request.probeMs === null || instantMilliseconds(value.probeInstantUtc) !== request.probeMs) {
      addIssue(errors, `${path}/probeInstantUtc`, 'probe incoerente');
    }
    if (!sameNumber(value.referenceOrbDeg, aspectOrbDeg))
      addIssue(errors, `${path}/referenceOrbDeg`, 'orbe incoerente');
    if (
      typeof value.probeOrbDeg !== 'number' ||
      !Number.isFinite(value.probeOrbDeg) ||
      value.probeOrbDeg < 0 ||
      value.probeOrbDeg > 180
    ) {
      addIssue(errors, `${path}/probeOrbDeg`, 'orbe do probe inválido');
    } else if (value.phase === 'applying' && value.probeOrbDeg >= aspectOrbDeg) {
      addIssue(errors, `${path}/phase`, 'applying exige redução do orbe');
    } else if (value.phase === 'separating' && value.probeOrbDeg <= aspectOrbDeg) {
      addIssue(errors, `${path}/phase`, 'separating exige aumento do orbe');
    } else if (value.phase === 'exact' && aspectOrbDeg > TRANSIT_ASPECT_PROFILE_V1.exactToleranceDeg) {
      addIssue(errors, `${path}/phase`, 'exact exige orbe dentro da tolerância');
    }
    if (value.basis !== 'explicit-later-snapshot-orb-comparison') addIssue(errors, `${path}/basis`, 'base inválida');
    return 'available';
  }
  if (value.status === 'unavailable') {
    exactKeys(value, ['status', 'reasonCode', 'probeInstantUtc'], path, errors);
    if (value.reasonCode !== 'PHASE_UNDETERMINED_FROM_PROBE') addIssue(errors, `${path}/reasonCode`, 'motivo inválido');
    if (request.probeMs === null || instantMilliseconds(value.probeInstantUtc) !== request.probeMs) {
      addIssue(errors, `${path}/probeInstantUtc`, 'probe incoerente');
    }
    return 'unavailable';
  }
  addIssue(errors, `${path}/status`, 'status inválido');
  return null;
};

const EXACT_UNAVAILABLE_REASONS = new Set([
  'HORIZON_ZERO_NO_SEARCH',
  'EXACT_SEARCH_UNAVAILABLE',
  'NO_EXACTITUDE_WITHIN_HORIZON',
  'PROVIDER_RESULT_INVALID_INSTANT',
  'PROVIDER_RESULT_OUTSIDE_HORIZON',
  'PROVIDER_RESULT_NOT_EXACT',
]);

const validateExactitude = (
  value: unknown,
  exactAngleDeg: number,
  referenceSeparationDeg: number,
  request: ValidatedRequest,
  path: string,
  errors: TransitRunV1ValidationIssue[],
): string | null => {
  if (!isRecord(value)) {
    addIssue(errors, path, 'deve ser um objeto');
    return null;
  }
  if (value.status === 'available') {
    exactKeys(value, ['status', 'exactAtUtc', 'proof'], path, errors);
    const exactMs = instantMilliseconds(value.exactAtUtc);
    if (exactMs === null) addIssue(errors, `${path}/exactAtUtc`, 'instante ISO UTC inválido');
    if (
      exactMs !== null &&
      (request.referenceMs === null ||
        request.endMs === null ||
        exactMs < request.referenceMs ||
        exactMs > request.endMs)
    ) {
      addIssue(errors, `${path}/exactAtUtc`, 'exatidão fora do horizonte');
    }
    if (exactKeys(value.proof, ['method', 'verifiedSeparationDeg', 'toleranceDeg'], `${path}/proof`, errors)) {
      if (
        value.proof.method !== 'reference-snapshot-verification' &&
        value.proof.method !== 'provider-search-and-snapshot-verification'
      ) {
        addIssue(errors, `${path}/proof/method`, 'método de prova inválido');
      }
      if (!sameNumber(value.proof.verifiedSeparationDeg, exactAngleDeg, TRANSIT_ASPECT_PROFILE_V1.exactToleranceDeg)) {
        addIssue(errors, `${path}/proof/verifiedSeparationDeg`, 'separação não comprova exatidão');
      }
      if (!sameNumber(value.proof.toleranceDeg, TRANSIT_ASPECT_PROFILE_V1.exactToleranceDeg)) {
        addIssue(errors, `${path}/proof/toleranceDeg`, 'tolerância adulterada');
      }
      if (
        value.proof.method === 'reference-snapshot-verification' &&
        (request.referenceMs === null ||
          exactMs !== request.referenceMs ||
          Math.abs(referenceSeparationDeg - exactAngleDeg) > TRANSIT_ASPECT_PROFILE_V1.exactToleranceDeg)
      ) {
        addIssue(errors, `${path}/exactAtUtc`, 'prova de referência exige o instante de referência');
      }
    }
    return 'available';
  }
  if (value.status === 'unavailable') {
    exactKeys(value, ['status', 'reasonCode'], path, errors);
    if (!EXACT_UNAVAILABLE_REASONS.has(String(value.reasonCode)))
      addIssue(errors, `${path}/reasonCode`, 'motivo inválido');
    if (
      (value.reasonCode === 'HORIZON_ZERO_NO_SEARCH' && request.horizonDays !== 0) ||
      (request.horizonDays === 0 && value.reasonCode !== 'HORIZON_ZERO_NO_SEARCH')
    ) {
      addIssue(errors, `${path}/reasonCode`, 'motivo incoerente com o horizonte');
    }
    return String(value.reasonCode);
  }
  addIssue(errors, `${path}/status`, 'status inválido');
  return null;
};

interface AspectSummary {
  readonly hasUnavailablePhase: boolean;
  readonly exactReasons: ReadonlySet<string>;
}

const validateAspects = (
  value: unknown,
  positions: PositionIndex,
  targets: NatalTargetIndex,
  request: ValidatedRequest,
  errors: TransitRunV1ValidationIssue[],
): AspectSummary => {
  const exactReasons = new Set<string>();
  let hasUnavailablePhase = false;
  if (!Array.isArray(value)) {
    addIssue(errors, '/aspects', 'deve ser uma lista');
    return { hasUnavailablePhase, exactReasons };
  }
  if (value.length > 120) addIssue(errors, '/aspects', 'não pode exceder 120 pares');
  let previousPairRank = -1;
  const pairKeys = new Set<string>();
  value.forEach((aspect, index) => {
    const path = `/aspects/${index}`;
    if (
      !exactKeys(
        aspect,
        [
          'recordId',
          'transitPoint',
          'natalPoint',
          'aspectId',
          'displayNamePtBr',
          'separationDeg',
          'exactAngleDeg',
          'allowedOrbDeg',
          'orbDeg',
          'phase',
          'exactitude',
        ],
        path,
        errors,
      )
    ) {
      return;
    }
    if (!exactKeys(aspect.transitPoint, ['bodyId', 'eclipticLongitudeDeg'], `${path}/transitPoint`, errors)) return;
    if (!exactKeys(aspect.natalPoint, ['kind', 'pointId', 'eclipticLongitudeDeg'], `${path}/natalPoint`, errors))
      return;
    const transitRank = bodyRank(aspect.transitPoint.bodyId);
    const targetRank = natalPointRank(aspect.natalPoint.pointId);
    if (transitRank < 0) addIssue(errors, `${path}/transitPoint/bodyId`, 'corpo inválido');
    if (targetRank < 0) addIssue(errors, `${path}/natalPoint/pointId`, 'ponto natal inválido');
    if (transitRank < 0 || targetRank < 0) return;
    const pairRank = transitRank * TRANSIT_NATAL_POINT_IDS.length + targetRank;
    if (pairRank <= previousPairRank) addIssue(errors, path, 'aspectos fora da ordem ou par duplicado');
    previousPairRank = pairRank;
    const pairKey = `${aspect.transitPoint.bodyId}|${aspect.natalPoint.pointId}`;
    if (pairKeys.has(pairKey)) addIssue(errors, path, 'par duplicado');
    pairKeys.add(pairKey);

    const position = positions.byBodyId.get(String(aspect.transitPoint.bodyId));
    const target = targets.byPointId.get(String(aspect.natalPoint.pointId));
    if (!position || !sameNumber(aspect.transitPoint.eclipticLongitudeDeg, position.longitudeDeg)) {
      addIssue(errors, `${path}/transitPoint/eclipticLongitudeDeg`, 'longitude incoerente com a posição de referência');
    }
    if (!target || !sameNumber(aspect.natalPoint.eclipticLongitudeDeg, target.longitudeDeg)) {
      addIssue(errors, `${path}/natalPoint/eclipticLongitudeDeg`, 'longitude incoerente com o alvo natal');
    }
    if (target && aspect.natalPoint.kind !== target.kind)
      addIssue(errors, `${path}/natalPoint/kind`, 'tipo incoerente');
    if (!position || !target) return;

    const separationDeg = angularSeparationDeg(position.longitudeDeg, target.longitudeDeg);
    if (!sameNumber(aspect.separationDeg, separationDeg))
      addIssue(errors, `${path}/separationDeg`, 'separação incoerente');
    const resolved = resolveTransitAspect(separationDeg);
    if (!resolved) {
      addIssue(errors, path, 'par não pertence ao perfil declarado');
      return;
    }
    if (aspect.aspectId !== resolved.aspectId) addIssue(errors, `${path}/aspectId`, 'aspecto incoerente');
    if (aspect.displayNamePtBr !== resolved.displayNamePtBr)
      addIssue(errors, `${path}/displayNamePtBr`, 'nome incoerente');
    if (!sameNumber(aspect.exactAngleDeg, resolved.exactAngleDeg))
      addIssue(errors, `${path}/exactAngleDeg`, 'ângulo incoerente');
    if (aspect.allowedOrbDeg !== 2) addIssue(errors, `${path}/allowedOrbDeg`, 'orbe máximo deve ser 2°');
    if (!sameNumber(aspect.orbDeg, resolved.orbDeg)) addIssue(errors, `${path}/orbDeg`, 'orbe incoerente');
    const expectedRecordId = `transit:${aspect.transitPoint.bodyId}|natal:${aspect.natalPoint.pointId}|${resolved.aspectId}`;
    if (aspect.recordId !== expectedRecordId) addIssue(errors, `${path}/recordId`, 'recordId incoerente');

    const phaseStatus = validatePhase(aspect.phase, resolved.orbDeg, request, `${path}/phase`, errors);
    if (phaseStatus === 'unavailable') hasUnavailablePhase = true;
    const exactStatus = validateExactitude(
      aspect.exactitude,
      resolved.exactAngleDeg,
      separationDeg,
      request,
      `${path}/exactitude`,
      errors,
    );
    if (exactStatus && exactStatus !== 'available') exactReasons.add(exactStatus);
  });
  const expectedPairKeys = new Set<string>();
  for (const transitBodyId of TRANSIT_PLANET_BODY_IDS) {
    const position = positions.byBodyId.get(transitBodyId);
    if (!position) continue;
    for (const natalPointId of TRANSIT_NATAL_POINT_IDS) {
      const target = targets.byPointId.get(natalPointId);
      if (!target) continue;
      if (resolveTransitAspect(angularSeparationDeg(position.longitudeDeg, target.longitudeDeg))) {
        expectedPairKeys.add(`${transitBodyId}|${natalPointId}`);
      }
    }
  }
  if (pairKeys.size !== expectedPairKeys.size || [...expectedPairKeys].some((pairKey) => !pairKeys.has(pairKey))) {
    addIssue(errors, '/aspects', 'a lista não contém exatamente todos os pares dentro do perfil declarado');
  }
  return { hasUnavailablePhase, exactReasons };
};

const expectedDiagnostics = (
  positions: PositionIndex,
  targets: NatalTargetIndex,
  aspects: AspectSummary,
  request: ValidatedRequest,
): readonly { readonly severity: 'info' | 'warning'; readonly code: string }[] => {
  const expected: Array<{ severity: 'info' | 'warning'; code: string }> = [];
  if (positions.houseStatus === 'unavailable')
    expected.push({ severity: 'warning', code: 'NATAL_PLACIDUS_UNAVAILABLE' });
  if (!targets.anglesAvailable) expected.push({ severity: 'warning', code: 'NATAL_ANGLES_UNAVAILABLE' });
  if (positions.iauUnavailable) {
    expected.push({ severity: 'warning', code: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN' });
  }
  if (aspects.hasUnavailablePhase) expected.push({ severity: 'warning', code: 'PHASE_UNDETERMINED_FROM_PROBE' });
  if (request.horizonDays === 0 && aspects.exactReasons.has('HORIZON_ZERO_NO_SEARCH')) {
    expected.push({ severity: 'info', code: 'HORIZON_ZERO_NO_SEARCH' });
  }
  if (aspects.exactReasons.has('EXACT_SEARCH_UNAVAILABLE')) {
    expected.push({ severity: 'info', code: 'EXACT_SEARCH_UNAVAILABLE' });
  }
  if (
    ['PROVIDER_RESULT_INVALID_INSTANT', 'PROVIDER_RESULT_OUTSIDE_HORIZON', 'PROVIDER_RESULT_NOT_EXACT'].some((reason) =>
      aspects.exactReasons.has(reason),
    )
  ) {
    expected.push({ severity: 'warning', code: 'EXACT_SEARCH_RESULT_REJECTED' });
  }
  return expected;
};

const validateDiagnostics = (
  value: unknown,
  expected: readonly { readonly severity: 'info' | 'warning'; readonly code: string }[],
  errors: TransitRunV1ValidationIssue[],
): void => {
  if (!Array.isArray(value)) {
    addIssue(errors, '/diagnostics', 'deve ser uma lista');
    return;
  }
  if (value.length !== expected.length) addIssue(errors, '/diagnostics', 'diagnósticos incoerentes');
  value.forEach((diagnostic, index) => {
    const path = `/diagnostics/${index}`;
    if (!exactKeys(diagnostic, ['severity', 'code'], path, errors)) return;
    if (diagnostic.severity !== expected[index]?.severity || diagnostic.code !== expected[index]?.code) {
      addIssue(errors, path, 'diagnóstico inesperado ou fora da ordem');
    }
  });
};

export function validateTransitRunV1(value: unknown): TransitRunV1ValidationResult {
  const errors: TransitRunV1ValidationIssue[] = [];
  if (!exactKeys(value, ROOT_KEYS, '', errors)) return { valid: false, errors };
  if (value.schemaId !== TRANSIT_RUN_SCHEMA_ID) addIssue(errors, '/schemaId', 'schemaId inválido');
  if (value.schemaVersion !== TRANSIT_RUN_SCHEMA_VERSION) addIssue(errors, '/schemaVersion', 'schemaVersion inválida');
  validateSource(value.source, errors);
  const request = validateRequest(value.request, errors);
  validateTargetSet(value.targetSet, errors);
  validatePresentationPolicy(value.presentationPolicy, errors);
  validateModels(value.models, errors);
  const positions = validatePositions(value.positionsAtReference, errors);
  const targets = validateNatalTargets(value.natalTargets, errors);
  const aspects = validateAspects(value.aspects, positions, targets, request, errors);
  validateDiagnostics(value.diagnostics, expectedDiagnostics(positions, targets, aspects, request), errors);
  return errors.length === 0 ? { valid: true, value: value as unknown as TransitRunV1 } : { valid: false, errors };
}

export function isTransitRunV1(value: unknown): value is TransitRunV1 {
  return validateTransitRunV1(value).valid;
}
