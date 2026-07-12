import { EquatorFromVector, RotateVector, Rotation_EQJ_EQD, Spherical, VectorFromSphere } from 'astronomy-engine';
import {
  buildLatitudeSamplingGrid,
  calculateHourAngleLongitudeDeg,
  calculateMcIcLongitudes,
  type HorizonUnavailabilityReason,
  LOCALITY_MAP_SCHEMA_ID,
  LOCALITY_MAP_SCHEMA_VERSION,
  LOCALITY_MAP_TARGET_SET_ID,
  type LocalityCoordinate,
  type LocalityDiagnosticV1,
  type LocalityLineAvailability,
  type LocalityMapV1,
  solveGeometricHorizonHourAngles,
  splitAntimeridianSegments,
} from './localityMapV1';
import { type PlanetBodyId, POSITIONAL_SCHEMA_ID, POSITIONAL_SCHEMA_VERSION } from './positionV2';

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

const ANGLE_IDS = ['mc', 'ic', 'ascendant', 'descendant'] as const;

const strictObject = <Properties extends Readonly<Record<string, unknown>>>(
  properties: Properties,
  required: readonly (keyof Properties & string)[],
) => ({ type: 'object', properties, required, additionalProperties: false }) as const;

const nonEmptyStringSchema = { type: 'string', minLength: 1 } as const;
const sha256Schema = { type: 'string', pattern: '^[0-9a-f]{64}$' } as const;
const longitudeSchema = { type: 'number', minimum: -180, maximum: 180 } as const;
const latitudeSchema = { type: 'number', exclusiveMinimum: -90, exclusiveMaximum: 90 } as const;
const planetBodyIdSchema = { type: 'string', enum: PLANET_BODY_IDS } as const;
const angleIdSchema = { type: 'string', enum: ANGLE_IDS } as const;

const coordinateSchema = {
  type: 'array',
  minItems: 2,
  maxItems: 2,
  prefixItems: [longitudeSchema, latitudeSchema],
  items: false,
} as const;

const availabilitySchema = {
  oneOf: [
    strictObject(
      {
        status: { const: 'available' },
        sampledLatitudeCount: { type: 'integer', minimum: 1 },
        solvedLatitudeCount: { type: 'integer', minimum: 1 },
      },
      ['status', 'sampledLatitudeCount', 'solvedLatitudeCount'],
    ),
    strictObject(
      {
        status: { const: 'partial' },
        sampledLatitudeCount: { type: 'integer', minimum: 2 },
        solvedLatitudeCount: { type: 'integer', minimum: 1 },
      },
      ['status', 'sampledLatitudeCount', 'solvedLatitudeCount'],
    ),
    strictObject(
      {
        status: { const: 'unavailable' },
        sampledLatitudeCount: { type: 'integer', minimum: 1 },
        solvedLatitudeCount: { const: 0 },
        reasonCode: { const: 'NO_GEOMETRIC_HORIZON_CROSSING_ON_SAMPLING_GRID' },
      },
      ['status', 'sampledLatitudeCount', 'solvedLatitudeCount', 'reasonCode'],
    ),
  ],
} as const;

const bodySchema = strictObject(
  {
    bodyId: { $ref: '#/$defs/planetBodyId' },
    displayNamePtBr: nonEmptyStringSchema,
    symbol: nonEmptyStringSchema,
    sourceEquatorialEqj: strictObject(
      {
        frameId: { const: 'geocentric-apparent-eqj-j2000' },
        rightAscensionHours: { type: 'number', minimum: 0, exclusiveMaximum: 24 },
        declinationDeg: { type: 'number', minimum: -90, maximum: 90 },
      },
      ['frameId', 'rightAscensionHours', 'declinationDeg'],
    ),
    workingEquatorialEqd: strictObject(
      {
        frameId: { const: 'geocentric-apparent-true-equator-of-date-eqd' },
        rightAscensionHours: { type: 'number', minimum: 0, exclusiveMaximum: 24 },
        declinationDeg: { type: 'number', minimum: -90, maximum: 90 },
      },
      ['frameId', 'rightAscensionHours', 'declinationDeg'],
    ),
  },
  ['bodyId', 'displayNamePtBr', 'symbol', 'sourceEquatorialEqj', 'workingEquatorialEqd'],
);

const lineSchema = strictObject(
  {
    recordId: nonEmptyStringSchema,
    bodyId: { $ref: '#/$defs/planetBodyId' },
    bodyDisplayNamePtBr: nonEmptyStringSchema,
    bodySymbol: nonEmptyStringSchema,
    angleId: { $ref: '#/$defs/angleId' },
    angleDisplayNamePtBr: nonEmptyStringSchema,
    availability: { $ref: '#/$defs/availability' },
    geometry: strictObject(
      {
        type: { const: 'MultiLineString' },
        coordinates: {
          type: 'array',
          items: {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/$defs/coordinate' },
          },
        },
      },
      ['type', 'coordinates'],
    ),
  },
  [
    'recordId',
    'bodyId',
    'bodyDisplayNamePtBr',
    'bodySymbol',
    'angleId',
    'angleDisplayNamePtBr',
    'availability',
    'geometry',
  ],
);

const diagnosticSchema = {
  oneOf: [
    strictObject(
      {
        severity: { const: 'info' },
        code: { const: 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED' },
        latitudeDeg: { type: 'number', enum: [-90, 90] },
      },
      ['severity', 'code', 'latitudeDeg'],
    ),
    strictObject(
      {
        severity: { const: 'info' },
        code: {
          type: 'string',
          enum: [
            'CIRCUMPOLAR_NO_GEOMETRIC_HORIZON_CROSSING',
            'TANGENT_HORIZON_NO_CROSSING',
            'CELESTIAL_POLE_NO_UNIQUE_HORIZON_CROSSING',
          ],
        },
        bodyId: { $ref: '#/$defs/planetBodyId' },
        sampledLatitudeRange: strictObject({ startLatitudeDeg: latitudeSchema, endLatitudeDeg: latitudeSchema }, [
          'startLatitudeDeg',
          'endLatitudeDeg',
        ]),
      },
      ['severity', 'code', 'bodyId', 'sampledLatitudeRange'],
    ),
  ],
} as const;

/** Contrato estrito e serializável da geometria de localidade. */
export const LOCALITY_MAP_V1_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'urn:astrologo:locality-map:v1:schema',
  title: 'LocalityMapV1',
  type: 'object',
  properties: {
    schemaId: { const: LOCALITY_MAP_SCHEMA_ID },
    schemaVersion: { const: LOCALITY_MAP_SCHEMA_VERSION },
    source: strictObject(
      {
        schemaId: { const: POSITIONAL_SCHEMA_ID },
        schemaVersion: { const: POSITIONAL_SCHEMA_VERSION },
        calculationId: nonEmptyStringSchema,
        calculatedAtUtc: nonEmptyStringSchema,
        birthInstantUtc: nonEmptyStringSchema,
        sourceHashAlgorithm: { const: 'sha256' },
        sourceHashSha256: sha256Schema,
        sourceHashVerification: { const: 'caller-supplied-format-validated' },
      },
      [
        'schemaId',
        'schemaVersion',
        'calculationId',
        'calculatedAtUtc',
        'birthInstantUtc',
        'sourceHashAlgorithm',
        'sourceHashSha256',
        'sourceHashVerification',
      ],
    ),
    targetSet: strictObject(
      {
        id: { const: LOCALITY_MAP_TARGET_SET_ID },
        version: { const: '1.0.0' },
        orderedBodyIds: {
          type: 'array',
          minItems: 10,
          maxItems: 10,
          uniqueItems: true,
          items: { $ref: '#/$defs/planetBodyId' },
        },
        orderedAngleIds: {
          type: 'array',
          minItems: 4,
          maxItems: 4,
          uniqueItems: true,
          items: { $ref: '#/$defs/angleId' },
        },
      },
      ['id', 'version', 'orderedBodyIds', 'orderedAngleIds'],
    ),
    presentationPolicy: strictObject(
      {
        locale: { const: 'pt-BR' },
        timeZone: { const: 'America/Sao_Paulo' },
        timeZoneLabel: { const: 'Hora oficial de Brasília' },
        calendar: { const: 'gregory' },
        numberingSystem: { const: 'latn' },
        hourCycle: { const: 'h23' },
      },
      ['locale', 'timeZone', 'timeZoneLabel', 'calendar', 'numberingSystem', 'hourCycle'],
    ),
    models: strictObject(
      {
        sourceCoordinates: strictObject(
          {
            sourceContract: { const: 'DadosPosicionaisV2' },
            sourceContractVersion: { const: '2.0.0' },
            sourceFrame: { const: 'geocentric-apparent-eqj-j2000' },
            sourceProducerMethod: {
              const: 'astronomy-engine-GeoVector-aberration-true-plus-EquatorFromVector',
            },
            engineId: { const: 'astronomy-engine' },
            engineVersion: { const: '2.1.19' },
            engineSourceSha256: sha256Schema,
            workingFrame: { const: 'geocentric-apparent-true-equator-of-date-eqd' },
            transformation: strictObject(
              {
                methodId: { const: 'astronomy-engine-Rotation_EQJ_EQD-v1' },
                precessionApplied: { const: true },
                nutationApplied: { const: true },
                calculatedForInstantUtc: nonEmptyStringSchema,
              },
              ['methodId', 'precessionApplied', 'nutationApplied', 'calculatedForInstantUtc'],
            ),
          },
          [
            'sourceContract',
            'sourceContractVersion',
            'sourceFrame',
            'sourceProducerMethod',
            'engineId',
            'engineVersion',
            'engineSourceSha256',
            'workingFrame',
            'transformation',
          ],
        ),
        siderealTime: strictObject(
          {
            kind: { const: 'greenwich-apparent-sidereal-time' },
            hours: { type: 'number', minimum: 0, exclusiveMaximum: 24 },
            provenance: strictObject(
              {
                engineId: nonEmptyStringSchema,
                engineVersion: nonEmptyStringSchema,
                methodId: nonEmptyStringSchema,
                engineSourceSha256: sha256Schema,
                calculatedForInstantUtc: nonEmptyStringSchema,
              },
              ['engineId', 'engineVersion', 'methodId', 'engineSourceSha256', 'calculatedForInstantUtc'],
            ),
          },
          ['kind', 'hours', 'provenance'],
        ),
        geometry: strictObject(
          {
            modelId: { const: 'astrocartography-geometric-horizon-v1' },
            modelVersion: { const: '1.0.0' },
            altitudeReferenceDeg: { const: 0 },
            refractionModel: { const: 'none' },
            observerElevationModel: { const: 'not-applied' },
            longitudeConvention: { const: 'east-positive-[-180,180]' },
            coordinateOrder: { const: 'longitude-latitude' },
            ascendantHourAngleSign: { const: 'negative' },
            descendantHourAngleSign: { const: 'positive' },
            antimeridianPolicy: { const: 'split-and-interpolate-boundary-v1' },
          },
          [
            'modelId',
            'modelVersion',
            'altitudeReferenceDeg',
            'refractionModel',
            'observerElevationModel',
            'longitudeConvention',
            'coordinateOrder',
            'ascendantHourAngleSign',
            'descendantHourAngleSign',
            'antimeridianPolicy',
          ],
        ),
        sampling: strictObject(
          {
            latitudeResolutionDeg: { type: 'number', minimum: 0.25, maximum: 5 },
            latitudeDomain: { const: '(-90,90)' },
            equatorIncluded: { const: true },
            sampledLatitudeCount: { type: 'integer', minimum: 35, maximum: 719 },
          },
          ['latitudeResolutionDeg', 'latitudeDomain', 'equatorIncluded', 'sampledLatitudeCount'],
        ),
      },
      ['sourceCoordinates', 'siderealTime', 'geometry', 'sampling'],
    ),
    bodies: {
      type: 'array',
      minItems: 10,
      maxItems: 10,
      items: { $ref: '#/$defs/body' },
    },
    lines: {
      type: 'array',
      minItems: 40,
      maxItems: 40,
      items: { $ref: '#/$defs/line' },
    },
    diagnostics: { type: 'array', minItems: 2, maxItems: 64, items: { $ref: '#/$defs/diagnostic' } },
  },
  required: [
    'schemaId',
    'schemaVersion',
    'source',
    'targetSet',
    'presentationPolicy',
    'models',
    'bodies',
    'lines',
    'diagnostics',
  ],
  additionalProperties: false,
  $defs: {
    planetBodyId: planetBodyIdSchema,
    angleId: angleIdSchema,
    coordinate: coordinateSchema,
    availability: availabilitySchema,
    body: bodySchema,
    line: lineSchema,
    diagnostic: diagnosticSchema,
  },
} as const;

export interface LocalityMapV1ValidationIssue {
  readonly instancePath: string;
  readonly keyword: string;
  readonly message: string;
}

export type LocalityMapV1ValidationResult =
  | { readonly valid: true; readonly value: LocalityMapV1 }
  | { readonly valid: false; readonly errors: readonly LocalityMapV1ValidationIssue[] };

type SchemaNode = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const escapePointer = (token: string): string => token.replaceAll('~', '~0').replaceAll('/', '~1');
const childPath = (parent: string, token: string | number): string => `${parent}/${escapePointer(String(token))}`;

const addIssue = (
  errors: LocalityMapV1ValidationIssue[],
  instancePath: string,
  keyword: string,
  message: string,
): void => {
  errors.push({ instancePath, keyword, message });
};

const sameJsonValue = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => sameJsonValue(item, right[index]));
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => Object.hasOwn(right, key) && sameJsonValue(left[key], right[key]))
    );
  }
  return false;
};

const resolveReference = (reference: string): SchemaNode | null => {
  if (!reference.startsWith('#/')) return null;
  let current: unknown = LOCALITY_MAP_V1_JSON_SCHEMA;
  for (const encodedToken of reference.slice(2).split('/')) {
    const token = encodedToken.replaceAll('~1', '/').replaceAll('~0', '~');
    if (!isRecord(current) || !(token in current)) return null;
    current = current[token];
  }
  return isRecord(current) ? current : null;
};

const validateType = (value: unknown, type: unknown, path: string, errors: LocalityMapV1ValidationIssue[]): boolean => {
  if (type === 'number' || type === 'integer') {
    if (typeof value !== 'number') {
      addIssue(errors, path, 'type', `deve ser ${type}`);
      return false;
    }
    if (!Number.isFinite(value)) {
      addIssue(errors, path, 'finite', 'deve ser finito');
      return false;
    }
    if (type === 'integer' && !Number.isInteger(value)) {
      addIssue(errors, path, 'type', 'deve ser inteiro');
      return false;
    }
    return true;
  }
  const matches =
    (type === 'object' && isRecord(value)) ||
    (type === 'array' && Array.isArray(value)) ||
    (type === 'string' && typeof value === 'string');
  if (!matches) addIssue(errors, path, 'type', `deve ser ${String(type)}`);
  return matches;
};

const validateSchemaNode = (
  value: unknown,
  schema: SchemaNode,
  path: string,
  errors: LocalityMapV1ValidationIssue[],
): void => {
  if (typeof schema.$ref === 'string') {
    const target = resolveReference(schema.$ref);
    if (target) validateSchemaNode(value, target, path, errors);
    else addIssue(errors, path, '$ref', `referência não encontrada: ${schema.$ref}`);
    return;
  }
  if (Array.isArray(schema.oneOf)) {
    const matchCount = schema.oneOf.filter((branch) => {
      const branchErrors: LocalityMapV1ValidationIssue[] = [];
      if (isRecord(branch)) validateSchemaNode(value, branch, path, branchErrors);
      return branchErrors.length === 0;
    }).length;
    if (matchCount !== 1) addIssue(errors, path, 'oneOf', 'deve satisfazer exatamente uma alternativa');
    return;
  }
  if ('const' in schema && !sameJsonValue(value, schema.const)) {
    addIssue(errors, path, 'const', `deve ser ${JSON.stringify(schema.const)}`);
    return;
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => sameJsonValue(value, candidate))) {
    addIssue(errors, path, 'enum', 'deve pertencer ao conjunto permitido');
    return;
  }
  if (schema.type !== undefined && !validateType(value, schema.type, path, errors)) return;

  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      addIssue(errors, path, 'minLength', 'não pode ser vazio');
    }
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern, 'u').test(value)) {
      addIssue(errors, path, 'pattern', 'não corresponde ao padrão exigido');
    }
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (typeof schema.minimum === 'number' && value < schema.minimum)
      addIssue(errors, path, 'minimum', 'abaixo do mínimo');
    if (typeof schema.maximum === 'number' && value > schema.maximum)
      addIssue(errors, path, 'maximum', 'acima do máximo');
    if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) {
      addIssue(errors, path, 'exclusiveMinimum', 'abaixo do mínimo exclusivo');
    }
    if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) {
      addIssue(errors, path, 'exclusiveMaximum', 'acima do máximo exclusivo');
    }
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems)
      addIssue(errors, path, 'minItems', 'itens insuficientes');
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems)
      addIssue(errors, path, 'maxItems', 'itens excedentes');
    if (schema.uniqueItems === true) {
      value.forEach((item, index) => {
        if (value.slice(0, index).some((candidate) => sameJsonValue(candidate, item))) {
          addIssue(errors, childPath(path, index), 'uniqueItems', 'item duplicado');
        }
      });
    }
    if (Array.isArray(schema.prefixItems)) {
      schema.prefixItems.forEach((itemSchema, index) => {
        if (index < value.length && isRecord(itemSchema)) {
          validateSchemaNode(value[index], itemSchema, childPath(path, index), errors);
        }
      });
      if (schema.items === false && value.length > schema.prefixItems.length) {
        addIssue(errors, path, 'items', 'itens adicionais não permitidos');
      }
    } else if (isRecord(schema.items)) {
      value.forEach((item, index) => {
        validateSchemaNode(item, schema.items as SchemaNode, childPath(path, index), errors);
      });
    }
  }
  if (isRecord(value)) {
    const properties = isRecord(schema.properties) ? schema.properties : {};
    if (Array.isArray(schema.required)) {
      for (const property of schema.required) {
        if (typeof property === 'string' && !Object.hasOwn(value, property)) {
          addIssue(errors, childPath(path, property), 'required', 'propriedade obrigatória ausente');
        }
      }
    }
    for (const [property, propertyValue] of Object.entries(value)) {
      const propertySchema = properties[property];
      if (isRecord(propertySchema))
        validateSchemaNode(propertyValue, propertySchema, childPath(path, property), errors);
      else if (schema.additionalProperties === false) {
        addIssue(errors, childPath(path, property), 'additionalProperties', 'propriedade não permitida');
      }
    }
  }
};

const scanJsonSafety = (
  value: unknown,
  path: string,
  seen: WeakSet<object>,
  errors: LocalityMapV1ValidationIssue[],
): void => {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    addIssue(errors, path, 'finite', 'deve ser finito');
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  if (seen.has(value)) {
    addIssue(errors, path, 'jsonValue', 'referência circular');
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      scanJsonSafety(item, childPath(path, index), seen, errors);
    });
  } else {
    Object.entries(value).forEach(([property, propertyValue]) => {
      scanJsonSafety(propertyValue, childPath(path, property), seen, errors);
    });
  }
  seen.delete(value);
};

const closeEnough = (left: number, right: number): boolean => Math.abs(left - right) <= 1e-9;

const coordinatesEqual = (
  actual: readonly (readonly LocalityCoordinate[])[],
  expected: readonly (readonly LocalityCoordinate[])[],
): boolean =>
  actual.length === expected.length &&
  actual.every(
    (segment, segmentIndex) =>
      segment.length === expected[segmentIndex]?.length &&
      segment.every((coordinate, coordinateIndex) => {
        const expectedCoordinate = expected[segmentIndex]?.[coordinateIndex];
        return (
          expectedCoordinate !== undefined &&
          closeEnough(coordinate[0], expectedCoordinate[0]) &&
          closeEnough(coordinate[1], expectedCoordinate[1])
        );
      }),
  );

const segmentsFromNullable = (
  coordinates: readonly (LocalityCoordinate | null)[],
): readonly (readonly LocalityCoordinate[])[] => {
  const result: LocalityCoordinate[][] = [];
  let contiguous: LocalityCoordinate[] = [];
  const flush = (): void => {
    if (contiguous.length > 0) result.push(...splitAntimeridianSegments(contiguous).map((segment) => [...segment]));
    contiguous = [];
  };
  for (const coordinate of coordinates) {
    if (coordinate) contiguous.push(coordinate);
    else flush();
  }
  flush();
  return result;
};

const expectedAvailability = (sampled: number, solved: number): LocalityLineAvailability => {
  if (solved === 0) {
    return {
      status: 'unavailable',
      sampledLatitudeCount: sampled,
      solvedLatitudeCount: 0,
      reasonCode: 'NO_GEOMETRIC_HORIZON_CROSSING_ON_SAMPLING_GRID',
    };
  }
  if (solved < sampled) return { status: 'partial', sampledLatitudeCount: sampled, solvedLatitudeCount: solved };
  return { status: 'available', sampledLatitudeCount: sampled, solvedLatitudeCount: solved };
};

const groupExpectedDiagnostics = (
  bodyId: PlanetBodyId,
  samples: readonly {
    readonly latitudeDeg: number;
    readonly reasonCode: Exclude<HorizonUnavailabilityReason, 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED'>;
  }[],
  resolution: number,
): LocalityDiagnosticV1[] => {
  const result: LocalityDiagnosticV1[] = [];
  let start = samples[0];
  let previous = samples[0];
  const flush = (): void => {
    if (!start || !previous) return;
    result.push({
      severity: 'info',
      code: start.reasonCode,
      bodyId,
      sampledLatitudeRange: { startLatitudeDeg: start.latitudeDeg, endLatitudeDeg: previous.latitudeDeg },
    });
  };
  for (const sample of samples.slice(1)) {
    if (
      !previous ||
      sample.reasonCode !== previous.reasonCode ||
      sample.latitudeDeg - previous.latitudeDeg > resolution + 1e-12
    ) {
      flush();
      start = sample;
    }
    previous = sample;
  }
  flush();
  return result;
};

const diagnosticEqual = (actual: LocalityDiagnosticV1, expected: LocalityDiagnosticV1): boolean => {
  if (actual.code !== expected.code) return false;
  if (actual.code === 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED') {
    return expected.code === actual.code && actual.latitudeDeg === expected.latitudeDeg;
  }
  return (
    expected.code === actual.code &&
    actual.bodyId === expected.bodyId &&
    closeEnough(actual.sampledLatitudeRange.startLatitudeDeg, expected.sampledLatitudeRange.startLatitudeDeg) &&
    closeEnough(actual.sampledLatitudeRange.endLatitudeDeg, expected.sampledLatitudeRange.endLatitudeDeg)
  );
};

const validateRelationalInvariants = (value: LocalityMapV1, errors: LocalityMapV1ValidationIssue[]): void => {
  if (!value.targetSet.orderedBodyIds.every((bodyId, index) => bodyId === PLANET_BODY_IDS[index])) {
    addIssue(errors, '/targetSet/orderedBodyIds', 'canonicalBodyOrder', 'deve seguir a ordem planetária canônica');
  }
  if (!value.targetSet.orderedAngleIds.every((angleId, index) => angleId === ANGLE_IDS[index])) {
    addIssue(errors, '/targetSet/orderedAngleIds', 'canonicalAngleOrder', 'deve seguir MC, IC, ASC e DSC');
  }
  if (!value.bodies.every(({ bodyId }, index) => bodyId === PLANET_BODY_IDS[index])) {
    addIssue(errors, '/bodies', 'canonicalBodyOrder', 'deve seguir a ordem planetária canônica');
  }
  if (value.models.siderealTime.provenance.calculatedForInstantUtc !== value.source.birthInstantUtc) {
    addIssue(
      errors,
      '/models/siderealTime/provenance/calculatedForInstantUtc',
      'siderealInstantConsistency',
      'deve corresponder ao instante natal',
    );
  }
  if (value.models.sourceCoordinates.transformation.calculatedForInstantUtc !== value.source.birthInstantUtc) {
    addIssue(
      errors,
      '/models/sourceCoordinates/transformation/calculatedForInstantUtc',
      'equatorialTransformationInstantConsistency',
      'deve corresponder ao instante natal',
    );
  }
  const birthInstant = new Date(value.source.birthInstantUtc);
  if (Number.isNaN(birthInstant.getTime())) {
    addIssue(errors, '/source/birthInstantUtc', 'dateTime', 'deve ser um instante ISO UTC válido');
    return;
  }
  const eqjToEqd = Rotation_EQJ_EQD(birthInstant);

  const latitudes = buildLatitudeSamplingGrid(value.models.sampling.latitudeResolutionDeg);
  if (value.models.sampling.sampledLatitudeCount !== latitudes.length) {
    addIssue(
      errors,
      '/models/sampling/sampledLatitudeCount',
      'samplingConsistency',
      'deve corresponder à grade declarada',
    );
  }

  const expectedDiagnostics: LocalityDiagnosticV1[] = [
    { severity: 'info', code: 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED', latitudeDeg: -90 },
    { severity: 'info', code: 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED', latitudeDeg: 90 },
  ];
  let lineIndex = 0;
  for (const body of value.bodies) {
    const sourceVector = VectorFromSphere(
      new Spherical(body.sourceEquatorialEqj.declinationDeg, body.sourceEquatorialEqj.rightAscensionHours * 15, 1),
      birthInstant,
    );
    const expectedEqd = EquatorFromVector(RotateVector(eqjToEqd, sourceVector));
    if (
      !closeEnough(body.workingEquatorialEqd.rightAscensionHours, expectedEqd.ra) ||
      !closeEnough(body.workingEquatorialEqd.declinationDeg, expectedEqd.dec)
    ) {
      addIssue(
        errors,
        `/bodies/${value.bodies.indexOf(body)}/workingEquatorialEqd`,
        'equatorialFrameTransformationConsistency',
        'deve ser a transformação EQJ→EQD por Rotation_EQJ_EQD no instante natal',
      );
    }
    const meridians = calculateMcIcLongitudes(
      body.workingEquatorialEqd.rightAscensionHours,
      value.models.siderealTime.hours,
    );
    const horizon = latitudes.map((latitudeDeg) => ({
      latitudeDeg,
      solution: solveGeometricHorizonHourAngles(latitudeDeg, body.workingEquatorialEqd.declinationDeg),
    }));
    const solvedCount = horizon.filter(({ solution }) => solution.status === 'available').length;
    const unavailable = horizon.flatMap(({ latitudeDeg, solution }) =>
      solution.status === 'unavailable' && solution.reasonCode !== 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED'
        ? [{ latitudeDeg, reasonCode: solution.reasonCode }]
        : [],
    );
    expectedDiagnostics.push(
      ...groupExpectedDiagnostics(body.bodyId, unavailable, value.models.sampling.latitudeResolutionDeg),
    );

    for (const angleId of ANGLE_IDS) {
      const line = value.lines[lineIndex];
      const expectedRecordId = `${body.bodyId}:${angleId}`;
      if (!line || line.recordId !== expectedRecordId || line.bodyId !== body.bodyId || line.angleId !== angleId) {
        addIssue(errors, `/lines/${lineIndex}`, 'canonicalLineOrder', `deve ser ${expectedRecordId}`);
        lineIndex += 1;
        continue;
      }
      if (line.bodyDisplayNamePtBr !== body.displayNamePtBr || line.bodySymbol !== body.symbol) {
        addIssue(errors, `/lines/${lineIndex}`, 'lineBodyConsistency', 'deve preservar os metadados do corpo');
      }

      let expectedCoordinates: readonly (readonly LocalityCoordinate[])[];
      let availability: LocalityLineAvailability;
      if (angleId === 'mc' || angleId === 'ic') {
        const longitude = angleId === 'mc' ? meridians.mcLongitudeDeg : meridians.icLongitudeDeg;
        expectedCoordinates = [[...latitudes.map((latitudeDeg): LocalityCoordinate => [longitude, latitudeDeg])]];
        availability = expectedAvailability(latitudes.length, latitudes.length);
      } else {
        const nullable = horizon.map(({ latitudeDeg, solution }): LocalityCoordinate | null => {
          if (solution.status !== 'available') return null;
          const hourAngleDeg = angleId === 'ascendant' ? solution.risingHourAngleDeg : solution.settingHourAngleDeg;
          return [
            calculateHourAngleLongitudeDeg(
              body.workingEquatorialEqd.rightAscensionHours,
              value.models.siderealTime.hours,
              hourAngleDeg,
            ),
            latitudeDeg,
          ];
        });
        expectedCoordinates = segmentsFromNullable(nullable);
        availability = expectedAvailability(latitudes.length, solvedCount);
      }
      if (
        !coordinatesEqual(line.geometry.coordinates, expectedCoordinates) ||
        !sameJsonValue(line.availability, availability)
      ) {
        addIssue(
          errors,
          `/lines/${lineIndex}`,
          'lineGeometryConsistency',
          'geometria e disponibilidade devem corresponder a RA, declinação, GAST e resolução',
        );
      }
      lineIndex += 1;
    }
  }
  if (lineIndex !== value.lines.length) {
    addIssue(errors, '/lines', 'canonicalLineOrder', 'deve conter exatamente quatro linhas por corpo');
  }
  if (
    value.diagnostics.length !== expectedDiagnostics.length ||
    value.diagnostics.some((diagnostic, index) => {
      const expected = expectedDiagnostics[index];
      return expected === undefined || !diagnosticEqual(diagnostic, expected);
    })
  ) {
    addIssue(
      errors,
      '/diagnostics',
      'diagnosticConsistency',
      'deve representar polos e faixas sem cruzamento da grade calculada',
    );
  }
};

export function validateLocalityMapV1(value: unknown): LocalityMapV1ValidationResult {
  const errors: LocalityMapV1ValidationIssue[] = [];
  scanJsonSafety(value, '', new WeakSet(), errors);
  if (errors.length > 0) return { valid: false, errors };
  validateSchemaNode(value, LOCALITY_MAP_V1_JSON_SCHEMA, '', errors);
  if (errors.length > 0) return { valid: false, errors };
  const validated = value as LocalityMapV1;
  validateRelationalInvariants(validated, errors);
  return errors.length === 0 ? { valid: true, value: validated } : { valid: false, errors };
}

export function isLocalityMapV1(value: unknown): value is LocalityMapV1 {
  return validateLocalityMapV1(value).valid;
}
