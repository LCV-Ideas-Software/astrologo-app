import { Body, Constellation, type ConstellationInfo, Ecliptic, EquatorFromVector, GeoVector } from 'astronomy-engine';
import { ANGEL_CATALOG, ANGEL_CATALOG_METADATA, type AngelCatalogEntry } from './angelCatalog';
import type { BirthTimeResolution } from './birthTime';

export const POSITIONAL_SCHEMA_ID = 'urn:astrologo:dados-posicionais' as const;
export const POSITIONAL_SCHEMA_VERSION = '2.0.0' as const;
export const POSITIONAL_TARGET_SET_ID = 'hermetic-planets-10-v1' as const;
export const ANGEL_CATALOG_SHA256 = 'a8c2d5f175c874a1fdea0640f927655ea3b73eedc47089dc88321fff95e77062' as const;
export const ASTRONOMY_ENGINE_SOURCE_SHA256 =
  '068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7' as const;
export const SWISS_EPHEMERIS_WASM_SHA256 = '31d3406560fd39b91bc9dbfdff6c9111f170fde2db62ebe92581ae14e878744c' as const;

const SWISS_EPHEMERIS_VERSION = '2.10.03';
const SWISS_HOUSE_SYSTEM_PLACIDUS = 'P'.charCodeAt(0);
const SWISS_ECLIPTIC_NUTATION_BODY_ID = -1;
const SWISS_FLAG_MOSHIER = 4;
const SWISS_FLAG_J2000 = 32;
const SWISS_FLAG_EQUATORIAL = 2048;
// Empirical Astronomy Engine/JPL boundary divergences reached 17.25 arcminutes
// in the validation corpus. The v2 classifier therefore fails closed inside 20'.
const IAU_BOUNDARY_GUARD_ARCMINUTES = 20;

const TROPICAL_SIGNS = [
  { id: 'aries', namePtBr: 'Áries' },
  { id: 'taurus', namePtBr: 'Touro' },
  { id: 'gemini', namePtBr: 'Gêmeos' },
  { id: 'cancer', namePtBr: 'Câncer' },
  { id: 'leo', namePtBr: 'Leão' },
  { id: 'virgo', namePtBr: 'Virgem' },
  { id: 'libra', namePtBr: 'Libra' },
  { id: 'scorpio', namePtBr: 'Escorpião' },
  { id: 'sagittarius', namePtBr: 'Sagitário' },
  { id: 'capricorn', namePtBr: 'Capricórnio' },
  { id: 'aquarius', namePtBr: 'Aquário' },
  { id: 'pisces', namePtBr: 'Peixes' },
] as const;

const CONSTELLATION_NAMES_PT_BR: Readonly<Record<string, string>> = Object.freeze({
  And: 'Andrômeda',
  Ant: 'Máquina Pneumática',
  Aps: 'Ave do Paraíso',
  Aqr: 'Aquário',
  Aql: 'Águia',
  Ara: 'Altar',
  Ari: 'Áries',
  Aur: 'Cocheiro',
  Boo: 'Boieiro',
  Cae: 'Cinzel',
  Cam: 'Girafa',
  Cnc: 'Câncer',
  CVn: 'Cães de Caça',
  CMa: 'Cão Maior',
  CMi: 'Cão Menor',
  Cap: 'Capricórnio',
  Car: 'Quilha',
  Cas: 'Cassiopeia',
  Cen: 'Centauro',
  Cep: 'Cefeu',
  Cet: 'Baleia',
  Cha: 'Camaleão',
  Cir: 'Compasso',
  Col: 'Pomba',
  Com: 'Cabeleira de Berenice',
  CrA: 'Coroa Austral',
  CrB: 'Coroa Boreal',
  Crv: 'Corvo',
  Crt: 'Taça',
  Cru: 'Cruzeiro do Sul',
  Cyg: 'Cisne',
  Del: 'Golfinho',
  Dor: 'Dourado',
  Dra: 'Dragão',
  Equ: 'Potro',
  Eri: 'Erídano',
  For: 'Fornalha',
  Gem: 'Gêmeos',
  Gru: 'Grou',
  Her: 'Hércules',
  Hor: 'Relógio',
  Hya: 'Hidra',
  Hyi: 'Hidra Macho',
  Ind: 'Índio',
  Lac: 'Lagarto',
  Leo: 'Leão',
  LMi: 'Leão Menor',
  Lep: 'Lebre',
  Lib: 'Libra',
  Lup: 'Lobo',
  Lyn: 'Lince',
  Lyr: 'Lira',
  Men: 'Mesa',
  Mic: 'Microscópio',
  Mon: 'Unicórnio',
  Mus: 'Mosca',
  Nor: 'Esquadro',
  Oct: 'Oitante',
  Oph: 'Ophiuchus (Serpentário)',
  Ori: 'Órion',
  Pav: 'Pavão',
  Peg: 'Pégaso',
  Per: 'Perseu',
  Phe: 'Fênix',
  Pic: 'Cavalete do Pintor',
  Psc: 'Peixes',
  PsA: 'Peixe Austral',
  Pup: 'Popa',
  Pyx: 'Bússola',
  Ret: 'Retículo',
  Sge: 'Flecha',
  Sgr: 'Sagitário',
  Sco: 'Escorpião',
  Scl: 'Escultor',
  Sct: 'Escudo',
  Ser: 'Serpente',
  Sex: 'Sextante',
  Tau: 'Touro',
  Tel: 'Telescópio',
  Tri: 'Triângulo',
  TrA: 'Triângulo Austral',
  Tuc: 'Tucano',
  UMa: 'Ursa Maior',
  UMi: 'Ursa Menor',
  Vel: 'Vela',
  Vir: 'Virgem',
  Vol: 'Peixe Voador',
  Vul: 'Raposa',
});

const BODY_DEFINITIONS = [
  { bodyId: 'sun', displayNamePtBr: 'Sol', symbol: '☉', astronomyBody: Body.Sun, swissBodyId: 0 },
  { bodyId: 'moon', displayNamePtBr: 'Lua', symbol: '☽', astronomyBody: Body.Moon, swissBodyId: 1 },
  { bodyId: 'mercury', displayNamePtBr: 'Mercúrio', symbol: '☿', astronomyBody: Body.Mercury, swissBodyId: 2 },
  { bodyId: 'venus', displayNamePtBr: 'Vênus', symbol: '♀', astronomyBody: Body.Venus, swissBodyId: 3 },
  { bodyId: 'mars', displayNamePtBr: 'Marte', symbol: '♂', astronomyBody: Body.Mars, swissBodyId: 4 },
  { bodyId: 'jupiter', displayNamePtBr: 'Júpiter', symbol: '♃', astronomyBody: Body.Jupiter, swissBodyId: 5 },
  { bodyId: 'saturn', displayNamePtBr: 'Saturno', symbol: '♄', astronomyBody: Body.Saturn, swissBodyId: 6 },
  { bodyId: 'uranus', displayNamePtBr: 'Urano', symbol: '♅', astronomyBody: Body.Uranus, swissBodyId: 7 },
  { bodyId: 'neptune', displayNamePtBr: 'Netuno', symbol: '♆', astronomyBody: Body.Neptune, swissBodyId: 8 },
  { bodyId: 'pluto', displayNamePtBr: 'Plutão', symbol: '♇', astronomyBody: Body.Pluto, swissBodyId: 9 },
] as const;

export type PlanetBodyId = (typeof BODY_DEFINITIONS)[number]['bodyId'];

export interface SwissEphemerisLike {
  swe_houses(
    tjdUt: number,
    latitudeDeg: number,
    longitudeDeg: number,
    houseSystem: number,
  ): { cusps: Float64Array; ascmc: Float64Array; returnCode: number };
  swe_calc_ut(tjdUt: number, bodyId: number, flags: number): { returnCode: number; xx: Float64Array; error: string };
  swe_house_pos(
    armc: number,
    latitudeDeg: number,
    obliquityDeg: number,
    houseSystem: number,
    planetCoordinates: [number, number],
  ): { position: number; error: string };
  swe_version(): string;
}

export interface TropicalProjection {
  readonly status: 'available';
  readonly sign: {
    readonly id: string;
    readonly index0: number;
    readonly namePtBr: string;
    readonly startLongitudeDeg: number;
    readonly endLongitudeDegExclusive: number;
  };
  readonly degreeWithinSignDeg: number;
  readonly decan: {
    readonly index1: number;
    readonly startDegreeWithinSign: number;
    readonly endDegreeWithinSignExclusive: number;
  };
}

export interface AngelicQuinaryProjection {
  readonly status: 'available';
  readonly basisSystem: 'tropical';
  readonly basisLongitudeDeg: number;
  readonly quinary: {
    readonly index1: number;
    readonly globalStartLongitudeDeg: number;
    readonly globalEndLongitudeDegExclusive: number;
  };
  readonly angel: {
    readonly id: number;
    readonly canonicalName: string;
    readonly aliases: readonly string[];
    readonly hebrewTriplet: string;
    readonly choir: string;
    readonly prince: string;
    readonly qualitySummaryPtBr: string;
    readonly sourcePermalink: string;
  };
}

export interface PlanetPositionV2 {
  readonly bodyId: PlanetBodyId;
  readonly kind: 'planet';
  readonly displayNamePtBr: string;
  readonly symbol: string;
  readonly coordinates: {
    readonly eclipticLongitudeDeg: number;
    readonly eclipticLatitudeDeg: number;
    readonly rightAscensionHours: number;
    readonly declinationDeg: number;
  };
  readonly tropical: TropicalProjection;
  readonly astronomicalReal:
    | {
        readonly status: 'available';
        readonly constellation: { readonly iauCode: string; readonly latinName: string; readonly namePtBr: string };
        readonly degreeWithinConstellation: {
          readonly status: 'not-defined';
          readonly reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS';
        };
      }
    | {
        readonly status: 'unavailable';
        readonly reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN' | 'SWISS_REFERENCE_UNAVAILABLE';
        readonly degreeWithinConstellation: {
          readonly status: 'not-defined';
          readonly reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS';
        };
      };
  readonly housePlacement:
    | { readonly status: 'available'; readonly houseIndex1: number; readonly basis: 'swiss-swe-house-pos' }
    | {
        readonly status: 'unavailable';
        readonly basis: 'swiss-swe-house-pos';
        readonly reasonCode: 'PLACIDUS_UNAVAILABLE' | 'HOUSE_POSITION_UNAVAILABLE';
      };
  readonly angelicQuinary: AngelicQuinaryProjection;
}

export interface DadosPosicionaisV2 {
  readonly schemaId: typeof POSITIONAL_SCHEMA_ID;
  readonly schemaVersion: typeof POSITIONAL_SCHEMA_VERSION;
  readonly calculationId: string;
  readonly calculatedAtUtc: string;
  readonly targetSet: {
    readonly id: typeof POSITIONAL_TARGET_SET_ID;
    readonly version: '1.0.0';
    readonly orderedIds: readonly PlanetBodyId[];
  };
  readonly birthContext: {
    readonly civilInput: {
      readonly calendar: 'gregory';
      readonly date: string;
      readonly time: string;
      readonly semantics: 'wall-time-at-birthplace';
    };
    readonly place: {
      readonly sourceLabel: string;
      readonly latitudeDeg: number;
      readonly longitudeDeg: number;
      readonly elevationMeters: number | null;
      readonly geocoder: { readonly provider: 'open-meteo'; readonly providerResultId: number };
    };
    readonly timeResolution: Extract<BirthTimeResolution, { status: 'resolved' }>;
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
    readonly ephemeris: {
      readonly engineId: 'astronomy-engine';
      readonly engineVersion: '2.1.19';
      readonly sourceSha256: typeof ASTRONOMY_ENGINE_SOURCE_SHA256;
      readonly observerOrigin: 'geocentric';
      readonly apparentOrAstrometric: 'apparent';
      readonly eclipticReference: 'true-ecliptic-of-date';
    };
    readonly houses: {
      readonly engineId: 'swiss-ephemeris-wasm';
      readonly engineVersion: typeof SWISS_EPHEMERIS_VERSION;
      readonly runtimeWasmSha256: typeof SWISS_EPHEMERIS_WASM_SHA256;
      readonly systemId: 'placidus';
    };
    readonly astronomicalReal: {
      readonly methodId: 'iau-roman-1987-b1875-consensus-v1';
      readonly boundaryDatasetVersion: 'astronomy-engine-2.1.19';
      readonly boundaryDatasetSha256: typeof ASTRONOMY_ENGINE_SOURCE_SHA256;
      readonly classificationEpoch: 'B1875';
      readonly boundaryGuardArcminutes: typeof IAU_BOUNDARY_GUARD_ARCMINUTES;
      readonly translationPolicy: 'curated-pt-br-editorial-v1';
    };
  };
  readonly catalogs: {
    readonly angelic72: {
      readonly catalogId: 'mayhem-shem-hamephorash-tropical-72x5';
      readonly catalogVersion: string;
      readonly catalogSha256: typeof ANGEL_CATALOG_SHA256;
      readonly intervalConvention: '[start,end)';
      readonly identityKey: 'numeric-id-1-to-72';
    };
  };
  readonly houses:
    | {
        readonly systemId: 'placidus';
        readonly status: 'available';
        readonly cusps: readonly {
          readonly houseIndex1: number;
          readonly eclipticLongitudeDeg: number;
          readonly tropical: {
            readonly signId: string;
            readonly signNamePtBr: string;
            readonly degreeWithinSignDeg: number;
          };
        }[];
      }
    | { readonly systemId: 'placidus'; readonly status: 'unavailable'; readonly reasonCode: 'PLACIDUS_UNAVAILABLE' };
  readonly angles: readonly {
    readonly angleId: 'ascendant' | 'midheaven';
    readonly displayNamePtBr: string;
    readonly eclipticLongitudeDeg: number;
    readonly tropical: { readonly signId: string; readonly signNamePtBr: string; readonly degreeWithinSignDeg: number };
  }[];
  readonly positions: readonly PlanetPositionV2[];
  readonly aggregates: {
    readonly angelicFalange: readonly {
      readonly angelId: number;
      readonly memberBodyIds: readonly PlanetBodyId[];
      readonly occurrenceCount: number;
    }[];
  };
  readonly diagnostics: readonly {
    readonly severity: 'warning';
    readonly code: 'HISTORICAL_TIMEZONE_BEST_EFFORT' | 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN' | 'PLACIDUS_UNAVAILABLE';
    readonly bodyId?: PlanetBodyId;
  }[];
}

export interface CalculatePositionsV2Input {
  readonly calculationId: string;
  readonly calculatedAtUtc: string;
  readonly instantUtc: string;
  readonly date: string;
  readonly time: string;
  readonly timeResolution: Extract<BirthTimeResolution, { status: 'resolved' }>;
  readonly place: {
    readonly sourceLabel: string;
    readonly latitudeDeg: number;
    readonly longitudeDeg: number;
    readonly elevationMeters: number | null;
    readonly providerResultId: number;
  };
}

export const normalizeLongitude = (longitudeDeg: number): number => ((longitudeDeg % 360) + 360) % 360;

export function projectTropical(longitudeDeg: number): TropicalProjection {
  const normalized = normalizeLongitude(longitudeDeg);
  const index0 = Math.floor(normalized / 30);
  const sign = TROPICAL_SIGNS[index0];
  if (!sign) throw new RangeError(`Longitude tropical inválida: ${longitudeDeg}`);
  const degreeWithinSignDeg = normalized - index0 * 30;
  const decanIndex0 = Math.min(2, Math.floor(degreeWithinSignDeg / 10));
  return {
    status: 'available',
    sign: {
      id: sign.id,
      index0,
      namePtBr: sign.namePtBr,
      startLongitudeDeg: index0 * 30,
      endLongitudeDegExclusive: (index0 + 1) * 30,
    },
    degreeWithinSignDeg,
    decan: {
      index1: decanIndex0 + 1,
      startDegreeWithinSign: decanIndex0 * 10,
      endDegreeWithinSignExclusive: (decanIndex0 + 1) * 10,
    },
  };
}

export function angelForLongitude(longitudeDeg: number): AngelCatalogEntry {
  const normalized = normalizeLongitude(longitudeDeg);
  const angel = ANGEL_CATALOG[Math.floor(normalized / 5)];
  if (!angel) throw new RangeError(`Longitude angelical inválida: ${longitudeDeg}`);
  return angel;
}

const projectAngel = (longitudeDeg: number): AngelicQuinaryProjection => {
  const normalized = normalizeLongitude(longitudeDeg);
  const angel = angelForLongitude(normalized);
  return {
    status: 'available',
    basisSystem: 'tropical',
    basisLongitudeDeg: normalized,
    quinary: {
      index1: angel.id,
      globalStartLongitudeDeg: angel.startLongitudeDeg,
      globalEndLongitudeDegExclusive: angel.endLongitudeDegExclusive,
    },
    angel: {
      id: angel.id,
      canonicalName: angel.name,
      aliases: angel.aliases,
      hebrewTriplet: angel.tripletHebrewPoster,
      choir: angel.choir,
      prince: angel.prince,
      qualitySummaryPtBr: angel.qualitySummaryPtBr,
      sourcePermalink: angel.provenance.sourcePermalink,
    },
  };
};

const toIauProjection = (
  primary: ConstellationInfo,
  reference: ConstellationInfo | null,
  isNearBoundary: boolean,
): PlanetPositionV2['astronomicalReal'] => {
  const degreeWithinConstellation = {
    status: 'not-defined' as const,
    reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS' as const,
  };
  if (!reference) {
    return { status: 'unavailable', reasonCode: 'SWISS_REFERENCE_UNAVAILABLE', degreeWithinConstellation };
  }
  if (primary.symbol !== reference.symbol || isNearBoundary) {
    return {
      status: 'unavailable',
      reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN',
      degreeWithinConstellation,
    };
  }
  return {
    status: 'available',
    constellation: {
      iauCode: primary.symbol,
      latinName: primary.name,
      namePtBr: CONSTELLATION_NAMES_PT_BR[primary.symbol] ?? primary.name,
    },
    degreeWithinConstellation,
  };
};

const isWithinIauBoundaryGuard = (rightAscensionHours: number, declinationDeg: number, iauCode: string): boolean => {
  const angularRadiusDeg = IAU_BOUNDARY_GUARD_ARCMINUTES / 60;
  const cosineDeclination = Math.max(0.1, Math.abs(Math.cos((declinationDeg * Math.PI) / 180)));
  const rightAscensionRadiusHours = angularRadiusDeg / (15 * cosineDeclination);
  const samples: ReadonlyArray<readonly [number, number]> = [
    [rightAscensionRadiusHours, 0],
    [-rightAscensionRadiusHours, 0],
    [0, angularRadiusDeg],
    [0, -angularRadiusDeg],
    [rightAscensionRadiusHours / Math.SQRT2, angularRadiusDeg / Math.SQRT2],
    [rightAscensionRadiusHours / Math.SQRT2, -angularRadiusDeg / Math.SQRT2],
    [-rightAscensionRadiusHours / Math.SQRT2, angularRadiusDeg / Math.SQRT2],
    [-rightAscensionRadiusHours / Math.SQRT2, -angularRadiusDeg / Math.SQRT2],
  ];
  return samples.some(([rightAscensionDelta, declinationDelta]) => {
    const sampledRightAscension = (((rightAscensionHours + rightAscensionDelta) % 24) + 24) % 24;
    const sampledDeclination = Math.max(-90, Math.min(90, declinationDeg + declinationDelta));
    return Constellation(sampledRightAscension, sampledDeclination).symbol !== iauCode;
  });
};

const housePlacement = (
  swiss: SwissEphemerisLike,
  housesAvailable: boolean,
  armc: number,
  obliquityDeg: number,
  latitudeDeg: number,
  longitudeDeg: number,
  eclipticLatitudeDeg: number,
): PlanetPositionV2['housePlacement'] => {
  if (!housesAvailable) {
    return { status: 'unavailable', basis: 'swiss-swe-house-pos', reasonCode: 'PLACIDUS_UNAVAILABLE' };
  }
  const result = swiss.swe_house_pos(armc, latitudeDeg, obliquityDeg, SWISS_HOUSE_SYSTEM_PLACIDUS, [
    longitudeDeg,
    eclipticLatitudeDeg,
  ]);
  if (result.error || !Number.isFinite(result.position) || result.position < 1 || result.position >= 13) {
    return { status: 'unavailable', basis: 'swiss-swe-house-pos', reasonCode: 'HOUSE_POSITION_UNAVAILABLE' };
  }
  return { status: 'available', houseIndex1: Math.floor(result.position), basis: 'swiss-swe-house-pos' };
};

const cuspProjection = (cusps: Float64Array) =>
  Array.from({ length: 12 }, (_, index0) => {
    const longitude = normalizeLongitude(cusps[index0 + 1] ?? Number.NaN);
    if (!Number.isFinite(longitude)) throw new Error(`Cúspide Placidus ${index0 + 1} inválida.`);
    const tropical = projectTropical(longitude);
    return {
      houseIndex1: index0 + 1,
      eclipticLongitudeDeg: longitude,
      tropical: {
        signId: tropical.sign.id,
        signNamePtBr: tropical.sign.namePtBr,
        degreeWithinSignDeg: tropical.degreeWithinSignDeg,
      },
    };
  });

const angleProjection = (angleId: 'ascendant' | 'midheaven', longitudeDeg: number) => {
  const normalized = normalizeLongitude(longitudeDeg);
  const tropical = projectTropical(normalized);
  return {
    angleId,
    displayNamePtBr: angleId === 'ascendant' ? 'Ascendente' : 'Meio do Céu',
    eclipticLongitudeDeg: normalized,
    tropical: {
      signId: tropical.sign.id,
      signNamePtBr: tropical.sign.namePtBr,
      degreeWithinSignDeg: tropical.degreeWithinSignDeg,
    },
  } as const;
};

export function calculateDadosPosicionaisV2(
  input: CalculatePositionsV2Input,
  swiss: SwissEphemerisLike,
): DadosPosicionaisV2 {
  if (swiss.swe_version() !== SWISS_EPHEMERIS_VERSION) {
    throw new Error(`Versão Swiss Ephemeris inesperada: ${swiss.swe_version()}`);
  }

  const instantDate = new Date(input.instantUtc);
  if (Number.isNaN(instantDate.getTime())) throw new RangeError('Instante UTC inválido.');
  const julianDayUt = instantDate.getTime() / 86_400_000 + 2_440_587.5;
  const houseResult = swiss.swe_houses(
    julianDayUt,
    input.place.latitudeDeg,
    input.place.longitudeDeg,
    SWISS_HOUSE_SYSTEM_PLACIDUS,
  );
  const housesAvailable =
    houseResult.returnCode >= 0 &&
    houseResult.cusps.length >= 13 &&
    houseResult.ascmc.length >= 3 &&
    Array.from(houseResult.cusps.slice(1, 13)).every(Number.isFinite);
  const nutation = swiss.swe_calc_ut(julianDayUt, SWISS_ECLIPTIC_NUTATION_BODY_ID, SWISS_FLAG_MOSHIER);
  const obliquityDeg =
    nutation.returnCode >= 0 && Number.isFinite(nutation.xx[0]) ? (nutation.xx[0] ?? Number.NaN) : Number.NaN;
  const armc = houseResult.ascmc[2] ?? Number.NaN;
  const canPlaceHouses = housesAvailable && Number.isFinite(obliquityDeg) && Number.isFinite(armc);

  const diagnostics: Array<DadosPosicionaisV2['diagnostics'][number]> = [];
  if (input.timeResolution.historicalConfidence === 'best-effort-1900-1969') {
    diagnostics.push({ severity: 'warning', code: 'HISTORICAL_TIMEZONE_BEST_EFFORT' });
  }
  if (!canPlaceHouses) diagnostics.push({ severity: 'warning', code: 'PLACIDUS_UNAVAILABLE' });

  const positions = BODY_DEFINITIONS.map((definition): PlanetPositionV2 => {
    const vector = GeoVector(definition.astronomyBody, instantDate, true);
    const ecliptic = Ecliptic(vector);
    const equatorial = EquatorFromVector(vector);
    const longitudeDeg = normalizeLongitude(ecliptic.elon);
    const primaryConstellation = Constellation(equatorial.ra, equatorial.dec);
    const swissEquatorial = swiss.swe_calc_ut(
      julianDayUt,
      definition.swissBodyId,
      SWISS_FLAG_MOSHIER | SWISS_FLAG_J2000 | SWISS_FLAG_EQUATORIAL,
    );
    const swissRaDeg = swissEquatorial.xx[0];
    const swissDecDeg = swissEquatorial.xx[1];
    const referenceConstellation =
      swissEquatorial.returnCode >= 0 && Number.isFinite(swissRaDeg) && Number.isFinite(swissDecDeg)
        ? Constellation((swissRaDeg ?? 0) / 15, swissDecDeg ?? 0)
        : null;
    const astronomicalReal = toIauProjection(
      primaryConstellation,
      referenceConstellation,
      isWithinIauBoundaryGuard(equatorial.ra, equatorial.dec, primaryConstellation.symbol),
    );
    if (
      astronomicalReal.status === 'unavailable' &&
      astronomicalReal.reasonCode === 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN'
    ) {
      diagnostics.push({
        severity: 'warning',
        code: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN',
        bodyId: definition.bodyId,
      });
    }

    return {
      bodyId: definition.bodyId,
      kind: 'planet',
      displayNamePtBr: definition.displayNamePtBr,
      symbol: definition.symbol,
      coordinates: {
        eclipticLongitudeDeg: longitudeDeg,
        eclipticLatitudeDeg: ecliptic.elat,
        rightAscensionHours: equatorial.ra,
        declinationDeg: equatorial.dec,
      },
      tropical: projectTropical(longitudeDeg),
      astronomicalReal,
      housePlacement: housePlacement(
        swiss,
        canPlaceHouses,
        armc,
        obliquityDeg,
        input.place.latitudeDeg,
        longitudeDeg,
        ecliptic.elat,
      ),
      angelicQuinary: projectAngel(longitudeDeg),
    };
  });

  const falangeByAngel = new Map<number, PlanetBodyId[]>();
  for (const position of positions) {
    const members = falangeByAngel.get(position.angelicQuinary.angel.id) ?? [];
    members.push(position.bodyId);
    falangeByAngel.set(position.angelicQuinary.angel.id, members);
  }
  const angelicFalange = [...falangeByAngel.entries()]
    .sort(([left], [right]) => left - right)
    .map(([angelId, memberBodyIds]) => ({ angelId, memberBodyIds, occurrenceCount: memberBodyIds.length }));

  const ascendant = normalizeLongitude(houseResult.ascmc[0] ?? Number.NaN);
  const midheaven = normalizeLongitude(houseResult.ascmc[1] ?? Number.NaN);
  const angles =
    housesAvailable && Number.isFinite(ascendant) && Number.isFinite(midheaven)
      ? [angleProjection('ascendant', ascendant), angleProjection('midheaven', midheaven)]
      : [];

  return {
    schemaId: POSITIONAL_SCHEMA_ID,
    schemaVersion: POSITIONAL_SCHEMA_VERSION,
    calculationId: input.calculationId,
    calculatedAtUtc: input.calculatedAtUtc,
    targetSet: {
      id: POSITIONAL_TARGET_SET_ID,
      version: '1.0.0',
      orderedIds: BODY_DEFINITIONS.map(({ bodyId }) => bodyId),
    },
    birthContext: {
      civilInput: { calendar: 'gregory', date: input.date, time: input.time, semantics: 'wall-time-at-birthplace' },
      place: {
        sourceLabel: input.place.sourceLabel,
        latitudeDeg: input.place.latitudeDeg,
        longitudeDeg: input.place.longitudeDeg,
        elevationMeters: input.place.elevationMeters,
        geocoder: { provider: 'open-meteo', providerResultId: input.place.providerResultId },
      },
      timeResolution: input.timeResolution,
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
        engineVersion: SWISS_EPHEMERIS_VERSION,
        runtimeWasmSha256: SWISS_EPHEMERIS_WASM_SHA256,
        systemId: 'placidus',
      },
      astronomicalReal: {
        methodId: 'iau-roman-1987-b1875-consensus-v1',
        boundaryDatasetVersion: 'astronomy-engine-2.1.19',
        boundaryDatasetSha256: ASTRONOMY_ENGINE_SOURCE_SHA256,
        classificationEpoch: 'B1875',
        boundaryGuardArcminutes: IAU_BOUNDARY_GUARD_ARCMINUTES,
        translationPolicy: 'curated-pt-br-editorial-v1',
      },
    },
    catalogs: {
      angelic72: {
        catalogId: 'mayhem-shem-hamephorash-tropical-72x5',
        catalogVersion: ANGEL_CATALOG_METADATA.version,
        catalogSha256: ANGEL_CATALOG_SHA256,
        intervalConvention: '[start,end)',
        identityKey: 'numeric-id-1-to-72',
      },
    },
    houses: canPlaceHouses
      ? { systemId: 'placidus', status: 'available', cusps: cuspProjection(houseResult.cusps) }
      : { systemId: 'placidus', status: 'unavailable', reasonCode: 'PLACIDUS_UNAVAILABLE' },
    angles,
    positions,
    aggregates: { angelicFalange },
    diagnostics,
  };
}

export function formatDegreePtBrTruncated(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return 'indisponível';
  const scale = 10 ** decimals;
  const truncated = Math.trunc(value * scale) / scale;
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(truncated)}°`;
}
