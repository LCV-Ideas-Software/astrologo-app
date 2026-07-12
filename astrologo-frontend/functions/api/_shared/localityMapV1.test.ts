import { readFile } from 'node:fs/promises';
import { load, type SwissEph } from '@fusionstrings/swiss-eph';
import { EquatorFromVector, RotateVector, Rotation_EQJ_EQD, Spherical, VectorFromSphere } from 'astronomy-engine';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  calculateHourAngleLongitudeDeg,
  calculateLocalityMapV1,
  calculateMcIcLongitudes,
  LOCALITY_MAP_SCHEMA_ID,
  LOCALITY_MAP_SCHEMA_VERSION,
  type LocalityMapV1,
  solveGeometricHorizonHourAngles,
  splitAntimeridianSegments,
} from './localityMapV1';
import { isLocalityMapV1, LOCALITY_MAP_V1_JSON_SCHEMA, validateLocalityMapV1 } from './localityMapV1Schema';
import { calculateDadosPosicionaisV2, type DadosPosicionaisV2 } from './positionV2';

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;

let sourceFixture: DadosPosicionaisV2;

beforeAll(async () => {
  const bytes = new Uint8Array(
    await readFile(new URL('../../../node_modules/@fusionstrings/swiss-eph/wasm/swiss-eph-wasi.wasm', import.meta.url)),
  );
  const swiss: SwissEph = await load(bytes);
  sourceFixture = calculateDadosPosicionaisV2(
    {
      calculationId: '00000000-0000-4000-8000-000000000001',
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

const calculationInput = () => ({
  sourceHashSha256: 'a'.repeat(64),
  greenwichApparentSiderealTime: {
    kind: 'greenwich-apparent-sidereal-time' as const,
    hours: 10.25,
    provenance: {
      engineId: 'test-sidereal-engine',
      engineVersion: '1.2.3',
      methodId: 'greenwich-apparent-sidereal-time-test-v1',
      engineSourceSha256: 'b'.repeat(64),
      calculatedForInstantUtc: sourceFixture.birthContext.timeResolution.instantUtc,
    },
  },
  latitudeResolutionDeg: 2,
});

const lineBy = (result: LocalityMapV1, bodyId: string, angleId: string) =>
  result.lines.find((line) => line.bodyId === bodyId && line.angleId === angleId);

const coordinateAtLatitude = (line: LocalityMapV1['lines'][number] | undefined, latitudeDeg: number) =>
  line?.geometry.coordinates.flat().find((coordinate) => Math.abs(coordinate[1] - latitudeDeg) <= 1e-12);

const separationDeg = (left: number, right: number) => {
  const directed = (((right - left) % 360) + 360) % 360;
  return Math.min(directed, 360 - directed);
};

describe('geometria astrocartográfica determinística', () => {
  it('calcula meridianos MC/IC a partir de LST=RA e LST=RA+12h', () => {
    expect(calculateMcIcLongitudes(6, 2)).toEqual({ mcLongitudeDeg: 60, icLongitudeDeg: -120 });
    expect(separationDeg(60, -120)).toBe(180);
  });

  it('resolve ASC com H negativo e DSC com H positivo no horizonte geométrico', () => {
    expect(solveGeometricHorizonHourAngles(0, 0)).toEqual({
      status: 'available',
      risingHourAngleDeg: -90,
      settingHourAngleDeg: 90,
    });
    expect(calculateHourAngleLongitudeDeg(6, 2, -90)).toBe(-30);
    expect(calculateHourAngleLongitudeDeg(6, 2, 90)).toBe(150);
  });

  it('marca ausência circumpolar e polos sem fabricar solução', () => {
    expect(solveGeometricHorizonHourAngles(60, 60)).toEqual({
      status: 'unavailable',
      reasonCode: 'CIRCUMPOLAR_NO_GEOMETRIC_HORIZON_CROSSING',
    });
    expect(solveGeometricHorizonHourAngles(-90, 10)).toEqual({
      status: 'unavailable',
      reasonCode: 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED',
    });
  });

  it('parte segmentos e interpola ambas as bordas ao cruzar o antimeridiano', () => {
    expect(
      splitAntimeridianSegments([
        [170, 0],
        [-170, 10],
      ]),
    ).toEqual([
      [
        [170, 0],
        [180, 5],
      ],
      [
        [-180, 5],
        [-170, 10],
      ],
    ]);
    expect(
      splitAntimeridianSegments([
        [-170, 0],
        [170, 10],
      ]),
    ).toEqual([
      [
        [-170, 0],
        [-180, 5],
      ],
      [
        [180, 5],
        [170, 10],
      ],
    ]);
  });
});

describe('LocalityMapV1', () => {
  it('deriva 40 linhas canônicas sem modificar DadosPosicionaisV2', () => {
    const source = structuredClone(sourceFixture);
    const snapshot = structuredClone(source);
    const result = calculateLocalityMapV1(source, calculationInput());

    expect(source).toEqual(snapshot);
    expect(result.schemaId).toBe(LOCALITY_MAP_SCHEMA_ID);
    expect(result.schemaVersion).toBe(LOCALITY_MAP_SCHEMA_VERSION);
    expect(result.source.sourceHashSha256).toBe('a'.repeat(64));
    expect(result.lines).toHaveLength(40);
    expect(result.lines.slice(0, 4).map(({ recordId }) => recordId)).toEqual([
      'sun:mc',
      'sun:ic',
      'sun:ascendant',
      'sun:descendant',
    ]);
    expect(result.lines.slice(0, 4).map(({ angleDisplayNamePtBr }) => angleDisplayNamePtBr)).toEqual([
      'Meio do Céu',
      'Fundo do Céu',
      'Ascendente',
      'Descendente',
    ]);
    expect(result.lines.slice(-4).map(({ recordId }) => recordId)).toEqual([
      'pluto:mc',
      'pluto:ic',
      'pluto:ascendant',
      'pluto:descendant',
    ]);
    expect(validateLocalityMapV1(result)).toEqual({ valid: true, value: result });
  });

  it('preserva RA/declinação natais, GAST explícito e proveniência fornecida', () => {
    const input = calculationInput();
    const result = calculateLocalityMapV1(sourceFixture, input);

    expect(result.bodies.map(({ bodyId, sourceEquatorialEqj }) => ({ bodyId, sourceEquatorialEqj }))).toEqual(
      sourceFixture.positions.map(({ bodyId, coordinates }) => ({
        bodyId,
        sourceEquatorialEqj: {
          frameId: 'geocentric-apparent-eqj-j2000',
          rightAscensionHours: coordinates.rightAscensionHours,
          declinationDeg: coordinates.declinationDeg,
        },
      })),
    );
    expect(
      result.bodies.every(
        ({ workingEquatorialEqd }) => workingEquatorialEqd.frameId === 'geocentric-apparent-true-equator-of-date-eqd',
      ),
    ).toBe(true);
    expect(result.models.siderealTime).toEqual({
      kind: 'greenwich-apparent-sidereal-time',
      hours: 10.25,
      provenance: input.greenwichApparentSiderealTime.provenance,
    });
    expect(result.models.geometry).toMatchObject({
      altitudeReferenceDeg: 0,
      refractionModel: 'none',
      longitudeConvention: 'east-positive-[-180,180]',
      coordinateOrder: 'longitude-latitude',
    });
    expect(result.presentationPolicy).toEqual(sourceFixture.presentationPolicy);
  });

  it('mantém MC/IC opostos e reproduz ASC/DSC conhecido no equador', () => {
    const input = calculationInput();
    const result = calculateLocalityMapV1(sourceFixture, input);

    for (const body of result.bodies) {
      const mc = lineBy(result, body.bodyId, 'mc');
      const ic = lineBy(result, body.bodyId, 'ic');
      const mcLongitude = mc?.geometry.coordinates[0]?.[0]?.[0];
      const icLongitude = ic?.geometry.coordinates[0]?.[0]?.[0];
      expect(mcLongitude).toBeTypeOf('number');
      expect(icLongitude).toBeTypeOf('number');
      expect(separationDeg(mcLongitude ?? 0, icLongitude ?? 0)).toBeCloseTo(180, 12);

      const horizon = solveGeometricHorizonHourAngles(0, body.workingEquatorialEqd.declinationDeg);
      expect(horizon.status).toBe('available');
      if (horizon.status !== 'available') throw new Error('O equador deveria possuir cruzamento geométrico.');
      const asc = coordinateAtLatitude(lineBy(result, body.bodyId, 'ascendant'), 0);
      const dsc = coordinateAtLatitude(lineBy(result, body.bodyId, 'descendant'), 0);
      expect(asc?.[0]).toBeCloseTo(
        calculateHourAngleLongitudeDeg(
          body.workingEquatorialEqd.rightAscensionHours,
          input.greenwichApparentSiderealTime.hours,
          -90,
        ),
        12,
      );
      expect(dsc?.[0]).toBeCloseTo(
        calculateHourAngleLongitudeDeg(
          body.workingEquatorialEqd.rightAscensionHours,
          input.greenwichApparentSiderealTime.hours,
          90,
        ),
        12,
      );
    }
  });

  it('mantém coordenadas [longitude,latitude] nos intervalos e sem saltos intrassegmento', () => {
    const result = calculateLocalityMapV1(sourceFixture, calculationInput());

    for (const line of result.lines) {
      for (const segment of line.geometry.coordinates) {
        for (const [index, coordinate] of segment.entries()) {
          expect(coordinate[0]).toBeGreaterThanOrEqual(-180);
          expect(coordinate[0]).toBeLessThanOrEqual(180);
          expect(coordinate[1]).toBeGreaterThan(-90);
          expect(coordinate[1]).toBeLessThan(90);
          const previous = segment[index - 1];
          if (previous) expect(Math.abs(coordinate[0] - previous[0])).toBeLessThanOrEqual(180);
        }
      }
    }
  });

  it('publica diagnósticos polares e circumpolares sem interpretação', () => {
    const result = calculateLocalityMapV1(sourceFixture, calculationInput());

    expect(result.diagnostics).toContainEqual({
      severity: 'info',
      code: 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED',
      latitudeDeg: -90,
    });
    expect(result.diagnostics).toContainEqual({
      severity: 'info',
      code: 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED',
      latitudeDeg: 90,
    });
    expect(result.diagnostics.some(({ code }) => code === 'CIRCUMPOLAR_NO_GEOMETRIC_HORIZON_CROSSING')).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/influ[eê]ncia|interpreta[cç][aã]o|predi[cç][aã]o/i);
  });
});

describe('entradas e schema estrito de LocalityMapV1', () => {
  it('transforma explicitamente EQJ/J2000 em true EQD antes de combinar com GAST', () => {
    const result = calculateLocalityMapV1(sourceFixture, calculationInput());
    const sourceSun = sourceFixture.positions.find(({ bodyId }) => bodyId === 'sun');
    const sun = result.bodies.find(({ bodyId }) => bodyId === 'sun');
    if (!sourceSun || !sun) throw new Error('Fixture sem Sol.');
    const instant = new Date(sourceFixture.birthContext.timeResolution.instantUtc);
    const eqjVector = VectorFromSphere(
      new Spherical(sourceSun.coordinates.declinationDeg, sourceSun.coordinates.rightAscensionHours * 15, 1),
      instant,
    );
    const expectedEqd = EquatorFromVector(RotateVector(Rotation_EQJ_EQD(instant), eqjVector));

    expect(sun.sourceEquatorialEqj).toEqual({
      frameId: 'geocentric-apparent-eqj-j2000',
      rightAscensionHours: sourceSun.coordinates.rightAscensionHours,
      declinationDeg: sourceSun.coordinates.declinationDeg,
    });
    expect(sun.workingEquatorialEqd).toMatchObject({
      frameId: 'geocentric-apparent-true-equator-of-date-eqd',
    });
    expect(sun.workingEquatorialEqd.rightAscensionHours).toBeCloseTo(expectedEqd.ra, 12);
    expect(sun.workingEquatorialEqd.declinationDeg).toBeCloseTo(expectedEqd.dec, 12);
    expect(
      Math.abs(sun.workingEquatorialEqd.rightAscensionHours - sun.sourceEquatorialEqj.rightAscensionHours),
    ).toBeGreaterThan(1e-5);
    expect(result.models.sourceCoordinates).toMatchObject({
      sourceFrame: 'geocentric-apparent-eqj-j2000',
      workingFrame: 'geocentric-apparent-true-equator-of-date-eqd',
      transformation: {
        methodId: 'astronomy-engine-Rotation_EQJ_EQD-v1',
        precessionApplied: true,
        nutationApplied: true,
        calculatedForInstantUtc: sourceFixture.birthContext.timeResolution.instantUtc,
      },
    });

    const mc = lineBy(result, 'sun', 'mc')?.geometry.coordinates[0]?.[0]?.[0];
    const transformedMc = calculateMcIcLongitudes(
      sun.workingEquatorialEqd.rightAscensionHours,
      calculationInput().greenwichApparentSiderealTime.hours,
    ).mcLongitudeDeg;
    const incorrectDirectEqjMc = calculateMcIcLongitudes(
      sun.sourceEquatorialEqj.rightAscensionHours,
      calculationInput().greenwichApparentSiderealTime.hours,
    ).mcLongitudeDeg;
    expect(mc).toBeCloseTo(transformedMc, 12);
    expect(Math.abs((mc ?? 0) - incorrectDirectEqjMc)).toBeGreaterThan(1e-4);
  });

  it('aceita resoluções de 0,25° a 5° e rejeita valores externos ou ausentes', () => {
    expect(
      calculateLocalityMapV1(sourceFixture, { ...calculationInput(), latitudeResolutionDeg: 0.25 }).models.sampling,
    ).toMatchObject({ latitudeResolutionDeg: 0.25 });
    expect(
      calculateLocalityMapV1(sourceFixture, { ...calculationInput(), latitudeResolutionDeg: 5 }).models.sampling,
    ).toMatchObject({ latitudeResolutionDeg: 5 });
    expect(() => calculateLocalityMapV1(sourceFixture, { ...calculationInput(), latitudeResolutionDeg: 0.24 })).toThrow(
      /0,25.*5/i,
    );
    expect(() => calculateLocalityMapV1(sourceFixture, { ...calculationInput(), latitudeResolutionDeg: 5.01 })).toThrow(
      /0,25.*5/i,
    );
    const missing = calculationInput() as Partial<ReturnType<typeof calculationInput>>;
    delete missing.latitudeResolutionDeg;
    expect(() => calculateLocalityMapV1(sourceFixture, missing as ReturnType<typeof calculationInput>)).toThrow(
      /resolu[cç][aã]o/i,
    );
  });

  it('mantém o payload da resolução máxima abaixo da margem segura da linha D1', () => {
    const result = calculateLocalityMapV1(sourceFixture, {
      ...calculationInput(),
      latitudeResolutionDeg: 0.25,
    });
    const payloadBytes = new TextEncoder().encode(JSON.stringify(result)).byteLength;

    // D1 limita uma linha/string a 2.000.000 bytes; a margem também acomoda
    // metadados, diagnósticos e futuras alterações compatíveis do contrato v1.
    expect(payloadBytes).toBeLessThanOrEqual(1_900_000);
  });

  it('rejeita hash inventado/malformado, GAST fora da faixa e proveniência de outro instante', () => {
    expect(() =>
      calculateLocalityMapV1(sourceFixture, { ...calculationInput(), sourceHashSha256: 'não-é-hash' }),
    ).toThrow(/SHA-256/i);
    expect(() =>
      calculateLocalityMapV1(sourceFixture, {
        ...calculationInput(),
        greenwichApparentSiderealTime: { ...calculationInput().greenwichApparentSiderealTime, hours: 24 },
      }),
    ).toThrow(/\[0, 24\)/i);
    expect(() =>
      calculateLocalityMapV1(sourceFixture, {
        ...calculationInput(),
        greenwichApparentSiderealTime: {
          ...calculationInput().greenwichApparentSiderealTime,
          kind: 'greenwich-mean-sidereal-time' as 'greenwich-apparent-sidereal-time',
        },
      }),
    ).toThrow(/tipo aparente/i);
    expect(() =>
      calculateLocalityMapV1(sourceFixture, {
        ...calculationInput(),
        greenwichApparentSiderealTime: {
          ...calculationInput().greenwichApparentSiderealTime,
          provenance: {
            ...calculationInput().greenwichApparentSiderealTime.provenance,
            calculatedForInstantUtc: '2000-01-01T00:00:00Z',
          },
        },
      }),
    ).toThrow(/instante natal/i);
  });

  it('rejeita propriedades extras nas entradas', () => {
    const input = Object.assign(calculationInput(), { interpretation: 'não permitida' });
    expect(() => calculateLocalityMapV1(sourceFixture, input)).toThrow(/propriedade desconhecida/i);
    const nested = structuredClone(calculationInput()) as ReturnType<typeof calculationInput> & {
      greenwichApparentSiderealTime: ReturnType<typeof calculationInput>['greenwichApparentSiderealTime'] & {
        meanTime?: number;
      };
    };
    nested.greenwichApparentSiderealTime.meanTime = 10;
    expect(() => calculateLocalityMapV1(sourceFixture, nested)).toThrow(/propriedade desconhecida/i);
  });

  it('publica JSON Schema 2020-12 com todos os objetos fechados', () => {
    expect(LOCALITY_MAP_V1_JSON_SCHEMA.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) return void node.forEach(visit);
      if (typeof node !== 'object' || node === null) return;
      const record = node as Record<string, unknown>;
      if (record.type === 'object') expect(record.additionalProperties).toBe(false);
      Object.values(record).forEach(visit);
    };
    visit(LOCALITY_MAP_V1_JSON_SCHEMA);
  });

  it('rejeita extras, ordem adulterada e geometria incoerente', () => {
    const valid = calculateLocalityMapV1(sourceFixture, calculationInput());
    expect(isLocalityMapV1(valid)).toBe(true);

    const extra = Object.assign(structuredClone(valid), { intruder: true });
    expect(validateLocalityMapV1(extra)).toMatchObject({ valid: false });

    const reordered = structuredClone(valid) as unknown as Mutable<LocalityMapV1>;
    const first = reordered.lines[0];
    const second = reordered.lines[1];
    if (!first || !second) throw new Error('Fixture sem linhas suficientes.');
    [reordered.lines[0], reordered.lines[1]] = [second, first];
    const reorderedResult = validateLocalityMapV1(reordered);
    expect(reorderedResult.valid).toBe(false);
    if (reorderedResult.valid) throw new Error('Ordem adulterada deveria ser inválida.');
    expect(reorderedResult.errors.some(({ keyword }) => keyword === 'canonicalLineOrder')).toBe(true);

    const altered = structuredClone(valid) as unknown as Mutable<LocalityMapV1>;
    const coordinate = altered.lines[0]?.geometry.coordinates[0]?.[0];
    if (!coordinate) throw new Error('Fixture sem coordenada para adulterar.');
    const longitude = coordinate[0];
    if (longitude === undefined) throw new Error('Coordenada sem longitude para adulterar.');
    coordinate[0] = longitude + 1;
    const alteredResult = validateLocalityMapV1(altered);
    expect(alteredResult.valid).toBe(false);
    if (alteredResult.valid) throw new Error('Geometria adulterada deveria ser inválida.');
    expect(alteredResult.errors.some(({ keyword }) => keyword === 'lineGeometryConsistency')).toBe(true);

    const wrongTransformation = structuredClone(valid) as unknown as Mutable<LocalityMapV1>;
    const firstBody = wrongTransformation.bodies[0];
    if (!firstBody) throw new Error('Fixture sem corpo para adulterar.');
    firstBody.workingEquatorialEqd.rightAscensionHours = firstBody.sourceEquatorialEqj.rightAscensionHours;
    const transformationResult = validateLocalityMapV1(wrongTransformation);
    expect(transformationResult.valid).toBe(false);
    if (transformationResult.valid) throw new Error('Transformação EQJ→EQD adulterada deveria ser inválida.');
    expect(
      transformationResult.errors.some(({ keyword }) => keyword === 'equatorialFrameTransformationConsistency'),
    ).toBe(true);
  });
});
