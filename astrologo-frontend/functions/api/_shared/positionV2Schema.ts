import {
  ANGEL_CATALOG_SHA256,
  ASTRONOMY_ENGINE_SOURCE_SHA256,
  type DadosPosicionaisV2,
  type PlanetBodyId,
  POSITIONAL_SCHEMA_ID,
  POSITIONAL_SCHEMA_VERSION,
  POSITIONAL_TARGET_SET_ID,
  SWISS_EPHEMERIS_WASM_SHA256,
} from './positionV2';

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

const FORBIDDEN_PROPERTIES = new Set(['primaryAngel', 'regenteNatal']);

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

const planetBodyIdSchema = { type: 'string', enum: PLANET_BODY_IDS } as const;
const nonEmptyStringSchema = { type: 'string', minLength: 1 } as const;
const longitudeSchema = { type: 'number', minimum: 0, exclusiveMaximum: 360 } as const;
const longitudeEndExclusiveSchema = { type: 'number', exclusiveMinimum: 0, maximum: 360 } as const;
const latitudeSchema = { type: 'number', minimum: -90, maximum: 90 } as const;
const sha256Schema = { type: 'string', pattern: '^[0-9a-f]{64}$' } as const;

const degreeWithinConstellationSchema = strictObject(
  {
    status: { const: 'not-defined' },
    reasonCode: { const: 'IAU_CONSTELLATIONS_ARE_2D_AREAS' },
  },
  ['status', 'reasonCode'],
);

const tropicalSummarySchema = strictObject(
  {
    signId: nonEmptyStringSchema,
    signNamePtBr: nonEmptyStringSchema,
    degreeWithinSignDeg: { type: 'number', minimum: 0, exclusiveMaximum: 30 },
  },
  ['signId', 'signNamePtBr', 'degreeWithinSignDeg'],
);

const tropicalProjectionSchema = strictObject(
  {
    status: { const: 'available' },
    sign: strictObject(
      {
        id: nonEmptyStringSchema,
        index0: { type: 'integer', minimum: 0, maximum: 11 },
        namePtBr: nonEmptyStringSchema,
        startLongitudeDeg: longitudeSchema,
        endLongitudeDegExclusive: longitudeEndExclusiveSchema,
      },
      ['id', 'index0', 'namePtBr', 'startLongitudeDeg', 'endLongitudeDegExclusive'],
    ),
    degreeWithinSignDeg: { type: 'number', minimum: 0, exclusiveMaximum: 30 },
    decan: strictObject(
      {
        index1: { type: 'integer', minimum: 1, maximum: 3 },
        startDegreeWithinSign: { type: 'number', minimum: 0, exclusiveMaximum: 30 },
        endDegreeWithinSignExclusive: { type: 'number', exclusiveMinimum: 0, maximum: 30 },
      },
      ['index1', 'startDegreeWithinSign', 'endDegreeWithinSignExclusive'],
    ),
  },
  ['status', 'sign', 'degreeWithinSignDeg', 'decan'],
);

const angelicQuinarySchema = strictObject(
  {
    status: { const: 'available' },
    basisSystem: { const: 'tropical' },
    basisLongitudeDeg: longitudeSchema,
    quinary: strictObject(
      {
        index1: { type: 'integer', minimum: 1, maximum: 72 },
        globalStartLongitudeDeg: longitudeSchema,
        globalEndLongitudeDegExclusive: longitudeEndExclusiveSchema,
      },
      ['index1', 'globalStartLongitudeDeg', 'globalEndLongitudeDegExclusive'],
    ),
    angel: strictObject(
      {
        id: { type: 'integer', minimum: 1, maximum: 72 },
        canonicalName: nonEmptyStringSchema,
        aliases: { type: 'array', items: nonEmptyStringSchema, uniqueItems: true },
        hebrewTriplet: nonEmptyStringSchema,
        choir: nonEmptyStringSchema,
        prince: nonEmptyStringSchema,
        qualitySummaryPtBr: nonEmptyStringSchema,
        sourcePermalink: nonEmptyStringSchema,
      },
      ['id', 'canonicalName', 'aliases', 'hebrewTriplet', 'choir', 'prince', 'qualitySummaryPtBr', 'sourcePermalink'],
    ),
  },
  ['status', 'basisSystem', 'basisLongitudeDeg', 'quinary', 'angel'],
);

const astronomicalRealSchema = {
  oneOf: [
    strictObject(
      {
        status: { const: 'available' },
        constellation: strictObject(
          {
            iauCode: nonEmptyStringSchema,
            latinName: nonEmptyStringSchema,
            namePtBr: nonEmptyStringSchema,
          },
          ['iauCode', 'latinName', 'namePtBr'],
        ),
        degreeWithinConstellation: degreeWithinConstellationSchema,
      },
      ['status', 'constellation', 'degreeWithinConstellation'],
    ),
    strictObject(
      {
        status: { const: 'unavailable' },
        reasonCode: {
          type: 'string',
          enum: ['IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN', 'SWISS_REFERENCE_UNAVAILABLE'],
        },
        degreeWithinConstellation: degreeWithinConstellationSchema,
      },
      ['status', 'reasonCode', 'degreeWithinConstellation'],
    ),
  ],
} as const;

const housePlacementSchema = {
  oneOf: [
    strictObject(
      {
        status: { const: 'available' },
        houseIndex1: { type: 'integer', minimum: 1, maximum: 12 },
        basis: { const: 'swiss-swe-house-pos' },
      },
      ['status', 'houseIndex1', 'basis'],
    ),
    strictObject(
      {
        status: { const: 'unavailable' },
        basis: { const: 'swiss-swe-house-pos' },
        reasonCode: { type: 'string', enum: ['PLACIDUS_UNAVAILABLE', 'HOUSE_POSITION_UNAVAILABLE'] },
      },
      ['status', 'basis', 'reasonCode'],
    ),
  ],
} as const;

const planetPositionSchema = strictObject(
  {
    bodyId: { $ref: '#/$defs/planetBodyId' },
    kind: { const: 'planet' },
    displayNamePtBr: nonEmptyStringSchema,
    symbol: nonEmptyStringSchema,
    coordinates: strictObject(
      {
        eclipticLongitudeDeg: longitudeSchema,
        eclipticLatitudeDeg: latitudeSchema,
        rightAscensionHours: { type: 'number', minimum: 0, exclusiveMaximum: 24 },
        declinationDeg: latitudeSchema,
      },
      ['eclipticLongitudeDeg', 'eclipticLatitudeDeg', 'rightAscensionHours', 'declinationDeg'],
    ),
    tropical: tropicalProjectionSchema,
    astronomicalReal: astronomicalRealSchema,
    housePlacement: housePlacementSchema,
    angelicQuinary: angelicQuinarySchema,
  },
  [
    'bodyId',
    'kind',
    'displayNamePtBr',
    'symbol',
    'coordinates',
    'tropical',
    'astronomicalReal',
    'housePlacement',
    'angelicQuinary',
  ],
);

const resolvedBirthTimeSchema = strictObject(
  {
    status: { const: 'resolved' },
    timeZoneIana: nonEmptyStringSchema,
    instantUtc: nonEmptyStringSchema,
    offsetAtBirth: nonEmptyStringSchema,
    disambiguation: { type: 'string', enum: ['exact', 'earlier', 'later'] },
    historicalConfidence: { type: 'string', enum: ['certified-1970-plus', 'best-effort-1900-1969'] },
  },
  ['status', 'timeZoneIana', 'instantUtc', 'offsetAtBirth', 'disambiguation', 'historicalConfidence'],
);

const housesSchema = {
  oneOf: [
    strictObject(
      {
        systemId: { const: 'placidus' },
        status: { const: 'available' },
        cusps: {
          type: 'array',
          minItems: 12,
          maxItems: 12,
          items: strictObject(
            {
              houseIndex1: { type: 'integer', minimum: 1, maximum: 12 },
              eclipticLongitudeDeg: longitudeSchema,
              tropical: tropicalSummarySchema,
            },
            ['houseIndex1', 'eclipticLongitudeDeg', 'tropical'],
          ),
        },
      },
      ['systemId', 'status', 'cusps'],
    ),
    strictObject(
      {
        systemId: { const: 'placidus' },
        status: { const: 'unavailable' },
        reasonCode: { const: 'PLACIDUS_UNAVAILABLE' },
      },
      ['systemId', 'status', 'reasonCode'],
    ),
  ],
} as const;

const angleSchema = strictObject(
  {
    angleId: { type: 'string', enum: ['ascendant', 'midheaven'] },
    displayNamePtBr: nonEmptyStringSchema,
    eclipticLongitudeDeg: longitudeSchema,
    tropical: tropicalSummarySchema,
  },
  ['angleId', 'displayNamePtBr', 'eclipticLongitudeDeg', 'tropical'],
);

const diagnosticSchema = strictObject(
  {
    severity: { const: 'warning' },
    code: {
      type: 'string',
      enum: ['HISTORICAL_TIMEZONE_BEST_EFFORT', 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN', 'PLACIDUS_UNAVAILABLE'],
    },
    bodyId: { $ref: '#/$defs/planetBodyId' },
  },
  ['severity', 'code'],
);

/**
 * Contrato serializável do payload posicional. O schema usa apenas vocabulário
 * do JSON Schema Draft 2020-12; invariantes entre coleções são verificadas
 * adicionalmente por `validateDadosPosicionaisV2`.
 */
export const DADOS_POSICIONAIS_V2_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'urn:astrologo:dados-posicionais:v2:schema',
  title: 'DadosPosicionaisV2',
  type: 'object',
  properties: {
    schemaId: { const: POSITIONAL_SCHEMA_ID },
    schemaVersion: { const: POSITIONAL_SCHEMA_VERSION },
    calculationId: nonEmptyStringSchema,
    calculatedAtUtc: nonEmptyStringSchema,
    targetSet: strictObject(
      {
        id: { const: POSITIONAL_TARGET_SET_ID },
        version: { const: '1.0.0' },
        orderedIds: {
          type: 'array',
          minItems: 10,
          maxItems: 10,
          uniqueItems: true,
          items: { $ref: '#/$defs/planetBodyId' },
        },
      },
      ['id', 'version', 'orderedIds'],
    ),
    birthContext: strictObject(
      {
        civilInput: strictObject(
          {
            calendar: { const: 'gregory' },
            date: nonEmptyStringSchema,
            time: nonEmptyStringSchema,
            semantics: { const: 'wall-time-at-birthplace' },
          },
          ['calendar', 'date', 'time', 'semantics'],
        ),
        place: strictObject(
          {
            sourceLabel: nonEmptyStringSchema,
            latitudeDeg: latitudeSchema,
            longitudeDeg: { type: 'number', minimum: -180, maximum: 180 },
            elevationMeters: { oneOf: [{ type: 'number' }, { type: 'null' }] },
            geocoder: strictObject(
              {
                provider: { const: 'open-meteo' },
                providerResultId: { type: 'integer' },
              },
              ['provider', 'providerResultId'],
            ),
          },
          ['sourceLabel', 'latitudeDeg', 'longitudeDeg', 'elevationMeters', 'geocoder'],
        ),
        timeResolution: resolvedBirthTimeSchema,
      },
      ['civilInput', 'place', 'timeResolution'],
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
        ephemeris: strictObject(
          {
            engineId: { const: 'astronomy-engine' },
            engineVersion: { const: '2.1.19' },
            sourceSha256: { const: ASTRONOMY_ENGINE_SOURCE_SHA256 },
            observerOrigin: { const: 'geocentric' },
            apparentOrAstrometric: { const: 'apparent' },
            eclipticReference: { const: 'true-ecliptic-of-date' },
          },
          ['engineId', 'engineVersion', 'sourceSha256', 'observerOrigin', 'apparentOrAstrometric', 'eclipticReference'],
        ),
        houses: strictObject(
          {
            engineId: { const: 'swiss-ephemeris-wasm' },
            engineVersion: { const: '2.10.03' },
            runtimeWasmSha256: { const: SWISS_EPHEMERIS_WASM_SHA256 },
            systemId: { const: 'placidus' },
          },
          ['engineId', 'engineVersion', 'runtimeWasmSha256', 'systemId'],
        ),
        astronomicalReal: strictObject(
          {
            methodId: { const: 'iau-roman-1987-b1875-consensus-v1' },
            boundaryDatasetVersion: { const: 'astronomy-engine-2.1.19' },
            boundaryDatasetSha256: { const: ASTRONOMY_ENGINE_SOURCE_SHA256 },
            classificationEpoch: { const: 'B1875' },
            boundaryGuardArcminutes: { const: 20 },
            translationPolicy: { const: 'curated-pt-br-editorial-v1' },
          },
          [
            'methodId',
            'boundaryDatasetVersion',
            'boundaryDatasetSha256',
            'classificationEpoch',
            'boundaryGuardArcminutes',
            'translationPolicy',
          ],
        ),
      },
      ['ephemeris', 'houses', 'astronomicalReal'],
    ),
    catalogs: strictObject(
      {
        angelic72: strictObject(
          {
            catalogId: { const: 'mayhem-shem-hamephorash-tropical-72x5' },
            catalogVersion: nonEmptyStringSchema,
            catalogSha256: { const: ANGEL_CATALOG_SHA256 },
            intervalConvention: { const: '[start,end)' },
            identityKey: { const: 'numeric-id-1-to-72' },
          },
          ['catalogId', 'catalogVersion', 'catalogSha256', 'intervalConvention', 'identityKey'],
        ),
      },
      ['angelic72'],
    ),
    houses: housesSchema,
    angles: { type: 'array', maxItems: 2, uniqueItems: true, items: angleSchema },
    positions: {
      type: 'array',
      minItems: 10,
      maxItems: 10,
      items: { $ref: '#/$defs/planetPosition' },
    },
    aggregates: strictObject(
      {
        angelicFalange: {
          type: 'array',
          minItems: 1,
          maxItems: 10,
          items: strictObject(
            {
              angelId: { type: 'integer', minimum: 1, maximum: 72 },
              memberBodyIds: {
                type: 'array',
                minItems: 1,
                maxItems: 10,
                uniqueItems: true,
                items: { $ref: '#/$defs/planetBodyId' },
              },
              occurrenceCount: { type: 'integer', minimum: 1, maximum: 10 },
            },
            ['angelId', 'memberBodyIds', 'occurrenceCount'],
          ),
        },
      },
      ['angelicFalange'],
    ),
    diagnostics: { type: 'array', items: diagnosticSchema },
  },
  required: [
    'schemaId',
    'schemaVersion',
    'calculationId',
    'calculatedAtUtc',
    'targetSet',
    'birthContext',
    'presentationPolicy',
    'models',
    'catalogs',
    'houses',
    'angles',
    'positions',
    'aggregates',
    'diagnostics',
  ],
  additionalProperties: false,
  $defs: {
    planetBodyId: planetBodyIdSchema,
    planetPosition: planetPositionSchema,
    sha256: sha256Schema,
  },
} as const;

export interface DadosPosicionaisV2ValidationIssue {
  readonly instancePath: string;
  readonly keyword: string;
  readonly message: string;
}

export type DadosPosicionaisV2ValidationResult =
  | { readonly valid: true; readonly value: DadosPosicionaisV2 }
  | { readonly valid: false; readonly errors: readonly DadosPosicionaisV2ValidationIssue[] };

type SchemaNode = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const escapeJsonPointerToken = (token: string): string => token.replaceAll('~', '~0').replaceAll('/', '~1');

const childPath = (parent: string, token: string | number): string =>
  `${parent}/${escapeJsonPointerToken(String(token))}`;

const addIssue = (
  errors: DadosPosicionaisV2ValidationIssue[],
  instancePath: string,
  keyword: string,
  message: string,
): void => {
  errors.push({ instancePath, keyword, message });
};

const sameJsonValue = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if ((Array.isArray(left) || isRecord(left)) && (Array.isArray(right) || isRecord(right))) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return false;
};

const resolveLocalReference = (reference: string): SchemaNode | null => {
  if (!reference.startsWith('#/')) return null;
  let current: unknown = DADOS_POSICIONAIS_V2_JSON_SCHEMA;
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
  errors: DadosPosicionaisV2ValidationIssue[],
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
    (type === 'string' && typeof value === 'string') ||
    (type === 'boolean' && typeof value === 'boolean') ||
    (type === 'null' && value === null);
  if (!matches) addIssue(errors, instancePath, 'type', `deve ser ${String(type)}`);
  return matches;
};

const validateSchemaNode = (
  value: unknown,
  schema: SchemaNode,
  instancePath: string,
  errors: DadosPosicionaisV2ValidationIssue[],
): void => {
  if (typeof schema.$ref === 'string') {
    const referenced = resolveLocalReference(schema.$ref);
    if (!referenced) {
      addIssue(errors, instancePath, '$ref', `referência local não encontrada: ${schema.$ref}`);
      return;
    }
    validateSchemaNode(value, referenced, instancePath, errors);
    return;
  }

  if (Array.isArray(schema.oneOf)) {
    const branchErrors = schema.oneOf.map((branch) => {
      const candidateErrors: DadosPosicionaisV2ValidationIssue[] = [];
      if (isRecord(branch)) validateSchemaNode(value, branch, instancePath, candidateErrors);
      else addIssue(candidateErrors, instancePath, 'schema', 'ramo oneOf inválido');
      return candidateErrors;
    });
    if (branchErrors.filter((candidate) => candidate.length === 0).length !== 1) {
      addIssue(errors, instancePath, 'oneOf', 'deve satisfazer exatamente uma alternativa do schema');
    }
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

  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      addIssue(errors, instancePath, 'minLength', `deve ter ao menos ${schema.minLength} caractere(s)`);
    }
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern, 'u').test(value)) {
      addIssue(errors, instancePath, 'pattern', 'não corresponde ao padrão exigido');
    }
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
      for (let index = 0; index < value.length; index += 1) {
        if (value.slice(0, index).some((candidate) => sameJsonValue(candidate, value[index]))) {
          addIssue(errors, childPath(instancePath, index), 'uniqueItems', 'item duplicado');
        }
      }
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
      if (isRecord(propertySchema)) {
        validateSchemaNode(propertyValue, propertySchema, childPath(instancePath, property), errors);
      } else if (schema.additionalProperties === false) {
        addIssue(errors, childPath(instancePath, property), 'additionalProperties', 'propriedade não permitida');
      }
    }
  }
};

const scanJsonSafety = (
  value: unknown,
  instancePath: string,
  seen: WeakSet<object>,
  errors: DadosPosicionaisV2ValidationIssue[],
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
    for (const [property, propertyValue] of Object.entries(value)) {
      if (FORBIDDEN_PROPERTIES.has(property)) {
        addIssue(
          errors,
          childPath(instancePath, property),
          'forbiddenProperty',
          `a convenção singular ${property} é proibida; use angelicFalange`,
        );
      }
      scanJsonSafety(propertyValue, childPath(instancePath, property), seen, errors);
    }
  }
  seen.delete(value);
};

const hasExactSet = <Value extends string | number>(actual: readonly Value[], expected: readonly Value[]): boolean =>
  actual.length === expected.length &&
  new Set(actual).size === expected.length &&
  expected.every((item) => actual.includes(item));

const validateRelationalInvariants = (value: DadosPosicionaisV2, errors: DadosPosicionaisV2ValidationIssue[]): void => {
  if (
    value.targetSet.orderedIds.length !== PLANET_BODY_IDS.length ||
    !value.targetSet.orderedIds.every((bodyId, index) => bodyId === PLANET_BODY_IDS[index])
  ) {
    addIssue(
      errors,
      '/targetSet/orderedIds',
      'completePlanetSet',
      'deve listar os dez corpos herméticos uma vez, na ordem canônica',
    );
  }

  const positionBodyIds = value.positions.map(({ bodyId }) => bodyId);
  if (!hasExactSet(positionBodyIds, PLANET_BODY_IDS)) {
    addIssue(
      errors,
      '/positions',
      'completePlanetSet',
      'deve conter exatamente uma posição para cada um dos dez corpos herméticos',
    );
  }

  if (value.houses.status === 'available') {
    const houseIndices = value.houses.cusps.map(({ houseIndex1 }) => houseIndex1);
    const expectedHouseIndices = Array.from({ length: 12 }, (_, index0) => index0 + 1);
    if (!hasExactSet(houseIndices, expectedHouseIndices)) {
      addIssue(
        errors,
        '/houses/cusps',
        'completeHouseSet',
        'deve conter exatamente uma cúspide para cada casa de 1 a 12',
      );
    }
  }

  const angleIds = value.angles.map(({ angleId }) => angleId);
  if (new Set(angleIds).size !== angleIds.length) {
    addIssue(errors, '/angles', 'uniqueAngleIds', 'não pode repetir IDs de ângulos');
  }

  const angelIds = value.aggregates.angelicFalange.map(({ angelId }) => angelId);
  const aggregateMembers = value.aggregates.angelicFalange.flatMap(({ memberBodyIds }) => memberBodyIds);
  const positionAngelByBody = new Map(
    value.positions.map((position) => [position.bodyId, position.angelicQuinary.angel.id] as const),
  );
  const falangeIsConsistent =
    new Set(angelIds).size === angelIds.length &&
    hasExactSet(aggregateMembers, PLANET_BODY_IDS) &&
    value.aggregates.angelicFalange.every(
      ({ angelId, memberBodyIds, occurrenceCount }) =>
        occurrenceCount === memberBodyIds.length &&
        memberBodyIds.every((bodyId) => positionAngelByBody.get(bodyId) === angelId),
    );
  if (!falangeIsConsistent) {
    addIssue(
      errors,
      '/aggregates/angelicFalange',
      'angelicFalangeConsistency',
      'deve agrupar uma única vez os dez corpos segundo o anjo tropical de cada posição',
    );
  }
};

export function validateDadosPosicionaisV2(value: unknown): DadosPosicionaisV2ValidationResult {
  const errors: DadosPosicionaisV2ValidationIssue[] = [];
  scanJsonSafety(value, '', new WeakSet(), errors);
  if (errors.length > 0) return { valid: false, errors };

  validateSchemaNode(value, DADOS_POSICIONAIS_V2_JSON_SCHEMA, '', errors);
  if (errors.length > 0) return { valid: false, errors };

  const validated = value as DadosPosicionaisV2;
  validateRelationalInvariants(validated, errors);
  return errors.length === 0 ? { valid: true, value: validated } : { valid: false, errors };
}

export function isDadosPosicionaisV2(value: unknown): value is DadosPosicionaisV2 {
  return validateDadosPosicionaisV2(value).valid;
}
