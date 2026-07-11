import { readFile } from 'node:fs/promises';
import { load, type SwissEph } from '@fusionstrings/swiss-eph';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  ANGEL_CATALOG_SHA256,
  ASTRONOMY_ENGINE_SOURCE_SHA256,
  calculateDadosPosicionaisV2,
  type DadosPosicionaisV2,
  POSITIONAL_SCHEMA_ID,
  POSITIONAL_SCHEMA_VERSION,
  POSITIONAL_TARGET_SET_ID,
  SWISS_EPHEMERIS_WASM_SHA256,
} from './positionV2';
import { DADOS_POSICIONAIS_V2_JSON_SCHEMA, isDadosPosicionaisV2, validateDadosPosicionaisV2 } from './positionV2Schema';

let swiss: SwissEph;

beforeAll(async () => {
  const bytes = new Uint8Array(
    await readFile(new URL('../../../node_modules/@fusionstrings/swiss-eph/wasm/swiss-eph-wasi.wasm', import.meta.url)),
  );
  swiss = await load(bytes);
});

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;

const BODY_IDS = [
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
] as const;

const SIGN_IDS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;

const SIGN_NAMES = [
  'Áries',
  'Touro',
  'Gêmeos',
  'Câncer',
  'Leão',
  'Virgem',
  'Libra',
  'Escorpião',
  'Sagitário',
  'Capricórnio',
  'Aquário',
  'Peixes',
] as const;

const positionFixture = (index0: number): DadosPosicionaisV2['positions'][number] => {
  const bodyId = BODY_IDS[index0];
  if (!bodyId) throw new RangeError(`Corpo de teste inexistente no índice ${index0}.`);
  const longitude = index0 * 30 + 1;
  const signId = SIGN_IDS[index0];
  const signNamePtBr = SIGN_NAMES[index0];
  if (!signId || !signNamePtBr) throw new RangeError(`Signo de teste inexistente no índice ${index0}.`);
  const angelId = index0 * 6 + 1;

  return {
    bodyId,
    kind: 'planet',
    displayNamePtBr: bodyId,
    symbol: '☉',
    coordinates: {
      eclipticLongitudeDeg: longitude,
      eclipticLatitudeDeg: 0,
      rightAscensionHours: index0 + 1,
      declinationDeg: 0,
    },
    tropical: {
      status: 'available',
      sign: {
        id: signId,
        index0,
        namePtBr: signNamePtBr,
        startLongitudeDeg: index0 * 30,
        endLongitudeDegExclusive: (index0 + 1) * 30,
      },
      degreeWithinSignDeg: 1,
      decan: { index1: 1, startDegreeWithinSign: 0, endDegreeWithinSignExclusive: 10 },
    },
    astronomicalReal: {
      status: 'available',
      constellation: { iauCode: 'Ari', latinName: 'Aries', namePtBr: 'Áries' },
      degreeWithinConstellation: {
        status: 'not-defined',
        reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS',
      },
    },
    housePlacement: { status: 'available', houseIndex1: (index0 % 12) + 1, basis: 'swiss-swe-house-pos' },
    angelicQuinary: {
      status: 'available',
      basisSystem: 'tropical',
      basisLongitudeDeg: longitude,
      quinary: {
        index1: angelId,
        globalStartLongitudeDeg: index0 * 30,
        globalEndLongitudeDegExclusive: index0 * 30 + 5,
      },
      angel: {
        id: angelId,
        canonicalName: `Anjo ${angelId}`,
        aliases: [],
        hebrewTriplet: 'אבג',
        choir: 'Serafins',
        prince: 'Metatron',
        qualitySummaryPtBr: 'Resumo editorial.',
        sourcePermalink: 'https://example.test/fonte',
      },
    },
  };
};

const validFixture = (): DadosPosicionaisV2 => ({
  schemaId: POSITIONAL_SCHEMA_ID,
  schemaVersion: POSITIONAL_SCHEMA_VERSION,
  calculationId: '00000000-0000-4000-8000-000000000001',
  calculatedAtUtc: '2026-07-11T03:04:05Z',
  targetSet: { id: POSITIONAL_TARGET_SET_ID, version: '1.0.0', orderedIds: BODY_IDS },
  birthContext: {
    civilInput: {
      calendar: 'gregory',
      date: '1990-05-15',
      time: '14:30',
      semantics: 'wall-time-at-birthplace',
    },
    place: {
      sourceLabel: 'Rio de Janeiro, Brasil',
      latitudeDeg: -22.9068,
      longitudeDeg: -43.1729,
      elevationMeters: 5,
      geocoder: { provider: 'open-meteo', providerResultId: 3451190 },
    },
    timeResolution: {
      status: 'resolved',
      timeZoneIana: 'America/Sao_Paulo',
      instantUtc: '1990-05-15T17:30:00Z',
      offsetAtBirth: '-03:00',
      disambiguation: 'exact',
      historicalConfidence: 'certified-1970-plus',
    },
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
    ephemeris: {
      engineId: 'astronomy-engine',
      engineVersion: '2.1.19',
      sourceSha256: ASTRONOMY_ENGINE_SOURCE_SHA256,
      observerOrigin: 'geocentric',
      apparentOrAstrometric: 'apparent',
      eclipticReference: 'true-ecliptic-of-date',
    },
    houses: {
      engineId: 'swiss-ephemeris-wasm',
      engineVersion: '2.10.03',
      runtimeWasmSha256: SWISS_EPHEMERIS_WASM_SHA256,
      systemId: 'placidus',
    },
    astronomicalReal: {
      methodId: 'iau-roman-1987-b1875-consensus-v1',
      boundaryDatasetVersion: 'astronomy-engine-2.1.19',
      boundaryDatasetSha256: ASTRONOMY_ENGINE_SOURCE_SHA256,
      classificationEpoch: 'B1875',
      boundaryGuardArcminutes: 20,
      translationPolicy: 'curated-pt-br-editorial-v1',
    },
  },
  catalogs: {
    angelic72: {
      catalogId: 'mayhem-shem-hamephorash-tropical-72x5',
      catalogVersion: '1.0.0',
      catalogSha256: ANGEL_CATALOG_SHA256,
      intervalConvention: '[start,end)',
      identityKey: 'numeric-id-1-to-72',
    },
  },
  houses: {
    systemId: 'placidus',
    status: 'available',
    cusps: Array.from({ length: 12 }, (_, index0) => ({
      houseIndex1: index0 + 1,
      eclipticLongitudeDeg: index0 * 30,
      tropical: {
        signId: SIGN_IDS[index0] ?? 'aries',
        signNamePtBr: SIGN_NAMES[index0] ?? 'Áries',
        degreeWithinSignDeg: 0,
      },
    })),
  },
  angles: [
    {
      angleId: 'ascendant',
      displayNamePtBr: 'Ascendente',
      eclipticLongitudeDeg: 10,
      tropical: { signId: 'aries', signNamePtBr: 'Áries', degreeWithinSignDeg: 10 },
    },
    {
      angleId: 'midheaven',
      displayNamePtBr: 'Meio do Céu',
      eclipticLongitudeDeg: 100,
      tropical: { signId: 'cancer', signNamePtBr: 'Câncer', degreeWithinSignDeg: 10 },
    },
  ],
  positions: BODY_IDS.map((_, index0) => positionFixture(index0)),
  aggregates: {
    angelicFalange: BODY_IDS.map((bodyId, index0) => ({
      angelId: index0 * 6 + 1,
      memberBodyIds: [bodyId],
      occurrenceCount: 1,
    })),
  },
  diagnostics: [],
});

const mutableFixture = (): Mutable<DadosPosicionaisV2> =>
  structuredClone(validFixture()) as Mutable<DadosPosicionaisV2>;

const expectInvalid = (value: unknown, expectedKeyword?: string) => {
  const result = validateDadosPosicionaisV2(value);
  expect(result.valid).toBe(false);
  if (result.valid) throw new Error('O payload deveria ser inválido.');
  if (expectedKeyword) expect(result.errors.some(({ keyword }) => keyword === expectedKeyword)).toBe(true);
};

describe('JSON Schema Draft 2020-12 de DadosPosicionaisV2', () => {
  it('publica um schema estrito e aceita o contrato v2 completo', () => {
    expect(DADOS_POSICIONAIS_V2_JSON_SCHEMA.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(DADOS_POSICIONAIS_V2_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(validateDadosPosicionaisV2(validFixture())).toEqual({ valid: true, value: validFixture() });
    expect(isDadosPosicionaisV2(validFixture())).toBe(true);
  });

  it('marca todo objeto declarado no schema com additionalProperties false', () => {
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) {
        for (const item of node) visit(item);
        return;
      }
      if (typeof node !== 'object' || node === null) return;
      const record = node as Record<string, unknown>;
      if (record.type === 'object') expect(record.additionalProperties).toBe(false);
      for (const child of Object.values(record)) visit(child);
    };

    visit(DADOS_POSICIONAIS_V2_JSON_SCHEMA);
  });

  it('aceita um payload produzido pelo motor posicional real', () => {
    const calculated = calculateDadosPosicionaisV2(
      {
        calculationId: '00000000-0000-4000-8000-000000000002',
        calculatedAtUtc: '2026-07-11T03:04:05Z',
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

    expect(validateDadosPosicionaisV2(calculated)).toEqual({ valid: true, value: calculated });
  });
});

describe('barreiras runtime do contrato v2', () => {
  it('rejeita propriedades extras na raiz e em objetos aninhados', () => {
    const rootExtra = Object.assign(mutableFixture(), { intruder: true });
    expectInvalid(rootExtra, 'additionalProperties');

    const nestedExtra = mutableFixture();
    Object.assign(nestedExtra.positions[0]?.coordinates ?? {}, { unexpected: true });
    expectInvalid(nestedExtra, 'additionalProperties');
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])('rejeita número não finito: %s', (invalidNumber) => {
    const payload = mutableFixture();
    const first = payload.positions[0];
    if (!first) throw new Error('Fixture sem primeiro planeta.');
    first.coordinates.eclipticLatitudeDeg = invalidNumber;
    expectInvalid(payload, 'finite');
  });

  it.each([
    [-1, 'minimum'],
    [360, 'exclusiveMaximum'],
    [720, 'exclusiveMaximum'],
  ] as const)('rejeita longitude eclíptica fora de [0,360): %d', (longitude, keyword) => {
    const payload = mutableFixture();
    const first = payload.positions[0];
    if (!first) throw new Error('Fixture sem primeiro planeta.');
    first.coordinates.eclipticLongitudeDeg = longitude;
    expectInvalid(payload, keyword);
  });

  it('rejeita corpos duplicados e o conjunto incompleto dos dez planetas', () => {
    const duplicated = mutableFixture();
    const first = duplicated.positions[0];
    const second = duplicated.positions[1];
    if (!first || !second) throw new Error('Fixture sem planetas suficientes.');
    second.bodyId = first.bodyId;
    expectInvalid(duplicated, 'completePlanetSet');

    const incomplete = mutableFixture();
    incomplete.positions.pop();
    expectInvalid(incomplete, 'minItems');
  });

  it('rejeita IDs duplicados no target set e nas casas', () => {
    const duplicatedTarget = mutableFixture();
    duplicatedTarget.targetSet.orderedIds[1] = duplicatedTarget.targetSet.orderedIds[0] ?? 'sun';
    expectInvalid(duplicatedTarget, 'uniqueItems');

    const duplicatedCusp = mutableFixture();
    if (duplicatedCusp.houses.status !== 'available') throw new Error('Fixture sem casas disponíveis.');
    const firstCusp = duplicatedCusp.houses.cusps[0];
    const secondCusp = duplicatedCusp.houses.cusps[1];
    if (!firstCusp || !secondCusp) throw new Error('Fixture sem cúspides suficientes.');
    secondCusp.houseIndex1 = firstCusp.houseIndex1;
    expectInvalid(duplicatedCusp, 'completeHouseSet');
  });

  it.each(['primaryAngel', 'regenteNatal'])('rejeita o campo proibido %s em qualquer profundidade', (field) => {
    const payload = mutableFixture();
    const first = payload.positions[0];
    if (!first) throw new Error('Fixture sem primeiro planeta.');
    Object.assign(first.angelicQuinary, { [field]: { id: 1 } });
    expectInvalid(payload, 'forbiddenProperty');
  });

  it('rejeita grau numérico dentro de constelação IAU', () => {
    const payload = mutableFixture();
    const first = payload.positions[0];
    if (!first) throw new Error('Fixture sem primeiro planeta.');
    const astronomicalReal = first.astronomicalReal as unknown as Record<string, unknown>;
    astronomicalReal.degreeWithinConstellation = 12.5;
    expectInvalid(payload, 'oneOf');
  });

  it('rejeita angelologia calculada em base diferente da tropical', () => {
    const payload = mutableFixture();
    const first = payload.positions[0];
    if (!first) throw new Error('Fixture sem primeiro planeta.');
    (first.angelicQuinary as unknown as { basisSystem: string }).basisSystem = 'astronomical-real';
    expectInvalid(payload, 'const');
  });
});
