import {
  angularSeparationDeg,
  NATAL_CHART_ANALYSIS_SCHEMA_ID,
  NATAL_CHART_ANALYSIS_SCHEMA_VERSION,
  NATAL_CHART_ANALYSIS_TARGET_SET_ID,
  NATAL_CHART_ASPECT_PROFILE,
  type NatalChartAnalysisV1,
  resolveNatalMajorAspect,
} from './natalChartAnalysisV1';
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

const ANGLE_IDS = ['ascendant', 'midheaven'] as const;
const ASPECT_IDS = ['conjunction', 'sextile', 'square', 'trine', 'quincunx', 'opposition'] as const;

const strictObject = <Properties extends Readonly<Record<string, unknown>>>(
  properties: Properties,
  required: readonly (keyof Properties & string)[],
) =>
  ({
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  }) as const;

const nonEmptyStringSchema = { type: 'string', minLength: 1 } as const;
const longitudeSchema = { type: 'number', minimum: 0, exclusiveMaximum: 360 } as const;
const planetBodyIdSchema = { type: 'string', enum: PLANET_BODY_IDS } as const;
const angleIdSchema = { type: 'string', enum: ANGLE_IDS } as const;

const pointSchema = {
  oneOf: [
    strictObject(
      {
        kind: { const: 'planet' },
        id: { $ref: '#/$defs/planetBodyId' },
        displayNamePtBr: nonEmptyStringSchema,
        symbol: nonEmptyStringSchema,
        eclipticLongitudeDeg: longitudeSchema,
      },
      ['kind', 'id', 'displayNamePtBr', 'symbol', 'eclipticLongitudeDeg'],
    ),
    strictObject(
      {
        kind: { const: 'angle' },
        id: { $ref: '#/$defs/angleId' },
        displayNamePtBr: nonEmptyStringSchema,
        symbol: { type: 'string', enum: ['ASC', 'MC'] },
        eclipticLongitudeDeg: longitudeSchema,
      },
      ['kind', 'id', 'displayNamePtBr', 'symbol', 'eclipticLongitudeDeg'],
    ),
  ],
} as const;

const pointReferenceSchema = {
  oneOf: [
    strictObject({ kind: { const: 'planet' }, id: { $ref: '#/$defs/planetBodyId' } }, ['kind', 'id']),
    strictObject({ kind: { const: 'angle' }, id: { $ref: '#/$defs/angleId' } }, ['kind', 'id']),
  ],
} as const;

const movementSchema = {
  oneOf: [
    strictObject(
      {
        bodyId: { $ref: '#/$defs/planetBodyId' },
        status: { const: 'available' },
        velocityDegPerDay: { type: 'number' },
        direction: { type: 'string', enum: ['direct', 'retrograde', 'stationary'] },
        basis: { const: 'explicit-ecliptic-longitude-velocity' },
      },
      ['bodyId', 'status', 'velocityDegPerDay', 'direction', 'basis'],
    ),
    strictObject(
      {
        bodyId: { $ref: '#/$defs/planetBodyId' },
        status: { const: 'unavailable' },
        reasonCode: { const: 'LONGITUDINAL_VELOCITY_NOT_PROVIDED' },
        basis: { const: 'explicit-ecliptic-longitude-velocity' },
      },
      ['bodyId', 'status', 'reasonCode', 'basis'],
    ),
  ],
} as const;

const phaseSchema = {
  oneOf: [
    strictObject(
      {
        status: { const: 'available' },
        phase: { type: 'string', enum: ['applying', 'exact', 'separating'] },
        basis: { type: 'string', enum: ['exact-angle-tolerance', 'explicit-longitudinal-velocities'] },
      },
      ['status', 'phase', 'basis'],
    ),
    strictObject(
      {
        status: { const: 'unavailable' },
        reasonCode: {
          type: 'string',
          enum: [
            'LONGITUDINAL_VELOCITY_NOT_PROVIDED',
            'ANGLE_VELOCITY_NOT_PROVIDED',
            'RELATIVE_LONGITUDINAL_VELOCITY_ZERO',
          ],
        },
        basis: { const: 'not-calculated' },
      },
      ['status', 'reasonCode', 'basis'],
    ),
  ],
} as const;

const aspectSchema = strictObject(
  {
    recordId: nonEmptyStringSchema,
    pointA: { $ref: '#/$defs/pointReference' },
    pointB: { $ref: '#/$defs/pointReference' },
    aspectId: { type: 'string', enum: ASPECT_IDS },
    displayNamePtBr: nonEmptyStringSchema,
    separationDeg: { type: 'number', minimum: 0, maximum: 180 },
    exactAngleDeg: { type: 'number', minimum: 0, maximum: 180 },
    allowedOrbDeg: { type: 'number', exclusiveMinimum: 0, maximum: 180 },
    orbDeg: { type: 'number', minimum: 0, maximum: 180 },
    intensityPercent: { type: 'number', minimum: 0, maximum: 100 },
    phase: { $ref: '#/$defs/phase' },
  },
  [
    'recordId',
    'pointA',
    'pointB',
    'aspectId',
    'displayNamePtBr',
    'separationDeg',
    'exactAngleDeg',
    'allowedOrbDeg',
    'orbDeg',
    'intensityPercent',
    'phase',
  ],
);

const occupancySchema = {
  oneOf: [
    strictObject(
      {
        status: { const: 'available' },
        houseIndex1: { type: 'integer', minimum: 1, maximum: 12 },
        basis: { const: 'dados-posicionais-v2-house-placement' },
      },
      ['status', 'houseIndex1', 'basis'],
    ),
    strictObject(
      {
        status: { const: 'unavailable' },
        reasonCode: { type: 'string', enum: ['PLACIDUS_UNAVAILABLE', 'HOUSE_POSITION_UNAVAILABLE'] },
        basis: { const: 'dados-posicionais-v2-house-placement' },
      },
      ['status', 'reasonCode', 'basis'],
    ),
  ],
} as const;

const mundaneDegreeSchema = {
  oneOf: [
    strictObject(
      {
        status: { const: 'available' },
        rawSwissHousePosition: { type: 'number', minimum: 1, exclusiveMaximum: 13 },
        degreeWithinHouseDeg: { type: 'number', minimum: 0, exclusiveMaximum: 30 },
        mundaneLongitudeDeg: longitudeSchema,
        coordinateSystem: { const: 'placidus-house-horoscope' },
        degreeSemantics: { const: 'normalized-semiarc-house-degree' },
        basis: { const: 'explicit-swiss-swe-house-pos' },
      },
      [
        'status',
        'rawSwissHousePosition',
        'degreeWithinHouseDeg',
        'mundaneLongitudeDeg',
        'coordinateSystem',
        'degreeSemantics',
        'basis',
      ],
    ),
    strictObject(
      {
        status: { const: 'unavailable' },
        reasonCode: {
          type: 'string',
          enum: ['POSITION_V2_0_DOES_NOT_EXPOSE_MUNDANE_DEGREE', 'PLACIDUS_UNAVAILABLE', 'HOUSE_POSITION_UNAVAILABLE'],
        },
        basis: { const: 'explicit-swiss-swe-house-pos' },
      },
      ['status', 'reasonCode', 'basis'],
    ),
  ],
} as const;

const houseOccupancySchema = strictObject(
  {
    bodyId: { $ref: '#/$defs/planetBodyId' },
    occupancy: { $ref: '#/$defs/occupancy' },
    mundaneDegreeWithinHouse: { $ref: '#/$defs/mundaneDegree' },
  },
  ['bodyId', 'occupancy', 'mundaneDegreeWithinHouse'],
);

const aspectDefinitionSchema = strictObject(
  {
    aspectId: { type: 'string', enum: ASPECT_IDS },
    displayNamePtBr: nonEmptyStringSchema,
    exactAngleDeg: { type: 'number', minimum: 0, maximum: 180 },
    allowedOrbDeg: { type: 'number', exclusiveMinimum: 0, maximum: 180 },
  },
  ['aspectId', 'displayNamePtBr', 'exactAngleDeg', 'allowedOrbDeg'],
);

const diagnosticSchema = strictObject(
  {
    severity: { type: 'string', enum: ['info', 'warning'] },
    code: {
      type: 'string',
      enum: [
        'LONGITUDINAL_VELOCITIES_NOT_PROVIDED',
        'LONGITUDINAL_VELOCITIES_PARTIAL',
        'RAW_SWISS_HOUSE_POSITIONS_NOT_PROVIDED',
        'RAW_SWISS_HOUSE_POSITIONS_PARTIAL',
        'PLACIDUS_UNAVAILABLE',
      ],
    },
  },
  ['severity', 'code'],
);

/**
 * Contrato serializável e estrito do núcleo natal. Invariantes geométricas e
 * relacionais são verificadas adicionalmente por `validateNatalChartAnalysisV1`.
 */
export const NATAL_CHART_ANALYSIS_V1_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'urn:astrologo:natal-chart-analysis:v1:schema',
  title: 'NatalChartAnalysisV1',
  type: 'object',
  properties: {
    schemaId: { const: NATAL_CHART_ANALYSIS_SCHEMA_ID },
    schemaVersion: { const: NATAL_CHART_ANALYSIS_SCHEMA_VERSION },
    source: strictObject(
      {
        schemaId: { const: POSITIONAL_SCHEMA_ID },
        schemaVersion: { const: POSITIONAL_SCHEMA_VERSION },
        calculationId: nonEmptyStringSchema,
        calculatedAtUtc: nonEmptyStringSchema,
      },
      ['schemaId', 'schemaVersion', 'calculationId', 'calculatedAtUtc'],
    ),
    targetSet: strictObject({ id: { const: NATAL_CHART_ANALYSIS_TARGET_SET_ID }, version: { const: '1.0.0' } }, [
      'id',
      'version',
    ]),
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
        aspects: strictObject(
          {
            profileId: { const: 'astrologo-natal-major-v1' },
            profileVersion: { const: '1.0.0' },
            orbPolicy: { const: 'fixed-by-aspect-no-body-modifiers' },
            orbBoundaryConvention: { const: 'inclusive' },
            separationMethod: { const: 'smallest-angular-distance-0-to-180' },
            pairPolicy: { const: 'planet-to-planet-and-planet-to-asc-mc' },
            intensityModel: { const: 'linear-from-exact-to-orb-boundary-v1' },
            applyingSeparatingMethod: { const: 'explicit-longitudinal-velocity-derivative-v1' },
            exactToleranceDeg: { const: 1e-9 },
            aspectDefinitions: {
              type: 'array',
              minItems: 6,
              maxItems: 6,
              uniqueItems: true,
              items: aspectDefinitionSchema,
            },
          },
          [
            'profileId',
            'profileVersion',
            'orbPolicy',
            'orbBoundaryConvention',
            'separationMethod',
            'pairPolicy',
            'intensityModel',
            'applyingSeparatingMethod',
            'exactToleranceDeg',
            'aspectDefinitions',
          ],
        ),
        houses: strictObject(
          {
            systemId: { const: 'placidus' },
            occupancyBasis: { const: 'dados-posicionais-v2-house-placement' },
            mundaneDegreeBasis: { const: 'swiss-swe-house-pos-fraction-times-30' },
          },
          ['systemId', 'occupancyBasis', 'mundaneDegreeBasis'],
        ),
      },
      ['aspects', 'houses'],
    ),
    points: { type: 'array', minItems: 10, maxItems: 12, items: { $ref: '#/$defs/point' } },
    movements: {
      type: 'array',
      minItems: 10,
      maxItems: 10,
      items: { $ref: '#/$defs/movement' },
    },
    aspects: { type: 'array', maxItems: 65, items: { $ref: '#/$defs/aspect' } },
    houseOccupancies: {
      type: 'array',
      minItems: 10,
      maxItems: 10,
      items: { $ref: '#/$defs/houseOccupancy' },
    },
    diagnostics: { type: 'array', maxItems: 3, uniqueItems: true, items: diagnosticSchema },
  },
  required: [
    'schemaId',
    'schemaVersion',
    'source',
    'targetSet',
    'presentationPolicy',
    'models',
    'points',
    'movements',
    'aspects',
    'houseOccupancies',
    'diagnostics',
  ],
  additionalProperties: false,
  $defs: {
    planetBodyId: planetBodyIdSchema,
    angleId: angleIdSchema,
    point: pointSchema,
    pointReference: pointReferenceSchema,
    movement: movementSchema,
    phase: phaseSchema,
    aspect: aspectSchema,
    occupancy: occupancySchema,
    mundaneDegree: mundaneDegreeSchema,
    houseOccupancy: houseOccupancySchema,
  },
} as const;

export interface NatalChartAnalysisV1ValidationIssue {
  readonly instancePath: string;
  readonly keyword: string;
  readonly message: string;
}

export type NatalChartAnalysisV1ValidationResult =
  | { readonly valid: true; readonly value: NatalChartAnalysisV1 }
  | { readonly valid: false; readonly errors: readonly NatalChartAnalysisV1ValidationIssue[] };

type SchemaNode = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const escapeJsonPointerToken = (token: string): string => token.replaceAll('~', '~0').replaceAll('/', '~1');
const childPath = (parent: string, token: string | number): string =>
  `${parent}/${escapeJsonPointerToken(String(token))}`;

const addIssue = (
  errors: NatalChartAnalysisV1ValidationIssue[],
  instancePath: string,
  keyword: string,
  message: string,
): void => {
  errors.push({ instancePath, keyword, message });
};

const sameJsonValue = (left: unknown, right: unknown): boolean =>
  Object.is(left, right) ||
  (((Array.isArray(left) && Array.isArray(right)) || (isRecord(left) && isRecord(right))) &&
    JSON.stringify(left) === JSON.stringify(right));

const resolveLocalReference = (reference: string): SchemaNode | null => {
  if (!reference.startsWith('#/')) return null;
  let current: unknown = NATAL_CHART_ANALYSIS_V1_JSON_SCHEMA;
  for (const encodedToken of reference.slice(2).split('/')) {
    const token = encodedToken.replaceAll('~1', '/').replaceAll('~0', '~');
    if (!isRecord(current) || !(token in current)) return null;
    current = current[token];
  }
  return isRecord(current) ? current : null;
};

const validateType = (
  value: unknown,
  type: unknown,
  instancePath: string,
  errors: NatalChartAnalysisV1ValidationIssue[],
): boolean => {
  if (type === 'number' || type === 'integer') {
    if (typeof value !== 'number') {
      addIssue(errors, instancePath, 'type', `deve ser ${type}`);
      return false;
    }
    if (!Number.isFinite(value)) {
      addIssue(errors, instancePath, 'finite', 'deve ser um número finito');
      return false;
    }
    if (type === 'integer' && !Number.isInteger(value)) {
      addIssue(errors, instancePath, 'type', 'deve ser um inteiro');
      return false;
    }
    return true;
  }
  const matches =
    (type === 'object' && isRecord(value)) ||
    (type === 'array' && Array.isArray(value)) ||
    (type === 'string' && typeof value === 'string');
  if (!matches) addIssue(errors, instancePath, 'type', `deve ser ${String(type)}`);
  return matches;
};

const validateSchemaNode = (
  value: unknown,
  schema: SchemaNode,
  instancePath: string,
  errors: NatalChartAnalysisV1ValidationIssue[],
): void => {
  if (typeof schema.$ref === 'string') {
    const referenced = resolveLocalReference(schema.$ref);
    if (referenced) validateSchemaNode(value, referenced, instancePath, errors);
    else addIssue(errors, instancePath, '$ref', `referência local não encontrada: ${schema.$ref}`);
    return;
  }
  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((branch) => {
      const candidateErrors: NatalChartAnalysisV1ValidationIssue[] = [];
      if (isRecord(branch)) validateSchemaNode(value, branch, instancePath, candidateErrors);
      return candidateErrors.length === 0;
    }).length;
    if (matches !== 1) addIssue(errors, instancePath, 'oneOf', 'deve satisfazer exatamente uma alternativa do schema');
    return;
  }
  if ('const' in schema && !sameJsonValue(value, schema.const)) {
    addIssue(errors, instancePath, 'const', `deve ser ${JSON.stringify(schema.const)}`);
    return;
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => sameJsonValue(value, candidate))) {
    addIssue(errors, instancePath, 'enum', 'deve pertencer ao conjunto permitido');
    return;
  }
  if (schema.type !== undefined && !validateType(value, schema.type, instancePath, errors)) return;

  if (typeof value === 'string' && typeof schema.minLength === 'number' && value.length < schema.minLength) {
    addIssue(errors, instancePath, 'minLength', `deve ter ao menos ${schema.minLength} caractere(s)`);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      addIssue(errors, instancePath, 'minimum', `deve ser maior ou igual a ${schema.minimum}`);
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      addIssue(errors, instancePath, 'maximum', `deve ser menor ou igual a ${schema.maximum}`);
    }
    if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) {
      addIssue(errors, instancePath, 'exclusiveMinimum', `deve ser maior que ${schema.exclusiveMinimum}`);
    }
    if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) {
      addIssue(errors, instancePath, 'exclusiveMaximum', `deve ser menor que ${schema.exclusiveMaximum}`);
    }
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      addIssue(errors, instancePath, 'minItems', `deve conter ao menos ${schema.minItems} item(ns)`);
    }
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
      addIssue(errors, instancePath, 'maxItems', `deve conter no máximo ${schema.maxItems} item(ns)`);
    }
    if (schema.uniqueItems === true) {
      value.forEach((item, index) => {
        if (value.slice(0, index).some((candidate) => sameJsonValue(candidate, item))) {
          addIssue(errors, childPath(instancePath, index), 'uniqueItems', 'item duplicado');
        }
      });
    }
    if (isRecord(schema.items)) {
      value.forEach((item, index) => {
        validateSchemaNode(item, schema.items as SchemaNode, childPath(instancePath, index), errors);
      });
    }
  }
  if (isRecord(value)) {
    const properties = isRecord(schema.properties) ? schema.properties : {};
    if (Array.isArray(schema.required)) {
      for (const property of schema.required) {
        if (typeof property === 'string' && !Object.hasOwn(value, property)) {
          addIssue(errors, childPath(instancePath, property), 'required', 'propriedade obrigatória ausente');
        }
      }
    }
    for (const [property, propertyValue] of Object.entries(value)) {
      const propertySchema = properties[property];
      if (isRecord(propertySchema))
        validateSchemaNode(propertyValue, propertySchema, childPath(instancePath, property), errors);
      else if (schema.additionalProperties === false) {
        addIssue(errors, childPath(instancePath, property), 'additionalProperties', 'propriedade não permitida');
      }
    }
  }
};

const scanJsonSafety = (
  value: unknown,
  instancePath: string,
  seen: WeakSet<object>,
  errors: NatalChartAnalysisV1ValidationIssue[],
): void => {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    addIssue(errors, instancePath, 'finite', 'deve ser um número finito');
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  if (seen.has(value)) {
    addIssue(errors, instancePath, 'jsonValue', 'referência circular não é serializável como JSON');
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      scanJsonSafety(item, childPath(instancePath, index), seen, errors);
    });
  } else {
    Object.entries(value).forEach(([property, propertyValue]) => {
      scanJsonSafety(propertyValue, childPath(instancePath, property), seen, errors);
    });
  }
  seen.delete(value);
};

const closeEnough = (left: number, right: number): boolean => Math.abs(left - right) <= 1e-9;
const pointKey = (point: { readonly kind: string; readonly id: string }): string => `${point.kind}:${point.id}`;

const addRelationalIssue = (
  errors: NatalChartAnalysisV1ValidationIssue[],
  path: string,
  keyword: string,
  message: string,
): void => addIssue(errors, path, keyword, message);

const validateRelationalInvariants = (
  value: NatalChartAnalysisV1,
  errors: NatalChartAnalysisV1ValidationIssue[],
): void => {
  const profile = value.models.aspects;
  const expectedDefinitions = NATAL_CHART_ASPECT_PROFILE.aspectDefinitions;
  const definitionsMatch =
    profile.aspectDefinitions.length === expectedDefinitions.length &&
    profile.aspectDefinitions.every((definition, index) => {
      const expected = expectedDefinitions[index];
      return (
        expected !== undefined &&
        definition.aspectId === expected.aspectId &&
        definition.displayNamePtBr === expected.displayNamePtBr &&
        definition.exactAngleDeg === expected.exactAngleDeg &&
        definition.allowedOrbDeg === expected.allowedOrbDeg
      );
    });
  if (!definitionsMatch) {
    addRelationalIssue(
      errors,
      '/models/aspects',
      'aspectProfileConsistency',
      'deve reproduzir exatamente o perfil versionado',
    );
  }

  const planetPoints = value.points.filter(({ kind }) => kind === 'planet');
  const anglePoints = value.points.filter(({ kind }) => kind === 'angle');
  if (
    !planetPoints.every((point, index) => point.id === PLANET_BODY_IDS[index]) ||
    planetPoints.length !== PLANET_BODY_IDS.length
  ) {
    addRelationalIssue(errors, '/points', 'canonicalPointOrder', 'deve conter os dez planetas na ordem canônica');
  }
  const expectedAngleIds = ANGLE_IDS.filter((angleId) => anglePoints.some(({ id }) => id === angleId));
  if (!anglePoints.every((point, index) => point.id === expectedAngleIds[index])) {
    addRelationalIssue(
      errors,
      '/points',
      'canonicalPointOrder',
      'os ângulos devem seguir a ordem Ascendente e Meio do Céu',
    );
  }
  if (!value.movements.every(({ bodyId }, index) => bodyId === PLANET_BODY_IDS[index])) {
    addRelationalIssue(errors, '/movements', 'canonicalPlanetOrder', 'deve seguir a ordem canônica dos dez planetas');
  }
  if (!value.houseOccupancies.every(({ bodyId }, index) => bodyId === PLANET_BODY_IDS[index])) {
    addRelationalIssue(
      errors,
      '/houseOccupancies',
      'canonicalPlanetOrder',
      'deve seguir a ordem canônica dos dez planetas',
    );
  }

  const pointByKey = new Map(value.points.map((point) => [pointKey(point), point] as const));
  for (const point of anglePoints) {
    const expectedSymbol = point.id === 'ascendant' ? 'ASC' : 'MC';
    if (point.symbol !== expectedSymbol) {
      addRelationalIssue(
        errors,
        `/points/${value.points.indexOf(point)}/symbol`,
        'angleSymbolConsistency',
        'o símbolo deve corresponder ao ângulo',
      );
    }
  }
  const movementByBody = new Map(value.movements.map((movement) => [movement.bodyId, movement] as const));
  const expectedRecordIds: string[] = [];
  for (let leftIndex = 0; leftIndex < value.points.length; leftIndex += 1) {
    const pointA = value.points[leftIndex];
    if (!pointA) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < value.points.length; rightIndex += 1) {
      const pointB = value.points[rightIndex];
      if (!pointB || (pointA.kind === 'angle' && pointB.kind === 'angle')) continue;
      const resolved = resolveNatalMajorAspect(
        angularSeparationDeg(pointA.eclipticLongitudeDeg, pointB.eclipticLongitudeDeg),
      );
      if (resolved) expectedRecordIds.push(`${pointKey(pointA)}--${pointKey(pointB)}`);
    }
  }
  const actualRecordIds = value.aspects.map(({ recordId }) => recordId);
  if (
    expectedRecordIds.length !== actualRecordIds.length ||
    expectedRecordIds.some((recordId, index) => actualRecordIds[index] !== recordId)
  ) {
    addRelationalIssue(
      errors,
      '/aspects',
      'completeAspectSet',
      'deve conter exatamente os pares que satisfazem o perfil, na ordem canônica',
    );
  }

  value.aspects.forEach((aspect, index) => {
    const path = `/aspects/${index}`;
    const pointA = pointByKey.get(pointKey(aspect.pointA));
    const pointB = pointByKey.get(pointKey(aspect.pointB));
    if (!pointA || !pointB) {
      addRelationalIssue(errors, path, 'knownPointReference', 'deve referenciar pontos existentes');
      return;
    }
    const expectedRecordId = `${pointKey(pointA)}--${pointKey(pointB)}`;
    const separationDeg = angularSeparationDeg(pointA.eclipticLongitudeDeg, pointB.eclipticLongitudeDeg);
    const resolved = resolveNatalMajorAspect(separationDeg);
    const aspectIsConsistent =
      aspect.recordId === expectedRecordId &&
      resolved !== null &&
      aspect.aspectId === resolved.aspectId &&
      aspect.displayNamePtBr === resolved.displayNamePtBr &&
      closeEnough(aspect.separationDeg, separationDeg) &&
      closeEnough(aspect.exactAngleDeg, resolved.exactAngleDeg) &&
      closeEnough(aspect.allowedOrbDeg, resolved.allowedOrbDeg) &&
      closeEnough(aspect.orbDeg, resolved.orbDeg) &&
      closeEnough(aspect.intensityPercent, resolved.intensityPercent);
    if (!aspectIsConsistent) {
      addRelationalIssue(
        errors,
        path,
        'aspectGeometryConsistency',
        'geometria, orbe, intensidade e identificação devem corresponder ao perfil',
      );
    }
    if (aspect.orbDeg <= NATAL_CHART_ASPECT_PROFILE.exactToleranceDeg) {
      if (
        aspect.phase.status !== 'available' ||
        aspect.phase.phase !== 'exact' ||
        aspect.phase.basis !== 'exact-angle-tolerance'
      ) {
        addRelationalIssue(
          errors,
          `${path}/phase`,
          'aspectPhaseConsistency',
          'um aspecto exato deve usar a tolerância explícita',
        );
      }
    } else if (pointA.kind === 'angle' || pointB.kind === 'angle') {
      if (aspect.phase.status !== 'unavailable' || aspect.phase.reasonCode !== 'ANGLE_VELOCITY_NOT_PROVIDED') {
        addRelationalIssue(
          errors,
          `${path}/phase`,
          'aspectPhaseConsistency',
          'aspectos não exatos com ângulo não podem inventar velocidade angular',
        );
      }
    } else {
      const movementA = movementByBody.get(pointA.id as PlanetBodyId);
      const movementB = movementByBody.get(pointB.id as PlanetBodyId);
      if (movementA?.status !== 'available' || movementB?.status !== 'available') {
        if (aspect.phase.status !== 'unavailable' || aspect.phase.reasonCode !== 'LONGITUDINAL_VELOCITY_NOT_PROVIDED') {
          addRelationalIssue(
            errors,
            `${path}/phase`,
            'aspectPhaseConsistency',
            'a fase requer velocidades explícitas para os dois planetas',
          );
        }
      } else {
        const directedDifference = (((pointB.eclipticLongitudeDeg - pointA.eclipticLongitudeDeg) % 360) + 360) % 360;
        const relativeVelocity = movementB.velocityDegPerDay - movementA.velocityDegPerDay;
        const separationDerivative = directedDifference < 180 ? relativeVelocity : -relativeVelocity;
        if (Math.abs(separationDerivative) <= Number.EPSILON) {
          if (
            aspect.phase.status !== 'unavailable' ||
            aspect.phase.reasonCode !== 'RELATIVE_LONGITUDINAL_VELOCITY_ZERO'
          ) {
            addRelationalIssue(
              errors,
              `${path}/phase`,
              'aspectPhaseConsistency',
              'movimento relativo nulo não define fase aplicativo ou separativo',
            );
          }
        } else {
          const deviationDerivative = Math.sign(aspect.exactAngleDeg - separationDeg) * separationDerivative;
          const expectedPhase = deviationDerivative > 0 ? 'applying' : 'separating';
          if (
            aspect.phase.status !== 'available' ||
            aspect.phase.phase !== expectedPhase ||
            aspect.phase.basis !== 'explicit-longitudinal-velocities'
          ) {
            addRelationalIssue(
              errors,
              `${path}/phase`,
              'aspectPhaseConsistency',
              'a fase deve corresponder à derivada das velocidades longitudinais explícitas',
            );
          }
        }
      }
    }
  });

  value.movements.forEach((movement, index) => {
    if (movement.status !== 'available') return;
    const expectedDirection =
      movement.velocityDegPerDay > 0 ? 'direct' : movement.velocityDegPerDay < 0 ? 'retrograde' : 'stationary';
    if (movement.direction !== expectedDirection) {
      addRelationalIssue(
        errors,
        `/movements/${index}/direction`,
        'movementDirectionConsistency',
        'a direção deve corresponder ao sinal da velocidade explícita',
      );
    }
  });

  value.houseOccupancies.forEach((house, index) => {
    const mundane = house.mundaneDegreeWithinHouse;
    if (mundane.status === 'available') {
      const occupancy = house.occupancy;
      const consistent =
        occupancy.status === 'available' &&
        Math.floor(mundane.rawSwissHousePosition) === occupancy.houseIndex1 &&
        closeEnough(
          mundane.degreeWithinHouseDeg,
          (mundane.rawSwissHousePosition - Math.floor(mundane.rawSwissHousePosition)) * 30,
        ) &&
        closeEnough(mundane.mundaneLongitudeDeg, (mundane.rawSwissHousePosition - 1) * 30);
      if (!consistent) {
        addRelationalIssue(
          errors,
          `/houseOccupancies/${index}`,
          'mundaneHouseDegreeConsistency',
          'o grau mundano deve corresponder ao hpos Swiss e à casa ocupada',
        );
      }
    } else {
      const reasonIsConsistent =
        house.occupancy.status === 'available'
          ? mundane.reasonCode === 'POSITION_V2_0_DOES_NOT_EXPOSE_MUNDANE_DEGREE'
          : mundane.reasonCode === house.occupancy.reasonCode;
      if (!reasonIsConsistent) {
        addRelationalIssue(
          errors,
          `/houseOccupancies/${index}`,
          'mundaneHouseDegreeConsistency',
          'a indisponibilidade mundana deve corresponder à disponibilidade da ocupação',
        );
      }
    }
  });
};

export function validateNatalChartAnalysisV1(value: unknown): NatalChartAnalysisV1ValidationResult {
  const errors: NatalChartAnalysisV1ValidationIssue[] = [];
  scanJsonSafety(value, '', new WeakSet(), errors);
  if (errors.length > 0) return { valid: false, errors };
  validateSchemaNode(value, NATAL_CHART_ANALYSIS_V1_JSON_SCHEMA, '', errors);
  if (errors.length > 0) return { valid: false, errors };
  const validated = value as NatalChartAnalysisV1;
  validateRelationalInvariants(validated, errors);
  return errors.length === 0 ? { valid: true, value: validated } : { valid: false, errors };
}

export function isNatalChartAnalysisV1(value: unknown): value is NatalChartAnalysisV1 {
  return validateNatalChartAnalysisV1(value).valid;
}
